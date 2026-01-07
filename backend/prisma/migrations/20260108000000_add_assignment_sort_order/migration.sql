ALTER TABLE "Assignment" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT a.id,
         ROW_NUMBER() OVER (PARTITION BY c."courseId" ORDER BY a."createdAt" ASC, a.id ASC) AS rn
  FROM "Assignment" a
  JOIN "GradeCategory" c ON c.id = a."categoryId"
)
UPDATE "Assignment" a
SET "sortOrder" = ranked.rn
FROM ranked
WHERE a.id = ranked.id;
