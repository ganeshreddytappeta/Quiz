import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    default: null
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  selectedAnswer: {
    type: String,
    required: true,
    trim: true
  },
  correctAnswer: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  responseTime: {
    type: Number,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["answered", "timeout", "disconnected"],
    default: "answered"
  }
});

// Compound index for query efficiency and duplicate check
answerSchema.index({ quizId: 1, teamName: 1, questionNumber: 1 });

export const Answer = mongoose.models.Answer || mongoose.model("Answer", answerSchema);
export default Answer;
