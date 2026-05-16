import type { SafeResult } from "@/types/safe-result-types";
import { jwtDecode } from "jwt-decode";

import { useCallback } from "react";

export function useAuthUser() {
  const authUser = useCallback((dataToken: string): SafeResult => {
    if (typeof window === "undefined") {
      return {
        success: false,
        error: "localStorage недоступен на сервере",
        fieldErrors: {},
      };
    }

    if (!dataToken) {
      return {
        success: false,
        error: "Ошибка авторизации, токен не передан",
        fieldErrors: {},
      };
    }

    const token = localStorage.getItem("certManagerToken");

    if (token) {
      const decode: {username: string, exp: number} = jwtDecode(token);
      if (decode.exp && decode.exp < Date.now() / 1000) {
        localStorage.setItem("certManagerToken", dataToken);
        return {
          success: true,
          data: dataToken,
        };
      }
      return {
        success: true,
        data: dataToken,
      };
    }

    localStorage.setItem("certManagerToken", dataToken);
    return {
      success: true,
      data: dataToken,
    };
  }, []);

  const getUsername = useCallback((): string | null => {
    if (typeof window === "undefined") return null; // SSR guard
    const token = localStorage.getItem("certManagerToken");
    if (!token) {
      return null;
    }

    try {
      const decode: {username: string} = jwtDecode(token);
      return decode.username || null;
    } catch {
      return null;
    }
  }, []);

  return { authUser, getUsername };
}