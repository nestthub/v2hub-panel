# V2Hub Panel

Web application for managing V2Hub subscriptions and sources.

### 🌐 Part of the [V2Hub Ecosystem](https://github.com/nestthub/nestthub/blob/main/ecosystems/v2hub/README.md)

This package is one component of V2Hub — see the full project overview, architecture, and all related repositories.

Stack:

- Backend: FastAPI + Pydantic
- Frontend: Vanilla JS + CSS (no build step)
- Package manager: uv
- Runtime: Docker Compose
- Reverse proxy: nginx
- Monitoring:

  - Prometheus
  - Loki
  - Grafana
  - Grafana Alloy

---

# Project Structure

```
v2hub_panel/
│
├── src/
│   └── v2hub_panel/
│       ├── main.py              # FastAPI entrypoint (app, /, /metrics, exception handlers)
│       ├── config.py            # Environment configuration (Settings, env_prefix=V2HUB_)
│       │
│       ├── routes/
│       │   ├── connection.py    # /api/config, /api/health
│       │   ├── public.py        # /sub/{token}, /api/subscriptions/{token}/qr.png
│       │   └── subscriptions.py # /api/subscriptions/...
│       │
│       ├── models/
│       │   ├── requests.py      # CredentialsMixin, SourceEntry, *Request schemas
│       │   └── responses.py     # ConnectionInfo, SubscriptionInfo, *Response schemas
│       │
│       ├── services/
│       │   ├── connection.py    # make_async_client, make_public_client, resolve_base_url
│       │   └── subscription.py  # serialize_subscription, serialize_public_subscription
│       │
│       └── utils/
│           ├── exceptions.py    # with_error_mapping (v2hub errors -> HTTPException)
│           └── helpers.py       # clean_source_entries, get_public_subscription_url
│
├── frontend/
│   ├── index.html
│   ├── scripts/
│   └── styles/
│
├── tests/
│   ├── conftest.py
│   └── test_*.py
│
├── nginx/
│   ├── default.conf.template    # nginx envsubst template (see Nginx section for current mount caveat)
│   ├── proxy_params             # proxy headers
│   └── grafana.htpasswd         # created at deploy time, not tracked in the repo — required by the template's auth_basic directive
│
├── monitoring/
│   ├── alloy/
│   │   └── config.alloy
│   │
│   ├── grafana/
│   │   └── datasources.yml
│   │
│   ├── prometheus.yml
│   └── loki.yml
│
├── certbot/                     # created at deploy time, not tracked in the repo
│   ├── conf/
│   └── www/
│
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── uv.lock
├── .env.example
└── README.md
```

---

# Local Development

## Requirements

Install:

- Docker
- Docker Compose plugin
- Python 3.11+
- uv

---

## Environment

Create local environment:

```bash
cp .env.example .env
```

Edit values:

```env
V2HUB_FIXED_API_URL=
V2HUB_LOG_LEVEL=DEBUG
V2HUB_CORS_ORIGINS=["*"]
```

> **Note**: All backend-read variables use the `V2HUB_` prefix (`config.py` sets `env_prefix="V2HUB_"`). `.env.example` currently ships `FIXED_API_URL` (no prefix) instead of `V2HUB_FIXED_API_URL` — use the prefixed name for it to actually be picked up by the app.
>
> `DOMAIN`, `BACKEND_HOST`, `BACKEND_PORT`, `GRAFANA_HOST`, `GRAFANA_PORT` are consumed by nginx's `envsubst` templating (not the FastAPI app) and are correctly unprefixed — see [Nginx](#nginx) below.

---

# Run Full Stack Locally

The local environment runs the same stack as production:

- FastAPI
- nginx
- Grafana
- Prometheus
- Loki
- Alloy

Start:

```bash
docker compose up --build
```

Access:

Application:

```
http://127.0.0.1
```

Health check:

```
http://127.0.0.1/api/health
```

Grafana:

```
http://127.0.0.1/grafana/
```

---

# Docker Architecture

```
Browser
   |
   |
 nginx :80/:443
   |
   +----------------+
   |                |
   v                v
 FastAPI         Grafana
 app:8000        grafana:3000


FastAPI
   |
   |
Prometheus
   |
   |
Metrics


Docker logs
   |
   |
Alloy
   |
   |
Loki
   |
   |
Grafana Explore
```

---

# Nginx

The nginx config is written as an `envsubst` template — see the header comment in `nginx/default.conf.template`, which lists the required variables (`DOMAIN`, `BACKEND_HOST`, `BACKEND_PORT`, `GRAFANA_HOST`, `GRAFANA_PORT`).

Source:

```
nginx/default.conf.template
```

**As currently wired in `docker-compose.yml`**, this file is mounted directly to:

```
/etc/nginx/conf.d/default.conf
```

which is a plain nginx config path — nginx does **not** run `envsubst` on it there, so the `${VAR}` placeholders are left literal unless you change the mount. The official nginx image only auto-renders templates placed under:

```
/etc/nginx/templates/*.template
```

and writes the rendered result to `/etc/nginx/conf.d/`. If you want the templating to actually happen, mount the file to `/etc/nginx/templates/default.conf.template` instead (and drop the `.template` extension expectation for the output path) — otherwise, populate `nginx/default.conf.template` with literal values instead of `${VAR}` placeholders before building.

Check generated/active config:

```bash
docker exec -it v2hub_nginx cat /etc/nginx/conf.d/default.conf
```

Validate:

```bash
docker compose exec nginx nginx -t
```

Reload:

```bash
docker compose exec nginx nginx -s reload
```

---

# HTTPS / Production Notes

Local environment does NOT require SSL certificates.

Do not enable:

```
/etc/letsencrypt/live/<domain>/fullchain.pem
```

until certificates exist.

Production requires:

```
certbot/conf/
```

with generated certificates.

Expected structure:

```
certbot/conf/
└── live/
    └── panel.example.com/
        ├── fullchain.pem
        └── privkey.pem
```

Without these files nginx will fail:

```
cannot load certificate
BIO_new_file() failed
```

---

# Production Deployment

## 1. Clone repository

```bash
git clone <repository>
cd v2hub_panel
```

---

## 2. Configure environment

```bash
cp .env.example .env
nano .env
```

Production example:

```env
V2HUB_LOG_LEVEL=INFO
V2HUB_FIXED_API_URL=https://example.com
V2HUB_CORS_ORIGINS=https://panel.example.com
```

---

## 3. Prepare certificates

Install certbot:

```bash
apt install certbot
```

Generate certificate:

```bash
certbot certonly \
  --webroot \
  -w ./certbot/www \
  -d panel.example.com
```

---

## 4. Start services

Build:

```bash
docker compose build
```

Run:

```bash
docker compose up -d
```

Check:

```bash
docker compose ps
```

---

# Backend

Application entrypoint:

```
v2hub_panel.main:app
```

Container command:

```
uvicorn v2hub_panel.main:app
```

Internal port:

```
8000
```

Health endpoint:

```
GET /api/health
```

Response:

```json
{
  "ok": true
}
```

---

# API

All endpoints proxy to a v2hub-api server. `base_url` and `api_token` are supplied by the frontend on (almost) every call — this panel is stateless and never stores them server-side.

## Public

```
GET /
```

Frontend SPA

```
GET /sub/{token}?base_url=<url>
```

Resolves a subscription's public content via the upstream server (no `api_token` required)

```
GET /api/subscriptions/{token}/qr.png?base_url=<url>
```

QR code (PNG) for a subscription's public URL

```
GET /api/config
```

Server-side frontend config (currently just `fixed_api_url`)

```
GET /api/health
```

Health check

```
GET /metrics
```

Prometheus metrics (scraped internally — see [Monitoring](#monitoring))

## Subscription API

All of these require `base_url` and `api_token` in the JSON request body (via `CredentialsMixin`), since the panel itself holds no credentials.

```
POST   /api/subscriptions                          # list
POST   /api/subscriptions/new                       # create
POST   /api/subscriptions/{token}                   # get
PATCH  /api/subscriptions/{token}                   # update
DELETE /api/subscriptions/{token}                    # delete
POST   /api/subscriptions/{token}/sources/add        # add sources
POST   /api/subscriptions/{token}/sources/replace    # replace all sources
```

> Note: `list`/`get`/`delete` use `POST`/`DELETE` with a JSON body (not query params) purely to carry `base_url`/`api_token` — `list` and `get` are read-only despite the `POST` verb.

---

# Monitoring

## Prometheus

Scrapes:

```
app:8000/metrics
```

---

## Loki

Stores logs from Docker containers.

Pipeline:

```
Docker
 |
Alloy
 |
Loki
 |
Grafana
```

---

## Alloy

Collects Docker logs.

Config:

```
monitoring/alloy/config.alloy
```

---

## Grafana

Available through nginx:

```
/grafana/
```

Credentials:

Configured in:

```
docker-compose.yml
```

Example:

```yaml
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin
```

Change before production.

---

# Tests

## Backend tests

Install dependencies:

```bash
uv sync
```

Run:

```bash
uv run pytest
```

---

## Frontend tests

Frontend uses Vitest.

Run:

```bash
cd frontend
npm install
npm test
```

---

# Useful Docker Commands

Logs:

```bash
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f grafana
docker compose logs -f loki
docker compose logs -f alloy
```

Restart:

```bash
docker compose restart nginx
```

Rebuild:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

Remove volumes:

```bash
docker compose down -v
```

---

# Troubleshooting

## nginx restart loop

Check:

```bash
docker compose logs nginx
```

Common cause:

Missing certificates:

```
cannot load certificate
```

Fix:

Disable SSL config locally or generate certs.

---

## App container unhealthy

Check:

```bash
docker compose logs app
```

Test:

```bash
docker exec -it v2hub_app \
curl http://localhost:8000/api/health
```

---

## nginx cannot reach app

Test:

```bash
docker exec -it v2hub_nginx \
wget -qO- http://app:8000/api/health
```

---

# Security Notes

Production:

- Change Grafana credentials
- Disable wildcard CORS
- Use HTTPS
- Keep monitoring services internal
- Do not commit `.env`
- Do not commit certificates
- Do not commit production nginx secrets

Recommended `.gitignore`:

```
.env
certbot/conf/
certbot/www/
nginx/*.htpasswd
.venv/
__pycache__/
```

---

# Deployment Checklist

Before production:

- [ ] `.env` configured
- [ ] Domain DNS configured
- [ ] SSL certificates generated
- [ ] Grafana password changed
- [ ] CORS restricted
- [ ] Docker containers healthy
- [ ] nginx config validated
- [ ] `/api/health` returns 200
- [ ] Monitoring stack running
