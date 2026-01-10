-- CreateEnum
CREATE TYPE "GradingMethod" AS ENUM ('WEIGHTED', 'POINTS');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "gradingMethod" "GradingMethod" NOT NULL DEFAULT 'WEIGHTED';
