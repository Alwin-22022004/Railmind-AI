"""
RailMind AI - ML Step 3: Baseline Fault Classifier Training & Evaluation
--------------------------------------------------------------------------
Trains and evaluates a baseline Random Forest classifier for air compressor
fault classification.

Project:
    RailMind AI — AI-Based Digital Twin for Railway Air Compressor Health
    Monitoring and Failure Prediction

Input Datasets:
    ai-model/prepared_data/train.csv
    ai-model/prepared_data/test.csv

Output Artifacts:
    ai-model/model_output/
    ├── fault_classifier.joblib
    ├── model_evaluation.txt
    ├── confusion_matrix.png
    └── feature_importance.png

Baseline Model Purpose & Scope:
- This is the FIRST supervised machine-learning baseline experiment for the project.
- Goal: Learn physical and operational sensor relationships to classify fault types
  (NONE, AIR_LEAKAGE, BEARING_FAULT, MOTOR_OVERHEATING, OIL_DEGRADATION, FILTER_CLOGGING).
- Training is strictly restricted to physical sensor/operational features, excluding
  asset identifiers, time indices, or derived health/failure scores to avoid data leakage.
- Handles class imbalance natively via class_weight="balanced".
- Evaluated exclusively on out-of-sample test units.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
import warnings

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

warnings.filterwarnings("ignore")

# Set matplotlib style for crisp, clean rendering
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
plt.rcParams["font.sans-serif"] = "DejaVu Sans"
plt.rcParams["axes.edgecolor"] = "#cccccc"

# -------------------------------------------------------------------
# PATH CONFIGURATION
# -------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent

TRAIN_CSV_PATH = SCRIPT_DIR / "prepared_data" / "train.csv"
TEST_CSV_PATH = SCRIPT_DIR / "prepared_data" / "test.csv"
METADATA_JSON_PATH = SCRIPT_DIR / "prepared_data" / "feature_metadata.json"

MODEL_OUTPUT_DIR = SCRIPT_DIR / "model_output"
MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_SAVE_PATH = MODEL_OUTPUT_DIR / "fault_classifier.joblib"
EVAL_REPORT_PATH = MODEL_OUTPUT_DIR / "model_evaluation.txt"
CONFUSION_MATRIX_PATH = MODEL_OUTPUT_DIR / "confusion_matrix.png"
FEATURE_IMPORTANCE_PATH = MODEL_OUTPUT_DIR / "feature_importance.png"

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
RANDOM_STATE = 42


def load_datasets() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Loads and validates train.csv and test.csv datasets."""
    print(f"[1/5] Loading prepared datasets...")
    if not TRAIN_CSV_PATH.exists():
        raise FileNotFoundError(f"Training dataset missing at: {TRAIN_CSV_PATH}")
    if not TEST_CSV_PATH.exists():
        raise FileNotFoundError(f"Testing dataset missing at: {TEST_CSV_PATH}")

    train_df = pd.read_csv(TRAIN_CSV_PATH)
    test_df = pd.read_csv(TEST_CSV_PATH)

    # Validate feature columns and target
    required_cols = FEATURE_COLUMNS + [TARGET_COLUMN]
    for col in required_cols:
        if col not in train_df.columns:
            raise ValueError(f"train.csv is missing required column: '{col}'")
        if col not in test_df.columns:
            raise ValueError(f"test.csv is missing required column: '{col}'")

    print(f"      Train samples: {len(train_df):,} | Test samples: {len(test_df):,}")
    print(f"      Features ({len(FEATURE_COLUMNS)}): {', '.join(FEATURE_COLUMNS)}")
    return train_df, test_df


def train_baseline_model(X_train: pd.DataFrame, y_train: pd.Series) -> RandomForestClassifier:
    """Trains a Random Forest classifier with balanced class weights."""
    print(f"[2/5] Training Random Forest Baseline Classifier (seed={RANDOM_STATE}, class_weight='balanced')...")

    clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    clf.fit(X_train, y_train)
    print("      Model training complete.")
    return clf


def generate_plots(
    clf: RandomForestClassifier,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    y_pred: np.ndarray,
    target_classes: list[str],
):
    """Generates and saves Confusion Matrix and Feature Importance visual plots."""
    print(f"[3/5] Generating evaluation plots...")

    # 1. Confusion Matrix Plot
    cm = confusion_matrix(y_test, y_pred, labels=target_classes)

    fig, ax = plt.subplots(figsize=(9, 7), dpi=300)
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)

    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=target_classes,
        yticklabels=target_classes,
        title="RailMind AI - Baseline Fault Classifier Confusion Matrix",
        ylabel="True Fault Class",
        xlabel="Predicted Fault Class",
    )

    plt.setp(ax.get_xticklabels(), rotation=35, ha="right", rotation_mode="anchor")

    # Annotate matrix cells with count values
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            ax.text(
                j,
                i,
                f"{val:,}",
                ha="center",
                va="center",
                color="white" if val > thresh else "black",
                fontsize=10,
                weight="bold" if val > 0 else "normal",
            )

    fig.tight_layout()
    plt.savefig(CONFUSION_MATRIX_PATH, bbox_inches="tight")
    plt.close()
    print(f"      Saved Confusion Matrix plot: {CONFUSION_MATRIX_PATH}")

    # 2. Feature Importance Plot
    importances = clf.feature_importances_
    indices = np.argsort(importances)
    sorted_features = [FEATURE_COLUMNS[i] for i in indices]
    sorted_importances = importances[indices]

    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    bars = ax.barh(range(len(indices)), sorted_importances, color="#1f77b4", edgecolor="#0e4d7b", height=0.65)

    ax.set_yticks(range(len(indices)))
    ax.set_yticklabels(sorted_features, fontsize=10)
    ax.set_xlabel("Relative Feature Importance (Gini Impurity Reduction)", fontsize=11, weight="bold")
    ax.set_title("RailMind AI - Feature Importance Ranking (Random Forest)", fontsize=13, weight="bold", pad=15)
    ax.set_xlim(0, max(sorted_importances) * 1.15)
    ax.grid(axis="x", linestyle="--", alpha=0.7)

    # Annotate bars with percentage values
    for bar in bars:
        width = bar.get_width()
        ax.text(
            width + 0.003,
            bar.get_y() + bar.get_height() / 2.0,
            f"{width:.1%}",
            ha="left",
            va="center",
            fontsize=9.5,
            weight="bold",
        )

    fig.tight_layout()
    plt.savefig(FEATURE_IMPORTANCE_PATH, bbox_inches="tight")
    plt.close()
    print(f"      Saved Feature Importance plot: {FEATURE_IMPORTANCE_PATH}")


def evaluate_and_export(
    clf: RandomForestClassifier,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
):
    """Evaluates the model, prints metrics, saves model file and readable report."""
    print(f"[4/5] Evaluating model on test set...")

    y_pred = clf.predict(X_test)
    target_classes = sorted(list(y_train.unique()))

    # Calculate overall metrics
    acc = accuracy_score(y_test, y_pred)
    macro_prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
    macro_rec = recall_score(y_test, y_pred, average="macro", zero_division=0)
    macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)

    weighted_prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    weighted_rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    weighted_f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    class_report_str = classification_report(y_test, y_pred, target_names=target_classes, digits=4, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=target_classes)

    # Feature importances
    importances = clf.feature_importances_
    sorted_fi_indices = np.argsort(importances)[::-1]

    # Save model file
    print(f"[5/5] Saving model artifact and evaluation report...")
    joblib.dump(clf, MODEL_SAVE_PATH)
    print(f"      Saved model checkpoint: {MODEL_SAVE_PATH}")

    # Generate plots
    generate_plots(clf, X_test, y_test, y_pred, target_classes)

    # Build evaluation report text
    lines = [
        "=" * 78,
        "RAILMIND AI - BASELINE FAULT CLASSIFIER EVALUATION REPORT",
        "=" * 78,
        f"Model Architecture:   RandomForestClassifier",
        f"Model Configuration:  n_estimators=150, max_depth=15, class_weight='balanced'",
        f"Random State:         {RANDOM_STATE}",
        f"Model File Saved To:  {MODEL_SAVE_PATH}",
        "",
        "-" * 78,
        "1. DATASET & FEATURE SUMMARY",
        "-" * 78,
        f"Training Sample Count: {len(X_train):,}",
        f"Testing Sample Count:  {len(X_test):,}",
        f"Number of Features:    {len(FEATURE_COLUMNS)}",
        f"Target Classes ({len(target_classes)}):  {', '.join(target_classes)}",
        "",
        "Feature List:",
    ]

    for idx, feat in enumerate(FEATURE_COLUMNS, 1):
        lines.append(f"  {idx:2d}. {feat}")

    lines.extend([
        "",
        "-" * 78,
        "2. OVERALL EVALUATION METRICS",
        "-" * 78,
        f"Accuracy:           {acc:.4f} ({acc:.2%})",
        "",
        "Macro Metrics (Unweighted average across all fault classes):",
        f"  - Precision:      {macro_prec:.4f} ({macro_prec:.2%})",
        f"  - Recall:         {macro_rec:.4f} ({macro_rec:.2%})",
        f"  - F1-Score:       {macro_f1:.4f} ({macro_f1:.2%})",
        "",
        "Weighted Metrics (Weighted by class support in test set):",
        f"  - Precision:      {weighted_prec:.4f} ({weighted_prec:.2%})",
        f"  - Recall:         {weighted_rec:.4f} ({weighted_rec:.2%})",
        f"  - F1-Score:       {weighted_f1:.4f} ({weighted_f1:.2%})",
        "",
        "-" * 78,
        "3. PER-CLASS CLASSIFICATION REPORT",
        "-" * 78,
        class_report_str,
        "",
        "-" * 78,
        "4. CONFUSION MATRIX (Rows=True, Columns=Predicted)",
        "-" * 78,
        f"{'Class':<20} | " + " | ".join(f"{c[:8]:>8}" for c in target_classes),
        "-" * 78,
    ])

    for i, cls_name in enumerate(target_classes):
        row_str = " | ".join(f"{cm[i, j]:>8,}" for j in range(len(target_classes)))
        lines.append(f"{cls_name:<20} | {row_str}")

    lines.extend([
        "-" * 78,
        "",
        "-" * 78,
        "5. FEATURE IMPORTANCE RANKING (GINI IMPURITY REDUCTION)",
        "-" * 78,
    ])

    for rank, idx in enumerate(sorted_fi_indices, 1):
        lines.append(f"  {rank:2d}. {FEATURE_COLUMNS[idx]:<22} : {importances[idx]:.4f} ({importances[idx]:.2%})")

    lines.extend([
        "",
        "=" * 78,
        "END OF MODEL EVALUATION REPORT",
        "=" * 78,
    ])

    report_text = "\n".join(lines)
    with open(EVAL_REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(f"      Saved evaluation report: {EVAL_REPORT_PATH}")
    print("\n" + report_text + "\n")


# -------------------------------------------------------------------
# MAIN EXECUTION ENTRYPOINT
# -------------------------------------------------------------------

def main():
    print("=" * 78)
    print("RAILMIND AI - BASELINE FAULT CLASSIFIER TRAINING & EVALUATION")
    print("=" * 78)

    # 1. Load data
    train_df, test_df = load_datasets()

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df[TARGET_COLUMN]

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TARGET_COLUMN]

    # 2. Train model
    clf = train_baseline_model(X_train, y_train)

    # 3. Evaluate, generate plots and reports
    evaluate_and_export(clf, X_train, y_train, X_test, y_test)

    print("=" * 78)
    print("MODEL TRAINING & EVALUATION COMPLETED SUCCESSFULLY.")
    print("=" * 78)
    print("Generated Artifacts:")
    print(f" 1. Model File:         {MODEL_SAVE_PATH}")
    print(f" 2. Evaluation Report:  {EVAL_REPORT_PATH}")
    print(f" 3. Confusion Matrix:   {CONFUSION_MATRIX_PATH}")
    print(f" 4. Feature Importance: {FEATURE_IMPORTANCE_PATH}")
    print("=" * 78)


if __name__ == "__main__":
    main()
