import { z } from "zod";

export const authSchema = z.object({
  username: z
    .string({
      error: "Логин должен быть строкой",
    })
    .min(1, "Требуется ввести логин")
    .max(50, "Логин не должен превышать 50 символов"),
  password: z
    .string({
      error: "Пароль должен быть строкой",
    })
    .min(1, "Требуется ввести пароль")
    .max(50, "Пароль не должен превышать 50 символов"),
});

export type AuthSchema = z.infer<typeof authSchema>;