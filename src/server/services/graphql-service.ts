'use server'

import { authSchema } from "@/schemas/auth-schema";
import type { SafeResult } from "@/types/safe-result-types";
import { mapErrorToSafeResult } from "../errors/map-error";
import { cookies } from "next/headers";
import { COOKIE_INFO } from "@/constants/cookie";
import { redirect } from "next/navigation";
import { getAccessToken, requireAuth } from "@/lib/session-helper";

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

export type EmployeeInfo = {
  cn: string;
  distinguishedName: string;
  sAMAccountName: string;
  title: string;
  department: string;
  company: string;
}[];
export async function getEmployeeInfoFromAD(
  cnOrSamAccountName: string
): Promise<SafeResult<EmployeeInfo>> {
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
            cnOrSamaccountname: cnOrSamAccountName,
          }
        }
      })
    });
    const data = await response.json();
    if (data.errors) {
      return {
        success: false,
        error: data.errors[0].message,
        code: 'BAD_REQUEST',
      }
    }
    
    return { success: true, data: data.data.searchUser as EmployeeInfo }
  } catch(error) {
    return mapErrorToSafeResult(error);
  }
}

export const logout = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_INFO.name);
  redirect('/login');
}