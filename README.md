# Gestión DI · Sistema de gestión de inventario multiplataforma

Aplicación híbrida/PWA de gestión de inventario hecha con **Ionic 9 + Angular 22** y **Supabase** (PostgreSQL, Auth y Realtime).

Es el proyecto individual del módulo **Desarrollo de Interfaces (0488)**, del CFGS en Desarrollo de Aplicaciones Multiplataforma.

- 📱 **Aplicación en producción:** https://gestion-di-inventario.vercel.app
- 📚 **Documentación técnica (Compodoc):** https://gestion-di-inventario.vercel.app/docs/
- 📖 **Manual de usuario:** [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md), también integrado en la app (menú **Ayuda**)

---

## Funcionalidades

| Fase | Qué incluye | Dónde está |
| --- | --- | --- |
| **1. Enrutamiento y formularios** (RA 1, RA 2) | Menú lateral, rutas *lazy*, guards `canMatch` por rol (Administrador / Usuario estándar), interceptor HTTP con JWT, formularios reactivos, validación asíncrona del correo y del SKU, *two-way binding* (`[(ngModel)]`, `[(search)]`) | `src/app/app.routes.ts`, `core/auth`, `core/http`, `pages/auth`, `pages/product-form` |
| **2. Componentes** (RA 3) | `app-data-table` (buscador, ordenación y paginación), `app-stat-card` (KPI) y `app-chart` (Chart.js). Reciben datos con `input()`/`model()` y emiten eventos con `output()` | `src/app/shared/components` |
| **3. Datos e informes** (RA 5) | API REST **SQL** (PostgREST) con `HttpClient`/RxJS, colección **NoSQL** JSONB en tiempo real con Supabase Realtime, *dashboard* con `forkJoin`, filtros en vivo y gráficos interactivos, exportación **PDF** (jsPDF) y **CSV** | `core/services`, `pages/dashboard`, `pages/movements` |
| **4. Usabilidad y accesibilidad** (RA 4) | Mobile-first con Grid/Flexbox, contraste AA en modo claro y oscuro, zoom permitido, *skip link*, foco visible, `aria-*`, tablas alternativas para gráficos, `prefers-reduced-motion` | `src/global.scss`, `src/theme/variables.scss` |
| **5. Documentación y despliegue** (RA 6, RA 7) | Git Flow (`main`, `develop`, `feature/*`), CI en GitHub Actions, Compodoc, PWA (service worker + manifest) y despliegue en Vercel bloqueado si fallan los tests | `.github/workflows/ci.yml`, `vercel.json` |

## Arquitectura

La aplicación sigue el patrón **MVVM** de Angular: las plantillas son la vista, los componentes con *signals* hacen de *view-model* y los servicios forman el modelo y el acceso a datos.

```
src/app/
├── core/
│   ├── auth/          AuthStore (estado global con signals) y guards por rol
│   ├── http/          Interceptor: apikey + JWT, gestión de errores y 401
│   ├── services/      InventoryApi (SQL/REST), StockEvents (NoSQL/Realtime), Export, Notification
│   ├── supabase/      Cliente único de Supabase
│   └── validators/    Validadores síncronos y asíncronos reutilizables
├── models/            Interfaces del dominio
├── pages/             Vistas cargadas con lazy loading
└── shared/
    └── components/    data-table, stat-card, chart (agnósticos y reutilizables)
```

**Seguridad:** las rutas se protegen en el cliente con guards, pero la protección real está en el servidor. Las políticas *Row Level Security* de PostgreSQL impiden que un usuario estándar modifique productos o se asigne el rol de administrador, aunque manipule el código del navegador. El stock lo actualiza un *trigger* en la base de datos.

## Puesta en marcha en local

Requisitos: Node.js 24 o superior y un proyecto de [Supabase](https://supabase.com).

1. **Base de datos:** en Supabase, abre **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Se crean las tablas, las políticas RLS, los triggers, la publicación Realtime y los datos sintéticos.
2. **Usuarios de prueba:** en **Authentication → Users → Add user → Create new user**, crea dos usuarios marcando **Auto Confirm User**:
   - uno para el administrador (por ejemplo `admin@gestiondi.test`)
   - uno para el usuario estándar (por ejemplo `usuario@gestiondi.test`)

   Después ejecuta en el SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@gestiondi.test';
   ```
3. **Variables de entorno:** copia `.env.example` como `.env` y rellena `SUPABASE_URL` y `SUPABASE_ANON_KEY` (**Project Settings → API**). Usa solo la clave pública *anon/publishable*, nunca la `service_role`. El fichero `.env` no se sube a Git.
4. **Instalar y arrancar:**
   ```bash
   npm install
   npm start
   ```
   Abre <http://localhost:4200>.

> Las contraseñas de prueba **no** están en el repositorio a propósito, para no exponer credenciales en texto plano. Se entregan en el PDF de la actividad.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npm run build` | Build de producción en `www/` (PWA con service worker) |
| `npm run test:ci` | Tests unitarios (Vitest) |
| `npm run lint` | ESLint |
| `npm run docs` | Documentación técnica con Compodoc en `docs/tecnica/` |
| `npm run docs:serve` | Sirve la documentación en local |
| `npm run vercel-build` | Tests, build y documentación (es lo que ejecuta Vercel) |

## Flujo de trabajo con Git (Git Flow)

- `main`: versiones estables que se despliegan en producción.
- `develop`: integración de las nuevas funcionalidades.
- `feature/*`: una rama por funcionalidad, que se integra en `develop` con *merge* `--no-ff` o *Pull Request*.

Ramas utilizadas: `feature/supabase-setup`, `feature/auth-routing`, `feature/componentes-visuales`, `feature/datos-dashboard-informes`, `feature/accesibilidad-ayuda`, `feature/tests-unitarios` y `feature/pwa-ci-despliegue`.

## Despliegue en Vercel

1. Sube el repositorio a GitHub (con las ramas `main` y `develop`).
2. En Vercel: **Add New → Project → Import** el repositorio. La configuración se lee de `vercel.json`.
3. En **Settings → Environment Variables**, añade `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
4. Cada *push* a `main` se despliega en producción y cada rama o PR genera una *preview*. El build ejecuta antes los tests, así que **si un test falla no se despliega**.
5. En Supabase, en **Authentication → URL Configuration**, añade la URL de Vercel como *Site URL*.

Para el CI de GitHub Actions, añade también `SUPABASE_URL` y `SUPABASE_ANON_KEY` en **Settings → Secrets and variables → Actions**.

## Datos de prueba

Todos los productos, categorías y movimientos son **datos sintéticos** inventados para la demostración. No hay datos personales reales de terceros.
