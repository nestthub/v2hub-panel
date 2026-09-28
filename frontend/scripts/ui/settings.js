/**
 * Settings UI management (Dark/Light Theme)
 */

import { $ } from "../utils/dom.js";
import { openModal, closeModal } from "./modals.js";

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
function setTheme(theme) {
  currentTheme = theme;

  document.body.classList.toggle("dark-theme", theme === "dark");

  document.body.classList.toggle("light-theme", theme === "light");

  localStorage.setItem("v2hub_theme", theme);
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
  const saved = localStorage.getItem("v2hub_theme") || "dark";

  setTheme(saved);
}

/**
 * Apply panel-wide default theme setting
 */
export function applyDefaultTheme(theme) {
  if (!theme) return;
  const effectiveTheme = theme.toLowerCase() === "light" ? "light" : "dark";
  // Only apply default if user hasn't chosen an explicit theme in localStorage
  if (!localStorage.getItem("v2hub_theme")) {
    setTheme(effectiveTheme);
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
        aria-label="Close settings"
      >
        ✕
      </button>



      <div class="modal-title">
        ⚙️ Настройки
      </div>



      <div class="setting-row">


        <div class="setting-row-text">


          <div class="setting-row-title">
            Темная тема
          </div>


          <div class="setting-row-hint">
            Выбирайте тему, которая вам по душе. (Светлая тема может содержать ошибки с палитрой)
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


      <div class="setting-row" style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line);">


        <div class="setting-row-text">


          <div class="setting-row-title">
            Панель администратора
          </div>


          <div class="setting-row-hint">
            Управление глобальными настройками (тема оформления и др.)
          </div>


        </div>


        <a
          href="/admin"
          class="btn-secondary"
          style="padding: 6px 14px; font-size: 0.82rem; text-decoration: none;"
        >
          Управление
        </a>


      </div>


    </div>

  `;

  return modal;
}

/*
  Expose only handlers required by HTML onclick
*/

window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleTheme = toggleTheme;
