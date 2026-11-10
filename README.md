# Torneo 5 — Administrador de Campeonatos

Sistema de organización y administración de torneos de fútbol 5 (grama
sintética), con sitio público de consulta y panel de administración. Pensado
para publicarse en **GitHub Pages**, igual que tu proyecto
[ecoterra](https://ah-dev-projects.github.io/ecoterra/).

No usa ningún framework ni paso de compilación: es HTML, CSS y JavaScript
normales, además de un archivo de datos en JSON. Puedes abrirlo tal cual en
un navegador o publicarlo directamente en GitHub Pages.

## Estructura del proyecto

```
torneo-5/
├── index.html          sitio público (solo lectura)
├── admin.html           panel de administración (edición)
├── css/
│   ├── styles.css        estilos generales (compartidos)
│   └── admin.css          estilos del panel admin
├── js/
│   ├── data.js             carga de datos, acceso y utilidades
│   ├── standings.js         cálculo de tabla de posiciones
│   ├── bracket.js            generación y avance de eliminatorias
│   ├── teams.js                tarjetas y plantillas de equipos
│   ├── matches.js               cancha interactiva, calendario, ficha de partido
│   ├── groups.js                  tablas de posiciones y cuadro de eliminatorias
│   ├── app.js                      lógica del sitio público
│   └── admin.js                     lógica del panel de administración
├── data/
│   └── tournaments.json  datos del torneo (equipos, jugadores, partidos…)
├── img/
│   └── logo.png           logo del badge (reemplázalo por otro con el mismo nombre)
└── README.md
```

## Cómo funciona el almacenamiento (JSON, sin servidor)

Como se definió durante el diseño: una página estática puede **leer** el
JSON publicado, pero no puede modificarlo automáticamente sin un servidor.
Por eso el flujo es:

1. **Editas** en `admin.html`. Cada cambio se guarda automáticamente como
   *borrador* en el `localStorage` de tu navegador (no se pierde si recargas
   la página, pero tampoco lo ven los demás visitantes).
2. Cuando quieras publicar, usa el botón **"Exportar JSON actualizado"**.
   Esto descarga un archivo `tournaments.json` con todos tus cambios.
3. Reemplazas `data/tournaments.json` en tu repositorio de GitHub con ese
   archivo descargado, y haces **commit + push**.
4. GitHub Pages republica el sitio automáticamente y todos los visitantes
   ven los datos actualizados.

El control real de quién puede **modificar los datos de todos** lo sigue
dando **GitHub**: solo las cuentas con permiso de escritura sobre el
repositorio pueden publicar cambios (push). Aunque alguien entre al panel,
solo puede alterar el borrador en su propio navegador — nunca lo que ven
los demás visitantes.

### Candado de acceso al panel

Como capa adicional, `admin.html` pide un **código de acceso** antes de
mostrarse (ver `js/admin-auth.js`). Es importante entender qué protege y
qué no:

- **Qué resuelve:** que un visitante cualquiera no vea ni toque la
  interfaz de edición por accidente o curiosidad.
- **Qué NO resuelve:** no es un inicio de sesión real. El código se
  verifica con JavaScript dentro del propio navegador, así que alguien
  dispuesto a mirar el código fuente o las herramientas de desarrollador
  podría encontrarlo o evitarlo. No lo uses para proteger información
  verdaderamente sensible.

**Cambiar el código:** abre `generate-code.html` en el navegador, escribe
el nuevo código y pega la línea que te da en `js/admin-auth.js`
(reemplazando la línea `const CODE_HASH = ...`). El código de fábrica es
`torneo5-2026` — cámbialo antes de publicar el sitio.

El botón **"🔒 Bloquear"** en la parte superior del panel cierra el acceso
en ese navegador (útil en una computadora compartida); por defecto también
se bloquea solo al cerrar la pestaña, porque el desbloqueo se guarda por
sesión del navegador.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `torneo-5`).
2. Sube el contenido de esta carpeta (`index.html`, `admin.html`, `css/`,
   `js/`, `data/`, este `README.md`) a la raíz del repositorio.
3. En **Settings → Pages**, selecciona la rama (`main`) y la carpeta raíz
   (`/`).
4. En unos minutos tu sitio estará disponible en
   `https://<tu-usuario>.github.io/<repo>/`.

## Primeros pasos al abrir `admin.html`

1. Pestaña **Torneo**: ajusta nombre, duración de los tiempos, cantidad
   máxima de jugadores, cuántos equipos clasifican por grupo a la
   eliminatoria, y las categorías (edades editables).
2. Pestaña **Equipos**: crea equipos (nombre, categoría, división, colores)
   y, al editarlos, agrega jugadores (número, nombre, portero, titular o
   banca).
3. Pestaña **Grupos**: crea los grupos de cada categoría/división y asigna
   equipos.
4. Pestaña **Partidos**: programa partidos (de grupo o sueltos), y haz clic
   en "Editar" para registrar fecha/hora, marcador por tiempo, estado,
   comentarios (goles, faltas, tarjetas, motivos de reprogramación, retiro
   o descalificación) y sustituciones con minuto.
5. Pestaña **Eliminatorias**: cuando termine la fase de grupos, elige
   categoría/división y pulsa "Generar cruces iniciales" (toma los
   clasificados de cada grupo). A medida que registras resultados, usa
   "Avanzar a la siguiente ronda" para crear semifinales/final
   automáticamente con los equipos ganadores.
6. Pestaña **Importar/Exportar**: descarga el JSON para publicarlo, o
   carga uno existente (por ejemplo, el publicado actualmente) para seguir
   editando desde ahí en otro equipo o navegador.

## Varios torneos / historial

Desde la pestaña **Torneo** puedes crear un nuevo torneo (conserva las
categorías y reglas del torneo activo, pero empieza sin equipos ni
partidos) y cambiar cuál está activo. Todos los torneos quedan guardados
en el mismo `tournaments.json`, así que puedes conservar el historial de
campeonatos anteriores.

## Datos de ejemplo incluidos

El archivo `data/tournaments.json` incluye un torneo de ejemplo con 6
equipos (categorías Juvenil e Infantil), 2 grupos, 3 partidos (uno
finalizado con goles, tarjeta y sustitución de ejemplo, dos programados) —
para que puedas ver cómo luce todo de inmediato. Bórralos desde el panel
de administración cuando quieras empezar con tus datos reales.
