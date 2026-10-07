/**
 * Localization core.
 *
 * Language resolution order (first match wins):
 *   1. language explicitly chosen by the user in Settings (localStorage)
 *   2. language reported by Telegram when running as a Mini App,
 *      otherwise the browser language(s) (navigator.languages)
 *   3. the default language configured by the admin (Admin Panel)
 *   4. English
 *
 * Auto-detected languages are never persisted: only an explicit choice in
 * Settings is, so that it keeps priority over detection on later visits.
 */

import { LOCALES, DEFAULT_LANGUAGE } from "./locales/index.js";

export { DEFAULT_LANGUAGE };

export const LANGUAGE_STORAGE_KEY = "v2hub_language";
export const LANGUAGE_CHANGE_EVENT = "v2hub:languagechange";

const localeByCode = new Map(
  LOCALES.map((l) => [l.meta.code.toLowerCase(), l]),
);

let currentCode = DEFAULT_LANGUAGE;
let currentSource = "fallback"; // saved | telegram | browser | server | fallback
let pluralRules = new Intl.PluralRules(DEFAULT_LANGUAGE);

// ---------------------------------------------------------------------------
// Locale lookup
// ---------------------------------------------------------------------------

/** @returns {{code:string,name:string,flag?:string,dir:string}[]} */
export function getSupportedLanguages() {
  return LOCALES.map((l) => ({ ...l.meta }));
}

function normalizeTag(tag) {
  return String(tag || "")
    .trim()
    .replace(/_/g, "-")
    .toLowerCase();
}

/**
 * Map an arbitrary language tag ("ru-RU", "fa_IR", "zh-Hans-CN", "zh")
 * to a supported locale code, or null when unsupported.
 * Order: exact code -> alias -> base language (e.g. "ru-RU" -> "ru",
 * "zh-TW" -> "zh-CN").
 */
export function matchLanguage(tag) {
  const norm = normalizeTag(tag);
  if (!norm) return null;

  if (localeByCode.has(norm)) return localeByCode.get(norm).meta.code;

  for (const l of LOCALES) {
    if ((l.meta.aliases || []).some((a) => normalizeTag(a) === norm)) {
      return l.meta.code;
    }
  }

  const base = norm.split("-")[0];
  if (base !== norm) {
    if (localeByCode.has(base)) return localeByCode.get(base).meta.code;
    for (const l of LOCALES) {
      const codeBase = normalizeTag(l.meta.code).split("-")[0];
      const aliasBases = (l.meta.aliases || []).map(normalizeTag);
      if (codeBase === base || aliasBases.includes(base)) return l.meta.code;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function getSavedLanguage() {
  try {
    return matchLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Language code Telegram passes to a Mini App, or null when the page is
 * not running inside a real Mini App session (no initData).
 */
export function getTelegramLanguage() {
  try {
    const wa = window.Telegram?.WebApp;
    if (!wa?.initData) return null;
    const code = wa.initDataUnsafe?.user?.language_code;
    return code ? String(code) : null;
  } catch {
    return null;
  }
}

export function getBrowserLanguages() {
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const list =
    Array.isArray(nav.languages) && nav.languages.length
      ? nav.languages
      : [nav.language];
  return list.filter(Boolean);
}

/**
 * Detect the language for a visitor without a saved preference.
 * Inside a Telegram Mini App the Telegram language_code is authoritative;
 * in a regular browser the first supported entry of navigator.languages wins.
 * @returns {{code: string, source: "telegram"|"browser"} | null}
 */
export function detectLanguage() {
  const tg = getTelegramLanguage();
  if (tg) {
    const code = matchLanguage(tg);
    return code ? { code, source: "telegram" } : null;
  }
  for (const tag of getBrowserLanguages()) {
    const code = matchLanguage(tag);
    if (code) return { code, source: "browser" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

function lookup(code, key) {
  const loc = localeByCode.get(String(code).toLowerCase());
  return loc ? loc.messages[key] : undefined;
}

function pickPlural(entry, count) {
  if (entry && typeof entry === "object") {
    const form = pluralRules.select(Number(count));
    return entry[form] ?? entry.other ?? Object.values(entry)[0];
  }
  return entry;
}

/**
 * Translate a key. Falls back to English, then to the key itself.
 * `{name}` placeholders are replaced from `params`. A message may be an
 * object of plural forms ({one, few, many, other}) selected by params.count.
 */
export function t(key, params) {
  let entry = lookup(currentCode, key);
  if (entry === undefined) entry = lookup(DEFAULT_LANGUAGE, key);
  if (entry === undefined) return key;

  let text = pickPlural(entry, params?.count);
  if (typeof text !== "string") return key;

  if (params) {
    text = text.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] === undefined || params[name] === null
        ? m
        : String(params[name]),
    );
  }
  return text;
}

export function getLanguage() {
  return currentCode;
}

export function getLanguageSource() {
  return currentSource;
}

export function getDirection(code = currentCode) {
  return localeByCode.get(String(code).toLowerCase())?.meta.dir || "ltr";
}

export function isRtl() {
  return getDirection() === "rtl";
}

// ---------------------------------------------------------------------------
// DOM application
// ---------------------------------------------------------------------------

const ATTR_BINDINGS = [
  ["data-i18n-title", "title"],
  ["data-i18n-placeholder", "placeholder"],
  ["data-i18n-aria-label", "aria-label"],
  ["data-i18n-alt", "alt"],
];

/**
 * Apply translations to every element under `root` carrying
 * data-i18n (text content) or data-i18n-<attr> bindings.
 */
export function applyTranslations(root = document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });

  for (const [dataAttr, attr] of ATTR_BINDINGS) {
    root.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
      el.setAttribute(attr, t(el.getAttribute(dataAttr)));
    });
  }

  const titleKey = document.documentElement.getAttribute("data-i18n-title");
  if (root === document && titleKey) document.title = t(titleKey);
}

function applyDocumentLanguage(code) {
  const root = document.documentElement;
  root.setAttribute("lang", code);
  root.setAttribute("dir", getDirection(code));
}

/**
 * Switch the active language: updates <html lang/dir>, re-translates the
 * DOM and notifies listeners — no page reload required.
 *
 * @param {string} code  any tag accepted by matchLanguage()
 * @param {{persist?: boolean, source?: string}} [opts]
 * @returns {string} the language code actually applied
 */
export function setLanguage(code, { persist = false, source } = {}) {
  const resolved = matchLanguage(code) || DEFAULT_LANGUAGE;
  const changed = resolved !== currentCode;

  currentCode = resolved;
  currentSource = persist ? "saved" : source || currentSource;
  pluralRules = new Intl.PluralRules(resolved);

  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, resolved);
    } catch {
      /* storage unavailable (private mode) — keep in-memory choice */
    }
  }

  applyDocumentLanguage(resolved);
  applyTranslations(document);

  if (changed) {
    document.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGE_EVENT, {
        detail: { language: resolved },
      }),
    );
  }
  return resolved;
}

/**
 * Initial language resolution (steps 1-2, synchronous, before the server
 * config is known). Falls back to English until the admin default arrives.
 */
export function initLanguage() {
  const saved = getSavedLanguage();
  if (saved) return setLanguage(saved, { source: "saved" });

  const detected = detectLanguage();
  if (detected) return setLanguage(detected.code, { source: detected.source });

  return setLanguage(DEFAULT_LANGUAGE, { source: "fallback" });
}

/**
 * Step 3: apply the admin-configured default language. Only takes effect
 * when neither a saved choice nor a supported detected language exists.
 */
export function applyServerDefaultLanguage(code) {
  if (currentSource === "saved" || currentSource === "telegram") return;
  if (currentSource === "browser") return;

  const resolved = matchLanguage(code);
  if (resolved) setLanguage(resolved, { source: "server" });
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLanguageChange(callback) {
  const handler = (e) => callback(e.detail.language);
  document.addEventListener(LANGUAGE_CHANGE_EVENT, handler);
  return () => document.removeEventListener(LANGUAGE_CHANGE_EVENT, handler);
}
