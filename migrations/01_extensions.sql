-- ==================================================================================
-- VANTEDGE MIGRATION 01: EXTENSIONS
-- ==================================================================================
-- Run this FIRST before any other migration scripts
-- ==================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;

-- Verify extensions are installed
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_cron', 'pg_net');
