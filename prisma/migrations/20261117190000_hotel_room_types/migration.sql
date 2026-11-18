CREATE TABLE "room_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "max_adults" INTEGER NOT NULL DEFAULT 2,
    "max_children" INTEGER NOT NULL DEFAULT 0,
    "bed_description" VARCHAR(180) NOT NULL,
    "area_sqm" DECIMAL(7,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "nightly_rate" DECIMAL(12,2) NOT NULL,
    "breakfast_included" BOOLEAN NOT NULL DEFAULT false,
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "cancellation_policy" VARCHAR(255) NOT NULL DEFAULT 'Cancelación flexible',
    "prepayment_policy" VARCHAR(255) NOT NULL DEFAULT 'Sin pago por adelantado',
    "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_room_types_business_available" ON "room_types"("business_id", "is_available");
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
