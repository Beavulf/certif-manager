import type { CertificatesWithIncludes } from "@/types/certificate-types";
import { certificateRepository } from "../repositories/certificate-repository";
import type { Prisma, Certificate, Document } from "@/generated/prisma/client";
import { AlreadyExistsError, BadRequestError, NotFoundError } from "../errors/app-error";
import { employeeService } from "./employee-service";
import { documentRepository } from "../repositories/document-repository";
import { generateCertKey } from "@/minio/file-key";
import { parseCert } from "@/minio/parse-cert";
import { uploadFile } from "@/minio/minio";

export const certificateService = {

  async findMany(
    args?: Prisma.CertificateFindManyArgs
  ):Promise<CertificatesWithIncludes[]> {
    const certificates = await certificateRepository.findMany(args);
    return certificates;
  },

  async create(
    employeeId: string,
    fileName: string,
    uploadedBy: string,
    fileType: string,
    fileBuffer: Buffer,
  ):Promise<Certificate>
   {
    const employee = await employeeService.findByIdOrThrow(employeeId);
    const parsedCert = parseCert(fileBuffer, fileName);

    if (!parsedCert.subjectCN || parsedCert.subjectCN === 'Unknown') {
      throw new BadRequestError("Не удалось определить ФИО пользователя в сертификате");
    }

    const expireValidTo = new Date(parsedCert.validTo) < new Date();
    
    await this.ensureUniqueSerialNumber(parsedCert.serialNumber);
    const key = generateCertKey(employee.id, fileName);
    await uploadFile(key, fileBuffer, fileType || 'application/octet-stream')
    
    return await certificateRepository.create({
      serialNumber: parsedCert.serialNumber,
      thumbprint: parsedCert.thumbprint,
      subjectCN: parsedCert.subjectCN,
      subjectEmail: employee.email,
      issuer: "non",
      validFrom: parsedCert.validFrom,
      validTo: parsedCert.validTo,
      certType: parsedCert.certType,
      fileKey: key,
      uploadedBy: uploadedBy,
      status: expireValidTo ? "expired" : "active",
      notes: "non",
      employee: {
        connect: {
          id: employee.id
        }
      }
    });
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

  async findByEmployeeIdOrThrow(employeeId: string):Promise<Certificate[]> {
    const employee = await employeeService.findByIdOrThrow(employeeId, true);
    if (!('certificates' in employee)) {
      throw new NotFoundError("Нет привязанных сертификатов к сотруднику");
    }
    return await certificateRepository.findByEmployeeId(employee.id);
  },

  async findBySerialNumber(serialNumber: string):Promise<Certificate | null> {
    return await certificateRepository.findBySerialNumber(serialNumber);
  },

  async ensureUniqueSerialNumber(serialNumber: string):Promise<Certificate | null> {
    const certificate = await this.findBySerialNumber(serialNumber);
    if (certificate) {
      throw new AlreadyExistsError("Сертификат с таким серийным номером уже существует");
    }
    return certificate;
  },

  async findBySerialNumberOrThrow(serialNumber: string):Promise<Certificate> {
    const certificate = await certificateRepository.findBySerialNumber(serialNumber);
    if (!certificate) {
      throw new NotFoundError("Сертификат не найден");
    }
    return certificate;
  },

  async updateMany(args: Prisma.CertificateUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return await certificateRepository.updateMany(args);
  },

  async getDocuments(id: string):Promise<Document[]> {
    const certificate = await this.findByIdOrThrow(id);
    const documents = await documentRepository.getByCertificateId(certificate.id);
    return documents;
  }
}