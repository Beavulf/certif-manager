'user server'

import { getCertificateSchema } from "@/schemas/get-certificate-schema";
import { certificateService } from "@/server/services/certificate-service";

export async function getCertificateAction(formData: FormData) {
  const idCert = String(formData.get('id'))
  const employeeId = String(formData.get('employeeId'))
  const serialNumber = String(formData.get('serialNumber'))
  
  const resultInput =
    idCert ? { id: idCert } :
    employeeId ? { employeeId } :
    serialNumber ? { serialNumber } :
    {};

  const parsed = getCertificateSchema.safeParse({
    resultInput
  })

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: fields,
    }
  }

  const { identify } = parsed.data;
  
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