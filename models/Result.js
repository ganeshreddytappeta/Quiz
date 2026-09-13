import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
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
  correctAnswers: {
    type: Number,
    required: true,
    default: 0
  },
  totalResponseTime: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

resultSchema.index({ quizId: 1, rank: 1 });

export const Result = mongoose.models.Result || mongoose.model("Result", resultSchema);
export default Result;
