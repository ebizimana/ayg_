-- CreateEnum
CREATE TYPE "TargetGpaScope" AS ENUM ('CAREER', 'YEAR', 'SEMESTER');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TargetGpaSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "TargetGpaScope" NOT NULL,
    "targetGpa" DOUBLE PRECISION NOT NULL,
    "yearIndex" INTEGER,
    "semesterId" TEXT,
    "maxAchievableGpa" DOUBLE PRECISION,
    "gpaShortfall" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "TargetGpaSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetGpaSnapshot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "previousDesiredLetterGrade" TEXT NOT NULL,

    CONSTRAINT "TargetGpaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TargetGpaSession_userId_idx" ON "TargetGpaSession"("userId");

-- CreateIndex
CREATE INDEX "TargetGpaSession_scope_idx" ON "TargetGpaSession"("scope");

-- CreateIndex
CREATE INDEX "TargetGpaSession_semesterId_idx" ON "TargetGpaSession"("semesterId");

-- CreateIndex
CREATE INDEX "TargetGpaSnapshot_sessionId_idx" ON "TargetGpaSnapshot"("sessionId");

-- CreateIndex
CREATE INDEX "TargetGpaSnapshot_courseId_idx" ON "TargetGpaSnapshot"("courseId");

-- AddForeignKey
ALTER TABLE "TargetGpaSession" ADD CONSTRAINT "TargetGpaSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetGpaSession" ADD CONSTRAINT "TargetGpaSession_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetGpaSnapshot" ADD CONSTRAINT "TargetGpaSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TargetGpaSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetGpaSnapshot" ADD CONSTRAINT "TargetGpaSnapshot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
