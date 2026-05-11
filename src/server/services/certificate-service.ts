import type { GetCertificateOptions } from "@/types/certificate-types";
import { certificateRepository } from "../repositories/certificate-repository";
import type { Prisma, Certificate, Document } from "@/generated/prisma/client";
import { NotFoundError } from "../errors/app-error";
import { employeeService } from "./employee-service";
import type { CertificateInclude } from "@/generated/prisma/models";
import { documentRepository } from "../repositories/document-repository";

export const certificateService = {
  async getAll(options?: GetCertificateOptions):Promise<(Certificate & CertificateInclude)[]> {
    const { includeEmployee, includeNotificationLog, includeDocuments } = options || {}
    const newOptions = {
      ...options,
      include: {
        employee: includeEmployee,
        notificationLog: includeNotificationLog,
        documents: includeDocuments
      }
    }
    return await certificateRepository.getAllWithOptions(newOptions)
  },

  async create(data: Prisma.CertificateCreateInput) {
    return await certificateRepository.create(data);
  },

  async findById(id: string):Promise<Certificate | null> {
    return await certificateRepository.findById(id);
  },

  async findByIdOrThrow(id: string):Promise<Certificate> {
    const certificate = await certificateRepository.findById(id);
    if (!certificate) {
      throw new NotFoundError("Сертификат не найден");
    }
    return certificate;
  },

  async findByEmployeeId(employeeId: string):Promise<Certificate | null> {
    const employee = await employeeService.findByIdOrThrow(employeeId, true);
    if (!('certificates' in employee)) {
      throw new NotFoundError("Нет привязанных сертификатов к сотруднику");
    }
    return await certificateRepository.findByEmployeeId(employee.id);
  },

  async getDocuments(id: string):Promise<Document[]> {
    const certificate = await this.findByIdOrThrow(id);
    const documents = await documentRepository.getByCertificateId(certificate.id);
    return documents;
  }
}