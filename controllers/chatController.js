// controllers/chatController.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or gemini-pro
console.log("Gemini Key Loaded:", process.env.GEMINI_API_KEY ? "✅ Yes" : "❌ No");

export const handleChat = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // ✅ Gemini SDK v0.24.1 expects array of objects
   const result = await model.generateContent({
  contents: [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ],
});


    const response = result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("❌ Chat error:", error);
    res.status(500).json({ error: "Error generating response" });
  }
};
