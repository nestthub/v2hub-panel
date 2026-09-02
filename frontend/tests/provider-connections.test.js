import { describe, it, expect } from "vitest";
import {
  resolveConnectionUiState,
  readProviderNameFromBadge,
} from "../scripts/ui/provider-connections.js";

describe("resolveConnectionUiState", () => {
  it("returns 'approved' for status: approved", () => {
    expect(
      resolveConnectionUiState({ status: "approved", is_authorized: true }),
    ).toBe("approved");
  });

  it("is case-insensitive on status", () => {
    expect(
      resolveConnectionUiState({ status: "APPROVED", is_authorized: true }),
    ).toBe("approved");
    expect(
      resolveConnectionUiState({ status: "Pending", is_authorized: false }),
    ).toBe("pending");
  });

  it("returns 'pending' for status: pending", () => {
    expect(
      resolveConnectionUiState({ status: "pending", is_authorized: false }),
    ).toBe("pending");
  });

  it("falls back to is_authorized when status is missing", () => {
    expect(
      resolveConnectionUiState({ status: null, is_authorized: true }),
    ).toBe("approved");
  });

  it("returns 'unknown' when neither status nor is_authorized indicate a known state", () => {
    expect(
      resolveConnectionUiState({ status: null, is_authorized: false }),
    ).toBe("unknown");
  });

  it("returns 'unknown' for an unrecognized status (e.g. revoked)", () => {
    expect(
      resolveConnectionUiState({ status: "revoked", is_authorized: false }),
    ).toBe("unknown");
  });

  it("returns 'unknown' for null/undefined connection", () => {
    expect(resolveConnectionUiState(null)).toBe("unknown");
    expect(resolveConnectionUiState(undefined)).toBe("unknown");
  });

  it("returns 'unknown' for an empty object", () => {
    expect(resolveConnectionUiState({})).toBe("unknown");
  });
});

describe("readProviderNameFromBadge", () => {
  it("reads and trims the badge's text content", () => {
    const el = { textContent: "  v2hub  " };
    expect(readProviderNameFromBadge(el)).toBe("v2hub");
  });

  it("returns null for empty text content", () => {
    expect(readProviderNameFromBadge({ textContent: "" })).toBeNull();
    expect(readProviderNameFromBadge({ textContent: "   " })).toBeNull();
  });

  it("returns null when the element itself is missing", () => {
    expect(readProviderNameFromBadge(null)).toBeNull();
    expect(readProviderNameFromBadge(undefined)).toBeNull();
  });
});
