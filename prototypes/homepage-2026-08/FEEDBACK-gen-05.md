# Generation 5 — iterating on the laid-paper winner

Owner verdict after gen-4 r3: the laid paper (19) is the one to iterate on.
Baseline committed (3e05037) before iteration began. 19 stays frozen at r3 in
gen-04 for side-by-side comparison; all iteration happens on the copy
`gen-05/23-laidpaper.html`.

## r1 (Claude, unprompted first pass — applying what already passed elsewhere)

Frame recession per directive 24, translating 18's passed recipe to the pewter:

- rail 0.6rem → 0.35rem (9.6px → 5.6px)
- `--frame` #948d82 (L* ~59, Δ~22 vs mat) → #a89f92 (L* ~67, Δ~14 — the same
  frame-to-surround gap that passed on 18)
- edge line alpha 0.42 → 0.28; mount shadows and hover shadows lightened to
  18's passed register
- Music pin re-measured: 14.9rem → 15.066rem (Music/Software Δ = 0.00px)

Texture untouched — measured after: mat σ 2.69, sheet 0.86 (same as 19-r3).

## Owner feedback on r1

1. Frame still much too conspicuous — too thick, and the color doesn't blend.
   Frame color should be much more similar to the background.
2. The gray right-aligned subtitles: make them lighter gray and LEFT-aligned,
   running after the core text; on hover they become more visible.
3. Right-column order: About, Software, Essays, Papers.
4. Stop pinning Music to align with Software. No big gap between Artworks and
   Music — Music follows immediately after (another artwork may come later).

## r2 changes

- Frame: `--frame` #a89f92 → #d5bfa2 (mat-toned, a hair below the surround),
  rail 0.35rem → 0.25rem (4px), edge alpha 0.28 → 0.22, brushed-metal texture
  removed (flat).
- Glosses (Essays/Software/Music): new `--gloss` #a39a88 light gray, rows now
  `justify-content: flex-start` so the gloss runs inline after the title;
  row hover darkens it to `--ink-mid` (existing rule). Papers' venue·year
  rail kept right-aligned as a data column — flagged for owner to confirm.
- Right column reordered About / Software / Essays / Papers.
- Music pin deleted; Music sits 3.2rem (standard section gap) under Artworks.

## Owner feedback on r2

Frame thinner still, and a bit brighter — still too high contrast against the
background. Papers venues inline too.

## r3 changes

- Frame: `--frame` #d5bfa2 → #e3d2b8 (between mat and sheet), rail
  0.25rem → 0.15rem (2.4px), edge alpha 0.22 → 0.16.
- Papers rows joined the inline pattern: `.row` is now `flex-start` across the
  board, venue metas colored `--gloss` like the other subtitles, hover darkens.
  Long titles still ellipsize when title+venue overflow the column.

## Owner feedback on r3

Spacing between heading and list, and between sections, both a bit too large.
(Confirmed no principle conflict: heading→list vs section→section ratio
actually improves, 2.7:1 → 3.4:1.)

## r4 changes

- Heading→list: `.head` margin-bottom 1.2rem → 0.8rem.
- Section gap: 3.2rem → 2.7rem (both columns, incl. contact→Artworks).

## Owner feedback on r4

Frame color wrong: too close to the artwork yet different. Asked for the
aesthetic logic of frame color — mustn't steal attention, must glue the
artwork to the surroundings so it looks intentional.

## r5 changes — the frame-color logic

Diagnosis: the artwork's own field is cream/peach, so the whole warm-light
band (mat, sheet, anything between) is occupied by the picture itself. Any
frame from that band reads as a slightly-off extension of the artwork —
i.e., accidental. Value-matching cannot glue THIS artwork to THIS page.

Principle: glue comes from relationship, not adjacency-similarity — the frame
color must demonstrably come from somewhere: the artwork's palette or the
page's accent system. Sampled the artwork: figure/ridge darks ≈ #352020, lit
ridge ≈ #833024 ≈ the site accent #93381b. Artwork, accent, ink = one family.

- Frame: hairline in the artwork's own darkest tone, `--frame` #3e2a25,
  padding 0.2rem (3.2px), border/edge-line removed (the dark IS the edge).

Standing directive candidate: 26. **Frame color must be sampled, not
interpolated** — from the artwork's palette (or the page's accent family),
never a tone between the surfaces it touches.

## Owner feedback on r5

Too dark and/or thick — still steals a shitton of attention.

## r6 changes

Frame abandoned entirely. The plate is now tipped in: no rail, just a 1px
keyline at rgba(62,42,37,0.4) directly on the image edge (the print-book
plate treatment), with the existing soft shadow doing the separation.
Visual weight vs r5: ~3.2px solid dark → 1px at 40% alpha.

## Owner feedback on r6

Don't like the gray keyline. Try no frame.

## r7 changes

Keyline deleted. The plate is fully frameless — only the soft drop shadow
separates it from the sheet. The artwork's busy edges (filaments, ridge)
self-define most of the perimeter; the pale sun corner relies on the shadow.

## r8 changes (owner-requested details)

- Music links switched from YouTube to SoundCloud (volkstamusic); third track
  Organ Glow added (owner-authorized addition to the word bank).
- Publication years added as gray metas after each track title (verified on
  SoundCloud via codex: Temple Juice 2024, Fresh Pressed Deity 2024,
  Organ Glow 2023) — same treatment as the papers' venue·year metas.

## r9–r12 (owner-directed detail passes)

- r9: ↗ arrows moved after subtitles; r10: arrows removed from list rows
  entirely (kept only on the two About prose links).
- r11: title→subtitle flush — `.row` gap 1rem → 0.45em.
- r12: "electronic music meets church music" deleted. Reason (agreed):
  italic-gray-after-title means item subtitle everywhere else; a section-level
  description in that same style reads as a mislabeled row, and About already
  carries the fact. Directive candidate: one visual token = one meaning.

## r13 — band album added

Owner has an old band (Achenar) with a released album; wanted a significant
"this is different" signal, sketched artist-prefixes on every row but found it
messy. Agreed principle: solo tracks are the default, mark only the exception,
in the existing gray-meta slot. Added final Music row:
"Sacred Duality  with Achenar · 2014" → Spotify album link (tracking param
stripped). No artist prefix on the Volksta rows.
