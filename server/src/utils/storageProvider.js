// NeevCloud S3-compatible object storage for case documents.
// Objects are private; access is via short-lived presigned URLs only.
//
// NOTE: env vars are read lazily (inside functions / getters), not at module
// top-level. server.js calls dotenv.config() in its own body, but ES module
// static imports (this file, via documentController.js) are fully evaluated
// *before* that body runs — so top-level `process.env.NEEV_*` reads here
// would capture `undefined` permanently.
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import crypto from "crypto";

// AWS SDK v3 requires region to be a valid hostname component (used in SigV4
// signing); NEEV_REGION is configured as a human-readable label ("Central India"),
// so it's normalized to a hostname-safe slug without changing its meaning.
const sanitizeRegion = (region) =>
  region ? region.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "auto";

let s3Client = null;
const getClient = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region:   sanitizeRegion(process.env.NEEV_REGION),
      endpoint: process.env.NEEV_ENDPOINT,
      credentials: {
        accessKeyId:     process.env.NEEV_ACCESS_KEY,
        secretAccessKey: process.env.NEEV_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
};

/* Uploads a multer memoryStorage file (file.buffer) to NeevCloud as a
   private object. Returns { key } — no permanent URL. */
export const uploadDocument = async (file, caseId, userId) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `cases/${caseId}/${userId}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;

  await getClient().send(new PutObjectCommand({
    Bucket:      process.env.NEEV_BUCKET,
    Key:         key,
    Body:        file.buffer,
    ContentType: file.mimetype,
  }));

  return { key };
};

export const deleteDocument = async (key) => {
  if (!key) return;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: process.env.NEEV_BUCKET, Key: key }));
  } catch (err) {
    console.warn(`⚠️ NeevCloud delete failed for ${key}:`, err.message);
  }
};

/* Generates a short-lived URL for viewing/downloading a private object. */
export const getPresignedUrl = async (key, expiresInSeconds = 300) => {
  const bucket = process.env.NEEV_BUCKET;
  if (!bucket || !key) throw new Error("Missing bucket or key");
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
};
