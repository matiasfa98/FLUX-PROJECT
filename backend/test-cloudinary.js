// backend/test-cloudinary.js
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log("Testing Cloudinary...");
console.log("cloud_name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("api_key prefix:", process.env.CLOUDINARY_API_KEY?.slice(0, 6));

cloudinary.api.ping((err, result) => {
  if (err) {
    console.error("\n❌ FAILED");
    console.error("  message:", err.message);
    console.error("  http_code:", err.http_code);
    console.error("  name:", err.name);
    process.exit(1);
  }
  console.log("\n✅ SUCCESS");
  console.log("  status:", result.status);
});