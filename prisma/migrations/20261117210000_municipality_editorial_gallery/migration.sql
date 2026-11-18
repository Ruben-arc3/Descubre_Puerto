ALTER TABLE "municipality_profiles"
  ADD COLUMN "flora" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "fauna" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "places" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "geography" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "wikipedia_summary" TEXT,
  ADD COLUMN "wikipedia_url" VARCHAR(500),
  ADD COLUMN "wikipedia_thumbnail" VARCHAR(1000),
  ADD COLUMN "wikipedia_synced_at" TIMESTAMPTZ(6);

CREATE TABLE "municipality_media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(120) NOT NULL,
  "caption" VARCHAR(255) NOT NULL,
  "period" VARCHAR(80) NOT NULL DEFAULT 'Actualidad',
  "image_url" VARCHAR(1000),
  "image_data" BYTEA,
  "mime_type" VARCHAR(100),
  "credit" VARCHAR(255),
  "source_url" VARCHAR(1000),
  "is_historical" BOOLEAN NOT NULL DEFAULT false,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "municipality_id" UUID NOT NULL,
  CONSTRAINT "municipality_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "municipality_media_image_required" CHECK ("image_data" IS NOT NULL OR "image_url" IS NOT NULL)
);
CREATE UNIQUE INDEX "municipality_media_key_key" ON "municipality_media"("key");
CREATE INDEX "idx_municipality_media_gallery" ON "municipality_media"("municipality_id", "is_historical", "display_order");
ALTER TABLE "municipality_media" ADD CONSTRAINT "municipality_media_municipality_id_fkey"
  FOREIGN KEY ("municipality_id") REFERENCES "municipality_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
