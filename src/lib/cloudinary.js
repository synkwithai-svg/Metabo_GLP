// lib/cloudinary.js
export async function uploadImageToCloudinary(file) {
    if (!file) throw new Error("No file provided for upload");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        const result = await response.json();

        if (result.secure_url) {
            return { url: result.secure_url };
        }

        console.error("Cloudinary upload failed:", result);
        return null;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return null;
    }
}
