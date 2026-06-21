-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'editSettings';

-- CreateTable
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
