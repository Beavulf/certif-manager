import { createDocumentRepository, documentRepository } from "../repositories/document-repository";
import { type Prisma, type Document, FileType } from "@/generated/prisma/client";
import { NotFoundError } from "../errors/app-error";
import { certificateService } from "./certificate-service";
import { generateDocKey } from "@/minio/file-key";
import { deleteFile, uploadFile } from "@/minio/minio";
import prisma from "@/lib/prisma";
import { createAuditLogRepository } from "../repositories/auditlog-repository";
import { auditlogService } from "./auditlog-service";

export const documentService = {

  async findMany(args?: Prisma.DocumentFindManyArgs): Promise<Document[]> {
    return await documentRepository.findMany(args);
  },

  async create(
    certificateId: string,
    fileBuffer: Buffer,
    fileType: FileType,
    fileName: string,
    uploadedBy: string,
  ): Promise<Document> {
    const certificate = await certificateService.findByIdOrThrow(certificateId);
    
    const duplicate = await documentRepository.findMany({
      where: {
        certificateId: certificate.id,
        fileName: fileName
      }
    });

    if (duplicate.length > 0) {
      throw new NotFoundError("Документ с таким названием уже существует");
    }

    const key = generateDocKey(certificate.id, fileName);
    const result = await prisma.$transaction(async (tx) => {
      const repo = createDocumentRepository(tx);
      await uploadFile(key, fileBuffer, fileType || 'application/octet-stream');
      
      const data: Prisma.DocumentCreateInput = {
        certificate: { connect: { id: certificate.id } },
        fileName,
        fileType,
        fileKey: key,
        uploadedBy,
      };
      const createdDoc = await repo.create(data);
      return createdDoc;
    });

    await auditlogService.log({
      adUsername: uploadedBy,
      action: "uploadDoc",
      entityType: 'document',
      entityId: result.id,
      ipAddress: ""
    })
    return result;
  },

  async deleteById(id: string): Promise<Document> {
    const document = await this.findByIdOrThrow(id);
    const result = await prisma.$transaction(async (tx) => {
      const repo = createDocumentRepository(tx);
      await deleteFile(document.fileKey);
      const deleted = await repo.deleteById(document.id);
      return deleted;
    });
    if (!result) {
      throw new NotFoundError("Документ для удаления не найден");
    }
    return result;
  },

  async findByIdOrThrow(id: string): Promise<Document> {
    const document = await documentRepository.findById(id);
    if (!document) {
      throw new NotFoundError("Документ не найден");
    }
    return document;
  },

  async findByCertificateId(certificateId: string): Promise<Document[]> {
    const certificate = await certificateService.findByIdOrThrow(certificateId);
    return await documentRepository.getByCertificateId(certificate.id);
  },
}