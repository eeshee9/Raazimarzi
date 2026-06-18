import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXT  = [".pdf", ".jpg", ".jpeg", ".png"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith("image/");
    return {
      folder:        "raazimarzi/support",
      resource_type: isImage ? "image" : "raw",
      public_id:     `support_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (ALLOWED_MIME.includes(mime) && ALLOWED_EXT.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: PDF, JPG, PNG. Max 5 MB."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

export default upload;
export { cloudinary };
