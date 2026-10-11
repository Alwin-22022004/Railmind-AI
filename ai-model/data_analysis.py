"""
RailMind AI - ML Step 1
-----------------------
Dataset analysis and ML-readiness assessment for the
physics-informed railway air-compressor dataset.

Dataset:
    ../simulator/output/air_compressor_dataset.csv

This script:
1. Loads and validates the dataset.
2. Reports dataset size and schema.
3. Checks missing values and duplicates.
4. Checks duplicate asset/timestamp combinations.
5. Analyses compressor/unit distribution.
6. Analyses fault-class distribution.
7. Analyses health-status distribution.
8. Analyses RUL statistics.
9. Checks numeric ranges and suspicious values.
10. Generates correlation analysis.
11. Identifies possible ML target-leakage risks.
12. Generates simple plots.
13. Writes a complete text report and CSV summaries.

IMPORTANT:
- No model training is performed here.
- No data is modified.
- This is an analysis-only step.
"""

from __future__ import annotations

from pathlib import Path
import sys
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

# Matplotlib is used only for saving analysis plots.
import matplotlib.pyplot as plt


# -------------------------------------------------------------------
# PATH CONFIGURATION
# -------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent

# Current project structure:
# RailMind-AI/
# ├── ai-model/
# │   └── data_analysis.py
# └── simulator/
#     └── output/
#         └── air_compressor_dataset.csv

DATASET_PATH = (
    SCRIPT_DIR.parent
    / "simulator"
    / "output"
    / "air_compressor_dataset.csv"
)

OUTPUT_DIR = SCRIPT_DIR / "analysis_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# -------------------------------------------------------------------
# EXPECTED RAILMIND DATASET COLUMNS
# -------------------------------------------------------------------

EXPECTED_COLUMNS = [
    "unitId",
    "timestamp",
    "runningHours",
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
    "healthScore",
    "healthStatus",
    "failureProbability",
    "faultType",
    "RUL_hours",
    "maintenanceRecommendation",
]

NUMERIC_COLUMNS = [
    "runningHours",
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
    "healthScore",
    "failureProbability",
    "RUL_hours",
]

CATEGORICAL_COLUMNS = [
    "unitId",
    "healthStatus",
    "faultType",
    "maintenanceRecommendation",
]

# Fields that may be highly informative about the target.
# We DO NOT remove them here.
POTENTIAL_LEAKAGE_COLUMNS = [
    "healthScore",
    "failureProbability",
    "runningHours",
]

# Basic physical sanity limits.
# These are sanity checks only, not final operating limits.
PHYSICAL_CHECKS = {
    "runningHours": {"min": 0},
    "airPressure": {"min": 0},
    "airflowRate": {"min": 0},
    "buildUpTime": {"min": 0},
    "vibration": {"min": 0},
    "motorCurrent": {"min": 0},
    "motorVoltage": {"min": 0},
    "motorTemperature": {"min": -40, "max": 150},
    "compressorSpeed": {"min": 0},
    "oilPressure": {"min": 0},
    "oilTemperature": {"min": -40, "max": 150},
    "compressorLoad": {"min": 0, "max": 100},
    "startStopCycles": {"min": 0},
    "healthScore": {"min": 0, "max": 100},
    "failureProbability": {"min": 0, "max": 1},
    "RUL_hours": {"min": 0},
}


# -------------------------------------------------------------------
# HELPER FUNCTIONS
# -------------------------------------------------------------------

def section(title: str) -> str:
    line = "=" * 78
    return f"\n{line}\n{title}\n{line}\n"


def print_and_write(report_lines: list[str], text: str = "") -> None:
    print(text)
    report_lines.append(text)


def save_plot(fig: plt.Figure, filename: str) -> None:
    path = OUTPUT_DIR / filename
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved plot: {path}")


def safe_numeric_series(df: pd.DataFrame, column: str) -> pd.Series:
    return pd.to_numeric(df[column], errors="coerce")


# -------------------------------------------------------------------
# LOAD DATA
# -------------------------------------------------------------------

def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        print(f"\nERROR: Dataset not found:")
        print(DATASET_PATH)
        print("\nExpected file:")
        print("../simulator/output/air_compressor_dataset.csv")
        sys.exit(1)

    try:
        df = pd.read_csv(DATASET_PATH)
    except Exception as exc:
        print(f"\nERROR: Could not read dataset: {exc}")
        sys.exit(1)

    return df


# -------------------------------------------------------------------
# MAIN ANALYSIS
# -------------------------------------------------------------------

def main() -> None:
    report_lines: list[str] = []

    df = load_dataset()

    print(section("RAILMIND AI - ML DATASET ANALYSIS"))

    print_and_write(
        report_lines,
        f"Dataset file: {DATASET_PATH}"
    )

    print_and_write(
        report_lines,
        f"Rows: {len(df):,}"
    )

    print_and_write(
        report_lines,
        f"Columns: {len(df.columns)}"
    )

    print_and_write(
        report_lines,
        f"Unique compressor units: "
        f"{df['unitId'].nunique() if 'unitId' in df.columns else 'N/A'}"
    )

    # ---------------------------------------------------------------
    # 1. SCHEMA
    # ---------------------------------------------------------------

    print(section("1. DATASET SCHEMA"))

    print("Columns:")
    for i, column in enumerate(df.columns, start=1):
        print(f"{i:2d}. {column:<30} {df[column].dtype}")

    report_lines.append(section("1. DATASET SCHEMA"))
    for i, column in enumerate(df.columns, start=1):
        report_lines.append(
            f"{i:2d}. {column:<30} {df[column].dtype}"
        )

    # ---------------------------------------------------------------
    # 2. EXPECTED COLUMN CHECK
    # ---------------------------------------------------------------

    print(section("2. EXPECTED COLUMN CHECK"))

    missing_expected = [
        col for col in EXPECTED_COLUMNS if col not in df.columns
    ]

    unexpected = [
        col for col in df.columns if col not in EXPECTED_COLUMNS
    ]

    if missing_expected:
        print("Missing expected columns:")
        for col in missing_expected:
            print(f"  - {col}")
    else:
        print("All expected RailMind columns are present.")

    if unexpected:
        print("\nAdditional columns:")
        for col in unexpected:
            print(f"  - {col}")
    else:
        print("\nNo unexpected columns found.")

    report_lines.append(section("2. EXPECTED COLUMN CHECK"))
    report_lines.append(
        "Missing expected columns: "
        + (", ".join(missing_expected) if missing_expected else "None")
    )
    report_lines.append(
        "Additional columns: "
        + (", ".join(unexpected) if unexpected else "None")
    )

    # ---------------------------------------------------------------
    # 3. MISSING VALUES
    # ---------------------------------------------------------------

    print(section("3. MISSING VALUE ANALYSIS"))

    missing_counts = df.isna().sum()
    missing_percent = (missing_counts / len(df) * 100).round(4)

    missing_report = pd.DataFrame(
        {
            "missing_count": missing_counts,
            "missing_percent": missing_percent,
        }
    )

    missing_report.to_csv(
        OUTPUT_DIR / "missing_values.csv"
    )

    if missing_counts.sum() == 0:
        print("No missing values found.")
    else:
        print(missing_report[missing_report["missing_count"] > 0])

    report_lines.append(section("3. MISSING VALUE ANALYSIS"))
    report_lines.append(
        f"Total missing cells: {int(missing_counts.sum()):,}"
    )

    # ---------------------------------------------------------------
    # 4. DUPLICATES
    # ---------------------------------------------------------------

    print(section("4. DUPLICATE ANALYSIS"))

    duplicate_rows = int(df.duplicated().sum())

    print(f"Duplicate complete rows: {duplicate_rows:,}")

    duplicate_asset_time = 0

    if {"unitId", "timestamp"}.issubset(df.columns):
        duplicate_asset_time = int(
            df.duplicated(subset=["unitId", "timestamp"]).sum()
        )

    print(
        "Duplicate unitId + timestamp combinations: "
        f"{duplicate_asset_time:,}"
    )

    report_lines.append(section("4. DUPLICATE ANALYSIS"))
    report_lines.append(
        f"Duplicate complete rows: {duplicate_rows:,}"
    )
    report_lines.append(
        "Duplicate unitId + timestamp combinations: "
        f"{duplicate_asset_time:,}"
    )

    # ---------------------------------------------------------------
    # 5. UNIT ANALYSIS
    # ---------------------------------------------------------------

    print(section("5. COMPRESSOR UNIT ANALYSIS"))

    if "unitId" in df.columns:
        unit_counts = (
            df["unitId"]
            .value_counts()
            .sort_index()
        )

        print(f"Unique compressor units: {unit_counts.size}")
        print("\nRows per unit:")
        print(unit_counts.to_string())

        unit_counts.to_csv(
            OUTPUT_DIR / "rows_per_unit.csv",
            header=["row_count"]
        )

        report_lines.append(section("5. COMPRESSOR UNIT ANALYSIS"))
        report_lines.append(
            f"Unique compressor units: {unit_counts.size}"
        )
        report_lines.append(unit_counts.to_string())

    # ---------------------------------------------------------------
    # 6. TIME ANALYSIS
    # ---------------------------------------------------------------

    print(section("6. TIMESTAMP ANALYSIS"))

    if "timestamp" in df.columns:
        timestamps = pd.to_datetime(
            df["timestamp"],
            errors="coerce"
        )

        invalid_timestamps = int(timestamps.isna().sum())

        print(f"Invalid timestamps: {invalid_timestamps:,}")

        if invalid_timestamps == 0:
            print(f"Start: {timestamps.min()}")
            print(f"End:   {timestamps.max()}")
            print(f"Duration: {timestamps.max() - timestamps.min()}")

        report_lines.append(section("6. TIMESTAMP ANALYSIS"))
        report_lines.append(
            f"Invalid timestamps: {invalid_timestamps:,}"
        )

        if invalid_timestamps == 0:
            report_lines.append(f"Start: {timestamps.min()}")
            report_lines.append(f"End: {timestamps.max()}")
            report_lines.append(
                f"Duration: {timestamps.max() - timestamps.min()}"
            )

    # ---------------------------------------------------------------
    # 7. FAULT DISTRIBUTION
    # ---------------------------------------------------------------

    print(section("7. FAULT TYPE DISTRIBUTION"))

    if "faultType" in df.columns:
        fault_counts = df["faultType"].value_counts(dropna=False)
        fault_percent = (
            fault_counts / len(df) * 100
        ).round(2)

        fault_report = pd.DataFrame(
            {
                "count": fault_counts,
                "percentage": fault_percent,
            }
        )

        print(fault_report.to_string())

        fault_report.to_csv(
            OUTPUT_DIR / "fault_distribution.csv"
        )

        # Plot
        fig = plt.figure(figsize=(10, 6))
        fault_counts.plot(kind="bar")
        plt.title("RailMind AI - Fault Type Distribution")
        plt.xlabel("Fault Type")
        plt.ylabel("Number of Samples")
        plt.xticks(rotation=35, ha="right")

        save_plot(
            fig,
            "fault_distribution.png"
        )

        report_lines.append(section("7. FAULT TYPE DISTRIBUTION"))
        report_lines.append(fault_report.to_string())

    # ---------------------------------------------------------------
    # 8. HEALTH STATUS DISTRIBUTION
    # ---------------------------------------------------------------

    print(section("8. HEALTH STATUS DISTRIBUTION"))

    if "healthStatus" in df.columns:
        status_counts = (
            df["healthStatus"]
            .value_counts(dropna=False)
        )

        status_percent = (
            status_counts / len(df) * 100
        ).round(2)

        status_report = pd.DataFrame(
            {
                "count": status_counts,
                "percentage": status_percent,
            }
        )

        print(status_report.to_string())

        status_report.to_csv(
            OUTPUT_DIR / "health_status_distribution.csv"
        )

        report_lines.append(section("8. HEALTH STATUS DISTRIBUTION"))
        report_lines.append(status_report.to_string())

    # ---------------------------------------------------------------
    # 9. NUMERIC SUMMARY
    # ---------------------------------------------------------------

    print(section("9. NUMERIC FEATURE SUMMARY"))

    numeric_present = [
        col for col in NUMERIC_COLUMNS
        if col in df.columns
    ]

    numeric_df = df[numeric_present].apply(
        pd.to_numeric,
        errors="coerce"
    )

    summary = numeric_df.describe().T

    summary["missing"] = numeric_df.isna().sum()
    summary["unique"] = [
        numeric_df[col].nunique(dropna=True)
        for col in numeric_df.columns
    ]

    print(summary.to_string())

    summary.to_csv(
        OUTPUT_DIR / "numeric_summary.csv"
    )

    report_lines.append(section("9. NUMERIC FEATURE SUMMARY"))
    report_lines.append(summary.to_string())

    # ---------------------------------------------------------------
    # 10. PHYSICAL SANITY CHECKS
    # ---------------------------------------------------------------

    print(section("10. PHYSICAL SANITY CHECKS"))

    physical_issues: list[str] = []

    for column, limits in PHYSICAL_CHECKS.items():
        if column not in df.columns:
            continue

        values = safe_numeric_series(df, column)

        if "min" in limits:
            count = int((values < limits["min"]).sum())
            if count:
                msg = (
                    f"{column}: {count:,} values below "
                    f"minimum {limits['min']}"
                )
                physical_issues.append(msg)
                print(msg)

        if "max" in limits:
            count = int((values > limits["max"]).sum())
            if count:
                msg = (
                    f"{column}: {count:,} values above "
                    f"maximum {limits['max']}"
                )
                physical_issues.append(msg)
                print(msg)

    if not physical_issues:
        print("No obvious physical-range violations found.")

    report_lines.append(section("10. PHYSICAL SANITY CHECKS"))
    if physical_issues:
        report_lines.extend(physical_issues)
    else:
        report_lines.append(
            "No obvious physical-range violations found."
        )

    # ---------------------------------------------------------------
    # 11. RUL ANALYSIS
    # ---------------------------------------------------------------

    print(section("11. RUL ANALYSIS"))

    if "RUL_hours" in df.columns:
        rul = safe_numeric_series(df, "RUL_hours")

        print(f"Minimum RUL: {rul.min():,.2f} hours")
        print(f"Maximum RUL: {rul.max():,.2f} hours")
        print(f"Mean RUL:    {rul.mean():,.2f} hours")
        print(f"Median RUL:  {rul.median():,.2f} hours")
        print(f"Zero-RUL rows: {(rul == 0).sum():,}")

        report_lines.append(section("11. RUL ANALYSIS"))
        report_lines.append(
            f"Minimum RUL: {rul.min():,.2f} hours"
        )
        report_lines.append(
            f"Maximum RUL: {rul.max():,.2f} hours"
        )
        report_lines.append(
            f"Mean RUL: {rul.mean():,.2f} hours"
        )
        report_lines.append(
            f"Median RUL: {rul.median():,.2f} hours"
        )
        report_lines.append(
            f"Zero-RUL rows: {(rul == 0).sum():,}"
        )

        fig = plt.figure(figsize=(10, 6))
        rul.plot(kind="hist", bins=40)
        plt.title("RailMind AI - RUL Distribution")
        plt.xlabel("RUL (hours)")
        plt.ylabel("Frequency")

        save_plot(
            fig,
            "rul_distribution.png"
        )

    # ---------------------------------------------------------------
    # 12. HEALTH ANALYSIS
    # ---------------------------------------------------------------

    print(section("12. HEALTH SCORE ANALYSIS"))

    if "healthScore" in df.columns:
        health = safe_numeric_series(
            df,
            "healthScore"
        )

        print(f"Minimum health: {health.min():.2f}")
        print(f"Maximum health: {health.max():.2f}")
        print(f"Mean health:    {health.mean():.2f}")
        print(f"Median health:  {health.median():.2f}")

        report_lines.append(section("12. HEALTH SCORE ANALYSIS"))
        report_lines.append(
            f"Minimum health: {health.min():.2f}"
        )
        report_lines.append(
            f"Maximum health: {health.max():.2f}"
        )
        report_lines.append(
            f"Mean health: {health.mean():.2f}"
        )
        report_lines.append(
            f"Median health: {health.median():.2f}"
        )

        fig = plt.figure(figsize=(10, 6))
        health.plot(kind="hist", bins=40)
        plt.title("RailMind AI - Health Score Distribution")
        plt.xlabel("Health Score")
        plt.ylabel("Frequency")

        save_plot(
            fig,
            "health_distribution.png"
        )

    # ---------------------------------------------------------------
    # 13. CORRELATION ANALYSIS
    # ---------------------------------------------------------------

    print(section("13. NUMERIC CORRELATION ANALYSIS"))

    if len(numeric_present) >= 2:
        correlation = numeric_df.corr(numeric_only=True)

        correlation.to_csv(
            OUTPUT_DIR / "correlation_matrix.csv"
        )

        print(correlation.round(3).to_string())

        report_lines.append(section("13. NUMERIC CORRELATION ANALYSIS"))
        report_lines.append(
            correlation.round(3).to_string()
        )

        # Save correlation matrix as an image using matplotlib only.
        fig, ax = plt.subplots(
            figsize=(13, 11)
        )

        matrix = correlation.values

        image = ax.imshow(
            matrix,
            aspect="auto",
            interpolation="nearest"
        )

        ax.set_xticks(
            np.arange(len(correlation.columns))
        )
        ax.set_yticks(
            np.arange(len(correlation.index))
        )

        ax.set_xticklabels(
            correlation.columns,
            rotation=90,
            fontsize=7
        )
        ax.set_yticklabels(
            correlation.index,
            fontsize=7
        )

        plt.title(
            "RailMind AI - Numeric Feature Correlation"
        )

        fig.colorbar(image, ax=ax)

        save_plot(
            fig,
            "correlation_matrix.png"
        )

    # ---------------------------------------------------------------
    # 14. POSSIBLE TARGET LEAKAGE
    # ---------------------------------------------------------------

    print(section("14. POSSIBLE ML TARGET-LEAKAGE RISKS"))

    leakage_findings: list[str] = []

    if "faultType" in df.columns:
        leakage_findings.append(
            "faultType is the proposed classification target. "
            "It must not be used as an input feature."
        )

    if "RUL_hours" in df.columns:
        leakage_findings.append(
            "RUL_hours is the proposed RUL regression target. "
            "It must not be used as an input feature."
        )

    for column in POTENTIAL_LEAKAGE_COLUMNS:
        if column in df.columns:
            leakage_findings.append(
                f"{column}: inspect carefully before training because "
                f"it may directly encode degradation or target information."
            )

    for finding in leakage_findings:
        print(f"- {finding}")

    report_lines.append(
        section("14. POSSIBLE ML TARGET-LEAKAGE RISKS")
    )
    report_lines.extend(
        f"- {finding}" for finding in leakage_findings
    )

    # ---------------------------------------------------------------
    # 15. CLASS IMBALANCE
    # ---------------------------------------------------------------

    print(section("15. CLASS IMBALANCE ASSESSMENT"))

    if "faultType" in df.columns:
        fault_counts = df["faultType"].value_counts()

        largest = int(fault_counts.max())
        smallest = int(fault_counts.min())

        imbalance_ratio = (
            largest / smallest
            if smallest > 0
            else np.inf
        )

        print(
            f"Largest class: {fault_counts.index[0]} "
            f"({largest:,} rows)"
        )
        print(
            f"Smallest class: {fault_counts.index[-1]} "
            f"({smallest:,} rows)"
        )
        print(
            f"Largest/smallest class ratio: "
            f"{imbalance_ratio:.2f}"
        )

        report_lines.append(section("15. CLASS IMBALANCE ASSESSMENT"))
        report_lines.append(
            f"Largest class: {fault_counts.index[0]} "
            f"({largest:,} rows)"
        )
        report_lines.append(
            f"Smallest class: {fault_counts.index[-1]} "
            f"({smallest:,} rows)"
        )
        report_lines.append(
            f"Largest/smallest class ratio: "
            f"{imbalance_ratio:.2f}"
        )

        if imbalance_ratio >= 5:
            print(
                "WARNING: Significant class imbalance is present."
            )
            report_lines.append(
                "WARNING: Significant class imbalance is present."
            )

    # ---------------------------------------------------------------
    # 16. PER-ASSET FAULT DISTRIBUTION
    # ---------------------------------------------------------------

    print(section("16. FAULT DISTRIBUTION BY COMPRESSOR"))

    if {"unitId", "faultType"}.issubset(df.columns):
        asset_fault = pd.crosstab(
            df["unitId"],
            df["faultType"]
        )

        print(asset_fault.to_string())

        asset_fault.to_csv(
            OUTPUT_DIR / "fault_distribution_by_unit.csv"
        )

        report_lines.append(
            section("16. FAULT DISTRIBUTION BY COMPRESSOR")
        )
        report_lines.append(
            asset_fault.to_string()
        )

    # ---------------------------------------------------------------
    # 17. DATASET SUITABILITY SUMMARY
    # ---------------------------------------------------------------

    print(section("17. ML READINESS SUMMARY"))

    issues = []

    if missing_counts.sum() > 0:
        issues.append("missing values exist")

    if duplicate_rows > 0:
        issues.append("duplicate rows exist")

    if duplicate_asset_time > 0:
        issues.append(
            "duplicate unitId + timestamp combinations exist"
        )

    if physical_issues:
        issues.append("physical-range anomalies exist")

    if "faultType" in df.columns:
        issues.append(
            "fault classification target is available"
        )

    if "RUL_hours" in df.columns:
        issues.append(
            "RUL regression target is available"
        )

    if "faultType" in df.columns:
        issues.append(
            "fault classes should be checked for imbalance"
        )

    issues.append(
        "asset-wise train/test splitting should be used"
    )

    issues.append(
        "healthScore/failureProbability/runningHours "
        "should be reviewed for target leakage"
    )

    for item in issues:
        print(f"- {item}")

    report_lines.append(section("17. ML READINESS SUMMARY"))
    report_lines.extend(f"- {item}" for item in issues)

    # ---------------------------------------------------------------
    # 18. SAVE COMPLETE REPORT
    # ---------------------------------------------------------------

    report_path = OUTPUT_DIR / "dataset_analysis_report.txt"

    with report_path.open(
        "w",
        encoding="utf-8"
    ) as file:
        file.write(
            "\n".join(report_lines)
        )

    print(section("ANALYSIS COMPLETE"))

    print(f"Report saved to:")
    print(report_path)

    print(f"\nAll analysis files are inside:")
    print(OUTPUT_DIR)

    print("\nNo ML model was trained.")
    print("This script only performs dataset analysis.")


if __name__ == "__main__":
    main()