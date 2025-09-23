-- Initialize database with required extensions and configurations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for better performance (if needed by your schema)
-- These will be created automatically by TypeORM based on your entity decorators
