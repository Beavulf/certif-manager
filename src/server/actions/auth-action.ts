'use server'

import { authSchema } from "@/schemas/auth-schema";
import type { SafeResult } from "@/types/safe-result-types";

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
  return {
    success: true,
    data: data.data.auth.accessToken
  }
}