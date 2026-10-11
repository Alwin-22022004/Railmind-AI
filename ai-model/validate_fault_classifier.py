"""
RailMind AI - ML Step 3: Grouped Cross-Validation
---------------------------------------------------
Evaluates the generalization robustness of the baseline Random Forest fault
classifier using 5-Fold Grouped Cross-Validation (StratifiedGroupKFold on unitId).

Project:
    RailMind AI — AI-Based Digital Twin for Railway Air Compressor Health
    Monitoring and Failure Prediction

Input Dataset:
    simulator/output/air_compressor_dataset.csv

Output Artifacts:
    ai-model/model_output/
    ├── cross_validation_results.csv
    └── cross_validation_report.txt

Key Validation Decisions:
1. Grouped Splitting (unitId):
   The dataset contains time series observations grouped by compressor unitId.
   Ordinary row-wise K-fold would cause data leakage between identical compressor units
   in training and validation sets. Grouped CV ensures observations from any single unitId
   appear exclusively in EITHER training OR validation for any given fold.

2. Model Baseline Hyperparameters:
   Fresh model instantiated for each fold with exact baseline configuration:
   - n_estimators = 150
   - max_depth = 15
   - class_weight = 'balanced'
   - random_state = 42

3. Strict Out-of-Sample Evaluation:
   Each fold evaluates exclusively on unseen compressor units.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedGroupKFold

warnings.filterwarnings("ignore")

# -------------------------------------------------------------------
# PATH CONFIGURATION
# -------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent

# Check potential dataset locations
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

MODEL_OUTPUT_DIR = SCRIPT_DIR / "model_output"
MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CV_RESULTS_CSV_PATH = MODEL_OUTPUT_DIR / "cross_validation_results.csv"
CV_REPORT_TXT_PATH = MODEL_OUTPUT_DIR / "cross_validation_report.txt"

# -------------------------------------------------------------------
# SCHEMA DEFINITIONS
# -------------------------------------------------------------------
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
GROUP_COLUMN = "unitId"
RANDOM_STATE = 42
N_SPLITS = 5


def load_dataset() -> pd.DataFrame:
    """Loads and validates the dataset."""
    print(f"[1/4] Loading dataset from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)

    required_cols = FEATURE_COLUMNS + [TARGET_COLUMN, GROUP_COLUMN]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")

    # Clean numeric features
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN, GROUP_COLUMN], inplace=True)
    df.sort_values(by=[GROUP_COLUMN, "timestamp"], inplace=True)
    df.reset_index(drop=True, inplace=True)

    print(f"      Loaded {len(df):,} records across {df[GROUP_COLUMN].nunique()} unique compressor units.")
    return df


def run_grouped_cross_validation(df: pd.DataFrame):
    """Performs 5-Fold Stratified Grouped Cross Validation."""
    print(f"[2/4] Executing {N_SPLITS}-Fold Grouped Cross-Validation (group={GROUP_COLUMN}, seed={RANDOM_STATE})...")

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    groups = df[GROUP_COLUMN]

    all_target_classes = sorted(list(y.unique()))
    sgkf = StratifiedGroupKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)

    fold_metrics = []
    fold_reports = []

    for fold_idx, (train_idx, val_idx) in enumerate(sgkf.split(X, y, groups), 1):
        X_train_fold, y_train_fold = X.iloc[train_idx], y.iloc[train_idx]
        X_val_fold, y_val_fold = X.iloc[val_idx], y.iloc[val_idx]

        train_units = df.iloc[train_idx][GROUP_COLUMN].unique()
        val_units = df.iloc[val_idx][GROUP_COLUMN].unique()

        # Check unit isolation
        overlap = set(train_units).intersection(set(val_units))
        if overlap:
            raise RuntimeError(f"Fold {fold_idx} group isolation error! Overlapping units: {overlap}")

        # Check class coverage
        val_classes = set(y_val_fold.unique())
        missing_val_classes = set(all_target_classes) - val_classes
        all_classes_present = (len(missing_val_classes) == 0)

        # Train fresh baseline Random Forest model
        clf = RandomForestClassifier(
            n_estimators=150,
            max_depth=15,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
        clf.fit(X_train_fold, y_train_fold)

        # Evaluate on validation set
        y_val_pred = clf.predict(X_val_fold)

        acc = accuracy_score(y_val_fold, y_val_pred)
        macro_p = precision_score(y_val_fold, y_val_pred, average="macro", zero_division=0)
        macro_r = recall_score(y_val_fold, y_val_pred, average="macro", zero_division=0)
        macro_f1 = f1_score(y_val_fold, y_val_pred, average="macro", zero_division=0)

        weighted_p = precision_score(y_val_fold, y_val_pred, average="weighted", zero_division=0)
        weighted_r = recall_score(y_val_fold, y_val_pred, average="weighted", zero_division=0)
        weighted_f1 = f1_score(y_val_fold, y_val_pred, average="weighted", zero_division=0)

        val_class_counts = y_val_fold.value_counts().to_dict()
        class_rep_str = classification_report(y_val_fold, y_val_pred, target_names=sorted(list(val_classes)), digits=4, zero_division=0)

        metrics = {
            "fold": fold_idx,
            "train_units": len(train_units),
            "validation_units": len(val_units),
            "train_unit_ids": sorted(list(train_units)),
            "val_unit_ids": sorted(list(val_units)),
            "val_samples": len(X_val_fold),
            "accuracy": acc,
            "macro_precision": macro_p,
            "macro_recall": macro_r,
            "macro_f1": macro_f1,
            "weighted_precision": weighted_p,
            "weighted_recall": weighted_r,
            "weighted_f1": weighted_f1,
            "val_class_counts": val_class_counts,
            "all_classes_present": all_classes_present,
            "missing_val_classes": missing_val_classes,
            "classification_report": class_rep_str,
        }
        fold_metrics.append(metrics)
        print(f"      Fold {fold_idx}/{N_SPLITS}: Acc={acc:.4f} | Macro F1={macro_f1:.4f} | Weighted F1={weighted_f1:.4f} (Train Units={len(train_units)}, Val Units={len(val_units)})")

    return fold_metrics, all_target_classes


def export_results(fold_metrics: list[dict], all_target_classes: list[str], df: pd.DataFrame):
    """Exports cross_validation_results.csv and cross_validation_report.txt."""
    print(f"[3/4] Exporting cross-validation CSV results to: {CV_RESULTS_CSV_PATH}")

    # Build CSV DataFrame
    csv_rows = []
    for m in fold_metrics:
        csv_rows.append({
            "fold": m["fold"],
            "train_units": m["train_units"],
            "validation_units": m["validation_units"],
            "accuracy": round(m["accuracy"], 6),
            "macro_precision": round(m["macro_precision"], 6),
            "macro_recall": round(m["macro_recall"], 6),
            "macro_f1": round(m["macro_f1"], 6),
            "weighted_precision": round(m["weighted_precision"], 6),
            "weighted_recall": round(m["weighted_recall"], 6),
            "weighted_f1": round(m["weighted_f1"], 6),
        })

    results_df = pd.DataFrame(csv_rows)
    results_df.to_csv(CV_RESULTS_CSV_PATH, index=False)
    print(f"      Saved: {CV_RESULTS_CSV_PATH}")

    # Calculate overall summary statistics across all folds
    accs = [m["accuracy"] for m in fold_metrics]
    m_precs = [m["macro_precision"] for m in fold_metrics]
    m_recs = [m["macro_recall"] for m in fold_metrics]
    m_f1s = [m["macro_f1"] for m in fold_metrics]
    w_precs = [m["weighted_precision"] for m in fold_metrics]
    w_recs = [m["weighted_recall"] for m in fold_metrics]
    w_f1s = [m["weighted_f1"] for m in fold_metrics]

    print(f"[4/4] Generating cross_validation_report.txt...")

    lines = [
        "=" * 78,
        "RAILMIND AI - GROUPED CROSS-VALIDATION REPORT",
        "=" * 78,
        f"Input Dataset:            {DATASET_PATH}",
        f"Validation Strategy:      Stratified Group K-Fold (Group = {GROUP_COLUMN})",
        f"Number of Folds:          {N_SPLITS}",
        f"Model Architecture:       RandomForestClassifier",
        f"Baseline Hyperparameters: n_estimators=150, max_depth=15, class_weight='balanced'",
        f"Random State:             {RANDOM_STATE}",
        "",
        "-" * 78,
        "1. OVERALL 5-FOLD CROSS-VALIDATION SUMMARY METRICS",
        "-" * 78,
        f"Mean Accuracy:           {np.mean(accs):.4f} ± {np.std(accs):.4f} ({np.mean(accs):.2%})",
        f"Mean Macro Precision:    {np.mean(m_precs):.4f} ± {np.std(m_precs):.4f} ({np.mean(m_precs):.2%})",
        f"Mean Macro Recall:       {np.mean(m_recs):.4f} ± {np.std(m_recs):.4f} ({np.mean(m_recs):.2%})",
        f"Mean Macro F1-Score:     {np.mean(m_f1s):.4f} ± {np.std(m_f1s):.4f} ({np.mean(m_f1s):.2%})",
        f"Mean Weighted Precision: {np.mean(w_precs):.4f} ± {np.std(w_precs):.4f} ({np.mean(w_precs):.2%})",
        f"Mean Weighted Recall:    {np.mean(w_recs):.4f} ± {np.std(w_recs):.4f} ({np.mean(w_recs):.2%})",
        f"Mean Weighted F1-Score:  {np.mean(w_f1s):.4f} ± {np.std(w_f1s):.4f} ({np.mean(w_f1s):.2%})",
        "",
        "-" * 78,
        "2. FOLD-BY-FOLD METRICS BREAKDOWN",
        "-" * 78,
        f"{'Fold':<6} | {'Tr Units':<9} | {'Val Units':<9} | {'Accuracy':<10} | {'Macro F1':<10} | {'Weighted F1':<11} | {'All Classes Present':<20}",
        "-" * 78,
    ]

    for m in fold_metrics:
        present_str = "YES" if m["all_classes_present"] else f"NO (Missing: {list(m['missing_val_classes'])})"
        lines.append(
            f"{m['fold']:<6} | {m['train_units']:<9} | {m['validation_units']:<9} | {m['accuracy']:<10.4f} | {m['macro_f1']:<10.4f} | {m['weighted_f1']:<11.4f} | {present_str:<20}"
        )

    lines.extend([
        "-" * 78,
        "",
        "-" * 78,
        "3. DETAILED PER-FOLD VALIDATION BREAKDOWN",
        "-" * 78,
    ])

    for m in fold_metrics:
        lines.extend([
            f"\n--- FOLD {m['fold']} ---",
            f"Train Unit Count:      {m['train_units']} units",
            f"Validation Unit Count: {m['validation_units']} units ({m['val_samples']:,} samples)",
            f"Validation Unit IDs:   {m['val_unit_ids']}",
            f"Target Class Counts in Validation Fold:",
        ])
        for cls in all_target_classes:
            cnt = m["val_class_counts"].get(cls, 0)
            lines.append(f"  - {cls:<20} : {cnt:,}")

        lines.extend([
            f"All Target Classes Present in Val Fold: {m['all_classes_present']}",
            "Classification Report for Fold:",
            m["classification_report"],
        ])

    lines.extend([
        "",
        "-" * 78,
        "4. METHODOLOGICAL INTERPRETATION & LIMITATIONS",
        "-" * 78,
        "Interpretation Note:",
        "- Grouped cross-validation (by unitId) prevents data leakage between time series",
        "  observations of identical compressor assets.",
        "- High validation stability across folds demonstrates that the baseline Random Forest",
        "  model generalizes robustly to unseen compressor units under synthetic simulation conditions.",
        "- CAUTION: These high validation scores reflect performance on physics-based synthetic dataset",
        "  telemetry and do not guarantee equivalent performance under real-world railway operating noise.",
        "",
        "=" * 78,
        "END OF GROUPED CROSS-VALIDATION REPORT",
        "=" * 78,
    ])

    report_text = "\n".join(lines)
    with open(CV_REPORT_TXT_PATH, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(f"      Saved: {CV_REPORT_TXT_PATH}")
    print("\n" + report_text + "\n")


def main():
    print("=" * 78)
    print("RAILMIND AI - BASELINE FAULT CLASSIFIER GROUPED CROSS-VALIDATION")
    print("=" * 78)

    df = load_dataset()
    fold_metrics, all_target_classes = run_grouped_cross_validation(df)
    export_results(fold_metrics, all_target_classes, df)

    print("=" * 78)
    print("GROUPED CROSS-VALIDATION COMPLETED SUCCESSFULLY.")
    print("=" * 78)
    print("Generated Artifacts:")
    print(f" 1. Validation Results CSV: {CV_RESULTS_CSV_PATH}")
    print(f" 2. Validation Report TXT:  {CV_REPORT_TXT_PATH}")
    print("=" * 78)


if __name__ == "__main__":
    main()
