'use server'

import { authSchema } from "@/schemas/auth-schema";
import type { SafeResult } from "@/types/safe-result-types";
import { mapErrorToSafeResult } from "../errors/map-error";
import { cookies } from "next/headers";
import { COOKIE_INFO } from "@/constants/cookie";
import { redirect } from "next/navigation";

export async function getAuthToken(
  username: string, password: string
):Promise<SafeResult> {
  const parsed = authSchema.safeParse({
    username,
    password
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const response = await fetch(process.env.AUTH_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'Auth',
        query: `
          mutation Auth($data: LoginInput!) {
            auth(data: $data) {
              accessToken
            }
          }
        `,
        variables: {
          data: {
            username,
            password
          }
        }
      })
    });
  
    const data = await response.json();
  
    if (data.errors) {
      return {
        success: false,
        error: data.errors[0].message,
        fieldErrors: {}
      }
    }
    const accessToken = data?.data?.auth?.accessToken;

    if (!accessToken) {
      return {
        success: false,
        error: 'Токен не был получен',
        fieldErrors: {},
      };
    }

    const cookieStore = await cookies();

    cookieStore.set({
      name: COOKIE_INFO.name,
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_INFO.maxAge,
    });

    return {
      success: true,
      data: null,
    };
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

export const logout = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_INFO.name);
  redirect('/login');
}