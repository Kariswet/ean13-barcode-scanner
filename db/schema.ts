import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  _id: text("_id").primaryKey(),
  barcode: text("barcode").unique(),
  name: text("name"),
  brand: text("brand"),
  description: text("description"),
  price: integer("price").default(0).notNull(),
  category: text("category"),
});
