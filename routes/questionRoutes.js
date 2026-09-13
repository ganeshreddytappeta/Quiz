import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { Question } from "../models/Question.js";
import { questions as defaultQuestions } from "../questions.js";

const router = express.Router();
const QUESTIONS_FILE = path.join(process.cwd(), "data", "questions.json");

function getActiveQuestionsFallback() {
  try {
    if (fs.existsSync(QUESTIONS_FILE)) {
      const content = fs.readFileSync(QUESTIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q, idx) => ({
          questionNumber: q.id || idx + 1,
          question: q.question,
          options: q.options,
          timeLimit: q.timeLimit || 30,
          category: q.category || "General Knowledge"
        }));
      }
    }
  } catch (e) {
    console.error("Error reading data/questions.json in questionRoutes:", e);
  }

  return (defaultQuestions || []).map((q, idx) => ({
    questionNumber: q.id || idx + 1,
    question: q.question,
    options: q.options,
    timeLimit: 30,
    category: "General Knowledge"
  }));
}

// GET /api/questions - Public question list (WITHOUT correctAnswer for security)
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const questions = await Question.find(
        {},
        { questionNumber: 1, question: 1, options: 1, timeLimit: 1, category: 1, _id: 1 }
      ).sort({ questionNumber: 1 });

      return res.json({
        success: true,
        source: "mongodb",
        total: questions.length,
        questions
      });
    }

    const fallback = getActiveQuestionsFallback();

    return res.json({
      success: true,
      source: "file_sync",
      total: fallback.length,
      questions: fallback
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/questions/:questionNumber - Single question by number (WITHOUT correctAnswer)
router.get("/:questionNumber", async (req, res) => {
  try {
    const qNum = parseInt(req.params.questionNumber, 10);

    if (mongoose.connection.readyState === 1) {
      const question = await Question.findOne(
        { questionNumber: qNum },
        { questionNumber: 1, question: 1, options: 1, timeLimit: 1, category: 1, _id: 1 }
      );

      if (!question) {
        return res.status(404).json({ success: false, message: `Question #${qNum} not found.` });
      }

      return res.json({
        success: true,
        source: "mongodb",
        question
      });
    }

    const fallbackQuestions = getActiveQuestionsFallback();
    const fallbackQ = fallbackQuestions.find((q) => q.questionNumber === qNum);
    if (!fallbackQ) {
      return res.status(404).json({ success: false, message: `Question #${qNum} not found.` });
    }

    return res.json({
      success: true,
      source: "file_sync",
      question: fallbackQ
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
