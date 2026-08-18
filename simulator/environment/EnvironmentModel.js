class EnvironmentModel {

    constructor() {

        this.environment = {

            // Outside environmental conditions
            ambientTemperature: 30,      // °C
            humidity: 60,                // %
            atmosphericPressure: 101.3,  // kPa

            // Train operating conditions that drive compressor duty cycle
            brakeDemandLevel: 0.5,       // 0-1, driven by braking / door / suspension air usage
            trainSpeed: 80,              // km/h

            // Electrical conditions
            supplyVoltage: 415,          // V (3-phase)
            supplyFrequency: 50,         // Hz

            // Asset information
            operatingHours: 0            // hours
        };

    }

    round(value) {
        return Number(value.toFixed(2));
    }

    update(deltaHours = 1) {

        this.environment.operatingHours += deltaHours;

    }

    evolve() {

        // Ambient temperature drifts slowly (depot / weather cycle)
        this.environment.ambientTemperature +=
            (Math.random() - 0.5) * 0.4;

        this.environment.ambientTemperature =
            this.round(
                Math.max(10, Math.min(48, this.environment.ambientTemperature))
            );

        this.environment.humidity +=
            (Math.random() - 0.5) * 0.6;

        this.environment.humidity =
            this.round(
                Math.max(20, Math.min(95, this.environment.humidity))
            );

        // Brake / air demand fluctuates with occasional high-demand spikes
        // (station stops, emergency braking, door cycling)
        let demandStep = (Math.random() - 0.5) * 0.15;

        if (Math.random() < 0.06) {
            demandStep += Math.random() * 0.5; // demand spike event
        }

        this.environment.brakeDemandLevel =
            Math.max(0.15, Math.min(1.0, this.environment.brakeDemandLevel + demandStep));

        this.environment.trainSpeed +=
            Math.floor(Math.random() * 9) - 4;

        this.environment.trainSpeed =
            Math.max(0, Math.min(120, this.environment.trainSpeed));

        this.environment.supplyVoltage +=
            (Math.random() - 0.5) * 1.0;

        this.environment.supplyVoltage =
            this.round(
                Math.max(380, Math.min(440, this.environment.supplyVoltage))
            );
    }

    setEnvironment(newEnvironment) {

        this.environment = {
            ...this.environment,
            ...newEnvironment
        };

    }

    getMutableEnvironment() {

        return this.environment;

    }

    getEnvironment() {

        return {
            ...this.environment
        };

    }

}

module.exports = EnvironmentModel;
