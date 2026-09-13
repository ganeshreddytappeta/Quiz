// Landing page interactions
document.addEventListener("DOMContentLoaded", () => {
  const quickForm = document.getElementById("quickJoinForm");
  const quickInput = document.getElementById("quickCodeInput");

  quickForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = (quickInput?.value || "").trim().toUpperCase();
    if (code) {
      window.location.href = `/team.html?code=${encodeURIComponent(code)}`;
    }
  });
});
