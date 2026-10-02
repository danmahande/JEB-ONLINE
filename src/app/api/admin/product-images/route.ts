import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { isSameOriginRequest } from "@/lib/request-origin";

const MAX_IMAGE_SIZE = 4.5 * 1024 * 1024;
const uploadRequestSchema = z
  .object({
    type: z.literal("blob.generate-client-token"),
    payload: z
      .object({
        pathname: z.string().max(120),
        multipart: z.boolean(),
        clientPayload: z.string().nullable(),
      })
      .strict(),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Request origin could not be verified." },
      { status: 403 }
    );
  }
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Sign in to upload product images." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Product image uploads are not configured. Connect a Vercel Blob store." },
      { status: 503 }
    );
  }

  let body: HandleUploadBody;
  try {
    const parsed = uploadRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Upload request is invalid." },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json(
      { error: "Upload request must be valid JSON." },
      { status: 400 }
    );
  }

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await getAdminSession())) throw new Error("Not authenticated.");
        if (!/^product-images\/[0-9a-f-]{36}\.webp$/i.test(pathname)) {
          throw new Error("Invalid product image path.");
        }
        return {
          allowedContentTypes: ["image/webp"],
          maximumSizeInBytes: MAX_IMAGE_SIZE,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/admin/product-images error:", error);
    return NextResponse.json(
      { error: "Product image upload could not be authorized." },
      { status: 400 }
    );
  }
}
