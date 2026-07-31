-- Facturation Stripe : liens vers la facture legale emise pour chaque paiement.
-- Renseignes par apply-purchase (nouveaux achats) et backfill-invoices
-- (paiements anterieurs). Migration deja appliquee sur le projet Supabase.
alter table transactions
  add column if not exists stripe_invoice_id text,
  add column if not exists invoice_number    text,
  add column if not exists invoice_pdf       text;

-- Une seule facture par transaction (garde-fou anti-doublon cote base, en plus
-- de la cle d'idempotence Stripe utilisee a la creation).
create unique index if not exists transactions_stripe_invoice_id_key
  on transactions (stripe_invoice_id)
  where stripe_invoice_id is not null;
