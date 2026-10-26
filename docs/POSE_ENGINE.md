# JoJo Pose Vision pose engine

This project now has a pre-training geometric pipeline. It does not pretend that a single anime illustration contains exact 3D anatomy. Each artwork becomes a manually annotated 2D reference signature, and the webcam skeleton is compared against that signature locally.

## Architecture

`Reference artwork → manual 13 body + 6 face annotation → normalized features → weighted matcher`

`Webcam → MediaPipe Pose + Face Landmarkers → 13 body + 6 face landmarks → normalized features → compare complete references → temporal confirmation → feedback`

`Webcam → quality gate → IndexedDB feature record → JSON/CSV export → participant-separated Random Forest → optional ONNX browser classifier`

The math, references, matcher, smoother, and MediaPipe boundary are separated under `src/pose/` so an ML classifier can be added later behind the same scoring interface.

## Collecting training data

Open `/collector` after starting the app. Enter a participant ID, session ID, camera angle, and one of the labels `dio`, `giorno`, `jolyne`, `jonathan`, `metallica`, or `negative`. Start the camera, then record samples. Only frames with sufficient body and face quality are written to IndexedDB; video is not stored. Export JSON or CSV and train with:

```powershell
python training\train.py jojo-pose-dataset.csv --out models
```

The trainer groups the split by participant, prints validation/test metrics, and writes a Joblib model plus `models/pose_classifier.onnx` when ONNX conversion dependencies are installed. If the ONNX file is absent, the browser reports `GEOMETRIC FALLBACK` and continues using the explainable matcher.

## Annotating a new reference

1. Put the artwork in `public/poses/`.
2. Register it in `src/pose/reference.ts` with its required landmarks, weights, tolerances, and camera angle.
3. Open `/annotator`.
4. Select the artwork and click the 13 body anchors: nose, shoulders, elbows, wrists, hips, knees, and ankles.
5. Switch to `FACE / 6` and mark both eyes, nose, mouth corners, and chin. The face zoom helps with small anime faces.
6. Drag any point to correct it. Coordinates account for `object-fit: contain` letterboxing.
7. Save the draft. It is stored in browser `localStorage`, but only a complete 19-point schema-2 annotation can match.
8. Export `jojo-reference-poses.json` when you want a portable/static copy.
9. Try the reference in `/detector`.

## Math

Joint angle:

```text
theta = acos((BA · BC) / (|BA| |BC|))
```

Normalization:

```text
p_normalized = (p - hipCenter) / shoulderWidth
```

Each feature is converted to a Gaussian similarity:

```text
s_i = exp(-(error_i / sigma_i)^2)
```

Face features are normalized by eye distance, so a face's size in the artwork does not dominate the score. The final complete-reference score is `75% body geometry + 25% face geometry`. Missing face or body landmarks prevent confirmation; incomplete references are skipped completely.

## Mirroring, smoothing, and feedback

Mirror-enabled poses are compared in canonical and mirrored orientation. The higher score wins and the UI reports `MIRRORED ACCEPTED` when appropriate.

The temporal smoother keeps a 15-frame history. A result must pass the configured similarity, quality, margin, and agreement thresholds before it becomes `POSE CONFIRMED`; it must then remain stable for the hold duration before `POSE HELD`.

Feedback is generated from the lowest-similarity features, such as torso lean, elbow angle, knee angle, arm span, or stance width.

## MediaPipe and privacy

The browser uses MediaPipe Tasks Vision Pose Landmarker and Face Landmarker. Webcam frames are processed locally by the browser and are not uploaded by this app. The app does not identify people or perform face recognition. MediaPipe runtime/model assets are loaded from their configured CDN URLs when the detector starts; GPU loading falls back to CPU loading when available.

## Limitations

- A 2D anime image is not a 3D anatomical ground truth.
- Perspective, foreshortening, occlusion, body proportions, camera angle, and landmark noise affect similarity.
- `POSE MATCH` is a user-facing similarity measure, not model accuracy.
- The initial reference annotations live in browser storage until explicitly exported.
- A fresh browser or a different origin has separate annotation storage; annotate the references on the same localhost origin where you run the detector.

## Future ML interface

The current geometric scorer is intentionally explainable. A future `MLPoseScoringEngine` can return the same `PoseScore` shape and a hybrid layer can combine model probability with geometric similarity, for example `0.55 * mlScore + 0.45 * geometricScore`.
