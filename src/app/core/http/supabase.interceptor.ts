import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';

/** Error de la API ya traducido a un mensaje comprensible para el usuario. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Traduce los errores de PostgREST / red a mensajes en castellano. */
export function toApiError(error: HttpErrorResponse): ApiError {
  const body = error.error as { message?: string; code?: string } | null;
  if (error.status === 0) {
    return new ApiError('No hay conexión con el servidor. Revisa tu conexión a internet.', 0);
  }
  if (body?.code === '23505') {
    return new ApiError('Ya existe un registro con ese valor único (por ejemplo, el SKU).', error.status);
  }
  if (body?.code === '42501' || error.status === 403) {
    return new ApiError('No tienes permisos para realizar esta operación.', error.status);
  }
  if (error.status === 401) {
    return new ApiError('Tu sesión ha caducado. Vuelve a iniciar sesión.', 401);
  }
  return new ApiError(body?.message ?? 'Se ha producido un error inesperado.', error.status);
}

/**
 * Interceptor HTTP para la API REST de Supabase:
 *  1. Añade la clave pública (`apikey`) y el JWT del usuario (`Authorization: Bearer`).
 *  2. Normaliza los errores y, si el token ha caducado (401), cierra la sesión.
 */
export const supabaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.supabaseUrl || !req.url.startsWith(environment.supabaseUrl)) {
    return next(req);
  }

  const auth = inject(AuthStore);
  const router = inject(Router);
  const token = auth.accessToken() ?? environment.supabaseAnonKey;

  const authorized = req.clone({
    setHeaders: {
      apikey: environment.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.isAuthenticated()) {
        void auth.logout().then(() => router.navigate(['/login'], { queryParams: { caducada: 1 } }));
      }
      return throwError(() => toApiError(error));
    }),
  );
};
