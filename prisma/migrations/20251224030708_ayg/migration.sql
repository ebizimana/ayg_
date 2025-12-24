/*
  Warnings:

  - Added the required column `updatedAt` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GradeCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "actualLetterGrade" TEXT,
ADD COLUMN     "actualPercentGrade" DOUBLE PRECISION,
ADD COLUMN     "gradeFinalizedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "GradeCategory" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
