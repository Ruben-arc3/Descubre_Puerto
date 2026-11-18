ALTER TABLE "accommodation_details"
  ADD COLUMN "smoking_allowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "events_allowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pets_policy" VARCHAR(40) NOT NULL DEFAULT 'NOT_ALLOWED';
