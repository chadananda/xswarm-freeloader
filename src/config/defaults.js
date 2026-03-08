export const DEFAULT_CONFIG = {
  version: '2.0',

  routing: {
    strategy: 'balanced',
    weights: {
      cost: 0.4,
      speed: 0.4,
      quality: 0.2
    },
    qualityGates: {
      minIntelligence: 6,
      maxLatency: 10000,
      blockLocal: false
    }
  },

  budget: {
    hard: { daily: 10.00, monthly: 200.00 },
    soft: { daily: 5.00, monthly: 100.00 }
  },

  server: {
    routerPort: 4011,
    dashboardPort: 4010,
    host: '127.0.0.1'
  },

  logging: {
    level: 'info'
  },

  email: {
    enabled: false,
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: ''
    },
    digestFrequency: 'daily',
    to: ''
  },

  catalogUrl: 'https://catalog.freeloader.xswarm.ai/catalog.json'
};

export const STRATEGY_PRESETS = {
  balanced: { cost: 0.4, speed: 0.4, quality: 0.2 },
  'cost-first': { cost: 0.7, speed: 0.2, quality: 0.1 },
  'speed-first': { cost: 0.1, speed: 0.7, quality: 0.2 },
  'quality-first': { cost: 0.1, speed: 0.2, quality: 0.7 }
};
