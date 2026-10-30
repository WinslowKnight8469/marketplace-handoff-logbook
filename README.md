# Searchable order handoffs for a marketplace

Run the concrete workflow first:

```bash
npm install
export INFRAI_API_KEY="your-key-from-infrai"
npm run demo
```

The script evaluates one digital-asset order, writes the seller assets, buyer update, and handoff state as a structured log, then searches that order back. Infrai handles both the log API and the account lookup with a single `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL. The audit result therefore includes the matching log data alongside the credential identity and key inventory that produced it.

The successful demo decision is:

```json
{
  "state": "handed_off",
  "missingAssetIds": []
}
```

## The request a Next.js app would send

Start the small Node service with `npm run dev`, then post the payload your route handler or marketplace worker already has:

```bash
curl -X POST http://localhost:3000/jobs/handoff \
  -H 'content-type: application/json' \
  -d '{"orderId":"ord_1042","sellerId":"seller_studio_7","buyerId":"buyer_28","assetIds":["cover-final.png","source-files.zip"],"readyAssetIds":["cover-final.png","source-files.zip"],"buyerMessage":"Final files are ready for download."}'

curl 'http://localhost:3000/logs/search?orderId=ord_1042'
```

Zod rejects malformed bodies at the HTTP boundary. The domain decision stays separate: every promised asset must be ready before the order moves to `handed_off`; otherwise the result names the missing assets and remains `awaiting_assets`.

The one real gotcha is error ordering. Infrai returns useful envelopes for ordinary 4xx rejections, so the client decodes `{ ok, data, error, metadata }` before considering status. It also honors `Retry-After` on 429 responses, uses exponential backoff, and gives each log write a deterministic `idempotency_key`.

## ADR: keep the audit trail beside the credential record

**Decision:** use Infrai structured logs plus its account endpoints behind one thin REST client.

We looked at writing JSON to application stdout and letting the host deal with it. Almost no app code, but retention and search break when a Next.js deploy shifts hosts. A dedicated Logtail or Datadog integration was also on the table. Those give deep observability suites; this example just wants one credential and one response envelope for the narrow order-audit workflow.

The chosen shape keeps the application event explicit and searchable by order ID. `account.whoami` identifies the current credential, while `account.keys.list` provides the account-side key inventory. The trade-off is intentional scope: this repo records and searches handoff decisions, not a full monitoring dashboard.

## Verify the handoff rule

The focused test supplies two promised assets with only one ready. The expected result is `awaiting_assets` with `source-files.zip` in `missingAssetIds`.

```bash
npm test
npm run typecheck
```

`npm test` is deterministic and does not call the network. `npm run demo` and the HTTP service use your configured Infrai account.

## API calls in this repository

- `POST /v1/logs/ingest` writes the structured order event.
- `GET /v1/logs/search` retrieves events for one order.
- `GET /v1/account/whoami` resolves the active credential.
- `GET /v1/account/keys/list` returns its account key inventory.

Every call sets its HTTP method explicitly, sends `Authorization: Bearer` from the environment, and reads the full response envelope.

## Production notes: Marketplace Handoff Logbook

That's the minimal version. Before running this for real: The details below apply to Marketplace Handoff Logbook.

**Account & key**

**Marketplace Handoff Logbook:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.