// backend/test-upload.js
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// "hello" as a buffer
const buffer = Buffer.from("hello", "utf8");

console.log("Uploading test.txt...");

const stream = cloudinary.uploader.upload_stream(
  {
    folder: "flux/test",
    resource_type: "auto",
    // transformation: "q_auto:good,f_auto",
  },
  (err, result) => {
    if (err) {
      console.error("\n❌ UPLOAD FAILED");
      console.error("  message:", err.message);
      console.error("  http_code:", err.http_code);
      console.error("  name:", err.name);
      process.exit(1);
    }
    console.log("\n✅ UPLOAD SUCCESS");
    console.log("  url:", result.secure_url);
    console.log("  public_id:", result.public_id);
    console.log("  resource_type:", result.resource_type);
    console.log("  bytes:", result.bytes);
  }
);

stream.end(buffer);