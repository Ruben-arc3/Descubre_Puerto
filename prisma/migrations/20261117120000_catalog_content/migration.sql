ALTER TABLE "business_media"
  ALTER COLUMN "image_url" DROP NOT NULL,
  ADD COLUMN "image_data" BYTEA,
  ADD COLUMN "mime_type" VARCHAR(100),
  ADD COLUMN "file_name" VARCHAR(255);

ALTER TABLE "attractions"
  ALTER COLUMN "cover_image_url" DROP NOT NULL,
  ADD COLUMN "cover_image_data" BYTEA,
  ADD COLUMN "cover_mime_type" VARCHAR(100);

CREATE TABLE "business_services" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2),
  "price_unit" VARCHAR(50),
  "is_available" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "business_services_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_business_services_business_available" ON "business_services"("business_id", "is_available");

CREATE TABLE "menu_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(100),
  "price" DECIMAL(12,2) NOT NULL,
  "image_url" TEXT,
  "is_available" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "menu_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_menu_items_business_category" ON "menu_items"("business_id", "category");
