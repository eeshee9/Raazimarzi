import multer from "multer";
import path from "path";

/* ── Allowed file types ── */
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"];

/* ── File Filter ── */
const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (ALLOWED_MIME_TYPES.includes(mime) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Invalid file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX. Got: ${ext}`
    );
    // Bad input, not a server fault — the global error handler reads this
    // to return 400 instead of defaulting to 500.
    err.statusCode = 400;
    cb(err, false);
  }
};

/* ── Multer Instance — buffers in memory, controller uploads to NeevCloud ── */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

export default upload;
