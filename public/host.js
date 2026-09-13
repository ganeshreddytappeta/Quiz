// QUIZ ARENA - Admin Dashboard & Live Projector Script
// Features: Admin Authentication Gate, Live Host Controls, Question CRUD Manager, Team Session Management

// Web Audio Effects Synthesizer for Host & Projector Arena
const HostSoundFX = {
  ctx: null,
  enabled: localStorage.getItem("quiz_host_sound_muted") !== "true",

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

  playTone(freq, type = "sine", duration = 0.15, vol = 0.22) {
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

  questionStart() {
    this.playTone(440, "sine", 0.12, 0.25);
    setTimeout(() => this.playTone(880, "sine", 0.2, 0.3), 100);
  },

  roundEnd() {
    this.playTone(330, "triangle", 0.3, 0.25);
    setTimeout(() => this.playTone(440, "triangle", 0.4, 0.3), 120);
  },

  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "triangle", 0.22, 0.3), i * 130);
    });
  }
};

let projectorSafeMode = localStorage.getItem("quiz_projector_safe") !== "false";

let socket = null;
let currentHostState = null;
let adminToken = localStorage.getItem("quiz_admin_token") || null;
let questionsData = [];
let teamsData = [];

const dom = {
  // Navigation & Auth
  adminLoginSection: document.getElementById("adminLoginSection"),
  adminDashboardSection: document.getElementById("adminDashboardSection"),
  adminLoginForm: document.getElementById("adminLoginForm"),
  adminUsernameInput: document.getElementById("adminUsernameInput"),
  adminPasswordInput: document.getElementById("adminPasswordInput"),
  adminLoginError: document.getElementById("adminLoginError"),
  adminLogoutBtn: document.getElementById("adminLogoutBtn"),
  adminSecondaryLogoutBtn: document.getElementById("adminSecondaryLogoutBtn"),
  toggleFullscreenBtn: document.getElementById("toggleFullscreenBtn"),
  btnToggleProjectorMode: document.getElementById("btnToggleProjectorMode"),
  hostSoundToggleBtn: document.getElementById("hostSoundToggleBtn"),
  hostSoundIcon: document.getElementById("hostSoundIcon"),
  hostSoundText: document.getElementById("hostSoundText"),

  // Tabs
  tabBtnArena: document.getElementById("tabBtnArena"),
  tabBtnQuestions: document.getElementById("tabBtnQuestions"),
  tabBtnTeams: document.getElementById("tabBtnTeams"),
  arenaTab: document.getElementById("arenaTab"),
  questionsTab: document.getElementById("questionsTab"),
  teamsTab: document.getElementById("teamsTab"),
  tabQuestionsCountBadge: document.getElementById("tabQuestionsCountBadge"),
  tabTeamsConnectedBadge: document.getElementById("tabTeamsConnectedBadge"),

  // Host Header & Controls
  hostPhaseLabel: document.getElementById("hostPhaseLabel"),
  hostTeamsConnectedCount: document.getElementById("hostTeamsConnectedCount"),
  hostArenaTotalQuestions: document.getElementById("hostArenaTotalQuestions"),
  hostDatabaseText: document.getElementById("hostDatabaseText"),
  hostDatabaseDot: document.getElementById("hostDatabaseDot"),
  btnStartQuiz: document.getElementById("btnStartQuiz"),
  btnNextQuestion: document.getElementById("btnNextQuestion"),
  btnEndQuiz: document.getElementById("btnEndQuiz"),
  btnResetQuiz: document.getElementById("btnResetQuiz"),

  // Active Question Display
  hostQuestionCard: document.getElementById("hostQuestionCard"),
  hostQuestionNumberMeta: document.getElementById("hostQuestionNumberMeta"),
  hostTimerDisplay: document.getElementById("hostTimerDisplay"),
  hostQuestionText: document.getElementById("hostQuestionText"),
  hostOptA: document.getElementById("hostOptA"),
  hostOptB: document.getElementById("hostOptB"),
  hostOptC: document.getElementById("hostOptC"),
  hostOptD: document.getElementById("hostOptD"),
  hostOptTextA: document.getElementById("hostOptTextA"),
  hostOptTextB: document.getElementById("hostOptTextB"),
  hostOptTextC: document.getElementById("hostOptTextC"),
  hostOptTextD: document.getElementById("hostOptTextD"),

  // Table
  hostLiveTableBody: document.getElementById("hostLiveTableBody"),

  // Side Panel
  hostSideCorrectAnswer: document.getElementById("hostSideCorrectAnswer"),
  hostFirstTeamName: document.getElementById("hostFirstTeamName"),
  hostFirstTeamTime: document.getElementById("hostFirstTeamTime"),
  firstAnswerWidget: document.getElementById("firstAnswerWidget"),
  countOptA: document.getElementById("countOptA"),
  countOptB: document.getElementById("countOptB"),
  countOptC: document.getElementById("countOptC"),
  countOptD: document.getElementById("countOptD"),

  // Final Views
  hostActiveGrid: document.getElementById("hostActiveGrid"),
  hostFinalScoreboardView: document.getElementById("hostFinalScoreboardView"),
  hostWinnerTeamName: document.getElementById("hostWinnerTeamName"),
  hostPodiumGrid: document.getElementById("hostPodiumGrid"),
  hostFinalTableBody: document.getElementById("hostFinalTableBody"),
  btnRestartAfterFinish: document.getElementById("btnRestartAfterFinish"),

  // Question Management Panel
  adminQuestionsList: document.getElementById("adminQuestionsList"),
  btnOpenAddQuestionModal: document.getElementById("btnOpenAddQuestionModal"),
  btnResetDefaultQuestions: document.getElementById("btnResetDefaultQuestions"),

  // Question Modal
  questionModalOverlay: document.getElementById("questionModalOverlay"),
  questionModalTitle: document.getElementById("questionModalTitle"),
  questionForm: document.getElementById("questionForm"),
  editingQuestionId: document.getElementById("editingQuestionId"),
  inputQuestionText: document.getElementById("inputQuestionText"),
  inputOptionA: document.getElementById("inputOptionA"),
  inputOptionB: document.getElementById("inputOptionB"),
  inputOptionC: document.getElementById("inputOptionC"),
  inputOptionD: document.getElementById("inputOptionD"),
  correctAnswerSelector: document.getElementById("correctAnswerSelector"),
  questionFormError: document.getElementById("questionFormError"),
  btnCancelQuestionModal: document.getElementById("btnCancelQuestionModal"),
  btnCloseModalBtn: document.getElementById("btnCloseModalBtn"),

  // Teams Tab
  btnOpenAddTeamModal: document.getElementById("btnOpenAddTeamModal"),
  btnResetDefaultTeams: document.getElementById("btnResetDefaultTeams"),
  adminTeamsTableBody: document.getElementById("adminTeamsTableBody"),
  teamSearchInput: document.getElementById("teamSearchInput"),
  statTotalTeams: document.getElementById("statTotalTeams"),
  statOnlineTeams: document.getElementById("statOnlineTeams"),
  statOfflineTeams: document.getElementById("statOfflineTeams"),

  // Team Modal
  teamModalOverlay: document.getElementById("teamModalOverlay"),
  teamModalTitle: document.getElementById("teamModalTitle"),
  btnCancelTeamModal: document.getElementById("btnCancelTeamModal"),
  btnCloseTeamModalBtn: document.getElementById("btnCloseTeamModalBtn"),
  teamEditForm: document.getElementById("teamEditForm"),
  editingTeamId: document.getElementById("editingTeamId"),
  inputTeamName: document.getElementById("inputTeamName"),
  inputTeamCode: document.getElementById("inputTeamCode"),
  btnGenerateRandomCode: document.getElementById("btnGenerateRandomCode"),
  teamFormError: document.getElementById("teamFormError"),
  btnSaveTeam: document.getElementById("btnSaveTeam"),

  // Toast Container
  adminToastContainer: document.getElementById("adminToastContainer")
};

// ============================================================================
// Toast Notifications
// ============================================================================
function showToast(message, type = "info") {
  if (!dom.adminToastContainer) return;
  const toast = document.createElement("div");
  toast.className = "admin-toast";
  
  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  dom.adminToastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Iframe-safe non-blocking confirmation modal
function showConfirmDialog({ title, message, confirmText = "Confirm", isDanger = true, onConfirm }) {
  const overlay = document.getElementById("confirmModalOverlay");
  const titleEl = document.getElementById("confirmModalTitle");
  const msgEl = document.getElementById("confirmModalMessage");
  const okBtn = document.getElementById("confirmModalOkBtn");
  const cancelBtn = document.getElementById("confirmModalCancelBtn");
  const iconEl = document.getElementById("confirmModalIcon");

  if (!overlay || !okBtn || !cancelBtn) {
    if (typeof onConfirm === "function") onConfirm();
    return;
  }

  if (titleEl) titleEl.textContent = title || "Are you sure?";
  if (msgEl) msgEl.textContent = message || "";
  okBtn.textContent = confirmText;
  okBtn.className = isDanger ? "btn-danger" : "btn-primary";
  if (iconEl) iconEl.textContent = isDanger ? "⚠️" : "❓";

  const close = () => {
    overlay.classList.add("hidden");
    okBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  cancelBtn.onclick = close;
  okBtn.onclick = () => {
    close();
    if (typeof onConfirm === "function") onConfirm();
  };

  overlay.classList.remove("hidden");
}

// ============================================================================
// Time Formatting
// ============================================================================
function formatSeconds(secs) {
  if (secs === null || secs === undefined) return "--:--";
  const s = Math.max(0, Math.floor(secs));
  return s < 10 ? `00:0${s}` : `00:${s}`;
}

// ============================================================================
// Admin Authentication Flow
// ============================================================================
async function checkAuthOnStartup() {
  if (adminToken) {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: adminToken })
      });
      const data = await res.json();
      if (data.valid) {
        showAdminDashboard();
        return;
      }
    } catch (e) {
      console.warn("Auth check failed:", e);
    }
  }
  showLoginGate();
}

function showLoginGate() {
  adminToken = null;
  localStorage.removeItem("quiz_admin_token");
  if (dom.adminPasswordInput) dom.adminPasswordInput.value = "";
  if (dom.adminLoginError) {
    dom.adminLoginError.textContent = "";
    dom.adminLoginError.classList.add("hidden");
  }
  dom.adminLoginSection?.classList.remove("hidden");
  dom.adminDashboardSection?.classList.add("hidden");
  dom.adminLogoutBtn?.classList.add("hidden");
  dom.adminSecondaryLogoutBtn?.classList.add("hidden");
  if (dom.adminUsernameInput && !dom.adminUsernameInput.value) {
    dom.adminUsernameInput.value = "admin";
  }
  dom.adminPasswordInput?.focus();
}

function showAdminDashboard() {
  dom.adminLoginSection?.classList.add("hidden");
  dom.adminDashboardSection?.classList.remove("hidden");
  dom.adminLogoutBtn?.classList.remove("hidden");
  dom.adminSecondaryLogoutBtn?.classList.remove("hidden");

  // Connect socket with admin privileges
  if (!socket) {
    initSocket();
  } else {
    socket.emit("admin-auth", { token: adminToken });
  }

  // Load questions and teams
  loadQuestions();
  loadTeams();
}

// Handle Login Form
dom.adminLoginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = dom.adminUsernameInput?.value.trim() || "admin";
  const password = dom.adminPasswordInput?.value.trim() || "";

  if (!password) {
    if (dom.adminLoginError) {
      dom.adminLoginError.textContent = "Please enter admin password 'admin@123'.";
      dom.adminLoginError.classList.remove("hidden");
    }
    return;
  }

  dom.adminLoginError?.classList.add("hidden");
  const submitBtn = document.getElementById("btnAdminSubmitLogin");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      adminToken = data.token;
      localStorage.setItem("quiz_admin_token", data.token);
      showAdminDashboard();
      showToast("Admin access granted. Welcome to Dashboard!", "success");
    } else {
      if (dom.adminLoginError) {
        dom.adminLoginError.textContent = data.message || "Invalid password. Enter 'admin@123'.";
        dom.adminLoginError.classList.remove("hidden");
      }
    }
  } catch (err) {
    if (dom.adminLoginError) {
      dom.adminLoginError.textContent = "Server connection error. Please try again.";
      dom.adminLoginError.classList.remove("hidden");
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// Admin Logout Functionality
async function performAdminLogout() {
  const tokenToRevoke = adminToken || localStorage.getItem("quiz_admin_token");
  
  if (tokenToRevoke) {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenToRevoke}`
        },
        body: JSON.stringify({ token: tokenToRevoke })
      });
    } catch (e) {
      console.warn("Logout API warning:", e);
    }
  }

  if (socket) {
    socket.emit("admin-logout", { token: tokenToRevoke });
  }

  adminToken = null;
  localStorage.removeItem("quiz_admin_token");

  // Redirect to the team login page
  window.location.href = "/team.html";
}

dom.adminLogoutBtn?.addEventListener("click", performAdminLogout);
dom.adminSecondaryLogoutBtn?.addEventListener("click", performAdminLogout);

// ============================================================================
// Tab Navigation
// ============================================================================
function setupTabs() {
  const tabs = [
    { btn: dom.tabBtnArena, panel: dom.arenaTab },
    { btn: dom.tabBtnQuestions, panel: dom.questionsTab },
    { btn: dom.tabBtnTeams, panel: dom.teamsTab }
  ];

  tabs.forEach(({ btn, panel }) => {
    btn?.addEventListener("click", () => {
      tabs.forEach(t => {
        t.btn?.classList.remove("active");
        t.panel?.classList.add("hidden");
      });
      btn.classList.add("active");
      panel?.classList.remove("hidden");

      if (panel === dom.questionsTab) {
        loadQuestions();
      } else if (panel === dom.teamsTab) {
        loadTeams();
      }
    });
  });
}

// ============================================================================
// Socket.IO Integration
// ============================================================================
function initSocket() {
  socket = io({
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 25,
    reconnectionDelay: 1000
  });

  socket.on("connect", () => {
    console.log("Admin socket connected:", socket.id);
    if (adminToken) {
      socket.emit("admin-auth", { token: adminToken });
    } else {
      socket.emit("host-connect");
    }
  });

  socket.on("admin-auth-required", () => {
    showLoginGate();
  });

  socket.on("admin-auth-failed", (data) => {
    showLoginGate();
    if (dom.adminLoginError) {
      dom.adminLoginError.textContent = data.message || "Admin authorization failed.";
      dom.adminLoginError.classList.remove("hidden");
    }
  });

  socket.on("admin-auth-success", (data) => {
    if (data.state) {
      currentHostState = data.state;
      renderAll(data.state);
    }
    if (data.questions) {
      questionsData = data.questions;
      renderQuestionsList();
    }
    if (data.teams) {
      teamsData = data.teams;
      renderTeamsTable();
    }
  });

  socket.on("host-init", (data) => {
    currentHostState = data;
    renderAll(data);
  });

  socket.on("host-update", (data) => {
    currentHostState = data;
    renderAll(data);
  });

  socket.on("teams-updated", (data) => {
    if (data && data.teams) {
      teamsData = data.teams;
      renderTeamsTable();
    }
  });

  socket.on("questions-updated", (data) => {
    if (data.questions) {
      questionsData = data.questions;
      renderQuestionsList();
      if (dom.hostArenaTotalQuestions) {
        dom.hostArenaTotalQuestions.textContent = `${questionsData.length} Questions`;
      }
    }
  });

  socket.on("show-instructions", (data) => {
    if (dom.hostPhaseLabel) {
      dom.hostPhaseLabel.textContent = `📋 Instructions (${data.duration}s Countdown)`;
    }
    if (dom.hostQuestionText) {
      dom.hostQuestionText.textContent = "Showing rules and 5-second countdown to all teams...";
    }
  });

  socket.on("question-start", (data) => {
    HostSoundFX.questionStart();
    updateQuestionDisplay(data);
    resetSidePanel(data);
  });

  socket.on("timer-tick", (data) => {
    const secs = data.timerSecondsLeft;
    if (secs <= 5 && secs > 0) {
      HostSoundFX.tick();
    }
    if (dom.hostTimerDisplay) {
      dom.hostTimerDisplay.textContent = `⏱️ ${secs}s`;
    }
  });

  socket.on("live-answer-update", (data) => {
    if (data.isFirstCorrect) {
      if (dom.hostFirstTeamName) dom.hostFirstTeamName.textContent = data.teamName;
      if (dom.hostFirstTeamTime) dom.hostFirstTeamTime.textContent = `${data.time}s`;
      dom.firstAnswerWidget?.classList.add("pulse-glow");
      setTimeout(() => dom.firstAnswerWidget?.classList.remove("pulse-glow"), 1000);
    }
    renderBreakdown();
  });

  socket.on("question-timeout", (data) => {
    HostSoundFX.roundEnd();
    if (dom.hostPhaseLabel) {
      dom.hostPhaseLabel.textContent = "⌛ Round Ended (5s Transition to Next)";
    }
    highlightCorrectOption(data.correctAnswer);
    if (dom.hostSideCorrectAnswer) {
      dom.hostSideCorrectAnswer.textContent = `Option ${data.correctAnswer}`;
    }
    // Re-render table to reveal full choices
    if (currentHostState) {
      renderLiveTable(data.rankings || currentHostState.rankings, currentHostState.teams);
    }
  });

  socket.on("show-next-question", (data) => {
    if (dom.hostPhaseLabel) {
      dom.hostPhaseLabel.textContent = data.isFinal
        ? `🏁 Preparing Final Scoreboard (${data.transitionSeconds}s)`
        : `⏭️ Next Question ${data.nextQuestionNumber} in ${data.transitionSeconds}s`;
    }
  });

  socket.on("quiz-finished", (data) => {
    HostSoundFX.fanfare();
    renderFinalScoreboard(data);
    startConfettiAnimation();
  });

  socket.on("quiz-reset", () => {
    if (dom.hostFinalScoreboardView) dom.hostFinalScoreboardView.classList.add("hidden");
    if (dom.hostActiveGrid) dom.hostActiveGrid.classList.remove("hidden");
    if (dom.btnStartQuiz) dom.btnStartQuiz.disabled = false;
    if (dom.btnNextQuestion) dom.btnNextQuestion.disabled = true;
    if (dom.hostFirstTeamName) dom.hostFirstTeamName.textContent = "Waiting...";
    if (dom.hostFirstTeamTime) dom.hostFirstTeamTime.textContent = "--:--";
    if (dom.hostSideCorrectAnswer) dom.hostSideCorrectAnswer.textContent = "-";
    resetOptionButtons();
    showToast("Quiz has been reset to lobby.", "info");
  });
}

// ============================================================================
// Render Host Live Quiz State
// ============================================================================
function renderAll(state) {
  if (!state) return;

  // 1. Header Bar Labels
  if (dom.hostPhaseLabel) {
    const phaseNames = {
      idle: "Waiting in Lobby",
      instructions: "Rules Countdown (5s)",
      question: `Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}`,
      transition: "Preparing Next Round",
      finished: "Quiz Completed"
    };
    dom.hostPhaseLabel.textContent = phaseNames[state.state] || state.state;
  }

  if (dom.hostTeamsConnectedCount) {
    dom.hostTeamsConnectedCount.textContent = `${state.connectedCount} / ${state.totalTeams} Teams`;
  }

  if (dom.tabTeamsConnectedBadge) {
    dom.tabTeamsConnectedBadge.textContent = `${state.connectedCount}/${state.totalTeams}`;
  }

  if (dom.hostArenaTotalQuestions) {
    dom.hostArenaTotalQuestions.textContent = `${state.totalQuestions} Questions`;
  }

  // Database indicator
  if (dom.hostDatabaseText && dom.hostDatabaseDot) {
    const isMongo = state.databaseStatus?.connected;
    if (isMongo) {
      dom.hostDatabaseText.textContent = "MongoDB Connected";
      dom.hostDatabaseDot.style.background = "#10b981";
      dom.hostDatabaseText.style.color = "#34d399";
      dom.hostDatabaseText.title = "Connected to MongoDB database";
    } else {
      dom.hostDatabaseText.textContent = "In-Memory Active";
      dom.hostDatabaseDot.style.background = "#38bdf8";
      dom.hostDatabaseText.style.color = "#7dd3fc";
      dom.hostDatabaseText.title = state.databaseStatus?.status || "Running in high-speed in-memory mode";
    }
  }

  // 2. Control Buttons State
  if (dom.btnStartQuiz) {
    dom.btnStartQuiz.disabled = state.state === "question" || state.state === "instructions" || state.state === "transition";
  }
  if (dom.btnNextQuestion) {
    dom.btnNextQuestion.disabled = state.state !== "question" && state.state !== "transition" && state.state !== "instructions";
  }

  // 3. Question Card
  if (state.state === "question" && state.currentQuestion) {
    updateQuestionDisplay({
      questionIndex: state.currentQuestionIndex,
      questionNumber: state.currentQuestionIndex + 1,
      totalQuestions: state.totalQuestions,
      question: state.currentQuestion.question,
      options: state.currentQuestion.options,
      correctAnswer: state.currentQuestion.correctAnswer
    });
  } else if (state.state === "idle") {
    if (dom.hostQuestionNumberMeta) dom.hostQuestionNumberMeta.textContent = `Lobby Ready (${state.totalQuestions} Questions Loaded)`;
    if (dom.hostQuestionText) dom.hostQuestionText.textContent = 'Teams can join using their passcodes. Click "Start Quiz" above when ready!';
    if (dom.hostTimerDisplay) dom.hostTimerDisplay.textContent = "⏱️ 30s";
    resetOptionButtons();
  }

  // 4. Live Rankings Table
  renderLiveTable(state.rankings, state.teams);

  // 5. First Correct Answer Widget
  if (state.firstCorrectAnswerTeam) {
    if (dom.hostFirstTeamName) dom.hostFirstTeamName.textContent = state.firstCorrectAnswerTeam;
    if (dom.hostFirstTeamTime) dom.hostFirstTeamTime.textContent = `${state.firstCorrectAnswerTime}s`;
  } else {
    if (dom.hostFirstTeamName) dom.hostFirstTeamName.textContent = "Waiting...";
    if (dom.hostFirstTeamTime) dom.hostFirstTeamTime.textContent = "--:--";
  }

  // 6. Correct Answer Display (Respect Projector Safe Mode)
  if (state.currentQuestion?.correctAnswer) {
    if (dom.hostSideCorrectAnswer) {
      if (projectorSafeMode && state.state === "question") {
        dom.hostSideCorrectAnswer.innerHTML = `<span style="font-size: 0.82rem; color: #94a3b8; font-weight: 600;">🔒 Hidden until Timeout</span>`;
      } else {
        dom.hostSideCorrectAnswer.textContent = `Option ${state.currentQuestion.correctAnswer}`;
      }
    }
  }

  // 7. Breakdown
  renderBreakdown(state.teams);

  // 8. Finished state
  if (state.state === "finished") {
    renderFinalScoreboard({ scoreboard: state.rankings, winner: state.rankings[0] });
  } else {
    dom.hostFinalScoreboardView?.classList.add("hidden");
    dom.hostActiveGrid?.classList.remove("hidden");
  }
}

function updateQuestionDisplay(data) {
  if (dom.hostQuestionNumberMeta) {
    dom.hostQuestionNumberMeta.textContent = `Question ${data.questionNumber} of ${data.totalQuestions}`;
  }
  if (dom.hostQuestionText) {
    dom.hostQuestionText.textContent = data.question;
  }
  if (dom.hostTimerDisplay) {
    dom.hostTimerDisplay.textContent = `⏱️ ${data.duration || 30}s`;
  }

  if (data.options) {
    if (dom.hostOptTextA) dom.hostOptTextA.textContent = data.options.A || "";
    if (dom.hostOptTextB) dom.hostOptTextB.textContent = data.options.B || "";
    if (dom.hostOptTextC) dom.hostOptTextC.textContent = data.options.C || "";
    if (dom.hostOptTextD) dom.hostOptTextD.textContent = data.options.D || "";
  }

  resetOptionButtons();
}

function resetOptionButtons() {
  [dom.hostOptA, dom.hostOptB, dom.hostOptC, dom.hostOptD].forEach((btn) => {
    if (!btn) return;
    btn.style.background = "";
    btn.style.borderColor = "";
    btn.style.boxShadow = "";
  });
}

function highlightCorrectOption(letter) {
  resetOptionButtons();
  const map = { A: dom.hostOptA, B: dom.hostOptB, C: dom.hostOptC, D: dom.hostOptD };
  const target = map[letter];
  if (target) {
    target.style.background = "rgba(16, 185, 129, 0.25)";
    target.style.borderColor = "#10b981";
    target.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.4)";
  }
}

function resetSidePanel(data) {
  if (dom.hostFirstTeamName) dom.hostFirstTeamName.textContent = "Waiting...";
  if (dom.hostFirstTeamTime) dom.hostFirstTeamTime.textContent = "--:--";
  if (dom.hostSideCorrectAnswer) {
    dom.hostSideCorrectAnswer.textContent = data?.correctAnswer ? `Option ${data.correctAnswer}` : "-";
  }
  renderBreakdown([]);
}

function renderBreakdown(teams) {
  const currentTeams = teams || (currentHostState?.teams || []);
  const counts = { A: 0, B: 0, C: 0, D: 0 };

  currentTeams.forEach(t => {
    if (t.currentAnswer && counts[t.currentAnswer] !== undefined) {
      counts[t.currentAnswer]++;
    }
  });

  if (dom.countOptA) dom.countOptA.textContent = counts.A;
  if (dom.countOptB) dom.countOptB.textContent = counts.B;
  if (dom.countOptC) dom.countOptC.textContent = counts.C;
  if (dom.countOptD) dom.countOptD.textContent = counts.D;
}

function renderLiveTable(rankings, teams) {
  if (!dom.hostLiveTableBody) return;
  const list = rankings || [];

  if (list.length === 0) {
    dom.hostLiveTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">
          No teams connected yet. Teams join at <strong>/team.html</strong>
        </td>
      </tr>
    `;
    return;
  }

  const isRoundActive = currentHostState?.state === "question";

  dom.hostLiveTableBody.innerHTML = list.map((team, idx) => {
    const rankNum = idx + 1;
    const rankBadgeClass = rankNum === 1 ? "rank-1" : rankNum === 2 ? "rank-2" : rankNum === 3 ? "rank-3" : "rank-other";

    let resultBadge = `<span class="badge-status badge-waiting">Thinking...</span>`;
    let answerPill = `<span style="color: var(--text-dim); font-size: 0.85rem;">-</span>`;
    let firstBadge = "";

    if (team.currentAnswer) {
      if (projectorSafeMode && isRoundActive) {
        // Fair-play mask: prevent audience/teams from copying answers
        answerPill = `<span style="font-weight: 700; color: #34d399; background: rgba(16, 185, 129, 0.2); padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">● Locked In</span>`;
        resultBadge = `<span class="badge-status" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">✓ Submitted</span>`;
      } else {
        answerPill = `<span style="font-weight: 800; color: #fff; background: rgba(99, 102, 241, 0.25); padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid rgba(99, 102, 241, 0.4);">${team.currentAnswer}</span>`;
        if (team.currentResult === "correct") {
          resultBadge = `<span class="badge-status badge-correct">✓ Correct</span>`;
        } else if (team.currentResult === "wrong") {
          resultBadge = `<span class="badge-status badge-wrong">✗ Incorrect</span>`;
        } else if (team.currentResult === "no-answer") {
          resultBadge = `<span class="badge-status badge-wrong">⌛ Time Out</span>`;
        }

        if (team.isFirstCorrect) {
          firstBadge = `<span style="margin-left: 0.5rem; font-size: 0.75rem; background: #f59e0b; color: #000; font-weight: 800; padding: 0.1rem 0.4rem; border-radius: 4px;">⚡ 1st</span>`;
        }
      }
    }

    const timeDisplay = team.currentAnswerTime !== null && team.currentAnswerTime !== undefined
      ? `${team.currentAnswerTime}s`
      : `--:--`;

    const connStatus = team.connected
      ? `<span style="color: #34d399; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;"><span class="live-dot" style="width: 8px; height: 8px;"></span> Online</span>`
      : `<span style="color: #94a3b8; font-size: 0.85rem;">Offline</span>`;

    return `
      <tr>
        <td><span class="rank-badge ${rankBadgeClass}">${rankNum}</span></td>
        <td style="font-weight: 700; color: #fff;">${team.teamName} ${firstBadge}</td>
        <td style="text-align: center;">${answerPill}</td>
        <td style="font-family: monospace; color: #cbd5e1;">${timeDisplay}</td>
        <td>${resultBadge}</td>
        <td style="text-align: center; font-weight: 800; font-size: 1.1rem; color: #38bdf8;">${team.score}</td>
        <td>${connStatus}</td>
      </tr>
    `;
  }).join('');
}

function renderFinalScoreboard(data) {
  if (!dom.hostFinalScoreboardView) return;
  dom.hostActiveGrid?.classList.add("hidden");
  dom.hostFinalScoreboardView.classList.remove("hidden");

  const scoreboard = data.scoreboard || [];
  const winner = data.winner || scoreboard[0];

  if (dom.hostWinnerTeamName && winner) {
    dom.hostWinnerTeamName.textContent = `${winner.teamName} (Score: ${winner.score})`;
  }

  // Top 3 Podium
  if (dom.hostPodiumGrid && scoreboard.length > 0) {
    const top3 = scoreboard.slice(0, 3);
    const order = [1, 0, 2]; // 2nd, 1st, 3rd

    dom.hostPodiumGrid.innerHTML = order.map(idx => {
      const t = top3[idx];
      if (!t) return "";
      const pos = idx + 1;
      const stepClass = pos === 1 ? "step-1" : pos === 2 ? "step-2" : "step-3";
      const medal = pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉";

      return `
        <div class="podium-step ${stepClass}">
          <div class="podium-rank-icon">${medal}</div>
          <div class="podium-team">${t.teamName}</div>
          <div class="podium-score">${t.score} pts</div>
          <div class="podium-time">${t.totalTime}s total</div>
        </div>
      `;
    }).join('');
  }

  // Complete final standings
  if (dom.hostFinalTableBody) {
    dom.hostFinalTableBody.innerHTML = scoreboard.map((t, idx) => {
      const rankNum = idx + 1;
      const rankClass = rankNum === 1 ? "rank-1" : rankNum === 2 ? "rank-2" : rankNum === 3 ? "rank-3" : "rank-other";
      return `
        <tr>
          <td><span class="rank-badge ${rankClass}">${rankNum}</span></td>
          <td style="font-weight: 700; color: #fff;">${t.teamName}</td>
          <td style="font-weight: 800; color: #38bdf8; font-size: 1.1rem;">${t.score} Correct</td>
          <td style="font-family: monospace; color: #cbd5e1;">${t.totalTime}s</td>
        </tr>
      `;
    }).join('');
  }
}

// Confetti
function startConfettiAnimation() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  canvas.classList.remove("hidden");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#f59e0b", "#fbbf24", "#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#38bdf8", "#ffffff"];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 7 + 4,
      d: Math.random() * 50 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: Math.random() * 0.08 + 0.04,
      tiltAngle: 0
    });
  }

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

    if (duration < 400) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add("hidden");
    }
  }

  draw();
}

// ============================================================================
// QUESTION MANAGEMENT ("from there we can give questions for that")
// ============================================================================

// Fetch questions from Server REST API
async function loadQuestions() {
  if (!adminToken) return;

  try {
    const res = await fetch("/api/admin/questions", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && Array.isArray(data.questions)) {
      questionsData = data.questions;
      renderQuestionsList();
      if (dom.tabQuestionsCountBadge) {
        dom.tabQuestionsCountBadge.textContent = questionsData.length;
      }
      if (dom.hostArenaTotalQuestions) {
        dom.hostArenaTotalQuestions.textContent = `${questionsData.length} Questions`;
      }
    }
  } catch (err) {
    console.error("Failed to load questions:", err);
  }
}

// Render the Questions List
function renderQuestionsList() {
  if (!dom.adminQuestionsList) return;

  if (dom.tabQuestionsCountBadge) {
    dom.tabQuestionsCountBadge.textContent = questionsData.length;
  }

  if (questionsData.length === 0) {
    dom.adminQuestionsList.innerHTML = `
      <div class="card-glass" style="text-align: center; padding: 3rem;">
        <h3 style="color: #fff; margin-bottom: 0.5rem;">No Questions in Bank</h3>
        <p style="color: var(--text-dim); margin-bottom: 1.5rem;">Click "Add New Question" to create questions for the tournament.</p>
        <button class="btn-primary" onclick="openAddQuestionModal()">➕ Add First Question</button>
      </div>
    `;
    return;
  }

  dom.adminQuestionsList.innerHTML = questionsData.map((q, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === questionsData.length - 1;

    return `
      <div class="qm-question-card" data-id="${q.id}">
        <div class="qm-q-header">
          <div class="qm-q-title-row">
            <span class="qm-q-badge">Q${idx + 1}</span>
            <div class="qm-q-text">${escapeHtml(q.question)}</div>
          </div>
          <div class="qm-q-controls">
            <button class="qm-action-btn" title="Move Up" onclick="moveQuestion(${q.id}, -1)" ${isFirst ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
              ⬆️
            </button>
            <button class="qm-action-btn" title="Move Down" onclick="moveQuestion(${q.id}, 1)" ${isLast ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
              ⬇️
            </button>
            <button class="qm-action-btn" title="Edit Question" onclick="openEditQuestionModal(${q.id})">
              ✏️ Edit
            </button>
            <button class="qm-action-btn btn-delete" title="Delete Question" onclick="deleteQuestion(${q.id})">
              🗑️ Delete
            </button>
          </div>
        </div>

        <div class="qm-options-grid">
          <div class="qm-option-pill ${q.correctAnswer === 'A' ? 'is-correct' : ''}">
            <span class="qm-opt-letter">A</span>
            <span>${escapeHtml(q.options.A)}</span>
            ${q.correctAnswer === 'A' ? '<span class="qm-correct-tag">✓ Correct</span>' : ''}
          </div>
          <div class="qm-option-pill ${q.correctAnswer === 'B' ? 'is-correct' : ''}">
            <span class="qm-opt-letter">B</span>
            <span>${escapeHtml(q.options.B)}</span>
            ${q.correctAnswer === 'B' ? '<span class="qm-correct-tag">✓ Correct</span>' : ''}
          </div>
          <div class="qm-option-pill ${q.correctAnswer === 'C' ? 'is-correct' : ''}">
            <span class="qm-opt-letter">C</span>
            <span>${escapeHtml(q.options.C)}</span>
            ${q.correctAnswer === 'C' ? '<span class="qm-correct-tag">✓ Correct</span>' : ''}
          </div>
          <div class="qm-option-pill ${q.correctAnswer === 'D' ? 'is-correct' : ''}">
            <span class="qm-opt-letter">D</span>
            <span>${escapeHtml(q.options.D)}</span>
            ${q.correctAnswer === 'D' ? '<span class="qm-correct-tag">✓ Correct</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Modal open/close handlers
window.openAddQuestionModal = function() {
  if (dom.questionModalTitle) dom.questionModalTitle.textContent = "➕ Add New Quiz Question";
  if (dom.editingQuestionId) dom.editingQuestionId.value = "";
  if (dom.inputQuestionText) dom.inputQuestionText.value = "";
  if (dom.inputOptionA) dom.inputOptionA.value = "";
  if (dom.inputOptionB) dom.inputOptionB.value = "";
  if (dom.inputOptionC) dom.inputOptionC.value = "";
  if (dom.inputOptionD) dom.inputOptionD.value = "";
  setModalCorrectAnswer("A");
  dom.questionFormError?.classList.add("hidden");
  dom.questionModalOverlay?.classList.remove("hidden");
};

window.openEditQuestionModal = function(id) {
  const q = questionsData.find(item => item.id === id);
  if (!q) return;

  if (dom.questionModalTitle) dom.questionModalTitle.textContent = `✏️ Edit Quiz Question #${id}`;
  if (dom.editingQuestionId) dom.editingQuestionId.value = q.id;
  if (dom.inputQuestionText) dom.inputQuestionText.value = q.question;
  if (dom.inputOptionA) dom.inputOptionA.value = q.options.A;
  if (dom.inputOptionB) dom.inputOptionB.value = q.options.B;
  if (dom.inputOptionC) dom.inputOptionC.value = q.options.C;
  if (dom.inputOptionD) dom.inputOptionD.value = q.options.D;
  setModalCorrectAnswer(q.correctAnswer);
  dom.questionFormError?.classList.add("hidden");
  dom.questionModalOverlay?.classList.remove("hidden");
};

function closeModal() {
  dom.questionModalOverlay?.classList.add("hidden");
}

dom.btnCancelQuestionModal?.addEventListener("click", closeModal);
dom.btnCloseModalBtn?.addEventListener("click", closeModal);
dom.btnOpenAddQuestionModal?.addEventListener("click", window.openAddQuestionModal);

// Radio Selector in Modal
function setModalCorrectAnswer(letter) {
  const labels = dom.correctAnswerSelector?.querySelectorAll(".ans-radio-label");
  labels?.forEach(lbl => {
    const radio = lbl.querySelector('input[type="radio"]');
    if (lbl.dataset.ans === letter) {
      lbl.classList.add("selected");
      if (radio) radio.checked = true;
    } else {
      lbl.classList.remove("selected");
      if (radio) radio.checked = false;
    }
  });
}

dom.correctAnswerSelector?.querySelectorAll(".ans-radio-label").forEach(lbl => {
  lbl.addEventListener("click", () => {
    setModalCorrectAnswer(lbl.dataset.ans);
  });
});

// Submit Add / Edit Question
dom.questionForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = dom.inputQuestionText.value.trim();
  const optionA = dom.inputOptionA.value.trim();
  const optionB = dom.inputOptionB.value.trim();
  const optionC = dom.inputOptionC.value.trim();
  const optionD = dom.inputOptionD.value.trim();
  const selectedRadio = dom.correctAnswerSelector?.querySelector('input[name="correctAnswerRadio"]:checked');
  const correctAnswer = selectedRadio ? selectedRadio.value : "A";
  const editingId = dom.editingQuestionId.value;

  if (!question || !optionA || !optionB || !optionC || !optionD) {
    if (dom.questionFormError) {
      dom.questionFormError.textContent = "Please fill out the question and all 4 options.";
      dom.questionFormError.classList.remove("hidden");
    }
    return;
  }

  const payload = {
    question,
    options: { A: optionA, B: optionB, C: optionC, D: optionD },
    correctAnswer
  };

  const isEdit = Boolean(editingId);
  const url = isEdit ? `/api/admin/questions/${editingId}` : "/api/admin/questions";
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      closeModal();
      showToast(isEdit ? "Question updated successfully!" : "Question added successfully!", "success");
      loadQuestions();
    } else {
      if (dom.questionFormError) {
        dom.questionFormError.textContent = data.message || "Failed to save question.";
        dom.questionFormError.classList.remove("hidden");
      }
    }
  } catch (err) {
    if (dom.questionFormError) {
      dom.questionFormError.textContent = "Network error. Could not reach the server.";
      dom.questionFormError.classList.remove("hidden");
    }
  }
});

// Delete Question
window.deleteQuestion = async function(id) {
  if (questionsData.length <= 1) {
    showToast("The quiz must have at least 1 question. Cannot delete the only remaining question.", "error");
    return;
  }

  showConfirmDialog({
    title: "Delete Question",
    message: `Are you sure you want to delete Question #${id}? This action cannot be undone.`,
    confirmText: "Delete Question",
    isDanger: true,
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/questions/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (data.success) {
          showToast("Question deleted successfully.", "info");
          loadQuestions();
        } else {
          showToast(data.message || "Could not delete question.", "error");
        }
      } catch (err) {
        showToast("Network error while deleting question.", "error");
      }
    }
  });
};

// Move Question (Reorder)
window.moveQuestion = async function(id, direction) {
  const currentIndex = questionsData.findIndex(q => q.id === id);
  if (currentIndex === -1) return;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= questionsData.length) return;

  // Swap
  const ids = questionsData.map(q => q.id);
  const temp = ids[currentIndex];
  ids[currentIndex] = ids[targetIndex];
  ids[targetIndex] = temp;

  try {
    const res = await fetch("/api/admin/questions/reorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ ids })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Reorder failed:", errText);
      showToast("Failed to reorder questions.", "error");
      return;
    }
    const data = await res.json();
    if (data.success) {
      loadQuestions();
    } else {
      showToast(data.message || "Could not reorder questions.", "error");
    }
  } catch (err) {
    console.error("Reorder failed:", err);
    showToast("Network error while reordering questions.", "error");
  }
};

// Reset Default Questions
dom.btnResetDefaultQuestions?.addEventListener("click", () => {
  showConfirmDialog({
    title: "Reset Question Bank",
    message: "Reset the question bank back to the standard 10 general knowledge questions? Any custom questions will be replaced.",
    confirmText: "Reset Questions",
    isDanger: true,
    onConfirm: async () => {
      try {
        const res = await fetch("/api/admin/questions/reset", {
          method: "POST",
          headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (data.success) {
          showToast("Questions restored to default set.", "success");
          loadQuestions();
        } else {
          showToast(data.message || "Failed to reset questions.", "error");
        }
      } catch (err) {
        showToast("Error resetting questions.", "error");
      }
    }
  });
});

// ============================================================================
// TEAMS MANAGEMENT TAB
// ============================================================================
async function loadTeams() {
  if (!adminToken) return;
  try {
    const res = await fetch("/api/admin/teams", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.teams && Array.isArray(data.teams)) {
      teamsData = data.teams;
      renderTeamsTable();
    }
  } catch (err) {
    console.warn("Error loading teams:", err);
  }
}

function renderTeamsTable() {
  if (!dom.adminTeamsTableBody) return;
  const currentTeams = currentHostState?.teams || [];

  // Filter by search query if typed
  const searchQuery = dom.teamSearchInput ? dom.teamSearchInput.value.trim().toLowerCase() : "";
  const filteredTeams = searchQuery
    ? teamsData.filter(t => (t.name || "").toLowerCase().includes(searchQuery) || (t.code || "").toLowerCase().includes(searchQuery))
    : teamsData;

  // Update stats counters
  const totalCount = teamsData.length;
  const onlineCount = teamsData.filter(t => currentTeams.some(ct => ct.teamName.toLowerCase() === t.name.toLowerCase() && ct.connected)).length;
  const offlineCount = totalCount - onlineCount;

  if (dom.statTotalTeams) dom.statTotalTeams.textContent = totalCount;
  if (dom.statOnlineTeams) dom.statOnlineTeams.textContent = onlineCount;
  if (dom.statOfflineTeams) dom.statOfflineTeams.textContent = offlineCount;

  if (!filteredTeams || filteredTeams.length === 0) {
    dom.adminTeamsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">
          ${searchQuery ? `No teams matching "${escapeHtml(searchQuery)}".` : 'No teams registered yet. Click <strong>"➕ Add New Team"</strong> above to get started.'}
        </td>
      </tr>
    `;
    return;
  }

  dom.adminTeamsTableBody.innerHTML = filteredTeams.map((t, idx) => {
    const activeTeam = currentTeams.find(item => item.teamName.toLowerCase() === t.name.toLowerCase());
    const isOnline = activeTeam ? activeTeam.connected : false;
    const score = activeTeam ? activeTeam.score : 0;

    const statusHtml = isOnline
      ? `<span style="color: #34d399; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;"><span class="live-dot" style="width: 8px; height: 8px;"></span> Online</span>`
      : `<span style="color: #94a3b8;">Offline</span>`;

    const safeName = escapeHtml(t.name);
    const escapedNameAttr = t.name.replace(/'/g, "\\'");

    return `
      <tr>
        <td style="color: var(--text-dim); font-weight: 600;">${idx + 1}</td>
        <td style="font-weight: 700; color: #fff;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${safeName}</span>
          </div>
        </td>
        <td>
          <div style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <code class="cred-code" style="font-size: 0.9rem;">${escapeHtml(t.code)}</code>
            <button class="icon-action-btn" onclick="copyTeamCode('${escapeHtml(t.code)}', '${escapedNameAttr}')" title="Copy access code" style="background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 0.95rem; padding: 0.2rem;">
              📋
            </button>
          </div>
        </td>
        <td>${statusHtml}</td>
        <td style="font-weight: 800; color: #38bdf8; text-align: center;">${score} pts</td>
        <td style="text-align: center;">
          <div style="display: inline-flex; gap: 0.4rem; justify-content: center; flex-wrap: wrap;">
            <button class="qm-action-btn" onclick="editTeam('${t.id}')" title="Edit team name or passcode">
              ✏️ Edit
            </button>
            <button class="qm-action-btn" onclick="resetTeamSession('${escapedNameAttr}')" title="Reset connected session if locked out">
              🔄 Reset
            </button>
            <button class="qm-action-btn qm-btn-del" onclick="deleteTeam('${t.id}', '${escapedNameAttr}')" title="Remove team">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function generateRandomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function openTeamModal(teamId = null) {
  if (!dom.teamModalOverlay) return;
  if (dom.teamFormError) {
    dom.teamFormError.classList.add("hidden");
    dom.teamFormError.textContent = "";
  }

  if (teamId) {
    const team = teamsData.find(t => t.id === teamId);
    if (!team) return;
    if (dom.teamModalTitle) dom.teamModalTitle.textContent = `✏️ Edit Team: ${team.name}`;
    if (dom.editingTeamId) dom.editingTeamId.value = team.id;
    if (dom.inputTeamName) dom.inputTeamName.value = team.name;
    if (dom.inputTeamCode) dom.inputTeamCode.value = team.code;
    if (dom.btnSaveTeam) dom.btnSaveTeam.textContent = "💾 Save Changes";
  } else {
    if (dom.teamModalTitle) dom.teamModalTitle.textContent = "➕ Add New Team";
    if (dom.editingTeamId) dom.editingTeamId.value = "";
    if (dom.inputTeamName) dom.inputTeamName.value = `Team ${teamsData.length + 1}`;
    if (dom.inputTeamCode) dom.inputTeamCode.value = `T${teamsData.length + 1}${generateRandomCode()}`.toUpperCase();
    if (dom.btnSaveTeam) dom.btnSaveTeam.textContent = "➕ Add Team";
  }

  dom.teamModalOverlay.classList.remove("hidden");
  dom.inputTeamName?.focus();
}

function closeTeamModal() {
  if (dom.teamModalOverlay) {
    dom.teamModalOverlay.classList.add("hidden");
  }
}

async function handleTeamFormSubmit(e) {
  e.preventDefault();
  if (!adminToken) {
    showToast("Admin session expired. Please log in again.", "error");
    showLoginGate();
    return;
  }

  const teamId = dom.editingTeamId ? dom.editingTeamId.value : "";
  const name = dom.inputTeamName ? dom.inputTeamName.value.trim() : "";
  const code = dom.inputTeamCode ? dom.inputTeamCode.value.trim().toUpperCase() : "";

  if (!name || !code) {
    if (dom.teamFormError) {
      dom.teamFormError.textContent = "Please provide both team name and access passcode.";
      dom.teamFormError.classList.remove("hidden");
    }
    return;
  }

  // Client-side duplicate checks
  const dupName = teamsData.find(t => t.id !== teamId && t.name.toLowerCase() === name.toLowerCase());
  if (dupName) {
    if (dom.teamFormError) {
      dom.teamFormError.textContent = `A team named "${name}" already exists. Please choose a different name.`;
      dom.teamFormError.classList.remove("hidden");
    }
    return;
  }

  const dupCode = teamsData.find(t => t.id !== teamId && t.code.toUpperCase() === code);
  if (dupCode) {
    if (dom.teamFormError) {
      dom.teamFormError.textContent = `Access passcode "${code}" is already used by "${dupCode.name}". Passcodes must be unique.`;
      dom.teamFormError.classList.remove("hidden");
    }
    return;
  }

  if (dom.btnSaveTeam) {
    dom.btnSaveTeam.disabled = true;
    dom.btnSaveTeam.textContent = "Saving...";
  }

  try {
    const isEdit = !!teamId;
    const url = isEdit ? `/api/admin/teams/${teamId}` : "/api/admin/teams";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name, code })
    });

    const data = await res.json();
    if (data.success) {
      if (data.teams) {
        teamsData = data.teams;
      }
      renderTeamsTable();
      closeTeamModal();
      showToast(isEdit ? `Team "${name}" updated successfully!` : `Team "${name}" created!`, "success");
    } else {
      if (dom.teamFormError) {
        dom.teamFormError.textContent = data.message || "Failed to save team.";
        dom.teamFormError.classList.remove("hidden");
      }
    }
  } catch (err) {
    if (dom.teamFormError) {
      dom.teamFormError.textContent = "Network error. Please try again.";
      dom.teamFormError.classList.remove("hidden");
    }
  } finally {
    if (dom.btnSaveTeam) {
      dom.btnSaveTeam.disabled = false;
      dom.btnSaveTeam.textContent = teamId ? "💾 Save Changes" : "➕ Add Team";
    }
  }
}

window.editTeam = function(teamId) {
  openTeamModal(teamId);
};

window.copyTeamCode = function(code, teamName) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Copied code "${code}" for ${teamName}!`, "success");
    }).catch(() => {
      showToast(`Access code for ${teamName}: ${code}`, "info");
    });
  } else {
    showToast(`Access code for ${teamName}: ${code}`, "info");
  }
};

window.deleteTeam = async function(teamId, teamName) {
  if (!adminToken) return;
  if (teamsData.length <= 2) {
    showToast("Cannot remove team. The quiz tournament requires at least 2 teams.", "error");
    return;
  }

  showConfirmDialog({
    title: "Delete Team",
    message: `Are you sure you want to delete "${teamName}"? Any active session for this team will be immediately disconnected.`,
    confirmText: "Delete Team",
    isDanger: true,
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/teams/${teamId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${adminToken}`
          }
        });
        const data = await res.json();
        if (data.success) {
          if (data.teams) {
            teamsData = data.teams;
          }
          renderTeamsTable();
          showToast(`Team "${teamName}" was removed.`, "info");
        } else {
          showToast(data.message || "Failed to delete team.", "error");
        }
      } catch (err) {
        showToast("Network error deleting team.", "error");
      }
    }
  });
};

window.resetTeamSession = async function(teamName) {
  if (!adminToken) return;
  try {
    const res = await fetch("/api/admin/reset-team-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ teamName })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Session reset for ${teamName}. Team can now log in again.`, "success");
      loadTeams();
    } else {
      showToast(data.message || "Could not reset team session.", "error");
    }
  } catch (e) {
    showToast("Failed to reset team session.", "error");
  }
};

// Reset Default Teams
dom.btnResetDefaultTeams?.addEventListener("click", () => {
  if (!adminToken) return;
  showConfirmDialog({
    title: "Reset All Teams",
    message: "Reset back to standard 10 teams and codes? All custom team names will be reset to default.",
    confirmText: "Reset Teams",
    isDanger: true,
    onConfirm: async () => {
      try {
        const res = await fetch("/api/admin/teams/reset", {
          method: "POST",
          headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (data.success) {
          if (data.teams) {
            teamsData = data.teams;
          }
          renderTeamsTable();
          showToast("Teams restored to default 10 teams and codes.", "success");
        } else {
          showToast(data.message || "Failed to reset teams.", "error");
        }
      } catch (err) {
        showToast("Error resetting teams.", "error");
      }
    }
  });
});

// Modal event listeners
dom.btnOpenAddTeamModal?.addEventListener("click", () => openTeamModal(null));
dom.btnCancelTeamModal?.addEventListener("click", closeTeamModal);
dom.btnCloseTeamModalBtn?.addEventListener("click", closeTeamModal);
dom.teamEditForm?.addEventListener("submit", handleTeamFormSubmit);

dom.teamSearchInput?.addEventListener("input", renderTeamsTable);

dom.btnGenerateRandomCode?.addEventListener("click", () => {
  if (dom.inputTeamCode) {
    const prefix = dom.inputTeamName?.value.trim().substring(0, 3).toUpperCase() || "T";
    dom.inputTeamCode.value = `${prefix}${generateRandomCode()}`.toUpperCase();
  }
});

dom.teamModalOverlay?.addEventListener("click", (e) => {
  if (e.target === dom.teamModalOverlay) {
    closeTeamModal();
  }
});

// Fullscreen toggle for projector
function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn("Fullscreen request failed:", err);
          showToast("Fullscreen mode restricted in this frame/tab.", "info");
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn("Exit fullscreen failed:", err);
        });
      }
    }
  } catch (err) {
    console.warn("Fullscreen toggle error:", err);
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// Initialization
// ============================================================================
function initHostApp() {
  setupTabs();
  checkAuthOnStartup();

  function setupHostSoundToggle() {
    if (!dom.hostSoundToggleBtn) return;
    function update() {
      if (HostSoundFX.enabled) {
        if (dom.hostSoundIcon) dom.hostSoundIcon.textContent = "🔊";
        if (dom.hostSoundText) dom.hostSoundText.textContent = "Sound On";
        dom.hostSoundToggleBtn.style.opacity = "1";
      } else {
        if (dom.hostSoundIcon) dom.hostSoundIcon.textContent = "🔇";
        if (dom.hostSoundText) dom.hostSoundText.textContent = "Muted";
        dom.hostSoundToggleBtn.style.opacity = "0.6";
      }
    }
    dom.hostSoundToggleBtn.addEventListener("click", () => {
      HostSoundFX.init();
      HostSoundFX.enabled = !HostSoundFX.enabled;
      localStorage.setItem("quiz_host_sound_muted", (!HostSoundFX.enabled).toString());
      update();
      if (HostSoundFX.enabled) HostSoundFX.questionStart();
    });
    update();
  }

  function setupProjectorModeToggle() {
    if (!dom.btnToggleProjectorMode) return;
    function update() {
      if (projectorSafeMode) {
        dom.btnToggleProjectorMode.textContent = "🛡️ Projector Safe: ON";
        dom.btnToggleProjectorMode.classList.remove("is-revealed");
        dom.btnToggleProjectorMode.title = "Contestant answers masked during round countdown";
      } else {
        dom.btnToggleProjectorMode.textContent = "👁️ Reveal Mode: ALL";
        dom.btnToggleProjectorMode.classList.add("is-revealed");
        dom.btnToggleProjectorMode.title = "Live answers visible immediately (Host Private View)";
      }
    }
    dom.btnToggleProjectorMode.addEventListener("click", () => {
      projectorSafeMode = !projectorSafeMode;
      localStorage.setItem("quiz_projector_safe", projectorSafeMode.toString());
      update();
      if (currentHostState) {
        renderAll(currentHostState);
      }
    });
    update();
  }

  setupHostSoundToggle();
  setupProjectorModeToggle();

  // Host Game Controls Listeners (Single-Channel to Prevent Double Advance!)
  dom.btnStartQuiz?.addEventListener("click", async () => {
    if (dom.btnStartQuiz.disabled) return;
    dom.btnStartQuiz.disabled = true;
    HostSoundFX.init();
    if (socket && socket.connected) {
      socket.emit("quiz-start");
    } else if (adminToken) {
      try {
        await fetch("/api/admin/quiz/start", {
          method: "POST",
          headers: { "Authorization": `Bearer ${adminToken}` }
        });
      } catch (e) {
        console.warn("Quiz start API trigger:", e);
      }
    }
    showToast("Quiz started! Arena is launching...", "info");
  });

  dom.btnNextQuestion?.addEventListener("click", async () => {
    if (dom.btnNextQuestion.disabled) return;
    dom.btnNextQuestion.disabled = true;
    setTimeout(() => {
      if (dom.btnNextQuestion) dom.btnNextQuestion.disabled = false;
    }, 1200);

    if (socket && socket.connected) {
      socket.emit("next-question");
    } else if (adminToken) {
      try {
        await fetch("/api/admin/quiz/next", {
          method: "POST",
          headers: { "Authorization": `Bearer ${adminToken}` }
        });
      } catch (e) {
        console.warn("Quiz next API trigger:", e);
      }
    }
  });

  dom.btnEndQuiz?.addEventListener("click", () => {
    showConfirmDialog({
      title: "End Quiz",
      message: "Are you sure you want to end the quiz and display the final winner podium?",
      confirmText: "End Quiz",
      isDanger: true,
      onConfirm: async () => {
        if (socket && socket.connected) {
          socket.emit("end-quiz");
        } else if (adminToken) {
          try {
            await fetch("/api/admin/quiz/end", {
              method: "POST",
              headers: { "Authorization": `Bearer ${adminToken}` }
            });
          } catch (e) {
            console.warn("Quiz end API trigger:", e);
          }
        }
      }
    });
  });

  dom.btnResetQuiz?.addEventListener("click", () => {
    showConfirmDialog({
      title: "Reset Quiz",
      message: "Reset the entire quiz? All scores will be cleared and the arena will return to lobby.",
      confirmText: "Reset to Lobby",
      isDanger: true,
      onConfirm: async () => {
        if (socket && socket.connected) {
          socket.emit("reset-quiz");
        } else if (adminToken) {
          try {
            await fetch("/api/admin/quiz/reset", {
              method: "POST",
              headers: { "Authorization": `Bearer ${adminToken}` }
            });
          } catch (e) {
            console.warn("Quiz reset API trigger:", e);
          }
        }
        showToast("Quiz reset to lobby.", "info");
      }
    });
  });

  dom.btnRestartAfterFinish?.addEventListener("click", () => {
    if (socket && socket.connected) {
      socket.emit("reset-quiz");
    } else if (adminToken) {
      fetch("/api/admin/quiz/reset", {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
      }).catch(() => {});
    }
  });

  dom.toggleFullscreenBtn?.addEventListener("click", toggleFullscreen);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHostApp);
} else {
  initHostApp();
}
