"""Evaluate an exported joblib classifier on a held-out CSV/JSON dataset."""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

from train import load_records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("model", type=Path)
    parser.add_argument("data", type=Path)
    args = parser.parse_args()
    bundle = joblib.load(args.model)
    frame = load_records(args.data)
    columns = bundle["feature_columns"]
    actual = frame["pose_label"]
    encoder_labels = {label: index for index, label in enumerate(bundle["labels"])}
    y_true = [encoder_labels[label] for label in actual]
    predictions = bundle["model"].predict(frame[columns].fillna(0))
    print(f"accuracy={accuracy_score(y_true, predictions):.4f}")
    print(classification_report(y_true, predictions, target_names=bundle["labels"], zero_division=0))
    print(confusion_matrix(y_true, predictions))


if __name__ == "__main__":
    main()
