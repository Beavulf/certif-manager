'use server'

import { uploadCertificateSchema } from "@/schemas/upload-file-schema"
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";
import { AUDIT_ENTITY } from "@/types/auditlog-types";
import type { SafeResult } from "@/types/safe-result-types";
import { requireAuth } from "@/lib/session-helper";
import { validateCertificateUpload } from '@/lib/upload-validation';
import type { Certificate } from "@/generated/prisma/browser";

export default async function uploadCertificateToEmployeeAction(
  formData: FormData,
):Promise<SafeResult<Certificate | unknown>> {
  const session = await requireAuth();
  const username = session?.username;

  if (!username) {
    return {
      success: false,
      error: 'Ошибка получения имени пользователя',
      code: 'UNAUTHORIZED',
      fieldErrors: {}
    }
  }
  
  const parsed = uploadCertificateSchema.safeParse({
    employeeId: formData.get("employeeId") || undefined,
    file: formData.get("file"),
    notes: formData.get("notes") || undefined
  })
  
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: fields,
    }
  }

  const fileError = await validateCertificateUpload(parsed.data.file);
  if (fileError) {
    return {
      success: false,
      error: fileError,
      fieldErrors: { file: [fileError] },
    };
  }

  try {
    const { employeeId, file, notes } = parsed.data;
    const buffer = Buffer.from(await file.arrayBuffer())
    
    
    const certificate = await certificateService.create({
      employeeId,
      fileName: file.name,
      uploadedBy: username,
      fileType: file.type,
      fileBuffer: buffer,
      notes: notes
    })
  
    await auditlogService.log({
      action: 'uploadCert',
      entityType: AUDIT_ENTITY.certificate,
      entityId: certificate.id,
      displayName: `Сертификат загружен: ${certificate.serialNumber}`,
      adUsername: username
    })
  
    return { success: true, data: certificate }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

// загрузка сертификата и синхронизация сотрудника из AD
export async function uploadCertificateAndSyncADUserAction(
  {formData}:{formData: FormData}
): Promise<SafeResult<Certificate>> {
  const session = await requireAuth();
  const username = session?.username;

  if (!username) {
    return {
      success: false,
      error: 'Ошибка получения имени пользователя',
      code: 'UNAUTHORIZED',
      fieldErrors: {}
    }
  }
  
  const parsed = uploadCertificateSchema.safeParse({
    file: formData.get("file"),
    notes: formData.get("notes") || undefined
  })
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: fields,
    }
  }

  const fileError = await validateCertificateUpload(parsed.data.file);
  if (fileError) {
    return {
      success: false,
      error: fileError,
      fieldErrors: { file: [fileError] },
    };
  }

  try { 
    const { file, notes } = parsed.data;

    const result = await certificateService.uploadWithEmployeeSync({
      parsedData: { file, notes }, username
    });

    if (!result.success) {
      return result;
    }

    await auditlogService.log({
      action: 'uploadCert',
      entityType: AUDIT_ENTITY.certificate,
      entityId: result.data?.id,
      displayName: `Сертификат(${result.data?.serialNumber}) загружен и привязан к сотруднику: ${result.data?.subjectCN}`,
      adUsername: username
    })

    return { success: true, data: result.data };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}


