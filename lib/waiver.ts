/**
 * The waiver participants sign on the iPad before any test.
 *
 * To swap in counsel's final text: replace `text`, and change `version` to a new ID
 * (for example "2026-11-final-1"). Every signature stores the version it was signed under,
 * and the server refuses signatures from a page still showing an older version.
 */
export const WAIVER = {
  version: "placeholder-2026-11-12b",
  text: `PLACEHOLDER TEXT. REPLACE WITH COUNSEL'S FINAL VERSION BEFORE THE SHOW.

Release and Waiver of Liability: The Longevity Combine at HLTH 2026

I am choosing to take part in the Longevity Combine, a set of short physical tests run by Groove Health, Inc. ("Groove") at HLTH 2026. The tests are a one-leg balance hold with eyes closed, a grip strength squeeze, a wall sit, push-ups for up to 60 seconds, and sitting down to the floor and standing back up.

1. I am 18 or older.

2. I understand these tests involve physical effort and carry some risk, including muscle strain, soreness, loss of balance, falls, and in rare cases more serious injury. I take part voluntarily and accept these risks.

3. I have told the staff about any injury, recent surgery, dizziness, heart condition, or other health concern that could make a test unsafe for me. I will stop any test that causes pain or discomfort, and I can skip any test at any time.

4. The Combine is not medical care. My results are for general information and comparison only. They are not a diagnosis or a medical recommendation. I will talk to my doctor before acting on them.

5. To the fullest extent the law allows, I release Groove, its clinicians, staff, contractors, and event partners from claims arising from my taking part, except claims caused by gross negligence or willful misconduct.

6. Groove will store the information I give and my results to show me my report and, if I opt in below, to enter me in the speaker giveaway or email me my results. If I choose to appear on the leaderboard, it shows my first name and last initial. Groove will not sell my information.

7. If any part of this release is found unenforceable, the rest still applies.

By checking the box and typing my name, I confirm I have read this release and agree to it.`,
} as const;
