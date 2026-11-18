ALTER TABLE "gallery_photos"
  ADD COLUMN "is_sample" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "source_credit" VARCHAR(255),
  ADD COLUMN "source_url" VARCHAR(500);
