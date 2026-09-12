// QUIZ ARENA - Team Client Script
// Handles state transitions, Socket.IO communication, and answer submissions

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
let hasSubmittedCurrentQuestion = false;

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
  socket = io();

  socket.on("connect", () => {
    console.log("Connected to QUIZ ARENA server via Socket.IO:", socket.id);
    // Check if previously logged in
    const storedTeam = sessionStorage.getItem("quiz_team_name");
    const storedToken = sessionStorage.getItem("quiz_session_token");
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

      if (elements.waitingTeamTitle) elements.waitingTeamTitle.textContent = res.teamName;
      if (elements.questionTeamName) elements.questionTeamName.textContent = res.teamName;

      handleServerState(res.stateData);
    } else {
      // SCREEN 3: INVALID LOGIN
      if (elements.invalidErrorTitle) {
        elements.invalidErrorTitle.textContent = res.errorType === "already_logged_in" ? "Already Logged In" : "Invalid Code";
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
      if (elements.waitingTeamTitle) elements.waitingTeamTitle.textContent = res.teamName;
      if (elements.questionTeamName) elements.questionTeamName.textContent = res.teamName;
      handleServerState(res.stateData);
    } else {
      sessionStorage.removeItem("quiz_team_name");
      sessionStorage.removeItem("quiz_session_token");
      currentTeamName = null;
      currentSessionToken = null;
      showView("login");
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
      if (elements.submissionFeedbackCard) {
        elements.submissionFeedbackCard.classList.remove("hidden");
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

  // Question timeout / ended
  socket.on("question-timeout", (data) => {
    if (!hasSubmittedCurrentQuestion) {
      // Disable options and show No Answer
      disableAllOptionButtons();
      if (elements.submissionFeedbackCard) {
        elements.submissionFeedbackCard.classList.remove("hidden");
      }
      if (elements.submittedOptionLabel) {
        elements.submittedOptionLabel.textContent = "Time Expired - No Answer Recorded";
      }
      if (elements.submittedTimeLabel) {
        elements.submittedTimeLabel.textContent = "Time Taken: 30:00 (Max)";
      }
    }
  });

  // Next Question Countdown
  socket.on("show-next-question", (data) => {
    showView("transition");
    if (elements.transitionHeading) {
      elements.transitionHeading.textContent = data.isFinal ? "Final Results in" : "Next Question in";
    }
    if (elements.transitionSubtext) {
      elements.transitionSubtext.textContent = data.isFinal ? "Calculating champion..." : `Get ready for Question ${data.nextQuestionNumber} of ${data.totalQuestions}!`;
    }
    if (elements.transitionCountdown) elements.transitionCountdown.textContent = data.transitionSeconds;
    if (elements.transitionProgress) elements.transitionProgress.style.width = "100%";
  });

let totalQuestionsCount = 10;

  // Quiz Finished
  socket.on("quiz-finished", (data) => {
    if (data && data.totalQuestions) {
      totalQuestionsCount = data.totalQuestions;
    }
    showView("finalScoreboard");
    renderFinalScoreboard(data.scoreboard, data.winner);
    startConfettiAnimation();
  });

  // Quiz Reset
  socket.on("quiz-reset", () => {
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
    showView("finalScoreboard");
    renderFinalScoreboard(stateData.rankings, stateData.rankings[0]);
  }
}

// Populate Question View
function showQuestionScreen(data) {
  showView("question");
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
    const btnEl = elements.optionBtns[letter];
    if (textEl && data.options) {
      textEl.textContent = data.options[letter] || "";
    }
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.classList.remove("selected");
    }
  });

  // Hide submission confirmation
  if (elements.submissionFeedbackCard) {
    elements.submissionFeedbackCard.classList.add("hidden");
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

  // Immediate UI feedback
  selectOptionUI(optionLetter);
  disableAllOptionButtons();

  socket.emit("submit-answer", { answer: optionLetter });
}

// Render final scoreboard on team screen
function renderFinalScoreboard(scoreboard = [], winner = null) {
  if (elements.winnerTeamName) {
    elements.winnerTeamName.textContent = winner ? winner.teamName : "Champion Team";
  }

  // Top 3 Podium
  if (elements.podiumGrid && scoreboard.length > 0) {
    const first = scoreboard[0];
    const second = scoreboard[1];
    const third = scoreboard[2];

    elements.podiumGrid.innerHTML = `
      <!-- 2nd Place -->
      <div class="podium-card">
        <div class="podium-medal">🥈</div>
        <div class="podium-team">${second ? second.teamName : "Team"}</div>
        <div class="podium-score">${second ? `${second.score} Correct (${second.totalTime}s)` : "-"}</div>
      </div>
      <!-- 1st Place -->
      <div class="podium-card first">
        <div class="podium-medal">🥇</div>
        <div class="podium-team" style="font-size: 1.35rem; color: #fbbf24;">${first ? first.teamName : "Team"}</div>
        <div class="podium-score" style="font-weight: 700; color: #fff;">${first ? `${first.score} Correct (${first.totalTime}s)` : "-"}</div>
      </div>
      <!-- 3rd Place -->
      <div class="podium-card">
        <div class="podium-medal">🥉</div>
        <div class="podium-team">${third ? third.teamName : "Team"}</div>
        <div class="podium-score">${third ? `${third.score} Correct (${third.totalTime}s)` : "-"}</div>
      </div>
    `;
  }

  // Table rows
  if (elements.finalScoreboardBody) {
    elements.finalScoreboardBody.innerHTML = scoreboard.map((t, index) => {
      const isCurrentTeam = t.teamName === currentTeamName;
      return `
        <tr style="${isCurrentTeam ? 'background: rgba(99, 102, 241, 0.18); font-weight: 700;' : ''}">
          <td>
            <span class="rank-badge ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : ''}">
              ${index + 1}
            </span>
          </td>
          <td>
            ${t.teamName} ${isCurrentTeam ? '⭐ <span style="font-size: 0.8rem; color: #a5b4fc;">(You)</span>' : ''}
          </td>
          <td style="font-weight: 700; color: #34d399;">
            ${t.score} / ${totalQuestionsCount || 10}
          </td>
          <td style="font-family: monospace; color: #cbd5e1;">
            ${t.totalTime}s
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

// Event Listeners Initialization
function initTeamApp() {
  initSocket();

  // Load and render available teams helper
  async function loadAvailableTeams() {
    const chipsContainer = document.getElementById("teamsListChips");
    if (!chipsContainer) return;
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (data.teams && Array.isArray(data.teams)) {
        activeTeamsList = data.teams;
        chipsContainer.innerHTML = data.teams.map(t => `
          <button type="button" class="team-quick-chip" data-team="${t.name}" data-code="${t.code}" style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0.35rem 0.6rem; font-size: 0.8rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #e2e8f0; cursor: pointer; text-align: left; transition: background 0.15s;">
            <span style="font-weight: 600;">${t.name}</span>
            <span style="font-family: monospace; color: #818cf8; background: rgba(99,102,241,0.2); padding: 0.1rem 0.4rem; border-radius: 4px;">${t.code}</span>
          </button>
        `).join('');

        chipsContainer.querySelectorAll(".team-quick-chip").forEach(btn => {
          btn.addEventListener("click", () => {
            const tName = btn.getAttribute("data-team");
            const tCode = btn.getAttribute("data-code");
            if (elements.teamNameInput) elements.teamNameInput.value = tName;
            if (elements.teamCodeInput) {
              elements.teamCodeInput.value = tCode;
              elements.teamCodeInput.focus();
            }
          });
        });
      }
    } catch (e) {
      console.warn("Could not fetch available teams helper:", e);
    }
  }

  loadAvailableTeams();

  const toggleTeamsBtn = document.getElementById("toggleAvailableTeamsBtn");
  const teamsDropdown = document.getElementById("availableTeamsDropdown");
  if (toggleTeamsBtn && teamsDropdown) {
    toggleTeamsBtn.addEventListener("click", () => {
      teamsDropdown.classList.toggle("hidden");
    });
  }

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
    const feedbackEl = document.getElementById("loginStatusFeedback");

    if (!name || !rawCode) return;

    if (feedbackEl) {
      feedbackEl.classList.add("hidden");
      feedbackEl.textContent = "";
    }

    // Check if user entered admin credentials at team login
    const isTeamAdmin = name.toLowerCase() === "admin";
    const isPasswordAdmin = rawCode === "admin@123";

    if (isTeamAdmin && isPasswordAdmin) {
      try {
        const adminRes = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: rawCode })
        });
        const adminData = await adminRes.json();
        if (adminData.success && (adminData.token || adminData.adminToken)) {
          localStorage.setItem("quiz_admin_token", adminData.token || adminData.adminToken);
          window.location.href = "/admin.html";
          return;
        }
      } catch (err) {
        console.warn("Direct admin login attempt failed:", err);
      }
    }

    if (socket && socket.connected) {
      socket.emit("team-login", {
        teamName: name,
        teamCode: rawCode
      });
    } else {
      if (feedbackEl) {
        feedbackEl.textContent = "Connecting to arena server... Please wait a moment and try again.";
        feedbackEl.classList.remove("hidden");
      }
      if (!socket || !socket.connected) {
        initSocket();
        setTimeout(() => {
          if (socket && socket.connected) {
            socket.emit("team-login", { teamName: name, teamCode: rawCode });
          }
        }, 1200);
      }
    }
  });

  // Try Again on Invalid Login
  elements.tryAgainBtn?.addEventListener("click", () => {
    showView("login");
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
