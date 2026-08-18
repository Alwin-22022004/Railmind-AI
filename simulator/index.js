require("dotenv").config();

const SimulationEngine = require("./SimulationEngine");

const interval = Number(process.env.SIMULATION_INTERVAL_MS || 1000);
const engine = new SimulationEngine(interval);

engine.start().catch((error) => {
    console.error("❌ Failed to start simulation:", error.message);
    process.exit(1);
});

process.on("SIGINT", () => {
    console.log("\nStopping simulation...");
    engine.stop();
    process.exit(0);
});
