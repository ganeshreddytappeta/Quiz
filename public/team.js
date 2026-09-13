// QUIZ ARENA - Team Client Script
// Handles state transitions, Socket.IO communication, and answer submissions

// Web Audio Effects Synthesizer (No external asset files required)
const SoundFX = {
  ctx: null,
  enabled: localStorage.getItem("quiz_sound_muted") !== "true",

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  playTone(freq, type = "sine", duration = 0.15, vol = 0.2) {
    if (!this.enabled) return;
    try {
      this.init();
      this.resume();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },

  tick() {
    this.playTone(880, "triangle", 0.05, 0.12);
  },

  submit() {
    this.playTone(523.25, "sine", 0.09, 0.2);
    setTimeout(() => this.playTone(659.25, "sine", 0.14, 0.2), 60);
  },

  correct() {
    this.playTone(523.25, "triangle", 0.15, 0.25);
    setTimeout(() => this.playTone(659.25, "triangle", 0.15, 0.25), 100);
    setTimeout(() => this.playTone(783.99, "triangle", 0.25, 0.3), 200);
    setTimeout(() => this.playTone(1046.50, "triangle", 0.35, 0.35), 300);
  },

  wrong() {
    this.playTone(220, "sawtooth", 0.18, 0.25);
    setTimeout(() => this.playTone(185, "sawtooth", 0.25, 0.25), 140);
  },

  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "triangle", 0.22, 0.3), i * 130);
    });
  }
};

let activeTeamsList = [
  { name: "Team 1", code: "T1A7" },
  { name: "Team 2", code: "T2B8" },
  { name: "Team 3", code: "T3C9" },
  { name: "Team 4", code: "T4D1" },
  { name: "Team 5", code: "T5E2" },
  { name: "Team 6", code: "T6F3" },
  { name: "Team 7", code: "T7G4" },
  { name: "Team 8", code: "T8H5" },
  { name: "Team 9", code: "T9I6" },
  { name: "Team 10", code: "T10J7" }
];

let socket = null;
let currentTeamName = null;
let currentSessionToken = null;
let currentQuestionData = null;
let currentSelectedOption = null;
let hasSubmittedCurrentQuestion = false;
let totalQuestionsCount = 10;

// DOM Elements
const views = {
  login: document.getElementById("viewLogin"),
  invalidLogin: document.getElementById("viewInvalidLogin"),
  waitingRoom: document.getElementById("viewWaitingRoom"),
  instructions: document.getElementById("viewInstructions"),
  question: document.getElementById("viewQuestion"),
  transition: document.getElementById("viewTransition"),
  finalScoreboard: document.getElementById("viewFinalScoreboard")
};

const elements = {
  teamLoginForm: document.getElementById("teamLoginForm"),
  teamNameInput: document.getElementById("teamNameInput"),
  teamCodeInput: document.getElementById("teamCodeInput"),
  tryAgainBtn: document.getElementById("tryAgainBtn"),
  invalidErrorTitle: document.getElementById("invalidErrorTitle"),
  invalidErrorMessage: document.getElementById("invalidErrorMessage"),
  waitingTeamTitle: document.getElementById("waitingTeamTitle"),
  waitingLogoutBtn: document.getElementById("waitingLogoutBtn"),
  teamLogoutTopBtn: document.getElementById("teamLogoutTopBtn"),
  finalLogoutBtn: document.getElementById("finalLogoutBtn"),
  currentTeamDisplay: document.getElementById("currentTeamDisplay"),
  navTeamStatusBadge: document.getElementById("navTeamStatusBadge"),

  // Instructions
  instructionsCountdown: document.getElementById("instructionsCountdown"),
  instructionsProgress: document.getElementById("instructionsProgress"),

  // Question view
  questionTeamName: document.getElementById("questionTeamName"),
  questionNumberMeta: document.getElementById("questionNumberMeta"),
  questionText: document.getElementById("questionText"),
  questionTimerSeconds: document.getElementById("questionTimerSeconds"),
  questionTimer: document.getElementById("questionTimer"),
  optionsGrid: document.getElementById("optionsGrid"),
  optionBtns: {
    A: document.getElementById("optionBtnA"),
    B: document.getElementById("optionBtnB"),
    C: document.getElementById("optionBtnC"),
    D: document.getElementById("optionBtnD")
  },
  optionTexts: {
    A: document.getElementById("optionTextA"),
    B: document.getElementById("optionTextB"),
    C: document.getElementById("optionTextC"),
    D: document.getElementById("optionTextD")
  },
  submissionFeedbackCard: document.getElementById("submissionFeedbackCard"),
  submittedOptionLabel: document.getElementById("submittedOptionLabel"),
  submittedTimeLabel: document.getElementById("submittedTimeLabel"),

  // Transition view
  transitionHeading: document.getElementById("transitionHeading"),
  transitionCountdown: document.getElementById("transitionCountdown"),
  transitionProgress: document.getElementById("transitionProgress"),
  transitionSubtext: document.getElementById("transitionSubtext"),

  // Final scoreboard
  winnerTeamName: document.getElementById("winnerTeamName"),
  podiumGrid: document.getElementById("podiumGrid"),
  finalScoreboardBody: document.getElementById("finalScoreboardBody")
};

// Switch active view
function showView(viewKey) {
  Object.keys(views).forEach(key => {
    if (views[key]) {
      if (key === viewKey) {
        views[key].classList.remove("hidden");
      } else {
        views[key].classList.add("hidden");
      }
    }
  });

  // Top logout button visibility
  if (currentTeamName && viewKey !== "login" && viewKey !== "invalidLogin") {
    elements.teamLogoutTopBtn?.classList.remove("hidden");
    if (elements.currentTeamDisplay) {
      elements.currentTeamDisplay.style.display = "inline";
      elements.currentTeamDisplay.textContent = `🛡️ ${currentTeamName}`;
    }
  } else {
    elements.teamLogoutTopBtn?.classList.add("hidden");
    if (elements.currentTeamDisplay) {
      elements.currentTeamDisplay.style.display = "none";
    }
  }
}

// Format seconds into 00:SS
function formatSeconds(secs) {
  const s = Math.max(0, Math.floor(secs));
  return s < 10 ? `00:0${s}` : `00:${s}`;
}

// Initialize Socket.IO connection
function initSocket() {
  socket = io({
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 25,
    reconnectionDelay: 1000
  });

  socket.on("connect", () => {
    console.log("Connected to QUIZ ARENA server via Socket.IO:", socket.id);
    // Check if previously logged in (check both sessionStorage and localStorage)
    const storedTeam = sessionStorage.getItem("quiz_team_name") || localStorage.getItem("quiz_team_name");
    const storedToken = sessionStorage.getItem("quiz_session_token") || localStorage.getItem("quiz_session_token");
    if (storedTeam && storedToken) {
      socket.emit("team-reconnect", {
        teamName: storedTeam,
        sessionToken: storedToken
      });
    }
  });

  // Login response
  socket.on("login-response", (res) => {
    // If admin credentials were submitted at team login
    if (res.isAdmin || res.redirectUrl || res.redirect) {
      const token = res.adminToken || res.token;
      if (token) {
        localStorage.setItem("quiz_admin_token", token);
      }
      window.location.href = res.redirectUrl || res.redirect || "/admin.html";
      return;
    }

    if (res.success) {
      currentTeamName = res.teamName;
      currentSessionToken = res.sessionToken;
      sessionStorage.setItem("quiz_team_name", res.teamName);
      sessionStorage.setItem("quiz_session_token", res.sessionToken);
      localStorage.setItem("quiz_team_name", res.teamName);
      localStorage.setItem("quiz_session_token", res.sessionToken);

      if (elements.waitingTeamTitle) elements.waitingTeamTitle.textContent = res.teamName;
      if (elements.questionTeamName) elements.questionTeamName.textContent = res.teamName;

      handleServerState(res.stateData);
    } else {
      // SCREEN 3: INVALID LOGIN / ALREADY LOGGED IN
      if (elements.invalidErrorTitle) {
        elements.invalidErrorTitle.textContent = res.errorType === "already_logged_in" ? "Team Already Logged In" : "Invalid Code";
      }
      if (elements.invalidErrorMessage) {
        elements.invalidErrorMessage.textContent = res.message || "The team name or code is incorrect. Please try again.";
      }
      showView("invalidLogin");
    }
  });

  // Reconnect response
  socket.on("reconnect-response", (res) => {
    if (res.success) {
      currentTeamName = res.teamName;
      currentSessionToken = res.sessionToken;
      sessionStorage.setItem("quiz_team_name", res.teamName);
      sessionStorage.setItem("quiz_session_token", res.sessionToken);
      localStorage.setItem("quiz_team_name", res.teamName);
      localStorage.setItem("quiz_session_token", res.sessionToken);
      if (elements.waitingTeamTitle) elements.waitingTeamTitle.textContent = res.teamName;
      if (elements.questionTeamName) elements.questionTeamName.textContent = res.teamName;
      handleServerState(res.stateData);
    } else {
      sessionStorage.removeItem("quiz_team_name");
      sessionStorage.removeItem("quiz_session_token");
      localStorage.removeItem("quiz_team_name");
      localStorage.removeItem("quiz_session_token");
      currentTeamName = null;
      currentSessionToken = null;
      if (res.errorType === "already_logged_in") {
        if (elements.invalidErrorTitle) elements.invalidErrorTitle.textContent = "Team Already Logged In";
        if (elements.invalidErrorMessage) elements.invalidErrorMessage.textContent = res.message || "This team is already logged in on another device.";
        showView("invalidLogin");
      } else {
        showView("login");
      }
    }
  });

  // General team update
  socket.on("team-update", (data) => {
    if (data.teamName === currentTeamName) {
      handleServerState(data);
    }
  });

  // Instructions screen
  socket.on("show-instructions", (data) => {
    showView("instructions");
    if (elements.instructionsCountdown) elements.instructionsCountdown.textContent = data.duration || 5;
    if (elements.instructionsProgress) elements.instructionsProgress.style.width = "100%";
  });

  // Question started
  socket.on("question-start", (data) => {
    currentQuestionData = data;
    hasSubmittedCurrentQuestion = false;
    showQuestionScreen(data);
  });

  // Timer Tick
  socket.on("timer-tick", (data) => {
    const left = data.timerSecondsLeft;
    // Sound tick on final 5 seconds
    if (left <= 5 && left > 0) {
      SoundFX.tick();
    }

    // Update Question timer if in question view
    if (!views.question?.classList.contains("hidden")) {
      if (elements.questionTimerSeconds) {
        elements.questionTimerSeconds.textContent = `${left}s`;
      }
      if (left <= 5) {
        elements.questionTimer?.classList.add("timer-urgent");
      } else {
        elements.questionTimer?.classList.remove("timer-urgent");
      }
    }

    // Update Instructions countdown if in instructions view
    if (!views.instructions?.classList.contains("hidden")) {
      if (elements.instructionsCountdown) elements.instructionsCountdown.textContent = left;
      if (elements.instructionsProgress) {
        elements.instructionsProgress.style.width = `${(left / 5) * 100}%`;
      }
    }

    // Update Transition countdown if in transition view
    if (!views.transition?.classList.contains("hidden")) {
      if (elements.transitionCountdown) elements.transitionCountdown.textContent = left;
      if (elements.transitionProgress) {
        elements.transitionProgress.style.width = `${(left / 5) * 100}%`;
      }
    }
  });

  // Answer received confirmation from server
  socket.on("answer-received", (res) => {
    if (res.success) {
      hasSubmittedCurrentQuestion = true;
      currentSelectedOption = res.selectedAnswer;
      if (elements.submissionFeedbackCard) {
        elements.submissionFeedbackCard.classList.remove("hidden");
        elements.submissionFeedbackCard.classList.remove("card-correct", "card-wrong");
      }
      if (elements.submittedOptionLabel && currentQuestionData) {
        const optText = currentQuestionData.options[res.selectedAnswer] || "";
        elements.submittedOptionLabel.textContent = `${res.selectedAnswer}. ${optText}`;
      }
      if (elements.submittedTimeLabel) {
        elements.submittedTimeLabel.textContent = `Time Taken: ${res.formattedTime || formatSeconds(res.responseTime)}`;
      }
    }
  });

  // Question timeout / ended - Reveal Correct / Wrong Feedback!
  socket.on("question-timeout", (data) => {
    disableAllOptionButtons();
    const correctLetter = data.correctAnswer;

    // Apply visual button highlights
    ["A", "B", "C", "D"].forEach((letter) => {
      const btn = elements.optionBtns[letter];
      if (!btn) return;
      btn.classList.remove("selected");
      if (letter === correctLetter) {
        btn.classList.add("is-correct");
      } else if (letter === currentSelectedOption) {
        btn.classList.add("is-wrong");
      } else {
        btn.classList.add("dimmed");
      }
    });

    if (elements.submissionFeedbackCard) {
      elements.submissionFeedbackCard.classList.remove("hidden");
    }

    if (hasSubmittedCurrentQuestion && currentSelectedOption) {
      const isCorrect = currentSelectedOption === correctLetter;
      if (isCorrect) {
        SoundFX.correct();
        if (elements.submissionFeedbackCard) {
          elements.submissionFeedbackCard.classList.add("card-correct");
          elements.submissionFeedbackCard.classList.remove("card-wrong");
          const titleEl = elements.submissionFeedbackCard.querySelector(".submission-title");
          const waitEl = elements.submissionFeedbackCard.querySelector(".submission-waiting");
          if (titleEl) titleEl.textContent = "🎉 Correct Answer! (+1 Point)";
          if (waitEl) waitEl.textContent = "⚡ Standings updating... Next question soon!";
        }
      } else {
        SoundFX.wrong();
        if (elements.submissionFeedbackCard) {
          elements.submissionFeedbackCard.classList.add("card-wrong");
          elements.submissionFeedbackCard.classList.remove("card-correct");
          const titleEl = elements.submissionFeedbackCard.querySelector(".submission-title");
          const detailEl = elements.submissionFeedbackCard.querySelector(".submission-detail");
          const waitEl = elements.submissionFeedbackCard.querySelector(".submission-waiting");
          if (titleEl) titleEl.textContent = "❌ Incorrect";
          if (detailEl && currentQuestionData) {
            const correctText = currentQuestionData.options[correctLetter] || "";
            detailEl.innerHTML = `You selected: <strong>${currentSelectedOption}</strong> • Correct: <strong style="color: #34d399;">${correctLetter}. ${correctText}</strong>`;
          }
          if (waitEl) waitEl.textContent = "⚡ Keep going! Next question starting soon...";
        }
      }
    } else {
      // Team did not submit in time
      SoundFX.wrong();
      if (elements.submissionFeedbackCard) {
        elements.submissionFeedbackCard.classList.add("card-wrong");
        elements.submissionFeedbackCard.classList.remove("card-correct");
        const titleEl = elements.submissionFeedbackCard.querySelector(".submission-title");
        const detailEl = elements.submissionFeedbackCard.querySelector(".submission-detail");
        const timeEl = document.getElementById("submittedTimeLabel");
        if (titleEl) titleEl.textContent = "⌛ Time Expired!";
        if (detailEl && currentQuestionData) {
          const correctText = currentQuestionData.options[correctLetter] || "";
          detailEl.innerHTML = `No answer submitted • Correct answer was: <strong style="color: #34d399;">${correctLetter}. ${correctText}</strong>`;
        }
        if (timeEl) timeEl.textContent = "Time Taken: 30:00 (Max)";
      }
    }
  });

  // Next Question Countdown
  socket.on("show-next-question", (data) => {
    showView("transition");
    if (elements.transitionHeading) {
      elements.transitionHeading.textContent = data.isFinal ? "Final Results in" : "Next Question in";
    }
    if (data && data.totalQuestions) {
      totalQuestionsCount = data.totalQuestions;
    }
    if (elements.transitionSubtext) {
      elements.transitionSubtext.textContent = data.isFinal ? "Calculating champion..." : `Get ready for Question ${data.nextQuestionNumber} of ${data.totalQuestions}!`;
    }
    if (elements.transitionCountdown) elements.transitionCountdown.textContent = data.transitionSeconds;
    if (elements.transitionProgress) elements.transitionProgress.style.width = "100%";
  });

  // Quiz Finished
  socket.on("quiz-finished", (data) => {
    if (data && data.totalQuestions) {
      totalQuestionsCount = data.totalQuestions;
    }
    showView("finalScoreboard");
    renderFinalScoreboard(data.scoreboard, data.winner, data.totalQuestions);
    startConfettiAnimation();
  });

  // Quiz Reset
  socket.on("quiz-reset", () => {
    currentQuestionData = null;
    currentSelectedOption = null;
    hasSubmittedCurrentQuestion = false;
    resetOptionButtonsUI();
    if (elements.submissionFeedbackCard) {
      elements.submissionFeedbackCard.classList.add("hidden");
      elements.submissionFeedbackCard.classList.remove("card-correct", "card-wrong");
    }
    const canvas = document.getElementById("confettiCanvas");
    if (canvas) canvas.classList.add("hidden");

    if (currentTeamName) {
      showView("waitingRoom");
    } else {
      showView("login");
    }
  });

  // Dynamic teams update from admin
  socket.on("public-teams-updated", (data) => {
    if (data && data.teams) {
      activeTeamsList = data.teams;
    }
  });

  // Team renamed by admin while logged in
  socket.on("team-name-updated", (data) => {
    if (currentTeamName && currentTeamName.toLowerCase() === (data.oldName || "").toLowerCase()) {
      currentTeamName = data.newName;
      sessionStorage.setItem("quiz_team_name", data.newName);
      if (elements.currentTeamDisplay) elements.currentTeamDisplay.textContent = data.newName;
      if (elements.questionTeamName) elements.questionTeamName.textContent = data.newName;
      if (elements.waitingTeamTitle) elements.waitingTeamTitle.textContent = data.newName;
    }
  });

  // Team removed by admin
  socket.on("team-removed", (data) => {
    sessionStorage.removeItem("quiz_team_name");
    sessionStorage.removeItem("quiz_session_token");
    currentTeamName = null;
    currentSessionToken = null;
    if (elements.invalidErrorTitle) elements.invalidErrorTitle.textContent = "Team Session Ended";
    if (elements.invalidErrorMessage) {
      elements.invalidErrorMessage.textContent = data.message || "Your team has been removed by the administrator.";
    }
    showView("invalidLogin");
  });

  socket.on("team-superseded", (data) => {
    sessionStorage.removeItem("quiz_team_name");
    sessionStorage.removeItem("quiz_session_token");
    currentTeamName = null;
    currentSessionToken = null;
    if (elements.invalidErrorTitle) elements.invalidErrorTitle.textContent = "Session Transferred";
    if (elements.invalidErrorMessage) {
      elements.invalidErrorMessage.textContent = data.message || "Your team session was transferred to another window.";
    }
    showView("invalidLogin");
  });

  socket.on("disconnect", () => {
    console.warn("Disconnected from server. Retrying...");
  });
}

// Handle server state snapshot
function handleServerState(stateData) {
  if (!stateData) return;

  const state = stateData.state;
  if (state === "idle" || state === "waiting") {
    showView("waitingRoom");
  } else if (state === "instructions") {
    showView("instructions");
  } else if (state === "question") {
    if (stateData.currentQuestion) {
      currentQuestionData = {
        questionNumber: stateData.currentQuestionIndex + 1,
        totalQuestions: stateData.totalQuestions,
        question: stateData.currentQuestion.question,
        options: stateData.currentQuestion.options
      };
      showQuestionScreen(currentQuestionData);

      // If team had already answered
      if (stateData.currentAnswer) {
        hasSubmittedCurrentQuestion = true;
        selectOptionUI(stateData.currentAnswer);
        disableAllOptionButtons();
        if (elements.submissionFeedbackCard) {
          elements.submissionFeedbackCard.classList.remove("hidden");
        }
        if (elements.submittedOptionLabel) {
          const optText = currentQuestionData.options[stateData.currentAnswer] || "";
          elements.submittedOptionLabel.textContent = `${stateData.currentAnswer}. ${optText}`;
        }
        if (elements.submittedTimeLabel && stateData.currentAnswerTime) {
          elements.submittedTimeLabel.textContent = `Time Taken: ${formatSeconds(stateData.currentAnswerTime)}`;
        }
      }
    }
  } else if (state === "transition") {
    showView("transition");
  } else if (state === "finished") {
    if (stateData.totalQuestions) {
      totalQuestionsCount = stateData.totalQuestions;
    }
    showView("finalScoreboard");
    renderFinalScoreboard(stateData.rankings, stateData.rankings ? stateData.rankings[0] : null, stateData.totalQuestions);
  }
}

function resetOptionButtonsUI() {
  ["A", "B", "C", "D"].forEach((letter) => {
    const btn = elements.optionBtns[letter];
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("selected", "is-correct", "is-wrong", "dimmed");
    }
  });
}

// Populate Question View
function showQuestionScreen(data) {
  showView("question");
  currentSelectedOption = null;
  resetOptionButtonsUI();

  if (elements.questionNumberMeta) {
    elements.questionNumberMeta.textContent = `Question ${data.questionNumber} of ${data.totalQuestions}`;
  }
  if (elements.questionText) {
    elements.questionText.textContent = data.question;
  }
  if (elements.questionTimerSeconds) {
    elements.questionTimerSeconds.textContent = "30s";
  }
  elements.questionTimer?.classList.remove("timer-urgent");

  // Options
  ["A", "B", "C", "D"].forEach(letter => {
    const textEl = elements.optionTexts[letter];
    if (textEl && data.options) {
      textEl.textContent = data.options[letter] || "";
    }
  });

  // Hide and reset submission confirmation
  if (elements.submissionFeedbackCard) {
    elements.submissionFeedbackCard.classList.add("hidden");
    elements.submissionFeedbackCard.classList.remove("card-correct", "card-wrong");
    const waitEl = elements.submissionFeedbackCard.querySelector(".submission-waiting");
    if (waitEl) waitEl.textContent = "⏳ Waiting for other teams to submit...";
  }
}

function selectOptionUI(letter) {
  ["A", "B", "C", "D"].forEach(l => {
    const btn = elements.optionBtns[l];
    if (btn) {
      if (l === letter) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    }
  });
}

function disableAllOptionButtons() {
  ["A", "B", "C", "D"].forEach(letter => {
    const btn = elements.optionBtns[letter];
    if (btn) btn.disabled = true;
  });
}

// Submit answer handler
function submitAnswer(optionLetter) {
  if (hasSubmittedCurrentQuestion || !socket) return;
  hasSubmittedCurrentQuestion = true;
  currentSelectedOption = optionLetter;

  // Audio & UI feedback
  SoundFX.submit();
  selectOptionUI(optionLetter);
  disableAllOptionButtons();

  socket.emit("submit-answer", { answer: optionLetter });
}

// Render final scoreboard on team screen
function renderFinalScoreboard(scoreboard = [], winner = null, totalCount = null) {
  const maxQuestions = totalCount || totalQuestionsCount || 10;

  if (elements.winnerTeamName) {
    elements.winnerTeamName.textContent = winner ? winner.teamName : "Champion Team";
  }

  // Top 3 Podium (gracefully handle 1, 2, or 3+ teams)
  if (elements.podiumGrid && scoreboard.length > 0) {
    let podiumHtml = "";
    if (scoreboard.length === 1) {
      const first = scoreboard[0];
      podiumHtml = `
        <div class="podium-card first" style="grid-column: 1 / -1; max-width: 320px; margin: 0 auto;">
          <div class="podium-medal">🥇</div>
          <div class="podium-team" style="font-size: 1.35rem; color: #fbbf24;">${first.teamName}</div>
          <div class="podium-score" style="font-weight: 700; color: #fff;">${first.score} Correct (${Number(first.totalTime || 0).toFixed(2)}s)</div>
        </div>
      `;
    } else if (scoreboard.length === 2) {
      const first = scoreboard[0];
      const second = scoreboard[1];
      const isTie = first.score === second.score && Math.abs(first.totalTime - second.totalTime) < 0.01;
      podiumHtml = `
        <div class="podium-card ${isTie ? 'first' : ''}">
          <div class="podium-medal">${isTie ? '🥇' : '🥈'}</div>
          <div class="podium-team">${second.teamName}</div>
          <div class="podium-score">${second.score} Correct (${Number(second.totalTime || 0).toFixed(2)}s)</div>
        </div>
        <div class="podium-card first">
          <div class="podium-medal">🥇</div>
          <div class="podium-team" style="font-size: 1.35rem; color: #fbbf24;">${first.teamName}</div>
          <div class="podium-score" style="font-weight: 700; color: #fff;">${first.score} Correct (${Number(first.totalTime || 0).toFixed(2)}s)</div>
        </div>
      `;
    } else {
      const first = scoreboard[0];
      const second = scoreboard[1];
      const third = scoreboard[2];
      podiumHtml = `
        <!-- 2nd Place -->
        <div class="podium-card">
          <div class="podium-medal">${second.rank === 1 ? '🥇' : '🥈'}</div>
          <div class="podium-team">${second.teamName}</div>
          <div class="podium-score">${second.score} Correct (${Number(second.totalTime || 0).toFixed(2)}s)</div>
        </div>
        <!-- 1st Place -->
        <div class="podium-card first">
          <div class="podium-medal">🥇</div>
          <div class="podium-team" style="font-size: 1.35rem; color: #fbbf24;">${first.teamName}</div>
          <div class="podium-score" style="font-weight: 700; color: #fff;">${first.score} Correct (${Number(first.totalTime || 0).toFixed(2)}s)</div>
        </div>
        <!-- 3rd Place -->
        <div class="podium-card">
          <div class="podium-medal">${third.rank <= 2 ? '🥈' : '🥉'}</div>
          <div class="podium-team">${third.teamName}</div>
          <div class="podium-score">${third.score} Correct (${Number(third.totalTime || 0).toFixed(2)}s)</div>
        </div>
      `;
    }
    elements.podiumGrid.innerHTML = podiumHtml;
  }

  // Table rows
  if (elements.finalScoreboardBody) {
    elements.finalScoreboardBody.innerHTML = scoreboard.map((t, index) => {
      const isCurrentTeam = t.teamName === currentTeamName;
      const rankNum = t.rank || (index + 1);
      const rankDisplay = t.displayRank || (t.isTied ? `T-${rankNum}` : `${rankNum}`);
      const rankBadgeClass = rankNum === 1 ? 'rank-1' : rankNum === 2 ? 'rank-2' : rankNum === 3 ? 'rank-3' : '';
      return `
        <tr style="${isCurrentTeam ? 'background: rgba(99, 102, 241, 0.18); font-weight: 700;' : ''}">
          <td>
            <span class="rank-badge ${rankBadgeClass}">
              ${rankDisplay}
            </span>
          </td>
          <td>
            ${t.teamName} ${isCurrentTeam ? '⭐ <span style="font-size: 0.8rem; color: #a5b4fc;">(You)</span>' : ''}
          </td>
          <td style="font-weight: 700; color: #34d399;">
            ${t.score} / ${maxQuestions}
          </td>
          <td style="font-family: monospace; color: #cbd5e1;">
            ${Number(t.totalTime || 0).toFixed(2)}s
          </td>
        </tr>
      `;
    }).join('');
  }
}

// Confetti Effect
function startConfettiAnimation() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  canvas.classList.remove("hidden");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#38bdf8", "#ffffff"];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      d: Math.random() * 40 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }

  let animationFrame;
  let duration = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    duration++;

    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.d);
      p.tilt = Math.sin(p.tiltAngle) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();

      if (p.y > canvas.height) {
        p.x = Math.random() * canvas.width;
        p.y = -20;
      }
    });

    if (duration < 350) {
      animationFrame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add("hidden");
    }
  }

  draw();
}

function setupSoundToggle() {
  const btn = document.getElementById("soundToggleBtn");
  const icon = document.getElementById("soundIcon");
  const text = document.getElementById("soundText");
  if (!btn) return;

  function update() {
    if (SoundFX.enabled) {
      if (icon) icon.textContent = "🔊";
      if (text) text.textContent = "Sound On";
      btn.style.opacity = "1";
    } else {
      if (icon) icon.textContent = "🔇";
      if (text) text.textContent = "Muted";
      btn.style.opacity = "0.6";
    }
  }

  btn.addEventListener("click", () => {
    SoundFX.init();
    SoundFX.enabled = !SoundFX.enabled;
    localStorage.setItem("quiz_sound_muted", (!SoundFX.enabled).toString());
    update();
    if (SoundFX.enabled) SoundFX.submit();
  });

  update();
}

function populateTeamDatalist(teams) {
  const datalist = document.getElementById("registeredTeamsList");
  if (!datalist || !Array.isArray(teams)) return;
  datalist.innerHTML = teams.map((t) => `<option value="${t.name || t.teamName}">`).join("");
}

// Event Listeners Initialization
function initTeamApp() {
  initSocket();
  setupSoundToggle();

  // Pre-load active teams list silently for validation and datalist
  fetch("/api/teams")
    .then(res => res.json())
    .then(data => {
      if (data && data.teams && Array.isArray(data.teams)) {
        activeTeamsList = data.teams;
        populateTeamDatalist(data.teams);
      }
    })
    .catch(() => {});

  // Check URL parameters or sessionStorage for autofill
  const params = new URLSearchParams(window.location.search);
  const paramTeam = params.get("team") || sessionStorage.getItem("quiz_prefill_name");
  const paramCode = params.get("code") || sessionStorage.getItem("quiz_prefill_code");

  if (paramTeam && elements.teamNameInput) {
    elements.teamNameInput.value = paramTeam;
  }
  if (paramCode && elements.teamCodeInput) {
    elements.teamCodeInput.value = paramCode;
  }

  // Clear autofill session storage
  sessionStorage.removeItem("quiz_prefill_name");
  sessionStorage.removeItem("quiz_prefill_code");

  // Login form submit
  elements.teamLoginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (elements.teamNameInput?.value || "").trim();
    const rawCode = (elements.teamCodeInput?.value || "").trim();
    const submitBtn = document.getElementById("loginSubmitBtn");
    const feedbackEl = document.getElementById("loginStatusFeedback");

    if (!rawCode) return;

    if (feedbackEl) {
      feedbackEl.classList.add("hidden");
      feedbackEl.textContent = "";
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying & Joining...";
    }

    try {
      // 1. Direct fast HTTP authentication & session recovery
      const res = await fetch("/api/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: name,
          teamCode: rawCode,
          socketId: socket?.id || null
        })
      });

      const data = await res.json();

      // Check if admin credentials were provided
      if (data.isAdmin || data.redirectUrl) {
        const token = data.token || data.adminToken;
        if (token) {
          localStorage.setItem("quiz_admin_token", token);
        }
        window.location.href = data.redirectUrl || "/admin.html";
        return;
      }

      if (data.success) {
        currentTeamName = data.teamName;
        currentSessionToken = data.sessionToken;
        sessionStorage.setItem("quiz_team_name", data.teamName);
        sessionStorage.setItem("quiz_session_token", data.sessionToken);
        localStorage.setItem("quiz_team_name", data.teamName);
        localStorage.setItem("quiz_session_token", data.sessionToken);

        if (elements.waitingTeamTitle) elements.waitingTeamTitle.textContent = data.teamName;
        if (elements.questionTeamName) elements.questionTeamName.textContent = data.teamName;

        // Ensure socket is connected and bound to team room
        if (socket && socket.connected) {
          socket.emit("team-reconnect", {
            teamName: data.teamName,
            sessionToken: data.sessionToken
          });
        } else {
          initSocket();
        }

        handleServerState(data.stateData);
      } else {
        // SCREEN 3: INVALID LOGIN / ALREADY LOGGED IN
        if (elements.invalidErrorTitle) {
          elements.invalidErrorTitle.textContent = data.errorType === "already_logged_in" ? "Team Already Logged In" : "Invalid Code";
        }
        if (elements.invalidErrorMessage) {
          elements.invalidErrorMessage.textContent = data.message || "The team name or code is incorrect. Please try again.";
        }
        showView("invalidLogin");
      }
    } catch (err) {
      console.warn("HTTP login attempt failed, trying Socket.IO fallback:", err);
      // Fallback via Socket.io
      if (socket && socket.connected) {
        socket.emit("team-login", {
          teamName: name,
          teamCode: rawCode
        });
      } else {
        if (elements.invalidErrorTitle) elements.invalidErrorTitle.textContent = "Connection Error";
        if (elements.invalidErrorMessage) elements.invalidErrorMessage.textContent = "Could not connect to the quiz server. Please try again.";
        showView("invalidLogin");
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login & Join Quiz";
      }
    }
  });

  // Try Again on Invalid Login
  elements.tryAgainBtn?.addEventListener("click", () => {
    showView("login");
    const submitBtn = document.getElementById("loginSubmitBtn");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login & Join Quiz";
    }
    elements.teamCodeInput?.focus();
    elements.teamCodeInput?.select();
  });

  // Option buttons click listeners
  ["A", "B", "C", "D"].forEach(letter => {
    elements.optionBtns[letter]?.addEventListener("click", () => {
      submitAnswer(letter);
    });
  });

  // Logout Handlers
  function doLogout() {
    if (socket) socket.emit("team-logout");
    sessionStorage.removeItem("quiz_team_name");
    sessionStorage.removeItem("quiz_session_token");
    localStorage.removeItem("quiz_team_name");
    localStorage.removeItem("quiz_session_token");
    currentTeamName = null;
    currentSessionToken = null;
    showView("login");
  }

  elements.waitingLogoutBtn?.addEventListener("click", doLogout);
  elements.teamLogoutTopBtn?.addEventListener("click", doLogout);
  elements.finalLogoutBtn?.addEventListener("click", doLogout);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTeamApp);
} else {
  initTeamApp();
}
