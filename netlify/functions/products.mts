import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";

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

export default async (req: Request) => {
  if (req.method === "GET") {
    const all = await db.select().from(products);
    return successResponse(all);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const id: string = body._id || randomUUID().replace(/-/g, "");
    const barcode: string | null = body.barcode ? String(body.barcode).trim() || null : null;

    const [existingById] = await db.select().from(products).where(eq(products._id, id));
    if (existingById) return errorResponse("product id already exists");

    if (barcode) {
      const [existingByBarcode] = await db.select().from(products).where(eq(products.barcode, barcode));
      if (existingByBarcode) return errorResponse("product barcode already exists");
    }

    const [inserted] = await db
      .insert(products)
      .values({
        _id: id,
        barcode,
        name: body.name ?? null,
        brand: body.brand ?? null,
        description: body.description ?? null,
        price: body.price ?? 0,
        category: body.category ?? null,
      })
      .returning();

    return successResponse(inserted);
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/v1/product",
  method: ["GET", "POST"],
};
