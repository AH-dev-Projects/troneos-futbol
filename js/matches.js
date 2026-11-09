/* ==========================================================================
   Torneo 5 — matches.js
   Renderizado de partidos: tarjetas de calendario, cancha interactiva (SVG)
   y ficha de detalle (alineaciones, incidencias, sustituciones).
   Compartido entre el sitio público y el panel admin.
   ========================================================================== */

const MatchesUI = (function () {
  const esc = TeamsUI.esc;

  function teamNameOrTBD(tournament, teamId) {
    if (!teamId) return "Por definir";
    const t = Torneo5.getTeam(tournament, teamId);
    return t ? t.name : "Equipo eliminado";
  }

  function teamColor(tournament, teamId, fallback) {
    const t = teamId && Torneo5.getTeam(tournament, teamId);
    return t ? t.colors.primary : fallback || "#9aa29c";
  }

  // -------------------------------------------------------------------
  // Tarjeta compacta de partido (listas, calendario)
  // -------------------------------------------------------------------
  function matchCardHTML(tournament, match) {
    const home = Torneo5.getTeam(tournament, match.homeTeamId);
    const away = Torneo5.getTeam(tournament, match.awayTeamId);
    const showScore = match.status === "finished" || match.status === "live";
    const stageTag =
      match.stage !== "group" ? `<span class="badge">${esc(Bracket.STAGE_LABEL[match.stage] || match.stage)}</span>` : "";

    return `
      <div class="card match-card" data-match-id="${match.id}">
        <div class="flex wrap" style="gap:6px;">
          <span class="badge ${match.status}">${esc(Torneo5.statusLabel(match.status))}</span>
          ${stageTag}
        </div>
        <div class="match-row">
          <div class="match-team">
            <span class="dot" style="background:${teamColor(tournament, match.homeTeamId)}"></span>
            <span>${esc(teamNameOrTBD(tournament, match.homeTeamId))}</span>
          </div>
          <div class="match-score">
            ${showScore ? `${match.score.home.total}<span class="vs">-</span>${match.score.away.total}` : `<span class="vs">vs</span>`}
          </div>
          <div class="match-team">
            <span>${esc(teamNameOrTBD(tournament, match.awayTeamId))}</span>
            <span class="dot" style="background:${teamColor(tournament, match.awayTeamId)}"></span>
          </div>
        </div>
        <div class="match-meta">
          <span>${match.date ? Torneo5.formatDate(match.date) : "Fecha por definir"}${match.time ? " · " + Torneo5.formatTime(match.time) : ""}</span>
          <span>${match.duration.firstHalf}+${match.duration.secondHalf} min</span>
        </div>
      </div>`;
  }

  // -------------------------------------------------------------------
  // Cancha interactiva (SVG)
  // -------------------------------------------------------------------
  function fieldSVG(tournament, match) {
    const home = Torneo5.getTeam(tournament, match.homeTeamId);
    const away = Torneo5.getTeam(tournament, match.awayTeamId);
    const homeColor = teamColor(tournament, match.homeTeamId, "#3a7d44");
    const awayColor = teamColor(tournament, match.awayTeamId, "#8a3a3a");
    const showScore = match.status === "finished" || match.status === "live";

    const W = 700, H = 300;
    // Franjas de grama alternadas
    let stripes = "";
    const stripeW = W / 8;
    for (let i = 0; i < 8; i++) {
      stripes += `<rect x="${i * stripeW}" y="0" width="${stripeW}" height="${H}" fill="${i % 2 === 0 ? "#1f6b36" : "#1a5e2f"}" />`;
    }

    return `
      <svg class="cancha-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cancha del partido">
        ${stripes}
        <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.85"/>
        <line x1="${W / 2}" y1="14" x2="${W / 2}" y2="${H - 14}" stroke="#ffffff" stroke-width="3" opacity="0.85"/>
        <circle cx="${W / 2}" cy="${H / 2}" r="44" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.85"/>
        <circle cx="${W / 2}" cy="${H / 2}" r="3" fill="#ffffff" opacity="0.85"/>
        <rect x="14" y="${H / 2 - 55}" width="46" height="110" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.85"/>
        <rect x="${W - 60}" y="${H / 2 - 55}" width="46" height="110" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.85"/>

        <!-- Equipo local -->
        <circle cx="150" cy="${H / 2}" r="34" fill="${homeColor}" stroke="#ffffff" stroke-width="3"/>
        <text x="150" y="${H / 2 + 6}" text-anchor="middle" font-size="16" font-weight="800" fill="${TeamsUI.pickTextColor(homeColor)}" font-family="inherit">${esc(
      Torneo5.teamInitials(home ? home.name : "?")
    )}</text>
        <text x="150" y="${H / 2 + 62}" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff">${esc(
      truncate(home ? home.name : "Por definir", 16)
    )}</text>

        <!-- Equipo visitante -->
        <circle cx="${W - 150}" cy="${H / 2}" r="34" fill="${awayColor}" stroke="#ffffff" stroke-width="3"/>
        <text x="${W - 150}" y="${H / 2 + 6}" text-anchor="middle" font-size="16" font-weight="800" fill="${TeamsUI.pickTextColor(
      awayColor
    )}" font-family="inherit">${esc(Torneo5.teamInitials(away ? away.name : "?"))}</text>
        <text x="${W - 150}" y="${H / 2 + 62}" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff">${esc(
      truncate(away ? away.name : "Por definir", 16)
    )}</text>

        <!-- Marcador central -->
        <rect x="${W / 2 - 60}" y="${H / 2 - 32}" width="120" height="64" rx="12" fill="rgba(0,0,0,0.38)"/>
        <text x="${W / 2}" y="${H / 2 + 10}" text-anchor="middle" font-size="30" font-weight="800" fill="#ffffff" font-family="inherit">${
      showScore ? `${match.score.home.total} - ${match.score.away.total}` : "vs"
    }</text>
      </svg>`;
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  // -------------------------------------------------------------------
  // Alineaciones e incidencias
  // -------------------------------------------------------------------
  function lineupHTML(team) {
    if (!team) return `<p class="muted">Equipo por definir.</p>`;
    const titulares = team.players.filter((p) => p.role === "titular");
    const suplentes = team.players.filter((p) => p.role !== "titular");
    const li = (p) => `<li class="${p.role !== "titular" ? "suplente" : ""}"><span>#${p.number ?? "–"} ${esc(p.name)}${p.isGoalkeeper ? " 🧤" : ""}</span></li>`;
    return `
      <h4>${esc(team.name)}</h4>
      <ul class="lineup-list">
        ${titulares.map(li).join("")}
        ${suplentes.length ? `<li style="border:none;padding-top:8px;"><em class="muted" style="font-size:12px;">Banca</em></li>` + suplentes.map(li).join("") : ""}
      </ul>`;
  }

  function incidentsHTML(tournament, match) {
    if (!match.incidents.length) return `<p class="muted" style="margin-top:10px;">Sin incidencias registradas.</p>`;
    const sorted = [...match.incidents].sort((a, b) => a.minute - b.minute);
    const li = (inc) => {
      const meta = Torneo5.incidentMeta(inc.type);
      const team = inc.teamId ? Torneo5.getTeam(tournament, inc.teamId) : null;
      const player = team && inc.playerId ? Torneo5.getPlayer(team, inc.playerId) : null;
      const who = player ? `${player.name}${team ? " (" + team.name + ")" : ""}` : team ? team.name : "";
      return `<li><span class="icon">${meta.icon}</span><span class="min">${inc.minute}'</span><span>${esc(
        meta.label
      )}${who ? " — " + esc(who) : ""}${inc.text ? ": " + esc(inc.text) : ""}</span></li>`;
    };
    return `<ul class="incident-list">${sorted.map(li).join("")}</ul>`;
  }

  function substitutionsHTML(tournament, match) {
    if (!match.substitutions || !match.substitutions.length) return "";
    const li = (s) => {
      const team = Torneo5.getTeam(tournament, s.teamId);
      const out = team && Torneo5.getPlayer(team, s.playerOutId);
      const inn = team && Torneo5.getPlayer(team, s.playerInId);
      return `<li><span class="icon">🔄</span><span class="min">${s.minute}'</span><span>${esc(team ? team.name : "")}: sale ${esc(
        out ? out.name : "?"
      )}, entra ${esc(inn ? inn.name : "?")}</span></li>`;
    };
    return `<h4 style="margin-top:14px;">Sustituciones</h4><ul class="incident-list">${match.substitutions.map(li).join("")}</ul>`;
  }

  // -------------------------------------------------------------------
  // Ficha de detalle completa (usada dentro de un modal)
  // -------------------------------------------------------------------
  function matchDetailHTML(tournament, match) {
    const home = Torneo5.getTeam(tournament, match.homeTeamId);
    const away = Torneo5.getTeam(tournament, match.awayTeamId);
    const group = match.groupId ? Torneo5.getGroup(tournament, match.groupId) : null;
    const stageLabel = match.stage === "group" ? (group ? `Fase de grupos · ${group.name}` : "Fase de grupos") : Bracket.STAGE_LABEL[match.stage];

    return `
      <div class="flex-between wrap" style="margin-bottom:10px;">
        <span class="badge ${match.status}">${esc(Torneo5.statusLabel(match.status))}</span>
        <span class="muted" style="font-size:12.5px;">${esc(stageLabel)}</span>
      </div>
      <div class="cancha-wrap" style="padding:10px;box-shadow:none;border:none;">
        ${fieldSVG(tournament, match)}
      </div>
      <div class="cancha-caption">
        <span>${match.date ? Torneo5.formatDate(match.date) : "Fecha por definir"}${match.time ? " · " + Torneo5.formatTime(match.time) : ""}</span>
        <span>Duración: ${match.duration.firstHalf} + ${match.duration.secondHalf} min</span>
      </div>
      ${
        match.status === "finished"
          ? `<div class="center muted" style="margin-top:6px;font-size:12.5px;">
              Primer tiempo: ${match.score.home.firstHalf} - ${match.score.away.firstHalf} ·
              Segundo tiempo: ${match.score.home.secondHalf} - ${match.score.away.secondHalf}
            </div>`
          : ""
      }
      <div class="match-detail-grid">
        <div class="lineup-col">${lineupHTML(home)}</div>
        <div class="lineup-col">${lineupHTML(away)}</div>
      </div>
      <h4 style="margin-top:16px;">Comentarios del partido</h4>
      ${incidentsHTML(tournament, match)}
      ${substitutionsHTML(tournament, match)}
      ${match.notes ? `<p class="muted" style="margin-top:10px;"><strong>Nota:</strong> ${esc(match.notes)}</p>` : ""}
    `;
  }

  return { matchCardHTML, fieldSVG, matchDetailHTML, lineupHTML, incidentsHTML, substitutionsHTML, teamNameOrTBD, teamColor };
})();
