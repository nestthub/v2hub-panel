/**
 * Toast notifications and Error display
 *
 * Поддержка структурированных ошибок нового API:
 *   [422] {"detail":{"error":"too_many_subscriptions","message":"...","details":{...}}}
 */

import { $, addClass, removeClass } from "../utils/dom.js";
import { t } from "../i18n/index.js";

let toastTimer = null;
let errorTimer = null;

/**
 * Show toast notification
 * @param {string} message
 * @param {number} duration
 */
export function showToast(message, duration = 2200) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  addClass(el, "show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => removeClass(el, "show"), duration);
}

// ══════════════════════════════════════════════════════════════════════════════
// Parsing helpers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Нормализует payload ответа API.
 * Поддерживает:
 * - { detail: {...} }
 * - { error: "...", message: "...", details: {...} }
 * - stringified JSON
 *
 * @param {any} payload
 * @returns {object|null}
 */
function normalizeApiPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const detail = payload.detail;
  if (
    detail &&
    typeof detail === "object" &&
    !Array.isArray(detail) &&
    ("error" in detail ||
      "error_code" in detail ||
      "code" in detail ||
      "type" in detail)
  ) {
    return detail;
  }

  if (
    "error" in payload ||
    "error_code" in payload ||
    "code" in payload ||
    "type" in payload
  ) {
    return payload;
  }

  return payload.detail && typeof payload.detail === "object"
    ? payload.detail
    : payload;
}

/**
 * Пытается распарсить JSON-строку.
 * @param {string} text
 * @returns {any|null}
 */
function tryParseJson(text) {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Извлекает структурированную информацию об ошибке из разных форматов:
 * - Error объект с полями status / detail / response.data
 * - Строка с префиксом [422] и JSON-телом
 * - Чистый JSON
 *
 * @param {Error|string|object} error
 * @returns {{statusCode: number|null, detail: object|null, rawMessage: string}}
 */
function parseErrorStructure(error) {
  let statusCode = null;
  let detail = null;
  let rawMessage = "";

  // 1) Error / object
  if (error && typeof error === "object" && !Array.isArray(error)) {
    statusCode =
      error.status ??
      error.status_code ??
      error.response?.status ??
      error.response?.status_code ??
      null;

    rawMessage =
      error.message ||
      error.response?.data?.message ||
      error.response?.data?.detail?.message ||
      "";

    // приоритет: response.data > detail > data
    const responseData =
      error.response?.data ?? error.data ?? error.detail ?? null;

    if (typeof responseData === "string") {
      const parsed = tryParseJson(responseData);
      if (parsed) {
        detail = normalizeApiPayload(parsed);
      }
    } else if (responseData && typeof responseData === "object") {
      detail = normalizeApiPayload(responseData);
    }
  } else {
    rawMessage = String(error || "");
  }

  // 2) Если detail ещё не получили — пробуем вытащить из rawMessage
  if (!detail && rawMessage) {
    const statusMatch = rawMessage.match(/^\[(\d{3})\]\s*/);
    if (statusMatch) {
      statusCode = statusCode ?? parseInt(statusMatch[1], 10);
      rawMessage = rawMessage.slice(statusMatch[0].length);
    }

    const parsed = tryParseJson(rawMessage);
    if (parsed) {
      detail = normalizeApiPayload(parsed);
    }
  }

  // 3) Если detail строка — попробуем распарсить
  if (typeof detail === "string") {
    const parsed = tryParseJson(detail);
    if (parsed) {
      detail = normalizeApiPayload(parsed);
    }
  }

  return { statusCode, detail, rawMessage };
}

// ══════════════════════════════════════════════════════════════════════════════
// Error code → human message mapping
// ══════════════════════════════════════════════════════════════════════════════

function limitParams(d) {
  return { count: d.count ?? "?", max: d.max_count ?? "?" };
}

/**
 * Преобразует error code из нового API в человекочитаемое сообщение.
 *
 * @param {string} code
 * @param {object} errorDetail
 * @returns {string}
 */
function knownErrorCode(code, errorDetail = {}) {
  const d = errorDetail.details ?? {};
  const serverMessage = errorDetail.message || "";
  const codeNorm = String(code || "").toLowerCase();

  switch (codeNorm) {
    // ── Лимиты ────────────────────────────────────────────────────────────
    case "too_many_subscriptions":
      return t("errCode.tooManySubscriptions", limitParams(d));

    case "too_many_sources":
      return t("errCode.tooManySources", limitParams(d));

    case "too_many_configs":
      return t("errCode.tooManyConfigs", limitParams(d));

    case "too_many_providers":
      return t("errCode.tooManyProviders", limitParams(d));

    case "rate_limit_exceeded": {
      const wait = errorDetail.retry_after ?? d.retry_after;
      return wait
        ? t("errCode.rateLimitWait", { seconds: wait })
        : t("errCode.rateLimit");
    }

    // ── Повторяемые / конфликтные ошибки ─────────────────────────────────
    case "duplicate_name": {
      const name = d.name || d.conflicting_value || "";
      return name
        ? t("errCode.duplicateNamed", { name })
        : t("errCode.duplicate");
    }

    case "conflict":
      return t("errCode.conflict");

    // ── Валидация ─────────────────────────────────────────────────────────
    case "invalid_config": {
      const field = d.field
        ? t("errCode.invalidConfigField", { field: d.field })
        : "";
      const errors =
        Array.isArray(d.errors) && d.errors.length
          ? `: ${d.errors.join(", ")}`
          : "";
      return t("errCode.invalidConfig", { field, errors });
    }

    case "invalid_url":
      return t("errCode.invalidUrl");

    case "validation_error":
      return t("errCode.validation");

    // ── Аутентификация / авторизация ──────────────────────────────────────
    case "authentication_error":
    case "authentication_failed":
    case "invalid_token":
    case "invalid_credentials":
      return t("errCode.auth");

    case "authorization_error":
    case "forbidden":
    case "access_denied":
    case "permission_denied":
      return t("errCode.forbidden");

    // ── Не найдено ────────────────────────────────────────────────────────
    case "subscription_not_found":
      return t("errCode.subscriptionNotFound");

    case "source_not_found":
      return t("errCode.sourceNotFound");

    case "not_found": {
      const { resource, identifier } = d;
      return resource && identifier
        ? t("errCode.notFoundNamed", { resource, id: identifier })
        : t("errCode.notFound");
    }

    // ── Циклы / глубина ────────────────────────────────────────────────────
    case "circular_reference": {
      const chain = d.chain;
      if (Array.isArray(chain) && chain.length >= 2) {
        const short = (id) => String(id).slice(0, 8) + "…";
        return t("errCode.circularChain", {
          chain: chain.map(short).join(" → "),
        });
      }
      return t("errCode.circular");
    }

    case "nesting_too_deep": {
      const depth = d.current_depth ?? d.depth;
      const max = d.max_depth;
      return depth && max
        ? t("errCode.nestingDepth", { depth, max })
        : t("errCode.nesting");
    }

    // ── Внешние источники ─────────────────────────────────────────────────
    case "external_fetch_error":
    case "fetch_error": {
      const url = d.url ? ` (${d.url})` : "";
      const reason = d.reason ? `: ${d.reason}` : "";
      return t("errCode.externalFetch", { url, reason });
    }

    case "network_error":
      return t("errCode.network");

    // ── Система / инфраструктура ──────────────────────────────────────────
    case "cache_error": {
      const { operation, reason } = d;
      return operation && reason
        ? t("errCode.cacheOp", { operation, reason })
        : t("errCode.cache");
    }

    case "server_error":
      return t("errCode.internal");

    case "service_unavailable":
      return t("errCode.unavailable");

    case "timeout":
      return t("errCode.timeout");

    // ── Общий fallback ────────────────────────────────────────────────────
    default:
      return serverMessage || codeNorm || t("errCode.unknown");
  }
}

/**
 * Извлекает человекочитаемое сообщение из detail.
 * @param {object|null} detail
 * @returns {string}
 */
function extractHumanMessage(detail) {
  if (!detail || typeof detail !== "object") return "";
  const code = detail.error || detail.error_code || detail.code || detail.type;
  if (code) return knownErrorCode(code, detail);
  return detail.message || "";
}

// ══════════════════════════════════════════════════════════════════════════════
// Error classification
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Классифицирует ошибку для выбора иконки, заголовка и подсказки.
 *
 * Важно: errorCode проверяется ДО statusCode.
 * Это нужно, чтобы 422 с too_many_* не превращалось в обычную validation error.
 *
 * @param {number|null} statusCode
 * @param {object|null} detail
 * @param {string} humanMessage
 * @returns {{title: string, hint: string, icon: string, iconClass: string}}
 */
function classifyError(statusCode, detail, humanMessage, isNetwork = false) {
  const msg = (humanMessage || "").toLowerCase();

  const errorCode = String(
    detail?.error || detail?.error_code || detail?.code || detail?.type || "",
  ).toLowerCase();

  // ── Лимиты: всегда первыми ─────────────────────────────────────────────
  if (
    errorCode === "rate_limit_exceeded" ||
    errorCode === "too_many_subscriptions" ||
    errorCode === "too_many_sources" ||
    errorCode === "too_many_configs" ||
    errorCode === "too_many_providers" ||
    statusCode === 429
  ) {
    return {
      title: t("errView.limit.title"),
      hint: t("errView.limit.hint"),
      icon: "🚫",
      iconClass: "icon-validation",
    };
  }

  // ── Сетевые ошибки (обычно без статуса) ────────────────────────────────
  if (
    !statusCode &&
    (msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed") ||
      msg.includes("net::") ||
      msg.includes("err_") ||
      isNetwork)
  ) {
    return {
      title: t("errView.network.title"),
      hint: t("errView.network.hint"),
      icon: "📡",
      iconClass: "icon-network",
    };
  }

  // ── Аутентификация / авторизация ──────────────────────────────────────
  if (
    statusCode === 401 ||
    errorCode === "authentication_error" ||
    errorCode === "authentication_failed" ||
    errorCode === "invalid_token" ||
    errorCode === "invalid_credentials"
  ) {
    return {
      title: t("errView.token.title"),
      hint: t("errView.token.hint"),
      icon: "🔐",
      iconClass: "icon-validation",
    };
  }

  if (
    statusCode === 403 ||
    errorCode === "authorization_error" ||
    errorCode === "forbidden" ||
    errorCode === "access_denied" ||
    errorCode === "permission_denied"
  ) {
    return {
      title: t("errView.forbidden.title"),
      hint: t("errView.forbidden.hint"),
      icon: "🚷",
      iconClass: "icon-validation",
    };
  }

  // ── Не найдено ────────────────────────────────────────────────────────
  if (
    statusCode === 404 ||
    errorCode === "subscription_not_found" ||
    errorCode === "source_not_found" ||
    errorCode === "not_found"
  ) {
    return {
      title: t("errView.notFound.title"),
      hint: t("errView.notFound.hint"),
      icon: "🔍",
      iconClass: "icon-unknown",
    };
  }

  // ── Конфликт / дубликаты ───────────────────────────────────────────────
  if (
    statusCode === 409 ||
    errorCode === "duplicate_name" ||
    errorCode === "conflict"
  ) {
    return {
      title: t("errView.conflict.title"),
      hint: t("errView.conflict.hint"),
      icon: "🔁",
      iconClass: "icon-validation",
    };
  }

  // ── Внешние источники ─────────────────────────────────────────────────
  if (errorCode === "external_fetch_error" || errorCode === "fetch_error") {
    return {
      title: t("errView.external.title"),
      hint: t("errView.external.hint"),
      icon: "🔗",
      iconClass: "icon-network",
    };
  }

  // ── Инфраструктура / сервер ───────────────────────────────────────────
  if (statusCode === 502) {
    return {
      title: t("errView.gateway.title"),
      hint: t("errView.gateway.hint"),
      icon: "🌐",
      iconClass: "icon-server",
    };
  }

  if (statusCode === 503 || errorCode === "service_unavailable") {
    return {
      title: t("errView.unavailable.title"),
      hint: t("errView.unavailable.hint"),
      icon: "🔧",
      iconClass: "icon-server",
    };
  }

  if (statusCode === 504 || errorCode === "timeout") {
    return {
      title: t("errView.timeout.title"),
      hint: t("errView.timeout.hint"),
      icon: "⏱",
      iconClass: "icon-server",
    };
  }

  if (
    statusCode === 500 ||
    errorCode === "server_error" ||
    errorCode === "internal_error" ||
    errorCode === "database_error" ||
    errorCode === "cache_error"
  ) {
    return {
      title: t("errView.server.title"),
      hint: t("errView.server.hint"),
      icon: "🖥️",
      iconClass: "icon-server",
    };
  }

  // ── Валидация: только после всех спец-кодов ───────────────────────────
  if (
    statusCode === 422 ||
    statusCode === 400 ||
    errorCode === "validation_error" ||
    errorCode === "invalid_config" ||
    errorCode === "invalid_url" ||
    errorCode === "circular_reference" ||
    errorCode === "nesting_too_deep"
  ) {
    return {
      title: t("errView.validation.title"),
      hint: t("errView.validation.hint"),
      icon: "✋",
      iconClass: "icon-validation",
    };
  }

  return {
    title: t("errView.generic.title"),
    hint: t("errView.generic.hint"),
    icon: "⚠",
    iconClass: "icon-unknown",
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Public API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Показывает уведомление об ошибке с иконкой, заголовком и подсказкой.
 * @param {Error|string|object} error
 * @param {number} duration
 */
export function showError(error, duration = 5000) {
  console.error("Original error:", error);
  const { statusCode, detail, rawMessage } = parseErrorStructure(error);
  const humanMessage =
    extractHumanMessage(detail) || rawMessage || t("errView.generic.title");

  const { title, hint, icon, iconClass } = classifyError(
    statusCode,
    detail,
    humanMessage,
    Boolean(error && error.isNetworkError),
  );

  const notification = $("error-notification");
  const iconEl = $("error-icon");
  const titleEl = $("error-title");
  const msgEl = $("error-message");
  const hintEl = $("error-hint");

  if (!notification) {
    showToast(humanMessage || title, 3500);
    return;
  }

  if (iconEl) {
    iconEl.textContent = icon;
    iconEl.className = "error-notification-icon " + iconClass;
  }
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = humanMessage;
  if (hintEl) hintEl.textContent = hint;

  notification.classList.add("show");

  clearTimeout(errorTimer);
  errorTimer = setTimeout(
    () => notification.classList.remove("show"),
    duration,
  );
}

/** @param {string} message */
export function showSuccess(message) {
  showToast(message);
}

/** @param {string} message */
export function showInfo(message) {
  showToast(message);
}
