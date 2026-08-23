-- SYNTHETIC / LOCAL ONLY / NON-PRODUCTION
CREATE TABLE work_items (id text NOT NULL, tenant_id text NOT NULL, state text NOT NULL CHECK (state IN ('draft','submitted','approved')), version integer NOT NULL CHECK (version > 0), classification text NOT NULL CHECK (classification='synthetic'), PRIMARY KEY (tenant_id,id));
CREATE TABLE migration_history (version text PRIMARY KEY, applied_at text NOT NULL);
