import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { Server, Socket } from "socket.io";
import { questions as defaultQuestions } from "./questions.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Admin Credentials Configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123";
const activeAdminTokens = new Set<string>();

// Question Data Structure & File Persistence
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

// Predefined Teams with dynamic file persistence and Admin customization
export interface TeamConfig {
  id: string;
  name: string;
  code: string;
}

const TEAMS_FILE = path.join(process.cwd(), "data", "teams.json");

const DEFAULT_TEAMS: TeamConfig[] = [
  { id: "t1", name: "Team 1", code: "T1A7" },
  { id: "t2", name: "Team 2", code: "T2B8" },
  { id: "t3", name: "Team 3", code: "T3C9" },
  { id: "t4", name: "Team 4", code: "T4D1" },
  { id: "t5", name: "Team 5", code: "T5E2" },
  { id: "t6", name: "Team 6", code: "T6F3" },
  { id: "t7", name: "Team 7", code: "T7G4" },
  { id: "t8", name: "Team 8", code: "T8H5" },
  { id: "t9", name: "Team 9", code: "T9I6" },
  { id: "t10", name: "Team 10", code: "T10J7" }
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
    time: number;
    result: "correct" | "wrong" | "no-answer";
  }>;
}

// Server Authoritative Quiz State
const quizState: {
  state: "idle" | "instructions" | "question" | "transition" | "finished";
  currentQuestionIndex: number;
  questionStartTime: number | null;
  questionDuration: number;
  instructionsDuration: number;
  transitionDuration: number;
  firstCorrectAnswerTeam: string | null;
  firstCorrectAnswerTime: number | null;
  teams: Record<string, TeamRecord>;
} = {
  state: "idle",
  currentQuestionIndex: -1,
  questionStartTime: null,
  questionDuration: 30, // 30 seconds per question
  instructionsDuration: 5, // 5 seconds instructions countdown
  transitionDuration: 5, // 5 seconds next question countdown
  firstCorrectAnswerTeam: null,
  firstCorrectAnswerTime: null,
  teams: {}
};

// Initialize predefined teams in state
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

let activeTimer: NodeJS.Timeout | null = null;
let timerSecondsLeft = 0;

function clearCurrentTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

// Helper: Calculate rankings
function calculateRankings() {
  const teamList = Object.values(quizState.teams);
  return teamList
    .slice()
    .sort((a, b) => {
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
    })
    .map((team, index) => ({
      rank: index + 1,
      teamName: team.teamName,
      connected: team.connected,
      score: team.score,
      totalTime: Number(team.totalTime.toFixed(2)),
      currentAnswer: team.currentAnswer,
      currentAnswerTime: team.currentAnswerTime,
      currentResult: team.currentResult,
      isFirstCorrect: team.isFirstCorrect
    }));
}

// Helper: Get sanitized host state
function getHostState() {
  const currentQ = activeQuestions[quizState.currentQuestionIndex] || null;
  return {
    state: quizState.state,
    currentQuestionIndex: quizState.currentQuestionIndex,
    totalQuestions: activeQuestions.length,
    currentQuestion: currentQ
      ? {
          id: currentQ.id,
          question: currentQ.question,
          options: currentQ.options,
          correctAnswer: currentQ.correctAnswer
        }
      : null,
    timerSecondsLeft,
    questionDuration: quizState.questionDuration,
    firstCorrectAnswerTeam: quizState.firstCorrectAnswerTeam,
    firstCorrectAnswerTime: quizState.firstCorrectAnswerTime,
    connectedCount: Object.values(quizState.teams).filter((t) => t.connected).length,
    totalTeams: activeTeams.length,
    teams: Object.values(quizState.teams).map((t) => ({
      teamName: t.teamName,
      connected: t.connected,
      score: t.score,
      totalTime: Number(t.totalTime.toFixed(2)),
      currentAnswer: t.currentAnswer,
      currentAnswerTime: t.currentAnswerTime,
      currentResult: t.currentResult,
      isFirstCorrect: t.isFirstCorrect
    })),
    rankings: calculateRankings()
  };
}

// Helper: Get sanitized team state (NEVER leak correctAnswer!)
function getTeamState(teamName: string) {
  const team = quizState.teams[teamName];
  const currentQ = activeQuestions[quizState.currentQuestionIndex] || null;
  return {
    state: quizState.state,
    teamName,
    connected: team?.connected || false,
    score: team?.score || 0,
    totalTime: team ? Number(team.totalTime.toFixed(2)) : 0,
    currentQuestionIndex: quizState.currentQuestionIndex,
    totalQuestions: activeQuestions.length,
    currentQuestion: currentQ
      ? {
          id: currentQ.id,
          question: currentQ.question,
          options: currentQ.options
        }
      : null,
    timerSecondsLeft,
    currentAnswer: team?.currentAnswer || null,
    currentAnswerTime: team?.currentAnswerTime || null,
    currentResult: team?.currentResult || "waiting",
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

// Flow: Start Instructions
function startInstructions() {
  clearCurrentTimer();
  quizState.state = "instructions";
  timerSecondsLeft = quizState.instructionsDuration;

  io.emit("show-instructions", {
    duration: quizState.instructionsDuration,
    message: "The quiz will start in 5 seconds..."
  });
  broadcastAll();

  activeTimer = setInterval(() => {
    timerSecondsLeft--;
    io.emit("timer-tick", { timerSecondsLeft });
    if (timerSecondsLeft <= 0) {
      clearCurrentTimer();
      startQuestion(0);
    }
  }, 1000);
}

// Flow: Start Question
function startQuestion(index: number) {
  if (index >= activeQuestions.length) {
    finishQuiz();
    return;
  }

  clearCurrentTimer();
  quizState.state = "question";
  quizState.currentQuestionIndex = index;
  quizState.questionStartTime = Date.now();
  quizState.firstCorrectAnswerTeam = null;
  quizState.firstCorrectAnswerTime = null;

  // Reset round state for each team
  Object.values(quizState.teams).forEach((t) => {
    t.currentAnswer = null;
    t.currentAnswerTime = null;
    t.currentResult = "waiting";
    t.isFirstCorrect = false;
  });

  const currentQ = activeQuestions[index];
  timerSecondsLeft = quizState.questionDuration;

  // Host gets full question with correctAnswer
  io.to("host-room").emit("question-start", {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: activeQuestions.length,
    question: currentQ.question,
    options: currentQ.options,
    correctAnswer: currentQ.correctAnswer,
    duration: quizState.questionDuration
  });

  // Teams get question WITHOUT correctAnswer
  io.to("teams-room").emit("question-start", {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: activeQuestions.length,
    question: currentQ.question,
    options: currentQ.options,
    duration: quizState.questionDuration
  });

  broadcastAll();

  // 1-second interval timer
  activeTimer = setInterval(() => {
    timerSecondsLeft--;
    io.emit("timer-tick", { timerSecondsLeft });

    if (timerSecondsLeft <= 0) {
      clearCurrentTimer();
      handleQuestionTimeout();
    }
  }, 1000);
}

// Flow: Check if all connected teams have submitted
function checkAllAnswersSubmitted() {
  const connectedTeams = Object.values(quizState.teams).filter((t) => t.connected);
  if (connectedTeams.length === 0) return;

  const allSubmitted = connectedTeams.every(
    (t) => t.currentAnswer !== null && t.currentAnswer !== undefined
  );

  if (allSubmitted && quizState.state === "question") {
    // All connected teams have answered! Give brief 1.5s visual pause, then advance
    clearCurrentTimer();
    setTimeout(() => {
      handleQuestionTimeout();
    }, 1500);
  }
}

// Flow: Handle Question Timeout
function handleQuestionTimeout() {
  clearCurrentTimer();
  const currentQ = activeQuestions[quizState.currentQuestionIndex];
  if (!currentQ) return;

  // Mark all unanswering teams as 'no-answer' with max duration
  Object.values(quizState.teams).forEach((team) => {
    if (!team.currentAnswer) {
      team.currentAnswer = "None";
      team.currentAnswerTime = quizState.questionDuration;
      team.currentResult = "no-answer";
      team.totalTime += quizState.questionDuration;
      team.history.push({
        questionIndex: quizState.currentQuestionIndex,
        answer: null,
        time: quizState.questionDuration,
        result: "no-answer"
      });
    }
  });

  io.emit("question-timeout", {
    questionIndex: quizState.currentQuestionIndex,
    correctAnswer: currentQ.correctAnswer,
    rankings: calculateRankings()
  });

  broadcastAll();

  // Transition to next question in 5 seconds
  startTransitionCountdown();
}

// Flow: Next Question Countdown (Transition Screen)
function startTransitionCountdown() {
  quizState.state = "transition";
  timerSecondsLeft = quizState.transitionDuration;

  const nextQNum = quizState.currentQuestionIndex + 2;
  const isFinal = nextQNum > activeQuestions.length;

  io.emit("show-next-question", {
    transitionSeconds: quizState.transitionDuration,
    nextQuestionNumber: nextQNum,
    isFinal,
    totalQuestions: activeQuestions.length
  });

  broadcastAll();

  activeTimer = setInterval(() => {
    timerSecondsLeft--;
    io.emit("timer-tick", { timerSecondsLeft });

    if (timerSecondsLeft <= 0) {
      clearCurrentTimer();
      const nextIndex = quizState.currentQuestionIndex + 1;
      if (nextIndex < activeQuestions.length) {
        startQuestion(nextIndex);
      } else {
        finishQuiz();
      }
    }
  }, 1000);
}

// Flow: Finish Quiz
function finishQuiz() {
  clearCurrentTimer();
  quizState.state = "finished";

  const rankings = calculateRankings();
  const winner = rankings[0] || null;

  io.emit("quiz-finished", {
    scoreboard: rankings,
    winner
  });

  broadcastAll();
}

// Flow: Reset Quiz
function resetQuiz() {
  clearCurrentTimer();
  quizState.state = "idle";
  quizState.currentQuestionIndex = -1;
  quizState.questionStartTime = null;
  quizState.firstCorrectAnswerTeam = null;
  quizState.firstCorrectAnswerTime = null;
  timerSecondsLeft = 0;

  Object.values(quizState.teams).forEach((t) => {
    t.score = 0;
    t.totalTime = 0;
    t.currentAnswer = null;
    t.currentAnswerTime = null;
    t.currentResult = "waiting";
    t.isFirstCorrect = false;
    t.history = [];
  });

  io.emit("quiz-reset", {
    message: "The quiz has been reset by the host."
  });

  broadcastAll();
}

// Socket.IO Handling
io.on("connection", (socket: Socket) => {
  // 1. Admin Authentication & Connect
  socket.on("admin-auth", (data: { token?: string; username?: string; password?: string }) => {
    const { token, username, password } = data || {};
    let authenticated = false;

    if (token && activeAdminTokens.has(token)) {
      authenticated = true;
    } else if (
      username &&
      password &&
      username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase() &&
      password.trim() === ADMIN_PASSWORD
    ) {
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
      // Also emit host-init for live monitors
      socket.emit("host-init", getHostState());
    } else {
      socket.emit("admin-auth-failed", {
        authenticated: false,
        message: "Invalid admin credentials. Please provide valid username and password."
      });
    }
  });

  // Legacy host-connect with token check
  socket.on("host-connect", (data?: { token?: string }) => {
    const token = data?.token;
    if (token && activeAdminTokens.has(token)) {
      socket.data.isAdmin = true;
      socket.join("host-room");
      socket.emit("host-init", getHostState());
    } else {
      // Prompt for admin login
      socket.emit("admin-auth-required", {
        message: "Admin authentication is required to access the host control room."
      });
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

  // 2. Team Login
  socket.on("team-login", (data: { teamName: string; teamCode: string }) => {
    const { teamName, teamCode } = data || {};
    const trimmedName = (teamName || "").trim();
    const trimmedCode = (teamCode || "").trim().toUpperCase();

    // Check credentials against active teams
    const expectedTeam = activeTeams.find(
      (t) => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (!expectedTeam || expectedTeam.code.trim().toUpperCase() !== trimmedCode) {
      socket.emit("login-response", {
        success: false,
        errorType: "invalid_credentials",
        message: "The team name or code is incorrect. Please try again."
      });
      return;
    }

    const canonicalName = expectedTeam.name;
    const team = quizState.teams[canonicalName];
    if (!team) {
      socket.emit("login-response", {
        success: false,
        errorType: "invalid_credentials",
        message: "Team record not found in arena."
      });
      return;
    }

    // Check duplicate login: If active on another socket
    if (team.connected && team.socketId && team.socketId !== socket.id) {
      socket.emit("login-response", {
        success: false,
        errorType: "already_logged_in",
        message: `${canonicalName} is already logged in on another device or tab.`
      });
      return;
    }

    // Successful login
    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    team.socketId = socket.id;
    team.connected = true;
    team.sessionToken = sessionToken;

    socket.join("teams-room");
    socket.data.teamName = canonicalName;

    socket.emit("login-response", {
      success: true,
      teamName: canonicalName,
      sessionToken,
      quizState: quizState.state,
      stateData: getTeamState(canonicalName)
    });

    // Notify all
    io.emit("team-joined", {
      teamName: trimmedName,
      connectedCount: Object.values(quizState.teams).filter((t) => t.connected).length
    });

    broadcastAll();
  });

  // 3. Team Reconnect (e.g. on page reload)
  socket.on("team-reconnect", (data: { teamName: string; sessionToken: string }) => {
    const { teamName, sessionToken } = data || {};
    const team = quizState.teams[teamName];

    if (team && (team.sessionToken === sessionToken || !team.connected)) {
      team.socketId = socket.id;
      team.connected = true;
      if (!team.sessionToken) team.sessionToken = sessionToken;

      socket.join("teams-room");
      socket.data.teamName = teamName;

      socket.emit("reconnect-response", {
        success: true,
        teamName,
        stateData: getTeamState(teamName)
      });

      broadcastAll();
    } else {
      socket.emit("reconnect-response", {
        success: false,
        message: "Session expired or invalid. Please log in again."
      });
    }
  });

  // 4. Team Submit Answer (Server authoritative timing & validation)
  socket.on("submit-answer", (data: { answer: string }) => {
    const teamName = socket.data.teamName;
    if (!teamName) return;

    const team = quizState.teams[teamName];
    if (!team) return;

    // Validation: Quiz must be in active question state
    if (quizState.state !== "question" || quizState.questionStartTime === null) {
      socket.emit("answer-rejected", {
        message: "Question is not currently active."
      });
      return;
    }

    // Validation: Only one answer allowed
    if (team.currentAnswer !== null) {
      socket.emit("answer-rejected", {
        message: "You have already submitted an answer for this question."
      });
      return;
    }

    // Server-Authoritative Response Time
    const serverTimestamp = Date.now();
    const elapsedSeconds = Number(
      ((serverTimestamp - quizState.questionStartTime) / 1000).toFixed(2)
    );

    // Validation: Cannot answer after timeout
    if (elapsedSeconds > quizState.questionDuration + 0.5) {
      socket.emit("answer-rejected", {
        message: "Time has expired for this question."
      });
      return;
    }

    const currentQ = activeQuestions[quizState.currentQuestionIndex];
    if (!currentQ) return;

    const selectedOption = (data.answer || "").toUpperCase();
    const isCorrect = selectedOption === currentQ.correctAnswer;

    // Record submission
    team.currentAnswer = selectedOption;
    team.currentAnswerTime = elapsedSeconds;
    team.currentResult = isCorrect ? "correct" : "wrong";
    team.totalTime += elapsedSeconds;

    if (isCorrect) {
      team.score += 1;
      // First Correct Answer Check
      if (!quizState.firstCorrectAnswerTeam) {
        quizState.firstCorrectAnswerTeam = teamName;
        quizState.firstCorrectAnswerTime = elapsedSeconds;
        team.isFirstCorrect = true;
      }
    }

    team.history.push({
      questionIndex: quizState.currentQuestionIndex,
      answer: selectedOption,
      time: elapsedSeconds,
      result: isCorrect ? "correct" : "wrong"
    });

    // Send confirmation to team
    socket.emit("answer-received", {
      success: true,
      selectedAnswer: selectedOption,
      responseTime: elapsedSeconds,
      formattedTime: formatDuration(elapsedSeconds),
      status: "Answer Submitted!"
    });

    // Notify host & other clients immediately
    io.to("host-room").emit("live-answer-update", {
      teamName,
      answer: selectedOption,
      time: elapsedSeconds,
      formattedTime: formatDuration(elapsedSeconds),
      result: team.currentResult,
      isFirstCorrect: team.isFirstCorrect,
      score: team.score,
      totalTime: Number(team.totalTime.toFixed(2))
    });

    broadcastHostUpdate();
    checkAllAnswersSubmitted();
  });

  // 5. Team Logout
  socket.on("team-logout", () => {
    const teamName = socket.data.teamName;
    if (teamName && quizState.teams[teamName]) {
      quizState.teams[teamName].connected = false;
      quizState.teams[teamName].socketId = null;
      quizState.teams[teamName].sessionToken = null;
      socket.leave("teams-room");
      delete socket.data.teamName;

      io.emit("team-left", { teamName });
      broadcastAll();
    }
  });

  // 6. Host / Admin Controls (Protected)
  socket.on("quiz-start", () => {
    if (!socket.data.isAdmin) {
      socket.emit("admin-auth-required", { message: "Admin authentication required to start quiz." });
      return;
    }
    if (quizState.state === "idle" || quizState.state === "finished") {
      startInstructions();
    }
  });

  socket.on("next-question", () => {
    if (!socket.data.isAdmin) {
      socket.emit("admin-auth-required", { message: "Admin authentication required." });
      return;
    }
    if (quizState.state === "question" || quizState.state === "transition") {
      clearCurrentTimer();
      const nextIndex = quizState.currentQuestionIndex + 1;
      if (nextIndex < activeQuestions.length) {
        startQuestion(nextIndex);
      } else {
        finishQuiz();
      }
    }
  });

  socket.on("end-quiz", () => {
    if (!socket.data.isAdmin) return;
    finishQuiz();
  });

  socket.on("reset-quiz", () => {
    if (!socket.data.isAdmin) return;
    resetQuiz();
  });

  // 7. Question Management via Sockets (For instant live reactive updates)
  socket.on("admin-get-questions", () => {
    if (!socket.data.isAdmin) return;
    socket.emit("questions-list", { questions: activeQuestions });
  });

  // 8. Disconnection
  socket.on("disconnect", () => {
    const teamName = socket.data.teamName;
    if (teamName && quizState.teams[teamName]) {
      // Mark disconnected, but retain score and answers
      quizState.teams[teamName].connected = false;
      quizState.teams[teamName].socketId = null;
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

// REST API Endpoints
app.use(express.json());

// Helper: Require Admin Authentication Middleware
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

// API: Admin Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (
    username &&
    password &&
    username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase() &&
    password.trim() === ADMIN_PASSWORD
  ) {
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
    message: "Invalid admin username or password."
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

// API: Get All Quiz Questions (Admin Only)
app.get("/api/admin/questions", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    total: activeQuestions.length,
    questions: activeQuestions
  });
});

// API: Add New Question (Admin Only)
app.post("/api/admin/questions", requireAdminAuth, (req, res) => {
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

  // Broadcast to all active clients
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

// API: Update Existing Question (Admin Only)
app.put("/api/admin/questions/:id", requireAdminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { question, options, correctAnswer } = req.body || {};

  const index = activeQuestions.findIndex((q) => q.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: `Question #${id} not found.` });
  }

  if (question && typeof question === "string" && question.trim()) {
    activeQuestions[index].question = question.trim();
  }

  if (options) {
    if (options.A && options.A.trim()) activeQuestions[index].options.A = options.A.trim();
    if (options.B && options.B.trim()) activeQuestions[index].options.B = options.B.trim();
    if (options.C && options.C.trim()) activeQuestions[index].options.C = options.C.trim();
    if (options.D && options.D.trim()) activeQuestions[index].options.D = options.D.trim();
  }

  if (correctAnswer) {
    const validAns = correctAnswer.toUpperCase();
    if (["A", "B", "C", "D"].includes(validAns)) {
      activeQuestions[index].correctAnswer = validAns as "A" | "B" | "C" | "D";
    }
  }

  saveQuestionsToFile(activeQuestions);
  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });

  res.json({
    success: true,
    message: "Question updated successfully.",
    question: activeQuestions[index]
  });
});

// API: Delete Question (Admin Only)
app.delete("/api/admin/questions/:id", requireAdminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (activeQuestions.length <= 1) {
    return res.status(400).json({
      success: false,
      message: "A quiz must have at least 1 question. Cannot delete the only remaining question."
    });
  }

  if (quizState.state === "question" && activeQuestions[quizState.currentQuestionIndex]?.id === id) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete the question that is currently active in a live round."
    });
  }

  const initialCount = activeQuestions.length;
  activeQuestions = activeQuestions.filter((q) => q.id !== id);

  if (activeQuestions.length === initialCount) {
    return res.status(404).json({ success: false, message: `Question #${id} not found.` });
  }

  saveQuestionsToFile(activeQuestions);
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

// API: Reset Questions to Default 10 Questions (Admin Only)
app.post("/api/admin/questions/reset", requireAdminAuth, (req, res) => {
  const defaults = (defaultQuestions as QuestionItem[]) || [];
  activeQuestions = JSON.parse(JSON.stringify(defaults));
  saveQuestionsToFile(activeQuestions);

  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });

  res.json({
    success: true,
    message: "Questions reset to default general knowledge 10 questions.",
    totalQuestions: activeQuestions.length,
    questions: activeQuestions
  });
});

// API: Reorder Questions (Admin Only)
app.post("/api/admin/questions/reorder", requireAdminAuth, (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: "Array of question IDs is required." });
  }

  const reordered: QuestionItem[] = [];
  ids.forEach((id: number) => {
    const found = activeQuestions.find((q) => q.id === id);
    if (found) reordered.push(found);
  });

  // Preserve any questions that were omitted from ids
  activeQuestions.forEach((q) => {
    if (!reordered.some((item) => item.id === q.id)) {
      reordered.push(q);
    }
  });

  activeQuestions = reordered;
  saveQuestionsToFile(activeQuestions);

  broadcastAll();
  io.to("host-room").emit("questions-updated", {
    questions: activeQuestions,
    totalQuestions: activeQuestions.length
  });

  res.json({ success: true, questions: activeQuestions });
});

// API: Reset a specific team's session (Admin Only)
app.post("/api/admin/reset-team-session", requireAdminAuth, (req, res) => {
  const { teamName } = req.body || {};
  if (teamName && quizState.teams[teamName]) {
    quizState.teams[teamName].connected = false;
    quizState.teams[teamName].socketId = null;
    quizState.teams[teamName].sessionToken = null;
    broadcastAll();
    return res.json({ success: true, message: `Session reset for ${teamName}` });
  }
  res.status(400).json({ success: false, message: "Team not found." });
});

// API: Update a Team Name and Code (Admin Only)
app.put("/api/admin/teams/:id", requireAdminAuth, (req, res) => {
  const teamId = req.params.id;
  const teamIndex = activeTeams.findIndex((t) => t.id === teamId);
  if (teamIndex === -1) {
    return res.status(404).json({ success: false, message: "Team not found." });
  }

  const oldTeam = activeTeams[teamIndex];
  const oldName = oldTeam.name;
  const rawName = (req.body.name || "").trim();
  const rawCode = (req.body.code || "").trim().toUpperCase();

  if (!rawName) {
    return res.status(400).json({ success: false, message: "Team name cannot be empty." });
  }
  if (!rawCode) {
    return res.status(400).json({ success: false, message: "Access code cannot be empty." });
  }

  // Check duplicate team name (excluding current team)
  const nameExists = activeTeams.some(
    (t) => t.id !== teamId && t.name.toLowerCase() === rawName.toLowerCase()
  );
  if (nameExists) {
    return res.status(400).json({
      success: false,
      message: `A team named "${rawName}" already exists. Please choose a distinct name.`
    });
  }

  // Check duplicate access code (excluding current team)
  const codeExists = activeTeams.some(
    (t) => t.id !== teamId && t.code.toUpperCase() === rawCode.toUpperCase()
  );
  if (codeExists) {
    return res.status(400).json({
      success: false,
      message: `Access code "${rawCode}" is already assigned to another team. Codes must be unique.`
    });
  }

  // Apply update to activeTeams
  activeTeams[teamIndex] = {
    id: teamId,
    name: rawName,
    code: rawCode
  };
  saveTeamsToFile(activeTeams);

  // Update in quizState.teams
  if (oldName !== rawName && quizState.teams[oldName]) {
    const existingRecord = quizState.teams[oldName];
    existingRecord.teamName = rawName;
    existingRecord.teamCode = rawCode;
    quizState.teams[rawName] = existingRecord;
    delete quizState.teams[oldName];

    // If team has an active socket connection, notify them of their new name
    if (existingRecord.socketId) {
      const clientSocket = io.sockets.sockets.get(existingRecord.socketId);
      if (clientSocket) {
        clientSocket.data.teamName = rawName;
        clientSocket.emit("team-name-updated", {
          oldName,
          newName: rawName,
          teamCode: rawCode
        });
      }
    }
  } else if (quizState.teams[oldName]) {
    quizState.teams[oldName].teamCode = rawCode;
  } else {
    initTeams();
  }

  broadcastAll();
  io.to("host-room").emit("teams-updated", { teams: activeTeams });
  io.emit("public-teams-updated", { teams: activeTeams.map((t) => ({ id: t.id, name: t.name })) });

  res.json({
    success: true,
    message: `Team "${rawName}" updated successfully.`,
    team: activeTeams[teamIndex],
    teams: activeTeams
  });
});

// API: Add a New Team (Admin Only)
app.post("/api/admin/teams", requireAdminAuth, (req, res) => {
  const rawName = (req.body.name || "").trim();
  const rawCode = (req.body.code || "").trim().toUpperCase();

  if (!rawName) {
    return res.status(400).json({ success: false, message: "Team name cannot be empty." });
  }
  if (!rawCode) {
    return res.status(400).json({ success: false, message: "Access code cannot be empty." });
  }

  if (activeTeams.some((t) => t.name.toLowerCase() === rawName.toLowerCase())) {
    return res.status(400).json({ success: false, message: `A team named "${rawName}" already exists.` });
  }

  if (activeTeams.some((t) => t.code.toUpperCase() === rawCode.toUpperCase())) {
    return res.status(400).json({ success: false, message: `Access code "${rawCode}" is already in use.` });
  }

  const newId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newTeam: TeamConfig = { id: newId, name: rawName, code: rawCode };
  activeTeams.push(newTeam);
  saveTeamsToFile(activeTeams);

  initTeams();
  broadcastAll();
  io.to("host-room").emit("teams-updated", { teams: activeTeams });
  io.emit("public-teams-updated", { teams: activeTeams.map((t) => ({ id: t.id, name: t.name })) });

  res.json({
    success: true,
    message: `Team "${rawName}" added successfully.`,
    team: newTeam,
    teams: activeTeams
  });
});

// API: Delete a Team (Admin Only)
app.delete("/api/admin/teams/:id", requireAdminAuth, (req, res) => {
  if (activeTeams.length <= 2) {
    return res.status(400).json({
      success: false,
      message: "The quiz tournament requires at least 2 competing teams."
    });
  }

  const teamId = req.params.id;
  const targetIndex = activeTeams.findIndex((t) => t.id === teamId);
  if (targetIndex === -1) {
    return res.status(404).json({ success: false, message: "Team not found." });
  }

  const removedTeam = activeTeams[targetIndex];
  activeTeams.splice(targetIndex, 1);
  saveTeamsToFile(activeTeams);

  // If connected, disconnect socket
  if (quizState.teams[removedTeam.name]) {
    const record = quizState.teams[removedTeam.name];
    if (record.socketId) {
      const clientSocket = io.sockets.sockets.get(record.socketId);
      if (clientSocket) {
        clientSocket.emit("team-removed", {
          message: `Team ${removedTeam.name} has been removed by the administrator.`
        });
        clientSocket.disconnect(true);
      }
    }
    delete quizState.teams[removedTeam.name];
  }

  broadcastAll();
  io.to("host-room").emit("teams-updated", { teams: activeTeams });
  io.emit("public-teams-updated", { teams: activeTeams.map((t) => ({ id: t.id, name: t.name })) });

  res.json({
    success: true,
    message: `Team "${removedTeam.name}" was removed.`,
    teams: activeTeams
  });
});

// API: Reset Teams to Default 10 Teams (Admin Only)
app.post("/api/admin/teams/reset", requireAdminAuth, (req, res) => {
  activeTeams = JSON.parse(JSON.stringify(DEFAULT_TEAMS));
  saveTeamsToFile(activeTeams);
  initTeams();

  broadcastAll();
  io.to("host-room").emit("teams-updated", { teams: activeTeams });
  io.emit("public-teams-updated", { teams: activeTeams.map((t) => ({ id: t.id, name: t.name })) });

  res.json({
    success: true,
    message: "Teams reset back to default 10 teams and codes.",
    teams: activeTeams
  });
});

// API: Get full teams with passcodes (Admin Only)
app.get("/api/admin/teams", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    teams: activeTeams
  });
});

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// API: Public teams list (Names only - passcodes protected)
app.get("/api/teams", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = (req.headers["x-admin-token"] as string) || bearerToken;
  if (token && activeAdminTokens.has(token)) {
    return res.json({
      success: true,
      teams: activeTeams
    });
  }
  res.json({
    success: true,
    teams: activeTeams.map((t) => ({ id: t.id, name: t.name }))
  });
});

// API: Current quiz status
app.get("/api/quiz-status", (req, res) => {
  res.json(getHostState());
});

// Static files and Page routes
const publicPath = path.join(process.cwd(), "public");

// 1. DIRECT TEAM LOGIN PAGE WHEN OPENED:
// Root '/' directly serves the Team Login page (team.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "team.html"));
});

// Explicit Team Login routes
app.get(["/team", "/team.html"], (req, res) => {
  res.sendFile(path.join(publicPath, "team.html"));
});

// Redirect /index.html to '/' so team login is always prioritized
app.get("/index.html", (req, res) => {
  res.redirect("/");
});

// Admin / Host Routes - all served via host.html
app.get(["/admin", "/admin.html", "/host", "/host.html"], (req, res) => {
  res.sendFile(path.join(publicPath, "host.html"));
});

// Optional landing page route if accessed via /landing or /home
app.get(["/landing", "/landing.html", "/home"], (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Serve static frontend files with { index: false } so '/' route handler takes precedence
app.use(express.static(publicPath, { index: false }));

// Also serve dist if built
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath, { index: false }));

// Start listening on port 3000 (0.0.0.0 is mandatory)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`QUIZ ARENA server running at http://localhost:${PORT}`);
  console.log(`Team Arena (Direct Access): http://localhost:${PORT}/`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`Admin user configured.`);
});
