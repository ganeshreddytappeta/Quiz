# 🏆 QUIZ ARENA

A production-ready, real-time multiplayer competition quiz platform built for 10 competing teams, a host control dashboard, and live projector scoreboard.

Built with **Node.js**, **Express.js**, **Socket.IO**, and **Vanilla HTML5 / CSS3 / JavaScript**.

---

## 📁 Project Architecture

```text
quiz-arena/
├── server.ts         # Full TypeScript server with Socket.IO authoritative state & MongoDB sync
├── server.js         # Native Node.js ESM server entry point
├── questions.js      # Default General Knowledge competition questions with options & answer key
├── seed.js           # Database seeding script for initial teams & questions
├── package.json      # Dependencies and scripts (Express, Socket.IO, Mongoose, tsx, esbuild)
├── README.md         # Full setup, testing guide, and architectural specification
│
├── models/           # Mongoose schemas & models
│   ├── Team.js       # Team model (teamName, teamCode, isConnected, totalScore, totalResponseTime)
│   ├── Question.js   # Question model (questionNumber, question, options, correctAnswer, timeLimit)
│   ├── Quiz.js       # Quiz session model (quizName, status, currentQuestion, totalQuestions)
│   ├── Answer.js     # Team answer submissions (quizId, teamName, questionNumber, answer, responseTime, isCorrect)
│   └── Result.js     # Final leaderboard records (quizId, teamName, correctAnswers, totalResponseTime, rank)
│
├── routes/           # REST API Endpoints
│   ├── teamRoutes.js     # /api/teams (status, login)
│   ├── questionRoutes.js # /api/questions (public question list & single question without correctAnswer)
│   └── quizRoutes.js     # /api/quiz (current session, results, sessions, answers)
│
└── public/
    ├── index.html    # SCREEN 1: Modern Landing Page with hero, rules, and team code modal
    ├── style.css     # Unified dark navy/glassmorphism design system & animations
    ├── script.js     # Landing page modal interactions and quick autofill logic
    │
    ├── team.html     # SCREENS 2–6, 8: Team Login, Invalid Code, Waiting Room,
    │                 #                 Instructions, Active Question & Final Scoreboard
    ├── team.js       # Team client Socket.IO logic & answer submission handling
    │
    ├── host.html     # SCREEN 7: Real-time Host Control Center & Live Projector Screen
    └── host.js       # Host Socket.IO updates, live rankings table, and first-answer detection
```

---

## 🗄️ MongoDB Database Integration (Mongoose)

Quiz Arena features a resilient **hybrid architecture**:
1. **In-Memory Authoritative State**: Sub-millisecond real-time Socket.IO synchronization for question transitions, countdown clocks, first-answer detection, and instant client feedback.
2. **MongoDB Persistent Storage**: Long-term database persistence for teams, questions, answer records, and tournament final results using Mongoose.
3. **Automatic Fallback Protection**: If MongoDB is starting up or temporarily unreachable, the arena automatically falls back to in-memory mode without stalling or buffering.

### 1. Connection Options

Set your `MONGODB_URI` environment variable in `.env`:

**Option A: MongoDB Atlas (Cloud)**
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/quiz_arena?retryWrites=true&w=majority
```

**Option B: Local MongoDB**
```env
MONGODB_URI=mongodb://127.0.0.1:27017/quiz_arena
```

### 2. Database Seeding

To populate MongoDB with the 10 predefined competition teams and questions:
```bash
node seed.js
```

*(The server also auto-seeds MongoDB on startup if collections are empty)*

### 3. REST API Endpoints

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/questions` | `GET` | Retrieve competition questions *(sanitized without `correctAnswer`)* |
| `/api/questions/:number` | `GET` | Retrieve single question details |
| `/api/teams/status` | `GET` | Live team connectivity status and counts |
| `/api/teams/login` | `POST` | Authenticate team credentials via HTTP REST |
| `/api/quiz/current` | `GET` | Current quiz session status |
| `/api/quiz/results` | `GET` | Historical tournament results |
| `/api/quiz/sessions` | `GET` | Past quiz tournament sessions |
| `/api/quiz/answers` | `GET` | Answer submissions audit trail |
| `/api/db/status` | `GET` | MongoDB connection health check |

---

## 🔑 Predefined 10 Teams & Credentials

| Team Name | Team Code |
|:---|:---|
| **Team 1** | `T1A7` |
| **Team 2** | `T2B8` |
| **Team 3** | `T3C9` |
| **Team 4** | `T4D1` |
| **Team 5** | `T5E2` |
| **Team 6** | `T6F3` |
| **Team 7** | `T7G4` |
| **Team 8** | `T8H5` |
| **Team 9** | `T9I6` |
| **Team 10** | `T10J7` |

*Credentials are validated strictly on the server-side to prevent tampering.*

---

## 🚀 Installation & Running

### 1. Install Dependencies

```bash
npm install
```

*(Packages: `express`, `socket.io`, `tsx`, `esbuild`)*

### 2. Run the Server

**Development Mode (TypeScript):**
```bash
npm run dev
```

**Direct Node.js Execution:**
```bash
node server.js
```

### 3. Open in Browser

- **Landing Page**: `http://localhost:3000/`
- **Team Page**: `http://localhost:3000/team.html`
- **Host Dashboard**: `http://localhost:3000/host.html`

---

## 🎮 Competition Flow

1. **Host Dashboard Preparation**:
   - Host opens `http://localhost:3000/host.html` on a projector or presentation laptop.
   - Host monitors the live counter `Teams Connected: X / 10`.

2. **Team Login**:
   - Competing teams visit `http://localhost:3000/team.html` on their phones, tablets, or laptops.
   - Teams enter their assigned **Team Name** and **Team Code** (e.g., `Team 4` / `T4D1`).
   - If credentials are valid, they enter the **Waiting Room**.

3. **Host Starts Quiz**:
   - Host clicks `🚀 Start Quiz`.
   - All teams automatically advance to the **Instructions Screen** with a synchronized 5-second countdown.

4. **Live Synchronized Question Rounds**:
   - Question 1 begins simultaneously on all devices.
   - The authoritative 30-second server clock starts ticking.
   - Teams pick their choice (A, B, C, or D) with one click.
   - Once submitted, answer buttons are locked, and the team's official server-measured response time is recorded.
   - The Host screen immediately updates with team choice, response time, and correctness.
   - The first correct answering team receives the special **⚡ FIRST ANSWER** highlight badge.

5. **Transition & Subsequent Questions**:
   - After 30 seconds (or when all active teams submit), answers are revealed.
   - A 5-second transition countdown appears (`Next Question in 5s...`).
   - Repeats seamlessly through Question 10.

6. **Championship Final Scoreboard**:
   - Final rankings are server-calculated:
     1. Highest correct answers.
     2. Fastest total cumulative response time (Tie-Breaker).
   - Podium (🥇 Gold, 🥈 Silver, 🥉 Bronze) and Winner Banner celebrate the Champions with confetti animation!

---

## ⚡ Socket.IO Event Reference

| Event Name | Direction | Payload | Description |
|:---|:---|:---|:---|
| `host-connect` | Client → Server | - | Host registers in `host-room`. |
| `host-init` | Server → Client | Full Quiz State | Sends full state snapshot to host. |
| `team-login` | Client → Server | `{ teamName, teamCode }` | Validates credentials against predefined teams. |
| `login-response` | Server → Client | `{ success, sessionToken, stateData, message }` | Confirms login or triggers Invalid Code screen. |
| `team-reconnect` | Client → Server | `{ teamName, sessionToken }` | Restores team state after accidental page reload. |
| `quiz-start` | Client → Server | - | Host triggers 5s instruction countdown. |
| `show-instructions` | Server → Broadcast | `{ duration, message }` | Broadcasts 5-second instruction countdown. |
| `question-start` | Server → Broadcast | `{ questionIndex, question, options, duration }` | Broadcasts new question. *(Correct answer is withheld from teams)* |
| `timer-tick` | Server → Broadcast | `{ timerSecondsLeft }` | Authoritative 1-second interval timer pulse. |
| `submit-answer` | Client → Server | `{ answer: 'A'\|'B'\|'C'\|'D' }` | Team submits their choice. Server calculates timestamp. |
| `answer-received` | Server → Client | `{ success, selectedAnswer, responseTime, formattedTime }` | Confirms submission to the team. |
| `live-answer-update` | Server → Host | `{ teamName, answer, time, result, isFirstCorrect }` | Live real-time row update on host table. |
| `question-timeout` | Server → Broadcast | `{ correctAnswer, rankings }` | Ends question and penalizes unanswering teams. |
| `show-next-question` | Server → Broadcast | `{ transitionSeconds, nextQuestionNumber, isFinal }` | 5-second transition countdown to next question. |
| `quiz-finished` | Server → Broadcast | `{ scoreboard, winner }` | Concludes quiz and renders Final Scoreboard & Podium. |
| `reset-quiz` | Client → Server | - | Host resets scores and quiz back to lobby. |
| `team-logout` | Client → Server | - | Team logs out and frees session. |

---

## 🧪 Testing Checklist

- [x] **1. Landing page**: Displays trophy icon, "Think • Answer • Win Together", and quick navigation.
- [x] **2. Valid team login**: Login with `Team 1` and `T1A7` successfully enters Waiting Room.
- [x] **3. Invalid team login**: Login with wrong code displays Screen 3: "Invalid Code" card with "Try Again" button.
- [x] **4. Duplicate login**: Attempting to log in as an already connected team on another tab without session token is prevented.
- [x] **5. Waiting room**: Displays pulsing radar spinner, team name, and instructions to stay on page.
- [x] **6. Host starts quiz**: Host clicking "Start Quiz" disables the start button and moves all clients to instructions.
- [x] **7. Instruction countdown**: 5-second countdown with visual progress bar.
- [x] **8. Question display**: Question 1 of 10 appears simultaneously on host and all teams.
- [x] **9. Answer submission**: Clicking option locks buttons, displays "Answer Submitted!" and recorded response time.
- [x] **10. Server-side timer**: Client clock cannot tamper with response time; calculated from `serverAnswerTime - questionStartTime`.
- [x] **11. Live host updates**: Host table updates instantaneously as each team submits without page reload.
- [x] **12. Correct/wrong result**: Green checkmark for correct answers, red indicator for wrong answers.
- [x] **13. First-answer detection**: Fastest team with correct answer receives the ⚡ FIRST badge and side panel highlight.
- [x] **14. Next-question transition**: 5-second animated countdown before subsequent questions.
- [x] **15. Question 10**: Proceeds smoothly through all 10 general knowledge questions.
- [x] **16. Final scoreboard**: Top 3 podium (🥇 🥈 🥉), Winner Card "CONGRATULATIONS!", and full standings.
- [x] **17. Tie-breaking**: Teams with equal correct answers are sorted by lowest total response time.
- [x] **18. Logout**: Team can log out from Waiting Room or Final Screen and return to login.
- [x] **19. Refresh handling**: Refreshing browser reconnects team and restores current state.
- [x] **20. Socket disconnection**: Disconnection marks team offline on host without losing their previous scores.
