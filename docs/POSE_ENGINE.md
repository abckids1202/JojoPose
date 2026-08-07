# JoJo Pose Vision pose engine

This project now has a pre-training geometric pipeline. It does not pretend that a single anime illustration contains exact 3D anatomy. Each artwork becomes a manually annotated 2D reference signature, and the webcam skeleton is compared against that signature locally.

## Architecture

`Reference artwork → manual 13-point annotation → normalized features → weighted matcher`

`Webcam → MediaPipe Pose Landmarker → 13 mapped landmarks → normalized features → compare all references → temporal confirmation → feedback`

The math, references, matcher, smoother, and MediaPipe boundary are separated under `src/pose/` so an ML classifier can be added later behind the same scoring interface.

## Annotating a new reference

1. Put the artwork in `public/poses/`.
2. Register it in `src/pose/reference.ts` with its required landmarks, weights, tolerances, and camera angle.
3. Open `/annotator`.
4. Select the artwork and click the 13 body anchors: nose, shoulders, elbows, wrists, hips, knees, and ankles.
5. Drag any point to correct it.
6. Save the annotation. It is stored in browser `localStorage`.
7. Export `jojo-reference-poses.json` when you want a portable/static copy.
8. Try the reference in `/detector`.

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

The pose score is the weighted mean of available feature similarities. Missing landmarks reduce quality; unannotated references are skipped completely.

## Mirroring, smoothing, and feedback

Mirror-enabled poses are compared in canonical and mirrored orientation. The higher score wins and the UI reports `MIRRORED ACCEPTED` when appropriate.

The temporal smoother keeps a 15-frame history. A result must pass the configured similarity, quality, margin, and agreement thresholds before it becomes `POSE CONFIRMED`; it must then remain stable for the hold duration before `POSE HELD`.

Feedback is generated from the lowest-similarity features, such as torso lean, elbow angle, knee angle, arm span, or stance width.

## MediaPipe and privacy

The browser uses MediaPipe Tasks Vision Pose Landmarker with a Lite model. Webcam frames are processed locally by the browser and are not uploaded by this app. The app does not identify people or perform face recognition. MediaPipe runtime/model assets are loaded from their configured CDN URLs when the detector starts.

## Limitations

- A 2D anime image is not a 3D anatomical ground truth.
- Perspective, foreshortening, occlusion, body proportions, camera angle, and landmark noise affect similarity.
- `POSE MATCH` is a user-facing similarity measure, not model accuracy.
- The initial reference annotations live in browser storage until explicitly exported.

## Future ML interface

The current geometric scorer is intentionally explainable. A future `MLPoseScoringEngine` can return the same `PoseScore` shape and a hybrid layer can combine model probability with geometric similarity, for example `0.55 * mlScore + 0.45 * geometricScore`.
