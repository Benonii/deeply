export const DAILY_MESSAGE_CAP = 40;

export const CHAT_SIGNED_OUT_MESSAGE = 'Sign in to use the chat.';

export const CHAT_UNAVAILABLE_MESSAGE = 'The chat is unavailable right now. Try again in a minute.';

function formatWait(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

export function readMessageCapMessage(retryAfterMs: number): string {
  return `That is all ${DAILY_MESSAGE_CAP} messages for today. The chat opens again in ${formatWait(retryAfterMs)}.`;
}
