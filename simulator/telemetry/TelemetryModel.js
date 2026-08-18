class TelemetryModel {
    static create(assetId, simulationData, timestamp = new Date().toISOString()) {
        return {
            assetId,
            timestamp,
            assetState: simulationData.assetState,
            environment: simulationData.environment,
            telemetry: simulationData.telemetry,
            health: simulationData.health,
            events: simulationData.events || []
        };
    }
}
module.exports = TelemetryModel;
