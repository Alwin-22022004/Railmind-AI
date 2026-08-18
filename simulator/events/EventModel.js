class EventModel {
    static create({
        assetId,
        eventType,
        severity,
        assetState,
        healthScore,
        telemetrySnapshot
    }) {
        return {
            eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            timestamp: new Date().toISOString(),
            assetId,
            eventType,
            severity,
            assetState,
            healthScore,
            telemetrySnapshot
        };
    }
}

module.exports = EventModel;
