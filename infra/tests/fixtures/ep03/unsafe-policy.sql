CREATE POLICY unsafe_policy ON app.unsafe_client_scoped FOR ALL USING (true) WITH CHECK (true);
