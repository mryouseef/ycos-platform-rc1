# RC-FSV-01 Data Integrity Report

Clean migration-from-zero produced the expected `work_items` schema and primary-key constraint. The adapter contract references the migrated table, tenant identifier, and concurrency-failure behavior. Local synthetic backup/restore preserved tenant ownership, identity, state, version, classification, and primary-key constraint. Evidence: `raw-evidence/backup-and-drift.txt`.
