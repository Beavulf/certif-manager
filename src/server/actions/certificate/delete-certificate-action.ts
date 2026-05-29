'use server'

import type { Certificate } from "@/generated/prisma/browser";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";
import {z} from 'zod'

const deleteCertificateSchema = z.object({
  id: z.string({ error: 'id обязателен' })
    .min(1, 'id не может быть пустым')
    .uuid()
})

export default async function deleteCertificateAction(
  id: string
):Promise<SafeResult<Certificate | unknown>> {
  const parsed = deleteCertificateSchema.safeParse({ id })
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }
  }
  
  try {
    const certificate = await certificateService.deleteById(id);
    return {
      success: true,
      data: certificate
    }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}