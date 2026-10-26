# JoJo Pose training

## 1. Collect samples

Run the app and open `/collector`. Record `dio`, `giorno`, `jolyne`, `jonathan`, `metallica`, and `negative` samples from multiple participants. Export `jojo-pose-dataset.csv`.

Recommended starting dataset:

- 5–10 participants
- 150–300 samples per pose per participant
- 1,000–3,000 negative samples

## 2. Install training dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r training\requirements.txt
```

## 3. Train

```powershell
python training\train.py jojo-pose-dataset.csv --out public\models
```

The script splits by `participant_id`, prints test metrics and a confusion matrix, writes a Joblib bundle, and exports `public/models/pose_classifier.onnx` when `skl2onnx` is available. That folder is served by Vite at `/models`, so the browser can load the trained classifier after a restart.

Do not split adjacent video frames randomly. That would leak nearly identical samples between train and test.
