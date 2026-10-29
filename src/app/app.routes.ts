import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeRedirectGuard, roleGuard } from './core/auth/auth.guards';

/**
 * Rutas de la aplicación. Todas las páginas se cargan de forma diferida
 * (lazy loading) y están protegidas según el rol del usuario.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canMatch: [homeRedirectGuard],
    children: [],
  },
  {
    path: 'login',
    title: 'Iniciar sesión · Gestión DI',
    canMatch: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Gestión DI',
    canMatch: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'panel',
    title: 'Panel de control · Gestión DI',
    canMatch: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'productos',
    title: 'Productos · Gestión DI',
    canMatch: [authGuard],
    loadComponent: () => import('./pages/products/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'productos/nuevo',
    title: 'Nuevo producto · Gestión DI',
    canMatch: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/product-form/product-form.page').then((m) => m.ProductFormPage),
  },
  {
    path: 'productos/:id/editar',
    title: 'Editar producto · Gestión DI',
    canMatch: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/product-form/product-form.page').then((m) => m.ProductFormPage),
  },
  {
    path: 'movimientos',
    title: 'Movimientos · Gestión DI',
    canMatch: [authGuard],
    loadComponent: () => import('./pages/movements/movements.page').then((m) => m.MovementsPage),
  },
  {
    path: 'ayuda',
    title: 'Ayuda · Gestión DI',
    loadComponent: () => import('./pages/help/help.page').then((m) => m.HelpPage),
  },
  {
    path: 'no-autorizado',
    title: 'Acceso denegado · Gestión DI',
    loadComponent: () => import('./pages/status/unauthorized.page').then((m) => m.UnauthorizedPage),
  },
  {
    path: '**',
    title: 'Página no encontrada · Gestión DI',
    loadComponent: () => import('./pages/status/not-found.page').then((m) => m.NotFoundPage),
  },
];
