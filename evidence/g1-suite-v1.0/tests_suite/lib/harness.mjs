// TEST ONLY — minimal harness. Each test declares the EXPECTED outcome ('accept' | 'reject')
// and records what was OBSERVED. A test PASSES only if observed === expected.
export const results = [];

export async function t(id, group, title, expected, fn) {
  let observed, detail;
  try {
    const out = await fn();
    if (out && out.__reject) { observed = 'reject'; detail = out.reason; }
    else { observed = 'accept'; detail = typeof out === 'string' ? out : (out?.detail ?? ''); }
  } catch (e) {
    observed = 'reject';
    detail = (e?.code ? `[${e.code}] ` : '') + (e?.message ?? String(e));
  }
  const pass = observed === expected;
  results.push({ id, group, title, expected, observed, pass, detail: String(detail).slice(0, 220) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  expected=${expected} observed=${observed}  ${String(detail).slice(0, 140)}`);
}

export const reject = (reason) => ({ __reject: true, reason });
