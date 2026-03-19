import {
  Annotation,
  messagesStateReducer,
} from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

export const NutriGuideState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  user_id: Annotation<string>(),
  classification: Annotation<{ intent: "nutrition" | "chitchat" | "off_topic" | "log_food" } | undefined>(),
  analysis: Annotation<string | undefined>(),
});

export type NutriGuideStateType = typeof NutriGuideState.State;
