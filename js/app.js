/* ==========================================================================
   Torneo 5 — app.js
   Lógica del sitio público: navegación, filtros y renderizado de secciones.
   ========================================================================== */

(function () {
  let tournament = null;
  const esc = TeamsUI.esc;

  const state = {
    section: "inicio",
    filters: {
      equipos: { category: "", division: "" },
      calendario: { category: "", division: "", status: "" },
      grupos: { category: "", division: "" },
      elim: { category: "", division: "" },
    },
    canchaMatchId: null,
  };

  async function init() {
    try {
      await Torneo5.load();
    } catch (e) {
      document.querySelector("main").innerHTML =
        '<div class="empty-state"><div class="big">⚠️</div>No se pudieron cargar los datos del torneo (data/tournaments.json). Verifica que el sitio se esté sirviendo correctamente.</div>';
      console.error(e);
      return;
    }
    tournament = Torneo5.getActiveTournament();
    document.getElementById("tournament-name").textContent = tournament.name;
    document.title = tournament.name + " — Torneo 5";
    document.getElementById("tournament-status-label").textContent =
      "Estado: " + (tournament.status === "in_progress" ? "En curso" : tournament.status === "registration" ? "Inscripciones abiertas" : "Finalizado");

    populateCategoryDivisionSelects();
    wireNav();
    wireModals();
    renderStats();
    renderAll();
  }

  function populateCategoryDivisionSelects() {
    const catOptions = `<option value="">Todas las categorías</option>` + tournament.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    const divOptions = `<option value="">Ambas divisiones</option>` + tournament.divisions.map((d) => `<option value="${d}">${esc(d)}</option>`).join("");

    ["equipos", "calendario", "grupos", "elim"].forEach((key) => {
      const suffix = key === "elim" ? "elim" : key;
      const catSel = document.getElementById(`filter-category-${suffix}`);
      const divSel = document.getElementById(`filter-division-${suffix}`);
      if (catSel) catSel.innerHTML = catOptions;
      if (divSel) divSel.innerHTML = divOptions;
      if (catSel) catSel.addEventListener("change", () => { state.filters[key].category = catSel.value; renderSection(state.section); });
      if (divSel) divSel.addEventListener("change", () => { state.filters[key].division = divSel.value; renderSection(state.section); });
    });

    document.getElementById("filter-status-calendario").addEventListener("change", (e) => {
      state.filters.calendario.status = e.target.value;
      renderSection("calendario");
    });

    document.getElementById("jugadores-search").addEventListener("input", renderJugadores);
  }

  function wireNav() {
    document.querySelectorAll("#tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#tabs button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
        const sec = btn.dataset.section;
        document.getElementById("section-" + sec).classList.add("active");
        state.section = sec;
        renderSection(sec);
      });
    });
  }

  function wireModals() {
    document.getElementById("modal-close").addEventListener("click", closeMatchModal);
    document.getElementById("modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") closeMatchModal();
    });
    document.getElementById("team-modal-close").addEventListener("click", closeTeamModal);
    document.getElementById("team-modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "team-modal-backdrop") closeTeamModal();
    });
  }

  function openMatchModal(matchId) {
    const m = Torneo5.getMatch(tournament, matchId);
    if (!m) return;
    const home = Torneo5.getTeam(tournament, m.homeTeamId);
    const away = Torneo5.getTeam(tournament, m.awayTeamId);
    document.getElementById("modal-title").textContent = `${home ? home.name : "Por definir"} vs ${away ? away.name : "Por definir"}`;
    document.getElementById("modal-body").innerHTML = MatchesUI.matchDetailHTML(tournament, m);
    document.getElementById("modal-backdrop").classList.remove("hidden");
  }
  function closeMatchModal() { document.getElementById("modal-backdrop").classList.add("hidden"); }

  function openTeamModal(teamId) {
    const team = Torneo5.getTeam(tournament, teamId);
    if (!team) return;
    document.getElementById("team-modal-body").innerHTML = TeamsUI.teamDetailHTML(tournament, team);
    document.getElementById("team-modal-backdrop").classList.remove("hidden");
  }
  function closeTeamModal() { document.getElementById("team-modal-backdrop").classList.add("hidden"); }

  // -----------------------------------------------------------------
  function renderStats() {
    const s = Torneo5.dashboardStats(tournament);
    document.getElementById("stat-teams").textContent = s.teams;
    document.getElementById("stat-players").textContent = s.participants;
    document.getElementById("stat-played").textContent = s.played;
    document.getElementById("stat-pending").textContent = s.pending;
  }

  function renderAll() {
    renderInicio();
    renderEquipos();
    renderJugadores();
    renderCalendario();
    renderCanchaSelect();
    renderCancha();
    renderGrupos();
    renderEliminatorias();
  }

  function renderSection(sec) {
    if (sec === "inicio") renderInicio();
    else if (sec === "equipos") renderEquipos();
    else if (sec === "jugadores") renderJugadores();
    else if (sec === "calendario") renderCalendario();
    else if (sec === "cancha") { renderCanchaSelect(); renderCancha(); }
    else if (sec === "grupos") renderGrupos();
    else if (sec === "eliminatorias") renderEliminatorias();
  }

  // -----------------------------------------------------------------
  function renderInicio() {
    const upcoming = tournament.matches
      .filter((m) => m.status === "scheduled" || m.status === "rescheduled")
      .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"))
      .slice(0, 6);
    const recent = tournament.matches
      .filter((m) => m.status === "finished")
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 6);

    document.getElementById("inicio-proximos").innerHTML =
      upcoming.map((m) => MatchesUI.matchCardHTML(tournament, m)).join("") ||
      `<div class="empty-state"><div class="big">📅</div>No hay partidos programados por ahora.</div>`;
    document.getElementById("inicio-resultados").innerHTML =
      recent.map((m) => MatchesUI.matchCardHTML(tournament, m)).join("") ||
      `<div class="empty-state"><div class="big">⚽</div>Todavía no hay resultados.</div>`;

    bindMatchCardClicks("#inicio-proximos, #inicio-resultados");
  }

  function bindMatchCardClicks(scopeSelector) {
    document.querySelectorAll(scopeSelector + " .match-card").forEach((card) => {
      card.addEventListener("click", () => openMatchModal(card.dataset.matchId));
    });
  }
  function bindTeamCardClicks(scopeSelector) {
    document.querySelectorAll(scopeSelector + " .team-card").forEach((card) => {
      card.addEventListener("click", () => openTeamModal(card.dataset.teamId));
    });
  }

  // -----------------------------------------------------------------
  function renderEquipos() {
    const f = state.filters.equipos;
    const teams = Torneo5.getTeamsOf(tournament, { category: f.category || undefined, division: f.division || undefined });
    document.getElementById("equipos-grid").innerHTML =
      teams.map((t) => TeamsUI.teamCardHTML(tournament, t)).join("") ||
      `<div class="empty-state"><div class="big">👕</div>No hay equipos en esta categoría/división todavía.</div>`;
    bindTeamCardClicks("#equipos-grid");
  }

  // -----------------------------------------------------------------
  function renderJugadores() {
    const q = (document.getElementById("jugadores-search").value || "").toLowerCase().trim();
    const rows = [];
    tournament.teams.forEach((team) => {
      const cat = Torneo5.getCategory(tournament, team.category);
      team.players.forEach((p) => {
        if (q && !p.name.toLowerCase().includes(q) && !team.name.toLowerCase().includes(q)) return;
        rows.push(`
          <tr>
            <td>#${p.number ?? "–"}</td>
            <td>${esc(p.name)}${p.isGoalkeeper ? '<span class="gk-tag">Portero</span>' : ""}</td>
            <td>${esc(team.name)}</td>
            <td>${esc(cat ? cat.name : team.category)} · ${esc(team.division)}</td>
            <td>${p.role === "titular" ? "Titular" : "Banca"}</td>
          </tr>`);
      });
    });
    document.getElementById("jugadores-tbody").innerHTML =
      rows.join("") || `<tr><td colspan="5" class="muted center">Sin resultados.</td></tr>`;
  }

  // -----------------------------------------------------------------
  function renderCalendario() {
    const f = state.filters.calendario;
    let matches = tournament.matches.filter((m) => {
      const home = Torneo5.getTeam(tournament, m.homeTeamId);
      const away = Torneo5.getTeam(tournament, m.awayTeamId);
      const ref = home || away;
      if (f.category && (!ref || ref.category !== f.category)) return false;
      if (f.division && (!ref || ref.division !== f.division)) return false;
      if (f.status && m.status !== f.status) return false;
      return true;
    });
    matches = matches.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "99:99").localeCompare(b.time || "99:99"));

    document.getElementById("calendario-grid").innerHTML =
      matches.map((m) => MatchesUI.matchCardHTML(tournament, m)).join("") ||
      `<div class="empty-state"><div class="big">📅</div>No hay partidos que coincidan con los filtros.</div>`;
    bindMatchCardClicks("#calendario-grid");
  }

  // -----------------------------------------------------------------
  function renderCanchaSelect() {
    const sel = document.getElementById("cancha-match-select");
    const sorted = [...tournament.matches].sort((a, b) => {
      const order = { live: 0, scheduled: 1, rescheduled: 1, finished: 2, suspended: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.date || "9999").localeCompare(b.date || "9999");
    });
    sel.innerHTML = sorted
      .map((m) => {
        const home = MatchesUI.teamNameOrTBD(tournament, m.homeTeamId);
        const away = MatchesUI.teamNameOrTBD(tournament, m.awayTeamId);
        return `<option value="${m.id}">${esc(home)} vs ${esc(away)} — ${esc(Torneo5.statusLabel(m.status))}</option>`;
      })
      .join("");
    if (sorted.length) {
      state.canchaMatchId = state.canchaMatchId && tournament.matches.find((m) => m.id === state.canchaMatchId) ? state.canchaMatchId : sorted[0].id;
      sel.value = state.canchaMatchId;
    }
    sel.onchange = () => {
      state.canchaMatchId = sel.value;
      renderCancha();
    };
  }

  function renderCancha() {
    const container = document.getElementById("cancha-container");
    if (!state.canchaMatchId) {
      container.innerHTML = `<div class="empty-state"><div class="big">🥅</div>Todavía no hay partidos registrados.</div>`;
      return;
    }
    const m = Torneo5.getMatch(tournament, state.canchaMatchId);
    container.innerHTML = `
      <div class="cancha-wrap">${MatchesUI.fieldSVG(tournament, m)}
        <div class="cancha-caption">
          <span class="badge ${m.status}">${esc(Torneo5.statusLabel(m.status))}</span>
          <span>${m.date ? Torneo5.formatDate(m.date) : "Fecha por definir"}${m.time ? " · " + Torneo5.formatTime(m.time) : ""}</span>
        </div>
      </div>
      <div style="margin-top:14px;">
        <button class="btn secondary" id="cancha-ver-ficha">Ver ficha completa del partido</button>
      </div>`;
    document.getElementById("cancha-ver-ficha").addEventListener("click", () => openMatchModal(m.id));
  }

  // -----------------------------------------------------------------
  function renderGrupos() {
    const f = state.filters.grupos;
    const container = document.getElementById("grupos-container");
    if (!f.category || !f.division) {
      container.innerHTML = `<div class="empty-state"><div class="big">🗂️</div>Elige una categoría y una división para ver sus grupos y posiciones.</div>`;
      return;
    }
    container.innerHTML = GroupsUI.allStandingsHTML(tournament, f.category, f.division);
  }

  // -----------------------------------------------------------------
  function renderEliminatorias() {
    const f = state.filters.elim;
    const container = document.getElementById("eliminatorias-container");
    if (!f.category || !f.division) {
      container.innerHTML = `<div class="empty-state"><div class="big">🏆</div>Elige una categoría y una división para ver su cuadro de eliminatorias.</div>`;
      return;
    }
    container.innerHTML = GroupsUI.bracketHTML(tournament, f.category, f.division);
    document.querySelectorAll("#eliminatorias-container .bracket-match").forEach((card) => {
      card.addEventListener("click", () => openMatchModal(card.dataset.matchId));
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
