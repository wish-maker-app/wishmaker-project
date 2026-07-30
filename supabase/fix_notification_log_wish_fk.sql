-- Corrige la suppression des voeux expirés : la table notification_log
-- référence wishes(id) avec ON DELETE NO ACTION, ce qui provoque une
-- violation de contrainte de clé étrangère quand un utilisateur tente
-- de supprimer un voeu pour lequel une notification (ex: rappel
-- d'expiration envoyé par l'edge function notify-expiring-wishes) a été
-- enregistrée. On passe la contrainte en ON DELETE SET NULL, comme c'est
-- déjà le cas pour conversations.wish_id et transactions.wish_id.
alter table notification_log
  drop constraint notification_log_wish_id_fkey,
  add constraint notification_log_wish_id_fkey
    foreign key (wish_id) references wishes(id) on delete set null;
