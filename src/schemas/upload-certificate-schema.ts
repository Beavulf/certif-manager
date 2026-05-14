import { z } from 'zod'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 5MB

export const uploadCertificateSchema = z.object({
  employeeId: z
    .string({ error: 'employeeId обязателен' })
    .uuid({version: "v4"})
    .min(1, 'employeeId не может быть пустым'),

  file: z
    .instanceof(File, { message: 'Файл обязателен' })
    .refine(f => f.size > 0, 'Файл пустой')
    .refine(f => f.size <= MAX_FILE_SIZE, 'Файл превышает 10MB')
    .refine(
      f => f.name.endsWith('.cer') || f.name.endsWith('.p7b'),
      'Допустимы только .cer и .p7b файлы'
    ),
})

// Тип автоматически выводится из схемы — не нужно писать интерфейс вручную!
export type UploadCertificateInput = z.infer<typeof uploadCertificateSchema>