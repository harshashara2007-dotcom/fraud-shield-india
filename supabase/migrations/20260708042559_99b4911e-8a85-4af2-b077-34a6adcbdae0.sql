
-- ============ CREDITS ============
CREATE TABLE public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100,
  monthly_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credits read" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX credit_tx_user_time_idx ON public.credit_transactions(user_id, created_at DESC);

-- Init / auto-reset monthly quota
CREATE OR REPLACE FUNCTION public.get_or_init_credits()
RETURNS TABLE(balance INTEGER, monthly_reset_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid(); _row public.user_credits%rowtype;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _row FROM public.user_credits WHERE user_id = _uid;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits(user_id) VALUES (_uid) RETURNING * INTO _row;
    INSERT INTO public.credit_transactions(user_id, delta, reason, balance_after)
    VALUES (_uid, 100, 'monthly_grant', 100);
  ELSIF _row.monthly_reset_at <= now() THEN
    UPDATE public.user_credits
       SET balance = balance + 100,
           monthly_reset_at = date_trunc('month', now()) + interval '1 month',
           updated_at = now()
     WHERE user_id = _uid
     RETURNING * INTO _row;
    INSERT INTO public.credit_transactions(user_id, delta, reason, balance_after)
    VALUES (_uid, 100, 'monthly_grant', _row.balance);
  END IF;
  RETURN QUERY SELECT _row.balance, _row.monthly_reset_at;
END; $$;

CREATE OR REPLACE FUNCTION public.use_credits(_amount INTEGER, _reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid(); _new INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  PERFORM public.get_or_init_credits();
  UPDATE public.user_credits SET balance = balance - _amount, updated_at = now()
   WHERE user_id = _uid AND balance >= _amount
   RETURNING balance INTO _new;
  IF _new IS NULL THEN RAISE EXCEPTION 'insufficient_credits'; END IF;
  INSERT INTO public.credit_transactions(user_id, delta, reason, balance_after)
  VALUES (_uid, -_amount, _reason, _new);
  RETURN _new;
END; $$;

CREATE OR REPLACE FUNCTION public.add_credits(_amount INTEGER, _reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid(); _new INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  PERFORM public.get_or_init_credits();
  UPDATE public.user_credits SET balance = balance + _amount, updated_at = now()
   WHERE user_id = _uid RETURNING balance INTO _new;
  INSERT INTO public.credit_transactions(user_id, delta, reason, balance_after)
  VALUES (_uid, _amount, _reason, _new);
  RETURN _new;
END; $$;

-- ============ ADMIN AUDIT LOG ============
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  target TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_audit_time_idx ON public.admin_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_action(_action TEXT, _target TEXT DEFAULT NULL, _meta JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_audit_log(admin_id, admin_email, action, target, meta)
  VALUES (auth.uid(), _email, _action, _target, _meta);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(_limit INTEGER DEFAULT 200)
RETURNS TABLE(id UUID, admin_email TEXT, action TEXT, target TEXT, meta JSONB, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT a.id, a.admin_email, a.action, a.target, a.meta, a.created_at
    FROM public.admin_audit_log a ORDER BY a.created_at DESC LIMIT COALESCE(_limit, 200);
END; $$;

-- ============ WIRE AUDIT INTO EXISTING ADMIN FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.admin_promote_by_email(_email text)
RETURNS TABLE(user_id uuid, email text, role app_role)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(auth.users.email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin') ON CONFLICT DO NOTHING;
  PERFORM public.log_admin_action('promote_admin', _email, jsonb_build_object('user_id', _uid));
  RETURN QUERY SELECT _uid, _email, 'admin'::app_role;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_demote(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot demote yourself'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  PERFORM public.log_admin_action('demote_admin', _user_id::text, NULL);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_ban_by_email(_email text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(auth.users.email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF _uid = auth.uid() THEN RAISE EXCEPTION 'cannot ban yourself'; END IF;
  INSERT INTO public.banned_users(user_id, email, reason, banned_by)
  VALUES (_uid, _email, _reason, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, created_at = now();
  PERFORM public.log_admin_action('ban_user', _email, jsonb_build_object('reason', _reason));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_unban(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  DELETE FROM public.banned_users WHERE user_id = _user_id;
  PERFORM public.log_admin_action('unban_user', _user_id::text, NULL);
END; $$;

-- Admin-only delete for reports (logs to audit)
CREATE OR REPLACE FUNCTION public.admin_delete_report(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  DELETE FROM public.scam_reports WHERE id = _id;
  PERFORM public.log_admin_action('delete_report', _id::text, NULL);
END; $$;
