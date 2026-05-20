import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
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

export default async (_req: Request, context: Context) => {
  const barcode = context.params.barcode?.trim() || null;
  if (!barcode) return errorResponse("barcode is required");

  const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
  if (!product) return errorResponse("product not found");

  return successResponse(product);
};

export const config: Config = {
  path: "/api/v1/product/barcode/:barcode",
  method: ["GET"],
};
