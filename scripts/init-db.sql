-- Create databases for each service
-- PostgreSQL executes this on first container startup

CREATE DATABASE auth_db;
CREATE DATABASE tenant_db;
CREATE DATABASE chat_db;

-- Note: Tables are managed by Prisma migrations in each service
-- This script only creates the empty databases