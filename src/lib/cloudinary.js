import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

export function uploadImageToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            {
                folder: "uploads",
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return reject(error);
                }
                resolve(result);
            }
        );

        upload.end(buffer);
    });
}
