-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleteRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deleteScheduledAt" TIMESTAMP(3),
ADD COLUMN     "monthlyReportOptIn" BOOLEAN NOT NULL DEFAULT false;
