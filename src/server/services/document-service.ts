import { createDocumentRepository, documentRepository } from "../repositories/document-repository";
import { type Prisma, type Document, FileType } from "@/generated/prisma/client";
import { AlreadyExistsError, NotFoundError } from "../errors/app-error";
import { certificateService } from "./certificate-service";
import { generateDocKey } from "@/minio/file-key";
import { deleteFile, fileExists, uploadFile } from "@/minio/minio";
import prisma from "@/lib/prisma";

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
      throw new AlreadyExistsError("Документ с таким названием уже существует");
    }

    const key = generateDocKey(certificate.id, fileName);
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        const repo = createDocumentRepository(tx);
        await uploadFile(key, fileBuffer, fileType || 'application/octet-stream');
        
        const data: Prisma.DocumentCreateInput = {
          fileName,
          fileType,
          fileKey: key,
          uploadedBy,
          certificate: { connect: { id: certificate.id } },
        };
        const createdDoc = await repo.create(data);
        return createdDoc;
      });
  
      return result;
    } catch(error) {
      await deleteFile(key);
      throw error;
    }
  },

  async deleteById(id: string): Promise<Document> {
    const document = await this.findByIdOrThrow(id);

    const isFileExists = await fileExists(document.fileKey);
    if (!isFileExists) {
      throw new NotFoundError("Файл (в хранилище) для удаления не найден");
    }

    const result = await prisma.$transaction(async (tx) => {
      const repo = createDocumentRepository(tx);
      const deleted = await repo.deleteById(document.id);
      await deleteFile(document.fileKey);
      return deleted;
    });

    return result;
  },

  async findByIdOrThrow(id: string): Promise<Document> {
    const document = await documentRepository.findById(id);
    if (!document) {
      throw new NotFoundError("Документ не найден");
    }
    return document;
  },

  async findById(id: string): Promise<Document | null> {
    const document = await documentRepository.findById(id);
    return document;
  },

  async findByCertificateId(certificateId: string): Promise<Document[]> {
    const certificate = await certificateService.findByIdOrThrow(certificateId);
    return await documentRepository.getByCertificateId(certificate.id);
  },
}