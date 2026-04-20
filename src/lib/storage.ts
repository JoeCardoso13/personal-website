import type { ChatMessage, Tutor } from './api';

const USER_ID_KEY = 'brush-up:user_id';
const LEGACY_USER_ID_KEY = 'brush-up-py:user_id';
const LEGACY_PYTHON_HISTORY_KEY = 'brush-up-py:history';

function historyKey(tutor: Tutor): string {
  return `brush-up:${tutor}:history`;
}

export function getUserId(): string {
  const existingId = localStorage.getItem(USER_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const legacyId = localStorage.getItem(LEGACY_USER_ID_KEY);

  if (legacyId) {
    localStorage.setItem(USER_ID_KEY, legacyId);
    localStorage.removeItem(LEGACY_USER_ID_KEY);
    return legacyId;
  }

  const id = crypto.randomUUID();
  localStorage.setItem(USER_ID_KEY, id);
  return id;
}

function parseHistory(raw: string | null): ChatMessage[] {
  if (!raw) {
    return [];
  }

  try {
    const history = JSON.parse(raw);
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

export function getHistory(tutor: Tutor): ChatMessage[] {
  const key = historyKey(tutor);
  const stored = localStorage.getItem(key);

  if (stored !== null) {
    return parseHistory(stored);
  }

  if (tutor === 'python') {
    const legacy = localStorage.getItem(LEGACY_PYTHON_HISTORY_KEY);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_PYTHON_HISTORY_KEY);
      return parseHistory(legacy);
    }
  }

  return [];
}

export function setHistory(tutor: Tutor, history: ChatMessage[]): void {
  localStorage.setItem(historyKey(tutor), JSON.stringify(history));
}

export function clearHistory(tutor: Tutor): void {
  localStorage.removeItem(historyKey(tutor));
}
