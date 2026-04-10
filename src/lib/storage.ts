import type { ChatMessage } from './api';

const USER_ID_KEY = 'brush-up-py:user_id';
const HISTORY_KEY = 'brush-up-py:history';

export function getUserId(): string {
  const existingId = localStorage.getItem(USER_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const id = crypto.randomUUID();
  localStorage.setItem(USER_ID_KEY, id);
  return id;
}

export function getHistory(): ChatMessage[] {
  const storedHistory = localStorage.getItem(HISTORY_KEY);

  if (!storedHistory) {
    return [];
  }

  try {
    const history = JSON.parse(storedHistory);
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

export function setHistory(history: ChatMessage[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
