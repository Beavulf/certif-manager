import { z } from 'zod'

export const getBySerialNumberSchema = z.object({
  serialNumber: z
    .string({ error: 'serialNumber обязателен' })
    .min(16, 'serialNumber не может быть пустым')
})

export const getByEmployeeIdSchema = z.object({
  employeeId: z
    .string({ error: 'employeeId обязателен' })
    .min(1, 'employeeId не может быть пустым')
    .uuid()
})

export const getByIdSchema = z.object({
  id: z
    .string({ error: 'id обязателен' })
    .min(1, 'id не может быть пустым')
    .uuid()
})

export const getCertificateSchema = z.union([getByEmployeeIdSchema, getBySerialNumberSchema, getByIdSchema])
  .transform((data)=>({
    identify: 'employeeId' in data ? data.employeeId : 'id' in data ? data.id : 'serialNumber' in data ? data.serialNumber : undefined
  }))

export type GetCertificateInput = z.infer<typeof getCertificateSchema>