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

## Project Structure

```text
v2hub-panel/
├── v2hub_panel/
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   ├── connection.py
│   │   ├── public.py
│   │   └── subscriptions.py
│   ├── models/
│   │   ├── requests.py
│   │   └── responses.py
│   ├── services/
│   │   ├── connection.py
│   │   └── subscription.py
│   └── utils/
│       ├── exceptions.py
│       └── helpers.py
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
│   ├── default.conf.template
│   ├── entrypoint/
│   │   └── grafana-config.sh
│   ├── proxy_params
│   └── grafana.htpasswd
│
├── monitoring/
│   ├── alloy/
│   │   └── config.alloy
│   ├── grafana/
│   │   └── datasources.yml
│   ├── prometheus.yml
│   └── loki.yml
│
├── certbot/
│   ├── conf/
│   └── www/
│
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── uv.lock
├── .env.example
└── README.md
---

# Local Development

## Requirements

Install:

* Docker
* Docker Compose plugin
* Python 3.11+
* uv

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

> **Note:** All backend-read variables use the `V2HUB_` prefix (`config.py` sets `env_prefix="V2HUB_"`).

`DOMAIN`, `BACKEND_HOST`, `BACKEND_PORT`, `GRAFANA_HOST`, and `GRAFANA_PORT` are consumed by nginx rather than the FastAPI application.

---

# Monitoring Configuration

Monitoring is controlled using Docker Compose profiles.

The single source of truth is:

```env
MONITORING_PROFILE=enabled
```

`COMPOSE_PROFILES` is derived automatically:

```env
COMPOSE_PROFILES=${MONITORING_PROFILE}
```

Two values are supported:

| Value      | Monitoring services | `/grafana/`   |
| ---------- | ------------------- | ------------- |
| `enabled`  | Started             | Available     |
| `disabled` | Not started         | Returns `404` |

Monitoring services:

* Grafana Alloy
* Loki
* Prometheus
* Grafana

The application and nginx remain available in both modes.

### Enable monitoring

```env
MONITORING_PROFILE=enabled
COMPOSE_PROFILES=${MONITORING_PROFILE}
```

Start the stack:

```bash
docker compose up --build
```

### Disable monitoring

```env
MONITORING_PROFILE=disabled
COMPOSE_PROFILES=${MONITORING_PROFILE}
```

Start the stack:

```bash
docker compose up --build
```

With monitoring disabled, Grafana, Prometheus, Loki, and Alloy are not started and:

```text
/grafana/
```

returns:

```text
404 Not Found
```

---

# Run Full Stack Locally

The local environment can run the same application stack as production.

With monitoring enabled:

* FastAPI
* nginx
* Grafana
* Prometheus
* Loki
* Alloy

Start:

```bash
docker compose up --build
```

Access:

### Application

```text
http://127.0.0.1
```

### Health check

```text
http://127.0.0.1/api/health
```

### Grafana

Available only when monitoring is enabled:

```text
http://127.0.0.1/grafana/
```

---

# Docker Architecture

```text
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

When monitoring is disabled, the monitoring branch is not started.

---

# Nginx

The nginx configuration is written as an `envsubst` template.

Source:

```text
nginx/default.conf.template
```

The official nginx image processes templates placed under:

```text
/etc/nginx/templates/*.template
```

Docker Compose mounts:

```text
nginx/default.conf.template
```

to:

```text
/etc/nginx/templates/default.conf.template
```

The nginx image renders the template into:

```text
/etc/nginx/conf.d/default.conf
```

Check the generated configuration:

```bash
docker exec -it v2hub_nginx cat /etc/nginx/conf.d/default.conf
```

Validate nginx:

```bash
docker compose exec nginx nginx -t
```

Reload nginx:

```bash
docker compose exec nginx nginx -s reload
```

---

## Grafana Routing

Grafana routing is generated dynamically by:

```text
nginx/entrypoint/grafana-config.sh
```

The script runs when the nginx container starts.

When:

```env
MONITORING_PROFILE=enabled
```

the script generates a Grafana proxy:

```nginx
location /grafana/ {
    ...
    proxy_pass http://grafana:3000;
    ...
}
```

When:

```env
MONITORING_PROFILE=disabled
```

the script generates:

```nginx
location /grafana/ {
    return 404;
}
```

This keeps Grafana routing consistent with the selected monitoring profile.

---

# HTTPS / Production Notes

Local development does NOT require SSL certificates.

Production requires certificates under:

```text
certbot/conf/
```

Expected structure:

```text
certbot/conf/
└── live/
    └── panel.example.com/
        ├── fullchain.pem
        └── privkey.pem
```

Without the required certificate files nginx may fail with:

```text
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

MONITORING_PROFILE=enabled
COMPOSE_PROFILES=${MONITORING_PROFILE}
```

Set:

```env
MONITORING_PROFILE=enabled
```

if the monitoring stack should run.

Set:

```env
MONITORING_PROFILE=disabled
```

if monitoring should not run.

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

The selected monitoring profile determines whether the monitoring services are started.

---

# Backend

Application entrypoint:

```text
v2hub_panel.main:app
```

Container command:

```text
uvicorn v2hub_panel.main:app
```

Internal port:

```text
8000
```

Health endpoint:

```text
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

```text
GET /
```

Frontend SPA

```text
GET /sub/{token}?base_url=<url>
```

Resolves a subscription's public content via the upstream server.

```text
GET /api/subscriptions/{token}/qr.png?base_url=<url>
```

QR code (PNG) for a subscription's public URL.

```text
GET /api/config
```

Server-side frontend configuration.

```text
GET /api/health
```

Health check.

```text
GET /metrics
```

Prometheus metrics.

---

## Subscription API

All of these require `base_url` and `api_token` in the JSON request body via `CredentialsMixin`, since the panel itself holds no credentials.

```text
POST   /api/subscriptions
POST   /api/subscriptions/new
POST   /api/subscriptions/{token}
PATCH  /api/subscriptions/{token}
DELETE /api/subscriptions/{token}
POST   /api/subscriptions/{token}/sources/add
POST   /api/subscriptions/{token}/sources/replace
```

> Note: `list`/`get`/`delete` use `POST`/`DELETE` with a JSON body to carry `base_url`/`api_token`.

---

# Monitoring

The monitoring stack consists of:

* Prometheus
* Loki
* Grafana Alloy
* Grafana

The complete monitoring stack is optional and controlled by `MONITORING_PROFILE`.

---

## Prometheus

Scrapes:

```text
app:8000/metrics
```

Prometheus is started only when:

```env
MONITORING_PROFILE=enabled
```

---

## Loki

Stores logs from Docker containers.

Pipeline:

```text
Docker
  |
  v
Alloy
  |
  v
Loki
  |
  v
Grafana
```

---

## Alloy

Collects Docker logs.

Config:

```text
monitoring/alloy/config.alloy
```

---

## Grafana

Available through nginx when monitoring is enabled:

```text
/grafana/
```

When monitoring is disabled:

```text
/grafana/
```

returns `404`.

Credentials are configured in:

```text
docker-compose.yml
```

Example:

```yaml
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin
```

Change the default credentials before production.

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

## Monitoring Configuration Validation

The CI pipeline validates both monitoring states.

### Disabled

```text
MONITORING_PROFILE=disabled
```

The following services must not be included:

```text
alloy
loki
prometheus
grafana
```

### Enabled

```text
MONITORING_PROFILE=enabled
```

The following services must be included:

```text
alloy
loki
prometheus
grafana
```

The CI pipeline also validates that nginx generates the correct Grafana routing for both states.

---

# Useful Docker Commands

View logs:

```bash
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f grafana
docker compose logs -f loki
docker compose logs -f alloy
```

View active services:

```bash
docker compose config --services
```

View services with monitoring enabled:

```bash
docker compose --profile enabled config --services
```

View services with monitoring disabled:

```bash
docker compose --profile disabled config --services
```

Restart nginx:

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

```text
cannot load certificate
```

This usually means the required SSL certificates are missing.

Fix by generating the certificates or using the appropriate local nginx configuration.

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

## Grafana is unavailable

First check the monitoring profile:

```bash
docker compose config --services
```

If monitoring is disabled, Grafana is intentionally not started and:

```text
/grafana/
```

returns `404`.

Enable monitoring:

```env
MONITORING_PROFILE=enabled
COMPOSE_PROFILES=${MONITORING_PROFILE}
```

Then restart the stack:

```bash
docker compose up -d
```

---

Recommended `.gitignore`:

```text
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
- [ ] `MONITORING_PROFILE` configured
- [ ] `COMPOSE_PROFILES` derived from `MONITORING_PROFILE`
- [ ] Domain DNS configured
- [ ] SSL certificates generated
- [ ] Grafana password changed
- [ ] CORS restricted
- [ ] Docker containers healthy
- [ ] nginx config validated
- [ ] `/api/health` returns 200
- [ ] Monitoring stack running when `MONITORING_PROFILE=enabled`
- [ ] `/grafana/` returns `404` when `MONITORING_PROFILE=disabled`