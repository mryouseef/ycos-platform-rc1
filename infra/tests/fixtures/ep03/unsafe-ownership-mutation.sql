-- CLIENT_SCOPED unsafe fixture omits the required ownership mutation control.
CREATE TABLE app.unsafe_owned_record (client_id uuid NOT NULL);
