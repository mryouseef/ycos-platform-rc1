-- ILE-01 additive security layer. RC1 migration 001_work_items.sql remains unchanged.
DO $$ BEGIN
  CREATE ROLE ycos_ile_runtime LOGIN NOBYPASSRLS;
EXCEPTION WHEN duplicate_object THEN
  ALTER ROLE ycos_ile_runtime NOBYPASSRLS;
END $$;
REVOKE ALL ON work_items FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON work_items TO ycos_ile_runtime;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ile_work_items_select ON work_items;
DROP POLICY IF EXISTS ile_work_items_insert ON work_items;
DROP POLICY IF EXISTS ile_work_items_update ON work_items;
DROP POLICY IF EXISTS ile_work_items_delete ON work_items;
CREATE POLICY ile_work_items_select ON work_items FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY ile_work_items_insert ON work_items FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY ile_work_items_update ON work_items FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY ile_work_items_delete ON work_items FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true));
