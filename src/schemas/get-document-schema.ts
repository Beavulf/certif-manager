import { FileType } from '@/generated/prisma/enums'
import {z} from 'zod'

export const getDocumentByIdSchema = z.object({
  id: z
    .string({ error: 'id обязателен' })
    .min(1, 'id не может быть пустым')
    .uuid()
})

export type GetDocumentByCertIdInput = z.infer<typeof getDocumentByIdSchema>

export const getDocumentByFilterSchema = z.object({
  fileKey: z.string({error: 'fileKey обязателен'}).optional(),
  fileName: z.string({error: 'fileName обязателен'}).optional(),
  fileType: z.enum(Object.values(FileType) as [FileType, ...FileType[]], { error: "fileType обязателен" }).optional(),
  uploadedBy: z.string({error: 'uploadedBy обязателен'}).optional(),
})