export interface ChatRequest {
  user_id: string;
  message: string;
  thread_id: string;
  user_profiles?: Record<string, Record<string, unknown>>;
}

export interface ChatResponse {
  response: string;
}
