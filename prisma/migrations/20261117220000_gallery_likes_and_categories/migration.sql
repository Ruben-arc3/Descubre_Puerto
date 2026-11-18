ALTER TABLE "gallery_photos"
  ADD COLUMN "category" VARCHAR(80) NOT NULL DEFAULT 'Playas y mar',
  ADD COLUMN "location" VARCHAR(150) NOT NULL DEFAULT 'Puerto Escondido';

CREATE TABLE "gallery_likes" (
  "user_id" UUID NOT NULL,
  "photo_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "gallery_likes_pkey" PRIMARY KEY ("user_id", "photo_id"),
  CONSTRAINT "gallery_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "gallery_likes_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_gallery_likes_photo" ON "gallery_likes"("photo_id");
