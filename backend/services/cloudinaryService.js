// backend/services/cloudinaryService.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/*
|--------------------------------------------------------------------------
| DETECT CLOUDINARY RESOURCE TYPE
|--------------------------------------------------------------------------
| Cloudinary buckets files into three types:
|   image  → jpg, png, gif, webp, svg, pdf
|   video  → mp4, webm, mov, mkv, avi, gif (when uploaded via video endpoint)
|   raw    → everything else (zip, txt, docx, ...)
|
| Wrong resource_type = broken delivery. Setting it from the MIME type
| is much more reliable than "auto".
|--------------------------------------------------------------------------
*/
const detectResourceType = (mimeType = "", filename = "") => {
  const mime = (mimeType || "").toLowerCase();
  const ext = (filename.split(".").pop() || "").toLowerCase();

  // Image (Cloudinary also serves PDFs from the image bucket)
  if (mime.startsWith("image/")) return "image";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"].includes(ext))
    return "image";
  if (mime === "application/pdf" || ext === "pdf") return "image";

  // Video
  if (mime.startsWith("video/")) return "video";
  if (["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv"].includes(ext))
    return "video";

  // Everything else
  return "raw";
};

/*
|--------------------------------------------------------------------------
| UPLOAD BUFFER
|--------------------------------------------------------------------------
| Uploads a Buffer to Cloudinary using the right resource_type based on
| the MIME type. 120s timeout to survive slow hotspot connections.
|--------------------------------------------------------------------------
*/
const uploadBuffer = (
  buffer,
  { folder = "flux/attachments", filename, mimeType } = {}
) => {
  return new Promise((resolve, reject) => {
    const resourceType = detectResourceType(mimeType, filename);

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      timeout: 120000,
    };

    if (filename) uploadOptions.filename_override = filename;

    console.log(
      `>>> [cloudinary] uploading ${filename} as resource_type=${resourceType}`
    );

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (err, result) => {
        if (err) {
          console.error(">>> [cloudinary] UPLOAD ERROR:", err.message);
          return reject(err);
        }

        const payload = {
          publicId: result.public_id,
          url: result.secure_url,
          resourceType: result.resource_type,
          bytes: result.bytes,
          // For videos, Cloudinary can generate a thumbnail
          // by swapping the file extension to .jpg
          thumbnailUrl:
            resourceType === "video"
              ? result.secure_url.replace(/\.[^/.]+$/, ".jpg")
              : null,
        };

        console.log(">>> [cloudinary] uploaded:", payload.publicId);
        resolve(payload);
      }
    );

    stream.on("error", (err) => {
      console.error(">>> [cloudinary] STREAM ERROR:", err.message);
      reject(err);
    });

    stream.end(buffer);
  });
};

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
| Best-effort removal. Needs the exact resource_type used at upload.
|--------------------------------------------------------------------------
*/
const deleteFile = async (publicId, resourceType = "image") => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
      timeout: 60000,
    });
  } catch (err) {
    console.error("[cloudinary] delete failed:", publicId, err.message);
  }
};

/*
|--------------------------------------------------------------------------
| AVATAR UPLOAD
|--------------------------------------------------------------------------
| Always image, always overwrite, generous timeout.
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| AVATAR UPLOAD
|--------------------------------------------------------------------------
| Uses a stable public_id per user (flux/avatars/<userId>), so re-uploading
| replaces the previous avatar instead of accumulating files.
|
| `invalidate: true` purges Cloudinary's CDN cache so the new image
| appears immediately, even if the URL doesn't change.
|--------------------------------------------------------------------------
*/
const uploadAvatar = (buffer, userId) => {
  return new Promise((resolve, reject) => {
    const options = {
      resource_type: "image",
      timeout: 120000,
      overwrite: true,
      invalidate: true,
    };

    if (userId) {
      options.public_id = `flux/avatars/${userId}`;
      options.use_filename = false;
      options.unique_filename = false;
    } else {
      options.folder = "flux/avatars";
    }

    const stream = cloudinary.uploader.upload_stream(
      options,
      (err, result) => {
        if (err) {
          console.error(">>> [cloudinary] avatar upload failed:", err.message);
          return reject(err);
        }
        console.log(">>> [cloudinary] avatar uploaded:", result.public_id);
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
        });
      }
    );

    stream.end(buffer);
  });
};
module.exports = {
  cloudinary,
  uploadBuffer,
  deleteFile,
  uploadAvatar,
  detectResourceType,
};