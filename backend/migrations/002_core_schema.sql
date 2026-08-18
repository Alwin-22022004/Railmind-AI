-- =====================================================================
-- RailMind AI — Core Schema, Phase 1
-- Assets (Compressors), Telemetry, Predictions, Alerts, Maintenance Logs
-- =====================================================================

-- ---------------------------------------------------------------------
-- ASSETS
-- One row per physical railway air compressor unit.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id              SERIAL PRIMARY KEY,
    asset_code      VARCHAR(50) UNIQUE NOT NULL,          -- e.g. 'COMP-001'
    name            VARCHAR(150) NOT NULL,                 -- e.g. 'Coach A1 Air Compressor'
    asset_type      VARCHAR(50) NOT NULL DEFAULT 'AIR_COMPRESSOR',
    zone            VARCHAR(100),                          -- e.g. 'Coach A1', 'Loco Shed 2'
    status          VARCHAR(20) NOT NULL DEFAULT 'Active',  -- Active, Idle, Decommissioned
    install_date    DATE,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- TELEMETRY
-- One row per sensor reading tick, per compressor.
-- raw_payload keeps the FULL packet from the simulator (environment,
-- nested health, events) so nothing is lost before the AI model exists.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry (
    id                  BIGSERIAL PRIMARY KEY,
    asset_id            INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    recorded_at         TIMESTAMPTZ NOT NULL,               -- timestamp from the simulator
    air_pressure        NUMERIC(6,2),                        -- bar
    airflow_rate        NUMERIC(8,2),                        -- L/min
    vibration           NUMERIC(6,2),                        -- mm/s RMS
    motor_current        NUMERIC(6,2),                       -- A
    motor_voltage         NUMERIC(6,2),                      -- V
    motor_temperature      NUMERIC(6,2),                     -- °C
    compressor_speed        NUMERIC(8,2),                    -- RPM
    oil_pressure               NUMERIC(6,2),                 -- bar
    oil_temperature            NUMERIC(6,2),                 -- °C
    running_hours              NUMERIC(10,2),                -- cumulative hours
    compressor_load             NUMERIC(6,2),                -- %
    start_stop_cycles           INTEGER,                     -- cumulative count
    ambient_temperature          NUMERIC(6,2),                -- °C, from environment
    asset_state                  VARCHAR(30),                 -- Running/HighLoad/Overheating/Fault etc.
    raw_payload                  JSONB,                       -- full original packet
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_asset_time
    ON telemetry (asset_id, recorded_at DESC);

-- ---------------------------------------------------------------------
-- PREDICTIONS
-- One row per health/failure prediction produced by the AI service for
-- a given asset (optionally tied to the telemetry row that triggered it).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
    id                  BIGSERIAL PRIMARY KEY,
    asset_id            INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    telemetry_id        BIGINT REFERENCES telemetry(id) ON DELETE SET NULL,
    health_score         NUMERIC(5,2),                        -- 0-100
    failure_probability   NUMERIC(5,4),                        -- 0-1
    fault_type             VARCHAR(50),                         -- e.g. 'VALVE_LEAK', 'NONE'
    rul_hours                NUMERIC(10,2),                     -- predicted remaining useful life
    risk_level                VARCHAR(20),                      -- Low, Medium, High, Critical
    model_version               VARCHAR(50),                    -- e.g. 'rf_v1'
    predicted_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_asset_time
    ON predictions (asset_id, predicted_at DESC);

-- ---------------------------------------------------------------------
-- ALERTS
-- Rule-based (threshold) or AI-triggered warnings shown on the dashboard.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id              BIGSERIAL PRIMARY KEY,
    asset_id        INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    level           VARCHAR(20) NOT NULL,                 -- info, warning, critical
    title           VARCHAR(200) NOT NULL,
    message         TEXT,
    source          VARCHAR(20) NOT NULL DEFAULT 'rule',  -- 'rule' or 'ai'
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_asset_unresolved
    ON alerts (asset_id, is_resolved);

-- ---------------------------------------------------------------------
-- MAINTENANCE LOGS
-- Manual or scheduled maintenance actions performed on a compressor.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id              BIGSERIAL PRIMARY KEY,
    asset_id        INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    performed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(200) NOT NULL,                -- e.g. 'Oil filter replaced'
    notes           TEXT,
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset
    ON maintenance_logs (asset_id, performed_at DESC);
