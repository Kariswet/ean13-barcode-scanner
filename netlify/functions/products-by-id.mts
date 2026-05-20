import type { Config, Context } from "@netlify/functions";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";

type ProductRow = typeof products.$inferSelect;
type ProductUpdate = Partial<Omit<ProductRow, "_id">>;

function successResponse(data: unknown, message = "success") {
  return Response.json({
    metadata: { status: true, message, timeExecution: String(Date.now()) },
    data,
  });
}

function errorResponse(message: string) {
  return Response.json({
    metadata: { status: false, message, timeExecution: String(Date.now()) },
    data: null,
  });
}

export default async (req: Request, context: Context) => {
  const { id } = context.params;

  if (req.method === "GET") {
    const [product] = await db.select().from(products).where(eq(products._id, id));
    if (!product) return errorResponse("product not found");
    return successResponse(product);
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    const body = await req.json();
    const updates: ProductUpdate = {};

    if (body.name !== undefined) updates.name = body.name ?? null;
    if (body.brand !== undefined) updates.brand = body.brand ?? null;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.price !== undefined) updates.price = body.price;
    if (body.category !== undefined) updates.category = body.category ?? null;
    if (body.barcode !== undefined) {
      updates.barcode = body.barcode ? String(body.barcode).trim() || null : null;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("no fields provided for update");
    }

    if (updates.barcode) {
      const [conflict] = await db
        .select()
        .from(products)
        .where(and(eq(products.barcode, updates.barcode), ne(products._id, id)));
      if (conflict) return errorResponse("product barcode already exists");
    }

    const [existing] = await db.select().from(products).where(eq(products._id, id));
    if (!existing) return errorResponse("product not found");

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products._id, id))
      .returning();

    return successResponse(updated, "updated");
  }

  if (req.method === "DELETE") {
    const [product] = await db.select().from(products).where(eq(products._id, id));
    if (!product) return errorResponse("product not found");

    await db.delete(products).where(eq(products._id, id));
    return successResponse(product, "deleted");
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/v1/product/:id",
  method: ["GET", "PATCH", "PUT", "DELETE"],
};
