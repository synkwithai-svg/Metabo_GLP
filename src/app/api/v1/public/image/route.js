import { NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer for Cloudinary upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await uploadImageToCloudinary(base64String);


    if (!result || !result.url) {
      return NextResponse.json({ message: "Cloudinary upload failed" }, { status: 500 });
    }

    return NextResponse.json({ url: result.url }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "Error uploading file", error: error.message },
      { status: 500 }
    );
  }
}
