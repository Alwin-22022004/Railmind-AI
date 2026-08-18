-- =====================================================================
-- RailMind AI — Users table
-- Matches the columns authController.js already reads/writes
-- (full_name, email, password_hash, role, is_active).
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'USER'
                        CHECK (role IN ('ADMIN', 'OPERATOR', 'MAINTENANCE', 'USER')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
