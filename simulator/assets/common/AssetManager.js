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
                this.registerAsset(new CompressorAssetClass(assetId, {
                    name: definition.name,
                    zone: definition.zone,
                    databaseId: definition.id,
                }));
                console.log(`[Simulation] Added active compressor ${assetId} to simulation.`);
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
