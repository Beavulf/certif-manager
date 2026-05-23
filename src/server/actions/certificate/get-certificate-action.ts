'use server'

import { getCertificateSchema } from "@/schemas/get-certificate-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";

export async function getCertificateAction(
  formData: FormData
):Promise<SafeResult> {
  const idCert = formData.get('id')
  const employeeId = formData.get('employeeId')
  const serialNumber = formData.get('serialNumber')
  
  const resultInput =
    idCert ? { id: idCert } :
    employeeId ? { employeeId } :
    serialNumber ? { serialNumber } :
    {};
  
  const parsed = getCertificateSchema.safeParse(resultInput)

  if (!parsed.success) {
    // Корректно получаем ошибки валидации по полям для передачи в UI
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors:parsed.error.flatten().fieldErrors,
    }
  }
  type ParsedType = typeof parsed.data
  const identify: ParsedType = parsed.data;
  
  if (!identify) {
    return {
      success: false,
      error: 'Ошибка валидации, вернул undefined',
      fieldErrors: {}
    }
  }
  
  try {
    let certificate;
    if ("id" in identify) {
      certificate = await certificateService.findById(identify.id);
    } else if ("employeeId" in identify) {
      certificate = await certificateService.findByEmployeeId(identify.employeeId);
    } else if ("serialNumber" in identify) {
      certificate = await certificateService.findBySerialNumber(identify.serialNumber);
    } else {
      certificate = {};
    }
    
    return { success: true, data: certificate }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

export async function getCertificatesByFindMany(args?: Parameters<typeof certificateService.findMany>[0]) {
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