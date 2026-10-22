-- Migration: Create core tables for multi-tenant ContaBar
-- This migration defines tables, indices, and RLS policies for the first version.
-- WARNING: do NOT execute this file directly without verifying your Supabase project.

-- 1. Bars (tenants)
CREATE TABLE public.bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Memberships linking users to bars and roles
CREATE TABLE public.bar_memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  bar_id uuid NOT NULL REFERENCES public.bars(id),
  role text NOT NULL CHECK (role IN ('admin','waiter','cumim')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bar_id)
);

-- 3. Areas (salões) within a bar
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id),
  name text NOT NULL
);

-- 4. Tables (mesas) belonging to an area
CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id),
  area_id uuid NOT NULL REFERENCES public.areas(id),
  number int NOT NULL,
  pos_x int NOT NULL CHECK (pos_x BETWEEN 0 AND 100),
  pos_y int NOT NULL CHECK (pos_y BETWEEN 0 AND 100)
);

-- 5. Persons sitting at a table
CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.tables(id),
  chair_number int NOT NULL,
  name text
);

-- 6. Comandas (orders) per person
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id),
  area_id uuid NOT NULL REFERENCES public.areas(id),
  table_id uuid NOT NULL REFERENCES public.tables(id),
  person_id uuid NOT NULL REFERENCES public.persons(id),
  waiter_id uuid NOT NULL REFERENCES public.bar_memberships(user_id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid
);

-- 7. Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity int NOT NULL,
  unit_price_cents int NOT NULL,
  total_cents int NOT NULL,
  destination text NOT NULL CHECK (destination IN ('avista','conta')),
  waiter_id uuid NOT NULL REFERENCES public.bar_memberships(user_id),
  location_note text,
  type text NOT NULL CHECK (type IN ('item','cancellation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  canceled_at timestamptz,
  canceled_by uuid,
  canceled_reason text,
  source text CHECK (source IN ('customer_request','team_request'))
);

-- 8. Products catalog
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id),
  name text NOT NULL,
  price_cents int NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- 9. Receipts (payments)
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity int NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('dinheiro','pix','cartao','outro')),
  value_cents int NOT NULL,
  waiter_id uuid NOT NULL REFERENCES public.bar_memberships(user_id),
  paid_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Turns (cash drawer opens)
CREATE TABLE public.turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id),
  opening_cash_cents int NOT NULL,
  opened_by uuid NOT NULL REFERENCES public.bar_memberships(user_id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid,
  closed_at timestamptz
);

-- 11. Turn closures (by payment method)
CREATE TABLE public.turn_closures (
  turn_id uuid NOT NULL REFERENCES public.turns(id),
  payment_method text NOT NULL CHECK (payment_method IN ('dinheiro','pix','cartao','outro')),
  expected_cents int NOT NULL,
  counted_cents int NOT NULL,
  difference_cents int NOT NULL,
  PRIMARY KEY (turn_id, payment_method)
);

-- 12. Movements (supply/withdrawal)
CREATE TABLE public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id uuid NOT NULL REFERENCES public.turns(id),
  type text NOT NULL CHECK (type IN ('supply','withdrawal')),
  value_cents int NOT NULL,
  reason text NOT NULL,
  recorded_by uuid NOT NULL REFERENCES public.bar_memberships(user_id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Enable RLS on relevant tables
ALTER TABLE public.bar_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turn_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- 14. RLS: bar_memberships (always visible)
CREATE POLICY sp_bar_memberships_select ON public.bar_memberships
  USING (TRUE);

-- 15. RLS: bars (visible only if member of bar)
CREATE POLICY sp_bars_select ON public.bars
  USING (id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid()));

-- 16. RLS: areas, tables, persons (restrict to bar)
CREATE POLICY sp_areas_select ON public.areas
  USING (bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid()));
CREATE POLICY sp_tables_select ON public.tables
  USING (bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid()));
CREATE POLICY sp_persons_select ON public.persons
  USING (EXISTS (SELECT 1 FROM public.tables t
                 WHERE t.id = tables.id
                   AND t.bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid())));

-- 17. RLS: orders (restrict to user's bar and optionally to their waiters)
CREATE POLICY sp_orders_select ON public.orders
  USING (bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid()));

-- 18. RLS: order_items (only within permitted orders)
CREATE POLICY sp_order_items_select ON public.order_items
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = order_id
                   AND o.bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid())));

-- 19. RLS: products (only within user's bar)
CREATE POLICY sp_products_select ON public.products
  USING (bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid()));

-- 20. RLS: receipts (only within user's bar)
CREATE POLICY sp_receipts_select ON public.receipts
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = order_id
                   AND o.bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid())));

-- 21. RLS: turns (only within user's bar)
CREATE POLICY sp_turns_select ON public.turns
  USING (bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid()));

-- 22. RLS: turn_closures (only within user's bar)
CREATE POLICY sp_turn_closures_select ON public.turn_closures
  USING (EXISTS (SELECT 1 FROM public.turns t
                 WHERE t.id = turn_id
                   AND t.bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid())));

-- 23. RLS: movements (only within user's bar)
CREATE POLICY sp_movements_select ON public.movements
  USING (EXISTS (SELECT 1 FROM public.turns t
                 WHERE t.id = turn_id
                   AND t.bar_id = ANY (SELECT bar_id FROM public.bar_memberships WHERE user_id = auth.uid())));

-- Note: Insert, Update, Delete policies would follow similar patterns
-- and should be restricted to admin role where appropriate.
