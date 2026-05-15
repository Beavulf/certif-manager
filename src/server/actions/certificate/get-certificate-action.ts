'use server'

import { getCertificateSchema } from "@/schemas/get-certificate-schema";
import { certificateService } from "@/server/services/certificate-service";

export async function getCertificateAction(formData: FormData) {
  const idCert = formData.get('id')
  const employeeId = formData.get('employeeId')
  const serialNumber = formData.get('serialNumber')
  
  const resultInput =
    idCert ? { id: idCert } :
    employeeId ? { employeeId } :
    serialNumber ? { serialNumber } :
    {};
  console.log(resultInput);
  
  const parsed = getCertificateSchema.safeParse({
    resultInput
  })

  if (!parsed.success) {
    // Корректно получаем ошибки валидации по полям для передачи в UI
    const fieldErrors = parsed.error.message;
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors,
    }
  }

  const { identify } = parsed.data;

  if (!identify) {
    return {
      success: false,
      error: 'Ошибка валидации, вернул undefined',
    }
  }
  
  try {
    const certificate = 
      idCert ? await certificateService.findById(identify) :
      employeeId ? await certificateService.findByEmployeeIdOrThrow(identify) :
      serialNumber ? await certificateService.findBySerialNumber(identify) : {}

    return { success: true, data: certificate }
  } catch(error) {
    return {success: false, error: `Непредвиденная ошибка: ${error.message}`, fieldErrors: {}}
  }
}