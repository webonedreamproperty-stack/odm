/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_ENABLE_DEMO_WORKSPACE?: string;
  readonly VITE_OD_PAYMENTS_ENABLED?: string;
  readonly VITE_OD_BAYARCASH_RENEWAL?: string;
  readonly VITE_PAYMENT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
