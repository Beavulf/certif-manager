import type { CertificatesWithIncludes } from "@/types/certificate-types";
import { certificateRepository, createCertificateRepository } from "../repositories/certificate-repository";
import type { Prisma, Certificate } from "@/generated/prisma/client";
import { AlreadyExistsError, BadRequestError, NotFoundError } from "../errors/app-error";
import { employeeService } from "./employee-service";
import { createDocumentRepository, documentRepository } from "../repositories/document-repository";
import { generateCertKey } from "@/minio/file-key";
import { parseCert } from "@/minio/parse-cert";
import { deleteFile, fileExists, getObjectBuffer, uploadFile } from "@/minio/minio";
import prisma from "@/lib/prisma";
import { getEmployeeInfoFromAD } from "./graphql-service";
import { getAdEmailDomain } from '@/lib/app-settings-helpers';
import { personNamesMatch } from '@/lib/person-name-utils';
import { appSettingsService } from '@/server/services/app-settings-service';
import type { SafeResult } from "@/types/safe-result-types";
import type {
  BulkAutoAssignReport,
  BulkAutoAssignSuccess,
} from '@/types/certificate-auto-assign-types';

type ResolveEmployeeResult =
  | {
      success: true;
      employeeId: string;
      employeeName: string;
      source: 'db' | 'ad_created';
    }
  | {
      success: false;
      code: string;
      error: string;
    };

const ISSUE_LABELS: Record<string, string> = {
  INVALID_SUBJECT: 'Некорректное ФИО в сертификате',
  MULTIPLE_IN_DB: 'Несколько сотрудников в базе',
  MULTIPLE_IN_AD: 'Несколько сотрудников в AD',
  NOT_FOUND_IN_AD: 'Не найден в AD',
  EMAIL_DOMAIN_MISSING: 'Не настроен домен email',
  ASSIGN_FAILED: 'Ошибка привязки',
};

export const certificateService = {

  async findMany(
    args?: Prisma.CertificateFindManyArgs
  ):Promise<CertificatesWithIncludes[]> {
    const certificates = await certificateRepository.findMany(args);
    return certificates;
  },

  async create(
    {
      employeeId,
      fileName,
      uploadedBy,
      fileType,
      fileBuffer,
      notes,
    }:
    {
      fileName: string,
      uploadedBy: string,
      fileType: string,
      fileBuffer: Buffer,
      employeeId?: string,
      notes?: string,
    }
  ):Promise<Certificate>
   {
    let employee = undefined;
    if (typeof employeeId === "string" && employeeId.trim() !== '') {
      employee = await employeeService.findByIdOrThrow(employeeId);
    }
    
    const parsedCert = parseCert(fileBuffer, fileName);

    if (!parsedCert.subjectCN || parsedCert.subjectCN === 'Unknown') {
      throw new BadRequestError("Не удалось определить ФИО пользователя в сертификате");
    }

    if (employee && !personNamesMatch(parsedCert.subjectCN, employee.fullName)) {
      throw new BadRequestError("ФИО пользователя в сертификате не совпадает с ФИО пользователя в системе");
    }

    const isExpired = new Date(parsedCert.validTo) < new Date();
    const isUnique = await this.ensureUniqueSerialNumber(parsedCert.serialNumber);
    if (!isUnique) {
      throw new AlreadyExistsError("Сертификат с таким серийным номером уже существует");
    }

    const key = generateCertKey(employee ? employee.id : new Date().getTime().toString(), fileName);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const repo = createCertificateRepository(tx);
        await uploadFile(key, fileBuffer, fileType || 'application/octet-stream')
    
        const data: Prisma.CertificateCreateInput = {
          serialNumber: parsedCert.serialNumber,
          thumbprint: parsedCert.thumbprint,
          subjectKeyId: parsedCert.subjectKeyId,
          subjectCN: parsedCert.subjectCN,
          subjectEmail: employee && employee.email,
          validFrom: parsedCert.validFrom,
          validTo: parsedCert.validTo,
          certType: parsedCert.certType,
          fileKey: key,
          uploadedBy: uploadedBy,
          status: isExpired ? "expired" : "active",
          notes: notes,
          ...(employee && { employee: { connect: { id: employee.id } } })
        };

        const createdCert = await repo.create(data);
        return createdCert;
      })
      return result;
    } catch(error) {
      if (await fileExists(key)) {
        await deleteFile(key);
      }
      throw error;
    }
  },

  async uploadWithEmployeeSync(
    {
      parsedData,
      username
    }:{
      parsedData: { file: File, notes: string | undefined }
      username: string
    }
  ): Promise<SafeResult<Certificate>> {
    const { file, notes } = parsedData;
    const buffer = Buffer.from(await file.arrayBuffer())

    const parsedCert = parseCert(buffer, file.name);
    
    if (!parsedCert.subjectCN || parsedCert.subjectCN === 'Unknown') {
      return {
        success: false,
        error: 'Не удалось определить ФИО пользователя в сертификате',
        code: 'BAD_REQUEST',
        fieldErrors: {}
      }
    }
    if (parsedCert.serialNumber) {
      const isUnique = await certificateService.ensureUniqueSerialNumber(parsedCert.serialNumber);
      if (!isUnique) {
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
        code: 'BAD_REQUEST',
        fieldErrors: {}
      }
    }

    const employees = await employeeService.findByMatchingFullName(parsedCert.subjectCN);

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
      return { success: true, data: certificate }
    }
    
    const employeeInfo = await getEmployeeInfoFromAD(parsedCert.subjectCN);

    if (!employeeInfo.success || !employeeInfo.data || employeeInfo.data.length === 0) {
      return {
        success: false,
        error: employeeInfo.error,
        code: employeeInfo.code,
        fieldErrors: employeeInfo.fieldErrors,
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
    
    const { cn, sAMAccountName, title, department } = employeeInfo.data[0];

    const appSettings = await appSettingsService.getOrCreate();
    const emailDomain = getAdEmailDomain(appSettings);
    if (!emailDomain) {
      return {
        success: false,
        error: 'Домен email не настроен. Укажите AD Email Domain в настройках или переменной AD_EMAIL_DOMAIN',
        code: 'BAD_REQUEST',
        fieldErrors: {},
      };
    }

    const email = `${sAMAccountName}@${emailDomain}`;
    const newEmployee = await employeeService.create({
      fullName: cn,
      email: email,
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

    return { success: true, data: newCertificate }
  },

  async deleteById(id: string):Promise<{deleted: Certificate, deletedDocs: Prisma.BatchPayload}> {
    const certificate = await this.findByIdOrThrow(id);
    const isFileExists = await fileExists(certificate.fileKey);
    if (!isFileExists) {
      throw new NotFoundError("Файл (в хранилище) для удаления не найден");
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const repoDoc = createDocumentRepository(tx);
      const deletedDocs = await repoDoc.deleteMany({
        where: {
          certificateId: certificate.id
        }
      });
      const repoCert = createCertificateRepository(tx);
      const deleted = await repoCert.deleteById(certificate.id);
      await deleteFile(certificate.fileKey);
      
      return { deleted, deletedDocs };
    });

    return result;
  },

  async findById(id: string):Promise<Certificate | null> {
    return await certificateRepository.findById(id);
  },

  async findByIdWithRelations(id: string): Promise<CertificatesWithIncludes | null> {
    return await certificateRepository.findByIdWithRelations(id);
  },

  async findByIdWithRelationsOrThrow(id: string): Promise<CertificatesWithIncludes> {
    const certificate = await this.findByIdWithRelations(id);
    if (!certificate) {
      throw new NotFoundError("Сертификат не найден");
    }

    const enriched = await this.ensureSubjectKeyId(certificate);
    return { ...certificate, subjectKeyId: enriched.subjectKeyId };
  },

  async ensureSubjectKeyId(certificate: Certificate): Promise<Certificate> {
    if (certificate.subjectKeyId) {
      return certificate;
    }

    try {
      if (!(await fileExists(certificate.fileKey))) {
        return certificate;
      }

      const buffer = await getObjectBuffer(certificate.fileKey);
      const parsed = parseCert(
        buffer,
        `certificate.${certificate.certType}`,
      );

      if (!parsed.subjectKeyId) {
        return certificate;
      }

      return await certificateRepository.updateById(certificate.id, {
        subjectKeyId: parsed.subjectKeyId,
      });
    } catch {
      return certificate;
    }
  },

  async findByIdOrThrow(id: string):Promise<Certificate> {
    const certificate = await certificateRepository.findById(id);
    if (!certificate) {
      throw new NotFoundError("Сертификат не найден");
    }
    return certificate;
  },

  async assignToEmployee(certificateId: string, employeeId: string): Promise<Certificate> {
    const certificate = await this.findByIdOrThrow(certificateId);
    if (certificate.status === 'revoked') {
      throw new BadRequestError('Нельзя привязать отозванный сертификат к сотруднику');
    }
    const employee = await employeeService.findByIdOrThrow(employeeId);

    if (!personNamesMatch(certificate.subjectCN, employee.fullName)) {
      throw new BadRequestError(
        "ФИО в сертификате не совпадает с ФИО сотрудника"
      );
    }

    if (certificate.employeeId === employeeId) {
      throw new BadRequestError("Сертификат уже привязан к этому сотруднику");
    }

    return await certificateRepository.updateById(certificateId, {
      employee: { connect: { id: employeeId } },
      subjectEmail: employee.email,
    });
  },

  async unassignFromEmployee(certificateId: string): Promise<Certificate> {
    const certificate = await this.findByIdOrThrow(certificateId);
    if (!certificate.employeeId) {
      throw new BadRequestError("Сертификат не привязан к сотруднику");
    }

    return await certificateRepository.updateById(certificateId, {
      employee: { disconnect: true },
      subjectEmail: null,
    });
  },

  async findBySerialNumber(serialNumber: string):Promise<Certificate | null> {
    return await certificateRepository.findBySerialNumber(serialNumber);
  },

  async ensureUniqueSerialNumber(serialNumber: string):Promise<boolean> {
    const certificate = await this.findBySerialNumber(serialNumber);
    if (certificate) {
      return false;
    }
    return true;
  },

  async updateMany(args: Prisma.CertificateUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return await certificateRepository.updateMany(args);
  },

  async updateNotes(id: string, notes: string | null): Promise<Certificate> {
    await this.findByIdOrThrow(id);
    return await certificateRepository.updateById(id, {
      notes: notes?.trim() ? notes.trim() : null,
    });
  },

  async revoke(id: string): Promise<Certificate> {
    const certificate = await this.findByIdOrThrow(id);

    if (certificate.status === 'revoked') {
      throw new BadRequestError('Сертификат уже отозван');
    }

    return await certificateRepository.updateById(id, {
      status: 'revoked',
    });
  },

  /**
   * Массовое аннулирование истёкших сертификатов: все сертификаты со статусом
   * active/expired, у которых дата окончания раньше cutoff, переводятся в revoked.
   * Отозванные и ещё действующие не трогаются. Возвращает список аннулированных.
   */
  async revokeExpiredBefore(cutoff: Date): Promise<Certificate[]> {
    const affected = await certificateRepository.findMany({
      where: {
        status: { in: ['expired', 'active'] },
        validTo: { lt: cutoff },
      },
      orderBy: { validTo: 'asc' },
    });

    if (affected.length === 0) {
      return [];
    }

    await certificateRepository.updateMany({
      where: { id: { in: affected.map((certificate) => certificate.id) } },
      data: { status: 'revoked' },
    });

    return affected.map((certificate) => ({ ...certificate, status: 'revoked' }));
  },

  async resolveEmployeeForCertificateSubject(
    subjectCN: string,
  ): Promise<ResolveEmployeeResult> {
    const trimmed = subjectCN.trim();
    if (!trimmed || trimmed === 'Unknown') {
      return {
        success: false,
        code: 'INVALID_SUBJECT',
        error: 'Не удалось определить ФИО в сертификате',
      };
    }

    const employees = await employeeService.findByMatchingFullName(trimmed);
    if (employees.length > 1) {
      return {
        success: false,
        code: 'MULTIPLE_IN_DB',
        error: 'Найдено несколько сотрудников с таким ФИО в базе',
      };
    }
    if (employees.length === 1) {
      return {
        success: true,
        employeeId: employees[0].id,
        employeeName: employees[0].fullName,
        source: 'db',
      };
    }

    const employeeInfo = await getEmployeeInfoFromAD(trimmed);
    if (!employeeInfo.success || !employeeInfo.data?.length) {
      return {
        success: false,
        code: 'NOT_FOUND_IN_AD',
        error: employeeInfo.error ?? 'Сотрудник не найден в AD',
      };
    }
    if (employeeInfo.data.length > 1) {
      return {
        success: false,
        code: 'MULTIPLE_IN_AD',
        error: 'Найдено несколько сотрудников с таким ФИО в AD',
      };
    }

    const { cn, sAMAccountName, title, department } = employeeInfo.data[0];
    const appSettings = await appSettingsService.getOrCreate();
    const emailDomain = getAdEmailDomain(appSettings);
    if (!emailDomain) {
      return {
        success: false,
        code: 'EMAIL_DOMAIN_MISSING',
        error:
          'Домен email не настроен. Укажите AD Email Domain в настройках или переменной AD_EMAIL_DOMAIN',
      };
    }

    const email = `${sAMAccountName}@${emailDomain}`;

    try {
      const newEmployee = await employeeService.create({
        fullName: cn,
        email,
        adUsername: sAMAccountName,
        position: title || undefined,
        department: department || undefined,
      });

      return {
        success: true,
        employeeId: newEmployee.id,
        employeeName: newEmployee.fullName,
        source: 'ad_created',
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        const existing = await employeeService.findByAdUsername(sAMAccountName);
        if (existing && personNamesMatch(existing.fullName, trimmed)) {
          return {
            success: true,
            employeeId: existing.id,
            employeeName: existing.fullName,
            source: 'db',
          };
        }
      }
      throw error;
    }
  },

  async bulkAutoAssignUnassignedCertificates(): Promise<BulkAutoAssignReport> {
    const unassigned = await this.findMany({
      where: {
        employeeId: null,
        status: { not: 'revoked' },
      },
      orderBy: { uploadedAt: 'asc' },
    });

    const report: BulkAutoAssignReport = {
      unassignedTotal: unassigned.length,
      assignedFromDb: 0,
      createdAndAssigned: 0,
      skippedCount: 0,
      successes: [],
      issues: [],
    };

    for (const cert of unassigned) {
      const baseIssue = {
        certificateId: cert.id,
        subjectCN: cert.subjectCN,
        serialNumber: cert.serialNumber,
      };

      try {
        const resolved = await this.resolveEmployeeForCertificateSubject(
          cert.subjectCN,
        );

        if (!resolved.success) {
          report.skippedCount += 1;
          report.issues.push({
            ...baseIssue,
            reason: ISSUE_LABELS[resolved.code] ?? resolved.code,
            message: resolved.error,
          });
          continue;
        }

        await this.assignToEmployee(cert.id, resolved.employeeId);

        const success: BulkAutoAssignSuccess = {
          ...baseIssue,
          employeeName: resolved.employeeName,
          action:
            resolved.source === 'ad_created'
              ? 'created_and_assigned'
              : 'assigned_from_db',
        };
        report.successes.push(success);

        if (resolved.source === 'ad_created') {
          report.createdAndAssigned += 1;
        } else {
          report.assignedFromDb += 1;
        }
      } catch (error) {
        report.skippedCount += 1;
        report.issues.push({
          ...baseIssue,
          reason: ISSUE_LABELS.ASSIGN_FAILED,
          message:
            error instanceof Error ? error.message : 'Неизвестная ошибка',
        });
      }
    }

    return report;
  },
}