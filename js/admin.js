/* ==========================================================================
   Torneo 5 — admin.js
   Panel de administración: creación y edición de torneos, categorías,
   equipos, jugadores, grupos, partidos e incidencias. Todo se guarda en
   localStorage como borrador; "Exportar" genera el tournaments.json
   actualizado para publicarlo en el repositorio.
   ========================================================================== */

(function () {
  const esc = TeamsUI.esc;
  let db = null;
  let tournament = null;

  const state = {
    section: "torneo",
    editingTeamId: null,
    editingGroupCategory: "",
    filters: {
      equipos: { category: "", division: "" },
      grupos: { category: "", division: "" },
      calendario: { category: "", division: "" },
      elim: { category: "", division: "" },
    },
  };

  // -----------------------------------------------------------------
  // Carga inicial
  // -----------------------------------------------------------------
  async function init() {
    const hadLocal = Torneo5.hasLocalDraft();
    try {
      await Torneo5.load({ preferLocal: true });
    } catch (e) {
      document.querySelector("main").innerHTML =
        '<div class="empty-state"><div class="big">⚠️</div>No se pudieron cargar los datos (data/tournaments.json).</div>';
      console.error(e);
      return;
    }
    db = Torneo5.getDB();
    tournament = Torneo5.getActiveTournament();
    updateDraftStatus(hadLocal);

    wireNav();
    wireTopBar();
    renderAll();
  }

  function updateDraftStatus(hadLocal) {
    const el = document.getElementById("draft-status");
    if (Torneo5.loadedFrom === "localStorage") {
      el.innerHTML = "✏️ Editando un <strong>borrador local</strong> (sin publicar todavía) en este navegador.";
    } else {
      el.innerHTML = "📄 Mostrando los <strong>datos publicados</strong> (data/tournaments.json).";
    }
  }

  function persist() {
    Torneo5.saveLocal();
    const el = document.getElementById("draft-status");
    el.innerHTML = "✏️ Editando un <strong>borrador local</strong> (sin publicar todavía) en este navegador.";
  }

  function wireTopBar() {
    document.getElementById("btn-export").addEventListener("click", () => Torneo5.exportJSON());
    document.getElementById("btn-export-2").addEventListener("click", () => Torneo5.exportJSON());
    document.getElementById("btn-discard-draft").addEventListener("click", discardDraft);
    document.getElementById("btn-discard-draft-2").addEventListener("click", discardDraft);
    document.getElementById("import-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm("Esto reemplazará los datos que estás editando ahora mismo por el contenido del archivo. ¿Continuar?")) {
        e.target.value = "";
        return;
      }
      try {
        await Torneo5.importJSONFile(file);
        db = Torneo5.getDB();
        tournament = Torneo5.getActiveTournament();
        updateDraftStatus(true);
        renderAll();
        alert("Archivo importado correctamente.");
      } catch (err) {
        alert("No se pudo leer el archivo: " + err.message);
      }
      e.target.value = "";
    });
  }

  async function discardDraft() {
    if (!confirm("Se descartarán los cambios sin publicar guardados en este navegador y se recargarán los datos publicados. ¿Continuar?")) return;
    Torneo5.discardLocalDraft();
    await Torneo5.load({ preferLocal: false });
    db = Torneo5.getDB();
    tournament = Torneo5.getActiveTournament();
    updateDraftStatus(false);
    renderAll();
  }

  // -----------------------------------------------------------------
  // Navegación
  // -----------------------------------------------------------------
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

    document.getElementById("match-modal-close").addEventListener("click", closeMatchModal);
    document.getElementById("match-modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "match-modal-backdrop") closeMatchModal();
    });
  }

  function catDivOptions(catSelId, divSelId, withBlank) {
    const catSel = document.getElementById(catSelId);
    const divSel = document.getElementById(divSelId);
    if (catSel) {
      catSel.innerHTML =
        (withBlank ? `<option value="">Todas las categorías</option>` : "") +
        tournament.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    }
    if (divSel) {
      divSel.innerHTML =
        (withBlank ? `<option value="">Ambas divisiones</option>` : "") +
        tournament.divisions.map((d) => `<option value="${d}">${esc(d)}</option>`).join("");
    }
  }

  function renderAll() {
    renderTorneo();
    renderEquiposSection();
    renderGruposSection();
    renderCalendarioSection();
    renderEliminatoriasSection();
  }

  function renderSection(sec) {
    if (sec === "torneo") renderTorneo();
    else if (sec === "equipos") renderEquiposSection();
    else if (sec === "grupos") renderGruposSection();
    else if (sec === "calendario") renderCalendarioSection();
    else if (sec === "eliminatorias") renderEliminatoriasSection();
  }

  // ===================================================================
  // SECCIÓN: TORNEO
  // ===================================================================
  function renderTorneo() {
    document.getElementById("tournament-name").textContent = tournament.name;

    // Lista de torneos
    document.getElementById("tournament-list").innerHTML = db.tournaments
      .map(
        (t) => `
        <li>
          <div class="row-main">
            <div>
              <div class="title">${esc(t.name)} ${t.id === db.activeTournamentId ? '<span class="badge active">Activo</span>' : ""}</div>
              <div class="sub">${t.teams.length} equipos · ${t.matches.length} partidos</div>
            </div>
          </div>
          <div class="row-actions">
            ${t.id !== db.activeTournamentId ? `<button class="btn secondary small" data-activate="${t.id}">Activar</button>` : ""}
            ${db.tournaments.length > 1 ? `<button class="icon-btn danger" data-delete-tournament="${t.id}" title="Eliminar">🗑</button>` : ""}
          </div>
        </li>`
      )
      .join("");

    document.querySelectorAll("[data-activate]").forEach((b) =>
      b.addEventListener("click", () => {
        db.activeTournamentId = b.dataset.activate;
        tournament = Torneo5.getActiveTournament();
        persist();
        renderAll();
      })
    );
    document.querySelectorAll("[data-delete-tournament]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm("¿Eliminar este torneo y todos sus datos? Esta acción no se puede deshacer en el borrador.")) return;
        db.tournaments = db.tournaments.filter((t) => t.id !== b.dataset.deleteTournament);
        if (db.activeTournamentId === b.dataset.deleteTournament) db.activeTournamentId = db.tournaments[0].id;
        tournament = Torneo5.getActiveTournament();
        persist();
        renderAll();
      })
    );

    document.getElementById("btn-new-tournament").onclick = () => {
      const name = prompt("Nombre del nuevo torneo:", "Nuevo Campeonato de Fútbol 5");
      if (!name) return;
      const newT = {
        id: Torneo5.nextTournamentId(db),
        name,
        status: "registration",
        createdAt: new Date().toISOString().slice(0, 10),
        settings: JSON.parse(JSON.stringify(tournament.settings)),
        categories: JSON.parse(JSON.stringify(tournament.categories)),
        divisions: [...tournament.divisions],
        teams: [],
        groups: [],
        matches: [],
        bracket: { quarterfinals: [], semifinals: [], final: null, champion: null, runnerUp: null },
      };
      db.tournaments.push(newT);
      db.activeTournamentId = newT.id;
      tournament = newT;
      persist();
      renderAll();
    };

    // Datos generales
    document.getElementById("t-name").value = tournament.name;
    document.getElementById("t-status").value = tournament.status;
    document.getElementById("t-public").value = String(tournament.settings.publicAccess);
    document.getElementById("t-name").onchange = (e) => { tournament.name = e.target.value; persist(); renderTorneo(); };
    document.getElementById("t-status").onchange = (e) => { tournament.status = e.target.value; persist(); };
    document.getElementById("t-public").onchange = (e) => { tournament.settings.publicAccess = e.target.value === "true"; persist(); };

    // Reglas
    document.getElementById("t-first-half").value = tournament.settings.matchDuration.firstHalf;
    document.getElementById("t-second-half").value = tournament.settings.matchDuration.secondHalf;
    document.getElementById("t-halftime").value = tournament.settings.matchDuration.halftimeBreak;
    document.getElementById("t-max-players").value = tournament.settings.roster.max;
    document.getElementById("t-advance").value = (tournament.settings.knockout && tournament.settings.knockout.advancePerGroup) || 2;

    document.getElementById("t-first-half").onchange = (e) => { tournament.settings.matchDuration.firstHalf = Number(e.target.value); persist(); };
    document.getElementById("t-second-half").onchange = (e) => { tournament.settings.matchDuration.secondHalf = Number(e.target.value); persist(); };
    document.getElementById("t-halftime").onchange = (e) => { tournament.settings.matchDuration.halftimeBreak = Number(e.target.value); persist(); };
    document.getElementById("t-max-players").onchange = (e) => { tournament.settings.roster.max = Number(e.target.value); persist(); };
    document.getElementById("t-advance").onchange = (e) => {
      tournament.settings.knockout = tournament.settings.knockout || {};
      tournament.settings.knockout.advancePerGroup = Number(e.target.value);
      persist();
    };

    // Categorías
    document.getElementById("cat-count").textContent = `(${tournament.categories.length})`;
    document.getElementById("categories-list").innerHTML = tournament.categories
      .map(
        (c) => `
        <li>
          <div class="row-main">
            <div>
              <div class="title">${esc(c.name)} <span class="muted" style="font-weight:400;">(${c.id})</span></div>
              <div class="sub">${c.minAge} – ${c.maxAge === null || c.maxAge === undefined ? "sin límite" : c.maxAge} años</div>
            </div>
          </div>
          <div class="row-actions">
            <button class="icon-btn danger" data-del-cat="${c.id}" title="Eliminar">🗑</button>
          </div>
        </li>`
      )
      .join("");
    document.querySelectorAll("[data-del-cat]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.delCat;
        const inUse = tournament.teams.some((t) => t.category === id);
        if (inUse && !confirm("Hay equipos registrados en esta categoría. ¿Eliminarla de todas formas?")) return;
        tournament.categories = tournament.categories.filter((c) => c.id !== id);
        persist();
        renderAll();
      })
    );
    document.getElementById("btn-add-category").onclick = () => {
      const id = document.getElementById("new-cat-id").value.trim().toUpperCase();
      const name = document.getElementById("new-cat-name").value.trim();
      const min = Number(document.getElementById("new-cat-min").value || 0);
      const maxRaw = document.getElementById("new-cat-max").value;
      const max = maxRaw === "" ? null : Number(maxRaw);
      if (!id || !name) { alert("Completa el ID y el nombre de la categoría."); return; }
      if (tournament.categories.some((c) => c.id === id)) { alert("Ya existe una categoría con ese ID."); return; }
      tournament.categories.push({ id, name, minAge: min, maxAge: max });
      persist();
      document.getElementById("new-cat-id").value = "";
      document.getElementById("new-cat-name").value = "";
      document.getElementById("new-cat-min").value = "0";
      document.getElementById("new-cat-max").value = "";
      renderAll();
    };
  }

  // ===================================================================
  // SECCIÓN: EQUIPOS
  // ===================================================================
  function renderEquiposSection() {
    catDivOptions("filter-category-equipos", "filter-division-equipos", true);
    catDivOptions("new-team-category", "new-team-division", false);
    document.getElementById("filter-category-equipos").value = state.filters.equipos.category;
    document.getElementById("filter-division-equipos").value = state.filters.equipos.division;
    document.getElementById("filter-category-equipos").onchange = (e) => { state.filters.equipos.category = e.target.value; renderEquiposAdminList(); };
    document.getElementById("filter-division-equipos").onchange = (e) => { state.filters.equipos.division = e.target.value; renderEquiposAdminList(); };

    document.getElementById("btn-add-team").onclick = () => {
      const name = document.getElementById("new-team-name").value.trim();
      const category = document.getElementById("new-team-category").value;
      const division = document.getElementById("new-team-division").value;
      const color1 = document.getElementById("new-team-color1").value;
      const color2 = document.getElementById("new-team-color2").value;
      if (!name) { alert("Escribe el nombre del equipo."); return; }
      const team = {
        id: Torneo5.nextTeamId(tournament),
        name,
        category,
        division,
        colors: { primary: color1, secondary: color2 },
        status: "active",
        players: [],
      };
      tournament.teams.push(team);
      persist();
      document.getElementById("new-team-name").value = "";
      state.editingTeamId = team.id;
      renderEquiposAdminList();
    };

    renderEquiposAdminList();
  }

  function renderEquiposAdminList() {
    const f = state.filters.equipos;
    const teams = Torneo5.getTeamsOf(tournament, { category: f.category || undefined, division: f.division || undefined });
    const container = document.getElementById("equipos-admin-list");

    if (!teams.length) {
      container.innerHTML = `<div class="empty-state"><div class="big">👕</div>No hay equipos que coincidan con el filtro.</div>`;
      return;
    }

    container.innerHTML = teams
      .map((team) => {
        if (state.editingTeamId === team.id) return teamEditorHTML(team);
        const cat = Torneo5.getCategory(tournament, team.category);
        return `
        <div class="panel">
          <div class="flex-between">
            <div class="flex">
              ${TeamsUI.teamChipHTML(team, 40)}
              <div>
                <div style="font-weight:700;">${esc(team.name)}</div>
                <div class="sub muted" style="font-size:12px;">${esc(cat ? cat.name : team.category)} · ${esc(team.division)} · ${team.players.length} jugadores</div>
              </div>
            </div>
            <div class="row-actions">
              <span class="badge ${team.status}">${esc(Torneo5.teamStatusLabel(team.status))}</span>
              <button class="btn secondary small" data-edit-team="${team.id}">Editar</button>
              <button class="icon-btn danger" data-del-team="${team.id}" title="Eliminar">🗑</button>
            </div>
          </div>
        </div>`;
      })
      .join("");

    document.querySelectorAll("[data-edit-team]").forEach((b) =>
      b.addEventListener("click", () => { state.editingTeamId = b.dataset.editTeam; renderEquiposAdminList(); })
    );
    document.querySelectorAll("[data-del-team]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm("¿Eliminar este equipo y toda su plantilla? Esto también afectará grupos y partidos relacionados.")) return;
        tournament.teams = tournament.teams.filter((t) => t.id !== b.dataset.delTeam);
        tournament.groups.forEach((g) => (g.teamIds = g.teamIds.filter((id) => id !== b.dataset.delTeam)));
        persist();
        renderEquiposAdminList();
        renderGruposSection();
      })
    );
    wireTeamEditorEvents();
  }

  function teamEditorHTML(team) {
    const cat = Torneo5.getCategory(tournament, team.category);
    const catOpts = tournament.categories.map((c) => `<option value="${c.id}" ${c.id === team.category ? "selected" : ""}>${esc(c.name)}</option>`).join("");
    const divOpts = tournament.divisions.map((d) => `<option value="${d}" ${d === team.division ? "selected" : ""}>${esc(d)}</option>`).join("");
    const statusOpts = ["active", "withdrawn", "disqualified"]
      .map((s) => `<option value="${s}" ${s === team.status ? "selected" : ""}>${esc(Torneo5.teamStatusLabel(s))}</option>`)
      .join("");

    const playersRows = team.players
      .map(
        (p) => `
        <div class="player-row" data-player-id="${p.id}">
          <div class="num-badge">#${p.number ?? "–"}</div>
          <input type="text" value="${esc(p.name)}" data-field="name" placeholder="Nombre" />
          <input type="number" value="${p.number ?? ""}" data-field="number" placeholder="N°" />
          <select data-field="role">
            <option value="titular" ${p.role === "titular" ? "selected" : ""}>Titular</option>
            <option value="suplente" ${p.role !== "titular" ? "selected" : ""}>Banca</option>
          </select>
          <label style="font-size:11px;display:flex;align-items:center;gap:4px;">
            <input type="checkbox" data-field="isGoalkeeper" ${p.isGoalkeeper ? "checked" : ""}/> Portero
          </label>
          <button class="icon-btn danger" data-del-player="${p.id}" title="Eliminar">🗑</button>
        </div>`
      )
      .join("");

    return `
      <div class="panel" data-team-editor="${team.id}">
        <div class="flex-between" style="margin-bottom:10px;">
          <h3 style="margin:0;">Editando: ${esc(team.name)}</h3>
          <button class="btn secondary small" data-close-editor="1">Cerrar</button>
        </div>
        <div class="form-grid">
          <div><label>Nombre</label><input type="text" id="edit-team-name" value="${esc(team.name)}" /></div>
          <div><label>Categoría</label><select id="edit-team-category">${catOpts}</select></div>
          <div><label>División</label><select id="edit-team-division">${divOpts}</select></div>
          <div><label>Estado</label><select id="edit-team-status">${statusOpts}</select></div>
          <div><label>Color principal</label><div class="inline-color"><input type="color" id="edit-team-color1" value="${team.colors.primary}" /></div></div>
          <div><label>Color secundario</label><div class="inline-color"><input type="color" id="edit-team-color2" value="${team.colors.secondary}" /></div></div>
        </div>

        <h4 style="margin:16px 0 8px;font-size:13px;text-transform:uppercase;color:var(--ink-soft);">
          Plantilla (${team.players.length} / ${tournament.settings.roster.max})
        </h4>
        <div id="players-list">${playersRows || '<p class="muted" style="font-size:13px;">Sin jugadores todavía.</p>'}</div>
        <button class="btn secondary small" id="btn-add-player" ${team.players.length >= tournament.settings.roster.max ? "disabled" : ""}>+ Agregar jugador</button>
      </div>`;
  }

  function wireTeamEditorEvents() {
    const panel = document.querySelector("[data-team-editor]");
    if (!panel) return;
    const teamId = panel.dataset.teamEditor;
    const team = Torneo5.getTeam(tournament, teamId);

    panel.querySelector("[data-close-editor]").addEventListener("click", () => { state.editingTeamId = null; renderEquiposAdminList(); });

    const save = () => persist();

    panel.querySelector("#edit-team-name").addEventListener("change", (e) => { team.name = e.target.value; save(); });
    panel.querySelector("#edit-team-category").addEventListener("change", (e) => { team.category = e.target.value; save(); });
    panel.querySelector("#edit-team-division").addEventListener("change", (e) => { team.division = e.target.value; save(); });
    panel.querySelector("#edit-team-status").addEventListener("change", (e) => { team.status = e.target.value; save(); });
    panel.querySelector("#edit-team-color1").addEventListener("change", (e) => { team.colors.primary = e.target.value; save(); });
    panel.querySelector("#edit-team-color2").addEventListener("change", (e) => { team.colors.secondary = e.target.value; save(); });

    panel.querySelectorAll(".player-row").forEach((row) => {
      const pid = row.dataset.playerId;
      const player = Torneo5.getPlayer(team, pid);
      row.querySelector('[data-field="name"]').addEventListener("change", (e) => { player.name = e.target.value; save(); });
      row.querySelector('[data-field="number"]').addEventListener("change", (e) => { player.number = e.target.value ? Number(e.target.value) : null; save(); });
      row.querySelector('[data-field="role"]').addEventListener("change", (e) => { player.role = e.target.value; save(); });
      row.querySelector('[data-field="isGoalkeeper"]').addEventListener("change", (e) => { player.isGoalkeeper = e.target.checked; save(); });
      row.querySelector("[data-del-player]").addEventListener("click", () => {
        team.players = team.players.filter((p) => p.id !== pid);
        save();
        renderEquiposAdminList();
      });
    });

    const addBtn = panel.querySelector("#btn-add-player");
    if (addBtn)
      addBtn.addEventListener("click", () => {
        if (team.players.length >= tournament.settings.roster.max) return;
        team.players.push({ id: Torneo5.nextPlayerId(tournament), name: "Nuevo jugador", number: team.players.length + 1, isGoalkeeper: false, role: "titular" });
        save();
        renderEquiposAdminList();
      });
  }

  // ===================================================================
  // SECCIÓN: GRUPOS
  // ===================================================================
  function renderGruposSection() {
    catDivOptions("filter-category-grupos", "filter-division-grupos", true);
    if (!state.filters.grupos.category && tournament.categories[0]) state.filters.grupos.category = tournament.categories[0].id;
    if (!state.filters.grupos.division && tournament.divisions[0]) state.filters.grupos.division = tournament.divisions[0];
    document.getElementById("filter-category-grupos").value = state.filters.grupos.category;
    document.getElementById("filter-division-grupos").value = state.filters.grupos.division;
    document.getElementById("filter-category-grupos").onchange = (e) => { state.filters.grupos.category = e.target.value; renderGruposAdmin(); };
    document.getElementById("filter-division-grupos").onchange = (e) => { state.filters.grupos.division = e.target.value; renderGruposAdmin(); };
    renderGruposAdmin();
  }

  function renderGruposAdmin() {
    const { category, division } = state.filters.grupos;
    const container = document.getElementById("grupos-admin-container");
    if (!category || !division) {
      container.innerHTML = `<div class="empty-state">Selecciona categoría y división.</div>`;
      return;
    }
    const groups = Torneo5.getGroupsOf(tournament, { category, division });
    const allTeams = Torneo5.getTeamsOf(tournament, { category, division, status: "active" });
    const assignedIds = new Set(groups.flatMap((g) => g.teamIds));

    const groupsHTML = groups
      .map((g) => {
        const teams = g.teamIds.map((id) => Torneo5.getTeam(tournament, id)).filter(Boolean);
        const unassignedOptions = allTeams
          .filter((t) => !assignedIds.has(t.id))
          .map((t) => `<option value="${t.id}">${esc(t.name)}</option>`)
          .join("");
        return `
        <div class="panel">
          <div class="flex-between">
            <h3 style="margin:0;">${esc(g.name)} <span class="count">(${teams.length} equipos)</span></h3>
            <button class="icon-btn danger" data-del-group="${g.id}" title="Eliminar grupo">🗑</button>
          </div>
          <ul class="admin-list">
            ${teams
              .map(
                (t) => `<li><div class="row-main">${TeamsUI.teamChipHTML(t, 26)}<span>${esc(t.name)}</span></div>
                  <button class="icon-btn" data-remove-from-group="${g.id}|${t.id}" title="Quitar del grupo">✕</button></li>`
              )
              .join("") || '<li class="muted">Sin equipos asignados.</li>'}
          </ul>
          ${
            unassignedOptions
              ? `<div class="flex" style="margin-top:8px;">
                  <select data-assign-select="${g.id}">${unassignedOptions}</select>
                  <button class="btn secondary small" data-assign-btn="${g.id}">Agregar al grupo</button>
                </div>`
              : '<p class="muted" style="font-size:12px;margin-top:8px;">No hay más equipos disponibles para asignar.</p>'
          }
        </div>`;
      })
      .join("");

    container.innerHTML =
      groupsHTML +
      `<div class="panel">
        <h3>Crear nuevo grupo</h3>
        <div class="flex">
          <input type="text" id="new-group-name" placeholder="Ej. Grupo A" />
          <button class="btn lime small" id="btn-add-group">+ Crear grupo</button>
        </div>
      </div>`;

    document.querySelectorAll("[data-del-group]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm("¿Eliminar este grupo? Los partidos ya programados de este grupo no se eliminan.")) return;
        tournament.groups = tournament.groups.filter((g) => g.id !== b.dataset.delGroup);
        persist();
        renderGruposAdmin();
      })
    );
    document.querySelectorAll("[data-remove-from-group]").forEach((b) =>
      b.addEventListener("click", () => {
        const [gid, tid] = b.dataset.removeFromGroup.split("|");
        const g = Torneo5.getGroup(tournament, gid);
        g.teamIds = g.teamIds.filter((id) => id !== tid);
        persist();
        renderGruposAdmin();
      })
    );
    document.querySelectorAll("[data-assign-btn]").forEach((b) =>
      b.addEventListener("click", () => {
        const gid = b.dataset.assignBtn;
        const select = document.querySelector(`[data-assign-select="${gid}"]`);
        const tid = select.value;
        if (!tid) return;
        // Un equipo solo puede estar en un grupo de esta categoría/división a la vez.
        tournament.groups.forEach((g) => {
          if (g.category === category && g.division === division) g.teamIds = g.teamIds.filter((id) => id !== tid);
        });
        Torneo5.getGroup(tournament, gid).teamIds.push(tid);
        persist();
        renderGruposAdmin();
      })
    );
    document.getElementById("btn-add-group").onclick = () => {
      const name = document.getElementById("new-group-name").value.trim();
      if (!name) { alert("Escribe un nombre para el grupo."); return; }
      tournament.groups.push({ id: Torneo5.nextGroupId(tournament, category, division, name), category, division, name, teamIds: [] });
      persist();
      document.getElementById("new-group-name").value = "";
      renderGruposAdmin();
    };
  }

  // ===================================================================
  // SECCIÓN: PARTIDOS / CALENDARIO
  // ===================================================================
  function renderCalendarioSection() {
    catDivOptions("filter-category-calendario", "filter-division-calendario", true);
    document.getElementById("filter-category-calendario").value = state.filters.calendario.category;
    document.getElementById("filter-division-calendario").value = state.filters.calendario.division;
    document.getElementById("filter-category-calendario").onchange = (e) => { state.filters.calendario.category = e.target.value; renderNewMatchTeamOptions(); renderMatchesAdminList(); };
    document.getElementById("filter-division-calendario").onchange = (e) => { state.filters.calendario.division = e.target.value; renderNewMatchTeamOptions(); renderMatchesAdminList(); };

    const groupSel = document.getElementById("new-match-group");
    groupSel.innerHTML = `<option value="">Sin grupo / eliminatoria</option>` + tournament.groups.map((g) => {
      const cat = Torneo5.getCategory(tournament, g.category);
      return `<option value="${g.id}">${esc(cat ? cat.name : g.category)} · ${esc(g.division)} · ${esc(g.name)}</option>`;
    }).join("");
    groupSel.onchange = renderNewMatchTeamOptions;

    renderNewMatchTeamOptions();

    document.getElementById("btn-add-match").onclick = () => {
      const groupId = groupSel.value || null;
      const homeTeamId = document.getElementById("new-match-home").value;
      const awayTeamId = document.getElementById("new-match-away").value;
      const date = document.getElementById("new-match-date").value;
      const time = document.getElementById("new-match-time").value;
      if (!homeTeamId || !awayTeamId) { alert("Selecciona ambos equipos."); return; }
      if (homeTeamId === awayTeamId) { alert("El equipo local y visitante no pueden ser el mismo."); return; }
      tournament.matches.push({
        id: Torneo5.nextMatchId(tournament),
        stage: "group",
        groupId,
        homeTeamId,
        awayTeamId,
        date,
        time,
        duration: { firstHalf: tournament.settings.matchDuration.firstHalf, secondHalf: tournament.settings.matchDuration.secondHalf },
        status: "scheduled",
        score: { home: { firstHalf: 0, secondHalf: 0, total: 0 }, away: { firstHalf: 0, secondHalf: 0, total: 0 } },
        incidents: [],
        substitutions: [],
        notes: "",
      });
      persist();
      document.getElementById("new-match-date").value = "";
      document.getElementById("new-match-time").value = "";
      renderMatchesAdminList();
    };

    renderMatchesAdminList();
  }

  function renderNewMatchTeamOptions() {
    const groupId = document.getElementById("new-match-group").value;
    let teams;
    if (groupId) {
      const g = Torneo5.getGroup(tournament, groupId);
      teams = g.teamIds.map((id) => Torneo5.getTeam(tournament, id)).filter(Boolean);
    } else {
      const f = state.filters.calendario;
      teams = Torneo5.getTeamsOf(tournament, { category: f.category || undefined, division: f.division || undefined, status: "active" });
    }
    const opts = teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
    document.getElementById("new-match-home").innerHTML = opts;
    document.getElementById("new-match-away").innerHTML = opts;
  }

  function renderMatchesAdminList() {
    const f = state.filters.calendario;
    let matches = tournament.matches.filter((m) => {
      const home = Torneo5.getTeam(tournament, m.homeTeamId);
      const away = Torneo5.getTeam(tournament, m.awayTeamId);
      const ref = home || away;
      if (f.category && (!ref || ref.category !== f.category)) return false;
      if (f.division && (!ref || ref.division !== f.division)) return false;
      return true;
    });
    matches = matches.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));

    document.getElementById("matches-admin-list").innerHTML =
      matches
        .map((m) => {
          const home = Torneo5.getTeam(tournament, m.homeTeamId);
          const away = Torneo5.getTeam(tournament, m.awayTeamId);
          const stageTag = m.stage !== "group" ? Bracket.STAGE_LABEL[m.stage] : (m.groupId ? Torneo5.getGroup(tournament, m.groupId)?.name : "Amistoso");
          return `
          <li>
            <div class="row-main">
              <div>
                <div class="title">${esc(home ? home.name : "Por definir")} vs ${esc(away ? away.name : "Por definir")}</div>
                <div class="sub">${esc(stageTag || "")} · ${m.date ? Torneo5.formatDate(m.date) : "Sin fecha"} ${m.time ? "· " + Torneo5.formatTime(m.time) : ""}</div>
              </div>
            </div>
            <div class="row-actions">
              <span class="badge ${m.status}">${esc(Torneo5.statusLabel(m.status))}</span>
              ${m.status === "finished" ? `<strong>${m.score.home.total}-${m.score.away.total}</strong>` : ""}
              <button class="btn secondary small" data-edit-match="${m.id}">Editar</button>
              <button class="icon-btn danger" data-del-match="${m.id}" title="Eliminar">🗑</button>
            </div>
          </li>`;
        })
        .join("") || `<li class="muted">No hay partidos que coincidan con el filtro.</li>`;

    document.querySelectorAll("[data-edit-match]").forEach((b) => b.addEventListener("click", () => openMatchModal(b.dataset.editMatch)));
    document.querySelectorAll("[data-del-match]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm("¿Eliminar este partido?")) return;
        tournament.matches = tournament.matches.filter((m) => m.id !== b.dataset.delMatch);
        persist();
        renderMatchesAdminList();
      })
    );
  }

  // ----------------- Modal de edición de partido -----------------
  function closeMatchModal() { document.getElementById("match-modal-backdrop").classList.add("hidden"); }

  function openMatchModal(matchId) {
    const m = Torneo5.getMatch(tournament, matchId);
    if (!m) return;
    document.getElementById("match-modal-body").innerHTML = matchEditorHTML(m);
    document.getElementById("match-modal-backdrop").classList.remove("hidden");
    wireMatchEditorEvents(m);
  }

  function matchEditorHTML(m) {
    const home = Torneo5.getTeam(tournament, m.homeTeamId);
    const away = Torneo5.getTeam(tournament, m.awayTeamId);
    const statuses = ["scheduled", "live", "finished", "suspended", "rescheduled"];
    const statusBtns = statuses.map((s) => `<button class="btn small ${m.status === s ? "" : "secondary"}" data-set-status="${s}">${esc(Torneo5.statusLabel(s))}</button>`).join("");

    const incTypes = Object.keys({ goal: 1, yellow_card: 1, red_card: 1, foul: 1, reschedule: 1, withdrawal: 1, disqualification: 1, note: 1 });

    return `
      <h2 style="margin:0 24px 14px 0;">${esc(home ? home.name : "Por definir")} vs ${esc(away ? away.name : "Por definir")}</h2>

      <div class="status-select-row">${statusBtns}</div>

      <div class="form-grid">
        <div><label>Fecha</label><input type="date" id="m-date" value="${m.date || ""}" /></div>
        <div><label>Hora</label><input type="time" id="m-time" value="${m.time || ""}" /></div>
        <div><label>Primer tiempo (min)</label><input type="number" id="m-fh" value="${m.duration.firstHalf}" /></div>
        <div><label>Segundo tiempo (min)</label><input type="number" id="m-sh" value="${m.duration.secondHalf}" /></div>
      </div>

      <div class="form-grid" style="margin-top:12px;">
        <div><label>${esc(home ? home.name : "Local")} — 1T</label><input type="number" id="m-home-fh" value="${m.score.home.firstHalf}" min="0" /></div>
        <div><label>${esc(home ? home.name : "Local")} — 2T</label><input type="number" id="m-home-sh" value="${m.score.home.secondHalf}" min="0" /></div>
        <div><label>${esc(away ? away.name : "Visitante")} — 1T</label><input type="number" id="m-away-fh" value="${m.score.away.firstHalf}" min="0" /></div>
        <div><label>${esc(away ? away.name : "Visitante")} — 2T</label><input type="number" id="m-away-sh" value="${m.score.away.secondHalf}" min="0" /></div>
      </div>
      <p class="muted" style="font-size:12px;margin:6px 0 0;">Marcador total: <strong id="m-total-display">${m.score.home.total} - ${m.score.away.total}</strong></p>

      ${
        m.homeTeamId && m.awayTeamId && m.score.home.total === m.score.away.total
          ? `<div class="field-group" style="margin-top:10px;">
              <label>Ganador por penales (en caso de empate en eliminatoria)</label>
              <select id="m-penalty-winner">
                <option value="">Sin definir</option>
                <option value="${m.homeTeamId}" ${m.penaltyWinnerTeamId === m.homeTeamId ? "selected" : ""}>${esc(home ? home.name : "Local")}</option>
                <option value="${m.awayTeamId}" ${m.penaltyWinnerTeamId === m.awayTeamId ? "selected" : ""}>${esc(away ? away.name : "Visitante")}</option>
              </select>
            </div>`
          : ""
      }

      <div class="field-group" style="margin-top:10px;">
        <label>Observaciones generales</label>
        <textarea id="m-notes" placeholder="Motivo de reprogramación, retiro, descalificación, etc.">${esc(m.notes || "")}</textarea>
      </div>

      <h4 style="margin-top:18px;">Comentarios del partido (goles, faltas, incidencias)</h4>
      <div class="incident-form">
        <input type="number" id="inc-minute" placeholder="Min" min="0" />
        <select id="inc-type">${incTypes.map((t) => `<option value="${t}">${esc(Torneo5.incidentMeta(t).icon + " " + Torneo5.incidentMeta(t).label)}</option>`).join("")}</select>
        <select id="inc-team"><option value="">(sin equipo)</option>${home ? `<option value="${home.id}">${esc(home.name)}</option>` : ""}${away ? `<option value="${away.id}">${esc(away.name)}</option>` : ""}</select>
        <select id="inc-player"><option value="">(sin jugador)</option></select>
      </div>
      <input type="text" id="inc-text" placeholder="Comentario (opcional)" style="width:100%;margin-bottom:8px;" />
      <button class="btn secondary small" id="btn-add-incident">+ Agregar comentario</button>
      <div id="incidents-current">${MatchesUI.incidentsHTML(tournament, m)}</div>

      <h4 style="margin-top:18px;">Sustituciones</h4>
      <div class="subs-form">
        <input type="number" id="sub-minute" placeholder="Min" min="0" />
        <select id="sub-team"><option value="">Equipo</option>${home ? `<option value="${home.id}">${esc(home.name)}</option>` : ""}${away ? `<option value="${away.id}">${esc(away.name)}</option>` : ""}</select>
        <select id="sub-out"><option value="">Sale</option></select>
        <select id="sub-in"><option value="">Entra</option></select>
      </div>
      <button class="btn secondary small" id="btn-add-sub">+ Agregar sustitución</button>
      <div id="subs-current">${MatchesUI.substitutionsHTML(tournament, m)}</div>

      <div class="save-strip">
        <span class="hint">Los cambios se guardan automáticamente.</span>
        <button class="btn lime small" id="btn-close-match-editor">Listo</button>
      </div>
    `;
  }

  function wireMatchEditorEvents(m) {
    const body = document.getElementById("match-modal-body");

    body.querySelectorAll("[data-set-status]").forEach((b) =>
      b.addEventListener("click", () => {
        m.status = b.dataset.setStatus;
        persist();
        openMatchModal(m.id); // re-render to update active button + incident list context
      })
    );

    body.querySelector("#m-date").addEventListener("change", (e) => { m.date = e.target.value; persist(); renderMatchesAdminList(); });
    body.querySelector("#m-time").addEventListener("change", (e) => { m.time = e.target.value; persist(); renderMatchesAdminList(); });
    body.querySelector("#m-fh").addEventListener("change", (e) => { m.duration.firstHalf = Number(e.target.value); persist(); });
    body.querySelector("#m-sh").addEventListener("change", (e) => { m.duration.secondHalf = Number(e.target.value); persist(); });

    function recomputeScore() {
      m.score.home.firstHalf = Number(body.querySelector("#m-home-fh").value || 0);
      m.score.home.secondHalf = Number(body.querySelector("#m-home-sh").value || 0);
      m.score.away.firstHalf = Number(body.querySelector("#m-away-fh").value || 0);
      m.score.away.secondHalf = Number(body.querySelector("#m-away-sh").value || 0);
      m.score.home.total = m.score.home.firstHalf + m.score.home.secondHalf;
      m.score.away.total = m.score.away.firstHalf + m.score.away.secondHalf;
      body.querySelector("#m-total-display").textContent = `${m.score.home.total} - ${m.score.away.total}`;
      persist();
      renderMatchesAdminList();
    }
    ["#m-home-fh", "#m-home-sh", "#m-away-fh", "#m-away-sh"].forEach((sel) => body.querySelector(sel).addEventListener("change", recomputeScore));

    const penaltySel = body.querySelector("#m-penalty-winner");
    if (penaltySel) penaltySel.addEventListener("change", (e) => { m.penaltyWinnerTeamId = e.target.value || null; persist(); });

    body.querySelector("#m-notes").addEventListener("change", (e) => { m.notes = e.target.value; persist(); });

    // Jugador disponible según equipo elegido (incidencia)
    const incTeamSel = body.querySelector("#inc-team");
    const incPlayerSel = body.querySelector("#inc-player");
    incTeamSel.addEventListener("change", () => {
      const team = Torneo5.getTeam(tournament, incTeamSel.value);
      incPlayerSel.innerHTML = `<option value="">(sin jugador)</option>` + (team ? team.players.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("") : "");
    });

    body.querySelector("#btn-add-incident").addEventListener("click", () => {
      const minute = Number(body.querySelector("#inc-minute").value || 0);
      const type = body.querySelector("#inc-type").value;
      const teamId = incTeamSel.value || null;
      const playerId = incPlayerSel.value || null;
      const text = body.querySelector("#inc-text").value.trim();
      m.incidents.push({ minute, type, teamId, playerId, text });
      persist();
      openMatchModal(m.id);
    });

    // Sustituciones
    const subTeamSel = body.querySelector("#sub-team");
    const subOutSel = body.querySelector("#sub-out");
    const subInSel = body.querySelector("#sub-in");
    subTeamSel.addEventListener("change", () => {
      const team = Torneo5.getTeam(tournament, subTeamSel.value);
      const opts = team ? team.players.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("") : "";
      subOutSel.innerHTML = `<option value="">Sale</option>` + opts;
      subInSel.innerHTML = `<option value="">Entra</option>` + opts;
    });
    body.querySelector("#btn-add-sub").addEventListener("click", () => {
      const minute = Number(body.querySelector("#sub-minute").value || 0);
      const teamId = subTeamSel.value;
      const playerOutId = subOutSel.value;
      const playerInId = subInSel.value;
      if (!teamId || !playerOutId || !playerInId) { alert("Completa equipo, jugador que sale y jugador que entra."); return; }
      m.substitutions.push({ minute, teamId, playerOutId, playerInId });
      persist();
      openMatchModal(m.id);
    });

    body.querySelector("#btn-close-match-editor").addEventListener("click", closeMatchModal);
  }

  // ===================================================================
  // SECCIÓN: ELIMINATORIAS
  // ===================================================================
  function renderEliminatoriasSection() {
    catDivOptions("filter-category-elim", "filter-division-elim", false);
    if (!state.filters.elim.category && tournament.categories[0]) state.filters.elim.category = tournament.categories[0].id;
    if (!state.filters.elim.division && tournament.divisions[0]) state.filters.elim.division = tournament.divisions[0];
    document.getElementById("filter-category-elim").value = state.filters.elim.category;
    document.getElementById("filter-division-elim").value = state.filters.elim.division;
    document.getElementById("filter-category-elim").onchange = (e) => { state.filters.elim.category = e.target.value; renderEliminatoriasAdmin(); };
    document.getElementById("filter-division-elim").onchange = (e) => { state.filters.elim.division = e.target.value; renderEliminatoriasAdmin(); };

    document.getElementById("btn-gen-bracket").onclick = () => {
      const { category, division } = state.filters.elim;
      const res = Bracket.generateInitialRound(tournament, category, division);
      document.getElementById("bracket-msg").textContent = res.message;
      if (res.created) persist();
      renderEliminatoriasAdmin();
      renderMatchesAdminList();
    };
    document.getElementById("btn-advance-bracket").onclick = () => {
      const { category, division } = state.filters.elim;
      const res = Bracket.advanceRound(tournament, category, division);
      document.getElementById("bracket-msg").textContent = res.message;
      if (res.created) persist();
      renderEliminatoriasAdmin();
      renderMatchesAdminList();
    };

    renderEliminatoriasAdmin();
  }

  function renderEliminatoriasAdmin() {
    const { category, division } = state.filters.elim;
    const container = document.getElementById("eliminatorias-admin-container");
    if (!category || !division) { container.innerHTML = ""; return; }
    container.innerHTML = GroupsUI.bracketHTML(tournament, category, division);
    container.querySelectorAll(".bracket-match").forEach((card) => card.addEventListener("click", () => openMatchModal(card.dataset.matchId)));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
