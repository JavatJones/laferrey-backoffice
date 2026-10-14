-- Ferreterías, cuentas y membresías (RN-01 a RN-08).
-- Los permisos se otorgan de forma explícita: no dependemos de que la Data API
-- exponga automáticamente las tablas nuevas.

-- Esquema no expuesto por la Data API, para funciones privilegiadas y de triggers.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.member_role as enum ('owner', 'staff');

-- Trigger genérico de updated_at.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- Ferreterías
-- ---------------------------------------------------------------------------
create table public.hardware_stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  -- Exactamente como en Shopify (RN-01).
  shopify_vendor text not null check (btrim(shopify_vendor) <> ''),
  -- RN-02: ignora mayúsculas y espacios sobrantes. Debe coincidir con normalizeVendor()
  -- en src/lib/shopify/vendor.ts.
  shopify_vendor_key text generated always as (
    lower(btrim(regexp_replace(shopify_vendor, '[ \t\n\r\f\v]+', ' ', 'g')))
  ) stored unique,
  -- GID de la sucursal de Shopify (RN-03).
  shopify_location_id text check (shopify_location_id ~ '^gid://shopify/Location/[0-9]+$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hardware_stores_set_updated_at
  before update on public.hardware_stores
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  -- RN-07: quien entra con contraseña temporal debe cambiarla antes de usar el panel.
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Crea el perfil de cada cuenta nueva. SECURITY DEFINER porque el trigger corre
-- con el rol de Auth, que no tiene permisos sobre public.profiles.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Membresías
-- ---------------------------------------------------------------------------
create table public.hardware_store_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  hardware_store_id uuid not null references public.hardware_stores (id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (user_id, hardware_store_id),
  -- RN-04: por ahora una cuenta pertenece a una sola ferretería. Para permitir
  -- varias, basta con quitar esta restricción.
  constraint hardware_store_members_one_store_per_user unique (user_id)
);

create index hardware_store_members_hardware_store_id_idx
  on public.hardware_store_members (hardware_store_id);

-- Ferreterías de la cuenta actual. SECURITY DEFINER para no depender del RLS de
-- hardware_store_members (evita recursión en las políticas). Vive en `private`,
-- así que la Data API no la expone.
create function private.current_user_store_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.hardware_store_id
  from public.hardware_store_members m
  where m.user_id = (select auth.uid())
$$;
revoke all on function private.current_user_store_ids() from public;
grant execute on function private.current_user_store_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS y permisos
-- ---------------------------------------------------------------------------
alter table public.hardware_stores enable row level security;
alter table public.profiles enable row level security;
alter table public.hardware_store_members enable row level security;

create policy "store members can read their store" on public.hardware_stores
  for select to authenticated
  using (id in (select private.current_user_store_ids()));

create policy "users can read their own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "users can read their own memberships" on public.hardware_store_members
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.hardware_stores, public.profiles, public.hardware_store_members
  from anon, authenticated;
grant select on public.hardware_stores, public.profiles, public.hardware_store_members
  to authenticated;
grant select, insert, update, delete
  on public.hardware_stores, public.profiles, public.hardware_store_members
  to service_role;
