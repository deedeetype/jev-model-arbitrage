# Jev Model Arbitrage — Live Test

A real-time playground for testing the Jev (`typesafe/jev-1.13`) model-arbitrage
router: type any prompt, and watch it get classified by **size** and **task
type**, then routed to the cheapest model in the fleet that clears the
resulting quality bar — picked from a real 31-model fleet spanning **Anthropic**
and **Ollama-Cloud**, using real benchmark scores from
[Artificial Analysis](https://artificialanalysis.ai) (an independent
third-party evaluator) and real per-token pricing.

Every result on the page is a live API call — nothing here is a canned demo.

## How it works

1. You type a prompt.
2. The page calls `/.netlify/functions/route`, a serverless function that:
   - Sends your prompt to Jev with **two parallel questions**: `size`
     (tiny/everyday/large/hardest) and `task_type` (coding, creative-writing,
     business-communication, analysis-research, factual-accuracy, general).
   - Uses `size` to set a minimum required **Intelligence Index** (Artificial
     Analysis' composite benchmark score).
   - Uses `task_type` to narrow the candidate pool to models known to fit
     that kind of work.
   - Picks the **cheapest model** in that pool whose Intelligence Index clears
     the floor.
3. The page lights up the winning model in the live fleet grid, shows the
   real routing confidence, and compares the routed cost against "always use
   Claude Opus 5" for the same task.

## Deploying to Netlify

1. **Connect this repo to Netlify** (New site from Git → pick this repo).
   Netlify auto-detects `netlify.toml` (publish dir `public/`, functions dir
   `netlify/functions/`) — no build command needed.

2. **Set the required environment variable** in
   Site configuration → Environment variables:

   | Key | Value |
   |---|---|
   | `OPENROUTER_API_KEY` | Your OpenRouter API key (the one with access to `typesafe/jev-1.13`) |

   Never commit this key to the repo — it is read server-side only, inside
   the Netlify Function, and never shipped to the browser.

3. Deploy. The live page will be at `https://<your-site-name>.netlify.app`.

## Local development

```bash
npm install -g netlify-cli
netlify dev
```

This runs the static page AND the serverless functions together on
`localhost:8888`, with the same routing you'd get in production — set
`OPENROUTER_API_KEY` in a local `.env` file first (already gitignored).

## Files

- `public/index.html` — the interactive frontend (single file, no build step).
- `netlify/functions/route.js` — the live routing endpoint (calls Jev via
  OpenRouter's Decisions API, ported 1:1 from the reference Python
  implementation at `router.py` in the original Hermes skill).
- `netlify/functions/fleet.js` — returns the full model fleet + benchmarks,
  used to render the model grid.
- `netlify/functions/_shared/fleet-data.js` — single source of truth for the
  model list, Artificial Analysis benchmark scores, real pricing, and the
  task-type routing pools.

## Data sourcing & honesty notes

- **Intelligence Index** scores come from
  [Artificial Analysis](https://artificialanalysis.ai), pulled live on
  2026-09-28. Not every dot-release (e.g. `kimi-k2.6` vs `kimi-k3`) has its
  own distinct AA benchmark entry — where a specific snapshot wasn't
  separately benchmarked, its score is **inherited** from the closest-related
  AA entry and flagged as such via `index_source` in `fleet-data.js`, rather
  than presented as precisely measured.
- Artificial Analysis has no isolated public "creative writing" benchmark —
  their Intelligence Index is a general composite (coding, reasoning, agentic
  work, etc.). For creative-writing tasks this is used as the best available
  proxy, not a precise creativity score.
- Pricing is real $/M-token, sourced from the same provider model cache used
  by the Hermes install this was originally built for.
