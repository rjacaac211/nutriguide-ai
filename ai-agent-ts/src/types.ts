export interface ChatRequest {
  user_id: string;
  message: string;
  thread_id: string;
}

export interface ChatResponse {
  response: string;
  interrupted?: boolean;
}
