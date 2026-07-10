import { z } from 'zod'

export const createEmployeeSchema = z.object({
  fullName: z
    .string({
      error: "ФИО должно быть строкой",
    })
    .min(1, "Требуется ввести ФИО")
    .max(120, "ФИО не должно превышать 120 символов"),
  email: z
    .string({
      error: "Email должен быть строкой",
    })
    .min(1, "Требуется ввести Email")
    .max(100, "Email не должен превышать 100 символов"),
  adUsername: z
    .string({
      error: "Логин должен быть строкой",
    })
    .min(1, "Требуется ввести логин")
    .max(50, "Логин не должен превышать 50 символов"),
  department: z
    .string({
      error: "Отдел должен быть строкой",
    })
    .min(1, "Требуется ввести отдел")
    .max(150, "Отдел не должен превышать 150 символов")
    .optional(),
  position: z
    .string({
      error: "Должность должна быть строкой",
    })
    .min(1, "Требуется ввести должность")
    .max(150, "Должность не должна превышать 150 символов")
    .optional(),
  isActive: z
    .boolean()
    .optional(),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>

export const checkIdEmployeeSchema = z.object({
  id: z
    .string({
      error: "id должен быть строкой",
    })
    .min(1, "Требуется ввести id")
})

export type CheckIdEmployeeInput = z.infer<typeof checkIdEmployeeSchema>

export const updateEmployeeByIdSchema = z.object({
  id: z
    .string({
      error: "id должен быть строкой",
    })
    .min(1, "Требуется ввести id")
    .uuid(),
  fullName: z
    .string({
      error: "ФИО должно быть строкой",
    })
    .min(1, "Требуется ввести ФИО")
    .max(120, "ФИО не должно превышать 120 символов")
    .optional(),
  email: z
    .string({
      error: "Email должен быть строкой",
    })
    .min(1, "Требуется ввести Email")
    .max(100, "Email не должен превышать 100 символов")
    .optional(),
  adUsername: z
    .string({
      error: "Логин должен быть строкой",
    })
    .min(1, "Требуется ввести логин")
    .max(50, "Логин не должен превышать 50 символов")
    .optional(),
  department: z
    .string({
      error: "Отдел должен быть строкой",
    })
    .min(1, "Требуется ввести отдел")
    .max(150, "Отдел не должен превышать 150 символов")
    .optional(),
    position: z
    .string({
      error: "Должность должна быть строкой",
    })
    .min(1, "Требуется ввести должность")
    .max(150, "Должность не должна превышать 150 символов")
    .optional(),
  isActive: z
    .boolean()
    .optional(),
})

const nullableAdString = z
  .union([z.string(), z.null()])
  .transform((value) => value ?? '');

const employeeADRecordSchema = z.object({
  cn: nullableAdString,
  distinguishedName: nullableAdString,
  sAMAccountName: nullableAdString,
  title: nullableAdString,
  department: nullableAdString,
  company: nullableAdString,
});
export const employeeADResponseSchema = z.object({
  searchUser: z.array(employeeADRecordSchema),
});

export const searchEmployeeAdSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Введите минимум 2 символа')
    .max(120, 'Запрос не должен превышать 120 символов'),
});