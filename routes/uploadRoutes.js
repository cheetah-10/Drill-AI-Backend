// routes/uploadRoutes.js
import express from "express";
import { upload, handleUpload, getLastUploadedData } from "../controllers/uploadController.js";

const router = express.Router();

// POST /upload/single  (form-data, key="file")
router.post("/single", upload.single("file"), handleUpload);

// GET /upload/last  -> returns last uploaded file + parsed data + ai reply (if any)
router.get("/last", getLastUploadedData);

export default router;
