const CompressorPhysics = require("../assets/compressor/CompressorPhysics");

class MonteCarloEngine {

    constructor() {

        this.ranges = {
            ambientTemperature: { min: 15, max: 46 },
            humidity: { min: 30, max: 90 },
            brakeDemandLevel: { min: 0.3, max: 0.8 },
            trainSpeed: { min: 0, max: 120 },
            supplyVoltage: { min: 395, max: 430 }
        };

        // Fleet-level fault distribution used when generating datasets:
        // most units run to a specific dominant failure mode so the
        // resulting dataset carries a realistic, learnable label mix.
        this.faultDistribution = [
            { type: CompressorPhysics.FAULT_TYPES.NONE, weight: 0.28 },
            { type: CompressorPhysics.FAULT_TYPES.AIR_LEAKAGE, weight: 0.16 },
            { type: CompressorPhysics.FAULT_TYPES.BEARING_FAULT, weight: 0.16 },
            { type: CompressorPhysics.FAULT_TYPES.OIL_DEGRADATION, weight: 0.14 },
            { type: CompressorPhysics.FAULT_TYPES.MOTOR_OVERHEATING, weight: 0.14 },
            { type: CompressorPhysics.FAULT_TYPES.FILTER_CLOGGING, weight: 0.12 }
        ];
    }

    randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    randomInteger(min, max) {
        return Math.floor(this.randomBetween(min, max + 1));
    }

    generateEnvironment() {
        return {
            simulationStartTime: new Date().toISOString(),
            ambientTemperature: this.round(this.randomBetween(
                this.ranges.ambientTemperature.min, this.ranges.ambientTemperature.max
            )),
            humidity: this.round(this.randomBetween(
                this.ranges.humidity.min, this.ranges.humidity.max
            )),
            brakeDemandLevel: this.round(this.randomBetween(
                this.ranges.brakeDemandLevel.min, this.ranges.brakeDemandLevel.max
            )),
            trainSpeed: this.randomInteger(
                this.ranges.trainSpeed.min, this.ranges.trainSpeed.max
            ),
            supplyVoltage: this.round(this.randomBetween(
                this.ranges.supplyVoltage.min, this.ranges.supplyVoltage.max
            ))
        };
    }

    sampleFaultProfile() {
        const r = Math.random();
        let cumulative = 0;
        for (const entry of this.faultDistribution) {
            cumulative += entry.weight;
            if (r <= cumulative) return entry.type;
        }
        return CompressorPhysics.FAULT_TYPES.NONE;
    }

    round(value) {
        return Number(value.toFixed(2));
    }
}

module.exports = MonteCarloEngine;
