const BaseAsset = require("../common/BaseAsset");
const CompressorPhysics = require("./CompressorPhysics");
const CompressorHealth = require("./CompressorHealth");
const AssetState = require("../../state/AssetState");

class CompressorAsset extends BaseAsset {

    constructor(assetId = "COMP-001", options = {}) {

        super(assetId, "AIR_COMPRESSOR", new CompressorHealth());

        this.physics = new CompressorPhysics(options);
    }

    calculateTelemetry(environment) {
        this.physics.update(environment);
        return this.physics.getTelemetry();
    }

    determineOperationalState(environment) {

        if (this.telemetry.compressorLoad > 90) {
            return AssetState.HIGH_LOAD;
        }
        if (this.telemetry.motorTemperature > 100) {
            return AssetState.OVERHEATING;
        }
        return null;
    }

    getWearState() {
        return this.physics.getWearState();
    }
}

module.exports = CompressorAsset;
