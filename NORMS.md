# Longevity Combine: scoring and norms (draft for PT review)

**How scoring works**

- **Each test:** the raw result becomes 0 to 100 points, an estimate of the person's percentile against people of the same sex and age.
- **Combine Score:** the sum of points across the tests they did, max 500. Doing more tests and doing them well both count, and a strong 72-year-old can beat a 35-year-old.
- **Tiers on the report:** Building (under 25th percentile), Solid (25th to 74th), Strong (75th to 89th), Elite (90th and up).

**What we need from Nicole and Katie**

1. Confirm or edit each protocol line.
2. Confirm or replace every row marked **estimate**.
3. Sign off on the tier cut-points.

## The five tests

| Test | Protocol | Norm source | Confidence |
| --- | --- | --- | --- |
| Grip strength (kg) | Best of 2 per hand, score the stronger hand | iGRIPS international norms 2025, about 2.4M adults, 5-year age bands | High |
| Single-leg balance, eyes closed (sec, cap 60) | Arms crossed, best side. Stops on foot touch, arms uncross, eyes open, or 60 sec | Springer 2007 (n=549) eyes-closed means by decade | **Estimate.** The paper gives means only, so percentiles are modeled from the mean |
| Wall sit (sec, cap 2:00) | Back flat, thighs parallel. 2:00 = "2:00 Club" | None published for older adults | **Groove provisional curve.** Medians by age: under 40: 60s, 40s: 50s, 50s: 45s, 60s: 35s, 70s: 25s, 80+: 18s |
| Push-ups (reps in 60 sec) | Men full, women from knees, chest to a fist | CSEP-PATH adult norms (to 69) | Medium. CSEP is to fatigue, not timed. **70+ extrapolated** |
| Floor rise (0 to 10) | Standard sitting-rising scoring | Araújo 2020 (n=6,141) | **Estimate.** Reference charts are in a supplement we couldn't access. Nicole, can you pull it? |

## Sample results (sanity check)

| Person | Result | Percentile |
| --- | --- | --- |
| Woman, 65 | Grip 25 kg | 50th |
| Man, 45 | Grip 60 kg | 86th |
| Woman, 65 | Balance 3 sec | 51st |
| Man, 72 | Balance 10 sec | 99th |
| Man, 55 | 30 push-ups | 97th |
| Man, 62 | Floor rise 10 | 96th |
| Woman, 75 | Floor rise 4 | 42nd |
| Woman, 68 | Wall sit 35 sec | 50th |

## Open questions for the PT team

- **Balance:** eyes-closed norms drop to a mean of about 2 to 4 seconds after 60, so 10+ seconds at 70 reads as elite. Does that match what you see clinically?
- **Wall sit:** are the provisional medians reasonable? Would you adjust the 70+ figure?
- **Push-ups:** same standard for everyone over 70, or offer an incline (hands on the counter) option?
- **Floor rise:** who scores it live? Recommend one person per shift so scoring stays consistent.

All values live in `lib/norms.ts`. Changing a number there updates scoring everywhere.
