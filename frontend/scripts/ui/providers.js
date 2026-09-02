/**
 * User's VPN Providers UI (issue #11 item 5).
 *
 * Shows every provider the user has a connection record for — approved
 * ones first, then pending ones — fetched live from
 * /api/connections via API.listConnections(). Clicking a row opens the
 * same provider connection modal used by the editor badge and the
 * pending-providers section, so there is exactly one place that renders
 * connection details/actions.
 */

import { $, clearChildren, createElement } from "../utils/dom.js";
import { escapeHtml } from "../utils/helpers.js";
import * as API from "../api.js";
import * as State from "../state.js";
import { showScreen } from "./subscriptions.js";
import {
  resolveConnectionUiState,
  openConnectionModalFor,
} from "./provider-connections.js";

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

function buildProviderRow(connection) {
  const uiState = resolveConnectionUiState(connection);

  const card = createElement("button", {
    type: "button",
    class: "sub-card provider-conn-card",
  });
  card.setAttribute(
    "aria-label",
    `Информация о провайдере ${connection.provider_name}`,
  );
  card.addEventListener("click", () =>
    openConnectionModalFor(connection.provider_name),
  );

  const avatar = createElement("div", { class: "sub-avatar" });
  avatar.textContent = "🛰️";

  const info = createElement("div", { class: "sub-info" });
  info.innerHTML = `
    <div class="sub-name">${escapeHtml(connection.provider_name)}</div>
    <div class="sub-desc">${
      connection.provider_url
        ? escapeHtml(connection.provider_url)
        : "Без адреса"
    }</div>
  `;

  const meta = createElement("div", { class: "sub-meta" });
  meta.innerHTML = `
    <span class="status-pill status-pill-${uiState} status-pill-compact">${escapeHtml(statusLabel(uiState))}</span>
    <span class="chevron">›</span>
  `;

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(meta);
  return card;
}

function renderEmpty(list, isConnected) {
  const empty = createElement("div", { class: "empty" });
  empty.innerHTML = isConnected
    ? `<div class="empty-icon">🛰️</div>
       <div class="empty-title">Нет провайдеров</div>
       <div class="empty-sub">Провайдеры появятся здесь, как только у вас будет хотя бы одно подключение</div>`
    : `<div class="empty-icon">🔌</div>
       <div class="empty-title">Нет подключения</div>
       <div class="empty-sub">Укажите API-адрес и токен, чтобы увидеть своих провайдеров</div>`;
  list.appendChild(empty);
}

function renderLoading(list) {
  list.innerHTML = `
    <div class="loading-state">
      <span class="spinner"></span>
      <div>Загрузка провайдеров…</div>
    </div>
  `;
}

function renderError(list, error) {
  const message =
    (error && error.message) || "Не удалось загрузить список провайдеров.";
  list.innerHTML = `
    <div class="empty">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">Ошибка</div>
      <div class="empty-sub">${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * Approved connections first, then pending, then anything else — the
 * ordering issue #11 item 5 asks for. Ties within a group are broken
 * alphabetically for a stable, predictable list. Pure/exported so it's
 * unit-testable without touching the DOM.
 * @param {Array<{provider_name: string}>} connections
 */
export function sortProvidersForDisplay(connections) {
  const rank = { approved: 0, pending: 1, unknown: 2 };
  return [...connections].sort((a, b) => {
    const ra = rank[resolveConnectionUiState(a)] ?? 2;
    const rb = rank[resolveConnectionUiState(b)] ?? 2;
    if (ra !== rb) return ra - rb;
    return a.provider_name.localeCompare(b.provider_name);
  });
}

/**
 * Fetch and render the user's providers: approved first, then pending
 * (issue #11 item 5's required ordering). Any other/unrecognized status
 * is appended last rather than dropped, so nothing silently disappears.
 */
export async function renderProviders() {
  const list = $("providers-list");
  if (!list) return;

  // Bail out early if there's no connection at all — API.listConnections
  // would just fail with the same "not connected" error, so give a more
  // specific empty state instead of a generic error toast.
  if (!State.state.connection.connected) {
    clearChildren(list);
    renderEmpty(list, false);
    return;
  }

  renderLoading(list);

  let connections;
  try {
    const result = await API.listConnections();
    connections = Array.isArray(result?.connections) ? result.connections : [];
  } catch (e) {
    renderError(list, e);
    return;
  }

  clearChildren(list);

  if (!connections.length) {
    renderEmpty(list, true);
    return;
  }

  sortProvidersForDisplay(connections).forEach((connection) => {
    list.appendChild(buildProviderRow(connection));
  });
}

/**
 * Open providers screen
 */
export function openProviders() {
  renderProviders();

  showScreen("screen-providers");
}

/**
 * Return to subscriptions list
 */
export function goBackToList() {
  showScreen("screen-list");
}
