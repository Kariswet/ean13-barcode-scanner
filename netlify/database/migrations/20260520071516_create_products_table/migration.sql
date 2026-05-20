CREATE TABLE "products" (
	"_id" text PRIMARY KEY,
	"barcode" text UNIQUE,
	"name" text,
	"brand" text,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"category" text
);

INSERT INTO "products" ("_id", "barcode", "name", "brand", "description", "price", "category")
VALUES
  ('7853aec4715b4fa1942d1a95c8e0f357', '8991001000019', 'Frisian Flag Sweetened Condensed Milk', 'Frisian Flag', 'Sample dairy product for EAN-13 scanner testing.', 18000, 'Dairy'),
  ('ce0a4d8f8f994ec0b102f234ed62fb4a', '8991001000026', 'Indomie Mi Goreng', 'Indomie', 'Sample grocery item for barcode lookup.', 3500, 'Instant Noodles'),
  ('1e1e1afbef5e4cb485bc7028c88f5d26', '1234567890128', 'Google Image Example', 'Google', 'Sample product for EAN-13 scanner testing', 1000000, 'Image')
ON CONFLICT DO NOTHING;
