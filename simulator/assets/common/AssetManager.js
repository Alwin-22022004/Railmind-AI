const CompressorPhysics = require("../compressor/CompressorPhysics");

// Controlled development fault scenarios to test alert rules
// COMP-001 is preserved as healthy baseline
const DEV_FAULT_SCENARIOS = {
    "COMP-001": {
        // Healthy baseline scenario
        faultProfile: CompressorPhysics.FAULT_TYPES.NONE,
        initialWear: 0.01,
        wear: {
            bearingWear: 0.01,
            motorWear: 0.01,
            oilWear: 0.01,
            leakWear: 0.01,
            filterWear: 0.01
        }
    },
    "COMP-002": {
        // Elevated bearing wear producing high vibration (> 4.0 mm/s)
        faultProfile: CompressorPhysics.FAULT_TYPES.BEARING_FAULT,
        faultAccelerator: 30,
        wear: {
            bearingWear: 0.35
        }
    },
    "COMP-003": {
        // Air leakage producing low air pressure (< 8.0 bar) and excessive air leakage (> 12.0%)
        faultProfile: CompressorPhysics.FAULT_TYPES.AIR_LEAKAGE,
        faultAccelerator: 30,
        wear: {
            leakWear: 0.38
        }
    },
    "COMP-004": {
        // Motor overheating producing high motor temperature (> 82.0 °C)
        faultProfile: CompressorPhysics.FAULT_TYPES.MOTOR_OVERHEATING,
        faultAccelerator: 30,
        wear: {
            motorWear: 0.55
        }
    },
    "COMP-005": {
        // Oil degradation producing low oil pressure (< 2.5 bar)
        faultProfile: CompressorPhysics.FAULT_TYPES.OIL_DEGRADATION,
        faultAccelerator: 30,
        wear: {
            oilWear: 0.48
        }
    }
};

class AssetManager {
    constructor() {
        this.assets = new Map();
    }

    registerAsset(asset) {
        this.assets.set(asset.assetId, asset);
        return asset;
    }

    removeAsset(assetId) {
        this.assets.delete(assetId);
    }

    hasAsset(assetId) {
        return this.assets.has(assetId);
    }

    getAsset(assetId) {
        return this.assets.get(assetId);
    }

    getAssets() {
        return Array.from(this.assets.values());
    }

    syncCompressorAssets(assetDefinitions = [], CompressorAssetClass) {
        const activeIds = new Set();

        for (const definition of assetDefinitions) {
            const assetId = String(definition.asset_code || definition.assetId || "").trim().toUpperCase();
            if (!assetId) continue;
            activeIds.add(assetId);

            if (!this.hasAsset(assetId)) {
                const scenario = DEV_FAULT_SCENARIOS[assetId] || {
                    faultProfile: CompressorPhysics.FAULT_TYPES.NONE,
                    initialWear: 0.01
                };
                const metadata = definition.metadata || {};

                this.registerAsset(new CompressorAssetClass(assetId, {
                    name: definition.name,
                    zone: definition.zone,
                    databaseId: definition.id,
                    faultProfile: metadata.faultProfile || scenario.faultProfile,
                    faultAccelerator: metadata.faultAccelerator ?? scenario.faultAccelerator ?? 25,
                    initialWear: metadata.initialWear ?? scenario.initialWear,
                    wear: {
                        ...(scenario.wear || {}),
                        ...(metadata.wear || {})
                    }
                }));
                console.log(`[Simulation] Added active compressor ${assetId} to simulation (${metadata.faultProfile || scenario.faultProfile}).`);
            }
        }

        for (const existingId of Array.from(this.assets.keys())) {
            if (!activeIds.has(existingId)) {
                this.removeAsset(existingId);
                console.log(`[Simulation] Removed inactive compressor ${existingId} from simulation.`);
            }
        }
    }
}

module.exports = AssetManager;
