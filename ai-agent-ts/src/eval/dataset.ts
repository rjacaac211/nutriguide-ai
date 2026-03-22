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
    },
  },
  {
    inputs: { message: "what's a good calorie deficit for weight loss?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "get_calorie_goal"],
    },
  },
  {
    inputs: { message: "what's my calorie goal?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["get_calorie_goal"],
    },
  },
  {
    inputs: { message: "how have I been eating lately?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["get_user_behavioural"],
    },
  },
  {
    inputs: { message: "what are good high-protein foods?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "search_foods"],
    },
  },
  {
    inputs: { message: "how many carbs should I have?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
    },
  },
  {
    inputs: { message: "what's a healthy meal plan for weight loss?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "get_user_profile"],
    },
  },
  {
    inputs: { message: "can I eat eggs if I'm trying to lose weight?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
    },
  },
  {
    inputs: { message: "what foods are good for muscle gain?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "search_foods"],
    },
  },
  {
    inputs: { message: "how much water should I drink?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
    },
  },
  {
    inputs: { message: "what's the best diet for diabetes?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
    },
  },
  {
    inputs: { message: "should I eat before or after workout?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
    },
  },
  {
    inputs: { message: "what are my dietary restrictions?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["get_user_profile"],
    },
  },
  {
    inputs: { message: "how many calories in an apple?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge", "search_foods"],
    },
  },
  {
    inputs: { message: "what's a balanced breakfast?", user_id: EVAL_USER_ID },
    outputs: {
      intent: "nutrition",
      expected_tools: ["search_nutrition_knowledge"],
    },
  },
];
