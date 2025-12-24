/*
  Warnings:

  - Added the required column `updatedAt` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Grade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Semester` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_semesterId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "GradeCategory" DROP CONSTRAINT "GradeCategory_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Semester" DROP CONSTRAINT "Semester_userId_fkey";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expectedPoints" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Semester" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Assignment_categoryId_idx" ON "Assignment"("categoryId");

-- CreateIndex
CREATE INDEX "Course_semesterId_idx" ON "Course"("semesterId");

-- CreateIndex
CREATE INDEX "Course_gradingScaleId_idx" ON "Course"("gradingScaleId");

-- CreateIndex
CREATE INDEX "Grade_assignmentId_idx" ON "Grade"("assignmentId");

-- CreateIndex
CREATE INDEX "GradeCategory_courseId_idx" ON "GradeCategory"("courseId");

-- CreateIndex
CREATE INDEX "Semester_userId_idx" ON "Semester"("userId");

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeCategory" ADD CONSTRAINT "GradeCategory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GradeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
