const HttpPublisher = require("./HttpPublisher");

class TelemetryPublisher {
    constructor() {
        this.httpPublisher = new HttpPublisher();
    }

    async initialize() {
        await this.httpPublisher.connect();
    }

    async publishFleet(tickCount, packets, tickTimestamp) {
        const results = await Promise.all(
            packets.map((packet) => this.httpPublisher.send(packet))
        );

        const deliveredCount = results.filter(Boolean).length;

        console.clear();
        console.log("============================================");
        console.log(" Railway Air Compressor Simulation");
        console.log("============================================");
        console.log(`Tick          : ${tickCount}`);
        console.log(`Simulated At  : ${tickTimestamp}`);
        console.log(`Compressors   : ${packets.length}`);
        console.log(`Delivered     : ${deliveredCount}/${packets.length}`);
        console.log("--------------------------------------------");

        for (const packet of packets) {
            const health = packet.health || {};
            const telemetry = packet.telemetry || {};
            console.log(
                `${packet.assetId.padEnd(10)} | ` +
                `${String(health.healthStatus || packet.assetState || "UNKNOWN").padEnd(10)} | ` +
                `Health ${String(health.healthScore ?? "-").padStart(3)}% | ` +
                `Risk ${String(health.failureProbability ?? "-").padStart(5)} | ` +
                `P ${String(telemetry.airPressure ?? "-").padStart(6)} bar | ` +
                `Flow ${String(telemetry.airflowRate ?? "-").padStart(7)} L/min | ` +
                `Vib ${String(telemetry.vibration ?? "-").padStart(5)} mm/s | ` +
                `Temp ${String(telemetry.motorTemperature ?? "-").padStart(6)} °C | ` +
                `I ${String(telemetry.motorCurrent ?? "-").padStart(5)} A | ` +
                `RPM ${String(Math.round(telemetry.compressorSpeed ?? 0)).padStart(4)}`
            );
        }

        console.log("============================================\n");
        return results;
    }

    // Kept for compatibility with any code that publishes one packet.
    async publish(tickCount, telemetry) {
        return this.publishFleet(tickCount, [telemetry], telemetry.timestamp);
    }
}

module.exports = TelemetryPublisher;
