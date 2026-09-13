import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true,
    unique: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true }
  },
  correctAnswer: {
    type: String,
    required: true,
    enum: ["A", "B", "C", "D"]
  },
  category: {
    type: String,
    default: "General Knowledge"
  },
  timeLimit: {
    type: Number,
    default: 30
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
export default Question;
