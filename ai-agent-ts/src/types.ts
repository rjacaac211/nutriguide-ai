export interface ChatRequest {
  user_id: string;
  message: string;
  thread_id: string;
}

/**
 * SSE event payloads streamed from POST /chat. Event names map to SSE `event:` lines:
 * "token" (one per streamed content chunk), "interrupt" (food-log confirmation pause,
 * sent once), "done" (terminates the stream), "error" (stream failed after headers were sent).
 */
export interface ChatTokenEvent {
  text: string;
}

export interface ChatInterruptEvent {
  text: string;
}

export interface ChatDoneEvent {
  interrupted: boolean;
}

export interface ChatErrorEvent {
  error: string;
}
