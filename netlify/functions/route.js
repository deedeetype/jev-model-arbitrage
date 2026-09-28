// netlify/functions/route.js
//
// Real-time routing endpoint. Receives a prompt, calls the actual Jev model
// (typesafe/jev-1.13 via OpenRouter's Decisions API) for size + task_type
// classification, then picks the cheapest model in David's fleet that clears
// the resulting quality floor. Ported 1:1 from /opt/data/router.py.
//
// Requires env var OPENROUTER_API_KEY set in Netlify's site settings
// (Site configuration -> Environment variables). NEVER hardcode the key here.

const { MODEL_BENCHMARKS, pickModel, TOKENS_IN, TOKENS_OUT, HARDEST_BASELINE } = require("./_shared/fleet-data");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "POST only" }) };
  }

  let prompt;
  try {
    const body = JSON.parse(event.body || "{}");
    prompt = (body.prompt || "").trim();
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "invalid JSON body" }) };
  }
  if (!prompt) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "empty prompt" }) };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "OPENROUTER_API_KEY is not configured on this Netlify site" }),
    };
  }

  // Short conversational replies skip Jev entirely (same rule as router.py).
  const shortReplyWords = ["yes", "no", "thanks", "ok", "sure", "do it"];
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount < 10 && shortReplyWords.some((w) => prompt.toLowerCase().includes(w))) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        model: "MAIN_AGENT", size: null, task_type: null,
        size_confidence: 1.0, task_confidence: 1.0, cost: 0.0,
        prompt, exec_cost: HARDEST_BASELINE, provider: "main-agent",
        hardest_baseline: HARDEST_BASELINE,
      }),
    };
  }

  const payload = {
    model: "typesafe/jev-1.13",
    state: { message: prompt },
    questions: {
      size: {
        type: "choice",
        instructions: "What's the smallest model that can do this job well?",
        criteria: {
          tiny: "A lookup, a rename, a one-line answer.",
          everyday: "A normal email, post or short document.",
          large: "A multi-step build, research, a full report.",
          hardest: "Strategy, or anywhere a wrong call is expensive.",
        },
      },
      task_type: {
        type: "choice",
        instructions: "What kind of work is this task, fundamentally?",
        criteria: {
          coding: "Writing, reviewing, or debugging source code.",
          "creative-writing": "Poems, stories, marketing copy, brainstorming.",
          "business-communication": "Emails, Slack messages, meeting notes.",
          "analysis-research": "Comparing options, researching, building a strategy or report.",
          "factual-accuracy": "A question with one correct, verifiable answer.",
          general: "Doesn't clearly fit another category.",
        },
      },
    },
  };

  try {
    const res = await fetch("https://openrouter.ai/api/alpha/decisions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          model: "MAIN_AGENT", size: null, task_type: null,
          size_confidence: 0, task_confidence: 0, cost: 0,
          prompt, exec_cost: HARDEST_BASELINE, provider: "main-agent",
          hardest_baseline: HARDEST_BASELINE,
          error: `Jev API returned ${res.status}`,
        }),
      };
    }

    const data = await res.json();
    const sizeAns = data.answers.size;
    const taskAns = data.answers.task_type;
    const sizeChoice = sizeAns.choice;
    const sizeConf = sizeAns.confidence;
    const taskChoice = taskAns.choice;
    const taskConf = taskAns.confidence;
    const jevCost = data.usage.cost;

    if (sizeConf < 0.6) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          model: "MAIN_AGENT", size: sizeChoice, task_type: taskChoice,
          size_confidence: sizeConf, task_confidence: taskConf, cost: jevCost,
          prompt, exec_cost: HARDEST_BASELINE, provider: "main-agent",
          hardest_baseline: HARDEST_BASELINE,
        }),
      };
    }

    const model = pickModel(sizeChoice, taskChoice);
    const bench = MODEL_BENCHMARKS[model];
    const execCost = (TOKENS_IN / 1e6) * bench.input_per_M + (TOKENS_OUT / 1e6) * bench.output_per_M;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        model,
        size: sizeChoice,
        task_type: taskChoice,
        intelligence_index: bench.intelligence_index,
        index_source: bench.index_source,
        size_confidence: sizeConf,
        task_confidence: taskConf,
        cost: jevCost,
        prompt,
        exec_cost: Math.round(execCost * 1e6) / 1e6,
        provider: model.split("/")[0],
        hardest_baseline: HARDEST_BASELINE,
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        model: "MAIN_AGENT", size: null, task_type: null,
        size_confidence: 0, task_confidence: 0, cost: 0,
        prompt, exec_cost: HARDEST_BASELINE, provider: "main-agent",
        hardest_baseline: HARDEST_BASELINE,
        error: String(err),
      }),
    };
  }
};
