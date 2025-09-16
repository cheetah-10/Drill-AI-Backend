// controllers/uploadController.js
import multer from "multer";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// uploads folder
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// memory for last uploaded file & last AI reply
let lastUploadedFile = null;
let lastAiReply = null;

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    lastUploadedFile = filename;
    cb(null, filename);
  },
});

export const upload = multer({ storage });

// helper: read excel/csv -> json
const parseExcel = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  // read as buffer works for xlsx and csv
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
  return jsonData;
};

// helper: validate extension
const allowedExt = [".xlsx", ".xls", ".csv"];
const isAllowed = (filename) =>
  allowedExt.includes(path.extname(filename).toLowerCase());

// create Gemini client if key present
let genAIClient = null;
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  try {
    genAIClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAIClient.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Gemini client created ✅");
  } catch (err) {
    console.warn("Failed to init Gemini client:", err?.message || err);
  }
} else {
  console.log("No GEMINI_API_KEY found in env");
}

// main handler
export const handleUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // validate ext
    if (!isAllowed(req.file.originalname)) {
      // remove saved file
      try { fs.unlinkSync(path.join(uploadDir, req.file.filename)); } catch {}
      return res.status(400).json({ error: "Only .xlsx, .xls or .csv files allowed" });
    }

    const filePath = path.join(uploadDir, req.file.filename);

    // parse
    const data = parseExcel(filePath);

    // prepare small context for AI (first 20 rows)
    const sample = data.slice(0, 20);
    let aiReply = null;

    if (geminiModel) {
      // build prompt (customize as you like)
      const prompt = `You are an assistant specialized in well log data.
Please give a short, clear summary of the uploaded data (first ${sample.length} rows).
- mention number of rows,
- give min/max/avg for numeric columns DT and GR (if present),
- list unique rock types and counts,
- point out missing / suspicious values.
Return the answer as plain text. Data: ${JSON.stringify(sample)}`;

      // call Gemini (SDK expects contents array)
      try {
        const result = await geminiModel.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        });

        // result.response.text() returns the string
        const response = result.response;
        aiReply = response?.text ? response.text() : null;
      } catch (err) {
        console.error("❌ Gemini call failed:", err);
        aiReply = `Gemini call failed: ${err?.message || "unknown error"}`;
      }
    } else {
      aiReply = "No Gemini API key configured on server; AI skipped.";
    }

    // store last ai reply
    lastAiReply = aiReply;

    res.json({
      message: "File uploaded successfully 🚀",
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      data,
      aiReply,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "File upload failed" });
  }
};

// optional: route to get last uploaded file + data + ai reply
export const getLastUploadedData = (req, res) => {
  try {
    if (!lastUploadedFile) return res.status(404).json({ error: "No file uploaded yet" });
    const filePath = path.join(uploadDir, lastUploadedFile);
    const data = parseExcel(filePath);
    res.json({ filename: lastUploadedFile, data, aiReply: lastAiReply });
  } catch (err) {
    console.error("❌ Fetch last error:", err);
    res.status(500).json({ error: "Could not read file" });
  }
};
