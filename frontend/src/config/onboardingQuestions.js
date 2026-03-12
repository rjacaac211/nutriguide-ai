/** Onboarding question definitions. Each question is one slide. */

export const QUESTION_TYPES = {
  SINGLE: "single",
  MULTI: "multi",
  DATE: "date",
  NUMBER_UNIT: "number+unit",
  SLIDER: "slider",
};

export const ONBOARDING_QUESTIONS = [
  {
    id: "goal",
    question: "What's your primary goal?",
    type: QUESTION_TYPES.SINGLE,
    field: "goal",
    choices: [
      { value: "lose", label: "I want to lose weight" },
      { value: "maintain", label: "I want to maintain weight" },
      { value: "gain_muscle", label: "I want to gain muscle mass" },
      { value: "eat_healthy", label: "I want to eat healthier" },
    ],
    skipWhen: null,
  },
  {
    id: "gender",
    question: "What gender were you assigned at birth?",
    type: QUESTION_TYPES.SINGLE,
    field: "gender",
    choices: [
      { value: "female", label: "Female" },
      { value: "male", label: "Male" },
    ],
    skipWhen: null,
  },
  {
    id: "birth_date",
    question: "When were you born?",
    type: QUESTION_TYPES.DATE,
    field: "birth_date",
    skipWhen: null,
  },
  {
    id: "height",
    question: "How tall are you?",
    type: QUESTION_TYPES.NUMBER_UNIT,
    field: "height_cm",
    units: [
      { value: "cm", label: "cm" },
      { value: "ft_in", label: "ft/in" },
    ],
    min: 100,
    max: 250,
    skipWhen: null,
  },
  {
    id: "weight",
    question: "What do you weigh now?",
    type: QUESTION_TYPES.NUMBER_UNIT,
    field: "weight_kg",
    units: [
      { value: "kg", label: "kg" },
      { value: "lbs", label: "lbs" },
    ],
    min: 30,
    max: 300,
    skipWhen: null,
  },
  {
    id: "goal_weight",
    question: "What is your goal weight?",
    type: QUESTION_TYPES.NUMBER_UNIT,
    field: "goal_weight_kg",
    units: [
      { value: "kg", label: "kg" },
      { value: "lbs", label: "lbs" },
    ],
    min: 30,
    max: 300,
    skipWhen: (profile) => profile?.goal === "maintain",
  },
  {
    id: "preferences",
    question: "What else matters to you?",
    type: QUESTION_TYPES.MULTI,
    field: "preferences",
    choices: [
      { value: "energy", label: "More daily energy" },
      { value: "sleep", label: "Better sleep" },
      { value: "mood", label: "Mood stability" },
      { value: "structure", label: "Meal structure" },
      { value: "cooking", label: "Cooking skills" },
      { value: "clarity", label: "Mental clarity" },
    ],
    skipWhen: null,
  },
  {
    id: "challenges",
    question: "What feels challenging?",
    type: QUESTION_TYPES.MULTI,
    field: "challenges",
    choices: [
      { value: "routine", label: "Keeping a routine" },
      { value: "planning", label: "Planning meals" },
      { value: "cravings", label: "Managing cravings" },
      { value: "portions", label: "Portion control" },
      { value: "recipes", label: "Finding recipes" },
      { value: "choices", label: "Making healthy choices" },
      { value: "support", label: "Feeling supported" },
    ],
    skipWhen: null,
  },
  {
    id: "activity_level",
    question: "What's your typical day like?",
    type: QUESTION_TYPES.SINGLE,
    field: "activity_level",
    choices: [
      { value: "sedentary", label: "My days are mostly sitting" },
      { value: "light", label: "I get light movement in" },
      { value: "active", label: "I'm active on most days" },
      { value: "very_active", label: "I train or exercise regularly" },
    ],
    skipWhen: null,
  },
  {
    id: "speed",
    question: "Desired speed of change?",
    type: QUESTION_TYPES.SLIDER,
    field: "speed_kg_per_week",
    min: 0.25,
    max: 1.0,
    step: 0.05,
    unit: "kg/week",
    skipWhen: (profile) => profile?.goal !== "lose",
  },
];

/** Get questions that apply for the current profile (respect skip logic). */
export function getQuestionsForProfile(profile) {
  return ONBOARDING_QUESTIONS.filter((q) => {
    if (!q.skipWhen) return true;
    return !q.skipWhen(profile);
  });
}
