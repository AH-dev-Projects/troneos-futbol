/* ==========================================================================
   Torneo 5 — admin-auth.js
   Candado de acceso al panel de administración (código compartido).

   LÍMITES IMPORTANTES de esta protección — léelo antes de confiar en ella:
   Esto NO es un inicio de sesión real. El código vive en el navegador de
   cualquier persona que visite el sitio, así que alguien dispuesto a mirar
   el código fuente o las herramientas de desarrollador puede encontrarlo o
   evitar esta pantalla. Sirve solo como filtro contra visitas casuales.

   La protección real de los datos publicados sigue siendo quién tiene
   permiso de escritura (push) sobre el repositorio de GitHub: aunque
   alguien "entre" aquí, solo puede modificar el borrador en SU propio
   navegador — nunca puede publicar cambios para los demás sin ese permiso.

   Para cambiar el código: abre generate-code.html, escribe el nuevo
   código, y pega la línea que te da en lugar de CODE_HASH aquí abajo.
   ========================================================================== */

const AdminAuth = (function () {
  const CODE_HASH = "18ec717fde553725b8ed63da122619d4040be0f9ad264e58060a5b0c5e5c4bc3";

  const SESSION_KEY = "torneo5_admin_unlocked";

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  async function tryUnlock(code) {
    if (!code) return false;
    const hash = await sha256Hex(code);
    if (hash === CODE_HASH) {
      sessionStorage.setItem(SESSION_KEY, "1");
      return true;
    }
    return false;
  }

  // onUnlock se llama una sola vez, cuando el panel queda visible
  // (de inmediato si ya había una sesión desbloqueada, o tras un código correcto).
  function init(onUnlock) {
    const gate = document.getElementById("admin-gate");
    const app = document.getElementById("admin-app");
    const input = document.getElementById("gate-code");
    const errorEl = document.getElementById("gate-error");
    const submitBtn = document.getElementById("gate-submit");
    const lockBtn = document.getElementById("btn-lock-panel");

    if (lockBtn) lockBtn.addEventListener("click", lock);

    function showApp() {
      gate.classList.add("hidden");
      app.classList.remove("hidden");
      onUnlock();
    }

    if (isUnlocked()) {
      showApp();
      return;
    }

    async function attempt() {
      submitBtn.disabled = true;
      const ok = await tryUnlock(input.value);
      submitBtn.disabled = false;
      if (ok) {
        showApp();
      } else {
        errorEl.classList.remove("hidden");
        input.value = "";
        input.focus();
      }
    }

    submitBtn.addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });
    input.focus();
  }

  return { init, lock, isUnlocked };
})();
