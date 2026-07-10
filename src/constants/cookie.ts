export const COOKIE_INFO = {
  name: 'access_token',
  maxAge: 60 * 60 * 2,
} as const;

export const SESSION_USER_COOKIE = {
  name: 'session_username',
  maxAge: 60 * 60 * 2,
} as const;

export function shouldUseSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;

  const appUrl = process.env.APP_URL?.trim() ?? '';
  return appUrl.startsWith('https://');
}

export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
