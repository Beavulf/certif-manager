'use server'

import { uploadCertificateSchema } from "@/schemas/upload-file-schema"
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";
import { requireAuth } from "@/lib/session-helper";
import type { Certificate } from "@/generated/prisma/browser";
import { parseCert } from "@/minio/parse-cert";
import { employeeService } from "@/server/services/employee-service";
import { getEmployeeInfoFromAD } from "../graphql-action";

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
      entityType: 'certificate',
      entityId: certificate.id,
      displayName: `Сертификат загружен: ${certificate.serialNumber}`,
      adUsername: username
    })
  
    return { success: true, data: certificate }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

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

  try { 
    const { file, notes } = parsed.data;
    const buffer = Buffer.from(await file.arrayBuffer())

    const parsedCert = parseCert(buffer, file.name);
    
    if (!parsedCert.subjectCN || parsedCert.subjectCN === 'Unknown') {
      return {
        success: false,
        error: 'Не удалось определить ФИО пользователя в сертификате',
        code: 'CONFLICT',
        fieldErrors: {}
      }
    }
    if (parsedCert.serialNumber) {
      const certificate = await certificateService.ensureUniqueSerialNumber(parsedCert.serialNumber);
      if (certificate) {
        return {
          success: false,
          error: 'Сертификат с таким серийным номером уже существует',
          code: 'CONFLICT',
          fieldErrors: {}
        }
      }
    } else {
      return {
        success: false,
        error: 'Не удалось определить серийный номер сертификата',
        code: 'CONFLICT',
        fieldErrors: {}
      }
    }

    const employees = await employeeService.findMany({
      where : {
        fullName: parsedCert.subjectCN,
      }
    });

    if (employees.length > 1) {
      return {
        success: false,
        error: 'Найдено несколько сотрудников с таким ФИО',
        code: 'CONFLICT',
        fieldErrors: {
          employees: 'Найдено несколько сотрудников с таким ФИО: \n'
          +employees.map((employee) => '-'+employee.fullName+' ('+employee.adUsername+')').join('\n'),
        }
      }
    }
    if (employees.length === 1) {
      const employeeId = employees[0].id;
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
        entityType: 'certificate',
        entityId: certificate.id,
        displayName: `Сертификат загружен: ${certificate.serialNumber}`,
        adUsername: username
      })

      return { success: true, data: certificate }
    }
    
    const employeeInfo = await getEmployeeInfoFromAD(parsedCert.subjectCN);

    if (!employeeInfo.success || !employeeInfo.data || employeeInfo.data.length === 0) {
      return {
        success: false,
        error: 'Не удалось получить информацию о сотруднике из AD',
        code: 'BAD_REQUEST',
      } 
    }
    if (employeeInfo.data.length > 1) {
      return {
        success: false,
        error: 'Найдено несколько сотрудников с таким ФИО в AD',
        code: 'CONFLICT',
        fieldErrors: {
          employees: 'Найдено несколько сотрудников с таким ФИО в AD: \n'
          +employeeInfo.data.map((employee) => '-'+employee.cn+' ('+employee.sAMAccountName+')').join('\n'),
        }
      }
    }
    
    const { cn, distinguishedName, sAMAccountName, title, department } = employeeInfo.data[0];
    
    const newEmployee = await employeeService.create({
      fullName: cn,
      email: distinguishedName+'@local.corp',
      adUsername: sAMAccountName,
      position: title,
      department: department,
    });
    const newCertificate = await certificateService.create({
      employeeId: newEmployee.id,
      fileName: file.name,
      uploadedBy: username,
      fileType: file.type,
      fileBuffer: buffer,
      notes: notes
    })

    await auditlogService.log({
      action: 'uploadCert',
      entityType: 'certificate',
      entityId: newCertificate.id,
      displayName: `Сертификат(${newCertificate.serialNumber}) загружен и привязан к сотруднику: ${newEmployee.fullName}`,
      adUsername: username
    })

    return { success: true, data: newCertificate }
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}


