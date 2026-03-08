import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CATALOG_PATH = path.join(__dirname, 'default-catalog.json');

export class CatalogSync {
  constructor(providerRepo, modelRepo, config, logger) {
    this.providerRepo = providerRepo;
    this.modelRepo = modelRepo;
    this.catalogUrl = config.catalogUrl || 'https://catalog.freeloader.xswarm.ai/catalog.json';
    this.logger = logger;
  }

  async sync() {
    let catalog;

    try {
      this.logger?.info?.('Fetching remote catalog...');
      const res = await fetch(this.catalogUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        catalog = await res.json();
        this.logger?.info?.(`Remote catalog loaded: ${catalog.providers?.length || 0} providers`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      this.logger?.warn?.(`Remote catalog fetch failed: ${err.message}, using bundled default`);
      catalog = this.loadDefaultCatalog();
    }

    if (!catalog?.providers) {
      this.logger?.error?.('No catalog data available');
      return;
    }

    this.upsertCatalog(catalog);
  }

  loadDefaultCatalog() {
    try {
      return JSON.parse(fs.readFileSync(DEFAULT_CATALOG_PATH, 'utf8'));
    } catch {
      this.logger?.error?.('Failed to load default catalog');
      return null;
    }
  }

  upsertCatalog(catalog) {
    let providerCount = 0;
    let modelCount = 0;

    for (const provider of catalog.providers) {
      this.providerRepo.upsert({
        id: provider.id,
        name: provider.name,
        adapter: provider.adapter,
        base_url: provider.base_url,
        trust_tier: provider.trust_tier || 'open',
        is_local: provider.is_local || false
      });
      providerCount++;

      for (const model of (provider.models || [])) {
        this.modelRepo.upsert({
          id: model.id || `${provider.id}/${model.name}`,
          provider_id: provider.id,
          name: model.name,
          context_window: model.context_window,
          supports_tools: model.supports_tools || false,
          supports_vision: model.supports_vision || false,
          domains: model.domains,
          pricing_input: model.pricing_input || 0,
          pricing_output: model.pricing_output || 0,
          free_tier: model.free_tier || false,
          free_tier_rpm: model.free_tier_rpm,
          free_tier_rpd: model.free_tier_rpd,
          free_tier_tpm: model.free_tier_tpm,
          free_tier_tpd: model.free_tier_tpd
        });
        modelCount++;
      }
    }

    this.logger?.info?.(`Catalog synced: ${providerCount} providers, ${modelCount} models`);
  }
}
