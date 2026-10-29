import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { Role } from '../../models';
import { authGuard, guestGuard, roleGuard } from './auth.guards';
import { AuthStore } from './auth.store';

function setup(role: Role | null) {
  const current = signal(role);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthStore,
        useValue: {
          whenReady: () => Promise.resolve(),
          role: computed(() => current()),
          isAuthenticated: computed(() => current() !== null),
          homeUrl: () => (current() === 'admin' ? '/panel' : '/productos'),
        },
      },
    ],
  });
  return TestBed.inject(Router);
}

const segments = [new UrlSegment('panel', {})];
const adminRoute: Route = { path: 'panel', data: { roles: ['admin'] } };

function run(guard: typeof authGuard, route: Route = {}) {
  return TestBed.runInInjectionContext(() => guard(route, segments, {} as Parameters<typeof authGuard>[2])) as Promise<boolean | UrlTree>;
}

describe('Guards de autenticación', () => {
  it('authGuard redirige al login (con la ruta de vuelta) si no hay sesión', async () => {
    const router = setup(null);
    const result = await run(authGuard);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?redirect=%2Fpanel');
  });

  it('authGuard deja pasar a un usuario autenticado', async () => {
    setup('user');
    expect(await run(authGuard)).toBe(true);
  });

  it('roleGuard bloquea a un usuario estándar en una ruta de administrador', async () => {
    const router = setup('user');
    const result = await run(roleGuard, adminRoute);
    expect(router.serializeUrl(result as UrlTree)).toBe('/no-autorizado');
  });

  it('roleGuard permite el acceso al administrador', async () => {
    setup('admin');
    expect(await run(roleGuard, adminRoute)).toBe(true);
  });

  it('guestGuard envía al inicio de su rol a quien ya ha iniciado sesión', async () => {
    const router = setup('admin');
    const result = await run(guestGuard);
    expect(router.serializeUrl(result as UrlTree)).toBe('/panel');
  });
});
