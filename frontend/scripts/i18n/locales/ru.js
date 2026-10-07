/** Русский */
export default {
  meta: { code: "ru", name: "Русский", flag: "🇷🇺", dir: "ltr" },
  messages: {
    "common.refresh": "Обновить",
    "common.edit": "Редактировать",
    "common.menu": "Меню",
    "common.back": "Назад",
    "common.close": "Закрыть",
    "common.save": "Сохранить",
    "common.delete": "Удалить",
    "common.copy": "Копировать",
    "common.retry": "Повторить",
    "common.name": "Название",

    "about.title": "О приложении",
    "about.bot": "Telegram бот",
    "about.developer": "Разработчик",
    "topbar.connect": "Подключение",
    "conn.connected": "Подключено",
    "conn.disconnected": "Нет подключения",

    "settings.title": "Настройки",
    "settings.close": "Закрыть настройки",
    "settings.darkTheme": "Тёмная тема",
    "settings.darkThemeHint":
      "Выбирайте тему, которая вам по душе. (Светлая тема может содержать ошибки с палитрой)",
    "settings.language": "Язык",
    "settings.languageHint": "Язык интерфейса",

    "list.title": "Подписки",
    "list.subtitle": "Управление источниками и подключениями",
    "list.statSubs": "Подписок",
    "list.statConfigs": "Конфигов",
    "list.create": "＋ Создать",
    "list.providers": "Провайдеры",
    "list.banner":
      "Публичная ссылка, Base64 и QR-код доступны внутри выбранной подписки.",
    "list.loading": "Загрузка подписок…",
    "list.noDesc": "Без описания",
    "list.configsShort": "{count} конф.",
    "list.emptyTitle": "Нет подписок",
    "list.emptySub": "Нажмите «＋ Создать», чтобы добавить первую подписку",
    "conn.emptyTitle": "Нет подключения",
    "conn.emptySub":
      "Нажмите кнопку ⌁ в верхнем углу, чтобы указать API-адрес и токен",

    "editor.defaultTitle": "Подписка",
    "editor.providerBadgeTitle": "Показать статус подключения к провайдеру",
    "editor.loading": "Загрузка…",
    "editor.wait": "Пожалуйста, подождите",
    "editor.loadError": "Ошибка загрузки",
    "tab.sources": "Источники",
    "tab.preview": "Предпросмотр",
    "tab.export": "Подключение",
    "editorMenu.edit": "Редактировать подписку",
    "editorMenu.refresh": "Обновить данные",
    "editorMenu.delete": "Удалить подписку",
    "provider.infoTitle": "Информация о провайдере «{name}»",
    "provider.infoAria": "Информация о провайдере {name}",

    "sources.add": "＋ Добавить источник",
    "sources.reorderHint":
      "Перетаскивай источники за ручку, чтобы менять порядок.",
    "sources.readonlyHint":
      "Источники предоставлены провайдером — доступно только копирование.",
    "sources.dragHint": "Перетащите источник для изменения порядка",
    "sources.emptyTitle": "Источников пока нет",
    "sources.emptySub":
      "Добавьте конфиг, ссылку на подписку или внутренний token",
    "sources.move": "Переместить",
    "sources.hiddenTitle": "Скрыт от пользователей — нажмите, чтобы показать",
    "sources.visibleTitle": "Виден пользователям — нажмите, чтобы скрыть",
    "ctx.copy": "Копировать",
    "ctx.deleteSource": "Удалить источник",
    "sourceEdit.title": "Редактировать конфиг",
    "sourceEdit.comment": "Комментарий",
    "sourceEdit.commentPlaceholder": "Введите комментарий",
    "sourceEdit.commentHint": "Отображается только в интерфейсе",
    "sourceEdit.hidden": "Скрыт от пользователей",
    "sourceEdit.hiddenHint":
      "Источник останется в подписке, но не попадёт в резолв",
    "sourceEdit.depth": "Глубина вложенности",
    "sourceEdit.depthHint":
      "Сколько уровней вложенных подписок разрешено (0–3)",
    "advanced.title": "Расширенные настройки",

    "preview.totalConfigs": "Всего конфигов",
    "preview.sources": "Источников",
    "preview.types": "Типов",
    "preview.none": "Нет источников",
    "preview.shown": "Показано {shown} из {total}",
    "preview.scroll": "Прокрутите для просмотра всех",
    "export.linkLabel": "Ссылка на подключение",
    "export.linkDesc": "Скопируйте ссылку и вставьте в v2ray/v2bot/etc.",
    "export.copyLink": "Копировать ссылку",
    "export.qr": "QR подписки",
    "export.saveFile": "Сохранить в файл",
    "qr.caption": "Отсканируйте для подключения к подписке",
    "qr.download": "Скачать QR",

    "providers.subtitle":
      "Ваши подключённые и ожидающие подтверждения провайдеры",
    "providers.noAddress": "Без адреса",
    "providers.emptyTitle": "Нет провайдеров",
    "providers.emptySub":
      "Провайдеры появятся здесь, как только у вас будет хотя бы одно подключение",
    "providers.emptySubNoConn":
      "Укажите API-адрес и токен, чтобы увидеть своих провайдеров",
    "providers.loading": "Загрузка провайдеров…",
    "providers.loadError": "Не удалось загрузить список провайдеров.",
    "status.approved": "Подключено",
    "status.pending": "Ожидает подтверждения",
    "status.unknown": "Неизвестно",
    "providerConn.modalTitle": "Подключение к провайдеру",
    "providerConn.loading": "Загрузка данных о {name}…",
    "providerConn.loadError": "Не удалось загрузить данные о подключении.",
    "providerConn.disconnect": "Отключить",
    "providerConn.approve": "Одобрить",
    "providerConn.reject": "Отклонить",
    "providerConn.address": "Адрес",
    "providerConn.approved": "Провайдер «{name}» подключён",
    "providerConn.rejected": "Заявка от «{name}» отклонена",
    "providerConn.revoked": "Подключение к «{name}» отключено",

    "savebar.discard": "Отменить",
    "savebar.save": "Сохранить изменения",
    "savebar.saving": "Сохранение…",
    "unsaved.confirm":
      "У вас есть несохранённые изменения. Выйти без сохранения?",

    "connect.modalTitle": "Подключение к v2hub API",
    "connect.fixed": "зафиксировано",
    "connect.token": "API токен",
    "connect.tokenPlaceholder": "Введите токен",
    "connect.noToken": "Нет токена?",
    "connect.reset": "Сбросить",
    "connect.connect": "Подключиться",

    "addSource.title": "Добавить источник",
    "addSource.submit": "Добавить источник",
    "addSource.addRow": "+ Добавить ещё строку",
    "addSource.hint":
      "Поддерживаются: vless://, vmess://, ss://, trojan:// и другие. Также можно добавить другие подписки",
    "addSource.placeholder": "vless://... или https://.../sub/token",
    "addSource.removeRow": "Удалить строку",
    "create.title": "Создать подписку",
    "create.submit": "Создать",
    "create.nameHint": "Имя, которое видите только вы",
    "create.desc": "Описание (необязательно)",
    "create.descHint":
      "Название подписки, которое будет отображаться в конечном приложении.",
    "create.initial": "Начальные источники (необязательно)",
    "edit.title": "Редактировать подписку",
    "edit.desc": "Описание (видно в приложениях)",

    "toast.saved": "Изменения сохранены",
    "toast.discarded": "Изменения отменены",
    "toast.refreshed": "Данные обновлены",
    "toast.connected": "Подключено",
    "toast.reset": "Сброшено",
    "toast.enterName": "Введите название",
    "toast.sourceRejectedOne": 'Не удалось распознать источник: "{source}"',
    "toast.sourceRejectedMany":
      "Не удалось распознать источников: {count} — проверьте формат",
    "toast.subCreated": "Подписка создана",
    "toast.subUpdated": "Подписка обновлена",
    "toast.subDeleted": "Подписка удалена",
    "toast.providerNoEdit": "Подписки провайдера нельзя редактировать",
    "toast.providerNoDelete": "Подписки провайдера нельзя удалить",
    "toast.providerNoAddSource":
      "Нельзя добавлять источники в подписку провайдера",
    "toast.renameUnsupported":
      "Редактирование названия не поддерживается этим клиентом v2hub",
    "toast.enterSource": "Введите данные хотя бы одного источника",
    "toast.sourcesAdded": {
      one: "Добавлен {count} источник — не забудьте сохранить",
      few: "Добавлено {count} источника — не забудьте сохранить",
      many: "Добавлено {count} источников — не забудьте сохранить",
      other: "Добавлено {count} источника — не забудьте сохранить",
    },
    "toast.sourceAdded": "Источник добавлен — не забудьте сохранить",
    "toast.sourceHidden":
      "Источник скрыт от пользователей — не забудьте сохранить",
    "toast.sourceShown": "Источник снова виден — не забудьте сохранить",
    "toast.sourceSettingsUpdated":
      "Настройки источника обновлены — не забудьте сохранить",
    "toast.sourceDeleted": "Источник удалён",
    "toast.sourceRefreshed": "Источник обновлён",
    "toast.sourceCopied": "Источник скопирован",
    "toast.linkCopied": "Ссылка скопирована",
    "toast.b64Copied": "Base64 скопирован",
    "toast.copyFailed": "Не удалось скопировать — выделите вручную",
    "toast.nothingToDownload": "Нет данных для скачивания",
    "toast.fileDownloaded": "Файл скачан",
    "sub.deleteConfirm": "Удалить подписку «{name}»? Это действие необратимо.",

    "validate.urlRequired": "Укажите API URL.",
    "validate.urlHttps": "API URL должен начинаться с https://.",
    "validate.urlFormat": "Некорректный формат URL.",
    "validate.urlHost": "Недопустимый адрес сервера.",
    "validate.urlScheme": "Недопустимая схема URL. Используйте https://.",

    "err.apiUrlRequired": "Укажите API URL для работы с подписками.",
    "err.tokenRequired": "Введите API-токен, чтобы продолжить.",
    "err.apiUrlConnect": "Укажите API URL для подключения.",
    "err.tokenConnect": "Введите API-токен, чтобы подключиться.",
    "err.network": "Ошибка сети: {message}",
    "err.tokenExpired":
      "Токен недействителен или устарел. Введите новый API-токен.",
    "err.tooManyWait":
      "Слишком много запросов. Подождите немного и попробуйте снова.",
    "err.badToken": "Неверный токен. Проверьте API-токен.",

    "errCode.tooManySubscriptions":
      "Достигнут лимит подписок: {count}/{max}. Удалите старую подписку или увеличьте лимит.",
    "errCode.tooManySources":
      "Достигнут лимит источников: {count}/{max}. Удалите лишние источники или увеличьте лимит.",
    "errCode.tooManyConfigs":
      "Превышен лимит конфигураций: {count}/{max}. Удалите часть конфигураций или увеличьте лимит.",
    "errCode.tooManyProviders":
      "Достигнут лимит провайдеров: {count}/{max}. Чтобы подключить нового, сначала отключите одного из текущих.",
    "errCode.rateLimitWait":
      "Слишком много запросов. Подождите {seconds} сек. и повторите.",
    "errCode.rateLimit": "Слишком много запросов. Подождите и повторите.",
    "errCode.duplicateNamed":
      "Запись с именем «{name}» уже существует. Выберите другое имя.",
    "errCode.duplicate":
      "Запись с таким именем уже существует. Выберите другое имя.",
    "errCode.conflict":
      "Возник конфликт данных. Проверьте состояние ресурса и повторите попытку.",
    "errCode.invalidConfigField": " (поле: {field})",
    "errCode.invalidConfig":
      "Некорректная конфигурация{field}{errors}. Проверьте введённые данные.",
    "errCode.invalidUrl":
      "URL не прошёл проверку безопасности. Используйте публично доступный HTTPS-адрес.",
    "errCode.validation":
      "Ошибка валидации данных. Проверьте правильность введённых значений.",
    "errCode.auth":
      "Ошибка аутентификации. Проверьте API-токен или учётные данные.",
    "errCode.forbidden":
      "Доступ запрещён. У вашего токена нет прав на это действие.",
    "errCode.subscriptionNotFound":
      "Подписка не найдена. Возможно, она была удалена.",
    "errCode.sourceNotFound": "Источник не найден. Возможно, он был удалён.",
    "errCode.notFoundNamed": "{resource} «{id}» не найден.",
    "errCode.notFound": "Запрошенный ресурс не найден.",
    "errCode.circularChain": "Обнаружена циклическая зависимость: {chain}",
    "errCode.circular": "Обнаружена циклическая зависимость между источниками.",
    "errCode.nestingDepth":
      "Превышена максимальная глубина вложенности: {depth}/{max}.",
    "errCode.nesting": "Превышена максимальная глубина вложенности.",
    "errCode.externalFetch":
      "Не удалось загрузить внешний источник{url}{reason}. Проверьте доступность адреса.",
    "errCode.network": "Ошибка сети. Проверьте подключение и доступность API.",
    "errCode.cacheOp": 'Ошибка кэша при операции "{operation}": {reason}.',
    "errCode.cache": "Ошибка кэша на сервере. Попробуйте повторить запрос.",
    "errCode.internal": "Внутренняя ошибка сервера. Попробуйте позже.",
    "errCode.unavailable": "Сервис временно недоступен. Попробуйте позже.",
    "errCode.timeout": "Превышено время ожидания. Попробуйте ещё раз.",
    "errCode.unknown": "Неизвестная ошибка",

    "error.title": "Ошибка",
    "errView.limit.title": "Превышен лимит",
    "errView.limit.hint": "Достигнут максимально допустимый лимит.",
    "errView.network.title": "Ошибка сети",
    "errView.network.hint": "Проверьте подключение и доступность API.",
    "errView.token.title": "Недействительный токен",
    "errView.token.hint": "Токен неверен или устарел. Введите новый API-токен.",
    "errView.forbidden.title": "Доступ запрещён",
    "errView.forbidden.hint": "У вашего токена нет прав на это действие.",
    "errView.notFound.title": "Не найдено",
    "errView.notFound.hint": "Ресурс не существует или был удалён.",
    "errView.conflict.title": "Конфликт",
    "errView.conflict.hint": "Запись с такими данными уже существует.",
    "errView.external.title": "Ошибка внешнего источника",
    "errView.external.hint": "Проверьте доступность URL и повторите.",
    "errView.gateway.title": "Шлюз недоступен",
    "errView.gateway.hint":
      "Внешний сервис не ответил корректно. Попробуйте позже.",
    "errView.unavailable.title": "Сервис недоступен",
    "errView.unavailable.hint":
      "Сервер перегружен или на обслуживании. Попробуйте позже.",
    "errView.timeout.title": "Превышено время ожидания",
    "errView.timeout.hint": "Сервер не ответил вовремя. Попробуйте ещё раз.",
    "errView.server.title": "Ошибка сервера",
    "errView.server.hint": "Попробуйте повторить запрос позже.",
    "errView.validation.title": "Ошибка валидации",
    "errView.validation.hint": "Проверьте правильность введённых данных.",
    "errView.generic.title": "Произошла ошибка",
    "errView.generic.hint":
      "Попробуйте повторить действие или обратитесь в поддержку.",

    // ── admin panel ──────────────────────────────────────────────────────
    "admin.docTitle": "v2hub Админ — Настройки",
    "admin.logoAlt": "Логотип v2hub",
    "admin.badge": "Админ",
    "admin.back": "← Назад в панель",
    "admin.logout": "Выйти",
    "admin.language": "Язык",
    "admin.auth.title": "🔐 Аутентификация администратора",
    "admin.auth.desc":
      "Введите пароль админ-панели вашего сервера, чтобы управлять настройками.",
    "admin.auth.passwordLabel": "Пароль админ-панели",
    "admin.auth.submit": "Войти",
    "admin.err.authFailed": "Не удалось выполнить вход",
    "admin.err.notConfigured":
      "Доступ администратора не настроен. Задайте V2HUB_ADMIN_PANEL_PASSWORD в окружении сервера.",
    "admin.err.loadSettings": "Не удалось загрузить настройки",
    "admin.err.saveFailed": "Не удалось сохранить настройку",
    "admin.save": "Сохранить: {label}",
    "admin.saving": "Сохранение...",
    "admin.saved": "Успешно сохранено!",
    "admin.error": "Ошибка: {message}",
    "admin.setting.default_theme.label": "Тема по умолчанию",
    "admin.setting.default_theme.description":
      "Тема по умолчанию для всей панели (тёмная или светлая)",
    "admin.setting.default_language.label": "Язык по умолчанию",
    "admin.setting.default_language.description":
      "Язык интерфейса по умолчанию для всей панели. Используется, если посетитель не выбрал язык, а язык браузера/Telegram не поддерживается",
    "admin.option.default_theme.dark.label": "Тёмная тема",
    "admin.option.default_theme.dark.description":
      "Стандартная тёмная палитра панели",
    "admin.option.default_theme.light.label": "Светлая тема",
    "admin.option.default_theme.light.description":
      "Чистая светлая палитра панели",
  },
};
