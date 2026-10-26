# Trained models

This directory contains model documentation. The browser-served model artifacts are written to `public/models` by the training script.

After training, `public/models` should contain:

- `pose_classifier.onnx` — browser inference model
- `pose_classifier.metadata.json` — labels and feature order
- `pose_classifier.joblib` — Python evaluation artifact

The browser should continue using the geometric matcher when `public/models/pose_classifier.onnx` is absent. Never commit camera recordings or personal data to this directory.
