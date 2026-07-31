-- ===========================================================================
-- TRIGGERS DE QUOTA → SECURITY DEFINER
--
-- ⚠️  CORRECTIF OBLIGATOIRE, indissociable de security_users_rls_v2.sql.
--     Appliquer les deux ensemble : sans celui-ci, la création de vœu échoue
--     avec « permission denied for table users ».
--
-- Pourquoi : consume_wish_slot, increment_wishes_used, decrement_wishes_used,
-- apply_wish_pack et reset_monthly_quota écrivent public.users
-- (wishes_used, pack_slots, monthly_free_used) mais n'étaient PAS
-- SECURITY DEFINER. Elles s'exécutaient donc avec les droits de
-- l'utilisateur déclencheur.
--
-- Cela ne fonctionnait que parce que `authenticated` disposait d'UPDATE sur
-- TOUTES les colonnes de users — autrement dit, la comptabilité des quotas
-- reposait sur la faille même que ce lot corrige. Dès qu'on restreint les
-- colonnes modifiables, ces triggers tombent.
--
-- Le bon modèle est de toute façon celui-ci : le décompte des quotas est une
-- décision serveur, pas une écriture du client. On y ajoute search_path figé
-- et références qualifiées (même durcissement que is_admin()).
-- ===========================================================================

create or replace function public.increment_wishes_used()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.users set wishes_used = wishes_used + 1 where id = new.wisher_id;
  return new;
end;
$$;

create or replace function public.decrement_wishes_used()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.statut <> 'expire'  and new.statut = 'expire')
  or (old.statut <> 'realise' and new.statut = 'realise')
  then
    update public.users
       set wishes_used = greatest(0, wishes_used - 1)
     where id = new.wisher_id;
  end if;
  return new;
end;
$$;

create or replace function public.consume_wish_slot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare user_pack_slots int;
begin
  select pack_slots into user_pack_slots from public.users where id = new.wisher_id;
  if user_pack_slots > 0 then
    update public.users set pack_slots = pack_slots - 1 where id = new.wisher_id;
  else
    update public.users set monthly_free_used = monthly_free_used + 1 where id = new.wisher_id;
  end if;
  return new;
end;
$$;

create or replace function public.apply_wish_pack()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.users set pack_slots = pack_slots + new.wishes_added where id = new.user_id;
  return new;
end;
$$;

create or replace function public.reset_monthly_quota()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.users set
    monthly_free_used = 0,
    quota_reset_at = date_trunc('month', now()) + interval '1 month'
  where quota_reset_at <= now();
end;
$$;

-- CREATE OR REPLACE réinitialise les privilèges : réappliquer le verrouillage
-- de security_lock_function_execute.sql sur ces cinq fonctions.
revoke execute on function public.increment_wishes_used()  from public, anon;
revoke execute on function public.decrement_wishes_used()  from public, anon;
revoke execute on function public.consume_wish_slot()      from public, anon;
revoke execute on function public.apply_wish_pack()        from public, anon;
revoke execute on function public.reset_monthly_quota()    from public, anon, authenticated;

grant execute on function public.increment_wishes_used()   to authenticated, service_role;
grant execute on function public.decrement_wishes_used()   to authenticated, service_role;
grant execute on function public.consume_wish_slot()       to authenticated, service_role;
grant execute on function public.apply_wish_pack()         to authenticated, service_role;
grant execute on function public.reset_monthly_quota()     to service_role;
