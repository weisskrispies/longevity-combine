/** Copy library. DRAFT: every clinical claim needs Katie/Nicole sign-off before HLTH. */
import type { Scores, Sex, TestId, Tier } from "./norms";

export const WHAT: Record<TestId, string> = {
  grip: "The quickest read on whole-body strength.",
  balance: "How steady you are on one leg.",
  squat: "The leg strength behind stairs, low chairs and long walks.",
  pushups: "Upper-body strength for lifting, pushing and catching yourself.",
  floor: "Strength, balance and mobility in one move.",
};
export const NOUN: Record<TestId, string> = { grip: "grip strength", balance: "balance", squat: "leg strength", pushups: "upper-body strength", floor: "floor rise" };

export const CLIN: Record<TestId, (sex: Sex, s: Scores) => string> = {
  grip: (sex) => `Medians come from US adults (Wang 2018). Below ${sex === "F" ? 16 : 27} kg is the European sarcopenia consensus cut-off for low muscle strength at any age (EWGSOP2). In a 17-country cohort, grip predicted cardiovascular events and mortality better than systolic blood pressure (PURE, Lancet 2015).`,
  balance: (_sex, s) => s.balance_eo
    ? "Eyes open, most people hold the full 45 seconds through their 50s; average best holds drop to about 32 seconds in the 60s and 21 in the 70s (Springer 2007, 549 adults). Older adults who can't hold 5 seconds have a higher risk of injurious falls (Vellas 1997)."
    : "Closing your eyes removes vision, so the test isolates the inner ear and the sensors in your feet. Average best holds fall from about 15 seconds under 40 to about 4 seconds in the 60s (Springer 2007, 549 adults). Men and women score the same.",
  squat: () => "A hold for leg strength and endurance, the strength behind stairs and low chairs. No validated age norms exist for a squat or wall-sit hold, so this compares you with a Groove estimate. Read it as directional.",
  pushups: () => "Upper-body strength and endurance, ranked against ACSM norms (untimed, to fatigue). In a 10-year cohort of male firefighters, 40+ push-ups was associated with 96% fewer cardiovascular events than fewer than 10 (Yang, JAMA Netw Open 2019).",
  floor: () => "The sitting-rising test combines strength, balance and mobility. In adults 51 to 80, scores of 0 to 3 carried about 6 times the mortality of 8 to 10 (Brito 2012). In 4,282 adults followed for 12 years, scores of 0 to 4 carried almost 4 times the risk of a perfect 10 (Araújo 2025).",
};

export const ASPIRE: Record<string, { label: string; tests: TestId[]; takes: string }> = {
  grandkids: { label: "Get on the floor with grandkids", tests: ["floor", "squat"], takes: "Getting down to the floor and back up, and lifting a 30-pound child." },
  travel: { label: "Travel and carry my own bags", tests: ["grip", "squat", "balance"], takes: "Lifting a 40-pound bag into an overhead bin, long airport walks, and steady footing on cobblestones and stairs." },
  hike: { label: "Hike", tests: ["squat", "balance"], takes: "Leg strength on climbs and descents, and balance on uneven ground." },
  golf: { label: "Golf", tests: ["balance", "grip"], takes: "Stability on one leg through the swing, and grip to control the club." },
  racquet: { label: "Play pickleball or tennis", tests: ["balance", "squat"], takes: "Quick changes of direction, and leg strength to stay low." },
  garden: { label: "Garden", tests: ["floor", "grip"], takes: "Kneeling and getting back up, and carrying soil and tools." },
  dance: { label: "Dance", tests: ["balance", "squat"], takes: "Balance through turns, and leg endurance for a full evening." },
  ski: { label: "Ski", tests: ["squat", "balance"], takes: "Holding a bent-knee position for long runs, and recovering balance fast." },
  walk: { label: "Walk for miles", tests: ["squat", "balance"], takes: "Leg endurance for miles, and balance on curbs and trails." },
  lift: { label: "Lift my own groceries", tests: ["grip", "pushups"], takes: "Grip and upper-body strength to carry groceries up the stairs." },
  work: { label: "Keep working", tests: ["grip", "balance"], takes: "The everyday strength and steadiness that keep long days easy." },
  independent: { label: "Live on my own terms", tests: ["floor", "balance", "grip"], takes: "Getting up from the floor, steady balance, and the strength to run your own home." },
};

export const ROLES: Record<string, [string, "a" | "b" | "c"]> = {
  plan: ["Health plan", "a"], group: ["Medical group", "a"], system: ["Health system", "b"], investor: ["Investor", "b"],
  press: ["Press", "b"], vendor: ["Startup or vendor", "c"], other: ["Something else", "c"],
};

export const HABITS: Record<TestId, { title: string; when: string[]; dose: Record<Tier, string>; why: string }> = {
  balance: { title: "Brush on one leg", when: ["Brushing your teeth", "Waiting for the kettle"],
    dose: { building: "Stand on one leg for 20 seconds, then switch. Counter within reach.", solid: "Stand on one leg for 30 seconds, then switch. Close your eyes for the last 10.", strong: "One leg, eyes closed, 30 seconds a side. Stand on a folded towel to make it harder.", elite: "One leg, eyes closed, on a folded towel. 30 seconds a side." },
    why: "Balance is a skill your nervous system relearns through repetition. Two short daily doses beat one long weekly session, and eyes-closed holds usually improve within a few weeks." },
  squat: { title: "No-hands chair rise", when: ["Every time you stand up", "During TV ads"],
    dose: { building: "Stand up from your chair without using your hands, 5 times in a row. Hands on thighs is fine to start.", solid: "Stand up with no hands, 8 times, taking 3 seconds to lower.", strong: "10 slow no-hands rises, or hold a squat for 30 seconds.", elite: "Hold a squat for 60 seconds a few times a week." },
    why: "Leg strength drops fastest with age, and it's what gets you up stairs and out of low chairs. Short, frequent sets of rising from a chair build it without a gym." },
  grip: { title: "Carry it the long way", when: ["Bringing in groceries", "Taking out the trash"],
    dose: { building: "Carry a full bag in each hand for 30 seconds. Walk an extra lap before setting them down.", solid: "Carry heavy bags or jugs for 45 seconds at a time, 3 times a day.", strong: "Hang from a sturdy bar or door frame for 20 seconds, twice a day.", elite: "Heavy carries a few times a week keep it." },
    why: "Grip reflects whole-body strength, and it responds to load. Holding heavy things for longer than feels natural is the simplest way to train it." },
  pushups: { title: "Counter push-ups", when: ["While the coffee brews", "Before lunch"],
    dose: { building: "10 push-ups with hands on the kitchen counter.", solid: "12 push-ups with hands on a sturdy chair seat.", strong: "10 floor push-ups, lowering for 3 seconds.", elite: "Floor push-ups a few times a week keep it." },
    why: "Upper-body strength is what catches you in a fall and lifts things overhead. Lowering the angle a little each week is how you progress." },
  floor: { title: "A daily floor visit", when: ["Watching TV", "Playing with a pet or grandkid"],
    dose: { building: "Once a day, get down to the floor and back up using a chair for support.", solid: "Sit on the floor once a day and get up using only one hand.", strong: "Sit down and stand up with no hands, 3 times in a row.", elite: "Keep visiting the floor. It's a habit worth never losing." },
    why: "Getting off the floor uses strength, balance and mobility together. People who stop doing it lose it fastest, so the practice itself is the training." },
};

export const PARTNER_EMAIL = "patrick@groovehealth.com";
