-- CreateTable
CREATE TABLE "Year" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Year_pkey" PRIMARY KEY ("id")
);

-- Add yearId columns (nullable for backfill)
ALTER TABLE "Semester" ADD COLUMN "yearId" TEXT;
ALTER TABLE "TargetGpaSession" ADD COLUMN "yearId" TEXT;

-- Backfill Year rows from existing semesters
WITH ordered AS (
    SELECT
        s.*,
        CASE WHEN lower(split_part(s."name", ' ', 1)) = 'fall' THEN 1 ELSE 0 END AS is_fall
    FROM "Semester" s
),
grouped AS (
    SELECT
        o.*,
        SUM(is_fall) OVER (
            PARTITION BY o."userId"
            ORDER BY o."startDate", o."createdAt", o."id"
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS fall_count,
        FIRST_VALUE(is_fall) OVER (
            PARTITION BY o."userId"
            ORDER BY o."startDate", o."createdAt", o."id"
        ) AS first_is_fall
    FROM ordered o
),
labeled AS (
    SELECT
        *,
        CASE WHEN first_is_fall = 1 THEN fall_count - 1 ELSE fall_count END AS year_index
    FROM grouped
)
INSERT INTO "Year" ("id", "userId", "name", "startDate", "endDate", "createdAt", "updatedAt")
SELECT
    md5(concat("userId", '::', year_index)),
    "userId",
    concat('Year ', year_index + 1),
    MIN("startDate"),
    MAX("endDate"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM labeled
GROUP BY "userId", year_index;

-- Update Semester.yearId based on computed year index
WITH ordered AS (
    SELECT
        s.*,
        CASE WHEN lower(split_part(s."name", ' ', 1)) = 'fall' THEN 1 ELSE 0 END AS is_fall
    FROM "Semester" s
),
grouped AS (
    SELECT
        o.*,
        SUM(is_fall) OVER (
            PARTITION BY o."userId"
            ORDER BY o."startDate", o."createdAt", o."id"
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS fall_count,
        FIRST_VALUE(is_fall) OVER (
            PARTITION BY o."userId"
            ORDER BY o."startDate", o."createdAt", o."id"
        ) AS first_is_fall
    FROM ordered o
),
labeled AS (
    SELECT
        *,
        CASE WHEN first_is_fall = 1 THEN fall_count - 1 ELSE fall_count END AS year_index
    FROM grouped
)
UPDATE "Semester" s
SET "yearId" = md5(concat(s."userId", '::', labeled.year_index))
FROM labeled
WHERE labeled."id" = s."id";

-- Update TargetGpaSession.yearId from existing yearIndex
UPDATE "TargetGpaSession"
SET "yearId" = md5(concat("userId", '::', "yearIndex"))
WHERE "yearIndex" IS NOT NULL;

-- Drop old userId/yearIndex columns and enforce new relations
ALTER TABLE "Semester" DROP CONSTRAINT "Semester_userId_fkey";
ALTER TABLE "Semester" DROP COLUMN "userId";
ALTER TABLE "Semester" ALTER COLUMN "yearId" SET NOT NULL;

ALTER TABLE "TargetGpaSession" DROP COLUMN "yearIndex";

-- Indexes
CREATE INDEX "Year_userId_idx" ON "Year"("userId");
CREATE INDEX "Year_startDate_idx" ON "Year"("startDate");
CREATE INDEX "Semester_yearId_idx" ON "Semester"("yearId");
CREATE INDEX "TargetGpaSession_yearId_idx" ON "TargetGpaSession"("yearId");

-- Foreign Keys
ALTER TABLE "Year" ADD CONSTRAINT "Year_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetGpaSession" ADD CONSTRAINT "TargetGpaSession_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE CASCADE ON UPDATE CASCADE;
