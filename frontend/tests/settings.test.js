import { beforeEach, describe, expect, it } from "vitest";
import {
  applyDefaultTheme,
  loadSavedTheme,
} from "../scripts/ui/settings.js";

describe("theme defaults", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = "";
  });

  it("applies the server default without persisting it as a user choice", () => {
    loadSavedTheme();
    applyDefaultTheme("light");

    expect(document.body.classList.contains("light-theme")).toBe(true);
    expect(localStorage.getItem("v2hub_theme")).toBeNull();
  });

  it("keeps an explicitly saved user theme over the server default", () => {
    localStorage.setItem("v2hub_theme", "dark");

    loadSavedTheme();
    applyDefaultTheme("light");

    expect(document.body.classList.contains("dark-theme")).toBe(true);
    expect(document.body.classList.contains("light-theme")).toBe(false);
    expect(localStorage.getItem("v2hub_theme")).toBe("dark");
  });
});