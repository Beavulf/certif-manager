-- DropForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_certificateId_fkey";

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
