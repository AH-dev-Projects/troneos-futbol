/* ==========================================================================
   Torneo 5 — teams.js
   Renderizado compartido de equipos y plantillas (usado en sitio público
   y en el panel admin).
   ========================================================================== */

const TeamsUI = (function () {
  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function teamChipHTML(team, size) {
    const s = size || 44;
    return `<div class="team-chip" style="width:${s}px;height:${s}px;background:${team.colors.primary};color:${pickTextColor(
      team.colors.primary
    )};border-color:${team.colors.secondary}">${esc(Torneo5.teamInitials(team.name))}</div>`;
  }

  // Elige blanco o negro para el texto según el brillo del color de fondo.
  function pickTextColor(hex) {
    const c = hex.replace("#", "");
    if (c.length !== 6) return "#fff";
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 170 ? "#1a1a1a" : "#ffffff";
  }

  function teamCardHTML(tournament, team) {
    const cat = Torneo5.getCategory(tournament, team.category);
    const gk = team.players.find((p) => p.isGoalkeeper);
    return `
      <div class="card team-card" data-team-id="${team.id}">
        <div class="team-card-head">
          ${teamChipHTML(team)}
          <div>
            <h3>${esc(team.name)}</h3>
            <div class="meta">${esc(cat ? cat.name : team.category)} · ${esc(team.division)}</div>
          </div>
        </div>
        <div class="flex wrap" style="margin-top:10px;">
          <span class="badge ${team.status}">${esc(Torneo5.teamStatusLabel(team.status))}</span>
          <span class="badge">${team.players.length} jugador${team.players.length === 1 ? "" : "es"}</span>
          ${gk ? `<span class="badge">Portero: ${esc(gk.name)}</span>` : ""}
        </div>
      </div>`;
  }

  function rosterTableHTML(team) {
    const sorted = [...team.players].sort((a, b) => {
      if (a.role !== b.role) return a.role === "titular" ? -1 : 1;
      return (a.number || 0) - (b.number || 0);
    });
    const rows = sorted
      .map(
        (p) => `
        <tr>
          <td>#${p.number ?? "–"}</td>
          <td>${esc(p.name)}${p.isGoalkeeper ? '<span class="gk-tag">Portero</span>' : ""}</td>
          <td>${p.role === "titular" ? "Titular" : "Banca"}</td>
        </tr>`
      )
      .join("");
    return `
      <table class="roster-table">
        <thead><tr><th>#</th><th>Jugador</th><th>Estado</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function teamDetailHTML(tournament, team) {
    const cat = Torneo5.getCategory(tournament, team.category);
    return `
      <div class="flex" style="margin-bottom:4px;">
        ${teamChipHTML(team, 52)}
        <div>
          <h2 class="mt-0">${esc(team.name)}</h2>
          <div class="muted">${esc(cat ? cat.name : team.category)} · ${esc(team.division)}</div>
        </div>
      </div>
      <div class="flex wrap" style="margin:10px 0;">
        <span class="badge ${team.status}">${esc(Torneo5.teamStatusLabel(team.status))}</span>
        <span class="badge">Color principal</span>
        <span class="badge">Color secundario</span>
      </div>
      <h4 style="margin-bottom:6px;font-size:13px;text-transform:uppercase;color:var(--ink-soft);">
        Plantilla (${team.players.length})
      </h4>
      ${rosterTableHTML(team)}`;
  }

  return { teamChipHTML, teamCardHTML, rosterTableHTML, teamDetailHTML, pickTextColor, esc };
})();
