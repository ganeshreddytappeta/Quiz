import express from "express";
import mongoose from "mongoose";
import { Question } from "../models/Question.js";
import { questions as defaultQuestions } from "../questions.js";

const router = express.Router();

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

    // Fallback if MongoDB is not connected
    const fallback = (defaultQuestions || []).map((q, idx) => ({
      questionNumber: q.id || idx + 1,
      question: q.question,
      options: q.options,
      timeLimit: 30,
      category: "General Knowledge"
    }));

    return res.json({
      success: true,
      source: "memory_fallback",
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

    const fallbackQ = (defaultQuestions || []).find((q, idx) => (q.id || idx + 1) === qNum);
    if (!fallbackQ) {
      return res.status(404).json({ success: false, message: `Question #${qNum} not found.` });
    }

    return res.json({
      success: true,
      source: "memory_fallback",
      question: {
        questionNumber: qNum,
        question: fallbackQ.question,
        options: fallbackQ.options,
        timeLimit: 30,
        category: "General Knowledge"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
