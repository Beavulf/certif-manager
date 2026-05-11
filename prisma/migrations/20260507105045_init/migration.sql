-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "CertType" AS ENUM ('cer', 'p7b');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('pdf', 'docx', 'doc');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('uploadCert', 'deleteCert', 'viewCert', 'uploadDoc', 'deleteDoc', 'editEmployee', 'exportReport', 'login', 'sendNotification');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "adUsername" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "adUsername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "thumbprint" TEXT,
    "subjectCN" TEXT NOT NULL,
    "subjectEmail" TEXT,
    "issuer" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "certType" "CertType" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "status" "CertStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "fileSizeBytes" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysBeforeExpiry" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL,
    "daysBeforeExpiry" INTEGER[] DEFAULT ARRAY[30, 14, 7]::INTEGER[],
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL DEFAULT 25,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "adUsername" TEXT,
    "displayName" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_adUsername_key" ON "Employee"("adUsername");

-- CreateIndex
CREATE INDEX "Employee_fullName_idx" ON "Employee"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "User_adUsername_key" ON "User"("adUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_serialNumber_key" ON "Certificate"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_thumbprint_key" ON "Certificate"("thumbprint");

-- CreateIndex
CREATE INDEX "Certificate_employeeId_idx" ON "Certificate"("employeeId");

-- CreateIndex
CREATE INDEX "Certificate_validTo_idx" ON "Certificate"("validTo");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE INDEX "Document_certificateId_idx" ON "Document"("certificateId");

-- CreateIndex
CREATE INDEX "NotificationLog_certificateId_idx" ON "NotificationLog"("certificateId");

-- CreateIndex
CREATE INDEX "AuditLog_adUsername_idx" ON "AuditLog"("adUsername");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
