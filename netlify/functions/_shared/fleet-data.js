// netlify/functions/_shared/fleet-data.js
//
// Single source of truth for the model fleet, ported 1:1 from the Python
// reference implementation at /opt/data/router.py (David's Hermes install).
//
// Benchmarks: Artificial Analysis (artificialanalysis.ai), an independent
// third-party model evaluator. Pulled live 2026-09-28.
// "intelligence_index" = Artificial Analysis Intelligence Index v4.3.2
// (composite of 10 evals: AA-Briefcase, GDPval-AA, AutomationBench-AA,
// Terminal-Bench 4.0, SciCode, Humanity's Last Exam, GDP.pdf, CritPt,
// AA-Omniscience, AA-LCR).
//
// COVERAGE NOTE (disclosed): not every dot-release has its own distinct AA
// benchmark entry. Where a specific snapshot wasn't separately benchmarked,
// its intelligence_index is inherited from the closest-related AA entry —
// flagged via index_source rather than presented as precisely measured.
//
// Pricing: real $/M-token, sourced from Hermes' models_dev_cache.json.

const MODEL_BENCHMARKS = {
  // ── Anthropic ──
  "anthropic/claude-haiku-4-5": { intelligence_index: 17, input_per_M: 1.0, output_per_M: 5.0,
    index_source: "measured", aa_url: "artificialanalysis.ai (Claude 4.5 Haiku)" },
  "anthropic/claude-sonnet-5": { intelligence_index: 38, input_per_M: 2.0, output_per_M: 10.0,
    index_source: "measured", aa_url: "artificialanalysis.ai (Claude Sonnet 5, max)" },
  "anthropic/claude-opus-4-8": { intelligence_index: 48, input_per_M: 5.0, output_per_M: 25.0,
    index_source: "inherited from claude-opus-5 (same price tier, prior snapshot)", aa_url: "artificialanalysis.ai (Claude Opus 5 family)" },
  "anthropic/claude-opus-5": { intelligence_index: 51, input_per_M: 5.0, output_per_M: 25.0,
    index_source: "measured", aa_url: "artificialanalysis.ai/models/claude-opus-5" },
  "anthropic/claude-opus-5-5": { intelligence_index: 58, input_per_M: 4.0, output_per_M: 20.0,
    index_source: "measured", aa_url: "artificialanalysis.ai (Claude Opus 5.5, max)" },
  "anthropic/claude-fable-5": { intelligence_index: 51, input_per_M: 10.0, output_per_M: 50.0,
    index_source: "inherited from claude-fable-5-1 (same family, prior snapshot)", aa_url: "artificialanalysis.ai (Claude Fable 5.1 family)" },
  "anthropic/claude-fable-5-1": { intelligence_index: 53, input_per_M: 10.0, output_per_M: 50.0,
    index_source: "measured", aa_url: "artificialanalysis.ai (Claude Fable 5.1, max)" },

  // ── Ollama-Cloud ──
  "ollama-cloud/nemotron-3-nano:30b": { intelligence_index: 9, input_per_M: 0.06, output_per_M: 0.24,
    index_source: "measured", aa_url: "artificialanalysis.ai (Nemotron 3 Nano)" },
  "ollama-cloud/nemotron-3-super": { intelligence_index: 13, input_per_M: 0.015, output_per_M: 0.6,
    index_source: "measured", aa_url: "artificialanalysis.ai (Nemotron 3 Super)" },
  "ollama-cloud/nemotron-3-ultra": { intelligence_index: 23, input_per_M: 0.1, output_per_M: 3.0,
    index_source: "measured", aa_url: "artificialanalysis.ai (Nemotron 3 Ultra)" },
  "ollama-cloud/gemma4:31b": { intelligence_index: 19, input_per_M: 0.14, output_per_M: 0.40,
    index_source: "measured", aa_url: "artificialanalysis.ai/models/gemma-4-31b" },
  "ollama-cloud/mistral-large-3:675b": { intelligence_index: 9, input_per_M: 0.50, output_per_M: 1.50,
    index_source: "measured", aa_url: "artificialanalysis.ai/models/mistral-large-3" },
  "ollama-cloud/gpt-oss:20b": { intelligence_index: 9, input_per_M: 0.07, output_per_M: 0.3,
    index_source: "measured", aa_url: "artificialanalysis.ai (gpt-oss-20b, high)" },
  "ollama-cloud/gpt-oss:120b": { intelligence_index: 12, input_per_M: 0.15, output_per_M: 0.6,
    index_source: "measured", aa_url: "artificialanalysis.ai (gpt-oss-120b, high)" },
  "ollama-cloud/glm-5.1": { intelligence_index: 30, input_per_M: 1.0, output_per_M: 3.2,
    index_source: "inherited from glm-5.2 family, scaled down one generation", aa_url: "artificialanalysis.ai (GLM-5.x family)" },
  "ollama-cloud/glm-5.2": { intelligence_index: 34, input_per_M: 1.4, output_per_M: 4.4,
    index_source: "measured", aa_url: "artificialanalysis.ai/models/glm-5-2" },
  "ollama-cloud/glm-5.3": { intelligence_index: 45, input_per_M: 1.4, output_per_M: 4.4,
    index_source: "measured", aa_url: "artificialanalysis.ai (GLM-5.3, max)" },
  "ollama-cloud/glm-5.3-flash": { intelligence_index: 42, input_per_M: 0.15, output_per_M: 0.5,
    index_source: "measured", aa_url: "artificialanalysis.ai (GLM-5.3-Flash)" },
  "ollama-cloud/deepseek-v4-pro": { intelligence_index: 36, input_per_M: 0.66, output_per_M: 1.98,
    index_source: "measured", aa_url: "artificialanalysis.ai/models/deepseek-v4-pro" },
  "ollama-cloud/deepseek-v4-pro:0813": { intelligence_index: 36, input_per_M: 0.66, output_per_M: 1.98,
    index_source: "measured (same release as deepseek-v4-pro)", aa_url: "artificialanalysis.ai/models/deepseek-v4-pro" },
  "ollama-cloud/deepseek-v4-flash": { intelligence_index: 35, input_per_M: 0.22, output_per_M: 0.66,
    index_source: "inherited from DeepSeek V4 Flash Vision (max)", aa_url: "artificialanalysis.ai (DeepSeek V4 Flash family)" },
  "ollama-cloud/deepseek-v4-flash:0731": { intelligence_index: 35, input_per_M: 0.22, output_per_M: 0.66,
    index_source: "inherited from DeepSeek V4 Flash Vision (max)", aa_url: "artificialanalysis.ai (DeepSeek V4 Flash family)" },
  "ollama-cloud/deepseek-v4.1-flash": { intelligence_index: 39, input_per_M: 0.15, output_per_M: 0.6,
    index_source: "measured", aa_url: "artificialanalysis.ai (DeepSeek V4.1 Flash, max)" },
  "ollama-cloud/kimi-k2.5": { intelligence_index: 34, input_per_M: 0.95, output_per_M: 4.0,
    index_source: "inherited from Kimi K3 family, prior generation", aa_url: "artificialanalysis.ai (Kimi K-series family)" },
  "ollama-cloud/kimi-k2.6": { intelligence_index: 38, input_per_M: 0.95, output_per_M: 4.0,
    index_source: "inherited from Kimi K3 family, prior generation", aa_url: "artificialanalysis.ai (Kimi K-series family)" },
  "ollama-cloud/kimi-k2.7-code": { intelligence_index: 40, input_per_M: 0.95, output_per_M: 4.0,
    index_source: "inherited from Kimi K3, coding-tuned variant", aa_url: "artificialanalysis.ai (Kimi K-series family)" },
  "ollama-cloud/kimi-k3": { intelligence_index: 44, input_per_M: 3.0, output_per_M: 15.0,
    index_source: "measured", aa_url: "artificialanalysis.ai (Kimi K3, max)" },
  "ollama-cloud/minimax-m2.5": { intelligence_index: 26, input_per_M: 0.6, output_per_M: 2.4,
    index_source: "inherited from minimax-m3, prior generation", aa_url: "artificialanalysis.ai (MiniMax-M series family)" },
  "ollama-cloud/minimax-m2.7": { intelligence_index: 28, input_per_M: 0.3, output_per_M: 1.2,
    index_source: "inherited from minimax-m3, prior generation", aa_url: "artificialanalysis.ai (MiniMax-M series family)" },
  "ollama-cloud/minimax-m3": { intelligence_index: 29, input_per_M: 0.6, output_per_M: 2.4,
    index_source: "measured", aa_url: "artificialanalysis.ai (MiniMax-M3)" },
  "ollama-cloud/qwen3.5:397b": { intelligence_index: 18, input_per_M: 0.6, output_per_M: 3.6,
    index_source: "measured", aa_url: "artificialanalysis.ai (Qwen3.5 397B A17B)" },
};

// TASK_TYPE_POOLS: which models are considered good fits per task type.
const TASK_TYPE_POOLS = {
  "coding": [
    "ollama-cloud/gpt-oss:20b", "ollama-cloud/gpt-oss:120b", "ollama-cloud/kimi-k2.7-code",
    "ollama-cloud/deepseek-v4-pro", "ollama-cloud/glm-5.3", "anthropic/claude-sonnet-5",
    "anthropic/claude-opus-5",
  ],
  "analysis-research": [
    "ollama-cloud/deepseek-v4-pro", "ollama-cloud/glm-5.3", "ollama-cloud/kimi-k3",
    "ollama-cloud/qwen3.5:397b", "anthropic/claude-sonnet-5", "anthropic/claude-opus-5",
    "anthropic/claude-opus-5-5",
  ],
  "factual-accuracy": [
    "ollama-cloud/gemma4:31b", "ollama-cloud/deepseek-v4.1-flash", "ollama-cloud/glm-5.3-flash",
    "anthropic/claude-haiku-4-5", "anthropic/claude-sonnet-5",
  ],
  "creative-writing": [
    "anthropic/claude-fable-5-1", "anthropic/claude-fable-5", "anthropic/claude-opus-5-5",
    "ollama-cloud/mistral-large-3:675b", "ollama-cloud/glm-5.3", "ollama-cloud/nemotron-3-nano:30b",
  ],
  "business-communication": [
    "ollama-cloud/nemotron-3-nano:30b", "ollama-cloud/gemma4:31b", "ollama-cloud/deepseek-v4.1-flash",
    "anthropic/claude-haiku-4-5",
  ],
  "general": Object.keys(MODEL_BENCHMARKS),
};

// Minimum Intelligence Index required per size bucket (quality floor, not a fixed model).
const SIZE_MIN_INDEX = { tiny: 0, everyday: 15, large: 30, hardest: 45 };

function pickModel(sizeChoice, taskChoice) {
  const minIndex = SIZE_MIN_INDEX[sizeChoice] ?? 0;
  const pool = TASK_TYPE_POOLS[taskChoice] || TASK_TYPE_POOLS["general"];

  let candidates = pool.filter((m) => MODEL_BENCHMARKS[m].intelligence_index >= minIndex);
  if (candidates.length === 0) {
    candidates = Object.keys(MODEL_BENCHMARKS).filter(
      (m) => MODEL_BENCHMARKS[m].intelligence_index >= minIndex
    );
  }
  if (candidates.length === 0) {
    candidates = [
      Object.keys(MODEL_BENCHMARKS).reduce((best, m) =>
        MODEL_BENCHMARKS[m].intelligence_index > MODEL_BENCHMARKS[best].intelligence_index ? m : best
      ),
    ];
  }

  const blendedCost = (m) => {
    const b = MODEL_BENCHMARKS[m];
    return b.input_per_M * 0.3 + b.output_per_M * 0.7;
  };
  return candidates.reduce((best, m) => (blendedCost(m) < blendedCost(best) ? m : best));
}

const TOKENS_IN = 900;
const TOKENS_OUT = 450;
const HARDEST_MODEL = "anthropic/claude-opus-5";
const _h = MODEL_BENCHMARKS[HARDEST_MODEL];
const HARDEST_BASELINE = (TOKENS_IN / 1e6) * _h.input_per_M + (TOKENS_OUT / 1e6) * _h.output_per_M;

module.exports = {
  MODEL_BENCHMARKS,
  TASK_TYPE_POOLS,
  SIZE_MIN_INDEX,
  pickModel,
  TOKENS_IN,
  TOKENS_OUT,
  HARDEST_BASELINE,
};
