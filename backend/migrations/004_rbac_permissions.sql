CREATE TABLE IF NOT EXISTS permissions (
    code VARCHAR(80) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','OPERATOR','MAINTENANCE','USER')),
    permission_code VARCHAR(80) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_code)
);

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_code VARCHAR(80) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    allowed BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, permission_code)
);

INSERT INTO permissions(code,label,description,category) VALUES
('dashboard.view','Dashboard','View the role-specific dashboard','Dashboard'),
('project.info','Project Information','View RailMind AI project purpose and workflow','Dashboard'),
('compressors.view','View Compressors','View registered compressors and their current status','Fleet'),
('assets.manage','Manage Compressors','Create, update and deactivate compressor assets','Fleet'),
('telemetry.view','View Telemetry','View live and historical compressor telemetry','Monitoring'),
('analytics.view','View Analytics','View operational trend analytics','Monitoring'),
('alerts.view','View Alerts','View active and historical operational alerts','Monitoring'),
('alerts.manage','Manage Alerts','Resolve operational alerts','Monitoring'),
('maintenance.view','View Maintenance','View maintenance history and recommendations','Maintenance'),
('maintenance.manage','Manage Maintenance','Create and manage maintenance records','Maintenance'),
('users.view','View Users','View platform users','Administration'),
('users.manage','Manage Users','Create users, assign roles and privileges, activate/deactivate accounts','Administration'),
('reports.view','View Reports','View and export operational reports','Administration'),
('system.view','View System Status','View backend, database and telemetry status','Administration')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- Reset role defaults idempotently, then seed the intended defaults.
DELETE FROM role_permissions;

INSERT INTO role_permissions(role, permission_code)
SELECT 'ADMIN', code FROM permissions;

INSERT INTO role_permissions(role, permission_code) VALUES
('OPERATOR','dashboard.view'),
('OPERATOR','compressors.view'),
('OPERATOR','telemetry.view'),
('OPERATOR','alerts.view'),
('OPERATOR','system.view'),
('MAINTENANCE','dashboard.view'),
('MAINTENANCE','compressors.view'),
('MAINTENANCE','telemetry.view'),
('MAINTENANCE','analytics.view'),
('MAINTENANCE','alerts.view'),
('MAINTENANCE','alerts.manage'),
('MAINTENANCE','maintenance.view'),
('MAINTENANCE','maintenance.manage'),
('MAINTENANCE','reports.view'),
('MAINTENANCE','system.view'),
('USER','dashboard.view'),
('USER','project.info');

-- Existing users with no overrides automatically inherit role defaults.
