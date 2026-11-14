# Longevity Combine norms

Single source of truth: `lib/norms.ts`. The coach app, the report, the board and the printed sheet (`/sheet`) all read from it.

Calibrated Nov 13, 2026 to Nicole's benchmark sheet, plus:

| Test | Protocol | Norms |
|---|---|---|
| Grip | Dominant hand, best of 3 | Medians from Wang et al., JOSPT 2018 (Nicole's sheet); spread from iGRIPS 2025. Low-grip line: EWGSOP2 (<27 kg men, <16 kg women). |
| Balance | One leg, arms crossed, best of 3, stop at 45 s. Eyes closed by default; eyes open selectable | Springer et al. 2007, mean and SD by age, sexes pooled. Lognormal where skewed. |
| Push-ups | Untimed, to fatigue. Men full, women knees | ACSM categories from Nicole's sheet. 70+ extended from the 60s (no validated norms). |
| Squat hold | Thighs parallel, no wall, stop at 60 s (1:00 Club) | No validated norms. Groove estimate. |
| Floor rise | Sitting-rising test, 0-10 | Tiers: mortality risk bands (Brito 2012; Araújo 2025). Age comparison modeled to match Araújo 2020 published findings (age tables are only in a figure). |

Capped results (eyes-open balance under 60, a perfect 10 on floor rise when young) rank at the middle of the tied group, not the 95th percentile.
