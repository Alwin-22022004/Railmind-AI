const TelemetryPublisher = require("./publisher/TelemetryPublisher");
const MonteCarloEngine = require("./montecarlo/MonteCarloEngine");
const EnvironmentModel = require("./environment/EnvironmentModel");
const AssetManager = require("./assets/common/AssetManager");
const CompressorAsset = require("./assets/compressor/CompressorAsset");

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:5000/api";
const SIMULATOR_KEY = process.env.SIMULATOR_KEY || "";
const DEFAULT_INTERVAL = Number(process.env.SIMULATION_INTERVAL_MS || 1000);

class SimulationEngine {
    constructor(updateInterval = DEFAULT_INTERVAL) {
        this.environment = new EnvironmentModel();
        this.assetManager = new AssetManager();
        this.monteCarlo = new MonteCarloEngine();
        this.publisher = new TelemetryPublisher();
        this.updateInterval = updateInterval;
        this.timer = null;
        this.running = false;
        this.syncInFlight = false;
        this.tickCount = 0;
        this.startTime = null;
        this.lastActiveAssetCodes = [];
    }

    async start() {
        if (this.running) {
            console.log("Simulation is already running.");
            return;
        }

        if (!SIMULATOR_KEY) {
            throw new Error("SIMULATOR_KEY is required for dynamic compressor simulation.");
        }

        this.running = true;
        await this.publisher.initialize();
        this.tickCount = 0;
        this.startTime = Date.now();

        const initialEnvironment = this.monteCarlo.generateEnvironment();
        this.environment.setEnvironment(initialEnvironment);

        await this.syncActiveCompressors();

        console.log("====================================");
        console.log(" Railway Air Compressor Simulation Started");
        console.log(` Backend       : ${BACKEND_API_URL}`);
        console.log(` Interval      : ${this.updateInterval} ms`);
        console.log(` Active assets : ${this.assetManager.getAssets().length}`);
        console.log("====================================");

        this.scheduleNextTick();
    }

    scheduleNextTick() {
        if (!this.running) return;
        this.timer = setTimeout(async () => {
            try {
                await this.tick();
            } catch (error) {
                console.error("[Simulation] Tick failed:", error.message);
            } finally {
                this.scheduleNextTick();
            }
        }, this.updateInterval);
    }

    async syncActiveCompressors() {
        if (this.syncInFlight) return;
        this.syncInFlight = true;

        try {
            const response = await fetch(`${BACKEND_API_URL}/assets/simulation/active`, {
                headers: {
                    "x-simulator-key": SIMULATOR_KEY,
                },
            });

            if (!response.ok) {
                const body = await response.text().catch(() => "");
                throw new Error(`HTTP ${response.status} ${body}`.trim());
            }

            const payload = await response.json();
            if (!payload.success || !Array.isArray(payload.data)) {
                throw new Error("Backend returned an invalid active asset list.");
            }

            this.assetManager.syncCompressorAssets(payload.data, CompressorAsset);
            this.lastActiveAssetCodes = payload.data.map((asset) => asset.asset_code);
        } catch (error) {
            console.error(`[Simulation] Could not sync active compressors: ${error.message}`);
        } finally {
            this.syncInFlight = false;
        }
    }

    async tick() {
        this.tickCount++;

        // Discover newly-created Active compressors and remove deactivated ones.
        await this.syncActiveCompressors();

        // Exactly one simulated timestamp for the whole fleet.
        const tickTimestamp = new Date().toISOString();

        // 1 tick = 1 second of simulated time -> deltaHours = 1/3600.
        this.environment.update(1 / 3600);
        this.environment.evolve();
        const environment = this.environment.getEnvironment();

        const assets = this.assetManager.getAssets();
        const packets = assets.map((asset) => asset.update(environment, tickTimestamp));

        // Publish all compressors for this tick together.
        await this.publisher.publishFleet(this.tickCount, packets, tickTimestamp);
    }

    stop() {
        if (!this.running) return;

        clearTimeout(this.timer);
        this.running = false;

        console.log("\n====================================");
        console.log(" Railway Air Compressor Simulation Stopped");
        console.log("====================================");
    }
}

module.exports = SimulationEngine;
