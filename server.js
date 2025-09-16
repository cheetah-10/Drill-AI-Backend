//setver.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

import chatRoutes from "./routes/chatRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import path from "path";

dotenv.config();
// console.log("Loaded Key:", process.env.GEMINI_API_KEY);
// console.log("Gemini Key Loaded:", process.env.GEMINI_API_KEY ? "✅ Yes" : "❌ No");

const app = express();
app.use(cors());
app.use(bodyParser.json());


app.use("/chat", chatRoutes);
app.use("/upload", uploadRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
