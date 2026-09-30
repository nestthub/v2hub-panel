/**
 * Admin panel settings management
 */

let currentSettings = [];

function getRequestHeaders() {
  return { "Content-Type": "application/json" };
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------

async function checkStatus() {
  try {
    const res = await fetch("/api/admin/status", {
      headers: getRequestHeaders(),
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
    headers: getRequestHeaders(),
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
    headers: getRequestHeaders(),
  });
}

async function fetchAdminSettings() {
  const res = await fetch("/api/admin/settings", {
    headers: getRequestHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load settings");
  return await res.json();
}

async function saveSetting(key, value) {
  const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: getRequestHeaders(),
    body: JSON.stringify({ value }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail?.message || data.detail || "Failed to save setting";
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

  if (!adminConfigured) {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    const err = document.getElementById("login-error");
    err.textContent =
      "Admin access is not configured. Please set V2HUB_ADMIN_PANEL_PASSWORD in server environment.";
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

function renderSettings(settingsList) {
  const container = document.getElementById("settings-container");
  if (!container) return;
  container.innerHTML = "";

  settingsList.forEach((setting) => {
    const card = document.createElement("div");
    card.className = "admin-card";

    const titleEl = document.createElement("div");
    titleEl.className = "admin-card-title";
    titleEl.textContent = `⚙️ ${setting.label}`;
    card.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.className = "admin-card-desc";
    descEl.textContent = setting.description;
    card.appendChild(descEl);

    let selectedValue = setting.value || setting.default;

    if (setting.type === "select" && Array.isArray(setting.options)) {
      const grid = document.createElement("div");
      grid.className = "theme-grid";

      setting.options.forEach((opt) => {
        const optCard = document.createElement("div");
        optCard.className = `theme-option-card ${selectedValue === opt.value ? "selected" : ""}`;

        const iconEl = document.createElement("div");
        iconEl.className = "theme-icon";
        iconEl.textContent = opt.value === "light" ? "☀️" : "🌙";
        optCard.appendChild(iconEl);

        const nameEl = document.createElement("div");
        nameEl.className = "theme-name";
        nameEl.textContent = opt.label;
        optCard.appendChild(nameEl);

        if (opt.description) {
          const optDescEl = document.createElement("div");
          optDescEl.className = "theme-desc";
          optDescEl.textContent = opt.description;
          optCard.appendChild(optDescEl);
        }

        optCard.addEventListener("click", () => {
          grid
            .querySelectorAll(".theme-option-card")
            .forEach((c) => c.classList.remove("selected"));
          optCard.classList.add("selected");
          selectedValue = opt.value;
        });

        grid.appendChild(optCard);
      });

      card.appendChild(grid);
    }

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn-primary";
    saveBtn.textContent = `Save ${setting.label}`;

    const statusEl = document.createElement("span");
    statusEl.className = "status-indicator";

    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      statusEl.textContent = "Saving...";
      statusEl.className = "status-indicator";

      try {
        await saveSetting(setting.key, selectedValue);
        statusEl.textContent = "Saved successfully!";
        statusEl.className = "status-indicator success";
        setTimeout(() => {
          statusEl.textContent = "";
        }, 4000);
      } catch (err) {
        statusEl.textContent = `Error: ${err.message}`;
        statusEl.className = "status-indicator error";
      } finally {
        saveBtn.disabled = false;
      }
    });

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(statusEl);
    card.appendChild(btnRow);

    container.appendChild(card);
  });
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
      await loginAdmin(secret);
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
}

async function loadSettingsData() {
  try {
    currentSettings = await fetchAdminSettings();
    renderSettings(currentSettings);
  } catch (err) {
    console.error("Failed to load admin settings:", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
