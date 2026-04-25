# Scalar — API endpoint documentation

This backend ships an **OpenAPI 3** document for **`GET /api/v1/health`**, **`POST /api/v1/import`**, and **`GET /api/v1/export`**.

## Local Scalar UI

With the server running (default port `3001`), open:

`http://localhost:<PORT>/docs`

That page loads **Scalar API Reference** from the CDN and points at **`/openapi.yaml`** on the same server.

In production, the same backend is exposed under the **`/backend`** reverse-proxy prefix, so Scalar shows endpoints such as **`https://lowjungxuan.dpdns.org/backend/api/v1/health`**. For local "Try it" requests, select the `/` server in Scalar.

## OpenAPI URL (same host)

`http://localhost:<PORT>/openapi.yaml` — raw spec (also used by `/docs`).

## Scalar API Reference

In [Scalar API Reference](https://scalar.com/products/api-references), create or open a reference and **import that URL** as the OpenAPI document so Scalar shows interactive endpoint docs.

That is separate from [Scalar’s TypeScript SDK generator settings](https://scalar.com/products/sdks/configuration/typescript) (`gen.yaml`, published npm clients), which generate **client libraries**, not browsable HTTP operation docs for this API.

## Optional hosted reference

If you publish the same spec to Scalar’s cloud (or another host), set in `backend/.env`:

- **`SCALAR_DOCS_URL`** — URL of that hosted API reference (optional). The backend logs it on startup when set.

See `backend/.env.example`.
