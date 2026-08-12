/**
 * Application state management
 */

import { normalizeSources } from "./utils/helpers.js";

/**
 * Application state
 */
export const state = {
  // Connection
  connection: {
    connected: false,
    base_url: null,
    connected_at: null,
  },

  // Subscriptions
  subscriptions: [],

  // Current subscription
  currentSubToken: null,
  currentTab: "sources",

  // Draft sources
  draft: [],
  originalSources: [], // snapshot for discard
  hasUnsavedChanges: false,

  // UI state
  ctxSourceId: null,
  dragSrcIdx: null,

  // Loading states
  loadingList: false,
  loadingEditor: false,
};

export function updateConnection(connection) {
  state.connection = connection || {
    connected: false,
    base_url: null,
    connected_at: null,
  };
}

export function updateSubscriptions(subscriptions) {
  state.subscriptions = Array.isArray(subscriptions) ? subscriptions : [];
}

export function getCurrentSubscription() {
  return (
    state.subscriptions.find((s) => s.token === state.currentSubToken) || null
  );
}

// ---------------------------------------------------------------------------
// Subscription ownership / capabilities
// ---------------------------------------------------------------------------

/**
 * A subscription is "provider-owned" when the server tags it with a
 * provider_name. These are read-only catalog subscriptions surfaced by
 * v2hub-core (see providers.js) — as opposed to subscriptions the user
 * created themselves.
 */
export function isProviderSubscription(sub) {
  return !!(sub && sub.provider_name);
}

/**
 * Central capability registry for subscriptions.
 *
 * Every UI element that lets the user mutate a subscription or its sources
 * should check the relevant capability here instead of re-deriving
 * "is this a provider sub?" locally. This keeps the rule in one place and
 * makes it easy to loosen restrictions per-capability later (e.g. allowing
 * users to hide/reorder provider sources without allowing edits/deletes).
 *
 * user   — subscriptions created by the user via "＋ Создать" (full access)
 * provider — subscriptions surfacing a provider_name (read-only + copy only)
 */
const CAPABILITIES = {
  user: {
    editSubscription: true, // rename / change description
    deleteSubscription: true,
    editSourceComment: true, // per-source comment/visibility/depth modal
    toggleSourceHidden: true,
    reorderSources: true,
    addSource: true,
    deleteSource: true,
    refreshSource: true,
    copySource: true,
  },
  provider: {
    editSubscription: false,
    deleteSubscription: false,
    editSourceComment: false,
    toggleSourceHidden: false,
    reorderSources: false,
    addSource: false,
    deleteSource: false,
    refreshSource: false,
    copySource: true,
  },
};

/**
 * Get the capability set for a subscription.
 * @param {object|null} sub
 * @returns {typeof CAPABILITIES.user}
 */
export function getSubscriptionCapabilities(sub) {
  return isProviderSubscription(sub)
    ? CAPABILITIES.provider
    : CAPABILITIES.user;
}

/**
 * Convenience: capabilities for whatever subscription is currently open
 * in the editor. Falls back to full (user) capabilities when nothing is
 * selected, so callers that run before selection don't need a null check.
 */
export function getCurrentCapabilities() {
  return getSubscriptionCapabilities(getCurrentSubscription());
}

export function setCurrentSubscription(token, sources) {
  state.currentSubToken = token;
  const normalized = normalizeSources(sources || []);
  state.draft = normalized;
  state.originalSources = normalized.map((s) => ({ ...s }));
  state.hasUnsavedChanges = false;
}

export function getDraftSources() {
  return Array.isArray(state.draft) ? state.draft : [];
}

export function updateDraftSources(sources) {
  state.draft = normalizeSources(sources);
  state.hasUnsavedChanges = true;
}

export function normalizeDraftOrder() {
  state.draft.forEach((s, i) => (s.order_index = i));
}

export function markSaved() {
  state.hasUnsavedChanges = false;
}
export function markChanged() {
  state.hasUnsavedChanges = true;
}

export function resetCurrentSubscription() {
  state.currentSubToken = null;
  state.draft = [];
  state.originalSources = [];
  state.hasUnsavedChanges = false;
  state.currentTab = "sources";
}

export function switchTab(tab) {
  state.currentTab = tab;
}
export function setLoadingList(loading) {
  state.loadingList = loading;
}
export function setLoadingEditor(loading) {
  state.loadingEditor = loading;
}

/**
 * Split subscriptions into user-owned ones and provider-owned ones grouped
 * by provider_name. No network calls — just partitions state.subscriptions,
 * which is already fully loaded.
 *
 * @returns {{ personal: object[], providerGroups: { providerName: string, subs: object[] }[] }}
 */
export function groupSubscriptionsByProvider() {
  const personal = [];
  const groupsByName = new Map();

  for (const sub of state.subscriptions) {
    if (isProviderSubscription(sub)) {
      const key = sub.provider_name;
      if (!groupsByName.has(key)) groupsByName.set(key, []);
      groupsByName.get(key).push(sub);
    } else {
      personal.push(sub);
    }
  }

  const providerGroups = Array.from(groupsByName.entries()).map(
    ([providerName, subs]) => ({ providerName, subs }),
  );
  // Stable, predictable ordering in the UI
  providerGroups.sort((a, b) => a.providerName.localeCompare(b.providerName));

  return { personal, providerGroups };
}

export function getStats() {
  return {
    totalSubscriptions: state.subscriptions.length,
    totalSources: state.subscriptions.reduce(
      (sum, sub) =>
        sum +
        Number(
          (sub.sources_count ?? (sub.sources ? sub.sources.length : 0)) || 0,
        ),
      0,
    ),
    readySubscriptions: state.subscriptions.filter(
      (s) =>
        Number((s.sources_count ?? (s.sources ? s.sources.length : 0)) || 0) >
        0,
    ).length,
  };
}

/**
 * Save connection to storage.
 * base_url → localStorage (не секрет, удобно помнить между сессиями).
 * api_token → localStorage (токен сохраняется между сессиями).
 */
export function saveConnectionLocal(baseUrl, apiToken) {
  if (baseUrl) localStorage.setItem("v2hub_base_url", baseUrl);
  if (apiToken) localStorage.setItem("v2hub_api_token", apiToken);
}

/**
 * Load connection from storage.
 */
export function loadConnectionLocal() {
  return {
    base_url: localStorage.getItem("v2hub_base_url") || "",
    api_token: localStorage.getItem("v2hub_api_token") || "",
  };
}

/**
 * Clear local connection.
 */
export function clearConnectionLocal() {
  localStorage.removeItem("v2hub_base_url");
  localStorage.removeItem("v2hub_api_token");
}

// ---------------------------------------------------------------------------
// Server config
// ---------------------------------------------------------------------------

export const serverConfig = {
  fixed_api_url: null,
};

export function applyServerConfig(cfg) {
  serverConfig.fixed_api_url = cfg?.fixed_api_url ?? null;
}

export function getEffectiveBaseUrl() {
  if (serverConfig.fixed_api_url) return serverConfig.fixed_api_url;
  return loadConnectionLocal().base_url;
}
