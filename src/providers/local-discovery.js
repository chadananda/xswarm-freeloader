// :ctx
// :arch: local AI discovery — probes Ollama, LM Studio, custom endpoints for available models
// :deps: fetch | consumed by app.js discover endpoint
// :rules: 3s timeout per probe; never throws — returns results with errors inline
//
const KNOWN_ENDPOINTS = [
  { name: 'Ollama', url: 'http://localhost:11434', probe: '/api/tags', parser: (data) => (data.models || []).map(m => ({ id: m.name, name: m.name, size: m.size })) },
  { name: 'LM Studio', url: 'http://localhost:1234', probe: '/v1/models', parser: (data) => (data.data || []).map(m => ({ id: m.id, name: m.id })) }
];
//
async function probeEndpoint(baseUrl, probePath, parser, timeout = 3000) {
  try {
    const res = await fetch(`${baseUrl}${probePath}`, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { available: true, models: parser(data) };
  } catch (err) {
    return { available: false, error: err.message };
  }
}
//
export async function discoverLocal(customEndpoints = []) {
  const results = [];
  // Probe known endpoints
  for (const ep of KNOWN_ENDPOINTS) {
    const result = await probeEndpoint(ep.url, ep.probe, ep.parser);
    results.push({ name: ep.name, url: ep.url, ...result });
  }
  // Probe custom endpoints (try Ollama → OpenAI → Boss Router formats)
  for (const url of customEndpoints) {
    const ollamaResult = await probeEndpoint(url, '/api/tags', KNOWN_ENDPOINTS[0].parser);
    if (ollamaResult.available) {
      results.push({ name: 'Custom (Ollama)', url, ...ollamaResult });
      continue;
    }
    const openaiResult = await probeEndpoint(url, '/v1/models', KNOWN_ENDPOINTS[1].parser);
    if (openaiResult.available) {
      results.push({ name: 'Custom (OpenAI-compatible)', url, ...openaiResult });
      continue;
    }
    // Boss Router format: root returns { models_online, models_offline }
    const bossResult = await probeEndpoint(url, '/', (data) => {
      if (!data.models_online && !data.models_offline) return null;
      const online = (data.models_online || []).map(m => ({ id: m.alias || m.model, name: m.model || m.alias, description: m.description, port: m.port, status: 'online' }));
      const offline = (data.models_offline || []).map(m => ({ id: m.alias || m.model, name: m.model || m.alias, description: m.description, port: m.port, status: 'offline' }));
      return [...online, ...offline];
    });
    if (bossResult.available && bossResult.models) {
      results.push({ name: 'Custom (Boss Router)', url, ...bossResult });
      continue;
    }
    results.push({ name: 'Custom', url, available: false, error: 'No compatible API found' });
  }
  return results;
}
