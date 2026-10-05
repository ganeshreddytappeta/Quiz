/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    // If accessed via React SPA root, stay on event home
    if (window.location.pathname === "/team" || window.location.pathname === "/arena") {
      window.location.replace("/team.html");
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#050814", color: "#fff", textAlign: "center", padding: "2rem" }}>
      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#00f0ff", marginBottom: "0.5rem", letterSpacing: "0.05em" }}>
        AIKYAM 2K26 | FUN&TECH
      </div>
      <div style={{ fontSize: "0.9rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.25rem" }}>
        Sagi Rama Krishnam Raju Engineering College (A)
      </div>
      <div style={{ fontSize: "0.85rem", color: "#38bdf8", textTransform: "uppercase", fontWeight: 800, marginBottom: "2rem" }}>
        Department of CSIT
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <a href="/" style={{ background: "linear-gradient(135deg, #00f0ff, #3b82f6)", color: "#050814", fontWeight: 800, padding: "0.75rem 1.5rem", borderRadius: "10px", textDecoration: "none" }}>
          🏠 Event Home
        </a>
        <a href="/team.html" style={{ background: "rgba(255, 255, 255, 0.1)", color: "#fff", border: "1px solid rgba(0, 240, 255, 0.3)", fontWeight: 700, padding: "0.75rem 1.5rem", borderRadius: "10px", textDecoration: "none" }}>
          🚀 Enter Competition Arena
        </a>
      </div>
    </div>
  );
}
