import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { Role } from '../../models';
import { AuthStore } from './auth.store';

function currentUrl(segments: UrlSegment[]): string {
  return '/' + segments.map((s) => s.path).join('/');
}

/**
 * Solo deja pasar a usuarios autenticados; si no, redirige a `/login`
 * guardando la ruta solicitada para volver después.
 *
 * Se usa `canMatch` para que el código de la página (lazy loading) ni siquiera
 * se descargue si el usuario no tiene acceso.
 */
export const authGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.whenReady();
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { redirect: currentUrl(segments) } });
};

/**
 * Restringe la ruta a los roles indicados en `data.roles`.
 * Ejemplo: `{ canMatch: [roleGuard], data: { roles: ['admin'] } }`.
 */
export const roleGuard: CanMatchFn = async (route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: currentUrl(segments) } });
  }
  const allowed = (route.data?.['roles'] as Role[] | undefined) ?? [];
  const role = auth.role();
  return role && allowed.includes(role) ? true : router.createUrlTree(['/no-autorizado']);
};

/** Para las páginas de login/registro: si ya hay sesión, lleva al inicio. */
export const guestGuard: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.whenReady();
  return auth.isAuthenticated() ? router.createUrlTree([auth.homeUrl()]) : true;
};

/** Redirige la ruta raíz al inicio que corresponde a cada rol. */
export const homeRedirectGuard: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.whenReady();
  return router.createUrlTree([auth.isAuthenticated() ? auth.homeUrl() : '/login']);
};
