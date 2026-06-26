import multer from "multer";

// 404 handler
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Bad-input upload errors are client errors, not server faults — map them
  // to 4xx instead of letting them fall through to the 500 default above.
  // (`err.statusCode` lets any other call site opt into this the same way,
  // e.g. middleware/documentUpload.js's file-type check.)
  if (err instanceof multer.MulterError) {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
