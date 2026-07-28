-- ============================================================
-- Mini ERP + CRM Operations Portal - Database Schema
-- Run this in Supabase SQL Editor (or psql) BEFORE starting backend
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. USERS (Authentication + Roles)
-- ============================================================
create type user_role as enum ('admin', 'sales', 'warehouse', 'accounts');

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          varchar(120) not null,
  email         varchar(150) not null unique,
  password_hash text not null,
  role          user_role not null default 'sales',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 2. CUSTOMERS (CRM Module)
-- ============================================================
create type customer_type as enum ('Retail', 'Wholesale', 'Distributor');
create type customer_status as enum ('Lead', 'Active', 'Inactive');

create table if not exists customers (
  id              uuid primary key default gen_random_uuid(),
  customer_name   varchar(150) not null,
  mobile_number   varchar(20) not null,
  email           varchar(150),
  business_name   varchar(150),
  gst_number      varchar(20),
  customer_type   customer_type not null default 'Retail',
  address         text,
  status          customer_status not null default 'Lead',
  follow_up_date  date,
  notes           text,
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_customers_name on customers (customer_name);
create index if not exists idx_customers_mobile on customers (mobile_number);
create index if not exists idx_customers_status on customers (status);

-- Follow-up notes (a customer can have many follow-ups over time)
create table if not exists customer_followups (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers(id) on delete cascade,
  note         text not null,
  follow_up_date date,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 3. PRODUCTS + INVENTORY
-- ============================================================
create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  product_name        varchar(150) not null,
  sku                 varchar(60) not null unique,
  category            varchar(100),
  unit_price          numeric(12,2) not null default 0,
  current_stock       integer not null default 0,
  min_stock_alert_qty integer not null default 0,
  location            varchar(100),
  created_by          uuid references users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_products_sku on products (sku);
create index if not exists idx_products_name on products (product_name);

create type movement_type as enum ('IN', 'OUT');

create table if not exists stock_movements (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  quantity        integer not null,
  movement_type   movement_type not null,
  reason          varchar(255),
  created_by      uuid references users(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_stock_movements_product on stock_movements (product_id);

-- ============================================================
-- 4. SALES CHALLAN MODULE
-- ============================================================
create type challan_status as enum ('Draft', 'Confirmed', 'Cancelled');

create table if not exists challans (
  id              uuid primary key default gen_random_uuid(),
  challan_number  varchar(40) not null unique,
  customer_id     uuid not null references customers(id),
  total_quantity  integer not null default 0,
  status          challan_status not null default 'Draft',
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_challans_customer on challans (customer_id);
create index if not exists idx_challans_status on challans (status);

-- Challan items store a PRODUCT SNAPSHOT (not just product_id) as required
create table if not exists challan_items (
  id              uuid primary key default gen_random_uuid(),
  challan_id      uuid not null references challans(id) on delete cascade,
  product_id      uuid references products(id),
  product_name    varchar(150) not null,   -- snapshot
  sku             varchar(60) not null,    -- snapshot
  unit_price      numeric(12,2) not null,  -- snapshot
  quantity        integer not null check (quantity > 0),
  line_total      numeric(12,2) not null
);

create index if not exists idx_challan_items_challan on challan_items (challan_id);

-- ============================================================
-- 5. Sequence helper for human-readable challan numbers
-- ============================================================
create sequence if not exists challan_number_seq start 1;

-- RPC used by the backend to atomically get the next challan sequence number
create or replace function nextval_challan_seq()
returns bigint
language sql
as $$
  select nextval('challan_number_seq');
$$;

-- ============================================================
-- 6. Seed demo users (password for ALL = "Password@123")
-- Password hash generated with bcrypt (10 rounds) - see README
-- Replace hash below by running: node scripts/hashPassword.js
-- ============================================================
-- NOTE: Insert seed users via the backend seed script (npm run seed)
-- so the bcrypt hash matches your local bcrypt version exactly.
