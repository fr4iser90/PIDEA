# PIDEA ↔ AgentLayer (externe Orchestrierung)

PIDEA bleibt die **einzige Wahrheit** für Tasks, Pläne und Queue-Runs. AgentLayer (oder ein anderes System) spricht eine **dünne HTTP-API** an: Jobs anlegen, Status lesen, optional abbrechen, optional Webhooks für Fertigmeldungen.

## Authentifizierung (Service-to-Service)

Alle Endpoints unter `/api/v1/integration/*` erfordern **kein** User-JWT. Stattdessen:

- Header **`X-PIDEA-Integration-Key`**: `<PIDEA_INTEGRATION_API_KEY>`  
  **oder**
- **`Authorization: Bearer <PIDEA_INTEGRATION_API_KEY>`**

Ohne gesetzte Variable `PIDEA_INTEGRATION_API_KEY` (mindestens 8 Zeichen) antwortet die API mit **503**.

Optional:

| Variable | Bedeutung |
|----------|-----------|
| `PIDEA_INTEGRATION_SERVICE_USER_ID` | String, der als technischer User für `createdBy` o. Ä. genutzt wird (Default: `pidea-integration-service`) |
| `PIDEA_INTEGRATION_CALLBACK_URL` | Ziel-URL für Outbound-Webhooks bei Queue-Abschluss |
| `PIDEA_INTEGRATION_CALLBACK_SECRET` | HMAC-Secret für Signatur `X-PIDEA-Signature: sha256=<hex>` |
| `PIDEA_INTEGRATION_ALLOW_WEBHOOK_REGISTER` | `true`: erlaubt `PUT /api/v1/integration/webhook` zur Laufzeit-Konfiguration (nur In-Memory) |

## Endpoints (Überblick)

| Methode | Pfad | Zweck |
|---------|------|--------|
| `POST` | `/api/v1/integration/jobs` | Task anlegen und in die Queue legen |
| `GET` | `/api/v1/integration/jobs/:jobId` | Status / Fortschritt (`job_id` = PIDEA-Task-ID) |
| `POST` | `/api/v1/integration/jobs/:jobId/cancel` | Abbrechen (Queue oder Task) |
| `PUT` | `/api/v1/integration/webhook` | Optional: Callback-URL setzen (wenn erlaubt) |
| `GET` | `/api/v1/integration/webhook` | Prüfen, ob eine Callback-URL konfiguriert ist |

Maschinenlesbare Spezifikation: [`docs/api/integration-v1.openapi.yaml`](api/integration-v1.openapi.yaml).

## Semantik

- **`job_id`** ist die **Task-ID** in PIDEA (keine zweite Task-Datenbank im Client).
- **`correlation`** (z. B. `client_request_id`, `tenant_id`) wird nur in Task-Metadaten gespeichert und in Antworten/Webhooks zurückgespiegelt.
- Outbound-Events gehen nur an `PIDEA_INTEGRATION_CALLBACK_URL`, wenn gesetzt; Nutzlast ist JSON mit Feld `event` (`job.completed`, `job.failed`, `job.canceled`).

## Beispiel: Job starten

```bash
curl -sS -X POST "https://<pidea-host>/api/v1/integration/jobs" \
  -H "Content-Type: application/json" \
  -H "X-PIDEA-Integration-Key: $PIDEA_INTEGRATION_API_KEY" \
  -d '{
    "project_id": "<pidea-project-uuid>",
    "goal": "Implement feature X",
    "context": { "markdown": "…" },
    "project_ref": { "repo_url": "https://github.com/org/repo", "branch": "main" },
    "priority": "normal",
    "correlation": { "client_request_id": "550e8400-e29b-41d4-a716-446655440000" }
  }'
```

## Beispiel: Status

```bash
curl -sS "https://<pidea-host>/api/v1/integration/jobs/<jobId>" \
  -H "X-PIDEA-Integration-Key: $PIDEA_INTEGRATION_API_KEY"
```

## AgentLayer-Seite (dein Projekt)

Dort implementierst du einen kleinen Client (Base-URL, API-Key aus Secret Storage), speicherst lokal nur `job_id` + UI-State und aktualisierst die Oberfläche per Polling oder per eingehendem Webhook — **ohne** eigene Planner/Scheduler für dieselbe autonome Arbeit.
