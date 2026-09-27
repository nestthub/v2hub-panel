/**
 * Admin panel settings management
 */

let adminToken = sessionStorage.getItem("v2hub_admin_token") || "";
let currentSettings = [];
let selectedBgValue = "default";

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------

async function checkStatus() {
  try {
    const res = await fetch("/api/admin/status", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { authenticated: false, admin_configured: false };
    return await res.json();
  } catch {
    return { authenticated: false, admin_configured: false };
  }
}

async function loginAdmin(secret) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail?.message || data.detail || "Authentication failed";
    throw new Error(msg);
  }
  return data;
}

async function logoutAdmin() {
  await fetch("/api/admin/logout", {
    method: "POST",
    headers: getAuthHeaders(),
  });
  adminToken = "";
  sessionStorage.removeItem("v2hub_admin_token");
}

async function fetchAdminSettings() {
  const res = await fetch("/api/admin/settings", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load settings");
  return await res.json();
}

async function saveSetting(key, value) {
  const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ value }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail?.message || data.detail || "Failed to save setting";
    throw new Error(msg);
  }
  return data;
}

async function uploadImage(filename, base64Data) {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename, data: base64Data }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail?.message || data.detail || "Failed to upload image";
    throw new Error(msg);
  }
  return data;
}

// ---------------------------------------------------------------------------
// UI Rendering
// ---------------------------------------------------------------------------

function setView(authenticated, adminConfigured = true) {
  const loginSection = document.getElementById("section-login");
  const dashboardSection = document.getElementById("section-dashboard");
  const logoutBtn = document.getElementById("btn-logout");
  const globalBanner = document.getElementById("global-status-banner");

  if (!adminConfigured) {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    const err = document.getElementById("login-error");
    err.textContent =
      "Admin access is not configured. Please set V2HUB_ADMIN_SECRET_KEY in server environment.";
    err.classList.remove("hidden");
    return;
  }

  if (authenticated) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
}

function updatePreview(val, options) {
  const previewBox = document.getElementById("bg-preview-box");
  if (!previewBox) return;

  const matchedOpt = options?.find((o) => o.value === val);
  if (matchedOpt && matchedOpt.preview) {
    previewBox.style.background = matchedOpt.preview;
    previewBox.style.backgroundImage = "";
  } else if (val.startsWith("/uploads/") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
    previewBox.style.background = "";
    previewBox.style.backgroundImage = `url("${val}")`;
    previewBox.style.backgroundSize = "cover";
    previewBox.style.backgroundPosition = "center";
  } else {
    previewBox.style.background = "linear-gradient(180deg, #08111f, #0d1727)";
    previewBox.style.backgroundImage = "";
  }
}

function renderBackgroundSettings(setting) {
  const container = document.getElementById("preset-container");
  const customPanel = document.getElementById("custom-image-panel");
  const customUrlInput = document.getElementById("custom-url-input");

  container.innerHTML = "";
  selectedBgValue = setting.value || "default";

  const options = setting.options || [];
  let isCustom = !options.some((o) => o.value === selectedBgValue);

  // Render presets
  options.forEach((opt) => {
    const card = document.createElement("div");
    card.className = `preset-card ${selectedBgValue === opt.value ? "selected" : ""}`;
    card.innerHTML = `
      <div class="preset-thumb" style="background: ${opt.preview || "#111"};"></div>
      <div class="preset-name">${opt.label}</div>
      <div class="preset-desc">${opt.description || ""}</div>
    `;
    card.addEventListener("click", () => {
      document.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedBgValue = opt.value;
      customPanel.classList.add("hidden");
      updatePreview(selectedBgValue, options);
    });
    container.appendChild(card);
  });

  // Render "Custom" card
  const customCard = document.createElement("div");
  customCard.className = `preset-card ${isCustom ? "selected" : ""}`;
  customCard.innerHTML = `
    <div class="preset-thumb" style="background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
      🖼️
    </div>
    <div class="preset-name">Custom Image</div>
    <div class="preset-desc">Upload or enter image URL</div>
  `;
  customCard.addEventListener("click", () => {
    document.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
    customCard.classList.add("selected");
    customPanel.classList.remove("hidden");
    if (customUrlInput.value.trim()) {
      selectedBgValue = customUrlInput.value.trim();
    }
    updatePreview(selectedBgValue, options);
  });
  container.appendChild(customCard);

  if (isCustom) {
    customPanel.classList.remove("hidden");
    customUrlInput.value = selectedBgValue;
  }

  customUrlInput.addEventListener("input", (e) => {
    selectedBgValue = e.target.value.trim();
    updatePreview(selectedBgValue, options);
  });

  updatePreview(selectedBgValue, options);
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

async function init() {
  const status = await checkStatus();
  setView(status.authenticated, status.admin_configured);

  if (status.authenticated) {
    loadSettingsData();
  }

  // Login handler
  const loginForm = document.getElementById("form-login");
  const loginError = document.getElementById("login-error");
  const secretInput = document.getElementById("admin-secret-input");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    const secret = secretInput.value.trim();
    if (!secret) return;

    try {
      const res = await loginAdmin(secret);
      adminToken = res.token;
      sessionStorage.setItem("v2hub_admin_token", adminToken);
      setView(true, true);
      await loadSettingsData();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove("hidden");
    }
  });

  // Logout handler
  document.getElementById("btn-logout").addEventListener("click", async () => {
    await logoutAdmin();
    setView(false, true);
  });

  // Upload handler
  const uploadBtn = document.getElementById("btn-upload-file");
  const fileInput = document.getElementById("file-upload-input");
  const uploadStatus = document.getElementById("upload-status");
  const customUrlInput = document.getElementById("custom-url-input");

  uploadBtn.addEventListener("click", () => {
    const file = fileInput.files?.[0];
    if (!file) {
      uploadStatus.textContent = "Please select a file first.";
      uploadStatus.style.color = "var(--danger)";
      return;
    }

    uploadStatus.textContent = "Uploading...";
    uploadStatus.style.color = "var(--accent)";

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await uploadImage(file.name, reader.result);
        customUrlInput.value = res.url;
        selectedBgValue = res.url;
        updatePreview(selectedBgValue);
        uploadStatus.textContent = "Uploaded successfully!";
        uploadStatus.style.color = "var(--success)";
      } catch (err) {
        uploadStatus.textContent = err.message;
        uploadStatus.style.color = "var(--danger)";
      }
    };
    reader.onerror = () => {
      uploadStatus.textContent = "Failed to read file.";
      uploadStatus.style.color = "var(--danger)";
    };
    reader.readAsDataURL(file);
  });

  // Save handler
  const saveBtn = document.getElementById("btn-save-settings");
  const statusIndicator = document.getElementById("save-status-indicator");

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    statusIndicator.textContent = "Saving...";
    statusIndicator.style.color = "var(--muted)";

    try {
      await saveSetting("default_background", selectedBgValue);
      statusIndicator.textContent = "Saved successfully! Applied to panel.";
      statusIndicator.style.color = "var(--success)";
      setTimeout(() => {
        statusIndicator.textContent = "";
      }, 4000);
    } catch (err) {
      statusIndicator.textContent = `Error: ${err.message}`;
      statusIndicator.style.color = "var(--danger)";
    } finally {
      saveBtn.disabled = false;
    }
  });
}

async function loadSettingsData() {
  try {
    currentSettings = await fetchAdminSettings();
    const bgSetting = currentSettings.find((s) => s.key === "default_background");
    if (bgSetting) {
      renderBackgroundSettings(bgSetting);
    }
  } catch (err) {
    console.error("Failed to load admin settings:", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
