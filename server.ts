import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { questions as defaultQuestions } from "./questions.js";
import { Team as TeamImport } from "./models/Team.js";
import { Question as QuestionImport } from "./models/Question.js";
import { Quiz as QuizImport } from "./models/Quiz.js";
import { Answer as AnswerImport } from "./models/Answer.js";
import { Result as ResultImport } from "./models/Result.js";
import teamRoutes from "./routes/teamRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";

const Team: any = TeamImport;
const Question: any = QuestionImport;
const Quiz: any = QuizImport;
const Answer: any = AnswerImport;
const Result: any = ResultImport;

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 10000
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quiz_arena";

// Admin Credentials Configuration
const ADMIN_USERNAME = "aikyam";
const ADMIN_PASSWORD = "aikyam2k26";
const activeAdminTokens = new Set<string>();

export function isValidAdminPassword(pwd?: string): boolean {
  if (!pwd) return false;
  const trimmed = pwd.trim();
  return (
    trimmed === "aikyam2k26" ||
    trimmed === ADMIN_PASSWORD ||
    (process.env.ADMIN_PASSWORD && trimmed === process.env.ADMIN_PASSWORD.trim()) ||
    (process.env.HOST_PASSWORD && trimmed === process.env.HOST_PASSWORD.trim())
  );
}

// Question Data Structure
export interface QuestionItem {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  category?: string;
  timeLimit?: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const QUESTIONS_FILE = path.join(DATA_DIR, "questions.json");

function loadQuestions(): QuestionItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(QUESTIONS_FILE)) {
      const content = fs.readFileSync(QUESTIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as QuestionItem[];
      }
    }
  } catch (err) {
    console.error("Error reading data/questions.json:", err);
  }
  const fallback = (defaultQuestions as QuestionItem[]) || [];
  saveQuestionsToFile(fallback);
  return fallback;
}

function saveQuestionsToFile(qs: QuestionItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(qs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving data/questions.json:", err);
  }
}

let activeQuestions: QuestionItem[] = loadQuestions();

// Predefined Teams
export interface TeamConfig {
  id: string;
  name: string;
  code: string;
}

const TEAMS_FILE = path.join(process.cwd(), "data", "teams.json");

const DEFAULT_TEAMS: TeamConfig[] = [
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

function loadTeams(): TeamConfig[] {
  try {
    if (fs.existsSync(TEAMS_FILE)) {
      const content = fs.readFileSync(TEAMS_FILE, "utf-8");
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

function saveTeamsToFile(teams: TeamConfig[]) {
  try {
    const dir = path.dirname(TEAMS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving data/teams.json:", err);
  }
}

let activeTeams: TeamConfig[] = loadTeams();

export interface TeamRecord {
  teamName: string;
  teamCode: string;
  socketId: string | null;
  connected: boolean;
  score: number; // number of correct answers
  totalTime: number; // total response time in seconds
  sessionToken: string | null;
  currentAnswer: string | null;
  currentAnswerTime: number | null;
  currentResult: "correct" | "wrong" | "no-answer" | "waiting";
  isFirstCorrect: boolean;
  history: Array<{
    questionIndex: number;
    answer: string | null;
    result: "correct" | "wrong" | "waiting";
  }>;
}

// Server Authoritative Quiz State
let activeQuizSessionId: string | null = null;

const quizState: {
  state: "idle" | "running" | "finished";
  currentQuestionIndex: number;
  isAnswerRevealed: boolean;
  teams: Record<string, TeamRecord>;
} = {
  state: "idle",
  currentQuestionIndex: -1,
  isAnswerRevealed: false,
  teams: {}
};

// Initialize predefined teams in memory
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

// ============================================================================
// MongoDB Connection & Data Synchronization
// ============================================================================
let isMongoConnected = false;
let mongoStatusMessage = "In-Memory Active";
mongoose.set("bufferCommands", false);

function cleanMongoUri(rawUri: string): { uri: string; isPlaceholder: boolean } {
  let uri = (rawUri || "").trim();
  if (/<(db_)?password>/i.test(uri)) {
    return { uri, isPlaceholder: true };
  }
  // Strip accidental leading or enclosing angle brackets from password
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
      "Database notice: MONGODB_URI contains '<db_password>' placeholder. " +
      "The app is running with in-memory persistence. To connect MongoDB Atlas, " +
      "update MONGODB_URI in Settings with your real database password and add 0.0.0.0/0 to Atlas Network Access."
    );
    return;
  }

  try {
    mongoose.connection.on("connected", () => {
      isMongoConnected = true;
      mongoStatusMessage = "MongoDB Connected";
      console.log("MongoDB connected successfully to:", mongoose.connection.name);
    });

    mongoose.connection.on("disconnected", () => {
      isMongoConnected = false;
      mongoStatusMessage = "In-Memory Fallback Active";
      console.log("MongoDB disconnected. Operating in in-memory mode.");
    });

    mongoose.connection.on("error", (err) => {
      isMongoConnected = false;
      mongoStatusMessage = `In-Memory Fallback (${err.message})`;
      console.log(`Database notice: ${err.message}. Operating in in-memory mode.`);
    });

    await mongoose.connect(cleanUri, {
      dbName: "quiz_arena",
      serverSelectionTimeoutMS: 5000
    });

    // Auto-sync initial data into MongoDB if empty
    await syncMongoData();
  } catch (err: any) {
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
    // 1. Sync Teams in MongoDB with activeTeams from teams.json
    const activeNames = activeTeams.map(t => t.name.trim().toLowerCase());
    // Remove teams from MongoDB that are not in activeTeams
    const existingDbTeams = await Team.find();
    for (const dt of existingDbTeams) {
      if (!activeNames.includes(dt.teamName.trim().toLowerCase())) {
        await Team.deleteOne({ _id: dt._id });
      }
    }

    for (const t of activeTeams) {
      const existing = await Team.findOne({ teamName: t.name });
      if (!existing) {
        await Team.create({
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

    // 2. Load latest teams from MongoDB to memory
    const dbTeams = await Team.find();
    if (dbTeams.length > 0) {
      activeTeams = dbTeams.map((dt, idx) => ({
        id: (dt as any)._id?.toString() || `t${idx + 1}`,
        name: dt.teamName,
        code: dt.teamCode
      }));
      initTeams();
    }

    // 3. Check & Seed Questions in MongoDB
    const qCount = await Question.countDocuments();
    if (qCount === 0) {
      for (const q of activeQuestions) {
        await Question.create({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        });
      }
    } else {
      // Load questions from MongoDB
      const dbQuestions = await Question.find().sort({ questionNumber: 1 });
      if (dbQuestions.length > 0) {
        activeQuestions = dbQuestions.map((dq) => ({
          id: dq.questionNumber,
          question: dq.question,
          options: dq.options as any,
          correctAnswer: dq.correctAnswer as "A" | "B" | "C" | "D",
          category: dq.category,
          timeLimit: dq.timeLimit
        }));
      }
    }
  } catch (err: any) {
    console.error("Error during MongoDB sync:", err.message);
  }
}

// Fire connection asynchronously
connectToMongoDB();

// Helper: Calculate rankings
function calculateRankings() {
  const teamList = Object.values(quizState.teams);

  // Sorting comparator
  const sorted = teamList.slice().sort((a, b) => {
    // 1. Higher score (more correct answers) first
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 2. Tie-breaker: Lower total response time first
    if (a.totalTime !== b.totalTime) {
      return a.totalTime - b.totalTime;
    }
    // 3. Team name order
    return a.teamName.localeCompare(b.teamName);
  });

  // Calculate standard competition ranking (1, 2, 2, 4...)
  const results: Array<{
    rank: number;
    isTied: boolean;
    displayRank: string;
    teamName: string;
    connected: boolean;
    score: number;
    totalTime: number;
    currentAnswer: string | null;
    hasAnswered: boolean;
    currentAnswerTime: number | null;
    currentResult: "correct" | "wrong" | "no-answer" | "waiting";
    isFirstCorrect: boolean;
  }> = [];

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

  // Post-pass to update isTied flag and displayRank for earlier tied elements
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

// Helper: Get sanitized host state
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
    currentQuestion: currentQ
      ? {
          id: currentQ.id,
          question: currentQ.question,
          options: currentQ.options,
          correctAnswer: currentQ.correctAnswer
        }
      : null,
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

// Helper: Get sanitized team state (NEVER leak correctAnswer!)
function getTeamState(teamName: string) {
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
    currentQuestion: currentQ
      ? {
          id: currentQ.id,
          question: currentQ.question,
          options: currentQ.options
        }
      : null,
    currentAnswer: team?.currentAnswer || null,
    hasSubmitted,
    isAnswerRevealed: quizState.isAnswerRevealed,
    currentResult: quizState.isAnswerRevealed ? team?.currentResult || "waiting" : "waiting",
    rankings: calculateRankings()
  };
}

// Broadcast updates
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

// Flow: Start Quiz (Directly launches Question 1 - No countdown timers)
async function startQuiz() {
  quizState.state = "running";
  quizState.isAnswerRevealed = false;
  activeQuizSessionId = null;

  // Persist new Quiz session in MongoDB
  if (isMongoConnected) {
    try {
      const newQuiz = await Quiz.create({
        quizName: "AIKYAM 2K26 | FUN&TECH",
        status: "running",
        currentQuestion: 1,
        totalQuestions: activeQuestions.length
      });
      activeQuizSessionId = (newQuiz as any)._id?.toString();
    } catch (e: any) {
      console.error("Failed to create Quiz in MongoDB:", e.message);
    }
  }

  // Start Question 1 (index 0) immediately
  await startQuestion(0);
}

let isTransitioningQuestion = false;

// Flow: Start Question (Admin Controlled - No Timers, Stays Active Until Admin Advances)
async function startQuestion(index: number) {
  if (index >= activeQuestions.length) {
    await finishQuiz();
    return;
  }

  quizState.state = "running";
  quizState.currentQuestionIndex = index;
  quizState.isAnswerRevealed = false;

  // Reset round state for each team for this specific question
  Object.values(quizState.teams).forEach((t) => {
    t.currentAnswer = null;
    t.currentResult = "waiting";
  });

  const currentQ = activeQuestions[index];

  // Update Quiz session in MongoDB
  if (isMongoConnected && activeQuizSessionId) {
    try {
      await Quiz.findByIdAndUpdate(activeQuizSessionId, {
        status: "running",
        currentQuestion: index + 1
      });
    } catch (err: any) {
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

  // Host gets full question with correctAnswer
  io.to("host-room").emit("question-start", hostPayload);

  // Teams get question WITHOUT correctAnswer and WITHOUT any timer
  io.to("teams-room").emit("question-start", teamPayload);

  // Also emit directly to every active team socket to ensure 100% receipt
  Object.values(quizState.teams).forEach((t) => {
    if (t.socketId) {
      io.to(t.socketId).emit("question-start", teamPayload);
    }
  });

  broadcastAll();
}

// Flow: Reveal Answer (Admin Controlled - Does NOT advance to next question)
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

// Flow: Next Question (Admin Controlled - The ONLY mechanism that advances the quiz)
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

// Flow: Finish Quiz (Admin Controlled - Triggered explicitly when admin finishes final question)
async function finishQuiz() {
  quizState.state = "finished";
  quizState.isAnswerRevealed = true;

  const rankings = calculateRankings();
  const winner = rankings[0] || null;

  // Store final Results in MongoDB
  if (isMongoConnected) {
    try {
      if (activeQuizSessionId) {
        await Quiz.findByIdAndUpdate(activeQuizSessionId, {
          status: "completed",
          completedAt: new Date()
        });
      }

      for (const r of rankings) {
        await Result.create({
          quizId: activeQuizSessionId || null,
          teamName: r.teamName,
          correctAnswers: r.score,
          totalResponseTime: 0,
          rank: r.rank,
          createdAt: new Date()
        });
      }
      console.log(`Quiz results saved to MongoDB for session ${activeQuizSessionId || "default"}.`);
    } catch (err: any) {
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

// Flow: Reset Quiz (Admin Controlled)
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

  // Reset team scores in MongoDB for new session
  if (isMongoConnected) {
    try {
      await Team.updateMany({}, { totalScore: 0, totalResponseTime: 0 });
    } catch (err: any) {
      console.error("Error resetting teams in MongoDB:", err.message);
    }
  }

  io.emit("quiz-reset", {
    message: "The quiz has been reset by the host."
  });

  broadcastAll();
}

// Credential matcher
function findTeamByCredentials(inputName: string, inputCode: string): { team: TeamConfig; canonicalName: string } | null {
  const trimmedName = (inputName || "").trim();
  const trimmedCode = (inputCode || "").trim().toUpperCase();
  if (!trimmedName || !trimmedCode) return null;

  // 1. Direct match by active team name
  let target = activeTeams.find(
    (t) => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  // 2. Match by default slot name
  if (!target) {
    const defaultMatch = DEFAULT_TEAMS.find(
      (dt) => dt.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (defaultMatch) {
      target = activeTeams.find((t) => t.id === defaultMatch.id);
    }
  }

  // 3. Match by team ID
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

// ============================================================================
// Socket.IO Handling
// ============================================================================
io.on("connection", (socket: Socket) => {
  // 1. Admin Authentication & Connect
  socket.on("admin-auth", (data: { token?: string; username?: string; password?: string }) => {
    const { token, username, password } = data || {};
    let authenticated = false;

    const trimmedPassword = (password || "").trim();
    const trimmedUsername = (username || "").trim().toLowerCase();
    const isPassValid = isValidAdminPassword(trimmedPassword);
    const isUserValid =
      !trimmedUsername ||
      trimmedUsername === "aikyam" ||
      trimmedUsername === "admin" ||
      trimmedUsername === ADMIN_USERNAME.toLowerCase();

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

  // Host connect event
  socket.on("host-connect", (data?: { token?: string }) => {
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

  // Host start/reset/end aliases
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

  // Admin explicit logout
  socket.on("admin-logout", (data?: { token?: string }) => {
    const token = data?.token;
    if (token) {
      activeAdminTokens.delete(token);
    }
    socket.data.isAdmin = false;
    socket.leave("host-room");
    socket.emit("admin-logged-out", { success: true });
  });

  // 2. Team Login via Socket.IO
  socket.on("team-login", async (data: { teamName: string; teamCode: string }) => {
    const { teamName, teamCode } = data || {};
    const trimmedName = (teamName || "").trim();
    const rawCode = (teamCode || "").trim();

    // Check if user entered admin credentials at team login
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

    // Check credentials using resilient matcher
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

    // STRICT SINGLE-DEVICE LOGIN GUARD:
    // If team is already actively connected or claimed by another session, strictly DENY the new device!
    const existingSocket = team.socketId ? io.sockets.sockets.get(team.socketId) : null;
    const isSocketAlive = Boolean(existingSocket && existingSocket.connected && existingSocket.id !== socket.id);
    const incomingToken = (data as any)?.sessionToken;
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

    // Successful login
    const sessionToken = team.sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    team.socketId = socket.id;
    team.connected = true;
    team.sessionToken = sessionToken;

    socket.join("teams-room");
    socket.data.teamName = canonicalName;

    // Update MongoDB team connection status
    if (isMongoConnected) {
      Team.findOneAndUpdate(
        { teamName: canonicalName },
        { isConnected: true, socketId: socket.id }
      ).catch(() => {});
    }

    socket.emit("team-login-success", { teamName: canonicalName, sessionToken });
    socket.emit("login-response", {
      success: true,
      teamName: canonicalName,
      sessionToken,
      quizState: quizState.state,
      stateData: getTeamState(canonicalName)
    });

    // Notify all
    io.emit("team-joined", {
      teamName: canonicalName,
      connectedCount: Object.values(quizState.teams).filter((t) => t.connected).length
    });

    broadcastAll();
  });

  // 3. Team Reconnect
  socket.on("team-reconnect", (data: { teamName: string; sessionToken: string }) => {
    const { teamName, sessionToken } = data || {};
    if (!teamName) {
      socket.emit("reconnect-response", { success: false, message: "Team name required." });
      return;
    }

    const teamRecord = quizState.teams[teamName] ||
      Object.values(quizState.teams).find((t) => t.teamName.toLowerCase() === teamName.trim().toLowerCase());

    if (teamRecord) {
      const actualName = teamRecord.teamName;

      // Validate sessionToken: if team is already registered to a session, ensure incoming sessionToken matches!
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
        Team.findOneAndUpdate({ teamName: actualName }, { isConnected: true, socketId: socket.id }).catch(() => {});
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

// 4. Team Submit Answer
socket.on("submit-answer", async (data: { answer?: string; selectedAnswer?: string; questionNumber?: number }) => {
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

  // 1. Validation: Quiz must be actively running
  if (quizState.state !== "running" || quizState.currentQuestionIndex < 0) {
    socket.emit("answer-rejected", {
      message: "No question is currently active."
    });
    return;
  }

  // 2. Validation: Server-side duplicate answer locking
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

  // Record submission in memory
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

  // Save to MongoDB Answer collection
  if (isMongoConnected) {
    try {
      await Answer.create({
        quizId: activeQuizSessionId || null,
        teamName,
        questionNumber: quizState.currentQuestionIndex + 1,
        selectedAnswer: selectedOption,
        correctAnswer: currentQ.correctAnswer,
        isCorrect,
        responseTime: 0,
        submittedAt: new Date(),
        status: "answered"
      });

      await Team.findOneAndUpdate(
        { teamName },
        {
          $inc: {
            totalScore: isCorrect ? 1 : 0
          }
        }
      );
    } catch (e: any) {
      console.error("Failed saving Answer to MongoDB:", e.message);
    }
  }

  // Send confirmation to submitting team
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

  // Broadcast live status update to admin
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

// 5. Team Logout
socket.on("team-logout", async () => {
  const teamName = socket.data.teamName;
  if (teamName && quizState.teams[teamName]) {
    quizState.teams[teamName].connected = false;
    quizState.teams[teamName].socketId = null;
    quizState.teams[teamName].sessionToken = null;
    socket.leave("teams-room");
    delete socket.data.teamName;

    if (isMongoConnected) {
      Team.findOneAndUpdate({ teamName }, { isConnected: false, socketId: null }).catch(() => {});
    }

    io.emit("team-left", { teamName });
    broadcastAll();
  }
});

// 6. Host / Admin Controls (Admin is the ONLY one who controls progression)
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

socket.on("next-question", async (data?: { token?: string }) => {
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

socket.on("admin-next-question", async (data?: { token?: string }) => {
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

  // 7. Disconnection
  socket.on("disconnect", () => {
    const teamName = socket.data.teamName;
    if (teamName && quizState.teams[teamName]) {
      quizState.teams[teamName].connected = false;
      quizState.teams[teamName].socketId = null;

      if (isMongoConnected) {
        Team.findOneAndUpdate({ teamName }, { isConnected: false, socketId: null }).catch(() => {});
      }

      io.emit("team-disconnect", { teamName });
      broadcastHostUpdate();
    }
  });
});

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// REST API Middlewares
app.use(express.json());

// Mount User Requested REST Routes
app.use("/api/teams", teamRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/quiz", quizRoutes);

// Health & Database status endpoint
app.get("/api/db/status", (req, res) => {
  const { isPlaceholder } = cleanMongoUri(MONGODB_URI);
  res.json({
    success: true,
    connected: isMongoConnected,
    readyState: mongoose.connection.readyState,
    status: isMongoConnected ? "Connected" : mongoStatusMessage,
    database: isMongoConnected ? (mongoose.connection.name || "quiz_arena") : "quiz_arena",
    hasPlaceholder: isPlaceholder,
    hint: isPlaceholder
      ? "Replace <db_password> in your MONGODB_URI environment variable with your actual database user password, and whitelist 0.0.0.0/0 in MongoDB Atlas Network Access."
      : (isMongoConnected ? "MongoDB Atlas connected and ready." : "Operating in resilient in-memory mode. For MongoDB Atlas, ensure 0.0.0.0/0 is whitelisted in Atlas Network Access.")
  });
});

// Admin Authentication Middleware
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = bearerToken || (req.headers["x-admin-token"] as string) || (req.query.token as string);

  if (token && activeAdminTokens.has(token)) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Unauthorized: Admin login is required to perform this action."
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// API: Admin Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const trimmedPassword = (password || "").trim();
  const trimmedUsername = (username || "").trim().toLowerCase();

  const isPassValid = isValidAdminPassword(trimmedPassword);
  const isUserValid =
    !trimmedUsername ||
    trimmedUsername === "aikyam" ||
    trimmedUsername === "admin" ||
    trimmedUsername === ADMIN_USERNAME.toLowerCase();

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

// API: Verify Admin Token
app.post("/api/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = req.body?.token || bearerToken || (req.headers["x-admin-token"] as string);

  if (token && activeAdminTokens.has(token)) {
    return res.json({ valid: true, username: ADMIN_USERNAME });
  }
  return res.json({ valid: false });
});

// API: Admin Logout
app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = req.body?.token || bearerToken || (req.headers["x-admin-token"] as string);

  if (token) {
    activeAdminTokens.delete(token);
  }
  res.json({ success: true, message: "Admin logged out successfully." });
});

// Admin Live Game Controls
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

// API: Admin Questions Management (with correctAnswer)
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

  if (
    !options ||
    !options.A ||
    !options.B ||
    !options.C ||
    !options.D ||
    !options.A.trim() ||
    !options.B.trim() ||
    !options.C.trim() ||
    !options.D.trim()
  ) {
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

  const nextId = activeQuestions.length > 0
    ? Math.max(...activeQuestions.map((q) => q.id)) + 1
    : 1;

  const newQuestion: QuestionItem = {
    id: nextId,
    question: question.trim(),
    options: {
      A: options.A.trim(),
      B: options.B.trim(),
      C: options.C.trim(),
      D: options.D.trim()
    },
    correctAnswer: validAns as "A" | "B" | "C" | "D"
  };

  activeQuestions.push(newQuestion);
  saveQuestionsToFile(activeQuestions);

  if (isMongoConnected) {
    Question.create({
      questionNumber: newQuestion.id,
      question: newQuestion.question,
      options: newQuestion.options,
      correctAnswer: newQuestion.correctAnswer,
      category: "General Knowledge",
      timeLimit: 30
    }).catch(() => {});
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

// API: Reorder questions
app.post("/api/admin/questions/reorder", requireAdminAuth, async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "Array of question IDs is required." });
  }

  const idMap = new Map(activeQuestions.map(q => [q.id, q]));
  const reordered: QuestionItem[] = [];
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

  // Sequentially renumber questions 1..N
  reordered.forEach((q, idx) => {
    q.id = idx + 1;
  });

  activeQuestions = reordered;
  saveQuestionsToFile(activeQuestions);

  if (isMongoConnected) {
    try {
      await Question.deleteMany({});
      await Question.insertMany(
        activeQuestions.map((q) => ({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        }))
      );
    } catch (e: any) {
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

// API: Edit existing question
app.put("/api/admin/questions/:id", requireAdminAuth, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const qIndex = activeQuestions.findIndex(q => q.id === targetId);
  if (qIndex === -1) {
    return res.status(404).json({ success: false, message: `Question #${targetId} not found.` });
  }

  const { question, options, correctAnswer } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ success: false, message: "Question text is required." });
  }

  if (
    !options ||
    !options.A || !options.B || !options.C || !options.D ||
    !options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()
  ) {
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
    correctAnswer: validAns as "A" | "B" | "C" | "D"
  };

  saveQuestionsToFile(activeQuestions);

  if (isMongoConnected) {
    try {
      await Question.findOneAndUpdate(
        { questionNumber: targetId },
        {
          question: activeQuestions[qIndex].question,
          options: activeQuestions[qIndex].options,
          correctAnswer: activeQuestions[qIndex].correctAnswer
        }
      );
    } catch (e: any) {
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

// API: Delete question
app.delete("/api/admin/questions/:id", requireAdminAuth, async (req, res) => {
  if (activeQuestions.length <= 1) {
    return res.status(400).json({
      success: false,
      message: "The quiz must have at least 1 question. Cannot delete the only question."
    });
  }

  const targetId = parseInt(req.params.id, 10);
  const exists = activeQuestions.some(q => q.id === targetId);
  if (!exists) {
    return res.status(404).json({ success: false, message: `Question #${targetId} not found.` });
  }

  activeQuestions = activeQuestions.filter(q => q.id !== targetId);
  // Renumber remaining questions sequentially
  activeQuestions.forEach((q, idx) => {
    q.id = idx + 1;
  });

  saveQuestionsToFile(activeQuestions);

  if (isMongoConnected) {
    try {
      await Question.deleteMany({});
      await Question.insertMany(
        activeQuestions.map((q) => ({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        }))
      );
    } catch (e: any) {
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

// API: Reset questions to defaults
app.post("/api/admin/questions/reset", requireAdminAuth, async (req, res) => {
  activeQuestions = (defaultQuestions as QuestionItem[]).map((q, idx) => ({
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
      await Question.deleteMany({});
      await Question.insertMany(
        activeQuestions.map((q) => ({
          questionNumber: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || "General Knowledge",
          timeLimit: q.timeLimit || 30
        }))
      );
    } catch (e: any) {
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

// API: Admin Teams Management
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

  const dupName = activeTeams.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());
  if (dupName) {
    return res.status(400).json({ success: false, message: `A team named "${trimmedName}" already exists.` });
  }

  const dupCode = activeTeams.find(t => t.code.toUpperCase() === trimmedCode);
  if (dupCode) {
    return res.status(400).json({ success: false, message: `Access code "${trimmedCode}" is already used by "${dupCode.name}".` });
  }

  const newId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newTeam: TeamConfig = { id: newId, name: trimmedName, code: trimmedCode };
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
      await Team.create({
        teamName: trimmedName,
        teamCode: trimmedCode,
        isConnected: false
      });
    } catch (e: any) {
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
  const team = activeTeams.find(t => t.id === req.params.id);
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

  const dupName = activeTeams.find(t => t.id !== team.id && t.name.toLowerCase() === newName.toLowerCase());
  if (dupName) {
    return res.status(400).json({ success: false, message: `A team named "${newName}" already exists.` });
  }

  const dupCode = activeTeams.find(t => t.id !== team.id && t.code.toUpperCase() === newCode);
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
      await Team.findOneAndUpdate({ teamName: oldName }, { teamName: newName, teamCode: newCode });
    } catch (e: any) {
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

  const teamIndex = activeTeams.findIndex(t => t.id === req.params.id);
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
      await Team.deleteOne({ teamName });
    } catch (e: any) {
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
    await Team.findOneAndUpdate(
      { teamName },
      { isConnected: false, socketId: null }
    ).catch(() => {});
  }

  broadcastAll();
  res.json({ success: true, message: `Session reset for team "${teamName}".` });
});

app.post("/api/admin/teams/reset", requireAdminAuth, async (req, res) => {
  activeTeams = JSON.parse(JSON.stringify(DEFAULT_TEAMS));
  saveTeamsToFile(activeTeams);

  // Disconnect active team sockets
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
      await Team.deleteMany({});
      for (const t of DEFAULT_TEAMS) {
        await Team.create({
          teamName: t.name,
          teamCode: t.code,
          isConnected: false
        });
      }
    } catch (e: any) {
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

// API: Team HTTP Login
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

  // STRICT SINGLE-DEVICE LOGIN GUARD:
  // If team is already connected or registered to a session, strictly reject any other device!
  const existingSocket = team.socketId ? io.sockets.sockets.get(team.socketId) : null;
  const isSocketAlive = Boolean(existingSocket && existingSocket.connected && (!socketId || existingSocket.id !== socketId));
  const incomingToken = (req.headers["x-session-token"] as string) || req.body?.sessionToken;
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
    Team.findOneAndUpdate({ teamName: canonicalName }, { isConnected: true, socketId: socketId || null }).catch(() => {});
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

// Enable reverse proxy support
app.set("trust proxy", true);

function findExistingFilePath(...relativeCandidates: string[]): string | null {
  const baseDirectories: string[] = [
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "dist"),
    process.cwd()
  ];

  if (typeof __dirname !== "undefined") {
    baseDirectories.push(path.join(__dirname, "public"));
    baseDirectories.push(path.join(__dirname, "..", "public"));
    baseDirectories.push(path.join(__dirname, "..", "dist"));
    baseDirectories.push(__dirname);
  }

  for (const rel of relativeCandidates) {
    for (const base of baseDirectories) {
      const full = path.resolve(base, rel);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return full;
      }
    }
  }
  return null;
}

function sendStaticHtml(res: express.Response, fallbackFilename: string, ...candidateNames: string[]) {
  const resolved = findExistingFilePath(...candidateNames, fallbackFilename);
  if (resolved) {
    res.sendFile(resolved);
  } else {
    res.sendFile(path.join(process.cwd(), "public", fallbackFilename));
  }
}

// Direct routes
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

// Serve static frontend files
const candidateStaticDirs = [
  path.join(process.cwd(), "public"),
  path.join(process.cwd(), "dist"),
  process.cwd()
];

for (const dir of candidateStaticDirs) {
  if (fs.existsSync(dir)) {
    app.use(express.static(dir, { index: false }));
  }
}

// Start listening on port 3000
server.listen(PORT, "0.0.0.0", () => {
  console.log(`AIKYAM 2K26 | FUN&TECH server running on port ${PORT}`);
  console.log(`Event Home: http://localhost:${PORT}/`);
  console.log(`Competition Arena: http://localhost:${PORT}/team.html`);
  console.log(`Host & Projector: http://localhost:${PORT}/host.html`);
});
