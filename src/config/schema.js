import { z } from 'zod';

export const WeightsSchema = z.object({
  cost: z.number().min(0).max(1),
  speed: z.number().min(0).max(1),
  quality: z.number().min(0).max(1)
}).refine(
  w => Math.abs(w.cost + w.speed + w.quality - 1.0) < 0.01,
  { message: 'Weights must sum to 1.0' }
);

export const QualityGatesSchema = z.object({
  minIntelligence: z.number().min(1).max(10).default(6),
  minSpeed: z.number().min(1).max(10).optional(),
  maxLatency: z.number().min(0).default(10000),
  blockLocal: z.boolean().default(false),
  blockedProviders: z.array(z.string()).optional(),
  trustTier: z.enum(['open', 'standard', 'private']).optional()
});

export const RoutingConfigSchema = z.object({
  strategy: z.enum(['balanced', 'cost-first', 'speed-first', 'quality-first']).default('balanced'),
  weights: WeightsSchema.default({ cost: 0.4, speed: 0.4, quality: 0.2 }),
  qualityGates: QualityGatesSchema.default({ minIntelligence: 6, maxLatency: 10000, blockLocal: false })
});

export const BudgetLimitSchema = z.object({
  daily: z.number().min(0),
  monthly: z.number().min(0)
});

export const ServerConfigSchema = z.object({
  routerPort: z.number().min(1024).max(65535).default(4011),
  dashboardPort: z.number().min(1024).max(65535).default(4010),
  host: z.string().default('127.0.0.1')
});

export const EmailConfigSchema = z.object({
  enabled: z.boolean().default(false),
  smtp: z.object({
    host: z.string(),
    port: z.number().default(587),
    secure: z.boolean().default(false),
    user: z.string(),
    pass: z.string()
  }).optional(),
  digestFrequency: z.enum(['daily', 'weekly', 'never']).default('daily'),
  to: z.string().default('')
});

export const ConfigSchema = z.object({
  version: z.string().default('2.0'),
  routing: RoutingConfigSchema,
  budget: z.object({
    hard: BudgetLimitSchema.default({ daily: 10.00, monthly: 200.00 }),
    soft: BudgetLimitSchema.default({ daily: 5.00, monthly: 100.00 })
  }),
  server: ServerConfigSchema.optional(),
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info')
  }).optional(),
  email: EmailConfigSchema.optional(),
  catalogUrl: z.string().optional()
});

export function validateConfig(config) {
  return ConfigSchema.parse(config);
}

export function validatePartialConfig(config) {
  return ConfigSchema.partial().parse(config);
}
