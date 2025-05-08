export const environment = {
  production: import.meta.env.PROD,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  emailDomain: '@episd.org',
  maxRetries: 3,
  apiTimeout: 30000,
  defaultPageSize: 20,
  maxUploadSize: 5 * 1024 * 1024, // 5MB
}
