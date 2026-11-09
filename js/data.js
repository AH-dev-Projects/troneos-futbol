/* ==========================================================================
   Torneo 5 — data.js
   Carga, acceso y utilidades sobre el modelo de datos del torneo.
   Se usa tanto en el sitio público (solo lectura) como en el panel admin
   (lectura + escritura en localStorage + exportación de JSON).
   ========================================================================== */

const DATA_URL = "data/tournaments.json";
const LOCAL_STORAGE_KEY = "torneo5_data_v1";

const Torneo5 = (function () {
  let db = null; // { activeTournamentId, tournaments: [...] }
  let loadedFrom = "json"; // "json" | "localStorage"

  // ---------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------

  async function load({ preferLocal = false } = {}) {
    if (preferLocal) {
      const local = readLocal();
      if (local) {
        db = local;
        loadedFrom = "localStorage";
        return db;
      }
    }
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar " + DATA_URL);
    db = await res.json();
    loadedFrom = "json";

    // Si hay una copia local más reciente (ediciones de admin sin publicar
    // todavía), se ofrece usarla en vez de machacarla silenciosamente.
    return db;
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("No se pudo leer el borrador local:", e);
      return null;
    }
  }

  function hasLocalDraft() {
    return !!localStorage.getItem(LOCAL_STORAGE_KEY);
  }

  function saveLocal() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      console.error("No se pudo guardar el borrador local:", e);
      return false;
    }
  }

  function discardLocalDraft() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  function getDB() {
    return db;
  }

  function setDB(newDb) {
    db = newDb;
  }

  // ---------------------------------------------------------------------
  // Acceso a torneo / categorías / equipos / jugadores / grupos / partidos
  // ---------------------------------------------------------------------

  function getActiveTournament() {
    if (!db) return null;
    return db.tournaments.find((t) => t.id === db.activeTournamentId) || db.tournaments[0] || null;
  }

  function getTournament(id) {
    return db.tournaments.find((t) => t.id === id);
  }

  function getCategory(t, catId) {
    return t.categories.find((c) => c.id === catId);
  }

  function getTeam(t, teamId) {
    return t.teams.find((e) => e.id === teamId);
  }

  function getTeamsOf(t, { category, division, status } = {}) {
    return t.teams.filter(
      (e) =>
        (!category || e.category === category) &&
        (!division || e.division === division) &&
        (!status || e.status === status)
    );
  }

  function getPlayer(team, playerId) {
    return team.players.find((p) => p.id === playerId);
  }

  function getGroup(t, groupId) {
    return t.groups.find((g) => g.id === groupId);
  }

  function getGroupsOf(t, { category, division } = {}) {
    return t.groups.filter(
      (g) => (!category || g.category === category) && (!division || g.division === division)
    );
  }

  function getMatch(t, matchId) {
    return t.matches.find((m) => m.id === matchId);
  }

  function getMatchesOf(t, { groupId, teamId, status, stage } = {}) {
    return t.matches.filter((m) => {
      if (groupId && m.groupId !== groupId) return false;
      if (stage && m.stage !== stage) return false;
      if (status && m.status !== status) return false;
      if (teamId && m.homeTeamId !== teamId && m.awayTeamId !== teamId) return false;
      return true;
    });
  }

  // ---------------------------------------------------------------------
  // Generadores de ID
  // ---------------------------------------------------------------------

  function nextId(prefix, existingIds) {
    let n = 1;
    let id;
    do {
      id = `${prefix}-${String(n).padStart(3, "0")}`;
      n++;
    } while (existingIds.includes(id));
    return id;
  }

  function nextTeamId(t) {
    return nextId("EQ", t.teams.map((e) => e.id));
  }
  function nextPlayerId(t) {
    const all = t.teams.flatMap((e) => e.players.map((p) => p.id));
    return nextId("J", all);
  }
  function nextGroupId(t, category, division, name) {
    const base = `G-${category}-${division.charAt(0)}`;
    return `${base}-${name.replace(/\s+/g, "").toUpperCase()}`;
  }
  function nextMatchId(t) {
    return nextId("PAR", t.matches.map((m) => m.id));
  }
  function nextTournamentId(allDb) {
    return nextId("TOR", allDb.tournaments.map((x) => x.id));
  }

  // ---------------------------------------------------------------------
  // Cálculo de edad / categoría
  // ---------------------------------------------------------------------

  function categoryForAge(t, age) {
    return t.categories.find(
      (c) => age >= c.minAge && (c.maxAge === null || c.maxAge === undefined || age <= c.maxAge)
    );
  }

  // ---------------------------------------------------------------------
  // Etiquetas / iconos
  // ---------------------------------------------------------------------

  const STATUS_LABELS = {
    scheduled: "Programado",
    live: "En juego",
    finished: "Finalizado",
    suspended: "Suspendido",
    rescheduled: "Reprogramado",
  };

  const TEAM_STATUS_LABELS = {
    active: "Inscrito",
    withdrawn: "Retirado",
    disqualified: "Descalificado",
  };

  const INCIDENT_TYPES = {
    goal: { icon: "⚽", label: "Gol" },
    yellow_card: { icon: "🟨", label: "Tarjeta amarilla" },
    red_card: { icon: "🟥", label: "Tarjeta roja" },
    foul: { icon: "⚠️", label: "Falta" },
    reschedule: { icon: "📅", label: "Reprogramación" },
    withdrawal: { icon: "🚫", label: "Retiro del torneo" },
    disqualification: { icon: "⛔", label: "Descalificación" },
    note: { icon: "📝", label: "Observación" },
  };

  function statusLabel(s) {
    return STATUS_LABELS[s] || s;
  }
  function teamStatusLabel(s) {
    return TEAM_STATUS_LABELS[s] || s;
  }
  function incidentMeta(type) {
    return INCIDENT_TYPES[type] || { icon: "•", label: type };
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  }

  function formatTime(hhmm) {
    if (!hhmm) return "";
    let [h, m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "p. m." : "a. m.";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  function teamInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  // ---------------------------------------------------------------------
  // Estadísticas globales (panel principal)
  // ---------------------------------------------------------------------

  function dashboardStats(t) {
    const teams = t.teams.filter((e) => e.status === "active");
    const participants = teams.reduce((sum, e) => sum + e.players.length, 0);
    const played = t.matches.filter((m) => m.status === "finished").length;
    const pending = t.matches.filter((m) => m.status === "scheduled" || m.status === "rescheduled").length;
    return { teams: teams.length, participants, played, pending };
  }

  // ---------------------------------------------------------------------
  // Exportar / importar JSON
  // ---------------------------------------------------------------------

  function exportJSON(filename = "tournaments.json") {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          db = parsed;
          saveLocal();
          resolve(db);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  return {
    load,
    readLocal,
    hasLocalDraft,
    saveLocal,
    discardLocalDraft,
    getDB,
    setDB,
    getActiveTournament,
    getTournament,
    getCategory,
    getTeam,
    getTeamsOf,
    getPlayer,
    getGroup,
    getGroupsOf,
    getMatch,
    getMatchesOf,
    nextTeamId,
    nextPlayerId,
    nextGroupId,
    nextMatchId,
    nextTournamentId,
    categoryForAge,
    statusLabel,
    teamStatusLabel,
    incidentMeta,
    formatDate,
    formatTime,
    teamInitials,
    dashboardStats,
    exportJSON,
    importJSONFile,
    get loadedFrom() {
      return loadedFrom;
    },
  };
})();
