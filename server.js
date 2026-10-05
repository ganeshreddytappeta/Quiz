// server.ts
import express4 from "express";
import http from "http";
import path3 from "path";
import fs3 from "fs";
import { Server } from "socket.io";
import mongoose9 from "mongoose";
import dotenv from "dotenv";

// questions.js
var questions = [
  {
    id: 1,
    question: "If five machines can make five widgets in five minutes, how many minutes does it take 100 machines to make 100 widgets?",
    options: {
      A: "100 minutes",
      B: "20 minutes",
      C: "5 minutes",
      D: "1 minute"
    },
    correctAnswer: "C"
  },
  {
    id: 2,
    question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
    options: {
      A: "A globe",
      B: "A map",
      C: "A desert",
      D: "A painting"
    },
    correctAnswer: "B"
  },
  {
    id: 3,
    question: "If you overtake the person running in second place during a marathon, what position are you in now?",
    options: {
      A: "1st place",
      B: "2nd place",
      C: "3rd place",
      D: "Tied for 1st"
    },
    correctAnswer: "B"
  },
  {
    id: 4,
    question: "The more you take out of it, the bigger it gets. What is it?",
    options: {
      A: "A hole",
      B: "A balloon",
      C: "A sponge",
      D: "A cave"
    },
    correctAnswer: "A"
  },
  {
    id: 5,
    question: "Look at the number series: 2, 6, 12, 20, 30, ... What number should come next?",
    options: {
      A: "40",
      B: "42",
      C: "44",
      D: "46"
    },
    correctAnswer: "B"
  },
  {
    id: 6,
    question: "A farmer has 17 sheep, and all but 9 run away during a storm. How many sheep does the farmer have left?",
    options: {
      A: "8",
      B: "9",
      C: "0",
      D: "17"
    },
    correctAnswer: "B"
  },
  {
    id: 7,
    question: "Who is the only batsman in international cricket history to score 100 centuries across all formats?",
    options: {
      A: "Ricky Ponting",
      B: "Virat Kohli",
      C: "Sachin Tendulkar",
      D: "Brian Lara"
    },
    correctAnswer: "C"
  },
  {
    id: 8,
    question: "What is the maximum number of overs a single bowler can bowl in a standard 50-over Men's One Day International (ODI) match?",
    options: {
      A: "8 overs",
      B: "10 overs",
      C: "12 overs",
      D: "15 overs"
    },
    correctAnswer: "B"
  },
  {
    id: 9,
    question: "In standard association football (soccer), how long is a regular match played, excluding extra time and stoppage time?",
    options: {
      A: "60 minutes",
      B: "80 minutes",
      C: "90 minutes",
      D: "100 minutes"
    },
    correctAnswer: "C"
  },
  {
    id: 10,
    question: "In standard lawn tennis, what word is traditionally called out to announce a score of zero?",
    options: {
      A: "Nil",
      B: "Zero",
      C: "Love",
      D: "Blank"
    },
    correctAnswer: "C"
  },
  {
    id: 11,
    question: "What has hands and a face, but cannot hold anything or smile?",
    options: {
      A: "A clock",
      B: "A mirror",
      C: "A coin",
      D: "A statue"
    },
    correctAnswer: "A"
  },
  {
    id: 12,
    question: "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
    options: {
      A: "$0.10",
      B: "$0.05",
      C: "$0.01",
      D: "$0.15"
    },
    correctAnswer: "B"
  },
  {
    id: 13,
    question: "If yesterday was Tuesday, what day will it be three days after tomorrow?",
    options: {
      A: "Friday",
      B: "Saturday",
      C: "Sunday",
      D: "Monday"
    },
    correctAnswer: "C"
  },
  {
    id: 14,
    question: "Some months have 30 days, while others have 31 days. How many months have at least 28 days?",
    options: {
      A: "1 month",
      B: "4 months",
      C: "7 months",
      D: "All 12 months"
    },
    correctAnswer: "D"
  },
  {
    id: 15,
    question: "You enter a dark cabin with only one match. Inside there is an oil lamp, a candle, and a fireplace. What must you light first?",
    options: {
      A: "The candle",
      B: "The oil lamp",
      C: "The match",
      D: "The fireplace"
    },
    correctAnswer: "C"
  },
  {
    id: 16,
    question: "In C programming, which format specifier is used in printf() to print a standard integer value?",
    options: {
      A: "%c",
      B: "%d",
      C: "%f",
      D: "%s"
    },
    correctAnswer: "B"
  },
  {
    id: 17,
    question: "Which of the following built-in collection data types in Python is immutable?",
    options: {
      A: "List",
      B: "Dictionary",
      C: "Set",
      D: "Tuple"
    },
    correctAnswer: "D"
  },
  {
    id: 18,
    question: "Which keyword in Java is used by a class to inherit from a superclass?",
    options: {
      A: "implements",
      B: "inherits",
      C: "extends",
      D: "super"
    },
    correctAnswer: "C"
  },
  {
    id: 19,
    question: "Which data structure follows the First-In, First-Out (FIFO) principle?",
    options: {
      A: "Stack",
      B: "Queue",
      C: "Binary Search Tree",
      D: "Max Heap"
    },
    correctAnswer: "B"
  },
  {
    id: 20,
    question: "In Structured Query Language (SQL), which clause is used to filter records in a SELECT query?",
    options: {
      A: "ORDER BY",
      B: "GROUP BY",
      C: "WHERE",
      D: "HAVING"
    },
    correctAnswer: "C"
  },
  {
    id: 21,
    question: 'What is the output of the following C code snippet?\nint arr[] = {10, 20, 30, 40};\nint *p = arr;\nprintf("%d", *(p + 2));',
    options: {
      A: "10",
      B: "20",
      C: "30",
      D: "40"
    },
    correctAnswer: "C"
  },
  {
    id: 22,
    question: "What is the output of the following Python code snippet?\nnums = [10, 20, 30, 40, 50]\nprint(nums[1:4:2])",
    options: {
      A: "[20, 30, 40]",
      B: "[20, 40]",
      C: "[10, 30]",
      D: "[20, 50]"
    },
    correctAnswer: "B"
  },
  {
    id: 23,
    question: "In Java, what is it called when two or more methods in the same class have the same name but different parameter lists?",
    options: {
      A: "Method Overriding",
      B: "Method Overloading",
      C: "Dynamic Binding",
      D: "Encapsulation"
    },
    correctAnswer: "B"
  },
  {
    id: 24,
    question: "What is the worst-case time complexity of searching for an element in an unbalanced (skewed) Binary Search Tree with n nodes?",
    options: {
      A: "O(1)",
      B: "O(log n)",
      C: "O(n)",
      D: "O(n log n)"
    },
    correctAnswer: "C"
  },
  {
    id: 25,
    question: "Which normal form in relational database design is specifically defined to eliminate transitive functional dependencies?",
    options: {
      A: "First Normal Form (1NF)",
      B: "Second Normal Form (2NF)",
      C: "Third Normal Form (3NF)",
      D: "Boyce-Codd Normal Form (BCNF)"
    },
    correctAnswer: "C"
  },
  {
    id: 26,
    question: 'In C, what is the output of this code on standard systems?\nchar str[] = "Quiz";\nprintf("%zu %zu", sizeof(str), strlen(str));',
    options: {
      A: "4 4",
      B: "4 5",
      C: "5 4",
      D: "8 4"
    },
    correctAnswer: "C"
  },
  {
    id: 27,
    question: "What is the output of the following Python code?\ndef add_item(val, items=[]):\n    items.append(val)\n    return items\n\nprint(add_item(1), add_item(2))",
    options: {
      A: "[1] [2]",
      B: "[1] [1, 2]",
      C: "[1, 2] [1, 2]",
      D: "[2] [2]"
    },
    correctAnswer: "C"
  },
  {
    id: 28,
    question: 'What is the output of the following Java snippet?\nString s1 = "Hello";\nString s2 = new String("Hello");\nSystem.out.print((s1 == s2) + " " + s1.equals(s2));',
    options: {
      A: "true true",
      B: "false true",
      C: "true false",
      D: "false false"
    },
    correctAnswer: "B"
  },
  {
    id: 29,
    question: "What is the overall time complexity of building a Binary Heap from an unsorted array of n elements using the bottom-up heapify approach?",
    options: {
      A: "O(n)",
      B: "O(log n)",
      C: "O(n log n)",
      D: "O(n^2)"
    },
    correctAnswer: "A"
  },
  {
    id: 30,
    question: "In database transaction processing, which ACID property ensures that committed transactions survive system crashes or power failures?",
    options: {
      A: "Atomicity",
      B: "Consistency",
      C: "Isolation",
      D: "Durability"
    },
    correctAnswer: "D"
  }
];

// models/Team.js
import mongoose from "mongoose";
var teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  teamCode: {
    type: String,
    required: true,
    trim: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String,
    default: null
  },
  totalScore: {
    type: Number,
    default: 0
  },
  totalResponseTime: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
var Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

// models/Question.js
import mongoose2 from "mongoose";
var questionSchema = new mongoose2.Schema({
  questionNumber: {
    type: Number,
    required: true,
    unique: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true }
  },
  correctAnswer: {
    type: String,
    required: true,
    enum: ["A", "B", "C", "D"]
  },
  category: {
    type: String,
    default: "General Knowledge"
  },
  timeLimit: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
var Question = mongoose2.models.Question || mongoose2.model("Question", questionSchema);

// models/Quiz.js
import mongoose3 from "mongoose";
var quizSchema = new mongoose3.Schema({
  quizName: {
    type: String,
    default: "Quiz Arena"
  },
  status: {
    type: String,
    enum: ["waiting", "instructions", "running", "between_questions", "completed"],
    default: "waiting"
  },
  currentQuestion: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 10
  },
  questionStartTime: {
    type: Date,
    default: null
  },
  questionEndTime: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});
var Quiz = mongoose3.models.Quiz || mongoose3.model("Quiz", quizSchema);

// models/Answer.js
import mongoose4 from "mongoose";
var answerSchema = new mongoose4.Schema({
  quizId: {
    type: mongoose4.Schema.Types.ObjectId,
    ref: "Quiz",
    default: null
  },
  teamId: {
    type: mongoose4.Schema.Types.ObjectId,
    ref: "Team",
    default: null
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  selectedAnswer: {
    type: String,
    required: true,
    trim: true
  },
  correctAnswer: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  responseTime: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["answered", "timeout", "disconnected"],
    default: "answered"
  }
});
answerSchema.index({ quizId: 1, teamName: 1, questionNumber: 1 });
var Answer = mongoose4.models.Answer || mongoose4.model("Answer", answerSchema);

// models/Result.js
import mongoose5 from "mongoose";
var resultSchema = new mongoose5.Schema({
  quizId: {
    type: mongoose5.Schema.Types.ObjectId,
    ref: "Quiz",
    default: null
  },
  teamId: {
    type: mongoose5.Schema.Types.ObjectId,
    ref: "Team",
    default: null
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  correctAnswers: {
    type: Number,
    required: true,
    default: 0
  },
  totalResponseTime: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
resultSchema.index({ quizId: 1, rank: 1 });
var Result = mongoose5.models.Result || mongoose5.model("Result", resultSchema);

// routes/teamRoutes.js
import express from "express";
import mongoose6 from "mongoose";
import fs from "fs";
import path from "path";
var router = express.Router();
var TEAMS_FILE = path.join(process.cwd(), "data", "teams.json");
var DEFAULT_TEAMS_LIST = [
  { id: "t1", name: "MEDHA", code: "T1A7", teamName: "MEDHA", teamCode: "T1A7" },
  { id: "t2", name: "HACHNOVA", code: "T2B8", teamName: "HACHNOVA", teamCode: "T2B8" },
  { id: "t3", name: "TEAM NOVA", code: "T3C9", teamName: "TEAM NOVA", teamCode: "T3C9" },
  { id: "t4", name: "AGASTYA", code: "T4D1", teamName: "AGASTYA", teamCode: "T4D1" },
  { id: "t5", name: "APEX CREW", code: "T5E2", teamName: "APEX CREW", teamCode: "T5E2" },
  { id: "t6", name: "HIGH5", code: "T6F3", teamName: "HIGH5", teamCode: "T6F3" },
  { id: "t7", name: "CTRL FREAKS", code: "T7G4", teamName: "CTRL FREAKS", teamCode: "T7G4" },
  { id: "t8", name: "FIVE STARS", code: "T8H5", teamName: "FIVE STARS", teamCode: "T8H5" },
  { id: "t9", name: "CRAZY BIRDS", code: "T9I6", teamName: "CRAZY BIRDS", teamCode: "T9I6" },
  { id: "t10", name: "ANVESHANA", code: "T10J7", teamName: "ANVESHANA", teamCode: "T10J7" }
];
function getActiveTeamsFallback() {
  try {
    if (fs.existsSync(TEAMS_FILE)) {
      const content = fs.readFileSync(TEAMS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t, idx) => ({
          id: t.id || `t${idx + 1}`,
          name: t.name || t.teamName,
          code: t.code || t.teamCode,
          teamName: t.name || t.teamName,
          teamCode: t.code || t.teamCode,
          isConnected: false
        }));
      }
    }
  } catch (e) {
    console.error("Error reading data/teams.json in teamRoutes:", e);
  }
  return DEFAULT_TEAMS_LIST;
}
router.get("/", async (req, res) => {
  try {
    if (mongoose6.connection.readyState === 1) {
      const teams = await Team.find({}, { teamName: 1, teamCode: 1, isConnected: 1, totalScore: 1, totalResponseTime: 1, _id: 1 });
      return res.json({
        success: true,
        source: "mongodb",
        teams: teams.map((t) => ({
          id: t._id.toString(),
          name: t.teamName,
          code: t.teamCode,
          teamName: t.teamName,
          teamCode: t.teamCode,
          isConnected: t.isConnected
        }))
      });
    }
    const fallbackTeams = getActiveTeamsFallback();
    return res.json({
      success: true,
      source: "file_sync",
      teams: fallbackTeams
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get("/status", async (req, res) => {
  try {
    if (mongoose6.connection.readyState === 1) {
      let teams = await Team.find({}, { teamName: 1, isConnected: 1, totalScore: 1, totalResponseTime: 1, _id: 1 });
      return res.json({
        success: true,
        source: "mongodb",
        connectedCount: teams.filter((t) => t.isConnected).length,
        totalTeams: teams.length,
        teams
      });
    }
    const fallbackTeams = getActiveTeamsFallback();
    return res.json({
      success: true,
      source: "file_sync",
      connectedCount: fallbackTeams.filter((t) => t.isConnected).length,
      totalTeams: fallbackTeams.length,
      teams: fallbackTeams.map((t) => ({
        teamName: t.name,
        isConnected: t.isConnected,
        totalScore: 0,
        totalResponseTime: 0
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { teamName, teamCode } = req.body || {};
    const trimmedName = (teamName || "").trim();
    const trimmedCode = (teamCode || "").trim().toUpperCase();
    if (!trimmedCode) {
      return res.status(400).json({ success: false, message: "Team code is required." });
    }
    if (mongoose6.connection.readyState === 1) {
      const query = trimmedName ? { teamName: { $regex: new RegExp(`^${trimmedName}$`, "i") } } : { teamCode: trimmedCode };
      const team = await Team.findOne(query);
      if (!team) {
        return res.status(401).json({ success: false, message: "Invalid team credentials." });
      }
      if (team.teamCode.toUpperCase() !== trimmedCode) {
        return res.status(401).json({ success: false, message: "Invalid team code." });
      }
      team.isConnected = true;
      await team.save();
      return res.json({
        success: true,
        source: "mongodb",
        team: {
          id: team._id,
          teamName: team.teamName,
          totalScore: team.totalScore,
          totalResponseTime: team.totalResponseTime
        }
      });
    }
    const activeTeams2 = getActiveTeamsFallback();
    const match = activeTeams2.find((t) => {
      const codeMatches = (t.code || t.teamCode || "").trim().toUpperCase() === trimmedCode;
      if (!trimmedName) return codeMatches;
      const nameMatches = (t.name || t.teamName || "").trim().toLowerCase() === trimmedName.toLowerCase();
      return codeMatches && nameMatches;
    }) || activeTeams2.find((t) => (t.code || t.teamCode || "").trim().toUpperCase() === trimmedCode);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid team name or code." });
    }
    return res.json({
      success: true,
      source: "file_sync",
      team: {
        id: match.id,
        teamName: match.name || match.teamName,
        totalScore: 0,
        totalResponseTime: 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
var teamRoutes_default = router;

// routes/questionRoutes.js
import express2 from "express";
import mongoose7 from "mongoose";
import fs2 from "fs";
import path2 from "path";
var router2 = express2.Router();
var QUESTIONS_FILE = path2.join(process.cwd(), "data", "questions.json");
function getActiveQuestionsFallback() {
  try {
    if (fs2.existsSync(QUESTIONS_FILE)) {
      const content = fs2.readFileSync(QUESTIONS_FILE, "utf-8");
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
  return (questions || []).map((q, idx) => ({
    questionNumber: q.id || idx + 1,
    question: q.question,
    options: q.options,
    timeLimit: 30,
    category: "General Knowledge"
  }));
}
router2.get("/", async (req, res) => {
  try {
    if (mongoose7.connection.readyState === 1) {
      const questions2 = await Question.find(
        {},
        { questionNumber: 1, question: 1, options: 1, timeLimit: 1, category: 1, _id: 1 }
      ).sort({ questionNumber: 1 });
      return res.json({
        success: true,
        source: "mongodb",
        total: questions2.length,
        questions: questions2
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
router2.get("/:questionNumber", async (req, res) => {
  try {
    const qNum = parseInt(req.params.questionNumber, 10);
    if (mongoose7.connection.readyState === 1) {
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
var questionRoutes_default = router2;

// routes/quizRoutes.js
import express3 from "express";
import mongoose8 from "mongoose";
var router3 = express3.Router();
router3.get("/current", async (req, res) => {
  try {
    if (mongoose8.connection.readyState === 1) {
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
router3.get("/results", async (req, res) => {
  try {
    if (mongoose8.connection.readyState === 1) {
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
router3.get("/sessions", async (req, res) => {
  try {
    if (mongoose8.connection.readyState === 1) {
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
router3.get("/answers", async (req, res) => {
  try {
    if (mongoose8.connection.readyState === 1) {
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
var quizRoutes_default = router3;

// server.ts
var Team2 = Team;
var Question2 = Question;
var Quiz2 = Quiz;
var Answer2 = Answer;
var Result2 = Result;
dotenv.config();
var app = express4();
var server = http.createServer(app);
var io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 3e4,
  pingInterval: 1e4
});
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quiz_arena";
var ADMIN_USERNAME = "aikyam";
var ADMIN_PASSWORD = "aikyam2k26";
var activeAdminTokens = /* @__PURE__ */ new Set();
function isValidAdminPassword(pwd) {
  if (!pwd) return false;
  const trimmed = pwd.trim();
  return trimmed === "aikyam2k26" || trimmed === ADMIN_PASSWORD || process.env.ADMIN_PASSWORD && trimmed === process.env.ADMIN_PASSWORD.trim() || process.env.HOST_PASSWORD && trimmed === process.env.HOST_PASSWORD.trim();
}
var DATA_DIR = path3.join(process.cwd(), "data");
var QUESTIONS_FILE2 = path3.join(DATA_DIR, "questions.json");
function loadQuestions() {
  try {
    if (!fs3.existsSync(DATA_DIR)) {
      fs3.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs3.existsSync(QUESTIONS_FILE2)) {
      const content = fs3.readFileSync(QUESTIONS_FILE2, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading data/questions.json:", err);
  }
  const fallback = questions || [];
  saveQuestionsToFile(fallback);
  return fallback;
}
function saveQuestionsToFile(qs) {
  try {
    if (!fs3.existsSync(DATA_DIR)) {
      fs3.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs3.writeFileSync(QUESTIONS_FILE2, JSON.stringify(qs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving data/questions.json:", err);
  }
}
var activeQuestions = loadQuestions();
var TEAMS_FILE2 = path3.join(process.cwd(), "data", "teams.json");
var DEFAULT_TEAMS = [
  { id: "t1", name: "MEDHA", code: "T1A7" },
  { id: "t2", name: "HACHNOVA", code: "T2B8" },
  { id: "t3", name: "TEAM NOVA", code: "T3C9" },
  { id: "t4", name: "AGASTYA", code: "T4D1" },
  { id: "t5", name: "APEX CREW", code: "T5E2" },
  { id: "t6", name: "HIGH5", code: "T6F3" },
  { id: "t7", name: "CTRL FREAKS", code: "T7G4" },
  { id: "t8", name: "FIVE STARS", code: "T8H5" },
  { id: "t9", name: "CRAZY BIRDS", code: "T9I6" },
  { id: "t10", name: "ANVESHANA", code: "T10J7" }
];
function loadTeams() {
  try {
    if (fs3.existsSync(TEAMS_FILE2)) {
      const content = fs3.readFileSync(TEAMS_FILE2, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading data/teams.json:", err);
  }
  return DEFAULT_TEAMS;
}
function saveTeamsToFile(teams) {
  try {
    const dir = path3.dirname(TEAMS_FILE2);
    if (!fs3.existsSync(dir)) {
      fs3.mkdirSync(dir, { recursive: true });
    }
    fs3.writeFileSync(TEAMS_FILE2, JSON.stringify(teams, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving data/teams.json:", err);
  }
}
var activeTeams = loadTeams();
var activeQuizSessionId = null;
var quizState = {
  state: "idle",
  currentQuestionIndex: -1,
  isAnswerRevealed: false,
  teams: {}
};
function initTeams() {
  activeTeams.forEach((t) => {
    if (!quizState.teams[t.name]) {
      quizState.teams[t.name] = {
        teamName: t.name,
        teamCode: t.code,
        socketId: null,
        connected: false,
        score: 0,
        totalTime: 0,
        sessionToken: null,
        currentAnswer: null,
        currentAnswerTime: null,
        currentResult: "waiting",
        isFirstCorrect: false,
        history: []
      };
    } else {
      quizState.teams[t.name].teamCode = t.code;
    }
  });
  const validNames = new Set(activeTeams.map((t) => t.name));
  Object.keys(quizState.teams).forEach((name) => {
    if (!validNames.has(name)) {
      delete quizState.teams[name];
    }
  });
}
initTeams();
var isMongoConnected = false;
var mongoStatusMessage = "In-Memory Active";
mongoose9.set("bufferCommands", false);
function cleanMongoUri(rawUri) {
  let uri = (rawUri || "").trim();
  if (/<(db_)?password>/i.test(uri)) {
    return { uri, isPlaceholder: true };
  }
  uri = uri.replace(/:\/\/([^:]+):<?([^>@]+)>?@/, "://$1:$2@");
  return { uri, isPlaceholder: false };
}
async function connectToMongoDB() {
  if (!MONGODB_URI) {
    mongoStatusMessage = "In-Memory Active (No URI configured)";
    console.log("Database: No MONGODB_URI configured. Running with in-memory persistence.");
    return;
  }
  const { uri: cleanUri, isPlaceholder } = cleanMongoUri(MONGODB_URI);
  if (isPlaceholder) {
    mongoStatusMessage = "In-Memory Active (Placeholder <db_password> in MONGODB_URI)";
    console.log(
      "Database notice: MONGODB_URI contains '<db_password>' placeholder. The app is running with in-memory persistence. To connect MongoDB Atlas, update MONGODB_URI in Settings with your real database password and add 0.0.0.0/0 to Atlas Network Access."
    );
    return;
  }
  try {
    mongoose9.connection.on("connected", () => {
      isMongoConnected = true;
      mongoStatusMessage = "MongoDB Connected";
      console.log("MongoDB connected successfully to:", mongoose9.connection.name);
    });
    mongoose9.connection.on("disconnected", () => {
      isMongoConnected = false;
      mongoStatusMessage = "In-Memory Fallback Active";
      console.log("MongoDB disconnected. Operating in in-memory mode.");
    });
    mongoose9.connection.on("error", (err) => {
      isMongoConnected = false;
      mongoStatusMessage = `In-Memory Fallback (${err.message})`;
      console.log(`Database notice: ${err.message}. Operating in in-memory mode.`);
    });
    await mongoose9.connect(cleanUri, {
      dbName: "quiz_arena",
      serverSelectionTimeoutMS: 5e3
    });
    await syncMongoData();
  } catch (err) {
    isMongoConnected = false;
    mongoStatusMessage = "In-Memory Fallback Active";
    console.log(
      `Database notice: MongoDB unreachable (${err.message}). Seamlessly running with in-memory persistence fallback.`
    );
  }
}
async function syncMongoData() {
  if (!isMongoConnected) return;
  try {
    const activeNames = activeTeams.map((t) => t.name.trim().toLowerCase());
    const existingDbTeams = await Team2.find();
    for (const dt of existingDbTeams) {
      if (!activeNames.includes(dt.teamName.trim().toLowerCase())) {
        await Team2.deleteOne({ _id: dt._id });
      }
    }
    for (const t of activeTeams) {
      const existing = await Team2.findOne({ teamName: t.name });
      if (!existing) {
        await Team2.create({
          teamName: t.name,
          teamCode: t.code,
          isConnected: false,
          socketId: null,
          totalScore: 0,
          totalResponseTime: 0
        });
      } else if (existing.teamCode !== t.code) {
        existing.teamCode = t.code;
        await existing.save();
      }
    }
    const dbTeams = await Team2.find();
    if (dbTeams.length > 0) {
      activeTeams = dbTeams.map((dt, idx) => ({
        id: dt._id?.toString() || `t${idx + 1}`,
        name: dt.teamName,
        code: dt.teamCode
      }));
      initTeams();
    }
    const qCount = await Question2.countDocuments();
    if (qCount === 0) {
      for (const q of activeQuestions) {
        await Question2.create({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        });
      }
    } else {
      const dbQuestions = await Question2.find().sort({ questionNumber: 1 });
      if (dbQuestions.length > 0) {
        activeQuestions = dbQuestions.map((dq) => ({
          id: dq.questionNumber,
          question: dq.question,
          options: dq.options,
          correctAnswer: dq.correctAnswer,
          category: dq.category,
          timeLimit: dq.timeLimit
        }));
      }
    }
  } catch (err) {
    console.error("Error during MongoDB sync:", err.message);
  }
}
connectToMongoDB();
function calculateRankings() {
  const teamList = Object.values(quizState.teams);
  const sorted = teamList.slice().sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.totalTime !== b.totalTime) {
      return a.totalTime - b.totalTime;
    }
    return a.teamName.localeCompare(b.teamName);
  });
  const results = [];
  for (let index = 0; index < sorted.length; index++) {
    const team = sorted[index];
    let rank = index + 1;
    let isTied = false;
    if (index > 0) {
      const prev = sorted[index - 1];
      const prevScore = prev.score;
      const currScore = team.score;
      const prevTime = Number(prev.totalTime.toFixed(2));
      const currTime = Number(team.totalTime.toFixed(2));
      if (currScore === prevScore && Math.abs(currTime - prevTime) < 0.01) {
        rank = results[index - 1].rank;
        isTied = true;
        results[index - 1].isTied = true;
      }
    }
    results.push({
      rank,
      isTied,
      displayRank: `${rank}`,
      teamName: team.teamName,
      connected: team.connected,
      score: team.score,
      totalTime: Number(team.totalTime.toFixed(2)),
      currentAnswer: team.currentAnswer,
      hasAnswered: team.currentAnswer !== null,
      currentAnswerTime: team.currentAnswerTime,
      currentResult: team.currentResult,
      isFirstCorrect: team.isFirstCorrect
    });
  }
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const hasSameRank = results.some((other, oi) => oi !== i && other.rank === r.rank && other.score === r.score);
    if (hasSameRank) {
      r.isTied = true;
      r.displayRank = `T-${r.rank}`;
    }
  }
  return results;
}
function getHostState() {
  const currentQ = activeQuestions[quizState.currentQuestionIndex] || null;
  const connectedTeams = Object.values(quizState.teams).filter((t) => t.connected);
  const teamsList = Object.values(quizState.teams).map((t) => ({
    teamName: t.teamName,
    connected: t.connected,
    score: t.score,
    currentAnswer: t.currentAnswer,
    hasAnswered: t.currentAnswer !== null,
    currentResult: t.currentResult
  }));
  const answeredCount = teamsList.filter((t) => t.hasAnswered).length;
  const totalTeamsCount = teamsList.length;
  const allAnswered = totalTeamsCount > 0 && answeredCount === totalTeamsCount;
  const notAnsweredTeams = teamsList.filter((t) => !t.hasAnswered).map((t) => t.teamName);
  return {
    state: quizState.state,
    quizId: activeQuizSessionId,
    currentQuestionIndex: quizState.currentQuestionIndex,
    currentQuestionNumber: quizState.currentQuestionIndex + 1,
    totalQuestions: activeQuestions.length,
    isFinalQuestion: quizState.currentQuestionIndex === activeQuestions.length - 1,
    isAnswerRevealed: quizState.isAnswerRevealed,
    currentQuestion: currentQ ? {
      id: currentQ.id,
      question: currentQ.question,
      options: currentQ.options,
      correctAnswer: currentQ.correctAnswer
    } : null,
    answeredCount,
    totalTeamsCount,
    allAnswered,
    notAnsweredTeams,
    connectedCount: connectedTeams.length,
    totalTeams: activeTeams.length,
    databaseStatus: {
      connected: isMongoConnected,
      status: isMongoConnected ? "MongoDB Connected" : mongoStatusMessage
    },
    teams: teamsList,
    rankings: calculateRankings()
  };
}
function getTeamState(teamName) {
  const team = quizState.teams[teamName];
  const currentQ = activeQuestions[quizState.currentQuestionIndex] || null;
  const hasSubmitted = team ? team.currentAnswer !== null : false;
  return {
    state: quizState.state,
    teamName,
    connected: team?.connected || false,
    score: team?.score || 0,
    currentQuestionIndex: quizState.currentQuestionIndex,
    currentQuestionNumber: quizState.currentQuestionIndex + 1,
    totalQuestions: activeQuestions.length,
    isFinalQuestion: quizState.currentQuestionIndex === activeQuestions.length - 1,
    currentQuestion: currentQ ? {
      id: currentQ.id,
      question: currentQ.question,
      options: currentQ.options
    } : null,
    currentAnswer: team?.currentAnswer || null,
    hasSubmitted,
    isAnswerRevealed: quizState.isAnswerRevealed,
    currentResult: quizState.isAnswerRevealed ? team?.currentResult || "waiting" : "waiting",
    rankings: calculateRankings()
  };
}
function broadcastHostUpdate() {
  io.to("host-room").emit("host-update", getHostState());
}
function broadcastTeamsUpdate() {
  Object.keys(quizState.teams).forEach((teamName) => {
    const socketId = quizState.teams[teamName].socketId;
    if (socketId) {
      io.to(socketId).emit("team-update", getTeamState(teamName));
    }
  });
}
function broadcastAll() {
  broadcastHostUpdate();
  broadcastTeamsUpdate();
}
async function startQuiz() {
  quizState.state = "running";
  quizState.isAnswerRevealed = false;
  activeQuizSessionId = null;
  if (isMongoConnected) {
    try {
      const newQuiz = await Quiz2.create({
        quizName: "AIKYAM 2K26 | FUN&TECH",
        status: "running",
        currentQuestion: 1,
        totalQuestions: activeQuestions.length
      });
      activeQuizSessionId = newQuiz._id?.toString();
    } catch (e) {
      console.error("Failed to create Quiz in MongoDB:", e.message);
    }
  }
  await startQuestion(0);
}
var isTransitioningQuestion = false;
async function startQuestion(index) {
  if (index >= activeQuestions.length) {
    await finishQuiz();
    return;
  }
  quizState.state = "running";
  quizState.currentQuestionIndex = index;
  quizState.isAnswerRevealed = false;
  Object.values(quizState.teams).forEach((t) => {
    t.currentAnswer = null;
    t.currentResult = "waiting";
  });
  const currentQ = activeQuestions[index];
  if (isMongoConnected && activeQuizSessionId) {
    try {
      await Quiz2.findByIdAndUpdate(activeQuizSessionId, {
        status: "running",
        currentQuestion: index + 1
      });
    } catch (err) {
      console.error("Error updating Quiz status in MongoDB:", err.message);
    }
  }
  const hostPayload = {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: activeQuestions.length,
    question: currentQ.question,
    options: currentQ.options,
    correctAnswer: currentQ.correctAnswer,
    isFinalQuestion: index === activeQuestions.length - 1
  };
  const teamPayload = {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: activeQuestions.length,
    question: currentQ.question,
    options: currentQ.options,
    isFinalQuestion: index === activeQuestions.length - 1
  };
  io.to("host-room").emit("question-start", hostPayload);
  io.to("teams-room").emit("question-start", teamPayload);
  Object.values(quizState.teams).forEach((t) => {
    if (t.socketId) {
      io.to(t.socketId).emit("question-start", teamPayload);
    }
  });
  broadcastAll();
}
function revealAnswer() {
  if (quizState.state !== "running" || quizState.currentQuestionIndex < 0) return;
  const currentQ = activeQuestions[quizState.currentQuestionIndex];
  if (!currentQ) return;
  quizState.isAnswerRevealed = !quizState.isAnswerRevealed;
  io.emit("answer-revealed", {
    questionIndex: quizState.currentQuestionIndex,
    questionNumber: quizState.currentQuestionIndex + 1,
    correctAnswer: currentQ.correctAnswer,
    isRevealed: quizState.isAnswerRevealed,
    rankings: calculateRankings()
  });
  broadcastAll();
}
async function nextQuestion() {
  if (quizState.state !== "running") return;
  if (isTransitioningQuestion) {
    console.log("nextQuestion ignored: transition already in progress");
    return;
  }
  isTransitioningQuestion = true;
  try {
    const nextIndex = quizState.currentQuestionIndex + 1;
    if (nextIndex < activeQuestions.length) {
      await startQuestion(nextIndex);
    } else {
      await finishQuiz();
    }
  } finally {
    setTimeout(() => {
      isTransitioningQuestion = false;
    }, 400);
  }
}
async function finishQuiz() {
  quizState.state = "finished";
  quizState.isAnswerRevealed = true;
  const rankings = calculateRankings();
  const winner = rankings[0] || null;
  if (isMongoConnected) {
    try {
      if (activeQuizSessionId) {
        await Quiz2.findByIdAndUpdate(activeQuizSessionId, {
          status: "completed",
          completedAt: /* @__PURE__ */ new Date()
        });
      }
      for (const r of rankings) {
        await Result2.create({
          quizId: activeQuizSessionId || null,
          teamName: r.teamName,
          correctAnswers: r.score,
          totalResponseTime: 0,
          rank: r.rank,
          createdAt: /* @__PURE__ */ new Date()
        });
      }
      console.log(`Quiz results saved to MongoDB for session ${activeQuizSessionId || "default"}.`);
    } catch (err) {
      console.error("Error saving quiz results to MongoDB:", err.message);
    }
  }
  io.emit("quiz-finished", {
    scoreboard: rankings,
    winner,
    totalQuestions: activeQuestions.length
  });
  broadcastAll();
}
async function resetQuiz() {
  quizState.state = "idle";
  quizState.currentQuestionIndex = -1;
  quizState.isAnswerRevealed = false;
  activeQuizSessionId = null;
  Object.values(quizState.teams).forEach((t) => {
    t.score = 0;
    t.currentAnswer = null;
    t.currentResult = "waiting";
    t.history = [];
  });
  if (isMongoConnected) {
    try {
      await Team2.updateMany({}, { totalScore: 0, totalResponseTime: 0 });
    } catch (err) {
      console.error("Error resetting teams in MongoDB:", err.message);
    }
  }
  io.emit("quiz-reset", {
    message: "The quiz has been reset by the host."
  });
  broadcastAll();
}
function findTeamByCredentials(inputName, inputCode) {
  const trimmedName = (inputName || "").trim();
  const trimmedCode = (inputCode || "").trim().toUpperCase();
  if (!trimmedName || !trimmedCode) return null;
  let target = activeTeams.find(
    (t) => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (!target) {
    const defaultMatch = DEFAULT_TEAMS.find(
      (dt) => dt.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (defaultMatch) {
      target = activeTeams.find((t) => t.id === defaultMatch.id);
    }
  }
  if (!target) {
    target = activeTeams.find((t) => t.id.toLowerCase() === trimmedName.toLowerCase());
  }
  if (!target) return null;
  const defaultSlot = DEFAULT_TEAMS.find((dt) => dt.id === target?.id);
  const validCodes = [
    target.code.trim().toUpperCase(),
    target.name.trim().toUpperCase(),
    target.name.replace(/\s+/g, "").toUpperCase()
  ];
  if (defaultSlot) {
    validCodes.push(defaultSlot.code.trim().toUpperCase());
  }
  const normalizedInput = trimmedCode.replace(/\s+/g, "");
  const codeMatches = validCodes.some((vc) => {
    return vc === trimmedCode || vc.replace(/\s+/g, "") === normalizedInput;
  });
  if (!codeMatches) return null;
  return {
    team: target,
    canonicalName: target.name
  };
}
io.on("connection", (socket) => {
  socket.on("admin-auth", (data) => {
    const { token, username, password } = data || {};
    let authenticated = false;
    const trimmedPassword = (password || "").trim();
    const trimmedUsername = (username || "").trim().toLowerCase();
    const isPassValid = isValidAdminPassword(trimmedPassword);
    const isUserValid = !trimmedUsername || trimmedUsername === "aikyam" || trimmedUsername === "admin" || trimmedUsername === ADMIN_USERNAME.toLowerCase();
    if (token && activeAdminTokens.has(token)) {
      authenticated = true;
    } else if (isPassValid && isUserValid) {
      const newToken = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      activeAdminTokens.add(newToken);
      authenticated = true;
      socket.emit("admin-login-token", { token: newToken });
    }
    if (authenticated) {
      socket.data.isAdmin = true;
      socket.join("host-room");
      socket.emit("admin-auth-success", {
        authenticated: true,
        username: ADMIN_USERNAME,
        state: getHostState(),
        questions: activeQuestions,
        teams: activeTeams
      });
      socket.emit("host-init", getHostState());
    } else {
      socket.emit("admin-auth-failed", {
        authenticated: false,
        message: "Invalid admin credentials. Please try again."
      });
    }
  });
  socket.on("host-connect", (data) => {
    const token = data?.token;
    if (token && activeAdminTokens.has(token)) {
      socket.data.isAdmin = true;
      socket.join("host-room");
      socket.emit("host-init", getHostState());
    } else {
      socket.emit("admin-auth-required", {
        message: "Admin authentication is required to access the host control room."
      });
    }
  });
  socket.on("host-start", () => {
    if (socket.data.isAdmin && (quizState.state === "idle" || quizState.state === "finished")) {
      startQuiz();
    }
  });
  socket.on("host-reset", () => {
    if (socket.data.isAdmin) {
      resetQuiz();
    }
  });
  socket.on("host-end", () => {
    if (socket.data.isAdmin) {
      finishQuiz();
    }
  });
  socket.on("admin-logout", (data) => {
    const token = data?.token;
    if (token) {
      activeAdminTokens.delete(token);
    }
    socket.data.isAdmin = false;
    socket.leave("host-room");
    socket.emit("admin-logged-out", { success: true });
  });
  socket.on("team-login", async (data) => {
    const { teamName, teamCode } = data || {};
    const trimmedName = (teamName || "").trim();
    const rawCode = (teamCode || "").trim();
    const isTeamAdmin = trimmedName.toLowerCase() === "aikyam" || trimmedName.toLowerCase() === "admin" || trimmedName.toLowerCase() === ADMIN_USERNAME.toLowerCase();
    const isPasswordAdmin = isValidAdminPassword(rawCode) || rawCode === "aikyam2k26";
    if (isTeamAdmin && isPasswordAdmin) {
      const adminToken = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      activeAdminTokens.add(adminToken);
      socket.data.isAdmin = true;
      socket.join("host-room");
      socket.emit("login-response", {
        success: true,
        isAdmin: true,
        adminToken,
        token: adminToken,
        redirect: "/admin.html",
        redirectUrl: "/admin.html",
        message: "Admin credentials authenticated. Redirecting to admin portal..."
      });
      return;
    }
    const match = findTeamByCredentials(trimmedName, rawCode);
    if (!match) {
      socket.emit("team-login-failed", { message: "Invalid team name or code" });
      socket.emit("login-response", {
        success: false,
        errorType: "invalid_credentials",
        message: "The team name or code is incorrect. Please try again."
      });
      return;
    }
    const canonicalName = match.canonicalName;
    if (!quizState.teams[canonicalName]) {
      quizState.teams[canonicalName] = {
        teamName: canonicalName,
        teamCode: match.team.code,
        socketId: null,
        connected: false,
        score: 0,
        totalTime: 0,
        sessionToken: null,
        currentAnswer: null,
        currentAnswerTime: null,
        currentResult: "waiting",
        isFirstCorrect: false,
        history: []
      };
    }
    const team = quizState.teams[canonicalName];
    const existingSocket = team.socketId ? io.sockets.sockets.get(team.socketId) : null;
    const isSocketAlive = Boolean(existingSocket && existingSocket.connected && existingSocket.id !== socket.id);
    const incomingToken = data?.sessionToken;
    const isSameSession = Boolean(team.sessionToken && incomingToken && team.sessionToken === incomingToken);
    if ((team.connected || isSocketAlive || team.sessionToken) && !isSameSession && team.socketId !== socket.id) {
      socket.emit("team-login-failed", {
        message: `Team "${canonicalName}" is already logged in on another device. Only 1 device per team is allowed.`
      });
      socket.emit("login-response", {
        success: false,
        errorType: "already_logged_in",
        message: `Team "${canonicalName}" is already logged in on another mobile/device. Only 1 login per team is permitted. If your original device was disconnected or lost, ask the quiz host to unlock your team session.`
      });
      return;
    }
    const sessionToken = team.sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    team.socketId = socket.id;
    team.connected = true;
    team.sessionToken = sessionToken;
    socket.join("teams-room");
    socket.data.teamName = canonicalName;
    if (isMongoConnected) {
      Team2.findOneAndUpdate(
        { teamName: canonicalName },
        { isConnected: true, socketId: socket.id }
      ).catch(() => {
      });
    }
    socket.emit("team-login-success", { teamName: canonicalName, sessionToken });
    socket.emit("login-response", {
      success: true,
      teamName: canonicalName,
      sessionToken,
      quizState: quizState.state,
      stateData: getTeamState(canonicalName)
    });
    io.emit("team-joined", {
      teamName: canonicalName,
      connectedCount: Object.values(quizState.teams).filter((t) => t.connected).length
    });
    broadcastAll();
  });
  socket.on("team-reconnect", (data) => {
    const { teamName, sessionToken } = data || {};
    if (!teamName) {
      socket.emit("reconnect-response", { success: false, message: "Team name required." });
      return;
    }
    const teamRecord = quizState.teams[teamName] || Object.values(quizState.teams).find((t) => t.teamName.toLowerCase() === teamName.trim().toLowerCase());
    if (teamRecord) {
      const actualName = teamRecord.teamName;
      if (teamRecord.sessionToken && sessionToken && teamRecord.sessionToken !== sessionToken) {
        socket.emit("reconnect-response", {
          success: false,
          errorType: "already_logged_in",
          message: `Team "${actualName}" is registered to another device. Only 1 device per team is allowed.`
        });
        return;
      }
      teamRecord.socketId = socket.id;
      teamRecord.connected = true;
      if (!teamRecord.sessionToken) teamRecord.sessionToken = sessionToken;
      socket.join("teams-room");
      socket.data.teamName = actualName;
      if (isMongoConnected) {
        Team2.findOneAndUpdate({ teamName: actualName }, { isConnected: true, socketId: socket.id }).catch(() => {
        });
      }
      const hasSubmitted = teamRecord.currentAnswer !== null;
      socket.emit("reconnect-response", {
        success: true,
        teamName: actualName,
        sessionToken: teamRecord.sessionToken,
        hasSubmitted,
        selectedAnswer: teamRecord.currentAnswer,
        stateData: getTeamState(actualName)
      });
      broadcastAll();
    } else {
      socket.emit("reconnect-response", {
        success: false,
        message: "Session expired or invalid. Please log in again."
      });
    }
  });
  socket.on("submit-answer", async (data) => {
    const teamName = socket.data.teamName;
    if (!teamName) {
      socket.emit("answer-rejected", { message: "You are not logged in as a team." });
      return;
    }
    const team = quizState.teams[teamName];
    if (!team) {
      socket.emit("answer-rejected", { message: "Team record not found." });
      return;
    }
    if (quizState.state !== "running" || quizState.currentQuestionIndex < 0) {
      socket.emit("answer-rejected", {
        message: "No question is currently active."
      });
      return;
    }
    if (team.currentAnswer !== null) {
      socket.emit("answer-rejected", {
        message: "Answer already submitted for this question."
      });
      return;
    }
    const currentQ = activeQuestions[quizState.currentQuestionIndex];
    if (!currentQ) return;
    const rawChoice = data.answer || data.selectedAnswer || "";
    const selectedOption = rawChoice.toUpperCase();
    if (!["A", "B", "C", "D"].includes(selectedOption)) {
      socket.emit("answer-rejected", {
        message: "Invalid option selected. Please choose A, B, C, or D."
      });
      return;
    }
    const isCorrect = selectedOption === currentQ.correctAnswer;
    team.currentAnswer = selectedOption;
    team.currentResult = isCorrect ? "correct" : "wrong";
    if (isCorrect) {
      team.score += 1;
    }
    team.history.push({
      questionIndex: quizState.currentQuestionIndex,
      answer: selectedOption,
      result: isCorrect ? "correct" : "wrong"
    });
    if (isMongoConnected) {
      try {
        await Answer2.create({
          quizId: activeQuizSessionId || null,
          teamName,
          questionNumber: quizState.currentQuestionIndex + 1,
          selectedAnswer: selectedOption,
          correctAnswer: currentQ.correctAnswer,
          isCorrect,
          responseTime: 0,
          submittedAt: /* @__PURE__ */ new Date(),
          status: "answered"
        });
        await Team2.findOneAndUpdate(
          { teamName },
          {
            $inc: {
              totalScore: isCorrect ? 1 : 0
            }
          }
        );
      } catch (e) {
        console.error("Failed saving Answer to MongoDB:", e.message);
      }
    }
    socket.emit("answer-received", {
      success: true,
      selectedAnswer: selectedOption,
      status: "Answer Submitted!",
      message: "Answer Submitted! Please wait for the admin to move to the next question."
    });
    socket.emit("answer-submitted", {
      success: true,
      selectedAnswer: selectedOption,
      status: "Answer Submitted!",
      message: "Answer Submitted! Please wait for the admin to move to the next question."
    });
    const currentTeamsList = Object.values(quizState.teams);
    const answeredCount = currentTeamsList.filter((t) => t.currentAnswer !== null).length;
    const totalCount = currentTeamsList.length;
    const allAnswered = totalCount > 0 && answeredCount === totalCount;
    const notAnsweredTeams = currentTeamsList.filter((t) => t.currentAnswer === null).map((t) => t.teamName);
    io.to("host-room").emit("team-status-update", {
      teamName,
      selectedAnswer: selectedOption,
      status: "Answered",
      answeredCount,
      totalTeams: totalCount,
      allAnswered,
      notAnsweredTeams,
      isCorrect,
      score: team.score
    });
    io.to("host-room").emit("live-answer-update", {
      teamName,
      answer: selectedOption,
      result: team.currentResult,
      score: team.score,
      answeredCount,
      totalTeams: totalCount,
      allAnswered,
      notAnsweredTeams
    });
    broadcastHostUpdate();
    socket.emit("team-update", getTeamState(teamName));
  });
  socket.on("team-logout", async () => {
    const teamName = socket.data.teamName;
    if (teamName && quizState.teams[teamName]) {
      quizState.teams[teamName].connected = false;
      quizState.teams[teamName].socketId = null;
      quizState.teams[teamName].sessionToken = null;
      socket.leave("teams-room");
      delete socket.data.teamName;
      if (isMongoConnected) {
        Team2.findOneAndUpdate({ teamName }, { isConnected: false, socketId: null }).catch(() => {
        });
      }
      io.emit("team-left", { teamName });
      broadcastAll();
    }
  });
  socket.on("quiz-start", () => {
    if (!socket.data.isAdmin) {
      socket.emit("admin-auth-required", { message: "Admin authentication required to start quiz." });
      return;
    }
    if (quizState.state === "idle" || quizState.state === "finished") {
      startQuiz();
    }
  });
  socket.on("admin-start-quiz", () => {
    if (!socket.data.isAdmin) return;
    if (quizState.state === "idle" || quizState.state === "finished") {
      startQuiz();
    }
  });
  socket.on("host-start", () => {
    if (!socket.data.isAdmin) return;
    if (quizState.state === "idle" || quizState.state === "finished") {
      startQuiz();
    }
  });
  socket.on("reveal-answer", () => {
    if (!socket.data.isAdmin) return;
    revealAnswer();
  });
  socket.on("admin-reveal-answer", () => {
    if (!socket.data.isAdmin) return;
    revealAnswer();
  });
  socket.on("next-question", async (data) => {
    const token = data?.token;
    if (token && activeAdminTokens.has(token)) {
      socket.data.isAdmin = true;
    }
    if (!socket.data.isAdmin) {
      socket.emit("admin-auth-required", { message: "Admin authentication required." });
      return;
    }
    if (quizState.state === "running") {
      await nextQuestion();
    }
  });
  socket.on("admin-next-question", async (data) => {
    const token = data?.token;
    if (token && activeAdminTokens.has(token)) {
      socket.data.isAdmin = true;
    }
    if (!socket.data.isAdmin) return;
    if (quizState.state === "running") {
      await nextQuestion();
    }
  });
  socket.on("end-quiz", () => {
    if (!socket.data.isAdmin) return;
    finishQuiz();
  });
  socket.on("finish-quiz", () => {
    if (!socket.data.isAdmin) return;
    finishQuiz();
  });
  socket.on("admin-finish-quiz", () => {
    if (!socket.data.isAdmin) return;
    finishQuiz();
  });
  socket.on("host-end", () => {
    if (!socket.data.isAdmin) return;
    finishQuiz();
  });
  socket.on("reset-quiz", () => {
    if (!socket.data.isAdmin) return;
    resetQuiz();
  });
  socket.on("host-reset", () => {
    if (!socket.data.isAdmin) return;
    resetQuiz();
  });
  socket.on("disconnect", () => {
    const teamName = socket.data.teamName;
    if (teamName && quizState.teams[teamName]) {
      quizState.teams[teamName].connected = false;
      quizState.teams[teamName].socketId = null;
      if (isMongoConnected) {
        Team2.findOneAndUpdate({ teamName }, { isConnected: false, socketId: null }).catch(() => {
        });
      }
      io.emit("team-disconnect", { teamName });
      broadcastHostUpdate();
    }
  });
});
app.use(express4.json());
app.use("/api/teams", teamRoutes_default);
app.use("/api/questions", questionRoutes_default);
app.use("/api/quiz", quizRoutes_default);
app.get("/api/db/status", (req, res) => {
  const { isPlaceholder } = cleanMongoUri(MONGODB_URI);
  res.json({
    success: true,
    connected: isMongoConnected,
    readyState: mongoose9.connection.readyState,
    status: isMongoConnected ? "Connected" : mongoStatusMessage,
    database: isMongoConnected ? mongoose9.connection.name || "quiz_arena" : "quiz_arena",
    hasPlaceholder: isPlaceholder,
    hint: isPlaceholder ? "Replace <db_password> in your MONGODB_URI environment variable with your actual database user password, and whitelist 0.0.0.0/0 in MongoDB Atlas Network Access." : isMongoConnected ? "MongoDB Atlas connected and ready." : "Operating in resilient in-memory mode. For MongoDB Atlas, ensure 0.0.0.0/0 is whitelisted in Atlas Network Access."
  });
});
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = bearerToken || req.headers["x-admin-token"] || req.query.token;
  if (token && activeAdminTokens.has(token)) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Unauthorized: Admin login is required to perform this action."
  });
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const trimmedPassword = (password || "").trim();
  const trimmedUsername = (username || "").trim().toLowerCase();
  const isPassValid = isValidAdminPassword(trimmedPassword);
  const isUserValid = !trimmedUsername || trimmedUsername === "aikyam" || trimmedUsername === "admin" || trimmedUsername === ADMIN_USERNAME.toLowerCase();
  if (isPassValid && isUserValid) {
    const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    activeAdminTokens.add(token);
    return res.json({
      success: true,
      token,
      username: ADMIN_USERNAME,
      message: "Admin authentication successful."
    });
  }
  return res.status(401).json({
    success: false,
    message: "Invalid admin credentials. Please try again."
  });
});
app.post("/api/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = req.body?.token || bearerToken || req.headers["x-admin-token"];
  if (token && activeAdminTokens.has(token)) {
    return res.json({ valid: true, username: ADMIN_USERNAME });
  }
  return res.json({ valid: false });
});
app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = req.body?.token || bearerToken || req.headers["x-admin-token"];
  if (token) {
    activeAdminTokens.delete(token);
  }
  res.json({ success: true, message: "Admin logged out successfully." });
});
app.post("/api/admin/quiz/start", requireAdminAuth, async (req, res) => {
  if (quizState.state === "idle" || quizState.state === "finished") {
    await startQuiz();
    return res.json({ success: true, message: "Quiz started at Question 1.", state: getHostState() });
  }
  res.json({ success: true, message: "Quiz already in progress.", state: getHostState() });
});
app.post("/api/admin/quiz/reveal", requireAdminAuth, (req, res) => {
  if (quizState.state === "running") {
    revealAnswer();
    return res.json({
      success: true,
      isAnswerRevealed: quizState.isAnswerRevealed,
      message: quizState.isAnswerRevealed ? "Answer revealed to teams." : "Answer hidden.",
      state: getHostState()
    });
  }
  res.status(400).json({ success: false, message: "Quiz is not currently running." });
});
app.post("/api/admin/quiz/next", requireAdminAuth, async (req, res) => {
  if (quizState.state === "running") {
    await nextQuestion();
    return res.json({
      success: true,
      message: `Question advanced to Question ${quizState.currentQuestionIndex + 1} of ${activeQuestions.length}.`,
      state: getHostState()
    });
  }
  res.status(400).json({ success: false, message: `Cannot advance next question from '${quizState.state}' state.` });
});
app.post("/api/admin/quiz/finish", requireAdminAuth, async (req, res) => {
  await finishQuiz();
  res.json({ success: true, message: "Quiz ended and scoreboard finalized.", state: getHostState() });
});
app.post("/api/admin/quiz/end", requireAdminAuth, async (req, res) => {
  await finishQuiz();
  res.json({ success: true, message: "Quiz ended and scoreboard finalized.", state: getHostState() });
});
app.post("/api/admin/quiz/reset", requireAdminAuth, async (req, res) => {
  await resetQuiz();
  res.json({ success: true, message: "Quiz reset to lobby successfully.", state: getHostState() });
});
app.get("/api/admin/questions", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    total: activeQuestions.length,
    questions: activeQuestions
  });
});
app.post("/api/admin/questions", requireAdminAuth, async (req, res) => {
  const { question, options, correctAnswer } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ success: false, message: "Question text is required." });
  }
  if (!options || !options.A || !options.B || !options.C || !options.D || !options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()) {
    return res.status(400).json({
      success: false,
      message: "All 4 options (A, B, C, D) must have non-empty text."
    });
  }
  const validAns = (correctAnswer || "").toUpperCase();
  if (!["A", "B", "C", "D"].includes(validAns)) {
    return res.status(400).json({
      success: false,
      message: "Correct answer must be one of: A, B, C, or D."
    });
  }
  const nextId = activeQuestions.length > 0 ? Math.max(...activeQuestions.map((q) => q.id)) + 1 : 1;
  const newQuestion = {
    id: nextId,
    question: question.trim(),
    options: {
      A: options.A.trim(),
      B: options.B.trim(),
      C: options.C.trim(),
      D: options.D.trim()
    },
    correctAnswer: validAns
  };
  activeQuestions.push(newQuestion);
  saveQuestionsToFile(activeQuestions);
  if (isMongoConnected) {
    Question2.create({
      questionNumber: newQuestion.id,
      question: newQuestion.question,
      options: newQuestion.options,
      correctAnswer: newQuestion.correctAnswer,
      category: "General Knowledge",
      timeLimit: 30
    }).catch(() => {
    });
  }
  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });
  res.json({
    success: true,
    message: "Question added successfully.",
    question: newQuestion,
    totalQuestions: activeQuestions.length
  });
});
app.post("/api/admin/questions/reorder", requireAdminAuth, async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "Array of question IDs is required." });
  }
  const idMap = new Map(activeQuestions.map((q) => [q.id, q]));
  const reordered = [];
  for (const rawId of ids) {
    const numId = Number(rawId);
    const q = idMap.get(numId);
    if (q) reordered.push(q);
  }
  for (const q of activeQuestions) {
    if (!ids.map(Number).includes(q.id)) {
      reordered.push(q);
    }
  }
  reordered.forEach((q, idx) => {
    q.id = idx + 1;
  });
  activeQuestions = reordered;
  saveQuestionsToFile(activeQuestions);
  if (isMongoConnected) {
    try {
      await Question2.deleteMany({});
      await Question2.insertMany(
        activeQuestions.map((q) => ({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        }))
      );
    } catch (e) {
      console.error("Error updating MongoDB after reorder:", e?.message);
    }
  }
  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });
  res.json({
    success: true,
    message: "Questions reordered successfully.",
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });
});
app.put("/api/admin/questions/:id", requireAdminAuth, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const qIndex = activeQuestions.findIndex((q) => q.id === targetId);
  if (qIndex === -1) {
    return res.status(404).json({ success: false, message: `Question #${targetId} not found.` });
  }
  const { question, options, correctAnswer } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ success: false, message: "Question text is required." });
  }
  if (!options || !options.A || !options.B || !options.C || !options.D || !options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()) {
    return res.status(400).json({ success: false, message: "All 4 options (A, B, C, D) must have non-empty text." });
  }
  const validAns = (correctAnswer || "").toUpperCase();
  if (!["A", "B", "C", "D"].includes(validAns)) {
    return res.status(400).json({ success: false, message: "Correct answer must be one of: A, B, C, or D." });
  }
  activeQuestions[qIndex] = {
    ...activeQuestions[qIndex],
    question: question.trim(),
    options: {
      A: options.A.trim(),
      B: options.B.trim(),
      C: options.C.trim(),
      D: options.D.trim()
    },
    correctAnswer: validAns
  };
  saveQuestionsToFile(activeQuestions);
  if (isMongoConnected) {
    try {
      await Question2.findOneAndUpdate(
        { questionNumber: targetId },
        {
          question: activeQuestions[qIndex].question,
          options: activeQuestions[qIndex].options,
          correctAnswer: activeQuestions[qIndex].correctAnswer
        }
      );
    } catch (e) {
      console.error("Error updating question in MongoDB:", e?.message);
    }
  }
  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });
  res.json({
    success: true,
    message: "Question updated successfully.",
    question: activeQuestions[qIndex]
  });
});
app.delete("/api/admin/questions/:id", requireAdminAuth, async (req, res) => {
  if (activeQuestions.length <= 1) {
    return res.status(400).json({
      success: false,
      message: "The quiz must have at least 1 question. Cannot delete the only question."
    });
  }
  const targetId = parseInt(req.params.id, 10);
  const exists = activeQuestions.some((q) => q.id === targetId);
  if (!exists) {
    return res.status(404).json({ success: false, message: `Question #${targetId} not found.` });
  }
  activeQuestions = activeQuestions.filter((q) => q.id !== targetId);
  activeQuestions.forEach((q, idx) => {
    q.id = idx + 1;
  });
  saveQuestionsToFile(activeQuestions);
  if (isMongoConnected) {
    try {
      await Question2.deleteMany({});
      await Question2.insertMany(
        activeQuestions.map((q) => ({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        }))
      );
    } catch (e) {
      console.error("Error deleting question in MongoDB:", e?.message);
    }
  }
  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });
  res.json({
    success: true,
    message: "Question deleted successfully.",
    totalQuestions: activeQuestions.length
  });
});
app.post("/api/admin/questions/reset", requireAdminAuth, async (req, res) => {
  activeQuestions = questions.map((q, idx) => ({
    id: idx + 1,
    question: q.question,
    options: { ...q.options },
    correctAnswer: q.correctAnswer,
    category: q.category || "General Knowledge",
    timeLimit: q.timeLimit || 30
  }));
  saveQuestionsToFile(activeQuestions);
  if (isMongoConnected) {
    try {
      await Question2.deleteMany({});
      await Question2.insertMany(
        activeQuestions.map((q) => ({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        }))
      );
    } catch (e) {
      console.error("Error resetting questions in MongoDB:", e?.message);
    }
  }
  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });
  res.json({
    success: true,
    message: "Questions restored to default set.",
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });
});
app.get("/api/admin/teams", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    total: activeTeams.length,
    teams: activeTeams
  });
});
app.post("/api/admin/teams", requireAdminAuth, async (req, res) => {
  const { name, code } = req.body || {};
  const trimmedName = (name || "").trim();
  const trimmedCode = (code || "").trim().toUpperCase();
  if (!trimmedName || !trimmedCode) {
    return res.status(400).json({ success: false, message: "Team name and code are required." });
  }
  const dupName = activeTeams.find((t) => t.name.toLowerCase() === trimmedName.toLowerCase());
  if (dupName) {
    return res.status(400).json({ success: false, message: `A team named "${trimmedName}" already exists.` });
  }
  const dupCode = activeTeams.find((t) => t.code.toUpperCase() === trimmedCode);
  if (dupCode) {
    return res.status(400).json({ success: false, message: `Access code "${trimmedCode}" is already used by "${dupCode.name}".` });
  }
  const newId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newTeam = { id: newId, name: trimmedName, code: trimmedCode };
  activeTeams.push(newTeam);
  saveTeamsToFile(activeTeams);
  quizState.teams[trimmedName] = {
    teamName: trimmedName,
    teamCode: trimmedCode,
    socketId: null,
    connected: false,
    score: 0,
    totalTime: 0,
    sessionToken: null,
    currentAnswer: null,
    currentAnswerTime: null,
    currentResult: "waiting",
    isFirstCorrect: false,
    history: []
  };
  if (isMongoConnected) {
    try {
      await Team2.create({
        teamName: trimmedName,
        teamCode: trimmedCode,
        isConnected: false
      });
    } catch (e) {
      console.error("Error creating team in MongoDB:", e?.message);
    }
  }
  broadcastAll();
  res.json({
    success: true,
    message: `Team "${trimmedName}" created successfully.`,
    team: newTeam,
    teams: activeTeams
  });
});
app.put("/api/admin/teams/:id", requireAdminAuth, async (req, res) => {
  const team = activeTeams.find((t) => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ success: false, message: "Team not found." });
  }
  const { name, code } = req.body || {};
  const oldName = team.name;
  const newName = (name || "").trim();
  const newCode = (code || "").trim().toUpperCase();
  if (!newName || !newCode) {
    return res.status(400).json({ success: false, message: "Team name and code are required." });
  }
  const dupName = activeTeams.find((t) => t.id !== team.id && t.name.toLowerCase() === newName.toLowerCase());
  if (dupName) {
    return res.status(400).json({ success: false, message: `A team named "${newName}" already exists.` });
  }
  const dupCode = activeTeams.find((t) => t.id !== team.id && t.code.toUpperCase() === newCode);
  if (dupCode) {
    return res.status(400).json({ success: false, message: `Access code "${newCode}" is already in use.` });
  }
  team.name = newName;
  team.code = newCode;
  saveTeamsToFile(activeTeams);
  if (oldName !== newName && quizState.teams[oldName]) {
    quizState.teams[newName] = {
      ...quizState.teams[oldName],
      teamName: newName,
      teamCode: newCode
    };
    delete quizState.teams[oldName];
  } else if (quizState.teams[newName]) {
    quizState.teams[newName].teamCode = newCode;
  }
  if (isMongoConnected) {
    try {
      await Team2.findOneAndUpdate({ teamName: oldName }, { teamName: newName, teamCode: newCode });
    } catch (e) {
      console.error("Error updating team in MongoDB:", e?.message);
    }
  }
  broadcastAll();
  res.json({
    success: true,
    message: `Team "${newName}" updated successfully.`,
    team,
    teams: activeTeams
  });
});
app.delete("/api/admin/teams/:id", requireAdminAuth, async (req, res) => {
  if (activeTeams.length <= 2) {
    return res.status(400).json({
      success: false,
      message: "The quiz tournament requires at least 2 teams."
    });
  }
  const teamIndex = activeTeams.findIndex((t) => t.id === req.params.id);
  if (teamIndex === -1) {
    return res.status(404).json({ success: false, message: "Team not found." });
  }
  const teamName = activeTeams[teamIndex].name;
  const existingTeam = quizState.teams[teamName];
  if (existingTeam && existingTeam.socketId) {
    const sock = io.sockets.sockets.get(existingTeam.socketId);
    if (sock) {
      sock.emit("team-removed", { message: "This team has been removed by the host." });
      sock.leave("teams-room");
      delete sock.data.teamName;
    }
  }
  delete quizState.teams[teamName];
  activeTeams.splice(teamIndex, 1);
  saveTeamsToFile(activeTeams);
  if (isMongoConnected) {
    try {
      await Team2.deleteOne({ teamName });
    } catch (e) {
      console.error("Error deleting team from MongoDB:", e?.message);
    }
  }
  broadcastAll();
  res.json({
    success: true,
    message: `Team "${teamName}" was removed.`,
    teams: activeTeams
  });
});
app.post("/api/admin/reset-team-session", requireAdminAuth, async (req, res) => {
  const { teamName } = req.body || {};
  if (!teamName) {
    return res.status(400).json({ success: false, message: "Team name is required." });
  }
  const team = quizState.teams[teamName];
  if (team) {
    if (team.socketId) {
      const sock = io.sockets.sockets.get(team.socketId);
      if (sock) {
        sock.emit("session-reset", { message: "Your session was reset by the host. Please log in again." });
        sock.leave("teams-room");
        delete sock.data.teamName;
      }
    }
    team.socketId = null;
    team.connected = false;
    team.sessionToken = null;
  }
  if (isMongoConnected) {
    await Team2.findOneAndUpdate(
      { teamName },
      { isConnected: false, socketId: null }
    ).catch(() => {
    });
  }
  broadcastAll();
  res.json({ success: true, message: `Session reset for team "${teamName}".` });
});
app.post("/api/admin/teams/reset", requireAdminAuth, async (req, res) => {
  activeTeams = JSON.parse(JSON.stringify(DEFAULT_TEAMS));
  saveTeamsToFile(activeTeams);
  Object.values(quizState.teams).forEach((t) => {
    if (t.socketId) {
      const sock = io.sockets.sockets.get(t.socketId);
      if (sock) {
        sock.emit("session-reset", { message: "Teams reset by administrator." });
        sock.leave("teams-room");
        delete sock.data.teamName;
      }
    }
  });
  quizState.teams = {};
  initTeams();
  if (isMongoConnected) {
    try {
      await Team2.deleteMany({});
      for (const t of DEFAULT_TEAMS) {
        await Team2.create({
          teamName: t.name,
          teamCode: t.code,
          isConnected: false
        });
      }
    } catch (e) {
      console.error("Error resetting teams in MongoDB:", e?.message);
    }
  }
  broadcastAll();
  res.json({
    success: true,
    message: "Teams restored to default 10 teams and codes.",
    teams: activeTeams
  });
});
app.post("/api/team/login", (req, res) => {
  const { teamName, teamCode, socketId } = req.body || {};
  const trimmedName = (teamName || "").trim();
  const rawCode = (teamCode || "").trim();
  const isTeamAdmin = trimmedName.toLowerCase() === "aikyam" || trimmedName.toLowerCase() === "admin" || trimmedName.toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const isPasswordAdmin = isValidAdminPassword(rawCode) || rawCode === "aikyam2k26";
  if (isTeamAdmin && isPasswordAdmin) {
    const adminToken = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    activeAdminTokens.add(adminToken);
    return res.json({
      success: true,
      isAdmin: true,
      token: adminToken,
      adminToken,
      redirectUrl: "/admin.html",
      message: "Admin credentials authenticated. Redirecting to admin portal..."
    });
  }
  const match = findTeamByCredentials(trimmedName, rawCode);
  if (!match) {
    return res.status(401).json({
      success: false,
      errorType: "invalid_credentials",
      message: "The team name or code is incorrect. Please try again."
    });
  }
  const canonicalName = match.canonicalName;
  if (!quizState.teams[canonicalName]) {
    quizState.teams[canonicalName] = {
      teamName: canonicalName,
      teamCode: match.team.code,
      socketId: null,
      connected: false,
      score: 0,
      totalTime: 0,
      sessionToken: null,
      currentAnswer: null,
      currentAnswerTime: null,
      currentResult: "waiting",
      isFirstCorrect: false,
      history: []
    };
  }
  const team = quizState.teams[canonicalName];
  const existingSocket = team.socketId ? io.sockets.sockets.get(team.socketId) : null;
  const isSocketAlive = Boolean(existingSocket && existingSocket.connected && (!socketId || existingSocket.id !== socketId));
  const incomingToken = req.headers["x-session-token"] || req.body?.sessionToken;
  const isSameSession = Boolean(team.sessionToken && incomingToken && team.sessionToken === incomingToken);
  if ((team.connected || isSocketAlive || team.sessionToken) && !isSameSession) {
    return res.status(409).json({
      success: false,
      errorType: "already_logged_in",
      message: `Team "${canonicalName}" is already logged in on another mobile/device. Only 1 device per team is permitted. If your original device was lost or disconnected, ask the host to unlock your team session.`
    });
  }
  const sessionToken = team.sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  team.sessionToken = sessionToken;
  team.connected = true;
  if (socketId) {
    const clientSocket = io.sockets.sockets.get(socketId);
    if (clientSocket) {
      team.socketId = socketId;
      clientSocket.join("teams-room");
      clientSocket.data.teamName = canonicalName;
    }
  }
  if (isMongoConnected) {
    Team2.findOneAndUpdate({ teamName: canonicalName }, { isConnected: true, socketId: socketId || null }).catch(() => {
    });
  }
  io.emit("team-joined", {
    teamName: canonicalName,
    connectedCount: Object.values(quizState.teams).filter((t) => t.connected).length
  });
  broadcastAll();
  return res.json({
    success: true,
    teamName: canonicalName,
    sessionToken,
    quizState: quizState.state,
    stateData: getTeamState(canonicalName)
  });
});
app.set("trust proxy", true);
function findExistingFilePath(...relativeCandidates) {
  const baseDirectories = [
    path3.join(process.cwd(), "public"),
    path3.join(process.cwd(), "dist"),
    process.cwd()
  ];
  if (typeof __dirname !== "undefined") {
    baseDirectories.push(path3.join(__dirname, "public"));
    baseDirectories.push(path3.join(__dirname, "..", "public"));
    baseDirectories.push(path3.join(__dirname, "..", "dist"));
    baseDirectories.push(__dirname);
  }
  for (const rel of relativeCandidates) {
    for (const base of baseDirectories) {
      const full = path3.resolve(base, rel);
      if (fs3.existsSync(full) && fs3.statSync(full).isFile()) {
        return full;
      }
    }
  }
  return null;
}
function sendStaticHtml(res, fallbackFilename, ...candidateNames) {
  const resolved = findExistingFilePath(...candidateNames, fallbackFilename);
  if (resolved) {
    res.sendFile(resolved);
  } else {
    res.sendFile(path3.join(process.cwd(), "public", fallbackFilename));
  }
}
app.get("/", (req, res) => {
  sendStaticHtml(res, "team.html", "public/team.html", "dist/team.html");
});
app.get(["/team", "/team.html", "/arena", "/competition"], (req, res) => {
  sendStaticHtml(res, "team.html", "public/team.html", "dist/team.html");
});
app.get("/index.html", (req, res) => {
  sendStaticHtml(res, "team.html", "public/team.html", "dist/team.html");
});
app.get(["/admin", "/admin.html", "/host", "/host.html"], (req, res) => {
  sendStaticHtml(res, "host.html", "public/host.html", "dist/host.html");
});
var candidateStaticDirs = [
  path3.join(process.cwd(), "public"),
  path3.join(process.cwd(), "dist"),
  process.cwd()
];
for (const dir of candidateStaticDirs) {
  if (fs3.existsSync(dir)) {
    app.use(express4.static(dir, { index: false }));
  }
}
server.listen(PORT, "0.0.0.0", () => {
  console.log(`AIKYAM 2K26 | FUN&TECH server running on port ${PORT}`);
  console.log(`Event Home: http://localhost:${PORT}/`);
  console.log(`Competition Arena: http://localhost:${PORT}/team.html`);
  console.log(`Host & Projector: http://localhost:${PORT}/host.html`);
});
export {
  isValidAdminPassword
};
//# sourceMappingURL=server.js.map
