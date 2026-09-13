// server.ts
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";

// questions.js
var questions = [
  {
    id: 1,
    question: "What is the capital city of India?",
    options: {
      A: "Mumbai",
      B: "New Delhi",
      C: "Chennai",
      D: "Kolkata"
    },
    correctAnswer: "B"
  },
  {
    id: 2,
    question: "Which planet in our solar system is famously known as the 'Red Planet'?",
    options: {
      A: "Venus",
      B: "Jupiter",
      C: "Mars",
      D: "Saturn"
    },
    correctAnswer: "C"
  },
  {
    id: 3,
    question: "Who is credited with inventing the World Wide Web in 1989?",
    options: {
      A: "Tim Berners-Lee",
      B: "Alan Turing",
      C: "Steve Jobs",
      D: "Bill Gates"
    },
    correctAnswer: "A"
  },
  {
    id: 4,
    question: "What is the chemical symbol for the element Gold?",
    options: {
      A: "Ag",
      B: "Fe",
      C: "Au",
      D: "Pb"
    },
    correctAnswer: "C"
  },
  {
    id: 5,
    question: "Which ocean is the largest and deepest ocean on Earth?",
    options: {
      A: "Atlantic Ocean",
      B: "Indian Ocean",
      C: "Arctic Ocean",
      D: "Pacific Ocean"
    },
    correctAnswer: "D"
  },
  {
    id: 6,
    question: "In computer science, what does 'RAM' stand for?",
    options: {
      A: "Rapid Access Module",
      B: "Random Access Memory",
      C: "Read Alternate Mode",
      D: "Remote Automated Mainframe"
    },
    correctAnswer: "B"
  },
  {
    id: 7,
    question: "How many continents are there on planet Earth?",
    options: {
      A: "5",
      B: "6",
      C: "7",
      D: "8"
    },
    correctAnswer: "C"
  },
  {
    id: 8,
    question: "Which instrument is used to measure atmospheric pressure?",
    options: {
      A: "Thermometer",
      B: "Barometer",
      C: "Hygrometer",
      D: "Anemometer"
    },
    correctAnswer: "B"
  },
  {
    id: 9,
    question: "Which country is the largest in the world by land area?",
    options: {
      A: "Canada",
      B: "China",
      C: "United States",
      D: "Russia"
    },
    correctAnswer: "D"
  },
  {
    id: 10,
    question: "What is the speed of light in vacuum approximately?",
    options: {
      A: "300,000 km/s",
      B: "150,000 km/s",
      C: "500,000 km/s",
      D: "1,000,000 km/s"
    },
    correctAnswer: "A"
  }
];

// server.ts
var app = express();
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
var PORT = 3e3;
var ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@123";
var activeAdminTokens = /* @__PURE__ */ new Set();
function isValidAdminPassword(pwd) {
  if (!pwd) return false;
  const trimmed = pwd.trim();
  return trimmed === ADMIN_PASSWORD || trimmed === "admin@123";
}
var DATA_DIR = path.join(process.cwd(), "data");
var QUESTIONS_FILE = path.join(DATA_DIR, "questions.json");
function loadQuestions() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(QUESTIONS_FILE)) {
      const content = fs.readFileSync(QUESTIONS_FILE, "utf-8");
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
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(qs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving data/questions.json:", err);
  }
}
var activeQuestions = loadQuestions();
var TEAMS_FILE = path.join(process.cwd(), "data", "teams.json");
var DEFAULT_TEAMS = [
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
function loadTeams() {
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
function saveTeamsToFile(teams) {
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
var activeTeams = loadTeams();
var quizState = {
  state: "idle",
  currentQuestionIndex: -1,
  questionStartTime: null,
  questionDuration: 30,
  // 30 seconds per question
  instructionsDuration: 5,
  // 5 seconds instructions countdown
  transitionDuration: 5,
  // 5 seconds next question countdown
  firstCorrectAnswerTeam: null,
  firstCorrectAnswerTime: null,
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
var activeTimer = null;
var timerSecondsLeft = 0;
function clearCurrentTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}
function calculateRankings() {
  const teamList = Object.values(quizState.teams);
  return teamList.slice().sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.totalTime !== b.totalTime) {
      return a.totalTime - b.totalTime;
    }
    return a.teamName.localeCompare(b.teamName);
  }).map((team, index) => ({
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
function getHostState() {
  const currentQ = activeQuestions[quizState.currentQuestionIndex] || null;
  return {
    state: quizState.state,
    currentQuestionIndex: quizState.currentQuestionIndex,
    totalQuestions: activeQuestions.length,
    currentQuestion: currentQ ? {
      id: currentQ.id,
      question: currentQ.question,
      options: currentQ.options,
      correctAnswer: currentQ.correctAnswer
    } : null,
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
function getTeamState(teamName) {
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
    currentQuestion: currentQ ? {
      id: currentQ.id,
      question: currentQ.question,
      options: currentQ.options
    } : null,
    timerSecondsLeft,
    currentAnswer: team?.currentAnswer || null,
    currentAnswerTime: team?.currentAnswerTime || null,
    currentResult: team?.currentResult || "waiting",
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
  }, 1e3);
}
function startQuestion(index) {
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
  Object.values(quizState.teams).forEach((t) => {
    t.currentAnswer = null;
    t.currentAnswerTime = null;
    t.currentResult = "waiting";
    t.isFirstCorrect = false;
  });
  const currentQ = activeQuestions[index];
  timerSecondsLeft = quizState.questionDuration;
  io.to("host-room").emit("question-start", {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: activeQuestions.length,
    question: currentQ.question,
    options: currentQ.options,
    correctAnswer: currentQ.correctAnswer,
    duration: quizState.questionDuration
  });
  io.to("teams-room").emit("question-start", {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: activeQuestions.length,
    question: currentQ.question,
    options: currentQ.options,
    duration: quizState.questionDuration
  });
  broadcastAll();
  activeTimer = setInterval(() => {
    timerSecondsLeft--;
    io.emit("timer-tick", { timerSecondsLeft });
    if (timerSecondsLeft <= 0) {
      clearCurrentTimer();
      handleQuestionTimeout();
    }
  }, 1e3);
}
function checkAllAnswersSubmitted() {
  const connectedTeams = Object.values(quizState.teams).filter((t) => t.connected);
  if (connectedTeams.length === 0) return;
  const allSubmitted = connectedTeams.every(
    (t) => t.currentAnswer !== null && t.currentAnswer !== void 0
  );
  if (allSubmitted && quizState.state === "question") {
    clearCurrentTimer();
    setTimeout(() => {
      handleQuestionTimeout();
    }, 1500);
  }
}
function handleQuestionTimeout() {
  clearCurrentTimer();
  const currentQ = activeQuestions[quizState.currentQuestionIndex];
  if (!currentQ) return;
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
  startTransitionCountdown();
}
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
  }, 1e3);
}
function finishQuiz() {
  clearCurrentTimer();
  quizState.state = "finished";
  const rankings = calculateRankings();
  const winner = rankings[0] || null;
  io.emit("quiz-finished", {
    scoreboard: rankings,
    winner,
    totalQuestions: activeQuestions.length
  });
  broadcastAll();
}
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
  const validCodes = [target.code.trim().toUpperCase()];
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
    const isUserValid = !trimmedUsername || trimmedUsername === "admin" || trimmedUsername === ADMIN_USERNAME.toLowerCase();
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
        message: "Invalid admin password. Please enter password 'admin@123' to access dashboard."
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
  socket.on("admin-logout", (data) => {
    const token = data?.token;
    if (token) {
      activeAdminTokens.delete(token);
    }
    socket.data.isAdmin = false;
    socket.leave("host-room");
    socket.emit("admin-logged-out", { success: true });
  });
  socket.on("team-login", (data) => {
    const { teamName, teamCode } = data || {};
    const trimmedName = (teamName || "").trim();
    const rawCode = (teamCode || "").trim();
    const isTeamAdmin = trimmedName.toLowerCase() === "admin" || trimmedName.toLowerCase() === ADMIN_USERNAME.toLowerCase();
    const isPasswordAdmin = isValidAdminPassword(rawCode) || rawCode === "admin@123";
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
    if (team.connected && team.socketId && team.socketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(team.socketId);
      if (oldSocket) {
        oldSocket.emit("team-superseded", {
          message: "You have logged in from another session. This session has been transferred."
        });
        oldSocket.leave("teams-room");
        delete oldSocket.data.teamName;
      }
    }
    const sessionToken = team.sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
      teamRecord.socketId = socket.id;
      teamRecord.connected = true;
      if (!teamRecord.sessionToken) teamRecord.sessionToken = sessionToken;
      socket.join("teams-room");
      socket.data.teamName = actualName;
      socket.emit("reconnect-response", {
        success: true,
        teamName: actualName,
        sessionToken: teamRecord.sessionToken,
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
  socket.on("submit-answer", (data) => {
    const teamName = socket.data.teamName;
    if (!teamName) return;
    const team = quizState.teams[teamName];
    if (!team) return;
    if (quizState.state !== "question" || quizState.questionStartTime === null) {
      socket.emit("answer-rejected", {
        message: "Question is not currently active."
      });
      return;
    }
    if (team.currentAnswer !== null) {
      socket.emit("answer-rejected", {
        message: "You have already submitted an answer for this question."
      });
      return;
    }
    const serverTimestamp = Date.now();
    const elapsedSeconds = Number(
      ((serverTimestamp - quizState.questionStartTime) / 1e3).toFixed(2)
    );
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
    team.currentAnswer = selectedOption;
    team.currentAnswerTime = elapsedSeconds;
    team.currentResult = isCorrect ? "correct" : "wrong";
    team.totalTime += elapsedSeconds;
    if (isCorrect) {
      team.score += 1;
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
    socket.emit("answer-received", {
      success: true,
      selectedAnswer: selectedOption,
      responseTime: elapsedSeconds,
      formattedTime: formatDuration(elapsedSeconds),
      status: "Answer Submitted!"
    });
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
    if (quizState.state === "instructions") {
      clearCurrentTimer();
      startQuestion(0);
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
  socket.on("admin-get-questions", () => {
    if (!socket.data.isAdmin) return;
    socket.emit("questions-list", { questions: activeQuestions });
  });
  socket.on("disconnect", () => {
    const teamName = socket.data.teamName;
    if (teamName && quizState.teams[teamName]) {
      quizState.teams[teamName].connected = false;
      quizState.teams[teamName].socketId = null;
      io.emit("team-disconnect", { teamName });
      broadcastHostUpdate();
    }
  });
});
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
app.use(express.json());
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
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const trimmedPassword = (password || "").trim();
  const trimmedUsername = (username || "").trim().toLowerCase();
  const isPassValid = isValidAdminPassword(trimmedPassword);
  const isUserValid = !trimmedUsername || trimmedUsername === "admin" || trimmedUsername === ADMIN_USERNAME.toLowerCase();
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
    message: "Invalid admin password. Enter password 'admin@123' to log in."
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
app.post("/api/admin/quiz/start", requireAdminAuth, (req, res) => {
  if (quizState.state === "idle" || quizState.state === "finished") {
    startInstructions();
    return res.json({ success: true, message: "Quiz started.", state: getHostState() });
  }
  res.json({ success: true, message: "Quiz already in progress.", state: getHostState() });
});
app.post("/api/admin/quiz/next", requireAdminAuth, (req, res) => {
  if (quizState.state === "instructions") {
    clearCurrentTimer();
    startQuestion(0);
    return res.json({ success: true, message: "Advanced to Question 1.", state: getHostState() });
  }
  if (quizState.state === "question" || quizState.state === "transition") {
    clearCurrentTimer();
    const nextIndex = quizState.currentQuestionIndex + 1;
    if (nextIndex < activeQuestions.length) {
      startQuestion(nextIndex);
      return res.json({ success: true, message: `Advanced to Question ${nextIndex + 1}.`, state: getHostState() });
    } else {
      finishQuiz();
      return res.json({ success: true, message: "Quiz finished.", state: getHostState() });
    }
  }
  res.status(400).json({ success: false, message: `Cannot advance next question from '${quizState.state}' state.` });
});
app.post("/api/admin/quiz/reset", requireAdminAuth, (req, res) => {
  resetQuiz();
  res.json({ success: true, message: "Quiz reset to lobby successfully.", state: getHostState() });
});
app.post("/api/admin/quiz/end", requireAdminAuth, (req, res) => {
  finishQuiz();
  res.json({ success: true, message: "Quiz ended and scoreboard finalized.", state: getHostState() });
});
app.get("/api/admin/questions", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    total: activeQuestions.length,
    questions: activeQuestions
  });
});
app.post("/api/admin/questions", requireAdminAuth, (req, res) => {
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
      activeQuestions[index].correctAnswer = validAns;
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
app.post("/api/admin/questions/reset", requireAdminAuth, (req, res) => {
  const defaults = questions || [];
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
app.post("/api/admin/questions/reorder", requireAdminAuth, (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: "Array of question IDs is required." });
  }
  const reordered = [];
  ids.forEach((id) => {
    const found = activeQuestions.find((q) => q.id === id);
    if (found) reordered.push(found);
  });
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
  const nameExists = activeTeams.some(
    (t) => t.id !== teamId && t.name.toLowerCase() === rawName.toLowerCase()
  );
  if (nameExists) {
    return res.status(400).json({
      success: false,
      message: `A team named "${rawName}" already exists. Please choose a distinct name.`
    });
  }
  const codeExists = activeTeams.some(
    (t) => t.id !== teamId && t.code.toUpperCase() === rawCode.toUpperCase()
  );
  if (codeExists) {
    return res.status(400).json({
      success: false,
      message: `Access code "${rawCode}" is already assigned to another team. Codes must be unique.`
    });
  }
  activeTeams[teamIndex] = {
    id: teamId,
    name: rawName,
    code: rawCode
  };
  saveTeamsToFile(activeTeams);
  if (oldName !== rawName && quizState.teams[oldName]) {
    const existingRecord = quizState.teams[oldName];
    existingRecord.teamName = rawName;
    existingRecord.teamCode = rawCode;
    quizState.teams[rawName] = existingRecord;
    delete quizState.teams[oldName];
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
  const newTeam = { id: newId, name: rawName, code: rawCode };
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
app.get("/api/admin/teams", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    teams: activeTeams
  });
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});
app.get("/api/teams", (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
  const token = req.headers["x-admin-token"] || bearerToken;
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
app.get("/api/quiz-status", (req, res) => {
  res.json(getHostState());
});
app.post("/api/team/login", (req, res) => {
  const { teamName, teamCode, socketId } = req.body || {};
  const trimmedName = (teamName || "").trim();
  const rawCode = (teamCode || "").trim();
  const isTeamAdmin = trimmedName.toLowerCase() === "admin" || trimmedName.toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const isPasswordAdmin = isValidAdminPassword(rawCode) || rawCode === "admin@123";
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
  const sessionToken = team.sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  team.sessionToken = sessionToken;
  team.connected = true;
  if (socketId) {
    const clientSocket = io.sockets.sockets.get(socketId);
    if (clientSocket) {
      if (team.socketId && team.socketId !== socketId) {
        const oldSocket = io.sockets.sockets.get(team.socketId);
        if (oldSocket) {
          oldSocket.leave("teams-room");
          delete oldSocket.data.teamName;
        }
      }
      team.socketId = socketId;
      clientSocket.join("teams-room");
      clientSocket.data.teamName = canonicalName;
    }
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
function sendStaticHtml(res, fallbackFilename, ...candidateNames) {
  const resolved = findExistingFilePath(...candidateNames, fallbackFilename);
  if (resolved) {
    res.sendFile(resolved);
  } else {
    res.sendFile(path.join(process.cwd(), "public", fallbackFilename));
  }
}
app.get("/", (req, res) => {
  sendStaticHtml(res, "team.html", "public/team.html", "dist/team.html");
});
app.get(["/team", "/team.html"], (req, res) => {
  sendStaticHtml(res, "team.html", "public/team.html", "dist/team.html");
});
app.get("/index.html", (req, res) => {
  res.redirect("/");
});
app.get(["/admin", "/admin.html", "/host", "/host.html"], (req, res) => {
  sendStaticHtml(res, "host.html", "public/host.html", "dist/host.html");
});
app.get(["/landing", "/landing.html", "/home"], (req, res) => {
  sendStaticHtml(res, "index.html", "public/index.html", "dist/index.html");
});
var candidateStaticDirs = [
  path.join(process.cwd(), "public"),
  path.join(process.cwd(), "dist"),
  process.cwd()
];
if (typeof __dirname !== "undefined") {
  candidateStaticDirs.push(path.join(__dirname, "public"));
  candidateStaticDirs.push(path.join(__dirname, "..", "public"));
  candidateStaticDirs.push(path.join(__dirname, "..", "dist"));
  candidateStaticDirs.push(__dirname);
}
for (const dir of candidateStaticDirs) {
  if (fs.existsSync(dir)) {
    app.use(express.static(dir, { index: false }));
  }
}
server.listen(PORT, "0.0.0.0", () => {
  console.log(`QUIZ ARENA server running at http://localhost:${PORT}`);
  console.log(`Team Arena (Direct Access): http://localhost:${PORT}/`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`Admin user configured.`);
});
export {
  isValidAdminPassword
};
//# sourceMappingURL=server.js.map
