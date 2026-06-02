import { config } from './config.js';

/**
 * Thin client for the happybox_back internal bot API. All calls carry the
 * shared x-bot-secret header.
 */
async function call(path, options = {}) {
  const res = await fetch(`${config.backendUrl}/api/bot${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': config.botApiSecret,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message =
      (body && body.message) || `Backend error ${res.status}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return body;
}

/**
 * Register (or link) a user coming from the bot.
 * @returns {Promise<{ username: string, link: string, isNew: boolean }>}
 */
export function registerUser(payload) {
  return call('/users/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Look up a user by Telegram chat id. */
export function getUserByTelegram(telegramId) {
  return call(`/users/by-telegram/${telegramId}`);
}
