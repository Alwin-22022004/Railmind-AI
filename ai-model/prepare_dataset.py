"""
RailMind AI - ML Step 2: Dataset Preparation
----------------------------------------------
Prepares baseline training and testing datasets for physical air compressor
fault classification.

Project:
    RailMind AI — AI-Based Digital Twin for Railway Air Compressor Health
    Monitoring and Failure Prediction

Dataset input:
    simulator/output/air_compressor_dataset.csv

Dataset output:
    ai-model/prepared_data/
    ├── train.csv
    ├── test.csv
    ├── feature_metadata.json
    └── dataset_split_summary.txt

Key Design Decisions:
1. Feature Selection:
   Uses 13 physical and operational sensor measurements:
   - ambientTemperature, airPressure, airflowRate, buildUpTime, vibration,
     motorCurrent, motorVoltage, motorTemperature, compressorSpeed,
     oilPressure, oilTemperature, compressorLoad, startStopCycles.

2. Excluded Columns:
   - unitId: Prevents asset identity leakage. The ML model must learn physical
     telemetry patterns across compressors rather than memorizing unit IDs.
   - timestamp & runningHours: Prevents temporal and cumulative lifecycle leakage.
   - healthScore, healthStatus, failureProbability, RUL_hours, maintenanceRecommendation:
     Prevents target/derived metadata leakage into the fault classifier.

3. Grouped Train/Test Splitting:
   - Grouped by `unitId` to ensure no time-series data leaks between training
     and testing sets for the same compressor unit.
   - Target test size: ~20% of total dataset records.
   - Class representation: Ensures all fault classes are present in both
     training and testing sets across compressor groups.
   - Reproducibility: Deterministic random_state.
   - No synthetic oversampling: Preserves original telemetry distribution.
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

# Locate input dataset safely
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
    raise FileNotFoundError(
        "Could not locate air_compressor_dataset.csv in simulator/output/"
    )

OUTPUT_DIR = SCRIPT_DIR / "prepared_data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------------
# FEATURE & TARGET DEFINITIONS
# -------------------------------------------------------------------

# 13 Sensor and Operational features selected for baseline model
FEATURE_COLUMNS = [
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

TARGET_COLUMN = "faultType"

# Columns intentionally excluded from model features
EXCLUDED_COLUMNS = [
    "unitId",
    "timestamp",
    "runningHours",
    "healthScore",
    "healthStatus",
    "failureProbability",
    "RUL_hours",
    "maintenanceRecommendation",
]

# Detailed reasons for exclusions (documented in report and code)
EXCLUSION_REASONS = {
    "unitId": "Identity leakage risk. The model must learn physical telemetry patterns across units rather than memorizing specific compressor IDs.",
    "timestamp": "Temporal index leakage risk. Baseline classification evaluates instantaneous physical sensor states.",
    "runningHours": "Cumulative degradation index. Direct proxy for total operational wear across unit lifecycle.",
    "healthScore": "Synthetic health indicator derived by simulation engine (target leakage).",
    "healthStatus": "Categorical health state derived from health probability thresholds (target leakage).",
    "failureProbability": "Calculated failure probability metric (target leakage).",
    "RUL_hours": "Target metric reserved for regression/RUL prediction tasks (target leakage).",
    "maintenanceRecommendation": "Rule-based decision text derived from health state (target leakage).",
}

RANDOM_STATE = 42
TARGET_TEST_SIZE = 0.20


# -------------------------------------------------------------------
# DATA PREPARATION FUNCTIONS
# -------------------------------------------------------------------

def load_and_validate_dataset(csv_path: Path) -> pd.DataFrame:
    """Loads CSV, validates column schema and data types, and sorts by asset/timestamp."""
    print(f"[1/5] Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)

    # Check required columns
    required_cols = FEATURE_COLUMNS + [TARGET_COLUMN, "unitId", "timestamp"]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")

    # Validate and clean numeric features
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Check for NaN values in features or target
    initial_len = len(df)
    df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN, "unitId"], inplace=True)
    dropped_count = initial_len - len(df)
    if dropped_count > 0:
        print(f"      Warning: Dropped {dropped_count} rows containing NaN values.")
    else:
        print("      Data validation passed: No missing values in feature or target columns.")

    # Sort deterministically by unitId and timestamp
    df.sort_values(by=["unitId", "timestamp"], inplace=True)
    df.reset_index(drop=True, inplace=True)

    print(f"      Loaded {len(df):,} valid records across {df['unitId'].nunique()} unique compressor units.")
    return df


def perform_grouped_split(
    df: pd.DataFrame,
    target_col: str = TARGET_COLUMN,
    group_col: str = "unitId",
    target_test_ratio: float = TARGET_TEST_SIZE,
    seed: int = RANDOM_STATE,
):
    """
    Performs a grouped train/test split on compressor unitId using pure Pandas & NumPy.

    Ensures:
    1. Records from the same compressor never appear in both train and test.
    2. Test size is approximately target_test_ratio (~20%).
    3. All target fault classes are represented in both train and test sets if possible.
    """
    print(f"[2/5] Performing Grouped Train/Test Split (target test ratio: {target_test_ratio:.0%}, seed={seed})...")

    all_classes = set(df[target_col].unique())
    unit_row_counts = df.groupby(group_col).size()
    total_rows = len(df)
    target_test_rows = total_rows * target_test_ratio

    # Assign each unit a primary fault class (or NONE if unit has no faults)
    def get_unit_primary_fault(unit_df):
        faults = [f for f in unit_df[target_col].unique() if f != "NONE"]
        return faults[0] if faults else "NONE"

    unit_primary_faults = df.groupby(group_col).apply(get_unit_primary_fault)
    fault_to_units = {}
    for unit, fault in unit_primary_faults.items():
        fault_to_units.setdefault(fault, []).append(unit)

    best_split = None
    best_score = float("inf")

    # Deterministic search across candidate seeds for optimal group allocation
    for search_seed in range(seed, seed + 100):
        rng = np.random.RandomState(search_seed)
        test_units = []

        # From each primary fault category, select approx 20% of compressor units for test
        for fault_cls, units in sorted(fault_to_units.items()):
            shuffled_units = units.copy()
            rng.shuffle(shuffled_units)
            # Pick at least 1 unit if units >= 2, targeting ~20%
            num_test = max(1, int(round(len(shuffled_units) * target_test_ratio)))
            if num_test >= len(shuffled_units):
                num_test = len(shuffled_units) - 1  # ensure at least 1 remains in train
            test_units.extend(shuffled_units[:num_test])

        train_units = [u for u in unit_row_counts.index if u not in test_units]

        train_sub = df[df[group_col].isin(train_units)]
        test_sub = df[df[group_col].isin(test_units)]

        actual_test_ratio = len(test_sub) / total_rows
        ratio_diff = abs(actual_test_ratio - target_test_ratio)

        train_classes = set(train_sub[target_col].unique())
        test_classes = set(test_sub[target_col].unique())

        missing_train = all_classes - train_classes
        missing_test = all_classes - test_classes

        class_penalty = (len(missing_train) + len(missing_test)) * 10.0

        train_dist = train_sub[target_col].value_counts(normalize=True).to_dict()
        test_dist = test_sub[target_col].value_counts(normalize=True).to_dict()

        dist_diff = sum(
            abs(train_dist.get(c, 0.0) - test_dist.get(c, 0.0)) for c in all_classes
        )

        score = ratio_diff + class_penalty + dist_diff

        if score < best_score:
            best_score = score
            best_split = {
                "train_units": train_units,
                "test_units": test_units,
                "missing_train": missing_train,
                "missing_test": missing_test,
                "seed": search_seed,
                "actual_test_ratio": actual_test_ratio,
            }

        if ratio_diff < 0.02 and len(missing_train) == 0 and len(missing_test) == 0:
            break

    train_df = df[df[group_col].isin(best_split["train_units"])].copy()
    test_df = df[df[group_col].isin(best_split["test_units"])].copy()

    # Verify unit isolation
    train_units_set = set(best_split["train_units"])
    test_units_set = set(best_split["test_units"])
    overlap = train_units_set.intersection(test_units_set)
    if overlap:
        raise RuntimeError(f"Group isolation violation! Overlapping units found: {overlap}")

    # Check for missing classes and prepare warnings if needed
    warnings_list = []
    if best_split["missing_train"]:
        warn_msg = f"WARNING: Target class(es) missing from TRAINING split: {sorted(list(best_split['missing_train']))}"
        warnings_list.append(warn_msg)
        print(f"      {warn_msg}")

    if best_split["missing_test"]:
        warn_msg = f"WARNING: Target class(es) missing from TESTING split: {sorted(list(best_split['missing_test']))}"
        warnings_list.append(warn_msg)
        print(f"      {warn_msg}")

    if not warnings_list:
        print("      Split check passed: All target classes are present in BOTH train and test splits!")

    print(f"      Selected Split Summary:")
    print(f"      - Training set: {len(train_df):,} rows ({len(train_df)/len(df):.2%}) across {len(train_units_set)} units.")
    print(f"      - Testing set:  {len(test_df):,} rows ({len(test_df)/len(df):.2%}) across {len(test_units_set)} units.")

    return train_df, test_df, best_split, warnings_list


def export_prepared_datasets(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    original_df: pd.DataFrame,
    split_info: dict,
    warnings_list: list[str],
):
    """Saves train.csv, test.csv, feature_metadata.json, and dataset_split_summary.txt."""
    print(f"[3/5] Saving prepared CSV datasets to {OUTPUT_DIR}...")

    # Final column ordering: 13 features + target column
    output_columns = FEATURE_COLUMNS + [TARGET_COLUMN]

    train_out = train_df[output_columns].copy()
    test_out = test_df[output_columns].copy()

    train_path = OUTPUT_DIR / "train.csv"
    test_path = OUTPUT_DIR / "test.csv"

    train_out.to_csv(train_path, index=False)
    test_out.to_csv(test_path, index=False)
    print(f"      Saved: {train_path} ({len(train_out):,} rows)")
    print(f"      Saved: {test_path} ({len(test_out):,} rows)")

    # Compute class distributions
    train_counts = train_df[TARGET_COLUMN].value_counts().to_dict()
    test_counts = test_df[TARGET_COLUMN].value_counts().to_dict()
    all_target_classes = sorted(list(original_df[TARGET_COLUMN].unique()))

    train_class_dist = {
        cls: {
            "count": int(train_counts.get(cls, 0)),
            "percentage": round(float(train_counts.get(cls, 0) / len(train_df) * 100), 2),
        }
        for cls in all_target_classes
    }

    test_class_dist = {
        cls: {
            "count": int(test_counts.get(cls, 0)),
            "percentage": round(float(test_counts.get(cls, 0) / len(test_df) * 100), 2),
        }
        for cls in all_target_classes
    }

    # 4. Save feature_metadata.json
    print(f"[4/5] Generating feature_metadata.json...")
    metadata = {
        "feature_names": FEATURE_COLUMNS,
        "target_name": TARGET_COLUMN,
        "excluded_columns": EXCLUDED_COLUMNS,
        "exclusion_reasons": EXCLUSION_REASONS,
        "train_row_count": len(train_df),
        "test_row_count": len(test_df),
        "train_unit_count": int(train_df["unitId"].nunique()),
        "test_unit_count": int(test_df["unitId"].nunique()),
        "class_distribution": {
            "train": train_class_dist,
            "test": test_class_dist,
        },
        "random_state": split_info["seed"],
        "test_size": round(float(split_info["actual_test_ratio"]), 4),
    }

    metadata_path = OUTPUT_DIR / "feature_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)
    print(f"      Saved: {metadata_path}")

    # 5. Save dataset_split_summary.txt
    print(f"[5/5] Generating dataset_split_summary.txt...")
    summary_path = OUTPUT_DIR / "dataset_split_summary.txt"

    lines = [
        "=" * 78,
        "RAILMIND AI - DATASET PREPARATION SUMMARY REPORT",
        "=" * 78,
        f"Input Dataset:       {DATASET_PATH}",
        f"Output Directory:    {OUTPUT_DIR}",
        f"Random State / Seed: {split_info['seed']}",
        f"Target Test Size:    ~{TARGET_TEST_SIZE:.0%} (Actual: {split_info['actual_test_ratio']:.2%})",
        "",
        "-" * 78,
        "1. ROW & UNIT COUNTS",
        "-" * 78,
        f"Original Dataset Row Count: {len(original_df):,}",
        f"Prepared Dataset Row Count: {len(train_df) + len(test_df):,}",
        f"Training Rows:              {len(train_df):,} ({len(train_df)/len(original_df):.2%})",
        f"Testing Rows:               {len(test_df):,} ({len(test_df)/len(original_df):.2%})",
        f"Total Unique Units:         {original_df['unitId'].nunique()}",
        f"Training Unique Units:      {train_df['unitId'].nunique()}",
        f"Testing Unique Units:       {test_df['unitId'].nunique()}",
        f"Testing Unit IDs:           {sorted(list(split_info['test_units']))}",
        "",
        "-" * 78,
        "2. FEATURE SCHEMA",
        "-" * 78,
        f"Feature Count: {len(FEATURE_COLUMNS)} sensor/operating features",
        f"Target Column: {TARGET_COLUMN}",
        "",
        "Selected Feature Columns:",
    ]

    for idx, feat in enumerate(FEATURE_COLUMNS, 1):
        lines.append(f"  {idx:2d}. {feat}")

    lines.extend([
        "",
        "Excluded Columns (with rationale):",
    ])
    for col in EXCLUDED_COLUMNS:
        reason = EXCLUSION_REASONS.get(col, "Excluded from baseline model.")
        lines.append(f"  - {col}: {reason}")

    lines.extend([
        "",
        "-" * 78,
        "3. CLASS DISTRIBUTION BY SPLIT",
        "-" * 78,
        f"{'Class Name':<20} | {'Train Count':<12} | {'Train %':<8} | {'Test Count':<12} | {'Test %':<8}",
        "-" * 78,
    ])

    for cls in all_target_classes:
        tr_cnt = train_class_dist[cls]["count"]
        tr_pct = train_class_dist[cls]["percentage"]
        te_cnt = test_class_dist[cls]["count"]
        te_pct = test_class_dist[cls]["percentage"]
        lines.append(
            f"{cls:<20} | {tr_cnt:<12,} | {tr_pct:<7.2f}% | {te_cnt:<12,} | {te_pct:<7.2f}%"
        )

    lines.extend([
        "-" * 78,
        "",
        "-" * 78,
        "4. VALIDATION & WARNINGS",
        "-" * 78,
    ])

    if warnings_list:
        for w in warnings_list:
            lines.append(f"[!] {w}")
    else:
        lines.append("[OK] Group isolation verified: 0 overlapping compressor units between train and test.")
        lines.append("[OK] Class coverage verified: All fault classes represented in both train and test splits.")

    lines.extend([
        "",
        "=" * 78,
        "END OF DATASET PREPARATION SUMMARY",
        "=" * 78,
    ])

    summary_text = "\n".join(lines)
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(summary_text)

    print(f"      Saved: {summary_path}")
    print("\n" + summary_text + "\n")


# -------------------------------------------------------------------
# MAIN EXECUTION ENTRYPOINT
# -------------------------------------------------------------------

def main():
    print("=" * 78)
    print("RAILMIND AI - ML DATASET PREPARATION")
    print("=" * 78)

    # 1. Load and validate
    df = load_and_validate_dataset(DATASET_PATH)

    # 2. Perform Grouped Train/Test Split
    train_df, test_df, split_info, warnings_list = perform_grouped_split(
        df=df,
        target_col=TARGET_COLUMN,
        group_col="unitId",
        target_test_ratio=TARGET_TEST_SIZE,
        seed=RANDOM_STATE,
    )

    # 3. Export prepared datasets and metadata
    export_prepared_datasets(
        train_df=train_df,
        test_df=test_df,
        original_df=df,
        split_info=split_info,
        warnings_list=warnings_list,
    )

    print("=" * 78)
    print("DATASET PREPARATION COMPLETED SUCCESSFULLY.")
    print("=" * 78)


if __name__ == "__main__":
    main()
