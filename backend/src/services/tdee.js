/**
 * TDEE (Total Daily Energy Expenditure) calculation using Mifflin-St Jeor.
 * Used to derive calorie goals from user profile.
 */

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.55,
  very_active: 1.725,
};

// ~7700 kcal per kg of body weight change
const KCAL_PER_KG = 7700;

/**
 * Mifflin-St Jeor BMR formula.
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age
 * @param {string} gender - "male" or "female"
 */
function mifflinStJeorBMR(weightKg, heightCm, age, gender) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

/**
 * Calculate TDEE and goal calories from profile.
 * @param {Object} profile - Profile with heightCm, weightKg, age, gender, goal, activityLevel, speedKgPerWeek
 * @returns {{ goalKcal: number, bmr: number, tdee: number }}
 */
export function calculateTDEE(profile) {
  const heightCm = toNum(profile?.heightCm);
  const weightKg = toNum(profile?.weightKg);
  const age = profile?.age ?? null;
  const gender = (profile?.gender || "female").toLowerCase();
  const goal = (profile?.goal || "maintain").toLowerCase();
  const activityLevel = (profile?.activityLevel || "moderate").toLowerCase();
  const speedKgPerWeek = toNum(profile?.speedKgPerWeek);

  const mult = ACTIVITY_MULTIPLIERS[activityLevel] ?? ACTIVITY_MULTIPLIERS.moderate;

  if (!heightCm || !weightKg || !age || age < 1) {
    return { goalKcal: 2000, bmr: null, tdee: null };
  }

  const bmr = mifflinStJeorBMR(weightKg, heightCm, age, gender);
  const tdee = bmr * mult;

  let goalKcal = tdee;

  if (goal === "lose" && speedKgPerWeek > 0) {
    const deficitPerDay = (speedKgPerWeek * KCAL_PER_KG) / 7;
    goalKcal = Math.max(1200, tdee - deficitPerDay);
  } else if (goal === "gain_muscle") {
    goalKcal = tdee + 250; // ~0.25 kg/week surplus
  }
  // maintain, eat_healthy: goalKcal = tdee

  return {
    goalKcal: Math.round(goalKcal),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}

function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
