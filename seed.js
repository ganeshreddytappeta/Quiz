import dotenv from "dotenv";
import mongoose from "mongoose";
import { Team } from "./models/Team.js";
import { Question } from "./models/Question.js";
import { questions as defaultQuestions } from "./questions.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quiz_arena";

const INITIAL_TEAMS = [
  { teamName: "Team 1", teamCode: "T1A7" },
  { teamName: "Team 2", teamCode: "T2B8" },
  { teamName: "Team 3", teamCode: "T3C9" },
  { teamName: "Team 4", teamCode: "T4D1" },
  { teamName: "Team 5", teamCode: "T5E2" },
  { teamName: "Team 6", teamCode: "T6F3" },
  { teamName: "Team 7", teamCode: "T7G4" },
  { teamName: "Team 8", teamCode: "T8H5" },
  { teamName: "Team 9", teamCode: "T9I6" },
  { teamName: "Team 10", teamCode: "T10J7" }
];

async function seed() {
  console.log("Connecting to MongoDB for database seeding...");
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connected successfully");

    // 1. Seed Teams
    let teamsCreated = 0;
    for (const t of INITIAL_TEAMS) {
      const existing = await Team.findOne({ teamName: t.teamName });
      if (!existing) {
        await Team.create({
          teamName: t.teamName,
          teamCode: t.teamCode,
          isConnected: false,
          socketId: null,
          totalScore: 0,
          totalResponseTime: 0
        });
        teamsCreated++;
      }
    }
    console.log(`Teams check completed. ${teamsCreated} new teams inserted. Total teams: 10.`);

    // 2. Seed Questions
    let questionsCreated = 0;
    const sourceQuestions = defaultQuestions && defaultQuestions.length > 0
      ? defaultQuestions
      : [
          {
            id: 1,
            question: "What is the capital city of India?",
            options: { A: "Mumbai", B: "New Delhi", C: "Chennai", D: "Kolkata" },
            correctAnswer: "B"
          }
        ];

    for (let i = 0; i < sourceQuestions.length; i++) {
      const q = sourceQuestions[i];
      const qNum = q.id || i + 1;
      const existing = await Question.findOne({ questionNumber: qNum });
      if (!existing) {
        await Question.create({
          questionNumber: qNum,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: "General Knowledge",
          timeLimit: 30
        });
        questionsCreated++;
      }
    }
    console.log(`Questions check completed. ${questionsCreated} new questions inserted. Total questions: ${sourceQuestions.length}.`);

    console.log("Seeding finished successfully!");
  } catch (err) {
    console.error("Database seeding encountered an error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
}

seed();
