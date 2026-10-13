
import { Router } from "express";
import multer from "multer";
import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("Only PDF files are allowed"));
      return;
    }
    callback(null, true);
  },
});

router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Please select a PDF file",
        });
        return;
      }

      const result = await new Promise<{
        secure_url: string;
        public_id: string;
        bytes: number;
        original_filename?: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `brainscribe/syllabi/${req.user!.uid}`,
            resource_type: "raw",
            public_id: `${Date.now()}-${req.file!.originalname.replace(/\.pdf$/i, "")}`,
            access_mode: "authenticated",
          },
          (error, uploaded) => {
            if (error || !uploaded) {
              reject(error ?? new Error("Cloudinary upload failed"));
              return;
            }
            resolve(uploaded);
          }
        );

        Readable.from(req.file!.buffer).pipe(stream);
      });

      res.status(201).json({
        success: true,
        message: "Syllabus uploaded successfully",
        file: {
          name: req.file.originalname,
          url: result.secure_url,
          publicId: result.public_id,
          size: result.bytes,
        },
      });
    } catch (error) {
      console.error("Syllabus upload failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload syllabus",
      });
    }
  }
);

export default router;
