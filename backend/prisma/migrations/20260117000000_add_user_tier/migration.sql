-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('FREE', 'PAID');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tier" "UserTier" NOT NULL DEFAULT 'FREE';
