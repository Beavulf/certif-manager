import { FileType } from '@/generated/prisma/client';
import { z } from 'zod';

export const uploadCertificateSchema = z.object({
  employeeId: z
    .string({ error: 'employeeId обязателен' })
    .uuid({ version: 'v4', error: 'employeeId должен быть UUID' })
    .min(1, 'employeeId не может быть пустым')
    .optional(),

  file: z
    .instanceof(File, { message: 'Файл обязателен' })
    .refine((f) => f.size > 0, 'Файл пустой'),

  notes: z
    .string('notes должен быть строкой')
    .max(255, 'notes максимум 255 символов')
    .optional(),
});

export const uploadDocumentSchema = z.object({
  certificateId: z
    .string({ error: 'certificateId обязателен' })
    .uuid({ version: 'v4' })
    .min(1, 'certificateId не может быть пустым'),

  file: z
    .instanceof(File, { message: 'Файл обязателен' })
    .refine((f) => f.size > 0, 'Файл пустой'),
});

export type UploadCertificateInput = z.infer<typeof uploadCertificateSchema>;

export function resolveDocumentFileType(fileName: string): FileType | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return Object.values(FileType).includes(ext as FileType)
    ? (ext as FileType)
    : null;
}
