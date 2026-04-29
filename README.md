# Dashboard Summary — Domo Instance Setup

This is a Domo custom app that generates an AI summary of whatever dashboard page it is dropped onto. It is client-side only (React + Vite) and depends on several pieces of Domo-side configuration. This document lists everything you must set up in your Domo instance before the app can run.

> All resource IDs below are pinned in [public/manifest.json](public/manifest.json). When you re-create resources in a new instance, you will need to update those IDs to match your instance.

---

## 1. Code Engine packages

The app discovers page content and queries data through two Code Engine packages. Both must exist in your instance and be aliased in the manifest exactly as described.

### 1a. Dashboard Discovery

- **Source:** [code-engine/dashboardDiscovery.js](code-engine/dashboardDiscovery.js)
- **Package payload:** [code-engine/package-payload.json](code-engine/package-payload.json)
- **Manifest entries:** five aliases — `getPageDatasets`, `getPageCards`, `getDatasetSchema`, `queryDataset`, `getFilesetContent` — all pointing at the same `packageId` (currently `d2032d70-bba4-4e5b-a729-4f9657d6e472`, version `1.0.4`).
- **What it does:** wraps the Domo Product API for page datasets, page cards, dataset schema, query execution, and fileset file download. Uses `codeengine.sendRequest`, which auto-authenticates against the host instance.

To deploy in a new instance:

1. Create the package (`Dashboard Discovery`, language `JAVASCRIPT`, env `LAMBDA`) using `package-payload.json` as the manifest.
2. Upload `dashboardDiscovery.js` as the source.
3. Publish a version (1.0.4 in this repo).
4. Replace `packageId` and `version` for all five `Dashboard Discovery` entries in `public/manifest.json`.

### 1b. Dashboard Card Data Queries

- **Manifest entry:** alias `getPageTableSummaries`, packageId `5d11a9b8-266b-4438-9bb0-30c365a4bb83`.
- **What it does:** returns rendered card data (table summaries) for every card on the given page. Source for this package lives elsewhere — it is not vendored in this repo; if you need to recreate it, see `getPageCardRenders` in [src/services/cardrender.ts](src/services/cardrender.ts) for the contract.
- **Failure mode:** card renders are *supplementary*. If the package is missing the app still works, you just lose the per-bullet "info" indicators that link bullets back to source cards.

---

## 2. AppDB collection — `DashboardSummaries`

Used to cache generated summaries per `(persona, region, pageId)` so repeat opens are instant.

- **Schema:** declared in [public/manifest.json](public/manifest.json) under `collectionsMapping`. Columns: `personaKey`, `pageId`, `summary`, `dataContext`, `createdAt`, `userRole`, `userTitle`, `userPersona`.
- **Access path:** the app uses the REST collection path `/domo/datastores/v1/collections/DashboardSummaries/documents` ([src/services/cache.ts](src/services/cache.ts)). The collection name (not a UUID) is what goes in the URL.
- **`syncEnabled: false`** — the cache is internal-only, no need to sync to a dataset.

> ⚠️ Defining the collection in `manifest.json` is **not enough**. After the first publish, open the card in the Domo UI and wire the `DashboardSummaries` collection through the card's data tab. Without this, AppDB writes will silently fail.

---

## 3. AI configuration dataset — alias `aiConfig`

The app reads its system prompt, model name, and optional fileset ID from a single-row dataset queried at `/data/v1/aiConfig` ([src/services/systemPrompt.ts](src/services/systemPrompt.ts)).

**Required columns** (case-sensitive; spaces matter):

| Column | Type | Purpose |
|---|---|---|
| `System Prompt` | STRING | System prompt prepended to every AI call. Falls back to a built-in default if blank. |
| `AI_Model` | STRING | Model ID, e.g. `domo.domo_ai.domogpt-large-v2.2:anthropic`. Falls back to that default if blank. |
| `Fileset_Id` | STRING | Optional. If set, the app pulls the contents of this fileset and injects it as additional context. Leave empty to skip. |

**Setup steps:**

1. Create a dataset with one row and the three columns above.
2. Add a `datasetsMapping` entry to `public/manifest.json` with `alias: "aiConfig"`, your `dataSetId`, and `fields: []`.
   ```json
   { "alias": "aiConfig", "dataSetId": "<your-dataset-id>", "fields": [] }
   ```
   The `fields: []` array is required even when empty — omitting it crashes the runtime with `Cannot read properties of undefined (reading 'map')`.
3. After publish, wire the dataset to the card in the Domo UI (same flow as the AppDB collection above).

To edit the prompt/model/fileset later, just update the row in that dataset — no rebuild needed.

---

## 4. AI Service Layer

The app calls `/domo/ai/v1/text/generation` ([src/services/ai.ts](src/services/ai.ts)). Make sure the AI Service Layer is enabled on the instance and the model named in `AI_Model` is licensed and accessible to the running user. No manifest entry is required for AI calls.

---

## 5. Optional — Fileset for additional context

If you want the AI to ground its summaries in static reference material (playbooks, glossaries, KPI definitions, etc.):

1. Create a fileset in Domo and upload the relevant files.
2. Put the fileset ID in the `Fileset_Id` column of the `aiConfig` dataset row.
3. The app will pull the file contents on every generation via the `getFilesetContent` Code Engine alias.

If `Fileset_Id` is empty, this step is skipped.

---

## 6. User attributes (optional but recommended)

The app personalizes summaries based on user attributes ([src/services/users.ts](src/services/users.ts)). It reads via `/domo/users/v1/{userId}`:

| Attribute | Used for |
|---|---|
| `persona` | Primary persona key (falls back to `role`). Drives prompt tone/depth. |
| `region` | Geographic scope filter. Defaults to `all`. |
| `store_ids` | Comma-separated list of store IDs the user is responsible for. |
| `focus_categories` | Comma-separated list of product/category focus areas. |

Set these in **Admin → People → Custom Attributes**, then assign per-user values. Without them the app still runs — it just falls back to `role` and the generic `all`-region persona.

---

## 7. Card placement & runtime requirements

- **Page context required.** The app reads `domo.env.pageId` to know which dashboard to summarize. If the card is opened outside a page (preview, standalone, drill detail), it shows: *"Unable to detect dashboard context. Please place this app on a Domo page."*
- **Page must contain data cards.** If `getPageDatasets` returns empty, the app errors out: *"No datasets found on this dashboard."*
- **Filter awareness.** The app subscribes to `domo.onFiltersUpdated`; when filters change, it re-checks the cache for that persona/page combination but does not auto-regenerate. Users click **New Summary** to force a regenerate.

---

## 8. Local dev — `proxyId`

Domo custom apps need a `proxyId` in `manifest.json` to talk to AppDB and datasets during `npm run dev`. To get one:

1. Run `npm run build && domo publish` once.
2. Drop the resulting card on a page.
3. Copy the card ID from the URL and set it as `proxyId` in `public/manifest.json`.

Local dev will then proxy data calls through that card's wired resources.

---

## 9. Build & publish

```bash
npm install
npm run build      # vite build → dist/
domo publish       # publishes the contents of dist/
```

`vite.config.ts` is already configured with `base: './'` and the build outputs to `dist/`. After publishing, perform the **post-publish wiring** in the Domo UI:

- [ ] Wire `aiConfig` dataset to the card
- [ ] Wire `DashboardSummaries` AppDB collection to the card
- [ ] Confirm the two Code Engine packages resolve (Card → Settings → Functions tab)
- [ ] Set the card's `proxyId` in `manifest.json` for local dev

---

## Quick checklist

| Item | Where | Status |
|---|---|---|
| `Dashboard Discovery` Code Engine package | Code Engine | required |
| `Dashboard Card Data Queries` Code Engine package | Code Engine | required (degrades gracefully if missing) |
| `DashboardSummaries` AppDB collection | manifest + UI wiring | required |
| `aiConfig` dataset (3 columns) | datasetsMapping + UI wiring | required |
| AI Service Layer + model entitlement | Admin | required |
| Fileset for grounding context | Files | optional |
| User attributes (`persona`, `region`, …) | Admin → People | optional |
| `proxyId` in manifest | manifest.json | required for local dev only |
