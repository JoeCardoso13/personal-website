export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  user_id: string;
  question: string;
  conversation_history: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  history: ChatMessage[];
  usage: { input_tokens: number; output_tokens: number };
}

export interface ApiError {
  code: 'budget_exceeded' | 'rate_limited' | 'overloaded' | 'api_error' | 'validation_error' | 'network_error' | 'unknown';
  message: string;
}

const API_BASE = 'https://brush-up-py.fly.dev';

type ErrorPayload = {
  error?: ApiError['code'];
  detail?: unknown;
};

function toApiError(code: ApiError['code'], message: string): ApiError {
  return { code, message };
}

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function detailToMessage(detail: unknown, fallback: string): string {
  return typeof detail === 'string' ? detail : fallback;
}

async function buildApiError(response: Response): Promise<ApiError> {
  const payload = await readErrorPayload(response);

  if (response.status === 429) {
    const code = payload.error === 'budget_exceeded' ? 'budget_exceeded' : 'rate_limited';
    const fallback = code === 'budget_exceeded' ? "You've used your token allocation." : 'Too many requests. Please slow down.';
    return toApiError(code, detailToMessage(payload.detail, fallback));
  }

  if (response.status === 503) {
    return toApiError('overloaded', detailToMessage(payload.detail, 'The AI service is temporarily busy.'));
  }

  if (response.status === 502) {
    return toApiError('api_error', detailToMessage(payload.detail, 'Something went wrong calling the AI service.'));
  }

  if (response.status === 422) {
    return toApiError('validation_error', detailToMessage(payload.detail, 'Please check your message and try again.'));
  }

  return toApiError('unknown', `Unexpected response from the server (${response.status}).`);
}

export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch (error) {
    throw toApiError('network_error', error instanceof Error ? error.message : 'Network error');
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json();
}
