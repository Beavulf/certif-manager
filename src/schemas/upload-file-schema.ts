import { FileType } from "@/generated/prisma/client";

import { z } from 'zod'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const uploadCertificateSchema = z.object({
  employeeId: z
    .string({ error: 'employeeId обязателен' })
    .uuid({version: "v4", error: 'employeeId должен быть UUID'})
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

export const uploadDocumentSchema = z.object({
  certificateId: z
    .string({ error: 'certificateId обязателен' })
    .uuid({version: "v4"})
    .min(1, 'certificateId не может быть пустым'),

  file: z
    .instanceof(File, { message: 'Файл обязателен' })
    .refine(f => f.size > 0, 'Файл пустой')
    .refine(f => f.size <= MAX_FILE_SIZE, 'Файл превышает 10MB')
    .refine(
      (f) => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        return ext !== undefined && Object.values(FileType).includes(ext as FileType);
      },
      'Допустимы только .doc, .docx и .pdf файлы'
    )
    .transform((f) => ({
      ...f,
      fileType: f.name.split('.').pop()!.toLowerCase() as FileType,
    })),
})

// Тип автоматически выводится из схемы — не нужно писать интерфейс вручную!
export type UploadCertificateInput = z.infer<typeof uploadCertificateSchema>