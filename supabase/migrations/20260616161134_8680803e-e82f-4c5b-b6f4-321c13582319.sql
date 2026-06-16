
-- Soft delete: archive a photographer (keeps all data, hides them)
CREATE OR REPLACE FUNCTION public.soft_delete_photographer(_photographer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles
  SET deleted_at = now(),
      is_published = false,
      updated_at = now()
  WHERE id = _photographer_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), 'soft_delete', 'photographer', _photographer_id,
          jsonb_build_object('archived_at', now()));
END;
$$;

-- Restore an archived photographer
CREATE OR REPLACE FUNCTION public.restore_photographer(_photographer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles
  SET deleted_at = NULL,
      updated_at = now()
  WHERE id = _photographer_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), 'restore', 'photographer', _photographer_id,
          jsonb_build_object('restored_at', now()));
END;
$$;

-- Refresh public SELECT policy on profiles to hide soft-deleted rows from non-admins
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
    OR (
      deleted_at IS NULL
      AND is_published = true
      AND public.is_subscription_active(id)
    )
  );
