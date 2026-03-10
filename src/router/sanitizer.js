// :arch: request sanitizer — wraps xswarm-ai-sanitize with per-app profiles and telemetry
// :deps: xswarm-ai-sanitize (npm), SanitizationRepository | consumed by app.js
// :rules: 'off' profile skips entirely; blocked=true → caller gets 400; always log telemetry
//
export async function sanitizeRequest(messages, profile, appId, sanitizationRepo) {
  if (profile === 'off') return { messages, result: null, blocked: false };
  //
  let sanitize;
  try { ({ sanitize } = await import('xswarm-ai-sanitize')); }
  catch { return { messages, result: null, blocked: false }; }
  //
  const contentBefore = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0);
  const options = profile === 'aggressive'
    ? { detectSecrets: true, detectPii: true, redactPii: true, blockOnSecrets: true }
    : { detectSecrets: true, detectPii: true, redactPii: false, blockOnSecrets: false };
  //
  const sanitized = messages.map(m => {
    if (typeof m.content !== 'string') return m;
    try {
      const result = sanitize(m.content, options);
      return { ...m, content: result.sanitized || m.content, _sanitizeResult: result };
    } catch { return m; }
  });
  //
  const results = sanitized.filter(m => m._sanitizeResult).map(m => m._sanitizeResult);
  const rulesCount = results.reduce((sum, r) => sum + (r.rulesApplied || 0), 0);
  const secretsCount = results.reduce((sum, r) => sum + (r.secretsFound || 0), 0);
  const piiCount = results.reduce((sum, r) => sum + (r.piiDetected || 0), 0);
  const blocked = profile === 'aggressive' && secretsCount > 0;
  const contentAfter = sanitized.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0);
  //
  const cleanMessages = sanitized.map(m => {
    const { _sanitizeResult, ...clean } = m;
    return clean;
  });
  //
  const telemetry = {
    app_id: appId, profile, rules_fired: rulesCount, secrets_found: secretsCount,
    pii_detected: piiCount, content_length_before: contentBefore,
    content_length_after: contentAfter, blocked, action_taken: blocked ? 'blocked' : (rulesCount > 0 ? 'sanitized' : 'passed')
  };
  //
  if (sanitizationRepo) {
    try { sanitizationRepo.insert(telemetry); } catch { /* telemetry failure is non-fatal */ }
  }
  //
  return { messages: cleanMessages, result: telemetry, blocked };
}
