-- is_banned() could be called by any signed-in user for ANY user id.
-- The app now reads the caller's own ban row through RLS instead.
REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon, authenticated;

-- Defensive: keep internal-only helpers unreachable from the Data API.
REVOKE ALL ON FUNCTION public.log_admin_action(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_credits(integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.emit_scam_report_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;