/**
 * Provider connection management (issue #11).
 *
 * Two entry points into the same backend state:
 *   1. Clicking the provider badge in the subscription editor
 *      (#editor-provider-badge) opens a modal for THAT subscription's
 *      provider.
 *   2. A "Pending Providers" section in the bottom panel lists every
 *      PENDING connection and lets the user approve/reject inline.
 *
 * The backend (v2hub server, reached through the panel API) is the only
 * source of truth for connection status. This module never infers or
 * caches a status transition locally -- every action re-fetches state
 * from the server afterwards (see refreshAfterChange()).
 */

import * as API from "../api.js";
import * as State from "../state.js";
import { $, createElement, clearChildren } from "../utils/dom.js";
import { escapeHtml } from "../utils/helpers.js";
import { showToast, showError } from "./toast.js";
import { openModal, closeModal } from "./modals.js";

// ---------------------------------------------------------------------------
// Small pure helpers (unit-testable, no DOM)
// ---------------------------------------------------------------------------

/**
 * Normalize whatever the backend sent for `status` into one of the three
 * UI states this module knows how to render. Anything else (null,
 * "revoked", "unknown", a future status the backend adds) falls back to
 * "unknown" so the modal can show a safe read-only view instead of
 * guessing at an action set that might not apply.
 * @param {{status?: string|null, is_authorized?: boolean}} connection
 * @returns {"approved"|"pending"|"unknown"}
 */
export function resolveConnectionUiState(connection) {
  if (!connection) return "unknown";
  const status = (connection.status || "").toLowerCase();
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  // Fall back to is_authorized for servers that omit `status` but do
  // send is_authorized -- still never invents "pending" out of nothing.
  if (status === "" && connection.is_authorized) return "approved";
  return "unknown";
}

/**
 * Pull the provider name out of the editor badge element's own text
 * content -- the badge is the single source of truth the issue asks for
 * ("Read the provider name from #editor-provider-badge"), not
 * State.getCurrentSubscription().provider_name, so this keeps working
 * even if the two ever drift.
 * @param {HTMLElement|null} badgeEl
 * @returns {string|null}
 */
export function readProviderNameFromBadge(badgeEl) {
  const name = (badgeEl?.textContent || "").trim();
  return name || null;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

// Which provider the currently-open modal refers to, and its last known
// server state -- read by the modal's own button handlers so they don't
// need the provider name threaded through every onclick.
let _activeProviderName = null;
let _activeConnection = null;

// Guards against double-submitting while a request for a given provider
// is in flight (badge modal actions and pending-list row actions share
// this so the same provider can't be approved twice from two places).
const _pendingRequests = new Set();

function isRequestInFlight(providerName) {
  return _pendingRequests.has(providerName);
}

// ---------------------------------------------------------------------------
// Badge -> modal entry point
// ---------------------------------------------------------------------------

/**
 * Handle a click on #editor-provider-badge: read the provider name, ask
 * the backend for its connection state, and open the info modal.
 */
export async function openProviderConnectionModal() {
  const providerName = readProviderNameFromBadge($("editor-provider-badge"));
  if (!providerName) return;

  await loadAndShowConnection(providerName);
}

/**
 * Re-open the modal for a specific provider (used by the pending-list
 * rows, which each pass their own provider name rather than relying on
 * the editor badge).
 * @param {string} providerName
 */
export async function openConnectionModalFor(providerName) {
  if (!providerName) return;
  await loadAndShowConnection(providerName);
}

async function loadAndShowConnection(providerName) {
  _activeProviderName = providerName;
  _activeConnection = null;

  renderModalLoading(providerName);
  openModal("modal-provider-connection");

  try {
    const connection = await API.getConnection(providerName);
    _activeConnection = connection;
    renderModalContent(connection);
  } catch (e) {
    renderModalError(providerName, e);
  }
}

// ---------------------------------------------------------------------------
// Modal rendering
// ---------------------------------------------------------------------------

function modalBody() {
  return $("provider-connection-body");
}

function renderModalLoading(providerName) {
  const body = modalBody();
  if (!body) return;

  body.innerHTML = `
    <div class="loading-state">
      <span class="spinner"></span>
      <div>Загрузка данных о ${escapeHtml(providerName)}…</div>
    </div>
  `;
}

function renderModalError(providerName, error) {
  const body = modalBody();
  if (!body) return;

  const message =
    (error && error.message) || "Не удалось загрузить данные о подключении.";

  body.innerHTML = `
    <div class="empty">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">Ошибка</div>
      <div class="empty-sub">${escapeHtml(message)}</div>
    </div>
  `;

  const footer = createElement("div", { class: "modal-footer" });
  const retryBtn = createElement(
    "button",
    { class: "btn btn-secondary", type: "button" },
    "Повторить",
  );
  retryBtn.addEventListener("click", () => loadAndShowConnection(providerName));
  footer.appendChild(retryBtn);
  body.appendChild(footer);
}

/**
 * @param {{provider_name: string, provider_url: string|null, is_authorized: boolean, status: string|null}} connection
 */
function renderModalContent(connection) {
  const body = modalBody();
  if (!body) return;

  const uiState = resolveConnectionUiState(connection);

  clearChildren(body);
  body.appendChild(buildConnectionInfoBlock(connection, uiState));

  const footer = createElement("div", { class: "modal-footer" });

  if (uiState === "approved") {
    const disconnectBtn = createElement(
      "button",
      {
        class: "btn btn-danger btn-primary btn-full",
        type: "button",
        id: "provider-conn-disconnect-btn",
      },
      "Отключить",
    );
    disconnectBtn.addEventListener("click", () =>
      handleRevoke(connection.provider_name, disconnectBtn),
    );
    footer.appendChild(disconnectBtn);
  } else if (uiState === "pending") {
    const approveBtn = createElement(
      "button",
      {
        class: "btn btn-primary",
        type: "button",
        id: "provider-conn-approve-btn",
      },
      "Одобрить",
    );
    const rejectBtn = createElement(
      "button",
      {
        class: "btn btn-danger btn-primary",
        type: "button",
        id: "provider-conn-reject-btn",
      },
      "Отклонить",
    );
    approveBtn.addEventListener("click", () =>
      handleApprove(connection.provider_name, [approveBtn, rejectBtn]),
    );
    rejectBtn.addEventListener("click", () =>
      handleReject(connection.provider_name, [approveBtn, rejectBtn]),
    );
    footer.appendChild(approveBtn);
    footer.appendChild(rejectBtn);
  }
  // uiState === "unknown": no actions offered, info-only view. The
  // backend is the source of truth on what actions are valid; we don't
  // guess an action set for a status we don't recognize.

  if (footer.children.length) {
    body.appendChild(footer);
  }
}

function statusLabel(uiState) {
  switch (uiState) {
    case "approved":
      return "Подключено";
    case "pending":
      return "Ожидает подтверждения";
    default:
      return "Неизвестно";
  }
}

function buildConnectionInfoBlock(connection, uiState) {
  const wrapper = createElement("div", { class: "provider-conn-info" });

  const nameRow = createElement("div", { class: "provider-conn-row" });
  nameRow.innerHTML = `
    <span class="provider-conn-label">Провайдер</span>
    <span class="provider-conn-value">${escapeHtml(connection.provider_name)}</span>
  `;
  wrapper.appendChild(nameRow);

  if (connection.provider_url) {
    const urlRow = createElement("div", { class: "provider-conn-row" });
    const safeUrl = escapeHtml(connection.provider_url);
    urlRow.innerHTML = `
      <span class="provider-conn-label">Адрес</span>
      <a class="provider-conn-value provider-conn-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>
    `;
    wrapper.appendChild(urlRow);
  }

  const statusRow = createElement("div", { class: "provider-conn-row" });
  statusRow.innerHTML = `
    <span class="provider-conn-label">Статус</span>
    <span class="status-pill status-pill-${uiState}">${escapeHtml(statusLabel(uiState))}</span>
  `;
  wrapper.appendChild(statusRow);

  return wrapper;
}

// ---------------------------------------------------------------------------
// Actions (approve / reject / revoke) — shared plumbing
// ---------------------------------------------------------------------------

/**
 * Runs a provider action with the full loading/disable/error contract
 * from the issue: disables the triggering button(s) immediately, blocks
 * duplicate submissions for the same provider, restores the buttons and
 * shows the error on failure (state left unchanged), and on success
 * refreshes everything that depends on connection state.
 *
 * @param {string} providerName
 * @param {HTMLElement[]} buttons - buttons to disable while in flight
 * @param {() => Promise<any>} action
 * @param {string} successMessage
 */
async function runProviderAction(
  providerName,
  buttons,
  action,
  successMessage,
) {
  if (isRequestInFlight(providerName)) return;

  _pendingRequests.add(providerName);
  buttons.forEach((btn) => {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add("is-loading");
  });

  try {
    await action();
    showToast(successMessage);
    await refreshAfterChange(providerName);
  } catch (e) {
    // Failure: leave current state untouched, re-enable controls, and
    // surface the API error to the user.
    showError(e);
    buttons.forEach((btn) => {
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove("is-loading");
    });
  } finally {
    _pendingRequests.delete(providerName);
  }
}

async function handleApprove(providerName, buttons) {
  await runProviderAction(
    providerName,
    buttons,
    () => API.approveConnection(providerName),
    `Провайдер «${providerName}» подключён`,
  );
}

async function handleReject(providerName, buttons) {
  await runProviderAction(
    providerName,
    buttons,
    () => API.rejectConnection(providerName),
    `Заявка от «${providerName}» отклонена`,
  );
}

async function handleRevoke(providerName, button) {
  await runProviderAction(
    providerName,
    [button],
    () => API.revokeConnection(providerName),
    `Подключение к «${providerName}» отключено`,
  );
}

/**
 * State Synchronization (issue #11 section 5): after any successful
 * approve/reject/revoke, refetch from the backend rather than inferring
 * the new state locally, then update every UI surface that depends on
 * connection state — the editor badge, the pending-providers section,
 * and the modal itself.
 */
async function refreshAfterChange(providerName) {
  // Refresh the pending-providers list first; independent of whether the
  // modal stays open, and cheap even if the provider no longer appears.
  await renderPendingProviders();

  let latest = null;
  try {
    latest = await API.getConnection(providerName);
  } catch (e) {
    // The connection lookup itself failing after a successful action is
    // unusual (e.g. transient network blip) — close the modal rather
    // than show stale/incorrect info, the pending list above is already
    // current.
    closeModal("modal-provider-connection");
    return;
  }

  const uiState = resolveConnectionUiState(latest);

  // Update the editor badge if the currently-open subscription belongs
  // to this provider.
  const currentSub = State.getCurrentSubscription();
  if (currentSub && currentSub.provider_name === providerName) {
    const badge = $("editor-provider-badge");
    if (badge) badge.textContent = latest.provider_name;
  }

  if (uiState === "unknown") {
    // Rejected/revoked-with-no-further-action (or any status this UI
    // doesn't render actions for) — nothing more to approve/reject here,
    // close the modal instead of showing an empty action-less card.
    closeModal("modal-provider-connection");
    return;
  }

  _activeConnection = latest;
  renderModalContent(latest);
}

// ---------------------------------------------------------------------------
// Pending Providers section (bottom panel)
// ---------------------------------------------------------------------------

function pendingListEl() {
  return $("pending-providers-list");
}

function pendingSectionEl() {
  return $("pending-providers-section");
}

/**
 * Fetch all connections and render the PENDING ones into the bottom
 * panel's "Provider Requests" section. Safe to call before a connection
 * is established (renders nothing rather than erroring loudly, since
 * this runs as part of general list refreshes).
 */
export async function renderPendingProviders() {
  const list = pendingListEl();
  const section = pendingSectionEl();
  if (!list || !section) return;

  if (!State.state.connection.connected) {
    section.classList.add("hidden");
    clearChildren(list);
    return;
  }

  let connections;
  try {
    const result = await API.listConnections();
    connections = Array.isArray(result?.connections) ? result.connections : [];
  } catch {
    // Non-fatal: the main subscriptions list already surfaces connection
    // errors loudly; don't pile a second error toast on top for this
    // secondary section. Just hide it until the next successful refresh.
    section.classList.add("hidden");
    clearChildren(list);
    return;
  }

  const pending = connections.filter(
    (c) => resolveConnectionUiState(c) === "pending",
  );

  clearChildren(list);

  if (!pending.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  pending.forEach((connection) => {
    list.appendChild(buildPendingProviderRow(connection));
  });
}

function buildPendingProviderRow(connection) {
  const row = createElement("div", { class: "pending-provider-row" });

  const info = createElement("div", { class: "pending-provider-info" });
  info.innerHTML = `
    <div class="pending-provider-name">${escapeHtml(connection.provider_name)}</div>
    ${
      connection.provider_url
        ? `<div class="pending-provider-url">${escapeHtml(connection.provider_url)}</div>`
        : ""
    }
    <span class="status-pill status-pill-pending">Ожидает подтверждения</span>
  `;

  const actions = createElement("div", { class: "pending-provider-actions" });
  const approveBtn = createElement(
    "button",
    { class: "btn btn-primary btn-sm", type: "button" },
    "Одобрить",
  );
  const rejectBtn = createElement(
    "button",
    { class: "btn btn-danger btn-primary btn-sm", type: "button" },
    "Отклонить",
  );

  approveBtn.addEventListener("click", () =>
    handleApprove(connection.provider_name, [approveBtn, rejectBtn]),
  );
  rejectBtn.addEventListener("click", () =>
    handleReject(connection.provider_name, [approveBtn, rejectBtn]),
  );

  actions.appendChild(approveBtn);
  actions.appendChild(rejectBtn);

  row.appendChild(info);
  row.appendChild(actions);
  return row;
}
