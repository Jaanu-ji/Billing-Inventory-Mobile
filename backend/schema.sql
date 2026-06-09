-- ============================================================================
-- DUKAAN Bill App — Supabase (Postgres) cloud schema.  Phase J (wiring).
-- ============================================================================
-- This MIRRORS the on-device SQLite tables (frontend/src/db/schema.ts, migrations
-- v1–v17) so Phase K can push/pull rows. It is REFERENCE for the cloud project —
-- the app never runs this; apply it once in the Supabase SQL editor.
--
-- Design notes
--  * Every row is owned by a shopkeeper: `user_id text` = the auth uid (Firebase
--    uid, carried in the JWT `sub`). RLS restricts every row to its owner.
--  * `id bigint` is the DEVICE's local row id; primary key is (user_id, id) so a
--    device row maps 1:1 to its cloud row. Inserts/updates from the device are
--    UPSERTs on (user_id, id).
--  * `updated_at timestamptz` powers Phase K's last-write-wins conflict rule.
--  * Money = numeric; epoch-millis timestamps mirror SQLite as bigint; JSON blobs
--    (product/bill-item attributes, parked cart) = jsonb; flags = boolean.
--  * Phase K only — there is NO sync logic yet.
--
-- Firebase Auth note: this app authenticates with Firebase, not Supabase Auth.
-- Wire a Supabase third-party/JWT integration so requests carry a Firebase JWT;
-- then `auth.jwt() ->> 'sub'` is the Firebase uid used by the policies below.
-- ============================================================================

-- Helper: the current request's owner id (Firebase uid from the JWT).
create or replace function dukaan_uid() returns text
  language sql stable as $$ select auth.jwt() ->> 'sub' $$;

-- ---------------------------------------------------------------------------
-- shop_profile  (SQLite: single row per device → one row per user in cloud)
-- ---------------------------------------------------------------------------
create table if not exists shop_profile (
  user_id        text   not null,
  id             bigint not null,
  shop_type      text   not null,
  shop_name      text   not null,
  phone          text   not null,
  address        text,
  gst_enabled    boolean not null default false,
  gstin          text,
  state          text,
  state_code     text,
  business_mode  text   not null default 'product',
  billing_mode   text,
  default_unit   text,
  created_at     bigint not null,
  device_updated_at bigint not null,
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists products (
  user_id     text   not null,
  id          bigint not null,
  barcode     text   not null,
  name        text   not null,
  price       numeric not null,
  gst_rate    numeric not null default 0,
  hsn_code    text,
  unit        text   not null default 'pcs',
  category    text,
  attributes  jsonb,
  created_at  bigint not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, barcode)
);

-- ---------------------------------------------------------------------------
-- manual_items  (reusable no-barcode goods)
-- ---------------------------------------------------------------------------
create table if not exists manual_items (
  user_id     text   not null,
  id          bigint not null,
  name        text   not null,
  price       numeric not null,
  hsn_code    text,
  gst_rate    numeric not null default 0,
  unit        text   not null default 'pcs',
  created_at  bigint not null,
  device_updated_at bigint not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- services  (saved services)
-- ---------------------------------------------------------------------------
create table if not exists services (
  user_id     text   not null,
  id          bigint not null,
  name        text   not null,
  price       numeric not null,
  sac_code    text,
  gst_rate    numeric not null default 0,
  created_at  bigint not null,
  device_updated_at bigint not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- customers  (udhaar ledger)
-- ---------------------------------------------------------------------------
create table if not exists customers (
  user_id     text   not null,
  id          bigint not null,
  name        text   not null,
  phone       text   not null,
  created_at  bigint not null,
  device_updated_at bigint not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- bills
-- ---------------------------------------------------------------------------
create table if not exists bills (
  user_id            text   not null,
  id                 bigint not null,
  bill_number        bigint not null,
  customer_name      text,
  customer_phone     text,
  subtotal           numeric not null,
  total              numeric not null,
  bill_type          text   not null default 'simple',
  customer_gstin     text,
  customer_state     text,
  customer_state_code text,
  is_inter_state     boolean not null default false,
  cgst               numeric not null default 0,
  sgst               numeric not null default 0,
  igst               numeric not null default 0,
  discount           numeric not null default 0,
  round_off          numeric not null default 0,
  payment_status     text   not null default 'paid',
  payment_mode       text,
  customer_id        bigint,
  created_at         bigint not null,
  updated_at         timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, bill_number)
);

-- ---------------------------------------------------------------------------
-- bill_items  (snapshots; cascade with their bill)
-- ---------------------------------------------------------------------------
create table if not exists bill_items (
  user_id     text   not null,
  id          bigint not null,
  bill_id     bigint not null,
  product_id  bigint,
  item_kind   text   not null default 'product',
  name        text   not null,
  price       numeric not null,
  quantity    numeric not null,
  unit        text   not null default 'pcs',
  line_total  numeric not null,
  gst_rate    numeric not null default 0,
  hsn_code    text,
  sac_code    text,
  gst_amount  numeric not null default 0,
  attributes  jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, bill_id) references bills (user_id, id) on delete cascade
);
create index if not exists idx_bill_items_bill on bill_items (user_id, bill_id);

-- ---------------------------------------------------------------------------
-- parked_bills  (held carts as JSON)
-- ---------------------------------------------------------------------------
create table if not exists parked_bills (
  user_id     text   not null,
  id          bigint not null,
  label       text   not null,
  item_count  numeric not null,
  total       numeric not null,
  items_json  jsonb  not null,
  created_at  bigint not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- ============================================================================
-- Row-Level Security: a shopkeeper can only see/modify their own rows.
-- (auth uid comes from the Firebase JWT — see dukaan_uid() above.)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'shop_profile','products','manual_items','services',
    'customers','bills','bill_items','parked_bills'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      create policy %1$I_owner on %1$I
        for all
        using (user_id = dukaan_uid())
        with check (user_id = dukaan_uid());
    $f$, t);
  end loop;
end $$;
