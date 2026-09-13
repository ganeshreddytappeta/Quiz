import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  teamCode: {
    type: String,
    required: true,
    trim: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String,
    default: null
  },
  totalScore: {
    type: Number,
    default: 0
  },
  totalResponseTime: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
export default Team;
