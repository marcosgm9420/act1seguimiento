import { supabaseConfig } from './supabase.config';

/** Configuración del entorno de producción. */
export const environment = {
  production: true,
  supabaseUrl: supabaseConfig.url,
  supabaseAnonKey: supabaseConfig.anonKey,
};
