/**
 * English — the source of truth and the fallback for every other locale.
 * Every key used in the UI must exist here.
 */
export default {
  meta: { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" },
  messages: {
    // ── common ───────────────────────────────────────────────────────────
    "common.refresh": "Refresh",
    "common.edit": "Edit",
    "common.menu": "Menu",
    "common.back": "Back",
    "common.close": "Close",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.copy": "Copy",
    "common.retry": "Retry",
    "common.name": "Name",

    // ── topbar / about ───────────────────────────────────────────────────
    "about.title": "About",
    "about.bot": "Telegram bot",
    "about.developer": "Developer",
    "topbar.connect": "Connection",
    "conn.connected": "Connected",
    "conn.disconnected": "Not connected",

    // ── settings ─────────────────────────────────────────────────────────
    "settings.title": "Settings",
    "settings.close": "Close settings",
    "settings.darkTheme": "Dark theme",
    "settings.darkThemeHint":
      "Pick the theme you like. (The light theme may have palette issues)",
    "settings.language": "Language",
    "settings.languageHint": "Interface language",

    // ── subscriptions list ───────────────────────────────────────────────
    "list.title": "Subscriptions",
    "list.subtitle": "Manage sources and connections",
    "list.statSubs": "Subscriptions",
    "list.statConfigs": "Configs",
    "list.create": "＋ Create",
    "list.providers": "Providers",
    "list.banner":
      "Public link, Base64 and QR code are available inside the selected subscription.",
    "list.loading": "Loading subscriptions…",
    "list.noDesc": "No description",
    "list.configsShort": "{count} cfg.",
    "list.emptyTitle": "No subscriptions",
    "list.emptySub": "Tap “＋ Create” to add your first subscription",
    "conn.emptyTitle": "Not connected",
    "conn.emptySub":
      "Tap the ⌁ button in the top corner to set the API address and token",

    // ── editor ───────────────────────────────────────────────────────────
    "editor.defaultTitle": "Subscription",
    "editor.providerBadgeTitle": "Show provider connection status",
    "editor.loading": "Loading…",
    "editor.wait": "Please wait",
    "editor.loadError": "Failed to load",
    "tab.sources": "Sources",
    "tab.preview": "Preview",
    "tab.export": "Connection",
    "editorMenu.edit": "Edit subscription",
    "editorMenu.refresh": "Refresh data",
    "editorMenu.delete": "Delete subscription",
    "provider.infoTitle": "About provider “{name}”",
    "provider.infoAria": "About provider {name}",

    // ── sources ──────────────────────────────────────────────────────────
    "sources.add": "＋ Add source",
    "sources.reorderHint": "Drag sources by their handle to change the order.",
    "sources.readonlyHint": "Sources are provided by the provider — copy only.",
    "sources.dragHint": "Drag a source to change its order",
    "sources.emptyTitle": "No sources yet",
    "sources.emptySub":
      "Add a config, a subscription link or an internal token",
    "sources.move": "Move",
    "sources.hiddenTitle": "Hidden from users — tap to show",
    "sources.visibleTitle": "Visible to users — tap to hide",
    "ctx.copy": "Copy",
    "ctx.deleteSource": "Delete source",
    "sourceEdit.title": "Edit config",
    "sourceEdit.comment": "Comment",
    "sourceEdit.commentPlaceholder": "Enter a comment",
    "sourceEdit.commentHint": "Shown in the interface only",
    "sourceEdit.hidden": "Hidden from users",
    "sourceEdit.hiddenHint":
      "The source stays in the subscription but is excluded from resolution",
    "sourceEdit.depth": "Nesting depth",
    "sourceEdit.depthHint":
      "How many levels of nested subscriptions are allowed (0–3)",
    "advanced.title": "Advanced settings",

    // ── preview / export ─────────────────────────────────────────────────
    "preview.totalConfigs": "Total configs",
    "preview.sources": "Sources",
    "preview.types": "Types",
    "preview.none": "No sources",
    "preview.shown": "Showing {shown} of {total}",
    "preview.scroll": "Scroll to see all",
    "export.linkLabel": "Connection link",
    "export.linkDesc": "Copy the link and paste it into v2ray/v2bot/etc.",
    "export.copyLink": "Copy link",
    "export.qr": "Subscription QR",
    "export.saveFile": "Save to file",
    "qr.caption": "Scan to connect to the subscription",
    "qr.download": "Download QR",

    // ── providers ────────────────────────────────────────────────────────
    "providers.subtitle": "Your connected and pending providers",
    "providers.noAddress": "No address",
    "providers.emptyTitle": "No providers",
    "providers.emptySub":
      "Providers will appear here once you have at least one connection",
    "providers.emptySubNoConn":
      "Set the API address and token to see your providers",
    "providers.loading": "Loading providers…",
    "providers.loadError": "Failed to load the providers list.",
    "status.approved": "Connected",
    "status.pending": "Awaiting approval",
    "status.unknown": "Unknown",
    "providerConn.modalTitle": "Provider connection",
    "providerConn.loading": "Loading {name}…",
    "providerConn.loadError": "Failed to load connection data.",
    "providerConn.disconnect": "Disconnect",
    "providerConn.approve": "Approve",
    "providerConn.reject": "Reject",
    "providerConn.address": "Address",
    "providerConn.approved": "Provider “{name}” connected",
    "providerConn.rejected": "Request from “{name}” rejected",
    "providerConn.revoked": "Connection to “{name}” disconnected",

    // ── save bar ─────────────────────────────────────────────────────────
    "savebar.discard": "Cancel",
    "savebar.save": "Save changes",
    "savebar.saving": "Saving…",
    "unsaved.confirm": "You have unsaved changes. Leave without saving?",

    // ── connect modal ────────────────────────────────────────────────────
    "connect.modalTitle": "Connect to v2hub API",
    "connect.fixed": "fixed",
    "connect.token": "API token",
    "connect.tokenPlaceholder": "Enter token",
    "connect.noToken": "No token?",
    "connect.reset": "Reset",
    "connect.connect": "Connect",

    // ── add / create / edit modals ───────────────────────────────────────
    "addSource.title": "Add source",
    "addSource.submit": "Add source",
    "addSource.addRow": "+ Add another row",
    "addSource.hint":
      "Supported: vless://, vmess://, ss://, trojan:// and others. You can also add other subscriptions",
    "addSource.placeholder": "vless://... or https://.../sub/token",
    "addSource.removeRow": "Remove row",
    "create.title": "Create subscription",
    "create.submit": "Create",
    "create.nameHint": "A name only you can see",
    "create.desc": "Description (optional)",
    "create.descHint": "Subscription name shown in the end-user app.",
    "create.initial": "Initial sources (optional)",
    "edit.title": "Edit subscription",
    "edit.desc": "Description (shown in apps)",

    // ── toasts ───────────────────────────────────────────────────────────
    "toast.saved": "Changes saved",
    "toast.discarded": "Changes discarded",
    "toast.refreshed": "Data refreshed",
    "toast.connected": "Connected",
    "toast.reset": "Reset",
    "toast.enterName": "Enter a name",
    "toast.sourceRejectedOne": 'Could not recognize source: "{source}"',
    "toast.sourceRejectedMany":
      "Could not recognize {count} sources — check the format",
    "toast.subCreated": "Subscription created",
    "toast.subUpdated": "Subscription updated",
    "toast.subDeleted": "Subscription deleted",
    "toast.providerNoEdit": "Provider subscriptions cannot be edited",
    "toast.providerNoDelete": "Provider subscriptions cannot be deleted",
    "toast.providerNoAddSource":
      "Sources cannot be added to a provider subscription",
    "toast.renameUnsupported": "Renaming is not supported by this v2hub client",
    "toast.enterSource": "Enter at least one source",
    "toast.sourcesAdded": {
      one: "Added {count} source — don't forget to save",
      other: "Added {count} sources — don't forget to save",
    },
    "toast.sourceAdded": "Source added — don't forget to save",
    "toast.sourceHidden": "Source hidden from users — don't forget to save",
    "toast.sourceShown": "Source visible again — don't forget to save",
    "toast.sourceSettingsUpdated":
      "Source settings updated — don't forget to save",
    "toast.sourceDeleted": "Source deleted",
    "toast.sourceRefreshed": "Source refreshed",
    "toast.sourceCopied": "Source copied",
    "toast.linkCopied": "Link copied",
    "toast.b64Copied": "Base64 copied",
    "toast.copyFailed": "Could not copy — select the text manually",
    "toast.nothingToDownload": "Nothing to download",
    "toast.fileDownloaded": "File downloaded",
    "sub.deleteConfirm":
      "Delete subscription “{name}”? This action cannot be undone.",

    // ── validation ───────────────────────────────────────────────────────
    "validate.urlRequired": "Enter the API URL.",
    "validate.urlHttps": "The API URL must start with https://.",
    "validate.urlFormat": "Invalid URL format.",
    "validate.urlHost": "Invalid server address.",
    "validate.urlScheme": "Invalid URL scheme. Use https://.",

    // ── errors: client-side ──────────────────────────────────────────────
    "err.apiUrlRequired": "Enter the API URL to work with subscriptions.",
    "err.tokenRequired": "Enter an API token to continue.",
    "err.apiUrlConnect": "Enter the API URL to connect.",
    "err.tokenConnect": "Enter an API token to connect.",
    "err.network": "Network error: {message}",
    "err.tokenExpired":
      "The token is invalid or expired. Enter a new API token.",
    "err.tooManyWait": "Too many requests. Wait a moment and try again.",
    "err.badToken": "Invalid token. Check your API token.",

    // ── errors: server codes ─────────────────────────────────────────────
    "errCode.tooManySubscriptions":
      "Subscription limit reached: {count}/{max}. Delete an old subscription or raise the limit.",
    "errCode.tooManySources":
      "Source limit reached: {count}/{max}. Delete some sources or raise the limit.",
    "errCode.tooManyConfigs":
      "Config limit exceeded: {count}/{max}. Delete some configs or raise the limit.",
    "errCode.tooManyProviders":
      "Provider limit reached: {count}/{max}. Disconnect a current one before connecting a new one.",
    "errCode.rateLimitWait":
      "Too many requests. Wait {seconds} s and try again.",
    "errCode.rateLimit": "Too many requests. Wait and try again.",
    "errCode.duplicateNamed":
      "An entry named “{name}” already exists. Choose another name.",
    "errCode.duplicate":
      "An entry with this name already exists. Choose another name.",
    "errCode.conflict":
      "A data conflict occurred. Check the resource state and try again.",
    "errCode.invalidConfigField": " (field: {field})",
    "errCode.invalidConfig":
      "Invalid configuration{field}{errors}. Check the entered data.",
    "errCode.invalidUrl":
      "The URL failed the security check. Use a publicly reachable HTTPS address.",
    "errCode.validation": "Data validation error. Check the entered values.",
    "errCode.auth": "Authentication error. Check the API token or credentials.",
    "errCode.forbidden":
      "Access denied. Your token has no permission for this action.",
    "errCode.subscriptionNotFound":
      "Subscription not found. It may have been deleted.",
    "errCode.sourceNotFound": "Source not found. It may have been deleted.",
    "errCode.notFoundNamed": "{resource} “{id}” not found.",
    "errCode.notFound": "The requested resource was not found.",
    "errCode.circularChain": "Circular dependency detected: {chain}",
    "errCode.circular": "Circular dependency detected between sources.",
    "errCode.nestingDepth": "Maximum nesting depth exceeded: {depth}/{max}.",
    "errCode.nesting": "Maximum nesting depth exceeded.",
    "errCode.externalFetch":
      "Could not load the external source{url}{reason}. Check that the address is reachable.",
    "errCode.network":
      "Network error. Check your connection and API availability.",
    "errCode.cacheOp": 'Cache error during operation "{operation}": {reason}.',
    "errCode.cache": "Server cache error. Try the request again.",
    "errCode.internal": "Internal server error. Try again later.",
    "errCode.unavailable": "Service temporarily unavailable. Try again later.",
    "errCode.timeout": "Request timed out. Try again.",
    "errCode.unknown": "Unknown error",

    // ── error notification (title / hint) ────────────────────────────────
    "error.title": "Error",
    "errView.limit.title": "Limit exceeded",
    "errView.limit.hint": "The maximum allowed limit has been reached.",
    "errView.network.title": "Network error",
    "errView.network.hint": "Check your connection and API availability.",
    "errView.token.title": "Invalid token",
    "errView.token.hint":
      "The token is wrong or expired. Enter a new API token.",
    "errView.forbidden.title": "Access denied",
    "errView.forbidden.hint": "Your token has no permission for this action.",
    "errView.notFound.title": "Not found",
    "errView.notFound.hint": "The resource does not exist or was deleted.",
    "errView.conflict.title": "Conflict",
    "errView.conflict.hint": "An entry with this data already exists.",
    "errView.external.title": "External source error",
    "errView.external.hint": "Check that the URL is reachable and try again.",
    "errView.gateway.title": "Gateway unavailable",
    "errView.gateway.hint":
      "The upstream service did not respond correctly. Try again later.",
    "errView.unavailable.title": "Service unavailable",
    "errView.unavailable.hint":
      "The server is overloaded or under maintenance. Try again later.",
    "errView.timeout.title": "Request timed out",
    "errView.timeout.hint": "The server did not respond in time. Try again.",
    "errView.server.title": "Server error",
    "errView.server.hint": "Try the request again later.",
    "errView.validation.title": "Validation error",
    "errView.validation.hint": "Check that the entered data is correct.",
    "errView.generic.title": "Something went wrong",
    "errView.generic.hint": "Try again or contact support.",

    // ── admin panel ──────────────────────────────────────────────────────
    "admin.docTitle": "v2hub Admin — Settings",
    "admin.logoAlt": "v2hub logo",
    "admin.badge": "Admin",
    "admin.back": "← Back to Panel",
    "admin.logout": "Logout",
    "admin.language": "Language",
    "admin.auth.title": "🔐 Admin Authentication",
    "admin.auth.desc":
      "Enter your server's admin panel password to access settings management.",
    "admin.auth.passwordLabel": "Admin Panel Password",
    "admin.auth.submit": "Sign In",
    "admin.err.authFailed": "Authentication failed",
    "admin.err.notConfigured":
      "Admin access is not configured. Please set V2HUB_ADMIN_PANEL_PASSWORD in server environment.",
    "admin.err.loadSettings": "Failed to load settings",
    "admin.err.saveFailed": "Failed to save setting",
    "admin.save": "Save {label}",
    "admin.saving": "Saving...",
    "admin.saved": "Saved successfully!",
    "admin.error": "Error: {message}",
    "admin.setting.default_theme.label": "Default Theme",
    "admin.setting.default_theme.description":
      "Panel-wide default theme (dark or light)",
    "admin.setting.default_language.label": "Default Language",
    "admin.setting.default_language.description":
      "Panel-wide default interface language. Used when the visitor has not chosen a language and the browser/Telegram language is not supported",
    "admin.option.default_theme.dark.label": "Dark Theme",
    "admin.option.default_theme.dark.description":
      "Standard dark palette for the panel",
    "admin.option.default_theme.light.label": "Light Theme",
    "admin.option.default_theme.light.description":
      "Clean light palette for the panel",
  },
};
