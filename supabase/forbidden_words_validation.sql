-- Helper: check if text contains any forbidden word (case-insensitive, whole word only)
CREATE OR REPLACE FUNCTION public.contains_forbidden_word(input_text text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM forbidden_words
    WHERE input_text IS NOT NULL
      AND input_text ~* ('\m' || mot || '\M')
  )
$func$;

-- Trigger for wishes: reject INSERT/UPDATE if titre or description contains forbidden words
CREATE OR REPLACE FUNCTION public.check_wish_content()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
BEGIN
  IF public.contains_forbidden_word(NEW.titre)
     OR public.contains_forbidden_word(NEW.description) THEN
    RAISE EXCEPTION 'Votre vœu contient des mots interdits. Merci de le reformuler.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$func$;

-- Trigger for messages: reject INSERT if contenu contains forbidden words
CREATE OR REPLACE FUNCTION public.check_message_content()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
BEGIN
  IF public.contains_forbidden_word(NEW.contenu) THEN
    RAISE EXCEPTION 'Votre message contient des mots interdits.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_check_wish_content ON public.wishes;
CREATE TRIGGER trg_check_wish_content
  BEFORE INSERT OR UPDATE OF titre, description ON public.wishes
  FOR EACH ROW EXECUTE FUNCTION public.check_wish_content();

DROP TRIGGER IF EXISTS trg_check_message_content ON public.messages;
CREATE TRIGGER trg_check_message_content
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_message_content();
