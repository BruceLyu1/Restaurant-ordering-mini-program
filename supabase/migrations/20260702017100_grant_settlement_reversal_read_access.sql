-- Repair read access for the settlement reversal audit relation.
-- This keeps manager-only RLS in place while allowing the authenticated role
-- to evaluate that policy when orders are loaded with their audit history.

grant select on table public.order_settlement_reversals to authenticated;

notify pgrst, 'reload schema';