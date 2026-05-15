import { z } from 'zod'

export const getBySerialNumberSchema = z.object({
  serialNumber: z.string().min(16, 'serialNumber не может быть пустым'),
})

const getByEmployeeIdSchema = z.object({
  employeeId: z.string().min(1).uuid(),
})

const getByIdSchema = z.object({
  id: z.string().min(1).uuid(),
})

export const getCertificateSchema = z.union([
  getByEmployeeIdSchema.transform((d) => ({ type: 'employeeId' as const, value: d.employeeId })),
  getByIdSchema.transform((d) => ({ type: 'id' as const, value: d.id })),
  getBySerialNumberSchema.transform((d) => ({ type: 'serialNumber' as const, value: d.serialNumber })),
])

export type GetCertificateInput = z.infer<typeof getCertificateSchema>
// { type: 'employeeId'; value: string }
// | { type: 'id'; value: string }
// | { type: 'serialNumber'; value: string }