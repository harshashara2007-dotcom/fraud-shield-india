-- App functions callable by signed-in users
GRANT EXECUTE ON FUNCTION public.get_or_init_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_credits(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_scam_report(text, text, text, text, double precision, double precision, text, text, text, text, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_phone_report(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_upi_report(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reports_by_phone(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_api_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_api_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;

-- Admin dashboard functions (each re-checks admin role internally)
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_reports(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_api_keys(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_promote_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_demote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_by_email(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban(uuid) TO authenticated;

-- Service role for server-side/privileged paths
GRANT EXECUTE ON FUNCTION public.add_credits(integer, text) TO service_role;