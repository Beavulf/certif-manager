import { COOKIE_INFO } from '@/constants/cookie';

type JwtPayload = {
  username?: string;
  sub?: string;
  login?: string;
  preferred_username?: string;
  sAMAccountName?: string;
  unique_name?: string;
  name?: string;
  exp?: number;
  iat?: number;
  user?: {
    username?: string;
    login?: string;
    sAMAccountName?: string;
  };
};

export function extractUsernameFromJwtPayload(
  payload: JwtPayload | null,
): string | null {
  if (!payload) return null;

  const candidates = [
    payload.username,
    payload.preferred_username,
    payload.login,
    payload.sAMAccountName,
    payload.unique_name,
    payload.name,
    payload.user?.username,
    payload.user?.login,
    payload.user?.sAMAccountName,
    payload.sub,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function resolveTokenExpiration(payload: JwtPayload | null): number {
  const now = Math.floor(Date.now() / 1000);

  if (payload?.exp && payload.exp > now) {
    return payload.exp;
  }

  if (payload?.iat) {
    return payload.iat + COOKIE_INFO.maxAge;
  }

  return now + COOKIE_INFO.maxAge;
}

export type { JwtPayload };
