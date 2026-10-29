import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthError, Session } from '@supabase/supabase-js';
import { Profile, Role } from '../../models';
import { SupabaseService } from '../supabase/supabase.service';

/** Resultado de un registro: puede requerir confirmar el correo antes de entrar. */
export interface RegisterResult {
  needsEmailConfirmation: boolean;
}

/**
 * Estado global de autenticación (patrón *store* con signals).
 *
 * El estado solo se modifica desde los métodos de esta clase y se expone en modo
 * lectura, de forma que el flujo de datos es predecible: vista -> acción -> store -> vista.
 * El token JWT lo gestiona Supabase Auth (incluido el refresco automático).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly supabase = inject(SupabaseService).client;

  private readonly _session = signal<Session | null>(null);
  private readonly _profile = signal<Profile | null>(null);
  private readonly _ready = signal(false);

  /** Sesión actual de Supabase (incluye el JWT). */
  readonly session = this._session.asReadonly();
  /** Perfil del usuario con su rol. */
  readonly profile = this._profile.asReadonly();
  /** `true` cuando ya se ha restaurado la sesión guardada. */
  readonly ready = this._ready.asReadonly();
  /** Hay un usuario con sesión y perfil cargado. */
  readonly isAuthenticated = computed(() => this._session() !== null && this._profile() !== null);
  /** Rol del usuario autenticado. */
  readonly role = computed<Role | null>(() => this._profile()?.role ?? null);
  /** El usuario autenticado es administrador. */
  readonly isAdmin = computed(() => this.role() === 'admin');

  private readonly initialized: Promise<void>;

  constructor() {
    this.initialized = this.restoreSession();
  }

  /** Espera a que la sesión guardada se haya restaurado (lo usan los guards). */
  whenReady(): Promise<void> {
    return this.initialized;
  }

  /** Token JWT del usuario, o `null` si no hay sesión. */
  accessToken(): string | null {
    return this._session()?.access_token ?? null;
  }

  /** Ruta de inicio según el rol del usuario. */
  homeUrl(): string {
    return this.isAdmin() ? '/panel' : '/productos';
  }

  /**
   * Inicia sesión con correo y contraseña.
   * @throws Error con un mensaje en castellano si las credenciales no son válidas.
   */
  async login(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(this.translate(error));
    }
    await this.applySession(data.session);
    if (!this._profile()) {
      await this.supabase.auth.signOut();
      throw new Error('Tu usuario no tiene un perfil asignado. Contacta con el administrador.');
    }
  }

  /** Registra un nuevo usuario estándar. */
  async register(fullName: string, email: string, password: string): Promise<RegisterResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      throw new Error(this.translate(error));
    }
    await this.applySession(data.session);
    return { needsEmailConfirmation: data.session === null };
  }

  /** Cierra la sesión y limpia el estado. */
  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this._session.set(null);
    this._profile.set(null);
  }

  private async restoreSession(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      await this.applySession(data.session);
    } catch {
      this._session.set(null);
    } finally {
      this._ready.set(true);
    }

    this.supabase.auth.onAuthStateChange((event, session) => {
      // Supabase recomienda no hacer llamadas asíncronas dentro del callback.
      setTimeout(() => {
        if (event === 'SIGNED_OUT') {
          this._session.set(null);
          this._profile.set(null);
        } else if (session && session.access_token !== this._session()?.access_token) {
          void this.applySession(session);
        }
      });
    });
  }

  private async applySession(session: Session | null): Promise<void> {
    this._session.set(session);
    if (!session) {
      this._profile.set(null);
      return;
    }
    if (this._profile()?.id === session.user.id) {
      return;
    }
    const { data } = await this.supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .maybeSingle();
    this._profile.set(
      data ? { id: data.id, email: data.email, fullName: data.full_name, role: data.role as Role } : null,
    );
  }

  private translate(error: AuthError): string {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Correo o contraseña incorrectos.';
      case 'email_not_confirmed':
        return 'Debes confirmar tu correo antes de iniciar sesión.';
      case 'user_already_exists':
        return 'Ya existe una cuenta con ese correo.';
      case 'weak_password':
        return 'La contraseña es demasiado débil.';
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
      default:
        return error.message || 'No se ha podido completar la operación.';
    }
  }
}
