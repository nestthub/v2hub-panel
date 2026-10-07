/**
 * Admin panel settings management
 */

import {
  t,
  getLanguage,
  getSupportedLanguages,
  initLanguage,
  setLanguage,
  applyTranslations,
  applyServerDefaultLanguage,
  onLanguageChange,
} from "./i18n/index.js";

let currentSettings = [];
let loginErrorKey = null; // translation key of the error shown on the login card

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
    const msg =
      data.detail?.message || data.detail || t("admin.err.authFailed");
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
  if (!res.ok) throw new Error(t("admin.err.loadSettings"));
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
    const msg =
      data.detail?.message || data.detail || t("admin.err.saveFailed");
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
    loginErrorKey = "admin.err.notConfigured";
    err.textContent = t(loginErrorKey);
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

// Flag icons for the "default_language" options.
const LANGUAGE_FLAGS = { en: "🇬🇧", ru: "🇷🇺", fa: "🇮🇷", "zh-CN": "🇨🇳" };

function optionIcon(settingKey, value) {
  if (settingKey === "default_language") return LANGUAGE_FLAGS[value] || "🌐";
  return value === "light" ? "☀️" : "🌙";
}

/**
 * Backend-provided label/description are English fallbacks; the admin UI
 * shows the translated text when the locale has one for this setting/option.
 */
function tr(key, fallback, params) {
  const text = t(key, params);
  return text === key ? fallback : text;
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
    const label = tr(`admin.setting.${setting.key}.label`, setting.label);
    titleEl.textContent = `⚙️ ${label}`;
    card.appendChild(titleEl);

    const descEl = document.createElement("div");
    descEl.className = "admin-card-desc";
    descEl.textContent = tr(
      `admin.setting.${setting.key}.description`,
      setting.description,
    );
    card.appendChild(descEl);

    let selectedValue = setting.value || setting.default;

    if (setting.type === "select" && Array.isArray(setting.options)) {
      const grid = document.createElement("div");
      // 2 options per row; 9 or more options: 3 per row.
      grid.className = `theme-grid ${setting.options.length >= 9 ? "cols-3" : "cols-2"}`;

      setting.options.forEach((opt) => {
        const optCard = document.createElement("div");
        optCard.className = `theme-option-card ${selectedValue === opt.value ? "selected" : ""}`;

        const iconEl = document.createElement("div");
        iconEl.className = "theme-icon";
        iconEl.textContent = optionIcon(setting.key, opt.value);
        optCard.appendChild(iconEl);

        const nameEl = document.createElement("div");
        nameEl.className = "theme-name";
        // Language options keep their native names (e.g. "Русский").
        nameEl.textContent =
          setting.key === "default_language"
            ? opt.label
            : tr(`admin.option.${setting.key}.${opt.value}.label`, opt.label);
        optCard.appendChild(nameEl);

        if (opt.description) {
          const optDescEl = document.createElement("div");
          optDescEl.className = "theme-desc";
          optDescEl.textContent =
            setting.key === "default_language"
              ? opt.description
              : tr(
                  `admin.option.${setting.key}.${opt.value}.description`,
                  opt.description,
                );
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
    saveBtn.textContent = t("admin.save", { label });

    const statusEl = document.createElement("span");
    statusEl.className = "status-indicator";

    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      statusEl.textContent = t("admin.saving");
      statusEl.className = "status-indicator";

      try {
        await saveSetting(setting.key, selectedValue);
        statusEl.textContent = t("admin.saved");
        statusEl.className = "status-indicator success";
        setTimeout(() => {
          statusEl.textContent = "";
        }, 4000);
      } catch (err) {
        statusEl.textContent = t("admin.error", { message: err.message });
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

/** Fill the header language picker; an explicit choice is saved. */
function setupLanguagePicker() {
  const select = document.getElementById("admin-language-select");
  if (!select) return;
  for (const lang of getSupportedLanguages()) {
    const opt = document.createElement("option");
    opt.value = lang.code;
    opt.textContent = `${lang.flag ? lang.flag + " " : ""}${lang.name}`;
    select.appendChild(opt);
  }
  select.value = getLanguage();
  select.addEventListener("change", () => {
    setLanguage(select.value, { persist: true });
  });
  onLanguageChange((code) => {
    select.value = code;
    // Re-render pieces built from JS strings.
    if (loginErrorKey) {
      const err = document.getElementById("login-error");
      if (err && !err.classList.contains("hidden")) {
        err.textContent = t(loginErrorKey);
      }
    }
    if (currentSettings.length) renderSettings(currentSettings);
  });
}

/** Panel-wide default language (public setting), lowest-priority source. */
async function applyPanelDefaultLanguage() {
  try {
    const res = await fetch("/api/settings/public");
    if (!res.ok) return;
    const data = await res.json();
    applyServerDefaultLanguage(data.default_language);
  } catch {
    /* keep the detected/English language */
  }
}

async function init() {
  // Same resolution as the main app: saved > browser > admin default > en.
  initLanguage();
  applyTranslations(document);
  setupLanguagePicker();
  await applyPanelDefaultLanguage();

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
      loginErrorKey = null; // server-provided text: not re-translated
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
