/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    window.location.replace("/team.html");
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "sans-serif", background: "#0a0b1e", color: "#fff" }}>
      <p>Entering Quiz Arena... <a href="/team.html" style={{ color: "#6366f1", textDecoration: "underline" }}>Click here</a></p>
    </div>
  );
}
