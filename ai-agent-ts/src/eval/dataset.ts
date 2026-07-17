/**
 * Evaluation dataset for NutriGuide AI agent.
 * Input: { message, user_id }
 * Output (reference): { intent?, parsed?, expected_tools? }
 */

export const EVAL_USER_ID = "eval-test-user";

export interface EvalExampleInput {
  message: string;
  user_id: string;
}

export interface EvalExampleOutput {
  intent?: "nutrition" | "chitchat" | "off_topic" | "log_food";
  parsed?: {
    search_query: string;
    meal_type: string;
    grams?: number;
    amount?: number;
    unit?: string;
  };
  expected_tools?: string[];
  /**
   * Golden reference answer for LLM-as-judge grading (nutrition-intent examples only).
   * Grounded in ai-agent-ts/knowledge/healthy_diet.md where the topic is covered there;
   * written as open guidance where it isn't, so the judge grades reasonableness rather
   * than exact recall of facts the RAG corpus doesn't contain.
   */
  reference_answer?: string;
}

export interface EvalExample {
  inputs: EvalExampleInput;
  outputs?: EvalExampleOutput;
}

export const EVAL_EXAMPLES: EvalExample[] = [
  // --- Chitchat (10) ---
  {
    inputs: { message: "hi!", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "hello there", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "hey", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "thanks for the help!", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "thank you", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "how are you?", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "good morning", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "what's up?", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "ok cool", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },
  {
    inputs: { message: "got it, thanks!", user_id: EVAL_USER_ID },
    outputs: { intent: "chitchat" },
  },

  // --- Off-topic (8) ---
  {
    inputs: { message: "what's the weather in Manila?", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },
  {
    inputs: { message: "who won the election?", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },
  {
    inputs: { message: "can you help me with my computer?", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },
  {
    inputs: { message: "what's 2 + 2?", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },
  {
    inputs: { message: "tell me a joke", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },
  {
    inputs: { message: "what time is it?", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },
  {
    inputs: { message: "how do I fix my phone?", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },
  {
    inputs: { message: "what's the capital of France?", user_id: EVAL_USER_ID },
    outputs: { intent: "off_topic" },
  },

  // --- Log food (10) ---
  {
    inputs: { message: "log 100g chicken for lunch", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "chicken", grams: 100, meal_type: "lunch" },
    },
  },
  {
    inputs: { message: "add 1 cup rice for dinner", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "rice", amount: 1, unit: "cup", meal_type: "dinner" },
    },
  },
  {
    inputs: { message: "log 2 servings oatmeal for breakfast", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "oatmeal", amount: 2, unit: "servings", meal_type: "breakfast" },
    },
  },
  {
    inputs: { message: "record 50g salmon for lunch", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "salmon", grams: 50, meal_type: "lunch" },
    },
  },
  {
    inputs: { message: "add 1 tbsp peanut butter for snack", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "peanut butter", amount: 1, unit: "tbsp", meal_type: "snack" },
    },
  },
  {
    inputs: { message: "log 200g beef for dinner", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "beef", grams: 200, meal_type: "dinner" },
    },
  },
  {
    inputs: { message: "add 1 slice bread for breakfast", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "bread", amount: 1, unit: "slice", meal_type: "breakfast" },
    },
  },
  {
    inputs: { message: "log 150g pasta for lunch", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "pasta", grams: 150, meal_type: "lunch" },
    },
  },
  {
    inputs: { message: "add 2 cups milk for snack", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "milk", amount: 2, unit: "cups", meal_type: "snack" },
    },
  },
  {
    inputs: { message: "record 75g tofu for dinner", user_id: EVAL_USER_ID },
    outputs: {
      intent: "log_food",
      parsed: { search_query: "tofu", grams: 75, meal_type: "dinner" },
    },
  },

  // --- Nutrition (15) ---
  {
    inputs: { message: "how much protein should I eat per day?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
      reference_answer:
        "Protein intake of about 10-15% of total daily energy (roughly 50-75g at a 2000 kcal intake) is generally sufficient for adults; needs are higher during adolescence and for athletes/those building or maintaining muscle mass. Excessive protein can burden the kidneys.",
    },
  },
  {
    inputs: { message: "what's a good calorie deficit for weight loss?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "get_calorie_goal"],
      reference_answer:
        "A moderate calorie deficit (commonly cited as roughly 500 kcal/day below maintenance) supports gradual, sustainable weight loss. The response should ground this in the user's own TDEE-based calorie goal (from get_calorie_goal) rather than a generic number, and should not recommend an extreme deficit.",
    },
  },
  {
    inputs: { message: "what's my calorie goal?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["get_calorie_goal"],
      reference_answer:
        "Should state the user's actual TDEE-based calorie goal as returned by get_calorie_goal - no fixed number is expected since it's user-specific, but the response must reflect the tool's returned value rather than a generic estimate.",
    },
  },
  {
    inputs: { message: "how have I been eating lately?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["get_user_behavioural"],
      reference_answer:
        "Should summarize the user's recent logged food/calorie intake and weight trend using their actual behavioural data from get_user_behavioural, not a generic or fabricated summary.",
    },
  },
  {
    inputs: { message: "what are good high-protein foods?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "search_foods"],
      reference_answer:
        "Should suggest a variety of protein sources - lean meats, fish, eggs, legumes/pulses, dairy, tofu - drawing on both general nutrition guidance and concrete food suggestions.",
    },
  },
  {
    inputs: { message: "how many carbs should I have?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
      reference_answer:
        "General guidance is that carbohydrates should make up approximately 45-75% of total daily energy intake, primarily from whole grains, vegetables, fruits and pulses rather than refined/free-sugar sources.",
    },
  },
  {
    inputs: { message: "what's a healthy meal plan for weight loss?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "get_user_profile"],
      reference_answer:
        "Should reflect the core principles of adequacy, balance, moderation and diversity plus a moderate calorie deficit, and should be personalized to the user's profile/dietary restrictions rather than a generic templated plan.",
    },
  },
  {
    inputs: { message: "can I eat eggs if I'm trying to lose weight?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
      reference_answer:
        "Yes - eggs are a good protein source and can fit within a healthy weight-loss diet in moderation as part of a balanced, calorie-appropriate intake. Should not claim eggs are inherently good or bad without qualifying by overall diet context.",
    },
  },
  {
    inputs: { message: "what foods are good for muscle gain?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "search_foods"],
      reference_answer:
        "Should mention adequate protein intake (potentially above the general 10-15%-of-energy baseline for those actively building muscle) from varied sources, alongside sufficient total calories, ideally with concrete food suggestions.",
    },
  },
  {
    inputs: { message: "how much water should I drink?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
      reference_answer:
        "Not covered with a specific figure in the knowledge base - no single authoritative number is expected. A reasonable response gives general guidance (commonly cited range is roughly 2-3L/day, varying by individual, activity level and climate) without presenting a rigid or fabricated precise figure as universal fact.",
    },
  },
  {
    inputs: { message: "what's the best diet for diabetes?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
      reference_answer:
        "Not specifically covered in the knowledge base. A reasonable response gives general, sensible guidance (e.g. limiting free sugars, balanced carbohydrate intake, whole/minimally processed foods) while appropriately noting that specific medical/diabetes dietary guidance should come from a healthcare professional, rather than presenting itself as authoritative medical advice.",
    },
  },
  {
    inputs: { message: "should I eat before or after workout?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
      reference_answer:
        "Not specifically covered in the knowledge base. A reasonable response gives general guidance (e.g. both pre- and post-workout nutrition can matter, and total daily intake matters more than precise timing for most people) without fabricating specific unsupported numeric claims.",
    },
  },
  {
    inputs: { message: "what are my dietary restrictions?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["get_user_profile"],
      reference_answer:
        "Should state the user's actual dietary restrictions from their profile via get_user_profile, not a generic or fabricated answer.",
    },
  },
  {
    inputs: { message: "how many calories in an apple?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "search_foods"],
      reference_answer:
        "Should give a reasonable calorie estimate for an apple, ideally sourced from search_foods (USDA data) rather than fabricated from memory; a medium apple is roughly 90-100 kcal.",
    },
  },
  {
    inputs: { message: "what's a balanced breakfast?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
      reference_answer:
        "Should reflect the principles of balance and diversity - combining carbohydrates (e.g. whole grains), protein, and some fat/fiber-rich foods (e.g. fruit) - rather than a single-food or overly restrictive suggestion.",
    },
  },
];
