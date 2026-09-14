-- =====================================================================
-- RailMind AI — Migration 006: Advanced Alert & Maintenance Workflow
-- Non-destructive additions to alerts and maintenance_logs tables
-- =====================================================================

ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS alert_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS trigger_parameter VARCHAR(50),
    ADD COLUMN IF NOT EXISTS actual_value NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS threshold_value NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS recommendation TEXT,
    ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
    ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_dedup
    ON alerts (asset_id, alert_type, is_resolved, created_at DESC);

ALTER TABLE maintenance_logs
    ADD COLUMN IF NOT EXISTS alert_id BIGINT REFERENCES alerts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR(50) DEFAULT 'CORRECTIVE';

CREATE INDEX IF NOT EXISTS idx_maintenance_alert
    ON maintenance_logs (alert_id);
