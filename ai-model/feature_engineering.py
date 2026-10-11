"""
RailMind AI - ML Step 4: Temporal Feature Engineering
------------------------------------------------------
Generates time-series temporal features (lags, differences, rolling statistics,
and trend slopes) for physical sensor signals to capture progressive fault
degradation trends over time.

Project:
    RailMind AI — AI-Based Digital Twin for Railway Air Compressor Health
    Monitoring and Failure Prediction

Input Dataset:
    simulator/output/air_compressor_dataset.csv

Output Artifacts:
    ai-model/engineered_data/
    ├── engineered_dataset.csv
    ├── feature_metadata.json
    └── feature_engineering_report.txt

Key Engineering Decisions:
1. Strict Per-Compressor Grouping (unitId):
   All temporal calculations (diff, rolling mean, rolling std, trend slope) are
   computed strictly within each compressor unit (unitId). No rolling or lagged
   values are ever computed across different compressor units.

2. Chronological Sorting:
   Within each unitId group, records are sorted by timestamp prior to feature derivation.

3. Zero Future Leakage:
   All rolling and lagged features use ONLY past and present observations (backward-looking windows).

4. Target Sensor Signals (6 degradation-critical signals):
   - motorTemperature
   - motorCurrent
   - oilTemperature
   - vibration
   - airPressure
   - compressorLoad

5. Derived Temporal Features (4 per target signal = 24 new features):
   - <feature>_delta_1          : First-order step difference (y_t - y_{t-1})
   - <feature>_rolling_mean_5   : 5-step backward rolling mean
   - <feature>_rolling_std_5    : 5-step backward rolling standard deviation
   - <feature>_slope_5          : 5-step linear trend slope over past observations

6. Initial Row Imputation (Past-Only Safety):
   Initial observations where full 5-step history is unavailable are imputed using
   backward expanding windows (min_periods=1) or zero-change baselines. No future rows
   or synthetic forward-looking values are used.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

# -------------------------------------------------------------------
# PATH CONFIGURATION
# -------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent

CANDIDATE_DATASET_PATHS = [
    SCRIPT_DIR.parent / "simulator" / "output" / "air_compressor_dataset.csv",
    SCRIPT_DIR / ".." / "simulator" / "output" / "air_compressor_dataset.csv",
    Path("simulator/output/air_compressor_dataset.csv"),
]

DATASET_PATH = None
for candidate in CANDIDATE_DATASET_PATHS:
    if candidate.exists():
        DATASET_PATH = candidate.resolve()
        break

if DATASET_PATH is None:
    raise FileNotFoundError("Could not locate air_compressor_dataset.csv in simulator/output/")

OUTPUT_DIR = SCRIPT_DIR / "engineered_data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ENGINEERED_CSV_PATH = OUTPUT_DIR / "engineered_dataset.csv"
METADATA_JSON_PATH = OUTPUT_DIR / "feature_metadata.json"
REPORT_TXT_PATH = OUTPUT_DIR / "feature_engineering_report.txt"

# -------------------------------------------------------------------
# FEATURE & TARGET DEFINITIONS
# -------------------------------------------------------------------
RAW_FEATURE_COLUMNS = [
    "ambientTemperature",
    "airPressure",
    "airflowRate",
    "buildUpTime",
    "vibration",
    "motorCurrent",
    "motorVoltage",
    "motorTemperature",
    "compressorSpeed",
    "oilPressure",
    "oilTemperature",
    "compressorLoad",
    "startStopCycles",
]

TEMPORAL_TARGET_SIGNALS = [
    "motorTemperature",
    "motorCurrent",
    "oilTemperature",
    "vibration",
    "airPressure",
    "compressorLoad",
]

TARGET_COLUMN = "faultType"
GROUP_COLUMN = "unitId"
TIMESTAMP_COLUMN = "timestamp"

EXCLUDED_COLUMNS = [
    "runningHours",
    "healthScore",
    "healthStatus",
    "failureProbability",
    "RUL_hours",
    "maintenanceRecommendation",
]


def generate_unit_temporal_features(group_df: pd.DataFrame) -> pd.DataFrame:
    """Generates temporal features independently for a single compressor unit."""
    group_df = group_df.sort_values(by=TIMESTAMP_COLUMN).copy()

    for col in TEMPORAL_TARGET_SIGNALS:
        s = group_df[col]

        # 1. First difference (delta_1)
        delta_1 = s.diff().fillna(0.0)
        group_df[f"{col}_delta_1"] = delta_1.round(4)

        # 2. Short-term rolling mean (window=5)
        rolling_mean_5 = s.rolling(window=5, min_periods=1).mean()
        group_df[f"{col}_rolling_mean_5"] = rolling_mean_5.round(4)

        # 3. Short-term rolling std (window=5)
        rolling_std_5 = s.rolling(window=5, min_periods=1).std().fillna(0.0)
        group_df[f"{col}_rolling_std_5"] = rolling_std_5.round(4)

        # 4. Trend/slope over previous 5 observations
        y0 = s
        y1 = s.shift(1)
        y2 = s.shift(2)
        y3 = s.shift(3)
        y4 = s.shift(4)

        # Closed-form 5-point linear regression slope
        slope_5 = (2.0 * (y0 - y4) + (y1 - y3)) / 10.0

        # Fallback for initial 1..3 rows using available points from index start
        idx_seq = np.arange(len(s))
        slope_fallback = (s - s.iloc[0]) / np.maximum(1.0, idx_seq)
        slope_5 = slope_5.fillna(slope_fallback).fillna(0.0)

        group_df[f"{col}_slope_5"] = slope_5.round(4)

    return group_df


def main():
    print("=" * 78)
    print("RAILMIND AI - TEMPORAL FEATURE ENGINEERING")
    print("=" * 78)

    # 1. Load original dataset
    print(f"[1/4] Loading original dataset from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)

    original_row_count = len(df)
    unit_count = df[GROUP_COLUMN].nunique()

    # Parse and convert numeric features
    df[TIMESTAMP_COLUMN] = pd.to_datetime(df[TIMESTAMP_COLUMN])
    for col in RAW_FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df.dropna(subset=RAW_FEATURE_COLUMNS + [TARGET_COLUMN, GROUP_COLUMN, TIMESTAMP_COLUMN], inplace=True)
    print(f"      Loaded {original_row_count:,} records across {unit_count} unique compressor units.")

    # 2. Execute per-compressor temporal feature generation
    print(f"[2/4] Generating temporal features per unitId for {len(TEMPORAL_TARGET_SIGNALS)} key signals...")
    print(f"      Signals: {', '.join(TEMPORAL_TARGET_SIGNALS)}")

    # Apply per unitId independently
    unit_dfs = []
    for unit_id, group_df in df.groupby(GROUP_COLUMN):
        processed_group = generate_unit_temporal_features(group_df)
        unit_dfs.append(processed_group)

    engineered_df = pd.concat(unit_dfs, ignore_index=True)

    # Convert timestamp back to string format
    engineered_df[TIMESTAMP_COLUMN] = engineered_df[TIMESTAMP_COLUMN].dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    # Identify all engineered feature columns
    generated_temporal_features = []
    for col in TEMPORAL_TARGET_SIGNALS:
        generated_temporal_features.extend([
            f"{col}_delta_1",
            f"{col}_rolling_mean_5",
            f"{col}_rolling_std_5",
            f"{col}_slope_5",
        ])

    all_feature_columns = RAW_FEATURE_COLUMNS + generated_temporal_features

    # Verify no missing values remaining
    null_counts = engineered_df[all_feature_columns].isnull().sum().sum()
    if null_counts > 0:
        raise ValueError(f"Feature engineering introduced {null_counts} unhandled NaN values!")

    print(f"      Generation Complete:")
    print(f"      - Original Features Count:   {len(RAW_FEATURE_COLUMNS)}")
    print(f"      - Temporal Features Created: {len(generated_temporal_features)}")
    print(f"      - Total Features Count:      {len(all_feature_columns)}")

    # 3. Export engineered dataset CSV
    print(f"[3/4] Exporting engineered dataset to: {ENGINEERED_CSV_PATH}")
    # Export full dataset retaining unitId, timestamp, 37 features, and faultType
    export_columns = [GROUP_COLUMN, TIMESTAMP_COLUMN] + all_feature_columns + [TARGET_COLUMN]
    engineered_df[export_columns].to_csv(ENGINEERED_CSV_PATH, index=False)
    print(f"      Saved: {ENGINEERED_CSV_PATH} ({len(engineered_df):,} rows × {len(export_columns)} columns)")

    # 4. Export feature_metadata.json
    print(f"[4/4] Exporting feature metadata and engineering summary report...")
    metadata = {
        "raw_feature_count": len(RAW_FEATURE_COLUMNS),
        "temporal_feature_count": len(generated_temporal_features),
        "total_feature_count": len(all_feature_columns),
        "raw_feature_names": RAW_FEATURE_COLUMNS,
        "temporal_signals_transformed": TEMPORAL_TARGET_SIGNALS,
        "generated_temporal_features": generated_temporal_features,
        "all_feature_names": all_feature_columns,
        "target_name": TARGET_COLUMN,
        "group_column": GROUP_COLUMN,
        "timestamp_column": TIMESTAMP_COLUMN,
        "excluded_columns": EXCLUDED_COLUMNS,
        "row_count": len(engineered_df),
        "unit_count": unit_count,
        "null_count": int(null_counts),
    }

    with open(METADATA_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)
    print(f"      Saved: {METADATA_JSON_PATH}")

    # 5. Export feature_engineering_report.txt
    lines = [
        "=" * 78,
        "RAILMIND AI - TEMPORAL FEATURE ENGINEERING REPORT",
        "=" * 78,
        f"Source Dataset:         {DATASET_PATH}",
        f"Output CSV:             {ENGINEERED_CSV_PATH}",
        f"Output Metadata:        {METADATA_JSON_PATH}",
        "",
        "-" * 78,
        "1. DATASET & FEATURE COUNT SUMMARY",
        "-" * 78,
        f"Original Dataset Row Count: {original_row_count:,}",
        f"Engineered Row Count:       {len(engineered_df):,}",
        f"Compressor Unit Count:      {unit_count}",
        f"Original Raw Features:      {len(RAW_FEATURE_COLUMNS)}",
        f"New Temporal Features:      {len(generated_temporal_features)}",
        f"Total Output Features:      {len(all_feature_columns)}",
        "",
        "-" * 78,
        "2. TEMPORAL SIGNALS TRANSFORMED",
        "-" * 78,
        f"Target Signals ({len(TEMPORAL_TARGET_SIGNALS)}): {', '.join(TEMPORAL_TARGET_SIGNALS)}",
        "",
        "Transformations applied per signal:",
        "  1. <signal>_delta_1        : 1-step backward step difference (y_t - y_{t-1})",
        "  2. <signal>_rolling_mean_5 : 5-step backward rolling mean",
        "  3. <signal>_rolling_std_5  : 5-step backward rolling standard deviation",
        "  4. <signal>_slope_5        : 5-step backward linear trend slope",
        "",
        "-" * 78,
        "3. COMPLETE LIST OF GENERATED TEMPORAL FEATURES (24)",
        "-" * 78,
    ]

    for idx, feat in enumerate(generated_temporal_features, 1):
        lines.append(f"  {idx:2d}. {feat}")

    lines.extend([
        "",
        "-" * 78,
        "4. MISSING VALUE & LEAKAGE PROTECTION AUDIT",
        "-" * 78,
        "- Group Isolation: [VERIFIED] All rolling and diff calculations were performed independently per unitId.",
        "  No cross-unit rolling or lag leakage occurred.",
        "- Future Data Isolation: [VERIFIED] Only past and present observations (backward-looking windows) were used.",
        "  No future rows were used in any calculation.",
        "- Initial Row Imputation Strategy:",
        "  - delta_1 initial NaN filled with 0.0 (zero initial change assumption).",
        "  - rolling_mean_5 computed with min_periods=1 (expanding window for initial < 5 observations).",
        "  - rolling_std_5 computed with min_periods=1, initial single-point NaNs filled with 0.0.",
        "  - slope_5 computed with 5-point closed-form regression; initial rows fall back to step change relative to startup.",
        "- Final Unhandled NaN Count: 0",
        "",
        "-" * 78,
        "5. SAMPLE TEMPORAL FEATURE EXAMPLES (COMP-001, FIRST 5 ROWS)",
        "-" * 78,
    ])

    sample_comp1 = engineered_df[engineered_df[GROUP_COLUMN] == "COMP-001"].head(5)
    sample_cols = [TIMESTAMP_COLUMN, "motorTemperature", "motorTemperature_delta_1", "motorTemperature_rolling_mean_5", "motorTemperature_rolling_std_5", "motorTemperature_slope_5"]

    lines.append(sample_comp1[sample_cols].to_string(index=False))

    lines.extend([
        "",
        "=" * 78,
        "END OF FEATURE ENGINEERING REPORT",
        "=" * 78,
    ])

    report_text = "\n".join(lines)
    with open(REPORT_TXT_PATH, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(f"      Saved: {REPORT_TXT_PATH}")
    print("\n" + report_text + "\n")


if __name__ == "__main__":
    main()
