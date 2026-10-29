-- =============================================================================
-- Gestión DI · Esquema de base de datos para Supabase
-- -----------------------------------------------------------------------------
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run.
-- Es idempotente: se puede volver a ejecutar sin errores.
--
--  * SQL relacional  -> categories, products (consumidas vía API REST / PostgREST)
--  * NoSQL documental -> stock_events (documentos JSONB + Supabase Realtime)
--  * Roles           -> profiles.role ('admin' | 'user') + Row Level Security
--
-- Todos los datos de ejemplo son SINTÉTICOS (no contienen datos personales reales).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Perfiles y roles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  role        text not null default 'user' check (role in ('admin', 'user')),
  created_at  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse un usuario (rol 'user' por defecto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿El usuario autenticado es administrador? (se usa en las políticas RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Validación asíncrona del registro: ¿existe ya ese correo?
-- Solo devuelve true/false, nunca datos del usuario.
create or replace function public.email_exists(p_email text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where lower(email) = lower(trim(p_email)));
$$;

grant execute on function public.email_exists(text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Modelo relacional (SQL): categorías y productos
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id    bigint generated always as identity primary key,
  name  text not null unique
);

create table if not exists public.products (
  id           bigint generated always as identity primary key,
  sku          text not null unique check (sku ~ '^[A-Z]{3}-[0-9]{3,5}$'),
  name         text not null check (char_length(name) between 2 and 80),
  category_id  bigint not null references public.categories (id),
  stock        integer not null default 0 check (stock >= 0),
  min_stock    integer not null default 5 check (min_stock >= 0),
  price        numeric(10, 2) not null default 0 check (price >= 0),
  updated_at   timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Modelo documental (NoSQL): movimientos de stock como documentos JSONB
--    Ejemplo de documento:
--    { "type": "salida", "sku": "ELE-001", "quantity": 3,
--      "comment": "Pedido tienda centro", "author": "Ana (usuario)" }
-- ---------------------------------------------------------------------------
create table if not exists public.stock_events (
  id          uuid primary key default gen_random_uuid(),
  doc         jsonb not null check (
                doc ? 'type' and doc ->> 'type' in ('entrada', 'salida', 'nota')
              ),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists stock_events_created_idx on public.stock_events (created_at desc);

-- Aplica cada movimiento al stock del producto (en el servidor, no desde el cliente).
create or replace function public.apply_stock_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  qty    integer := coalesce((new.doc ->> 'quantity')::integer, 0);
  delta  integer;
begin
  if new.doc ->> 'type' = 'nota' then
    return new;
  end if;

  if qty <= 0 then
    raise exception 'La cantidad debe ser mayor que 0';
  end if;

  delta := case when new.doc ->> 'type' = 'entrada' then qty else -qty end;

  update public.products
     set stock = stock + delta
   where sku = new.doc ->> 'sku';

  if not found then
    raise exception 'No existe ningún producto con SKU %', new.doc ->> 'sku';
  end if;

  return new;
exception
  when check_violation then
    raise exception 'Stock insuficiente para el producto %', new.doc ->> 'sku';
end;
$$;

drop trigger if exists stock_events_apply on public.stock_events;
create trigger stock_events_apply
  before insert on public.stock_events
  for each row execute function public.apply_stock_event();

-- Publicar la colección en Supabase Realtime (equivalente a un listener de Firestore).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stock_events'
  ) then
    alter publication supabase_realtime add table public.stock_events;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security (la seguridad real no depende del cliente)
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.products     enable row level security;
alter table public.stock_events enable row level security;

drop policy if exists "profiles: leer el propio o admin" on public.profiles;
create policy "profiles: leer el propio o admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: solo admin modifica" on public.profiles;
create policy "profiles: solo admin modifica" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories: lectura autenticados" on public.categories;
create policy "categories: lectura autenticados" on public.categories
  for select to authenticated using (true);

drop policy if exists "categories: escritura admin" on public.categories;
create policy "categories: escritura admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products: lectura autenticados" on public.products;
create policy "products: lectura autenticados" on public.products
  for select to authenticated using (true);

drop policy if exists "products: escritura admin" on public.products;
create policy "products: escritura admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stock_events: lectura autenticados" on public.stock_events;
create policy "stock_events: lectura autenticados" on public.stock_events
  for select to authenticated using (true);

drop policy if exists "stock_events: alta propia" on public.stock_events;
create policy "stock_events: alta propia" on public.stock_events
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "stock_events: borrado admin" on public.stock_events;
create policy "stock_events: borrado admin" on public.stock_events
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Datos sintéticos de ejemplo
-- ---------------------------------------------------------------------------
insert into public.categories (name) values
  ('Electrónica'), ('Oficina'), ('Mobiliario'), ('Limpieza'), ('Herramientas'), ('Embalaje')
on conflict (name) do nothing;

insert into public.products (sku, name, category_id, stock, min_stock, price)
select v.sku, v.name, c.id, v.stock, v.min_stock, v.price
from (values
  ('ELE-001', 'Monitor 24 pulgadas',        'Electrónica',  18,  5, 139.90),
  ('ELE-002', 'Teclado inalámbrico',        'Electrónica',  42, 10,  29.95),
  ('ELE-003', 'Ratón ergonómico',           'Electrónica',   4, 10,  24.50),
  ('ELE-004', 'Cable HDMI 2 m',             'Electrónica', 120, 25,   6.90),
  ('ELE-005', 'Auriculares con micrófono',  'Electrónica',  15,  8,  39.00),
  ('OFI-001', 'Paquete folios A4 (500)',    'Oficina',     300, 50,   4.25),
  ('OFI-002', 'Bolígrafos azules (50 u.)',  'Oficina',      35, 10,  12.40),
  ('OFI-003', 'Grapadora metálica',         'Oficina',       7,  5,   9.80),
  ('OFI-004', 'Archivador A-Z',             'Oficina',      60, 20,   3.60),
  ('MOB-001', 'Silla de oficina',           'Mobiliario',   12,  4, 159.00),
  ('MOB-002', 'Mesa regulable',             'Mobiliario',    3,  2, 389.00),
  ('MOB-003', 'Estantería metálica',        'Mobiliario',    9,  3,  74.90),
  ('LIM-001', 'Gel hidroalcohólico 1 L',    'Limpieza',     80, 20,   5.50),
  ('LIM-002', 'Bayetas microfibra (10 u.)', 'Limpieza',      2, 15,   7.20),
  ('LIM-003', 'Bolsas de basura (100 u.)',  'Limpieza',     45, 15,   8.90),
  ('HER-001', 'Taladro percutor',           'Herramientas',  6,  2,  89.00),
  ('HER-002', 'Juego de destornilladores',  'Herramientas', 22,  5,  19.90),
  ('HER-003', 'Cinta métrica 5 m',          'Herramientas', 30, 10,   6.40),
  ('EMB-001', 'Caja cartón 40x30x30',       'Embalaje',    500, 100,  1.15),
  ('EMB-002', 'Cinta adhesiva precinto',    'Embalaje',    150, 40,   1.90),
  ('EMB-003', 'Plástico de burbujas 10 m',  'Embalaje',     11, 15,  14.75)
) as v(sku, name, category, stock, min_stock, price)
join public.categories c on c.name = v.category
on conflict (sku) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Asignar el rol de administrador (ejecutar DESPUÉS de crear el usuario)
-- ---------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'admin@gestiondi.test';
