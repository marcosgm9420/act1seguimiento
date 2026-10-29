import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Punto único de acceso al cliente de Supabase.
 *
 * Se usa para la autenticación (Supabase Auth) y para la colección documental en
 * tiempo real (Supabase Realtime). Las consultas relacionales van por la API REST
 * con `HttpClient` (ver `InventoryApiService`).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** Indica si la URL y la clave pública están configuradas. */
  readonly configured = Boolean(environment.supabaseUrl && environment.supabaseAnonKey);

  /** Cliente de Supabase compartido por toda la aplicación. */
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl || 'https://sin-configurar.supabase.co',
    environment.supabaseAnonKey || 'sin-configurar',
    { auth: { persistSession: true, autoRefreshToken: true } },
  );

  /** URL base de la API REST (PostgREST) del proyecto. */
  readonly restUrl = `${environment.supabaseUrl}/rest/v1`;
}
