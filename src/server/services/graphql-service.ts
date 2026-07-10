'use server'

import { authSchema } from "@/schemas/auth-schema";
import type { SafeResult } from "@/types/safe-result-types";
import { mapErrorToSafeResult } from "../errors/map-error";
import { cookies } from "next/headers";
import { COOKIE_INFO, SESSION_USER_COOKIE, getAuthCookieOptions } from "@/constants/cookie";
import { redirect } from "next/navigation";
import { getAccessToken, requireAuth } from "@/lib/session-helper";
import { personNameSearchVariants, personNamesMatch } from "@/lib/person-name-utils";
import { employeeADResponseSchema } from "@/schemas/employee-schema";
import { auditlogService } from "@/server/services/auditlog-service";
import { AUDIT_ENTITY } from "@/types/auditlog-types";

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
    const cookieOptions = getAuthCookieOptions(COOKIE_INFO.maxAge);

    cookieStore.set({
      name: COOKIE_INFO.name,
      value: accessToken,
      ...cookieOptions,
    });

    cookieStore.set({
      name: SESSION_USER_COOKIE.name,
      value: username,
      ...cookieOptions,
      maxAge: SESSION_USER_COOKIE.maxAge,
    });

    await auditlogService.log({
      action: 'login',
      entityType: AUDIT_ENTITY.system,
      displayName: 'Вход в систему',
      adUsername: username,
    });

    redirect('/');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }
    return mapErrorToSafeResult(error);
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

type EmployeeADRecord = EmployeeADInfo[number];

async function fetchAdSearch(
  searchText: string,
  token: string,
): Promise<SafeResult<EmployeeADRecord[]>> {
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
          cnOrSamaccountname: searchText,
        },
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    if (response.status === 401) {
      return {
        success: false,
        error: 'Не авторизован',
        code: 'UNAUTHORIZED',
      };
    }
    if (response.status === 500) {
      return {
        success: false,
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
      };
    }
    return {
      success: false,
      error: 'Не удалось получить информацию о сотруднике из AD (' + response.status + ')',
      code: 'BAD_REQUEST',
    };
  }

  const data = await response.json();
  if (data.errors) {
    return {
      success: false,
      error: data.errors[0].message,
      code: 'BAD_REQUEST',
    };
  }

  if (!Array.isArray(data.data.searchUser)) {
    return {
      success: false,
      error: 'Ошибка получения данных о сотруднике из AD',
      code: 'BAD_REQUEST',
    };
  }

  const parsed = employeeADResponseSchema.safeParse({ searchUser: data.data.searchUser });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации данных о сотруднике из AD',
      code: 'BAD_REQUEST',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const validUsers = parsed.data.searchUser.filter(
    (user) => user.cn.trim().length > 0 && user.sAMAccountName.trim().length > 0,
  );

  return { success: true, data: validUsers as EmployeeADRecord[] };
}

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
  if (!token) {
    return {
      success: false,
      error: 'Не авторизован',
      code: 'UNAUTHORIZED',
    };
  }

  try {
    const searchVariants = personNameSearchVariants(searchedText);
    const usersByLogin = new Map<string, EmployeeADRecord>();

    for (const variant of searchVariants) {
      const result = await fetchAdSearch(variant, token);
      if (!result.success) {
        if (result.code === 'UNAUTHORIZED' || result.code === 'INTERNAL_ERROR') {
          return result;
        }
        continue;
      }

      for (const user of result.data ?? []) {
        usersByLogin.set(user.sAMAccountName.toLowerCase(), user);
      }
    }

    const allUsers = [...usersByLogin.values()];
    if (allUsers.length === 0) {
      return {
        success: false,
        error: 'Сотрудник не найден в AD',
        code: 'NOT_FOUND',
      };
    }

    const byLogin = allUsers.filter(
      (user) => user.sAMAccountName.toLowerCase() === searchedText.toLowerCase(),
    );
    if (byLogin.length > 0) {
      return { success: true, data: byLogin as EmployeeADInfo };
    }

    const byName = allUsers.filter((user) => personNamesMatch(user.cn, searchedText));
    if (byName.length > 0) {
      return { success: true, data: byName as EmployeeADInfo };
    }

    return { success: true, data: allUsers as EmployeeADInfo };
  } catch(error) {
    return mapErrorToSafeResult(error);
  }
}

export const logout = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_INFO.name);
  cookieStore.delete(SESSION_USER_COOKIE.name);
  redirect('/login');
}