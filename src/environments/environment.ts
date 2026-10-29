import { supabaseConfig } from './supabase.config';

/** Configuración del entorno de desarrollo. */
export const environment = {
  production: false,
  supabaseUrl: supabaseConfig.url,
  supabaseAnonKey: supabaseConfig.anonKey,
};
