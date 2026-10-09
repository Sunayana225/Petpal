const assert = require('node:assert/strict');
const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) throw new Error('Provide the API origin as the first argument.');
(async () => {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { ready = (await fetch(`${base}/api/ready`, { signal: AbortSignal.timeout(2000) })).ok; } catch { /* startup */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'API must become ready');
  for (const [food, safety] of [['chocolate', 'unsafe'], ['apple', 'safe'], ['production-unknown-xyz', 'unknown']]) {
    const response = await fetch(`${base}/api/food-safety/check?pet=dogs&food=${food}&mode=local`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.safety, safety);
    if (result.details) {
      assert.equal(result.details.source, 'BioVet (CC BY 4.0)');
      assert.ok(result.details.evidence?.length);
    }
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  const providers = await (await fetch(`${base}/api/auth/providers`)).json();
  assert.equal(providers.dev, false);
  const dev = await fetch(`${base}/api/auth/dev-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.ok([403, 404].includes(dev.status));
  assert.equal((await fetch(`${base}/api/me/keys`)).status, 401);
  const recalls = await (await fetch(`${base}/api/recalls?q=unknown-fixture-brand`)).json();
  assert.equal(recalls.source.country, 'US');
  assert.equal(recalls.records.length, 0);
  assert.ok(recalls.source.coverage.includes('No match is not a safety clearance'));
  console.log('Production smoke passed: reviewed-source dataset, local verdicts, dev-login disabled, anonymous access refused, recall coverage disclosed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
