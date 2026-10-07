/**
 * Locale registry.
 *
 * Adding a new language (e.g. Turkish) takes two steps:
 *   1. create `./tr.js` (copy `en.js`, translate the values);
 *   2. import it below and add it to LOCALES.
 * Nothing else in the UI needs to change. Backend side: add one entry to
 * LANGUAGE_OPTIONS in src/v2hub_panel/services/settings_registry.py so the
 * language can be picked as the panel default in the Admin Panel.
 *
 * Each locale module default-exports:
 *   {
 *     meta: {
 *       code: "zh-CN",          // BCP-47, canonical casing
 *       name: "简体中文",         // native name, shown in the language picker
 *       flag: "🇨🇳",
 *       dir: "ltr" | "rtl",
 *       aliases: ["zh"],         // optional extra tags that map to this locale
 *     },
 *     messages: { "key": "text", ... }   // missing keys fall back to English
 *   }
 */

import en from "./en.js";
import ru from "./ru.js";
import fa from "./fa.js";
import zhCN from "./zh-CN.js";

export const DEFAULT_LANGUAGE = "en";

export const LOCALES = [en, ru, fa, zhCN];
