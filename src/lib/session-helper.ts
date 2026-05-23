import 'server-only';

import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

import { COOKIE_INFO } from '@/constants/cookie';
import { redirect } from 'next/navigation';

type JwtPayload = {
  username?: string;
  exp?: number;
};

export async function getAccessToken(): Promise<string | null>{
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

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

export async function getSessionUser(): Promise<JwtPayload | null> {
  const payload = await getTokenPayload();

  if (!payload?.username) {
    return null;
  }

  if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    username: payload.username,
    exp: payload.exp,
  };
}

export async function requireAuth(): Promise<JwtPayload> {
  const user = await getSessionUser();

  if (!user) {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_INFO.name);
    redirect('/login');    
  }

  return user;
}