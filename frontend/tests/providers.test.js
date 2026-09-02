import { describe, it, expect } from "vitest";
import { sortProvidersForDisplay } from "../scripts/ui/providers.js";

function conn(provider_name, status, is_authorized = status === "approved") {
  return { provider_name, status, is_authorized };
}

describe("sortProvidersForDisplay", () => {
  it("puts approved connections before pending ones", () => {
    const input = [
      conn("b-provider", "pending"),
      conn("a-provider", "approved"),
    ];
    const result = sortProvidersForDisplay(input).map((c) => c.provider_name);
    expect(result).toEqual(["a-provider", "b-provider"]);
  });

  it("puts pending before unknown/other statuses", () => {
    const input = [conn("z", "revoked", false), conn("a", "pending", false)];
    const result = sortProvidersForDisplay(input).map((c) => c.provider_name);
    expect(result).toEqual(["a", "z"]);
  });

  it("orders approved, then pending, then unknown as a full group ordering", () => {
    const input = [
      conn("unknown-provider", "revoked", false),
      conn("pending-provider", "pending", false),
      conn("approved-provider", "approved", true),
    ];
    const result = sortProvidersForDisplay(input).map((c) => c.provider_name);
    expect(result).toEqual([
      "approved-provider",
      "pending-provider",
      "unknown-provider",
    ]);
  });

  it("breaks ties within the same status alphabetically", () => {
    const input = [
      conn("zeta", "approved"),
      conn("alpha", "approved"),
      conn("mu", "approved"),
    ];
    const result = sortProvidersForDisplay(input).map((c) => c.provider_name);
    expect(result).toEqual(["alpha", "mu", "zeta"]);
  });

  it("does not mutate the input array", () => {
    const input = [conn("b", "pending"), conn("a", "approved")];
    const copy = [...input];
    sortProvidersForDisplay(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty list", () => {
    expect(sortProvidersForDisplay([])).toEqual([]);
  });
});
