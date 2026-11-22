INSERT INTO "categories" ("name", "slug", "icon_name", "display_order")
VALUES ('Transportes', 'transportes', 'bus', 4)
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "icon_name" = EXCLUDED."icon_name",
    "display_order" = EXCLUDED."display_order";
