const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_INVITE_CODE_LENGTH = 8;
const FALLBACK_APP_URL = 'https://tri-sect.vercel.app';

export const generateUniqueCode = (length = DEFAULT_INVITE_CODE_LENGTH): string => {
  const characters = INVITE_CODE_ALPHABET;
  const randomValues = new Uint32Array(length);

  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * characters.length);
    }
  }

  return Array.from(randomValues, (value) => characters[value % characters.length]).join('');
};

export const formatInviteUrl = (code: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : FALLBACK_APP_URL;
  return `${origin}/join-trip?code=${encodeURIComponent(code)}`;
};
