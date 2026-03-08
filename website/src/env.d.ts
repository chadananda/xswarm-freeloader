/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_ADMIN_EMAIL: string;
  readonly PUBLIC_POSTHOG_KEY: string;
  readonly RESEND_API_KEY: string;
  readonly TURSO_DATABASE_URL: string;
  readonly TURSO_AUTH_TOKEN: string;
  readonly JWT_SECRET: string;
  readonly CRON_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
