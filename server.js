import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { questions } from "./questions.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Predefined 10 Teams with Unique Codes
const PREDEFINED_TEAMS = {
  "Team 1": "T1A7",
  "Team 2": "T2B8",
  "Team 3": "T3C9",
  "Team 4": "T4D1",
  "Team 5": "T5E2",
  "Team 6": "T6F3",
  "Team 7": "T7G4",
  "Team 8": "T8H5",
  "Team 9": "T9I6",
  "Team 10": "T10J7"
};

// Server Authoritative Quiz State
const quizState = {
  state: "idle", // 'idle' | 'instructions' | 'question' | 'transition' | 'finished'
  currentQuestionIndex: -1,
  questionStartTime: null,
  questionDuration: 30, // 30 seconds
  instructionsDuration: 5, // 5 seconds
  transitionDuration: 5, // 5 seconds
  firstCorrectAnswerTeam: null,
  firstCorrectAnswerTime: null,
  teams: {}
};

// Initialize predefined teams in state
function initTeams() {
  Object.entries(PREDEFINED_TEAMS).forEach(([name, code]) => {
    quizState.teams[name] = {
      teamName: name,
      teamCode: code,
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
  });
}

initTeams();

let activeTimer = null;
let timerSecondsLeft = 0;

function clearCurrentTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

// Calculate rankings
function calculateRankings() {
  const teamList = Object.values(quizState.teams);
  return teamList
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.totalTime !== b.totalTime) {
        return a.totalTime - b.totalTime;
      }
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

// Get sanitized host state
function getHostState() {
  const currentQ = questions[quizState.currentQuestionIndex] || null;
  return {
    state: quizState.state,
    currentQuestionIndex: quizState.currentQuestionIndex,
    totalQuestions: questions.length,
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
    totalTeams: Object.keys(PREDEFINED_TEAMS).length,
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

// Get sanitized team state (NEVER expose correctAnswer)
function getTeamState(teamName) {
  const team = quizState.teams[teamName];
  const currentQ = questions[quizState.currentQuestionIndex] || null;
  return {
    state: quizState.state,
    teamName,
    connected: team?.connected || false,
    score: team?.score || 0,
    totalTime: team ? Number(team.totalTime.toFixed(2)) : 0,
    currentQuestionIndex: quizState.currentQuestionIndex,
    totalQuestions: questions.length,
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
  }, 1000);
}

function startQuestion(index) {
  if (index >= questions.length) {
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

  const currentQ = questions[index];
  timerSecondsLeft = quizState.questionDuration;

  io.to("host-room").emit("question-start", {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: questions.length,
    question: currentQ.question,
    options: currentQ.options,
    correctAnswer: currentQ.correctAnswer,
    duration: quizState.questionDuration
  });

  io.to("teams-room").emit("question-start", {
    questionIndex: index,
    questionNumber: index + 1,
    totalQuestions: questions.length,
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
  }, 1000);
}

function checkAllAnswersSubmitted() {
  const connectedTeams = Object.values(quizState.teams).filter((t) => t.connected);
  if (connectedTeams.length === 0) return;

  const allSubmitted = connectedTeams.every(
    (t) => t.currentAnswer !== null && t.currentAnswer !== undefined
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
  const currentQ = questions[quizState.currentQuestionIndex];
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
  const isFinal = nextQNum > questions.length;

  io.emit("show-next-question", {
    transitionSeconds: quizState.transitionDuration,
    nextQuestionNumber: nextQNum,
    isFinal,
    totalQuestions: questions.length
  });

  broadcastAll();

  activeTimer = setInterval(() => {
    timerSecondsLeft--;
    io.emit("timer-tick", { timerSecondsLeft });

    if (timerSecondsLeft <= 0) {
      clearCurrentTimer();
      const nextIndex = quizState.currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        startQuestion(nextIndex);
      } else {
        finishQuiz();
      }
    }
  }, 1000);
}

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

io.on("connection", (socket) => {
  socket.on("host-connect", () => {
    socket.join("host-room");
    socket.emit("host-init", getHostState());
  });

  socket.on("team-login", (data) => {
    const { teamName, teamCode } = data || {};
    const trimmedName = (teamName || "").trim();
    const trimmedCode = (teamCode || "").trim().toUpperCase();

    const expectedCode = PREDEFINED_TEAMS[trimmedName];
    if (!expectedCode || expectedCode !== trimmedCode) {
      socket.emit("login-response", {
        success: false,
        errorType: "invalid_credentials",
        message: "The team name or code is incorrect. Please try again."
      });
      return;
    }

    const team = quizState.teams[trimmedName];
    if (team.connected && team.socketId && team.socketId !== socket.id) {
      socket.emit("login-response", {
        success: false,
        errorType: "already_logged_in",
        message: `${trimmedName} is already logged in on another device or tab.`
      });
      return;
    }

    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    team.socketId = socket.id;
    team.connected = true;
    team.sessionToken = sessionToken;

    socket.join("teams-room");
    socket.data.teamName = trimmedName;

    socket.emit("login-response", {
      success: true,
      teamName: trimmedName,
      sessionToken,
      quizState: quizState.state,
      stateData: getTeamState(trimmedName)
    });

    io.emit("team-joined", {
      teamName: trimmedName,
      connectedCount: Object.values(quizState.teams).filter((t) => t.connected).length
    });

    broadcastAll();
  });

  socket.on("team-reconnect", (data) => {
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
      ((serverTimestamp - quizState.questionStartTime) / 1000).toFixed(2)
    );

    if (elapsedSeconds > quizState.questionDuration + 0.5) {
      socket.emit("answer-rejected", {
        message: "Time has expired for this question."
      });
      return;
    }

    const currentQ = questions[quizState.currentQuestionIndex];
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
    if (quizState.state === "idle" || quizState.state === "finished") {
      startInstructions();
    }
  });

  socket.on("next-question", () => {
    if (quizState.state === "question" || quizState.state === "transition") {
      clearCurrentTimer();
      const nextIndex = quizState.currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        startQuestion(nextIndex);
      } else {
        finishQuiz();
      }
    }
  });

  socket.on("end-quiz", () => {
    finishQuiz();
  });

  socket.on("reset-quiz", () => {
    resetQuiz();
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.get("/api/teams", (req, res) => {
  const publicList = Object.keys(PREDEFINED_TEAMS).map((name) => ({
    name,
    code: PREDEFINED_TEAMS[name]
  }));
  res.json({ teams: publicList });
});

app.get("/api/quiz-status", (req, res) => {
  res.json(getHostState());
});

const publicPath = path.join(process.cwd(), "public");
app.use(express.static(publicPath));

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/team", (req, res) => {
  res.sendFile(path.join(publicPath, "team.html"));
});

app.get("/team.html", (req, res) => {
  res.sendFile(path.join(publicPath, "team.html"));
});

app.get("/host", (req, res) => {
  res.sendFile(path.join(publicPath, "host.html"));
});

app.get("/host.html", (req, res) => {
  res.sendFile(path.join(publicPath, "host.html"));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`QUIZ ARENA server running at http://localhost:${PORT}`);
});
