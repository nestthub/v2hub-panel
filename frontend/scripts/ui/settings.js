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

const PRESET_BACKGROUNDS = {
  default: "",
  midnight: "linear-gradient(180deg, #05070f, #0a0e1a)",
  aurora:
    "radial-gradient(900px 700px at 50% 0%, rgba(74, 222, 128, 0.15), transparent 50%), linear-gradient(180deg, #061510, #08111f)",
  sunset:
    "radial-gradient(900px 600px at 80% 10%, rgba(251, 146, 60, 0.15), transparent 45%), radial-gradient(800px 600px at 20% 90%, rgba(167, 139, 250, 0.15), transparent 45%), linear-gradient(180deg, #0f0c1b, #150d22)",
};

/**
 * Apply panel-wide default background setting
 */
export function applyDefaultBackground(bg) {
  if (!bg || bg === "default") {
    document.body.style.background = "";
    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundPosition = "";
    document.body.style.backgroundAttachment = "";
    return;
  }

  if (PRESET_BACKGROUNDS[bg]) {
    document.body.style.background = PRESET_BACKGROUNDS[bg];
    document.body.style.backgroundAttachment = "fixed";
  } else if (
    bg.startsWith("/uploads/") ||
    bg.startsWith("http://") ||
    bg.startsWith("https://") ||
    bg.startsWith("data:")
  ) {
    document.body.style.background = "";
    document.body.style.backgroundImage = `url("${bg}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
  }
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
            Управление глобальными настройками (фон по умолчанию и др.)
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
