/*
# Restaurant POS System - Complete Schema

## Overview
Creates the full database schema for a restaurant Point-of-Sale system supporting
dine-in, takeaway, and delivery channels with shift management, kitchen display,
role-based staff access, and historical reporting.

## New Tables

1. **staff** - Restaurant employees with PIN-based login and 4 roles
   - id, name, role (admin/cashier/waiter/kitchen), pin (4-6 digit), active, created_at

2. **categories** - Menu categories (e.g. Burgers, Drinks, Desserts)
   - id, name_ar, name_fr, sort_order, active

3. **menu_items** - Individual dishes/items with sold-out toggle
   - id, category_id, name_ar, name_fr, price, description_ar, description_fr, active, sort_order

4. **modifiers** - Paid add-ons or free notes for menu items
   - id, menu_item_id, name_ar, name_fr, price, active

5. **restaurant_tables** - Physical dining tables
   - id, name, seats, active

6. **shifts** - Work shifts with opening/closing cash and Z-report data
   - id, status, opening_cash, closing_cash, expected_cash, total_sales,
     total_dine_in, total_takeaway, total_delivery, orders_count,
     opened_by, opened_by_name, closed_by, closed_by_name, opened_at, closed_at, notes

7. **orders** - Customer orders across 3 channels
   - id, type (dine_in/takeaway/delivery), table_id, table_name,
     customer_name, customer_phone, delivery_address,
     status (pending/preparing/ready/completed/cancelled),
     payment_status (unpaid/paid), payment_method (cash/card),
     subtotal, total, shift_id, staff_id, staff_name, notes, created_at, completed_at

8. **order_items** - Individual line items within an order
   - id, order_id, menu_item_id, name_ar, name_fr, price, quantity, notes,
     modifiers (jsonb array of {name, price}), status (pending/preparing/ready)

9. **settings** - Key-value store for restaurant configuration
   - id, key (unique), value (jsonb)

## Security
- RLS enabled on ALL tables.
- Single-tenant app with PIN-based staff login (no Supabase auth) →
  all policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally shared within the single restaurant.
*/

-- ============ STAFF ============
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin','cashier','waiter','kitchen')),
  pin text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_staff" ON staff;
CREATE POLICY "anon_crud_staff" ON staff FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_staff" ON staff FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_staff" ON staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_staff" ON staff FOR DELETE TO anon, authenticated USING (true);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_cat" ON categories;
CREATE POLICY "anon_sel_cat" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_cat" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_cat" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_cat" ON categories FOR DELETE TO anon, authenticated USING (true);

-- ============ MENU ITEMS ============
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  description_ar text DEFAULT '',
  description_fr text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_mi" ON menu_items;
CREATE POLICY "anon_sel_mi" ON menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_mi" ON menu_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_mi" ON menu_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_mi" ON menu_items FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);

-- ============ MODIFIERS ============
CREATE TABLE IF NOT EXISTS modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_mod" ON modifiers;
CREATE POLICY "anon_sel_mod" ON modifiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_mod" ON modifiers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_mod" ON modifiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_mod" ON modifiers FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_modifiers_item ON modifiers(menu_item_id);

-- ============ RESTAURANT TABLES ============
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  seats int NOT NULL DEFAULT 4,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_rt" ON restaurant_tables;
CREATE POLICY "anon_sel_rt" ON restaurant_tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_rt" ON restaurant_tables FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_rt" ON restaurant_tables FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_rt" ON restaurant_tables FOR DELETE TO anon, authenticated USING (true);

-- ============ SHIFS ============
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_cash numeric(12,2) NOT NULL DEFAULT 0,
  closing_cash numeric(12,2) DEFAULT 0,
  expected_cash numeric(12,2) DEFAULT 0,
  total_sales numeric(12,2) DEFAULT 0,
  total_dine_in numeric(12,2) DEFAULT 0,
  total_takeaway numeric(12,2) DEFAULT 0,
  total_delivery numeric(12,2) DEFAULT 0,
  orders_count int DEFAULT 0,
  opened_by uuid,
  opened_by_name text,
  closed_by uuid,
  closed_by_name text,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  notes text DEFAULT ''
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_sh" ON shifts;
CREATE POLICY "anon_sel_sh" ON shifts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_sh" ON shifts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_sh" ON shifts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_sh" ON shifts FOR DELETE TO anon, authenticated USING (true);

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('dine_in','takeaway','delivery')),
  table_id uuid,
  table_name text DEFAULT '',
  customer_name text DEFAULT '',
  customer_phone text DEFAULT '',
  delivery_address text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','completed','cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  payment_method text CHECK (payment_method IN ('cash','card')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  staff_id uuid,
  staff_name text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_ord" ON orders;
CREATE POLICY "anon_sel_ord" ON orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_ord" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_ord" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_ord" ON orders FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============ ORDER ITEMS ============
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  notes text DEFAULT '',
  modifiers jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_oi" ON order_items;
CREATE POLICY "anon_sel_oi" ON order_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_oi" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_oi" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_oi" ON order_items FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============ SETTINGS ============
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sel_set" ON settings;
CREATE POLICY "anon_sel_set" ON settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_ins_set" ON settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_upd_set" ON settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_del_set" ON settings FOR DELETE TO anon, authenticated USING (true);

-- ============ SEED: Default admin ============
INSERT INTO staff (name, role, pin, active)
VALUES ('Admin', 'admin', '1234', true)
ON CONFLICT DO NOTHING;

-- ============ SEED: Default settings ============
INSERT INTO settings (key, value) VALUES
  ('restaurant', '{"name":"My Restaurant","phone":"","address":"","logo":""}'),
  ('license', '{"type":"none","key":"","activatedAt":null,"fingerprint":""}'),
  ('printers', '{"cashier":null,"kitchen":null,"bar":null}')
ON CONFLICT (key) DO NOTHING;
