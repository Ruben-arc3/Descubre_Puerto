ALTER TABLE "users" ADD COLUMN "google_id" VARCHAR(255);
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

CREATE TABLE "gallery_photos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "caption" VARCHAR(250) NOT NULL DEFAULT '',
  "image_data" BYTEA NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gallery_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_gallery_photos_created" ON "gallery_photos"("created_at" DESC);
