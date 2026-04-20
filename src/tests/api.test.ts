import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage } from '../lib/api';
import type { ChatRequest, ChatResponse, ApiError } from '../lib/api';

const API_BASE = 'https://brush-up-py.fly.dev';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('sendMessage', () => {
  const request: ChatRequest = {
    user_id: 'test-user-123',
    tutor: 'python',
    question: 'What are decorators?',
    conversation_history: [],
  };

  it('sends a POST request with the correct payload', async () => {
    const mockResponse: ChatResponse = {
      response: 'Let me ask you something about decorators...',
      history: [
        { role: 'user', content: 'What are decorators?' },
        { role: 'assistant', content: 'Let me ask you something about decorators...' },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    await sendMessage(request);

    expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  });

  it('returns the parsed response on 200', async () => {
    const mockResponse: ChatResponse = {
      response: 'Great question!',
      history: [
        { role: 'user', content: 'What are decorators?' },
        { role: 'assistant', content: 'Great question!' },
      ],
      usage: { input_tokens: 100, output_tokens: 20 },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await sendMessage(request);
    expect(result).toEqual(mockResponse);
  });

  it('includes conversation history when provided', async () => {
    const requestWithHistory: ChatRequest = {
      user_id: 'test-user-123',
      tutor: 'python',
      question: 'Can you give me an example?',
      conversation_history: [
        { role: 'user', content: 'decorators' },
        { role: 'assistant', content: 'What do you know about decorators?' },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: '', history: [], usage: { input_tokens: 0, output_tokens: 0 } }), { status: 200 }),
    );

    await sendMessage(requestWithHistory);

    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(sentBody.conversation_history).toHaveLength(2);
    expect(sentBody.conversation_history[0]).toEqual({ role: 'user', content: 'decorators' });
  });

  it('throws an ApiError with "budget_exceeded" on 429 budget error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'budget_exceeded', detail: "You've used your token allocation." }),
        { status: 429 },
      ),
    );

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'budget_exceeded',
      message: "You've used your token allocation.",
    });
  });

  it('throws an ApiError with "rate_limited" on 429 rate limit error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'rate_limited', detail: 'Too many requests. Please slow down.' }),
        { status: 429 },
      ),
    );

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Too many requests. Please slow down.',
    });
  });

  it('sends the tutor value in the request body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: '', history: [], usage: { input_tokens: 0, output_tokens: 0 } }), { status: 200 }),
    );

    await sendMessage({
      user_id: 'test-user-123',
      tutor: 'ruby',
      question: 'What are blocks?',
      conversation_history: [],
    });

    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(sentBody.tutor).toBe('ruby');
  });

  it('throws an ApiError with "tutor_unavailable" on 503 tutor_unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'tutor_unavailable', detail: 'This tutor is temporarily unavailable.' }),
        { status: 503 },
      ),
    );

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'tutor_unavailable',
      message: 'This tutor is temporarily unavailable.',
    });
  });

  it('throws an ApiError with "overloaded" on 503', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'overloaded', detail: 'The AI service is temporarily busy.' }),
        { status: 503 },
      ),
    );

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'overloaded',
      message: 'The AI service is temporarily busy.',
    });
  });

  it('throws an ApiError with "api_error" on 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'api_error', detail: 'Something went wrong calling the AI service.' }),
        { status: 502 },
      ),
    );

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'api_error',
      message: 'Something went wrong calling the AI service.',
    });
  });

  it('throws an ApiError with "validation_error" on 422', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [{ type: 'string_too_short', loc: ['body', 'question'], msg: 'String should have at least 1 character' }],
        }),
        { status: 422 },
      ),
    );

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('throws an ApiError with "unknown" on unexpected status codes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'unknown',
    });
  });

  it('throws an ApiError with "network_error" when fetch itself fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(sendMessage(request)).rejects.toMatchObject({
      code: 'network_error',
      message: 'Failed to fetch',
    });
  });

  it('uses PUBLIC_API_BASE when set', async () => {
    vi.stubEnv('PUBLIC_API_BASE', 'http://localhost:8080');
    vi.resetModules();
    const { sendMessage: sendMessageReloaded } = await import('../lib/api');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: '', history: [], usage: { input_tokens: 0, output_tokens: 0 } }), { status: 200 }),
    );

    await sendMessageReloaded(request);

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/api/chat', expect.anything());
    vi.unstubAllEnvs();
  });
});
