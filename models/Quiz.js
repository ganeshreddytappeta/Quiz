import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
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

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
export default Quiz;
