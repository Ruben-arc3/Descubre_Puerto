-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SUPERADMIN', 'ALCALDIA_ADMIN', 'BUSINESS_OWNER', 'TOURIST');

-- CreateEnum
CREATE TYPE "auth_provider_type" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "business_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "occupancy_status_type" AS ENUM ('AVAILABLE', 'LIMITED', 'FULL');

-- CreateEnum
CREATE TYPE "inquiry_status_type" AS ENUM ('SENT_TO_WHATSAPP', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "analytics_event_type" AS ENUM ('PAGE_VIEW', 'WHATSAPP_CLICK', 'QR_SCAN', 'MAP_PIN_CLICK');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT,
    "auth_provider" "auth_provider_type" NOT NULL DEFAULT 'LOCAL',
    "phone" VARCHAR(30),
    "role" "user_role" NOT NULL DEFAULT 'TOURIST',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "icon_name" VARCHAR(50) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "zone" VARCHAR(120) NOT NULL,
    "short_description" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "whatsapp_number" VARCHAR(20) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "base_price" DECIMAL(12,2),
    "price_unit" VARCHAR(50),
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "business_status" NOT NULL DEFAULT 'PENDING',
    "instagram_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_details" (
    "business_id" UUID NOT NULL,
    "occupancy_status" "occupancy_status_type" NOT NULL DEFAULT 'AVAILABLE',
    "check_in_time" VARCHAR(20),
    "check_out_time" VARCHAR(20),
    "max_guests_per_unit" INTEGER,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodation_details_pkey" PRIMARY KEY ("business_id")
);

-- CreateTable
CREATE TABLE "business_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attractions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "category_tag" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "recommendations" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "cover_image_url" TEXT NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_inquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "tourist_id" UUID,
    "guest_name" VARCHAR(150) NOT NULL,
    "guest_phone" VARCHAR(30),
    "check_in_date" DATE,
    "check_out_date" DATE,
    "guests_count" INTEGER NOT NULL DEFAULT 1,
    "status" "inquiry_status_type" NOT NULL DEFAULT 'SENT_TO_WHATSAPP',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","business_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "business_id" UUID,
    "attraction_id" UUID,
    "event_type" "analytics_event_type" NOT NULL,
    "source_tag" VARCHAR(100),
    "device_type" VARCHAR(30),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "idx_businesses_category_status" ON "businesses"("category_id", "status");

-- CreateIndex
CREATE INDEX "idx_businesses_zone_status" ON "businesses"("zone", "status");

-- CreateIndex
CREATE INDEX "idx_businesses_owner" ON "businesses"("owner_id");

-- CreateIndex
CREATE INDEX "idx_businesses_featured" ON "businesses"("is_featured");

-- CreateIndex
CREATE INDEX "idx_accommodation_occupancy" ON "accommodation_details"("occupancy_status");

-- CreateIndex
CREATE INDEX "idx_business_media_business_cover" ON "business_media"("business_id", "is_cover");

-- CreateIndex
CREATE UNIQUE INDEX "attractions_slug_key" ON "attractions"("slug");

-- CreateIndex
CREATE INDEX "idx_inquiries_business_created" ON "reservation_inquiries"("business_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_inquiries_tourist" ON "reservation_inquiries"("tourist_id");

-- CreateIndex
CREATE INDEX "idx_reviews_business_visible" ON "reviews"("business_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_business_review" ON "reviews"("user_id", "business_id");

-- CreateIndex
CREATE INDEX "idx_analytics_created_event" ON "analytics_events"("created_at" DESC, "event_type");

-- CreateIndex
CREATE INDEX "idx_analytics_business" ON "analytics_events"("business_id");

-- CreateIndex
CREATE INDEX "idx_analytics_source_tag" ON "analytics_events"("source_tag");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_details" ADD CONSTRAINT "accommodation_details_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_inquiries" ADD CONSTRAINT "reservation_inquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_inquiries" ADD CONSTRAINT "reservation_inquiries_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attractions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
