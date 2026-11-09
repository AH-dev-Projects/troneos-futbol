/* ==========================================================================
   Torneo 5 — bracket.js
   Generación y lectura de la fase de eliminatorias (cuartos, semis, final).
   Los partidos de eliminatoria se guardan como partidos normales en
   tournament.matches, con stage: "quarterfinal" | "semifinal" | "final"
   y groupId: null. La categoría/división de un cruce se infiere de los
   equipos (ambos equipos de un cruce pertenecen a la misma categoría
   y división).
   ========================================================================== */

const Bracket = (function () {
  const STAGE_ORDER = ["quarterfinal", "semifinal", "final"];
  const STAGE_LABEL = {
    quarterfinal: "Cuartos de final",
    semifinal: "Semifinal",
    final: "Final",
  };

  function keyOf(category, division) {
    return `${category}::${division}`;
  }

  // Todos los cruces de eliminatoria de una categoría/división, agrupados por etapa.
  function matchesByStage(tournament, category, division) {
    const result = { quarterfinal: [], semifinal: [], final: [] };
    tournament.matches.forEach((m) => {
      if (!STAGE_ORDER.includes(m.stage)) return;
      const home = m.homeTeamId && Torneo5.getTeam(tournament, m.homeTeamId);
      const away = m.awayTeamId && Torneo5.getTeam(tournament, m.awayTeamId);
      const ref = home || away;
      if (!ref || ref.category !== category || ref.division !== division) return;
      result[m.stage].push(m);
    });
    return result;
  }

  function getWinnerId(match) {
    if (match.status !== "finished") return null;
    const hg = match.score.home.total;
    const ag = match.score.away.total;
    if (hg > ag) return match.homeTeamId;
    if (ag > hg) return match.awayTeamId;
    // Empate: se resuelve por penales si el admin lo registró.
    return match.penaltyWinnerTeamId || null;
  }

  // Determina cuántos equipos clasifican (según posiciones de grupo) y arma
  // la ronda inicial (cuartos, semis o final según la cantidad).
  function buildSeeds(tournament, category, division) {
    const groups = Torneo5.getGroupsOf(tournament, { category, division });
    const advancePerGroup =
      (tournament.settings.knockout && tournament.settings.knockout.advancePerGroup) || 2;

    let seeds = [];
    if (groups.length === 0) {
      // Sin fase de grupos: todos los equipos activos de la categoría/división entran directo.
      seeds = Torneo5.getTeamsOf(tournament, { category, division, status: "active" });
    } else {
      // Se listan los grupos en orden y se van tomando los clasificados
      // (1ros de todos los grupos, luego 2dos, etc.) para una siembra razonable.
      const perGroup = groups.map((g) => Standings.topTeams(tournament, g, advancePerGroup));
      for (let pos = 0; pos < advancePerGroup; pos++) {
        perGroup.forEach((arr) => {
          if (arr[pos]) seeds.push(arr[pos]);
        });
      }
    }
    return seeds;
  }

  function bracketSizeFor(count) {
    if (count >= 8) return 8;
    if (count >= 4) return 4;
    if (count >= 2) return 2;
    return 0;
  }

  function stageForSize(size) {
    if (size === 8) return "quarterfinal";
    if (size === 4) return "semifinal";
    if (size === 2) return "final";
    return null;
  }

  // Empareja sembrados en orden de bracket estándar (1v8,4v5,3v6,2v7 para 8; 1v4,2v3 para 4; 1v2 para 2).
  function seedPairs(size) {
    if (size === 8) return [[0, 7], [3, 4], [2, 5], [1, 6]];
    if (size === 4) return [[0, 3], [1, 2]];
    if (size === 2) return [[0, 1]];
    return [];
  }

  // Crea los cruces de la primera ronda a partir de la clasificación de grupos.
  // Devuelve { created, message }.
  function generateInitialRound(tournament, category, division) {
    const existing = matchesByStage(tournament, category, division);
    if (existing.quarterfinal.length || existing.semifinal.length || existing.final.length) {
      return { created: 0, message: "Ya existen cruces de eliminatoria para esta categoría y división." };
    }

    const seeds = buildSeeds(tournament, category, division);
    const size = bracketSizeFor(seeds.length);
    if (size === 0) {
      return { created: 0, message: "Se necesitan al menos 2 equipos clasificados para generar la eliminatoria." };
    }
    const stage = stageForSize(size);
    const pairs = seedPairs(size);

    pairs.forEach(([a, b]) => {
      const teamA = seeds[a];
      const teamB = seeds[b];
      tournament.matches.push({
        id: Torneo5.nextMatchId(tournament),
        stage,
        groupId: null,
        homeTeamId: teamA ? teamA.id : null,
        awayTeamId: teamB ? teamB.id : null,
        date: "",
        time: "",
        duration: {
          firstHalf: tournament.settings.matchDuration.firstHalf,
          secondHalf: tournament.settings.matchDuration.secondHalf,
        },
        status: "scheduled",
        score: { home: { firstHalf: 0, secondHalf: 0, total: 0 }, away: { firstHalf: 0, secondHalf: 0, total: 0 } },
        incidents: [],
        substitutions: [],
        notes: "",
      });
    });

    return { created: pairs.length, message: `Se generaron ${pairs.length} cruce(s) de ${STAGE_LABEL[stage]}.` };
  }

  // Si una ronda está completa (todos sus partidos finalizados), arma la
  // siguiente ronda emparejando ganadores en orden. Devuelve { created, message }.
  function advanceRound(tournament, category, division) {
    const byStage = matchesByStage(tournament, category, division);

    for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
      const stage = STAGE_ORDER[i];
      const nextStage = STAGE_ORDER[i + 1];
      const current = byStage[stage];
      const next = byStage[nextStage];

      if (current.length === 0) continue; // esta ronda ni existe aún
      if (next.length > 0) continue; // la siguiente ronda ya fue generada

      const allFinished = current.every((m) => getWinnerId(m) !== null);
      if (!allFinished) {
        return { created: 0, message: `Faltan resultados de ${STAGE_LABEL[stage]} para poder avanzar de ronda.` };
      }

      const winners = current.map((m) => Torneo5.getTeam(tournament, getWinnerId(m)));
      const pairs = [];
      for (let j = 0; j < winners.length; j += 2) {
        pairs.push([winners[j], winners[j + 1]]);
      }

      pairs.forEach(([teamA, teamB]) => {
        tournament.matches.push({
          id: Torneo5.nextMatchId(tournament),
          stage: nextStage,
          groupId: null,
          homeTeamId: teamA ? teamA.id : null,
          awayTeamId: teamB ? teamB.id : null,
          date: "",
          time: "",
          duration: {
            firstHalf: tournament.settings.matchDuration.firstHalf,
            secondHalf: tournament.settings.matchDuration.secondHalf,
          },
          status: "scheduled",
          score: { home: { firstHalf: 0, secondHalf: 0, total: 0 }, away: { firstHalf: 0, secondHalf: 0, total: 0 } },
          incidents: [],
          substitutions: [],
          notes: "",
        });
      });

      return { created: pairs.length, message: `Se generó ${STAGE_LABEL[nextStage]} con los equipos ganadores.` };
    }

    return { created: 0, message: "No hay ninguna ronda lista para avanzar todavía." };
  }

  // Vista completa del bracket para renderizar: rondas con sus cruces y campeón.
  function getView(tournament, category, division) {
    const byStage = matchesByStage(tournament, category, division);
    const rounds = STAGE_ORDER.filter((s) => byStage[s].length > 0).map((stage) => ({
      stage,
      label: STAGE_LABEL[stage],
      matches: byStage[stage],
    }));

    let champion = null;
    let runnerUp = null;
    if (byStage.final.length === 1) {
      const f = byStage.final[0];
      const winnerId = getWinnerId(f);
      if (winnerId) {
        champion = Torneo5.getTeam(tournament, winnerId);
        const loserId = winnerId === f.homeTeamId ? f.awayTeamId : f.homeTeamId;
        runnerUp = Torneo5.getTeam(tournament, loserId);
      }
    }

    return { rounds, champion, runnerUp, seeds: buildSeeds(tournament, category, division) };
  }

  return {
    STAGE_LABEL,
    matchesByStage,
    getWinnerId,
    buildSeeds,
    generateInitialRound,
    advanceRound,
    getView,
  };
})();
