import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { Team } from "../models/Team.js";

const router = express.Router();

const TEAMS_FILE = path.join(process.cwd(), "data", "teams.json");

const DEFAULT_TEAMS_LIST = [
  { id: "t1", name: "MEDHA", code: "T1A7", teamName: "MEDHA", teamCode: "T1A7" },
  { id: "t2", name: "HACHNOVA", code: "T2B8", teamName: "HACHNOVA", teamCode: "T2B8" },
  { id: "t3", name: "TEAM NOVA", code: "T3C9", teamName: "TEAM NOVA", teamCode: "T3C9" },
  { id: "t4", name: "AGASTYA", code: "T4D1", teamName: "AGASTYA", teamCode: "T4D1" },
  { id: "t5", name: "APEX CREW", code: "T5E2", teamName: "APEX CREW", teamCode: "T5E2" },
  { id: "t6", name: "HIGH5", code: "T6F3", teamName: "HIGH5", teamCode: "T6F3" },
  { id: "t7", name: "CTRL FREAKS", code: "T7G4", teamName: "CTRL FREAKS", teamCode: "T7G4" },
  { id: "t8", name: "FIVE STARS", code: "T8H5", teamName: "FIVE STARS", teamCode: "T8H5" },
  { id: "t9", name: "CRAZY BIRDS", code: "T9I6", teamName: "CRAZY BIRDS", teamCode: "T9I6" },
  { id: "t10", name: "ANVESHANA", code: "T10J7", teamName: "ANVESHANA", teamCode: "T10J7" }
];

function getActiveTeamsFallback() {
  try {
    if (fs.existsSync(TEAMS_FILE)) {
      const content = fs.readFileSync(TEAMS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t, idx) => ({
          id: t.id || `t${idx + 1}`,
          name: t.name || t.teamName,
          code: t.code || t.teamCode,
          teamName: t.name || t.teamName,
          teamCode: t.code || t.teamCode,
          isConnected: false
        }));
      }
    }
  } catch (e) {
    console.error("Error reading data/teams.json in teamRoutes:", e);
  }
  return DEFAULT_TEAMS_LIST;
}

// GET /api/teams - Public team list
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const teams = await Team.find({}, { teamName: 1, teamCode: 1, isConnected: 1, totalScore: 1, totalResponseTime: 1, _id: 1 });
      return res.json({
        success: true,
        source: "mongodb",
        teams: teams.map(t => ({
          id: t._id.toString(),
          name: t.teamName,
          code: t.teamCode,
          teamName: t.teamName,
          teamCode: t.teamCode,
          isConnected: t.isConnected
        }))
      });
    }

    const fallbackTeams = getActiveTeamsFallback();
    return res.json({
      success: true,
      source: "file_sync",
      teams: fallbackTeams
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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

    const fallbackTeams = getActiveTeamsFallback();
    return res.json({
      success: true,
      source: "file_sync",
      connectedCount: fallbackTeams.filter((t) => t.isConnected).length,
      totalTeams: fallbackTeams.length,
      teams: fallbackTeams.map((t) => ({
        teamName: t.name,
        isConnected: t.isConnected,
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

    if (!trimmedCode) {
      return res.status(400).json({ success: false, message: "Team code is required." });
    }

    if (mongoose.connection.readyState === 1) {
      const query = trimmedName
        ? { teamName: { $regex: new RegExp(`^${trimmedName}$`, "i") } }
        : { teamCode: trimmedCode };

      const team = await Team.findOne(query);

      if (!team) {
        return res.status(401).json({ success: false, message: "Invalid team credentials." });
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

    // Fallback credential check from data/teams.json
    const activeTeams = getActiveTeamsFallback();
    const match = activeTeams.find((t) => {
      const codeMatches = (t.code || t.teamCode || "").trim().toUpperCase() === trimmedCode;
      if (!trimmedName) return codeMatches;
      const nameMatches = (t.name || t.teamName || "").trim().toLowerCase() === trimmedName.toLowerCase();
      return codeMatches && nameMatches;
    }) || activeTeams.find((t) => (t.code || t.teamCode || "").trim().toUpperCase() === trimmedCode);

    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid team name or code." });
    }

    return res.json({
      success: true,
      source: "file_sync",
      team: {
        id: match.id,
        teamName: match.name || match.teamName,
        totalScore: 0,
        totalResponseTime: 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
