/**
 * Settings UI management (Dark/Light Theme)
 */

import { $ } from "../utils/dom.js";
import { openModal, closeModal } from "./modals.js";
import {
  t,
  getLanguage,
  getSupportedLanguages,
  setLanguage,
  applyTranslations,
} from "../i18n/index.js";

// Current theme state
let currentTheme = "dark";

/**
 * Open settings modal
 */
export function openSettings() {
  let modal = $("modal-settings");

  if (!modal) {
    modal = createSettingsModal();

    document.body.appendChild(modal);
  }

  const toggle = $("theme-toggle");

  if (toggle) {
    toggle.classList.toggle("on", currentTheme === "dark");
  }

  const langSelect = $("language-select");
  if (langSelect) langSelect.value = getLanguage();

  openModal("modal-settings");
}

/**
 * Close settings modal
 */
export function closeSettings() {
  closeModal("modal-settings");
}

/**
 * Toggle Theme
 */
export function toggleTheme() {
  const toggle = $("theme-toggle");

  if (!toggle) return;

  toggle.classList.toggle("on");

  if (toggle.classList.contains("on")) {
    setTheme("dark");
  } else {
    setTheme("light");
  }
}

/**
 * Apply Theme
 */
function setTheme(theme, persist = true) {
  currentTheme = theme;

  document.body.classList.toggle("dark-theme", theme === "dark");

  document.body.classList.toggle("light-theme", theme === "light");

  if (persist) {
    localStorage.setItem("v2hub_theme", theme);
  }
}

/**
 * Sync theme state
 *
 * The actual dark/light class is already applied synchronously by the
 * inline script at the top of <body>, before this module ever runs
 * (main.js is a deferred ES module), so the page never flashes light.
 * This just re-applies the resolved theme so `currentTheme` and the
 * CSS classes stay in sync with localStorage / the settings toggle.
 */
export function loadSavedTheme() {
  const saved = localStorage.getItem("v2hub_theme");

  if (saved) {
    setTheme(saved, false);
  }
}

/**
 * Apply panel-wide default theme setting
 */
export function applyDefaultTheme(theme) {
  if (!theme) return;
  const effectiveTheme = theme.toLowerCase() === "light" ? "light" : "dark";
  // Only apply default if user hasn't chosen an explicit theme in localStorage
  if (!localStorage.getItem("v2hub_theme")) {
    setTheme(effectiveTheme, false);
    const toggle = $("theme-toggle");
    if (toggle) {
      toggle.classList.toggle("on", effectiveTheme === "dark");
    }
  }
}

/**
 * Backwards compatibility helper for default_background setting
 */
export function applyDefaultBackground(bg) {
  applyDefaultTheme(bg);
}

/**
 * Create Settings Modal
 */
function createSettingsModal() {
  const modal = document.createElement("div");

  modal.id = "modal-settings";

  modal.className = "modal-overlay";

  modal.innerHTML = `

    <div class="modal">

      <div class="modal-handle"></div>


      <button
        class="modal-close"
        type="button"
        onclick="closeSettings()"
        data-i18n-aria-label="settings.close"
        aria-label="Close settings"
      >
        ✕
      </button>



      <div class="modal-title">
        ⚙️ <span data-i18n="settings.title">Settings</span>
      </div>



      <div class="setting-row">


        <div class="setting-row-text">


          <div class="setting-row-title" data-i18n="settings.darkTheme">
            Dark theme
          </div>


          <div class="setting-row-hint" data-i18n="settings.darkThemeHint">
            Pick the theme you like. (The light theme may have palette issues)
          </div>


        </div>




        <button
          id="theme-toggle"
          class="toggle-switch"
          type="button"
          onclick="toggleTheme()"
          role="switch"
          aria-label="Toggle dark theme"
        >

          <span class="toggle-knob"></span>

        </button>


      </div>


      <div class="setting-row">

        <div class="setting-row-text">
          <div class="setting-row-title" data-i18n="settings.language">
            Language
          </div>
          <div class="setting-row-hint" data-i18n="settings.languageHint">
            Interface language
          </div>
        </div>

        <select
          id="language-select"
          class="language-select"
          data-i18n-aria-label="settings.language"
          aria-label="Language"
        ></select>

      </div>


    </div>

  `;

  const select = modal.querySelector("#language-select");
  for (const lang of getSupportedLanguages()) {
    const opt = document.createElement("option");
    opt.value = lang.code;
    opt.textContent = `${lang.flag ? lang.flag + " " : ""}${lang.name}`;
    select.appendChild(opt);
  }
  select.value = getLanguage();
  // An explicit choice is persisted and wins over auto-detection afterwards.
  select.addEventListener("change", () => {
    setLanguage(select.value, { persist: true });
  });

  applyTranslations(modal);

  return modal;
}

/*
  Expose only handlers required by HTML onclick
*/

window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleTheme = toggleTheme;
