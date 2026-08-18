# Railway Air Compressor Simulation

Physics-informed digital-twin simulation and AI training-dataset generator
for a railway air compressor, built as a companion to the existing
Railway HVAC Simulation project (same architecture, same design
patterns), aligned to the abstract:

> "A Data-Driven Approach for Railway Air Compressor Failure Prediction
> and Health Monitoring Using Artificial Intelligence"

## What this gives you

1. **A live digital-twin simulation** (`index.js` / `SimulationEngine.js`)
   that ticks once per second, evolves the environment, updates compressor
   physics, computes health, raises events, and publishes a telemetry
   packet — to the console, and over HTTP to the RailMind backend's
   `POST /api/telemetry` endpoint (see `publisher/HttpPublisher.js`).
   If the backend isn't running, it logs a one-time warning and keeps
   retrying every tick — nothing crashes, it just isn't delivered yet.

   By default it targets `http://localhost:5000/api/telemetry`. Override
   with an env var if your backend runs elsewhere:
   ```bash
   BACKEND_URL=http://localhost:5000/api/telemetry npm start
   ```

2. **An offline dataset generator** (`scripts/generateDataset.js`) that
   simulates a *fleet* of compressors, each running from "new" through
   to failure (or long-term healthy operation), and writes a labeled
   CSV dataset ready for the Python/Scikit-learn AI module described in
   the abstract.

## Telemetry channels (matches the abstract's parameter list)

| Field | Unit | Description |
|---|---|---|
| airPressure | bar | discharge/reservoir pressure |
| airflowRate | L/min | delivered free-air volume |
| buildUpTime | s | time to build cut-in → cut-out pressure |
| vibration | mm/s RMS | overall vibration severity |
| motorCurrent | A | motor line current |
| motorVoltage | V | 3-phase supply voltage at the motor |
| motorTemperature | °C | motor winding/casing temperature |
| compressorSpeed | RPM | shaft speed |
| oilPressure | bar | lubrication oil pressure |
| oilTemperature | °C | lubrication oil temperature |
| runningHours | h | cumulative run time |
| compressorLoad | % | duty cycle / loading, driven by train air demand |
| startStopCycles | count | cumulative start/stop cycles |
| ambientTemperature | °C | depot/ambient temperature |

## Labels produced for each row (AI training targets)

| Field | Description |
|---|---|
| healthScore | 0–100 composite health index |
| healthStatus | HEALTHY / GOOD / WARNING / MAINTENANCE_REQUIRED / CRITICAL |
| failureProbability | 0–1, logistic function of healthScore |
| faultType | NONE / AIR_LEAKAGE / BEARING_FAULT / OIL_DEGRADATION / MOTOR_OVERHEATING / FILTER_CLOGGING |
| RUL_hours | Remaining Useful Life in hours until the unit's failure point |
| maintenanceRecommendation | Rule-based suggested action, for the recommendation module |

`faultType` and `RUL_hours` are ground-truth labels known from the
simulation (each simulated unit is secretly assigned a dominant wear
channel that degrades to failure), so they're exactly what a
classifier (fault type) and a regressor (RUL / failure probability)
would be trained against.

## How the physics works

Each compressor has five independent, hidden **wear channels** (0 = new,
1 = failed) that degrade over running hours, accelerated by ambient heat
and duty load:

- `leakWear` — valve/piping air leakage → drags down pressure, airflow, build-up time → **AIR_LEAKAGE**
- `bearingWear` — mechanical wear → drives vibration and current up → **BEARING_FAULT**
- `oilWear` — oil degradation → drives oil pressure down, oil temp up → **OIL_DEGRADATION**
- `motorWear` — winding/insulation wear → drives motor temperature and current up → **MOTOR_OVERHEATING**
- `filterWear` — intake filter clogging → drives airflow down, current up → **FILTER_CLOGGING**

Every unit accrues a small amount of baseline wear on all five channels
(so "healthy" units still age realistically), and ~72% of simulated
units are additionally assigned one dominant fault channel that
degrades 20–50x faster, driving that unit to failure within the
simulated horizon. The rest run out their full simulated lifetime
without a dominant fault (label `NONE`), so the dataset has a realistic,
imbalanced-but-learnable class mix — exactly like real-world failure
data.

## Running it

```bash
# Live console/Kafka simulation (1 tick = 1 second = 1/3600 h)
npm start

# Generate the training dataset
node scripts/generateDataset.js [units] [sampleIntervalHours] [maxHours]

# e.g. a larger dataset:
node scripts/generateDataset.js 80 2 25000
```

Output lands in `output/`:
- `air_compressor_dataset.csv` — the full labeled dataset (already generated, ~118K rows / 50 units in this delivery)
- `air_compressor_dataset_sample.json` — first 20 rows, for quick inspection

## Project structure

```
Railway-AirCompressor-Simulation/
├── assets/
│   ├── common/          BaseAsset, AssetManager (shared abstraction)
│   └── compressor/       CompressorPhysics, CompressorHealth, CompressorAsset
├── environment/          EnvironmentModel (ambient + train duty context)
├── events/                EventModel, EventRules, EventEngine (fault alerts)
├── state/                 AssetState, StateMachine
├── diagnostics/           HealthAssessment
├── telemetry/             TelemetryModel (packet shape)
├── montecarlo/            MonteCarloEngine (environment + fault sampling)
├── publisher/              TelemetryPublisher (console/Kafka output)
├── kafka/                  KafkaProducer (optional, safe no-op fallback)
├── scripts/
│   └── generateDataset.js  <- the dataset generator
├── output/                 generated CSV/JSON datasets
├── SimulationEngine.js     live tick loop
├── index.js                 live-mode entry point
└── package.json
```

## Using the dataset with the Python AI module

```python
import pandas as pd

df = pd.read_csv("output/air_compressor_dataset.csv")

# Features (as described in the abstract)
feature_cols = [
    "airPressure", "airflowRate", "buildUpTime", "vibration",
    "motorCurrent", "motorVoltage", "motorTemperature", "compressorSpeed",
    "oilPressure", "oilTemperature", "runningHours", "compressorLoad",
    "startStopCycles", "ambientTemperature"
]

X = df[feature_cols]
y_fault = df["faultType"]          # classification target
y_health = df["healthScore"]        # regression target
y_rul = df["RUL_hours"]              # regression target (predictive maintenance)
```

## Notes / next steps

- This is a synthetic dataset built from a physics-informed model, not
  real sensor data — good for prototyping the ML pipeline and
  end-to-end architecture now, and can be swapped for real telemetry
  later without changing the AI module's interface.
- To widen or narrow class balance, adjust `faultDistribution` in
  `montecarlo/MonteCarloEngine.js`.
- To make units fail faster/slower, adjust `faultAccelerator` in
  `scripts/generateDataset.js`.


## Dynamic active compressor fleet

The simulator now discovers active compressors from the RailMind backend on every simulation tick.
- Seeded assets: COMP-001 through COMP-008.
- Admin-created assets with status `Active` are picked up automatically.
- Changing an asset to `Idle` or `Decommissioned` removes it from the simulation on the next synchronization.
- All active compressors are simulated during the same tick with one shared simulation timestamp.
- HTTP telemetry is sent for every active compressor in that tick and persisted by the backend.

Backend configuration:
`SIMULATOR_KEY=railmind-local-simulator` (or set your own key in both backend and simulator environments).
