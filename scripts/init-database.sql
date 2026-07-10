-- Cert Manager: full database schema for PostgreSQL
-- Run once in pgAdmin or psql on database cert_manager
--
-- 1. CREATE DATABASE cert_manager;
-- 2. Connect to cert_manager
-- 3. Execute this entire script

-- Migration: 20260507105045_init
CREATE TYPE "CertStatus" AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE "CertType" AS ENUM ('cer', 'p7b');
CREATE TYPE "FileType" AS ENUM ('pdf', 'docx', 'doc');
CREATE TYPE "AuditAction" AS ENUM (
  'uploadCert',
  'deleteCert',
  'viewCert',
  'uploadDoc',
  'deleteDoc',
  'editEmployee',
  'exportReport',
  'login',
  'sendNotification'
);

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

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "adUsername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "thumbprint" TEXT,
    "subjectKeyId" TEXT,
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

CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_adUsername_key" ON "Employee"("adUsername");
CREATE INDEX "Employee_fullName_idx" ON "Employee"("fullName");
CREATE UNIQUE INDEX "User_adUsername_key" ON "User"("adUsername");
CREATE UNIQUE INDEX "Certificate_serialNumber_key" ON "Certificate"("serialNumber");
CREATE UNIQUE INDEX "Certificate_thumbprint_key" ON "Certificate"("thumbprint");
CREATE INDEX "Certificate_employeeId_idx" ON "Certificate"("employeeId");
CREATE INDEX "Certificate_validTo_idx" ON "Certificate"("validTo");
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");
CREATE INDEX "Document_certificateId_idx" ON "Document"("certificateId");
CREATE INDEX "NotificationLog_certificateId_idx" ON "NotificationLog"("certificateId");
CREATE INDEX "AuditLog_adUsername_idx" ON "AuditLog"("adUsername");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_certificateId_fkey"
  FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_certificateId_fkey"
  FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration: 20260512153234_update_audit_log_type_entity_id_int_string
ALTER TABLE "AuditLog" ALTER COLUMN "entityId" SET DATA TYPE TEXT;

-- Migration: 20260515105038_update_audit_action
ALTER TYPE "AuditAction" ADD VALUE 'editCertificate';

-- Migration: 20260529123018_optional_employee_id_in_certificate
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_employeeId_fkey";
ALTER TABLE "Certificate" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration: 20260529141020_delete_document_by_cascade
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_certificateId_fkey";
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_certificateId_fkey"
  FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: 20260621075556_add_app_settings
ALTER TYPE "AuditAction" ADD VALUE 'editSettings';

CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "appName" TEXT NOT NULL DEFAULT 'Cert Manager',
    "organizationName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Minsk',
    "warningDays" INTEGER NOT NULL DEFAULT 30,
    "criticalDays" INTEGER NOT NULL DEFAULT 7,
    "maxFileSizeMb" INTEGER NOT NULL DEFAULT 10,
    "allowedCertTypes" TEXT[] DEFAULT ARRAY['.cer', '.p7b']::TEXT[],
    "allowedDocTypes" TEXT[] DEFAULT ARRAY['.pdf', '.docx', '.doc']::TEXT[],
    "cronCheckTime" TEXT NOT NULL DEFAULT '08:00',
    "adEmailDomain" TEXT,
    "auditLogRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
