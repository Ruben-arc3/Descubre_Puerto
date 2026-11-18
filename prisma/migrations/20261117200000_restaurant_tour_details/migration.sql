CREATE TABLE "restaurant_details" (
    "business_id" UUID NOT NULL,
    "opening_hours" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "closed_days" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "service_options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "payment_methods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "dietary_options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "atmosphere" VARCHAR(180),
    "capacity" INTEGER,
    "average_spend" DECIMAL(12,2),
    "reservation_required" BOOLEAN NOT NULL DEFAULT false,
    "accessibility_info" TEXT,
    CONSTRAINT "restaurant_details_pkey" PRIMARY KEY ("business_id")
);
CREATE TABLE "tour_details" (
    "business_id" UUID NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "schedules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "meeting_point" VARCHAR(255) NOT NULL,
    "min_group_size" INTEGER NOT NULL DEFAULT 1,
    "max_group_size" INTEGER,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "included" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "physical_level" VARCHAR(80) NOT NULL DEFAULT 'Suave',
    "languages" TEXT[] NOT NULL DEFAULT ARRAY['Español']::TEXT[],
    "cancellation_policy" VARCHAR(255) NOT NULL DEFAULT 'Consultar con el operador',
    "weather_policy" VARCHAR(255),
    "accessibility_info" TEXT,
    CONSTRAINT "tour_details_pkey" PRIMARY KEY ("business_id")
);
ALTER TABLE "restaurant_details" ADD CONSTRAINT "restaurant_details_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tour_details" ADD CONSTRAINT "tour_details_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
