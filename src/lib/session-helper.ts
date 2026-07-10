'use server'

import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

import {
  COOKIE_INFO,
  SESSION_USER_COOKIE,
} from '@/constants/cookie';
import {
  extractUsernameFromJwtPayload,
  resolveTokenExpiration,
  type JwtPayload,
} from '@/lib/jwt-payload';
import { redirect } from 'next/navigation';

type AuthenticatedUser = {
  username: string;
  exp: number;
};

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_INFO.name)?.value ?? null;
}

export async function getTokenPayload(): Promise<JwtPayload | null> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    return jwtDecode<JwtPayload>(accessToken);
  } catch (error) {
    console.error('[TOKEN ERROR]:', error);
    return null;
  }
}

export async function isTokenExpired(): Promise<boolean> {
  const payload = await getTokenPayload();
  const exp = resolveTokenExpiration(payload);
  return exp * 1000 <= Date.now();
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_INFO.name)?.value;

  if (!accessToken) {
    return null;
  }

  const payload = await getTokenPayload();
  const username =
    extractUsernameFromJwtPayload(payload) ??
    cookieStore.get(SESSION_USER_COOKIE.name)?.value ??
    null;

  if (!username) {
    console.error('[SESSION ERROR]: username not found in JWT payload');
    return null;
  }

  const exp = resolveTokenExpiration(payload);
  if (exp * 1000 <= Date.now()) {
    return null;
  }

  return { username, exp };
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}
