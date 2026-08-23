-- EP-03 machine-derived protected-table and policy catalog evidence.
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, r.rolname AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'app' AND c.relname IN ('work_items', 'work_item_notes')
ORDER BY c.relname;

SELECT p.polname, c.relname, p.polcmd, array_to_string(p.polroles::regrole[], ',') AS policy_roles,
       pg_get_expr(p.polqual, p.polrelid) AS using_expression,
       pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app'
ORDER BY c.relname, p.polname;
