-- EP-03 machine-derived role catalog evidence.
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls
FROM pg_roles
WHERE rolname IN ('ycos_schema_owner', 'ycos_migration', 'ycos_app_runtime')
ORDER BY rolname;
