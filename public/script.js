// AIKYAM 2K26 | FUN&TECH - Landing Page Interactions
document.addEventListener("DOMContentLoaded", () => {
  const quickForm = document.getElementById("quickJoinForm");
  const quickInput = document.getElementById("quickCodeInput");
  const refreshBtn = document.getElementById("refreshLeaderboardBtn");
  const tableBody = document.getElementById("indexLeaderboardBody");

  // Handle Quick Code Join
  quickForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = (quickInput?.value || "").trim().toUpperCase();
    if (code) {
      window.location.href = `/team.html?code=${encodeURIComponent(code)}`;
    } else {
      window.location.href = "/team.html";
    }
  });

  // Load and populate leaderboard preview
  async function loadLeaderboard() {
    if (!tableBody) return;
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();
      const list = data.leaderboard || data.rankings || data || [];

      if (!Array.isArray(list) || list.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">
              Tournament about to begin! All 10 teams registered and primed.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = list.map((item, idx) => {
        const rank = idx + 1;
        const medal = rank === 1 ? "🥇 " : rank === 2 ? "🥈 " : rank === 3 ? "🥉 " : "";
        const teamName = item.teamName || item.name || `Team ${rank}`;
        const correct = item.score !== undefined ? item.score : (item.correctAnswers || 0);
        const score = item.score !== undefined ? item.score : (item.totalScore || 0);

        return `
          <tr>
            <td style="font-weight: 800; color: ${rank <= 3 ? '#00f0ff' : 'var(--text-main)'};">
              ${medal}${rank}
            </td>
            <td style="font-weight: 700; color: #fff;">
              ${teamName}
            </td>
            <td style="text-align: center; color: #10b981; font-weight: 700;">
              ${correct}
            </td>
            <td style="text-align: center; font-weight: 800; color: #00f0ff;">
              ${score} pts
            </td>
          </tr>
        `;
      }).join("");

    } catch (err) {
      console.warn("Could not load leaderboard preview:", err);
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">
            Ready for AIKYAM 2K26 | FUN&TECH! Click "Enter Arena" to join live.
          </td>
        </tr>
      `;
    }
  }

  refreshBtn?.addEventListener("click", () => {
    loadLeaderboard();
  });

  loadLeaderboard();
});
