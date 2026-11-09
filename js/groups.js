/* ==========================================================================
   Torneo 5 — groups.js
   Renderizado de tabla de posiciones por grupo y del cuadro de eliminatorias.
   ========================================================================== */

const GroupsUI = (function () {
  const esc = TeamsUI.esc;

  function standingsTableHTML(tournament, group) {
    const rows = Standings.computeGroupStandings(tournament, group);
    const advance = (tournament.settings.knockout && tournament.settings.knockout.advancePerGroup) || 2;
    const trs = rows
      .map((r, i) => {
        return `
        <tr class="${i < advance ? "qualify" : ""}">
          <td>${TeamsUI.teamChipHTML(r.team, 24)}${esc(r.team.name)}</td>
          <td>${r.pj}</td><td>${r.pg}</td><td>${r.pe}</td><td>${r.pp}</td>
          <td>${r.gf}</td><td>${r.gc}</td><td>${r.dg > 0 ? "+" + r.dg : r.dg}</td>
          <td class="pts">${r.pts}</td>
        </tr>`;
      })
      .join("");
    return `
      <div class="group-block">
        <h3>🏆 ${esc(group.name)}</h3>
        <div style="overflow-x:auto;">
          <table class="standings">
            <thead><tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
            <tbody>${trs || `<tr><td colspan="9" class="muted">Sin equipos en este grupo.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function allStandingsHTML(tournament, category, division) {
    const groups = Torneo5.getGroupsOf(tournament, { category, division });
    if (!groups.length) {
      return `<div class="empty-state"><div class="big">📋</div>Aún no hay grupos creados para esta categoría y división.</div>`;
    }
    return groups.map((g) => standingsTableHTML(tournament, g)).join("");
  }

  function bracketMatchHTML(tournament, match) {
    const home = Torneo5.getTeam(tournament, match.homeTeamId);
    const away = Torneo5.getTeam(tournament, match.awayTeamId);
    const winnerId = Bracket.getWinnerId(match);
    const row = (team, score, isWinner) => `
      <div class="bm-team ${isWinner ? "winner" : ""}">
        <span class="n"><span class="dot" style="width:9px;height:9px;background:${team ? team.colors.primary : "#ccc"}"></span>${esc(
      team ? team.name : "Por definir"
    )}</span>
        <span>${match.status === "finished" ? score : ""}</span>
      </div>`;
    return `
      <div class="bracket-match" data-match-id="${match.id}" style="cursor:pointer;">
        ${row(home, match.score.home.total, winnerId && winnerId === match.homeTeamId)}
        ${row(away, match.score.away.total, winnerId && winnerId === match.awayTeamId)}
      </div>`;
  }

  function bracketHTML(tournament, category, division) {
    const view = Bracket.getView(tournament, category, division);
    if (!view.rounds.length) {
      const seeds = view.seeds;
      return `
        <div class="empty-state">
          <div class="big">🥅</div>
          ${
            seeds.length
              ? `Hay ${seeds.length} equipo(s) clasificado(s) listos para la eliminatoria. Genera los cruces desde el panel de administración.`
              : "Todavía no hay equipos clasificados para esta categoría y división."
          }
        </div>`;
    }
    const roundsHTML = view.rounds
      .map(
        (r) => `
        <div class="bracket-round">
          <h4>${esc(r.label)}</h4>
          ${r.matches.map((m) => bracketMatchHTML(tournament, m)).join("")}
        </div>`
      )
      .join("");

    const championHTML = view.champion
      ? `<div class="bracket-round" style="justify-content:center;">
           <h4>Campeón</h4>
           <div class="champion-card"><span class="trophy">🏆</span>${esc(view.champion.name)}
             ${view.runnerUp ? `<div style="font-weight:600;font-size:12px;margin-top:4px;opacity:.8;">Subcampeón: ${esc(view.runnerUp.name)}</div>` : ""}
           </div>
         </div>`
      : "";

    return `<div class="bracket">${roundsHTML}${championHTML}</div>`;
  }

  return { standingsTableHTML, allStandingsHTML, bracketHTML };
})();
