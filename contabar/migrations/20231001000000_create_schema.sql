-- Conta Bar first-version schema.
-- This migration is prepared for review; do not apply it to a live project until
-- the schema and staging checks have been reviewed.

-- Tenants and team membership
CREATE TABLE public.bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  provisioning_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bar_memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('admin', 'waiter', 'cumim')),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bar_id)
);

CREATE TABLE public.bar_settings (
  bar_id uuid PRIMARY KEY REFERENCES public.bars(id) ON DELETE RESTRICT,
  fiado_active boolean NOT NULL DEFAULT false,
  waiter_sees_phone boolean NOT NULL DEFAULT false,
  waiter_sees_all_open_orders boolean NOT NULL DEFAULT true,
  waiter_can_create_customers boolean NOT NULL DEFAULT false,
  allow_cash_overpayment boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Salon, tables, people, catalogue and customers
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, bar_id)
);

CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  area_id uuid NOT NULL,
  number integer NOT NULL CHECK (number > 0),
  pos_x integer NOT NULL DEFAULT 50 CHECK (pos_x BETWEEN 0 AND 100),
  pos_y integer NOT NULL DEFAULT 50 CHECK (pos_y BETWEEN 0 AND 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, bar_id),
  UNIQUE (bar_id, area_id, number),
  FOREIGN KEY (area_id, bar_id) REFERENCES public.areas(id, bar_id) ON DELETE RESTRICT
);

CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  table_id uuid NOT NULL,
  chair_number integer NOT NULL CHECK (chair_number > 0),
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, bar_id),
  UNIQUE (table_id, chair_number),
  FOREIGN KEY (table_id, bar_id) REFERENCES public.tables(id, bar_id) ON DELETE RESTRICT
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, bar_id)
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  nickname text,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, bar_id)
);

-- Orders, immutable item entries and separate cancellation events
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  area_id uuid,
  table_id uuid,
  person_id uuid,
  customer_id uuid,
  label text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  waiter_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid,
  closed_at timestamptz,
  UNIQUE (id, bar_id),
  FOREIGN KEY (area_id, bar_id) REFERENCES public.areas(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (table_id, bar_id) REFERENCES public.tables(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (person_id, bar_id) REFERENCES public.persons(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id, bar_id) REFERENCES public.customers(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (waiter_id, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (opened_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (closed_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'open' AND closed_at IS NULL AND closed_by IS NULL)
    OR (status = 'closed' AND closed_at IS NOT NULL AND closed_by IS NOT NULL)
  ),
  CHECK (person_id IS NULL OR table_id IS NOT NULL)
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  customer_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  total_cents integer NOT NULL CHECK (total_cents = quantity * unit_price_cents),
  destination text NOT NULL CHECK (destination IN ('avista', 'conta')),
  location_note text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, bar_id),
  FOREIGN KEY (order_id, bar_id) REFERENCES public.orders(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id, bar_id) REFERENCES public.products(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id, bar_id) REFERENCES public.customers(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT,
  CHECK (destination <> 'conta' OR customer_id IS NOT NULL)
);

CREATE TABLE public.order_item_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  source text NOT NULL CHECK (source IN ('customer_request', 'team_request')),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (order_item_id, bar_id) REFERENCES public.order_items(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT
);

-- Cash sessions and an immutable financial ledger. Refunds are separate rows
-- linked to the original payment; they are not fiscal receipts.
CREATE TABLE public.turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  opening_cash_cents integer NOT NULL CHECK (opening_cash_cents >= 0),
  opened_by uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid,
  closed_at timestamptz,
  UNIQUE (id, bar_id),
  FOREIGN KEY (opened_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (closed_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT,
  CHECK ((closed_at IS NULL AND closed_by IS NULL) OR (closed_at IS NOT NULL AND closed_by IS NOT NULL))
);

CREATE UNIQUE INDEX turns_one_open_per_bar_idx ON public.turns(bar_id) WHERE closed_at IS NULL;

CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  turn_id uuid NOT NULL,
  order_id uuid,
  customer_id uuid,
  kind text NOT NULL CHECK (kind IN ('payment', 'refund')),
  original_transaction_id uuid,
  payment_method text NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'cartao', 'outro')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  tendered_amount_cents integer,
  recorded_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, bar_id),
  FOREIGN KEY (turn_id, bar_id) REFERENCES public.turns(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id, bar_id) REFERENCES public.orders(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id, bar_id) REFERENCES public.customers(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (original_transaction_id, bar_id) REFERENCES public.financial_transactions(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT,
  CHECK (order_id IS NOT NULL OR customer_id IS NOT NULL),
  CHECK (
    (kind = 'payment' AND original_transaction_id IS NULL AND reason IS NULL)
    OR (kind = 'refund' AND original_transaction_id IS NOT NULL AND length(trim(coalesce(reason, ''))) > 0)
  ),
  CHECK (tendered_amount_cents IS NULL OR tendered_amount_cents >= amount_cents),
  CHECK (
    payment_method = 'dinheiro'
    OR tendered_amount_cents IS NULL
    OR tendered_amount_cents = amount_cents
  )
);

CREATE TABLE public.turn_closures (
  turn_id uuid NOT NULL,
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  payment_method text NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'cartao', 'outro')),
  expected_cents integer NOT NULL,
  counted_cents integer NOT NULL CHECK (counted_cents >= 0),
  difference_cents integer NOT NULL CHECK (difference_cents = counted_cents - expected_cents),
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (turn_id, payment_method),
  FOREIGN KEY (turn_id, bar_id) REFERENCES public.turns(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT
);

CREATE TABLE public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE RESTRICT,
  turn_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('supply', 'withdrawal')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (turn_id, bar_id) REFERENCES public.turns(id, bar_id) ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by, bar_id) REFERENCES public.bar_memberships(user_id, bar_id) ON DELETE RESTRICT
);

CREATE INDEX bar_memberships_bar_active_idx ON public.bar_memberships(bar_id, role) WHERE revoked_at IS NULL;
CREATE INDEX tables_bar_area_idx ON public.tables(bar_id, area_id) WHERE active;
CREATE INDEX persons_bar_table_idx ON public.persons(bar_id, table_id);
CREATE INDEX products_bar_active_idx ON public.products(bar_id, active);
CREATE INDEX customers_bar_active_idx ON public.customers(bar_id, active);
CREATE INDEX orders_bar_status_opened_idx ON public.orders(bar_id, status, opened_at DESC);
CREATE INDEX order_items_bar_order_idx ON public.order_items(bar_id, order_id, created_at);
CREATE INDEX cancellations_bar_item_idx ON public.order_item_cancellations(bar_id, order_item_id);
CREATE INDEX financial_transactions_bar_turn_idx ON public.financial_transactions(bar_id, turn_id, created_at);
CREATE INDEX financial_transactions_original_idx ON public.financial_transactions(original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;
CREATE INDEX movements_bar_turn_idx ON public.movements(bar_id, turn_id, created_at);

-- RLS helper. It can only answer for auth.uid(); no client-supplied user id is
-- accepted. The definer function avoids recursive RLS when policies read
-- bar_memberships.
CREATE OR REPLACE FUNCTION public.has_bar_access(target_bar_id uuid, allowed_roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bar_memberships AS membership
    WHERE membership.bar_id = target_bar_id
      AND membership.user_id = (SELECT auth.uid())
      AND membership.revoked_at IS NULL
      AND (allowed_roles IS NULL OR membership.role = ANY (allowed_roles))
  );
$$;

REVOKE ALL ON FUNCTION public.has_bar_access(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_bar_access(uuid, text[]) TO authenticated;

-- Refunds are immutable ledger entries. Serialize against the original payment
-- and reject cross-bar, non-payment, or over-refund references.
CREATE OR REPLACE FUNCTION public.validate_financial_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  original_amount integer;
  original_kind text;
  already_refunded integer;
BEGIN
  IF NEW.kind <> 'refund' THEN
    RETURN NEW;
  END IF;

  SELECT transaction.amount_cents, transaction.kind
    INTO original_amount, original_kind
    FROM public.financial_transactions AS transaction
    WHERE transaction.id = NEW.original_transaction_id
      AND transaction.bar_id = NEW.bar_id
    FOR UPDATE;

  IF NOT FOUND OR original_kind <> 'payment' THEN
    RAISE EXCEPTION 'Refund must reference a payment in the same bar';
  END IF;

  SELECT COALESCE(sum(transaction.amount_cents), 0)::integer
    INTO already_refunded
    FROM public.financial_transactions AS transaction
    WHERE transaction.original_transaction_id = NEW.original_transaction_id
      AND transaction.bar_id = NEW.bar_id
      AND transaction.kind = 'refund';

  IF already_refunded + NEW.amount_cents > original_amount THEN
    RAISE EXCEPTION 'Refund amount exceeds the remaining payment balance';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_financial_refund() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER financial_transactions_validate_refund
  BEFORE INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_refund();

ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turn_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- Membership and tenant reads. Bars and memberships cannot be created or
-- changed from a browser client; the trusted server provisioner uses its
-- server-only key.
CREATE POLICY bars_select_member ON public.bars
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(id)));
CREATE POLICY bars_update_admin ON public.bars
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(id, ARRAY['admin']::text[])));
CREATE POLICY memberships_select_same_bar ON public.bar_memberships
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));

-- All team members may read their own bar's setup and operational data.
CREATE POLICY bar_settings_select_member ON public.bar_settings
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY bar_settings_update_admin ON public.bar_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

CREATE POLICY areas_select_member ON public.areas
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY areas_insert_admin ON public.areas
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));
CREATE POLICY areas_update_admin ON public.areas
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

CREATE POLICY tables_select_member ON public.tables
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY tables_insert_admin ON public.tables
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));
CREATE POLICY tables_update_admin ON public.tables
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

CREATE POLICY persons_select_member ON public.persons
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY persons_insert_admin ON public.persons
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));
CREATE POLICY persons_update_admin ON public.persons
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

CREATE POLICY products_select_member ON public.products
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY products_insert_admin ON public.products
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));
CREATE POLICY products_update_admin ON public.products
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

CREATE POLICY customers_select_member ON public.customers
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY customers_insert_team ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin', 'waiter']::text[])));
CREATE POLICY customers_update_admin ON public.customers
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

-- Waiters can share open orders within their bar. Cumins can read the order
-- and location notes but do not record orders or financial transactions.
CREATE POLICY orders_select_member ON public.orders
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY orders_insert_team ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin', 'waiter']::text[])));
CREATE POLICY orders_update_team ON public.orders
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin', 'waiter']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin', 'waiter']::text[])));

CREATE POLICY order_items_select_member ON public.order_items
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY order_items_insert_team ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin', 'waiter']::text[])));

CREATE POLICY item_cancellations_select_member ON public.order_item_cancellations
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY item_cancellations_insert_team ON public.order_item_cancellations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin', 'waiter']::text[])));

CREATE POLICY turns_select_member ON public.turns
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY turns_insert_admin ON public.turns
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));
CREATE POLICY turns_update_admin ON public.turns
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])))
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

CREATE POLICY financial_transactions_select_member ON public.financial_transactions
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY financial_transactions_insert_team ON public.financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin', 'waiter']::text[])));

CREATE POLICY turn_closures_select_member ON public.turn_closures
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY turn_closures_insert_admin ON public.turn_closures
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

CREATE POLICY movements_select_member ON public.movements
  FOR SELECT TO authenticated
  USING ((SELECT public.has_bar_access(bar_id)));
CREATE POLICY movements_insert_admin ON public.movements
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_bar_access(bar_id, ARRAY['admin']::text[])));

-- Table privileges are separate from RLS. Grant only the operations that have
-- matching policies; historical rows have no client DELETE privilege.
REVOKE ALL ON TABLE
  public.bars,
  public.bar_memberships,
  public.bar_settings,
  public.areas,
  public.tables,
  public.persons,
  public.products,
  public.customers,
  public.orders,
  public.order_items,
  public.order_item_cancellations,
  public.turns,
  public.financial_transactions,
  public.turn_closures,
  public.movements
FROM anon, PUBLIC;

GRANT SELECT, UPDATE ON public.bars TO authenticated;
GRANT SELECT ON public.bar_memberships TO authenticated;
GRANT SELECT, UPDATE ON public.bar_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.areas, public.tables, public.persons, public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items, public.order_item_cancellations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.turns TO authenticated;
GRANT SELECT, INSERT ON public.financial_transactions, public.turn_closures, public.movements TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.bars,
  public.bar_memberships,
  public.bar_settings,
  public.areas,
  public.tables,
  public.persons,
  public.products,
  public.customers,
  public.orders,
  public.order_items,
  public.order_item_cancellations,
  public.turns,
  public.financial_transactions,
  public.turn_closures,
  public.movements
TO service_role;

-- Private Broadcast channel authorization: the caller must have an active
-- membership in the bar encoded in the channel topic "bar:<bar UUID>".
CREATE OR REPLACE FUNCTION public.can_access_bar_realtime_topic()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  topic text;
  bar_uuid uuid;
BEGIN
  topic := (SELECT realtime.topic());
  IF topic !~* '^bar:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  bar_uuid := substring(topic FROM 5)::uuid;
  RETURN public.has_bar_access(bar_uuid);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_bar_realtime_topic() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_bar_realtime_topic() TO authenticated;

CREATE POLICY contabar_bar_broadcast_read ON realtime.messages
  FOR SELECT TO authenticated
  USING (extension = 'broadcast' AND (SELECT public.can_access_bar_realtime_topic()));
CREATE POLICY contabar_bar_broadcast_send ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (extension = 'broadcast' AND (SELECT public.can_access_bar_realtime_topic()));

-- Publish row changes for the operational screens. The app must still join a
-- private "bar:<uuid>" channel; table RLS filters the rows delivered.
DO $$
DECLARE
  table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['orders', 'order_items', 'order_item_cancellations', 'financial_transactions']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END;
$$;
