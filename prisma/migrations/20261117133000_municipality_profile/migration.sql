CREATE TABLE "municipality_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "department" VARCHAR(120) NOT NULL,
  "tagline" VARCHAR(220) NOT NULL,
  "introduction" TEXT NOT NULL,
  "history" TEXT NOT NULL,
  "culture" TEXT NOT NULL,
  "nature" TEXT NOT NULL,
  "cover_image_url" TEXT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "municipality_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "municipality_profiles_slug_key" ON "municipality_profiles"("slug");
