import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LANGUAGE_STORAGE_KEY,
  applyServerDefaultLanguage,
  applyTranslations,
  detectLanguage,
  getDirection,
  getLanguage,
  initLanguage,
  matchLanguage,
  setLanguage,
  t,
} from "../scripts/i18n/index.js";
import { LOCALES } from "../scripts/i18n/locales/index.js";

function setBrowserLanguages(list) {
  Object.defineProperty(window.navigator, "languages", {
    value: list,
    configurable: true,
  });
  Object.defineProperty(window.navigator, "language", {
    value: list[0],
    configurable: true,
  });
}

function setTelegram(languageCode) {
  window.Telegram = {
    WebApp: {
      initData: "query_id=abc",
      initDataUnsafe: { user: { language_code: languageCode } },
    },
  };
}

describe("locale files", () => {
  const en = LOCALES.find((l) => l.meta.code === "en");
  const keys = Object.keys(en.messages);

  for (const locale of LOCALES) {
    it(`${locale.meta.code} has every English key and no extras`, () => {
      const own = Object.keys(locale.messages);
      expect(keys.filter((k) => !own.includes(k))).toEqual([]);
      expect(own.filter((k) => !keys.includes(k))).toEqual([]);
    });

    it(`${locale.meta.code} keeps the same {placeholders} as English`, () => {
      const names = (v) =>
        [...JSON.stringify(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      for (const key of keys) {
        const enNames = [...new Set(names(en.messages[key]))];
        const ownNames = [...new Set(names(locale.messages[key]))];
        expect(ownNames, `${locale.meta.code}:${key}`).toEqual(enNames);
      }
    });
  }
});

describe("matchLanguage", () => {
  it("maps regional and alternative tags to supported locales", () => {
    expect(matchLanguage("ru-RU")).toBe("ru");
    expect(matchLanguage("RU")).toBe("ru");
    expect(matchLanguage("fa_IR")).toBe("fa");
    expect(matchLanguage("en-US")).toBe("en");
    expect(matchLanguage("zh")).toBe("zh-CN");
    expect(matchLanguage("zh-cn")).toBe("zh-CN");
    expect(matchLanguage("zh-Hans-CN")).toBe("zh-CN");
    expect(matchLanguage("zh-TW")).toBe("zh-CN");
  });

  it("returns null for unsupported or empty tags", () => {
    expect(matchLanguage("de")).toBeNull();
    expect(matchLanguage("")).toBeNull();
    expect(matchLanguage(null)).toBeNull();
  });
});

describe("translation", () => {
  beforeEach(() => setLanguage("en"));

  it("translates, interpolates and falls back to the key", () => {
    setLanguage("ru");
    expect(t("common.save")).toBe("Сохранить");
    expect(t("providerConn.approved", { name: "X" })).toBe(
      "Провайдер «X» подключён",
    );
    expect(t("no.such.key")).toBe("no.such.key");
  });

  it("uses Russian plural forms", () => {
    setLanguage("ru");
    expect(t("toast.sourcesAdded", { count: 1 })).toContain(
      "Добавлен 1 источник",
    );
    expect(t("toast.sourcesAdded", { count: 3 })).toContain("3 источника");
    expect(t("toast.sourcesAdded", { count: 5 })).toContain("5 источников");
  });

  it("sets lang/dir on <html>, RTL for Persian", () => {
    setLanguage("fa");
    expect(document.documentElement.getAttribute("lang")).toBe("fa");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(getDirection()).toBe("rtl");
    setLanguage("zh-CN");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("applies data-i18n bindings and re-applies on switch", () => {
    document.body.innerHTML = `
      <button data-i18n="common.save">x</button>
      <input data-i18n-placeholder="connect.tokenPlaceholder" />
      <a data-i18n-title="common.back" title="x"></a>`;
    setLanguage("fa");
    expect(document.querySelector("button").textContent).toBe("ذخیره");
    setLanguage("zh-CN");
    expect(document.querySelector("button").textContent).toBe("保存");
    expect(document.querySelector("input").placeholder).toBe("输入令牌");
    expect(document.querySelector("a").title).toBe("返回");
    document.body.innerHTML = "";
  });

  it("emits a languagechange event only when the language changes", () => {
    const handler = vi.fn();
    document.addEventListener("v2hub:languagechange", handler);
    setLanguage("ru");
    setLanguage("ru");
    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener("v2hub:languagechange", handler);
  });
});

describe("language resolution", () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.Telegram;
    setBrowserLanguages(["en-US"]);
    setLanguage("en", { source: "fallback" });
  });
  afterEach(() => {
    delete window.Telegram;
  });

  it("uses the browser language in a regular browser", () => {
    setBrowserLanguages(["fa-IR", "en"]);
    expect(initLanguage()).toBe("fa");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it("skips unsupported browser languages and takes the next supported one", () => {
    setBrowserLanguages(["de-DE", "ru-RU", "en"]);
    expect(detectLanguage()).toEqual({ code: "ru", source: "browser" });
  });

  it("uses Telegram's language_code inside a Mini App, ignoring the browser", () => {
    setBrowserLanguages(["en-US"]);
    setTelegram("ru");
    expect(initLanguage()).toBe("ru");
    expect(detectLanguage().source).toBe("telegram");
  });

  it("supports Persian and Chinese from Telegram", () => {
    setTelegram("fa");
    expect(initLanguage()).toBe("fa");
    setTelegram("zh-hans");
    expect(initLanguage()).toBe("zh-CN");
  });

  it("does not treat a bare Telegram object (no initData) as a Mini App", () => {
    window.Telegram = { WebApp: { initData: "", initDataUnsafe: {} } };
    setBrowserLanguages(["fa"]);
    expect(initLanguage()).toBe("fa");
    expect(detectLanguage().source).toBe("browser");
  });

  it("an explicit choice in Settings beats detection and persists", () => {
    setBrowserLanguages(["ru"]);
    setTelegram("ru");
    setLanguage("zh-CN", { persist: true });
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
    expect(initLanguage()).toBe("zh-CN");
  });

  it("falls back to the admin default only when detection finds nothing", () => {
    setBrowserLanguages(["de-DE"]);
    initLanguage();
    expect(getLanguage()).toBe("en");
    applyServerDefaultLanguage("fa");
    expect(getLanguage()).toBe("fa");
  });

  it("the admin default never overrides a detected or saved language", () => {
    setBrowserLanguages(["ru"]);
    initLanguage();
    applyServerDefaultLanguage("zh-CN");
    expect(getLanguage()).toBe("ru");

    localStorage.setItem(LANGUAGE_STORAGE_KEY, "fa");
    initLanguage();
    applyServerDefaultLanguage("zh-CN");
    expect(getLanguage()).toBe("fa");
  });

  it("an unsupported Telegram language falls back to the admin default", () => {
    setBrowserLanguages(["ru"]);
    setTelegram("de");
    initLanguage();
    applyServerDefaultLanguage("zh-CN");
    expect(getLanguage()).toBe("zh-CN");
  });

  it("ignores an invalid admin default", () => {
    setBrowserLanguages(["de"]);
    initLanguage();
    applyServerDefaultLanguage("xx");
    expect(getLanguage()).toBe("en");
  });
});

describe("settings language picker", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
    setLanguage("en", { source: "fallback" });
  });

  it("changes the language, persists it and re-translates the modal", async () => {
    const { openSettings } = await import("../scripts/ui/settings.js");
    openSettings();
    const select = document.getElementById("language-select");
    expect([...select.options].map((o) => o.value)).toEqual([
      "en",
      "ru",
      "fa",
      "zh-CN",
    ]);

    select.value = "fa";
    select.dispatchEvent(new Event("change"));

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("fa");
    expect(document.documentElement.dir).toBe("rtl");
    expect(
      document.querySelector('[data-i18n="settings.language"]').textContent,
    ).toBe("زبان");
    applyTranslations(document);
  });
});

describe("key coverage", () => {
  it("every key referenced from index.html and scripts exists in English", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "..");
    const en = LOCALES.find((l) => l.meta.code === "en").messages;

    const used = new Set();
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    for (const m of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) {
      used.add(m[1]);
    }

    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "locales" ? [] : walk(p);
        return p.endsWith(".js") ? [p] : [];
      });
    for (const file of walk(path.join(root, "scripts"))) {
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(/\bt\(\s*"([\w.]+)"/g)) used.add(m[1]);
      for (const m of src.matchAll(/data-i18n(?:-[a-z-]+)?="([\w.]+)"/g)) {
        used.add(m[1]);
      }
    }

    const missing = [...used].filter((k) => !(k in en));
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(100);
  });
});

describe("index.html translation", () => {
  it("translates every bound element in every locale (no raw keys left)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const html = fs.readFileSync(
      path.resolve(__dirname, "..", "index.html"),
      "utf8",
    );
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
    document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");

    for (const { meta } of LOCALES) {
      setLanguage(meta.code);
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const text = el.textContent.trim();
        expect(text, `${meta.code}:${el.dataset.i18n}`).not.toBe("");
        expect(text).not.toBe(el.dataset.i18n);
      });
    }
    setLanguage("ru");
    expect(
      document.querySelector('[data-i18n="tab.sources"]').textContent,
    ).toBe("Источники");
    document.body.innerHTML = "";
  });
});

describe("admin panel", () => {
  it("admin.html binds only existing keys and translates in every locale", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const html = fs.readFileSync(
      path.resolve(__dirname, "..", "admin.html"),
      "utf8",
    );
    const en = LOCALES.find((l) => l.meta.code === "en").messages;
    const keys = [...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(keys.length).toBeGreaterThan(8);
    expect(keys.filter((k) => !(k in en))).toEqual([]);

    document.body.innerHTML = html
      .match(/<body[^>]*>([\s\S]*)<\/body>/)[1]
      .replace(/<script[\s\S]*?<\/script>/g, "");
    setLanguage("fa");
    expect(
      document.querySelector('[data-i18n="admin.logout"]').textContent,
    ).toBe("خروج");
    expect(document.documentElement.dir).toBe("rtl");
    setLanguage("ru");
    expect(
      document.querySelector('[data-i18n="admin.auth.submit"]').textContent,
    ).toBe("Войти");
    document.body.innerHTML = "";
  });

  it("has translated labels for every backend setting and option", () => {
    for (const { meta, messages } of LOCALES) {
      for (const k of [
        "admin.setting.default_theme.label",
        "admin.setting.default_language.label",
        "admin.option.default_theme.dark.label",
        "admin.option.default_theme.light.label",
      ]) {
        expect(messages[k], `${meta.code}:${k}`).toBeTruthy();
      }
    }
  });
});

describe("settings row layout", () => {
  it("language picker sits in a regular row (text left, control right)", async () => {
    document.body.innerHTML = "";
    localStorage.clear();
    const { openSettings } = await import("../scripts/ui/settings.js");
    openSettings();
    const select = document.getElementById("language-select");
    const row = select.closest(".setting-row");
    expect(row.classList.contains("setting-row-column")).toBe(false);
    expect(row.firstElementChild.classList.contains("setting-row-text")).toBe(
      true,
    );
    expect(row.lastElementChild).toBe(select);
    document.body.innerHTML = "";
  });
});
