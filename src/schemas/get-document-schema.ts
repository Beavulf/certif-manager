import { z } from 'zod'

export const getDocumentByIdSchema = z.object({
  id: z
    .string({ error: 'id обязателен' })
    .min(1, 'id не может быть пустым')
    .uuid()
})

export type GetDocumentByCertIdInput = z.infer<typeof getDocumentByIdSchema>
