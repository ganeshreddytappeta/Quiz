import express from "express";
import mongoose from "mongoose";
import { Quiz } from "../models/Quiz.js";
import { Result } from "../models/Result.js";
import { Answer } from "../models/Answer.js";

const router = express.Router();

// GET /api/quiz/current - Current active quiz session
router.get("/current", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const currentQuiz = await Quiz.findOne().sort({ createdAt: -1 });
      return res.json({
        success: true,
        source: "mongodb",
        quiz: currentQuiz || null
      });
    }

    const state = req.app.locals.quizState;
    if (state) {
      return res.json({
        success: true,
        source: "memory_live",
        quiz: {
          quizName: "Quiz Arena",
          status: state.state,
          currentQuestion: state.currentQuestionIndex + 1,
          totalQuestions: req.app.locals.activeQuestions ? req.app.locals.activeQuestions.length : 10,
          timerSecondsLeft: req.app.locals.timerSecondsLeft || 0
        }
      });
    }

    return res.json({
      success: true,
      source: "memory_fallback",
      quiz: {
        quizName: "Quiz Arena",
        status: "waiting",
        currentQuestion: 0,
        totalQuestions: 10
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quiz/results - Historical and latest results from MongoDB
router.get("/results", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { quizId } = req.query;
      const filter = quizId ? { quizId } : {};
      const results = await Result.find(filter).sort({ createdAt: -1, rank: 1 });
      return res.json({
        success: true,
        source: "mongodb",
        total: results.length,
        results
      });
    }

    const calcRankings = req.app.locals.calculateRankings;
    const liveResults = calcRankings ? calcRankings() : [];

    return res.json({
      success: true,
      source: "memory_live",
      total: liveResults.length,
      results: liveResults
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quiz/sessions - List of past quiz sessions
router.get("/sessions", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const sessions = await Quiz.find().sort({ createdAt: -1 }).limit(20);
      return res.json({
        success: true,
        source: "mongodb",
        sessions
      });
    }

    return res.json({
      success: true,
      source: "memory_fallback",
      sessions: []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quiz/answers - Retrieve answers for a quiz
router.get("/answers", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { quizId, questionNumber } = req.query;
      const query = {};
      if (quizId) query.quizId = quizId;
      if (questionNumber) query.questionNumber = parseInt(questionNumber, 10);

      const answers = await Answer.find(query).sort({ submittedAt: 1 });
      return res.json({
        success: true,
        source: "mongodb",
        total: answers.length,
        answers
      });
    }

    return res.json({
      success: true,
      source: "memory_fallback",
      total: 0,
      answers: []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
