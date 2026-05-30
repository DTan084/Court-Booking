import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_PATH = '/courts';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  path: string;
  ts: number;
};

const toBase64Url = (input: string): string => Buffer.from(input, 'utf8').toString('base64url');

const fromBase64Url = (input: string): string => Buffer.from(input, 'base64url').toString('utf8');

const sign = (payloadB64: string, secret: string): string =>
  createHmac('sha256', secret).update(payloadB64).digest('base64url');

export const createSignedOAuthState = (path: string, secret: string): string => {
  const safePath = path.startsWith('/') ? path : DEFAULT_PATH;
  const payload: OAuthStatePayload = {
    path: safePath,
    ts: Date.now(),
  };
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
};

export const resolveOAuthStatePath = (state: unknown, secret: string): string => {
  if (typeof state !== 'string' || state.length === 0) return DEFAULT_PATH;

  const [payloadB64, signature] = state.split('.');
  if (!payloadB64 || !signature) return DEFAULT_PATH;

  const expected = sign(payloadB64, secret);
  const receivedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (receivedBuf.length !== expectedBuf.length) return DEFAULT_PATH;
  if (!timingSafeEqual(receivedBuf, expectedBuf)) return DEFAULT_PATH;

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as OAuthStatePayload;
    const isFresh = Date.now() - payload.ts <= STATE_MAX_AGE_MS;
    if (!isFresh) return DEFAULT_PATH;
    if (!payload.path || !payload.path.startsWith('/')) return DEFAULT_PATH;
    return payload.path;
  } catch {
    return DEFAULT_PATH;
  }
};
