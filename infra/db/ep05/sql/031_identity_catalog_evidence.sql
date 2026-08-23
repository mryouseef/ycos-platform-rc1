SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, r.rolname AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'app' AND c.relname IN ('client_memberships', 'client_role_assignments') ORDER BY c.relname;
SELECT c.relname, p.polname, p.polcmd, array_to_string(p.polroles::regrole[], ',') AS policy_roles, pg_get_expr(p.polqual, p.polrelid) AS using_expression
FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app' AND c.relname IN ('client_memberships', 'client_role_assignments') ORDER BY c.relname;
