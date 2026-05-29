import { FileType } from "@/generated/prisma/client";

import { z } from 'zod'
import { UPLOAD_FILE_CONFIG as fileConfig, CERT_FILE_TYPES } from "@/constants/upload-config";

export const uploadCertificateSchema = z.object({
  employeeId: z
    .string({ error: 'employeeId обязателен' })
    .uuid({version: "v4", error: 'employeeId должен быть UUID'})
    .min(1, 'employeeId не может быть пустым')
    .optional(),

  file: z
    .instanceof(File, { message: 'Файл обязателен' })
    .refine(f => f.size > 0, 'Файл пустой')
    .refine(f => f.size <= fileConfig.MAX_FILE_SIZE, 'Файл превышает 10MB')
    .refine(
      f => f.name.endsWith(CERT_FILE_TYPES.cer) || f.name.endsWith(CERT_FILE_TYPES.p7b),
      'Допустимы только .cer и .p7b файлы'
    ),
  
  notes: z
    .string('notes должен быть строкой')
    .max(255, 'notes максимум 255 символов')
    .optional(),
})

export const uploadDocumentSchema = z.object({
  certificateId: z
    .string({ error: 'certificateId обязателен' })
    .uuid({version: "v4"})
    .min(1, 'certificateId не может быть пустым'),

  file: z
    .instanceof(File, { message: 'Файл обязателен' })
    .refine(f => f.size > 0, 'Файл пустой')
    .refine(f => f.size <= fileConfig.MAX_FILE_SIZE, 'Файл превышает 10MB')
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