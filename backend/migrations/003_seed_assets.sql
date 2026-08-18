-- =====================================================================
-- Seed data — Phase 1
-- The Railway-AirCompressor-Simulation engine creates one asset by
-- default: new CompressorAsset("COMP-001"). We insert a matching row
-- here so telemetry ingestion has a valid asset_id to attach to.
-- Add more rows here as you register more simulated/real compressors.
-- =====================================================================

INSERT INTO assets (asset_code, name, asset_type, zone, status, install_date)
VALUES
    ('COMP-001', 'Coach A1 Air Compressor', 'AIR_COMPRESSOR', 'Coach A1', 'Active', '2023-01-15'),
    ('COMP-002', 'Coach A2 Air Compressor', 'AIR_COMPRESSOR', 'Coach A2', 'Active', '2023-02-10'),
    ('COMP-003', 'Coach B1 Air Compressor', 'AIR_COMPRESSOR', 'Coach B1', 'Active', '2023-03-18'),
    ('COMP-004', 'Coach B2 Air Compressor', 'AIR_COMPRESSOR', 'Coach B2', 'Active', '2023-04-08'),
    ('COMP-005', 'Loco Shed A Compressor', 'AIR_COMPRESSOR', 'Loco Shed A', 'Active', '2023-05-12'),
    ('COMP-006', 'Loco Shed B Compressor', 'AIR_COMPRESSOR', 'Loco Shed B', 'Active', '2023-06-21'),
    ('COMP-007', 'Maintenance Bay Compressor', 'AIR_COMPRESSOR', 'Maintenance Bay', 'Active', '2023-07-05'),
    ('COMP-008', 'Yard Compressor', 'AIR_COMPRESSOR', 'Yard', 'Active', '2023-08-16')
ON CONFLICT (asset_code) DO UPDATE SET
    name = EXCLUDED.name,
    asset_type = EXCLUDED.asset_type,
    zone = EXCLUDED.zone;
