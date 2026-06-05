'use server'

import { authSchema } from "@/schemas/auth-schema";
import type { SafeResult } from "@/types/safe-result-types";
import { mapErrorToSafeResult } from "../errors/map-error";
import { cookies } from "next/headers";
import { COOKIE_INFO } from "@/constants/cookie";
import { redirect } from "next/navigation";
import { getAccessToken, requireAuth } from "@/lib/session-helper";
import { employeeADResponseSchema } from "@/schemas/employee-schema";

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

export type EmployeeADInfo = {
  cn: string;
  distinguishedName: string;
  sAMAccountName: string;
  title: string;
  department: string;
  company: string;
}[];
export async function getEmployeeInfoFromAD(
  cnOrSamAccountName: string
): Promise<SafeResult<EmployeeADInfo>> {

  const searchedText = cnOrSamAccountName.trim();
  if (searchedText.length === 0) {
    return {
      success: false,
      error: 'Текст поиска не может быть пустым',
      code: 'BAD_REQUEST',
    }
  }

  await requireAuth();
  const token = await getAccessToken();

  try {
    const response = await fetch(process.env.AUTH_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        operationName: 'searchUser',
        query: `
          query searchUser($data: SearchCnInput!) {
            searchUser(data: $data) {
              cn
              distinguishedName
              sAMAccountName
              title
              department
              company
            }
          }
        `,
        variables: {
          data: {
            cnOrSamaccountname: searchedText,
          }
        }
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Не авторизован',
          code: 'UNAUTHORIZED',
        }
      }
      if (response.status === 500) {
        return {
          success: false,
          error: 'Внутренняя ошибка сервера',
          code: 'INTERNAL_ERROR',
        }
      }
      return {
        success: false,
        error: 'Не удалось получить информацию о сотруднике из AD ('+response.status+')',
        code: 'BAD_REQUEST',
      }
    }

    const data = await response.json();
    if (data.errors) {
      return {
        success: false,
        error: data.errors[0].message,
        code: 'BAD_REQUEST',
      }
    }

    if (!Array.isArray(data.data.searchUser)) {
      return {
        success: false,
        error: 'Ошибка получения данных о сотруднике из AD',
        code: 'BAD_REQUEST',
      }
    }

    const parsed = employeeADResponseSchema.safeParse({ searchUser: data.data.searchUser });
    if (!parsed.success) {
      return {
        success: false,
        error: 'Ошибка валидации данных о сотруднике из AD',
        code: 'BAD_REQUEST',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    if (parsed.data.searchUser.length === 0) {
      return {
        success: false,
        error: 'Сотрудник не найден в AD',
        code: 'NOT_FOUND',
      }
    }
    return { success: true, data: parsed.data.searchUser as EmployeeADInfo }
  } catch(error) {
    return mapErrorToSafeResult(error);
  }
}

export const logout = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_INFO.name);
  redirect('/login');
}