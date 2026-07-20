import { describe, it, expect } from "vitest";
import { calculateTDEE } from "./tdee.js";

const baseProfile = {
  heightCm: 175,
  weightKg: 70,
  age: 30,
  gender: "male",
  activityLevel: "sedentary",
  goal: "maintain",
};

describe("calculateTDEE", () => {
  it("computes BMR/TDEE for a male profile via Mifflin-St Jeor", () => {
    // BMR = 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    const result = calculateTDEE(baseProfile);
    expect(result.bmr).toBe(1649); // Math.round(1648.75)
    expect(result.tdee).toBe(Math.round(1648.75 * 1.2)); // sedentary multiplier
    expect(result.goalKcal).toBe(result.tdee); // maintain: goalKcal === tdee
  });

  it("computes BMR/TDEE for a female profile with a different offset", () => {
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    const result = calculateTDEE({
      ...baseProfile,
      weightKg: 60,
      heightCm: 165,
      age: 25,
      gender: "female",
    });
    expect(result.bmr).toBe(1345);
  });

  it("falls back to the female BMR offset for an unrecognized gender", () => {
    const female = calculateTDEE({ ...baseProfile, gender: "female" });
    const other = calculateTDEE({ ...baseProfile, gender: "other" });
    expect(other.bmr).toBe(female.bmr);
  });

  it("treats moderate and active as the same activity multiplier (both 1.55)", () => {
    const moderate = calculateTDEE({ ...baseProfile, activityLevel: "moderate" });
    const active = calculateTDEE({ ...baseProfile, activityLevel: "active" });
    expect(moderate.tdee).toBe(active.tdee);
  });

  it("falls back to moderate's multiplier for an unrecognized activity level", () => {
    const moderate = calculateTDEE({ ...baseProfile, activityLevel: "moderate" });
    const unknown = calculateTDEE({ ...baseProfile, activityLevel: "underwater basket weaving" });
    expect(unknown.tdee).toBe(moderate.tdee);
  });

  it.each([
    ["missing height", { ...baseProfile, heightCm: undefined }],
    ["missing weight", { ...baseProfile, weightKg: undefined }],
    ["missing age", { ...baseProfile, age: undefined }],
    ["zero age", { ...baseProfile, age: 0 }],
    ["age below 1", { ...baseProfile, age: 0.5 }],
  ])("returns the 2000 kcal fallback with null bmr/tdee when %s", (_label, profile) => {
    expect(calculateTDEE(profile)).toEqual({ goalKcal: 2000, bmr: null, tdee: null });
  });

  it("applies a speed-based deficit for goal=lose with a positive speed", () => {
    const maintain = calculateTDEE(baseProfile);
    const losing = calculateTDEE({ ...baseProfile, goal: "lose", speedKgPerWeek: 0.5 });
    // deficitPerDay = (0.5 * 7700) / 7 = 550
    expect(losing.goalKcal).toBe(Math.max(1200, maintain.tdee - 550));
  });

  it("floors the deficit-adjusted goal at 1200 kcal for an aggressive speed", () => {
    const losing = calculateTDEE({ ...baseProfile, goal: "lose", speedKgPerWeek: 5 });
    expect(losing.goalKcal).toBe(1200);
  });

  it("goal=lose with no/invalid speed silently behaves like maintain (no deficit applied)", () => {
    const maintain = calculateTDEE(baseProfile);
    const noSpeed = calculateTDEE({ ...baseProfile, goal: "lose" });
    const zeroSpeed = calculateTDEE({ ...baseProfile, goal: "lose", speedKgPerWeek: 0 });
    const negativeSpeed = calculateTDEE({ ...baseProfile, goal: "lose", speedKgPerWeek: -1 });
    expect(noSpeed.goalKcal).toBe(maintain.goalKcal);
    expect(zeroSpeed.goalKcal).toBe(maintain.goalKcal);
    expect(negativeSpeed.goalKcal).toBe(maintain.goalKcal);
  });

  it("applies a flat +250 kcal surplus for goal=gain_muscle regardless of speed", () => {
    const withSpeed = calculateTDEE({ ...baseProfile, goal: "gain_muscle", speedKgPerWeek: 1 });
    const withoutSpeed = calculateTDEE({ ...baseProfile, goal: "gain_muscle" });
    const maintain = calculateTDEE(baseProfile);
    expect(withSpeed.goalKcal).toBe(maintain.tdee + 250);
    expect(withoutSpeed.goalKcal).toBe(maintain.tdee + 250);
  });

  it("goal='gain' (not 'gain_muscle') is not matched by the gain_muscle branch and behaves like maintain", () => {
    // Documents current behavior — "gain" vs "gain_muscle" looks like a possible
    // naming mismatch, but this test only characterizes what the code does today.
    const maintain = calculateTDEE(baseProfile);
    const gain = calculateTDEE({ ...baseProfile, goal: "gain" });
    expect(gain.goalKcal).toBe(maintain.goalKcal);
  });

  it("does not reject negative weight (falsy-only guard lets it through)", () => {
    // Documents current behavior: the guard is `!heightCm || !weightKg`, which only
    // catches falsy/zero values, not negative ones. A negative weight currently
    // still produces a computed (arguably nonsensical) BMR rather than the 2000
    // kcal fallback a real validation guard would presumably return.
    // BMR = 10*(-70) + 6.25*175 - 5*30 + 5 = -700 + 1093.75 - 150 + 5 = 248.75
    const rejected = calculateTDEE({ ...baseProfile, weightKg: 0 });
    const negative = calculateTDEE({ ...baseProfile, weightKg: -70 });
    expect(rejected).toEqual({ goalKcal: 2000, bmr: null, tdee: null });
    expect(negative.bmr).toBe(249);
  });
});
