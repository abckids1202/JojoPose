"""Train the Jojo pose classifier from exported feature CSV/JSON records.

The split is grouped by participant so adjacent frames from one person never
leak into validation or test metrics.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder


def load_records(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        records = payload.get("records", payload)
        rows = []
        for record in records:
            row = {key: record.get(key) for key in ("id", "poseLabel", "participantId", "sessionId", "cameraAngle", "quality", "faceQuality")}
            row.update(record.get("features", {}))
            rows.append(row)
        frame = pd.DataFrame(rows).rename(columns={"poseLabel": "pose_label", "participantId": "participant_id", "sessionId": "session_id", "faceQuality": "face_quality"})
    else:
        frame = pd.read_csv(path)
    required = {"pose_label", "participant_id"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")
    return frame


def grouped_split(frame: pd.DataFrame, seed: int):
    groups = frame["participant_id"].fillna("unknown").astype(str)
    first = GroupShuffleSplit(n_splits=1, test_size=.30, random_state=seed)
    train_idx, holdout_idx = next(first.split(frame, frame["pose_label"], groups))
    holdout = frame.iloc[holdout_idx]
    holdout_groups = groups.iloc[holdout_idx]
    second = GroupShuffleSplit(n_splits=1, test_size=.50, random_state=seed + 1)
    validation_relative, test_relative = next(second.split(holdout, holdout["pose_label"], holdout_groups))
    return frame.iloc[train_idx], holdout.iloc[validation_relative], holdout.iloc[test_relative]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--out", type=Path, default=Path("public/models"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    frame = load_records(args.input)
    feature_columns = [column for column in frame.columns if column not in {"id", "pose_label", "participant_id", "session_id", "camera_angle", "timestamp", "quality", "face_quality"}]
    if len(frame) < 100 or frame["participant_id"].nunique() < 3:
        raise ValueError("Collect at least 100 samples from at least 3 participants before training.")
    train, validation, test = grouped_split(frame, args.seed)
    encoder = LabelEncoder().fit(frame["pose_label"])
    model = RandomForestClassifier(n_estimators=400, class_weight="balanced_subsample", min_samples_leaf=2, random_state=args.seed, n_jobs=-1)
    model.fit(train[feature_columns].fillna(0), encoder.transform(train["pose_label"]))
    predictions = model.predict(test[feature_columns].fillna(0))
    probabilities = model.predict_proba(validation[feature_columns].fillna(0)).max(axis=1)
    print(f"train={len(train)} validation={len(validation)} test={len(test)} participants={frame['participant_id'].nunique()}")
    print(f"test_accuracy={accuracy_score(encoder.transform(test['pose_label']), predictions):.4f}")
    print(classification_report(encoder.transform(test["pose_label"]), predictions, target_names=encoder.classes_, zero_division=0))
    print("confusion_matrix=")
    print(confusion_matrix(encoder.transform(test["pose_label"]), predictions))
    args.out.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "labels": encoder.classes_.tolist(), "feature_columns": feature_columns, "threshold": float(max(.60, probabilities.mean() - probabilities.std()))}, args.out / "pose_classifier.joblib")
    (args.out / "pose_classifier.metadata.json").write_text(json.dumps({"labels": encoder.classes_.tolist(), "feature_columns": feature_columns, "participant_split": True, "seed": args.seed}, indent=2), encoding="utf-8")
    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
        initial_type = [("float_input", FloatTensorType([None, len(feature_columns)]))]
        onnx_model = convert_sklearn(model, initial_types=initial_type, options={id(model): {"zipmap": False}}, target_opset=17)
        (args.out / "pose_classifier.onnx").write_bytes(onnx_model.SerializeToString())
        print(f"wrote {args.out / 'pose_classifier.onnx'}")
    except ImportError:
        print("skl2onnx is not installed; wrote joblib model only.")


if __name__ == "__main__":
    main()
