/* ==========================================================================
   Torneo 5 — standings.js
   Cálculo de tabla de posiciones por grupo.
   ========================================================================== */

const Standings = (function () {
  function emptyRow(team) {
    return {
      teamId: team.id,
      team,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      pts: 0,
    };
  }

  // Tabla de posiciones de un grupo, usando los partidos finalizados.
  function computeGroupStandings(tournament, group) {
    const rows = {};
    group.teamIds.forEach((tid) => {
      const team = Torneo5.getTeam(tournament, tid);
      if (team) rows[tid] = emptyRow(team);
    });

    const matches = Torneo5.getMatchesOf(tournament, { groupId: group.id, status: "finished" });

    matches.forEach((m) => {
      const home = rows[m.homeTeamId];
      const away = rows[m.awayTeamId];
      if (!home || !away) return;
      const hg = m.score.home.total;
      const ag = m.score.away.total;

      home.pj++; away.pj++;
      home.gf += hg; home.gc += ag;
      away.gf += ag; away.gc += hg;

      if (hg > ag) {
        home.pg++; home.pts += 3;
        away.pp++;
      } else if (hg < ag) {
        away.pg++; away.pts += 3;
        home.pp++;
      } else {
        home.pe++; away.pe++;
        home.pts += 1; away.pts += 1;
      }
    });

    const list = Object.values(rows);
    list.forEach((r) => (r.dg = r.gf - r.gc));

    list.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.name.localeCompare(b.team.name);
    });

    return list;
  }

  // Equipos clasificados de un grupo (los primeros N según la tabla).
  function topTeams(tournament, group, n) {
    return computeGroupStandings(tournament, group).slice(0, n).map((r) => r.team);
  }

  return { computeGroupStandings, topTeams };
})();
