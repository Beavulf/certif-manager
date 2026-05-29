-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_employeeId_fkey";

-- AlterTable
ALTER TABLE "Certificate" ALTER COLUMN "employeeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
