import { z } from 'zod'

export const getBySerialNumberSchema = z.object({
  serialNumber: z
  .string({error: 'serialNumber должен быть строкой'})
  .min(1, 'serialNumber не может быть пустым'),
})

const getByEmployeeIdSchema = z.object({
  employeeId: z
  .string({error: 'employeeId должен быть строкой'})
  .min(1, 'employeeId не может быть пустым')
  .uuid({error: 'employeeId должен быть UUID'}),
})

const getByIdSchema = z.object({
  id: z
  .string({error: 'employeeId должен быть строкой'})
  .min(1, 'employeeId не может быть пустым')
  .uuid({error: 'employeeId должен быть UUID'}),
})

export const getCertificateSchema = z
.union([
  getByEmployeeIdSchema.transform((d) => ({ employeeId: d.employeeId })),
  getByIdSchema.transform((d) => ({ id: d.id })),
  getBySerialNumberSchema.transform((d) => ({ serialNumber: d.serialNumber })),
])

export type GetCertificateInput = z.infer<typeof getCertificateSchema>