// Configuración del Inventario del Gremio.
// 1. Despliega apps-script/Code.gs como "Aplicación web" (ver README.md).
// 2. Pega aquí la URL que te da Google (termina en /exec).
window.GREMIO_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwTZHnWOXq_83Mv_fWO7obsTGd7VThmeLlUJKbC6_a157OxvKrTwegWhrtnweqhWj3z/exec",

  // Miembros del gremio (el reparto se hace entre todos los de esta lista).
  MEMBERS: [
    "Alejandro Savedra",
    "Ian Outen",
    "Ernie Biens",
    "Jassiel Solis",
    "Germán Peña",
    "Luis Mendoza"
  ],

  // Cada cuántos segundos se refresca el inventario desde la hoja.
  REFRESH_SECONDS: 15
};
