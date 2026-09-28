// netlify/functions/fleet.js
// Returns the full model fleet with real benchmarks (Artificial Analysis) and
// real $/M-token pricing. Single source of truth shared with route.js.
const { MODEL_BENCHMARKS, HARDEST_BASELINE } = require("./_shared/fleet-data");

exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ fleet: MODEL_BENCHMARKS, hardest_baseline: HARDEST_BASELINE }),
  };
};
