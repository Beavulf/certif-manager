'use server'

import type { CertificateFindManyArgs } from "@/generated/prisma/models";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";
import type { CertificatesWithIncludes } from "@/types/certificate-types";
import { z } from "zod";

const certificateIdSchema = z.object({
  id: z.string().uuid('Некорректный идентификатор сертификата'),
});

export async function getCertificateByIdAction(
  id: string
): Promise<SafeResult<CertificatesWithIncludes>> {
  const parsed = certificateIdSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      success: false,
      error: "Ошибка валидации",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const certificate = await certificateService.findByIdWithRelationsOrThrow(parsed.data.id);
    return { success: true, data: certificate };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}

export async function getCertificatesByFindMany(
  args?: CertificateFindManyArgs
): Promise<SafeResult> {
  try {
    const certificates = await certificateService.findMany(args);
    return {
      success: true,
      data: certificates,
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
