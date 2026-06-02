# Agent Assurance Hub

A high-fidelity demo prototype that gives an enterprise **one view of the accuracy, drift, confidence, data-leak risk, cost and lifecycle of every AI agent** across its estate — Microsoft Copilot Studio agents and custom / Azure AI Foundry code agents, across Dev / Test / Prod Power Platform environments.

It is a **companion to Microsoft Agent 365, not a replacement.** Agent 365 owns identity, registry, security and approval. The Assurance Hub adds the accuracy / quality / observability / cost layer Microsoft does not compute for you, and *pulls Agent 365's registry and security state in as context*.

> **Demo prototype, production bar.** The whole app runs on a typed **mock-data layer that mirrors the real Microsoft APIs one-for-one**, so it demos cleanly offline today and can be repointed at live data later. The seeded estate is **Sydney Airport, as of 24 May 2026**. Figures are illustrative — verify against current Microsoft pricing and preview/GA states before a live demo.

Built by **Engage Squared**. Brand accent `#165AF1`.

---

## Modules

| Module | What it shows |
|---|---|
| **Overview** | Persona-aware dashboard with a view switcher. **MVP** (default) — lean: a plain-language status line, golden-question degradation per agent, and the few key issues, nothing else. **Executive** — board-level health / cost / risk. **IT Admin** — governance posture (alerts, shadow/risky agents, CA + registry coverage, approvals). **Agent Owner** — a "viewing as" picker scoping to your agents. |
| **Agents** | Dense inventory grid across environments with a **lineage toggle** (group by `schemaName` across Dev/Test/Prod), and a slide-over **agent profile drawer** — the spine every module deep-links into. |
| **Assurance** | Evaluation scores over time, the **Contract Checker drift** event, confidence distribution + threshold, regression test cases, and the quality-gates board with runbooks. |
| **Safety** | Purview-style alert stream with triage, an alert type × agent heatmap, and metadata drill-in. The **Snowflake Data Agent** (oversharing + jailbreak) drives it. |
| **Cost** | Copilot Credits spend explorer (stacked by meter), billed vs zero-rated attribution, side-by-side licensing structures, **per-agent funding model (derived) with a filter**, and budget gauges. The **Ops Copilot** is over budget at ~129%. |
| **Lifecycle** | Dev→Test→Prod swimlane, Power Platform Pipelines run history, and the **Baggage bot approval gate** with reviewer actions. |
| **Agent 365** | "Agent 365 governs \| Assurance Hub measures" companion view — registry (registered vs shadow), Entra Agent IDs, Entra ID Protection risk signals, and **third-party / external agents** (Amazon Bedrock, n8n, LangChain, Google Vertex AI, a shadow OpenClaw, an announced ServiceNow) with GA / preview / announced tags. |
| **Ask** | NLP assistant that reasons over the estate (tool-calling simulation) with streamed answers + inline citations, and the **confidence-driven handover** demonstration. |

**Five demo scenarios** (top-bar switcher) jump the whole app to a seeded narrative state and deep-link to the module that tells the story: Healthy estate, Drift detected, Data-leak alert, Cost spike, Approval & handover.

---

## Tech stack

- **React 19 + TypeScript (strict) + Vite**
- **Fluent UI React v9** (`@fluentui/react-components`, `@fluentui/react-icons`) — light + dark, both first-class, themed from the brand accent ramp via `createLightTheme` / `createDarkTheme`
- **Recharts** (themed to Fluent tokens), **Framer Motion** (page transitions, stagger, count-ups, drawers, chart draw-on; respects `prefers-reduced-motion`)
- **React Router** + **TanStack Query** over a **mock service layer** (`/src/services/*`) — each service headers the real Microsoft API it mirrors
- **Azure Static Web Apps** (Free tier) hosting; optional **managed function** (`/api`) for the off-by-default live Azure OpenAI chat proxy

## Run, build, deploy

```bash
npm install        # install dependencies
npm run dev        # local dev server (http://localhost:5173)
npm run build      # type-check (tsc -b) + production build to /dist
npm run preview    # preview the production build
```

Deployment is automatic: pushing to `main` runs `.github/workflows/azure-static-web-apps.yml`, which builds with Vite and deploys `/dist` to Azure Static Web Apps. The SWA deployment token is stored as the `AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub secret.

To connect a **new** Static Web App (Free): create the SWA in the Azure portal (or `az staticwebapp create`), copy its deployment token into the repo secret `AZURE_STATIC_WEB_APPS_API_TOKEN`, and push. `staticwebapp.config.json` provides SPA fallback routing, security headers and MIME types.

## Swap mock → live

The app is built so that going live is a contained change:

1. **Data** — each `/src/services/*.ts` file documents, in a header comment, the exact Microsoft endpoint it mirrors and the response shape it emulates. Replace the function bodies with real `fetch()` calls; the signatures (and therefore every component and TanStack Query hook) stay the same.
2. **Chat** — Module 8 uses a pluggable `ChatProvider`. `MockChatProvider` (default) runs an offline tool-calling simulation over the local data. `AzureOpenAIChatProvider` (in `src/services/chat/`) posts the shared function-calling tool schemas to the SWA managed function `/api/chat`, which proxies Azure OpenAI / Azure AI Foundry so the key never reaches the browser. Enable it by:
   - setting `VITE_CHAT_PROVIDER=azure` (see `.env.example`),
   - setting `api_location: "api"` in the deploy workflow,
   - configuring `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` in the Static Web App application settings.

   Until then the function returns `501` and the app runs entirely on `MockChatProvider`.

## Project structure

```
/src
  /app        theme, providers, router, layout (nav rail, command bar, acrylic header), scenario switcher
  /modules    overview, agents, assurance, safety, cost, lifecycle, agent365, ask
  /components KpiTile, Sparkline, charts, BudgetGauge, AgentDrawer, HandoverFlow, badges, primitives …
  /services   inventory, evaluation, telemetry, audit, cost, lifecycle, agent365, overview, chat/*
  /mock       agents, evalRuns, telemetry, alerts, costLedger, pipelines, scenarios, agent365, seed
  /types      domain models
/api          SWA managed-function stub for live Azure OpenAI chat — OFF by default
public/staticwebapp.config.json   (copied to /dist on build — SPA fallback + security headers)
.github/workflows/azure-static-web-apps.yml
```

---

## Feasibility — every module maps to a real, documented data source

A Microsoft reviewer can verify nothing is fabricated. GA unless marked **(preview)** / **(beta)**.

- **Agent inventory across environments** → Power Platform **Inventory API** / Azure Resource Graph `PowerPlatformResources` where `type == "microsoft.copilotstudio/agents"`, joined to `microsoft.powerplatform/environments`. Fields: `environmentId`, `ownerId`, `lastPublishedAt`, `schemaName`, `botId`, `entraAgentId`; `orchestration` / `model` / `channels` / `isManaged` / `isQuarantined` **(preview)**. Excludes classic PVA v1 bots; not in sovereign clouds. Custom / **Azure AI Foundry code agents** are *not* in the Copilot Studio inventory — they are tracked via Azure AI Foundry + Application Insights (and appear in the Agent 365 registry), so the single "estate" view is **stitched across both sources**, not one API. The Hub distinguishes the two agent types visually throughout.
- **Accuracy / groundedness / drift / confidence** → Copilot Studio **Agent Evaluation REST API** (`abstention`, `relevance`, `completeness`, AI-explanation) **(preview)**; runtime quality from **Application Insights** `requests` / `customEvents` via **Log Analytics KQL** (per-agent, opt-in connection).
- **Conversation content** → Dataverse `conversationtranscript` table via Dataverse Web API (JSON in `content`; 30-day default retention → export to ADLS Gen2 via Synapse Link / Fabric for history).
- **Safety / data-leak / sensitivity / jailbreak** → Purview audit `CopilotInteraction` / `AIAppInteraction` via the **Office 365 Management Activity API** (metadata, sensitivity labels, `JailbreakDetected` / `XPIADetected` flags — **not** raw text). Non-Microsoft-channel agents need Purview pay-as-you-go to be captured.
- **Cost / credits / licensing** → **Power Platform admin center** Copilot credit reports (per-environment / per-agent / caller-type, daily) and **Azure Cost Management** API (billed $ per meter / billing policy; coarse — no per-agent breakdown). Per-agent automation path is **Dataverse**. Credit weights, capacity-vs-PAYG, per-agent caps, M365-Copilot zero-rating by caller type and the 125% grace cutoff follow current Microsoft billing docs. **Funding model granularity (verified):** prepaid-vs-PAYG is selected **per environment** (a billing policy linked to an Azure subscription); zero-rating is resolved **per caller** (an M365 Copilot–licensed user on a Microsoft channel is seat-covered); per agent you set only a **spending cap**. So the per-agent "funding model" shown in the UI is a *derived* view (environment model + caller mix). **Agent 365 / E7 seats are a separate governance axis — they do not fund credit consumption** (E7 "Frontier" ≈ $99/user/mo = E5 + M365 Copilot + Entra Suite + Agent 365). Verify all pricing against the current Microsoft Copilot Studio Licensing Guide.
- **Multi-environment ALM** → Inventory API for the estate; **Power Platform Pipelines** run history in the host environment's Dataverse; Dataverse Git integration for lineage. Pipelines require target environments to be **Managed Environments**.
- **Approval gate** → M365 admin center publish/reject (GA); **Agent 365 Graph package APIs** for registry / approval state **(preview)**; Power Platform Wave 1 publishing-permission controls.
- **Agent 365 context** → Agent 365 Graph "List packages" / "Get package details" (programmatic registry registration is **preview**); Entra Agent ID + Entra ID Protection `riskyAgents` / `agentRiskDetections` **(beta)**; shadow-agent discovery via Defender / Intune **(preview)**.
- **Third-party / non-Microsoft agents** → Agent 365 is explicitly cross-platform. **"External partner-built agents" is a first-class GA registry type**, and Entra Agent ID works with non-Microsoft platforms. Documented paths: **auto-discovery** of agents on **Amazon Bedrock / Google Vertex AI** (no code change, GA); **agent factories** (**n8n**, Kore) that auto-provision an Entra Agent ID (GA); the **Agent 365 SDK** wrapping **OpenAI Agents SDK / Claude / LangChain** agents (GA); **shadow discovery** of unsanctioned local agents (e.g. OpenClaw) via Defender + Intune (**preview**, expanding June 2026); and **announced** identity provisioning for **ServiceNow / Workday** (roadmap). Honesty: appearing in the registry (visibility) is not the same as runtime enforcement — Conditional Access / DLP / Defender enforce only when the agent authenticates through an Entra Agent ID. **Salesforce Agentforce is *not* a Microsoft-documented partner** (interop is via the open A2A protocol only). The Hub seeds Bedrock, n8n, LangChain, Vertex AI, a shadow OpenClaw and an announced ServiceNow agent, each tagged GA / preview / announced.
- **NLP chat** → Azure OpenAI / Azure AI Foundry agent with **function-calling** over the above (KQL, Inventory API, Dataverse OData, Cost Management). Structured tool-calling over the relational telemetry is preferred to vector RAG because the data is relational.

**Honesty rule:** anything backed by a preview/beta API carries a small **preview** tag in the UI, and the end-to-end journey does not claim a single unified API — it is stitched from GA inventory + GA Dataverse pipeline history + preview Agent 365 approval. Verify all preview/GA states and current pricing before the live demo.
