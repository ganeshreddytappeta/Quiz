import express from "express";
import mongoose from "mongoose";
import { Team } from "../models/Team.js";

const router = express.Router();

const DEFAULT_TEAMS_LIST = [
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

// GET /api/teams/status - Public team connection status
router.get("/status", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let teams = await Team.find({}, { teamName: 1, isConnected: 1, totalScore: 1, totalResponseTime: 1, _id: 1 });
      return res.json({
        success: true,
        source: "mongodb",
        connectedCount: teams.filter((t) => t.isConnected).length,
        totalTeams: teams.length,
        teams
      });
    }

    // Fallback if MongoDB is offline
    return res.json({
      success: true,
      source: "memory_fallback",
      connectedCount: 0,
      totalTeams: DEFAULT_TEAMS_LIST.length,
      teams: DEFAULT_TEAMS_LIST.map((t) => ({
        teamName: t.teamName,
        isConnected: false,
        totalScore: 0,
        totalResponseTime: 0
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/teams/login - Team login via REST
router.post("/login", async (req, res) => {
  try {
    const { teamName, teamCode } = req.body || {};
    const trimmedName = (teamName || "").trim();
    const trimmedCode = (teamCode || "").trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      return res.status(400).json({ success: false, message: "Team name and code are required." });
    }

    if (mongoose.connection.readyState === 1) {
      const team = await Team.findOne({
        teamName: { $regex: new RegExp(`^${trimmedName}$`, "i") }
      });

      if (!team) {
        return res.status(401).json({ success: false, message: "Invalid team name." });
      }

      if (team.teamCode.toUpperCase() !== trimmedCode) {
        return res.status(401).json({ success: false, message: "Invalid team code." });
      }

      team.isConnected = true;
      await team.save();

      return res.json({
        success: true,
        source: "mongodb",
        team: {
          id: team._id,
          teamName: team.teamName,
          totalScore: team.totalScore,
          totalResponseTime: team.totalResponseTime
        }
      });
    }

    // Fallback credential check
    const match = DEFAULT_TEAMS_LIST.find(
      (t) => t.teamName.toLowerCase() === trimmedName.toLowerCase() && t.teamCode.toUpperCase() === trimmedCode
    );

    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid team name or code." });
    }

    return res.json({
      success: true,
      source: "memory_fallback",
      team: {
        teamName: match.teamName,
        totalScore: 0,
        totalResponseTime: 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
