# Owner feedback — generation 4 (first pass)

## Verdict on the round as delivered

"Texture is way too conspicuous, especially in the main area. Looks childish.
And the 'wiggly paper' [deckle edge on 22] — I'm not a baby." No new variants;
the six candidates were fixed up in place.

## Distilled directives (continue numbering)

21. **Texture must be quiet.** Perceptible on close inspection, never a
    statement. Calibration that survived the fix (measured as grayscale σ on
    1:1 crops of the rendered page): mat ≈ 2–5/255, sheet ≈ 1.3–2.4/255.
    Gen-4's first pass (mat up to ~8–24, sheet ~4–7) read as childish.
    The sheet — the main reading surface — gets the strictest cap.
22. **No novelty paper effects.** Deckle/torn edges are out. Sheet edges are
    straight.

## Fixes applied in place (r2, by Claude — no agents)

All texture amplitudes were scaled numerically (transfer-function slopes,
alpha-matrix rows, or layer opacities — whichever mechanism each file used):

- **17:** board weave gain 2.6→1.2, slub 1.9→0.9; sheet multiply bands
  [0.905,1]→[0.968,1] and [0.972,1]→[0.988,1].
- **18:** board tooth/fibre gains ×~0.47, fleck alpha halved; sheet paper/pulp
  gains ×~0.35. Gilt burnish untouched.
- **19:** laid ribbing/chain alphas ×~0.45 (mat) and ×~0.4 (sheet); fibre and
  tooth gains halved.
- **20:** layer opacities — board 0.8→0.35, mount 0.75→0.22, sheet 0.66→0.30.
- **21:** shared tile alphas ×0.45; sheet overlay opacity 0.52→0.40.
- **22:** deckle edge REMOVED (straight sheet, inline SVG displacement filter
  deleted); wall tooth 0.65→0.30, mottle 0.4→0.20, sheet tooth 0.42→0.18.

Measured after fix (grayscale σ, clean 1:1 crops): mats 17≈4, 18≈3, 19≈4–5,
20≈4.5, 21≈3.9, 22≈1.9; sheets 17≈2.4, 18≈1.3, 19≈1.8, 20≈1.3, 21≈2.0,
22≈2.1.

## Second-pass feedback (on r2)

Still too much: 17 linen "way too conspicuous"; 19 texture ditto; 18 "decent,
but image frame is way too conspicuous — needs to be much more in the
background"; 20/21/22 too much texture AND "really don't like this 'extra
frame'" (nested mount panels / inset hairline frames around the sheet).

**Owner: focus on the monograph descendants (17/18/19) — "the clear winner so
far."** 20–22 deprioritized, left as-is.

## Distilled directives (continue numbering)

23. **No nested/extra frames.** No double mounts, no inset hairline frames
    around the sheet, no plate-marks drawn on the mat. One sheet, one artwork
    frame, nothing else.
24. **The artwork frame must recede.** Slim, quiet, close to the page's
    register — never the loudest object. 18's bright old-gold at L* 62 on an
    L* 80 board was too much; muted greyed brass near the board's own value
    passed.
25. **Structured textures (weave, laid ribbing) are more conspicuous than
    isotropic grain at equal σ.** Cap them near σ ≈ 2–3 mat, ≈ 1 sheet.

## Fixes applied in place (r3, monograph children only)

- **17:** weave gains cut a further ~2.7× (mat σ 4.3 → 3.0, sheet 2.4 → 1.0).
- **18:** frame receded — rail 9.6px → 5.6px, gold #b8904a → muted brass
  #b4a170 near board value, crisp rebate line deleted, edge line softened,
  shadows lightened. Texture untouched ("decent").
- **19:** plate-mark emboss REMOVED; ribbing/chain/fibre/tooth cut a further
  ~2× (mat σ 5.4 → 2.7, sheet 1.8 → 0.9).
