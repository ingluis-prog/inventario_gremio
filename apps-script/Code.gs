/**
 * Inventario del Gremio — backend en Google Apps Script.
 * Guarda cada compra y consumo como una fila en la hoja "movimientos".
 *
 * Configuración (una sola vez):
 *  1. Ejecuta la función "configurar" desde el editor y autoriza el acceso.
 *  2. En Configuración del proyecto > Propiedades del script, cambia
 *     CLAVE_GREMIO por la clave que acuerden entre los 6.
 *  3. Implementar > Nueva implementación > Aplicación web
 *     (Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario).
 */

const HOJA = "movimientos";
const COLUMNAS = ["id", "tipo", "producto", "categoria", "paquetes", "unidades", "cantidad", "comprador", "miembro", "costo", "fecha"];
const TIPOS = ["compra", "consumo"];

function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) sh = ss.insertSheet(HOJA);
  sh.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight("bold");
  sh.setFrozenRows(1);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("CLAVE_GREMIO")) props.setProperty("CLAVE_GREMIO", "cambiar-esta-clave");
}

function hoja_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
  if (!sh) throw new Error("Falta la hoja '" + HOJA + "'. Ejecuta configurar().");
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function leer_() {
  const sh = hoja_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, COLUMNAS.length).getValues();
  return values
    .filter(function (r) { return r[0] !== ""; })
    .map(function (r) {
      const o = {};
      COLUMNAS.forEach(function (c, i) { o[c] = r[i]; });
      return o;
    });
}

function doGet(e) {
  try {
    return json_({ ok: true, rows: leer_() });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const clave = PropertiesService.getScriptProperties().getProperty("CLAVE_GREMIO");
    if (!clave || body.key !== clave) return json_({ ok: false, error: "clave" });

    lock.waitLock(10000);
    const sh = hoja_();

    if (body.action === "add") {
      const r = body.row || {};
      if (TIPOS.indexOf(r.tipo) < 0) throw new Error("Tipo inválido");
      const cantidad = Math.floor(Number(r.cantidad));
      if (!(cantidad > 0)) throw new Error("Cantidad inválida");
      if (!String(r.producto || "").trim()) throw new Error("Falta el producto");
      const fila = {
        id: Utilities.getUuid(),
        tipo: r.tipo,
        producto: String(r.producto).trim().slice(0, 80),
        categoria: String(r.categoria || "Otro").slice(0, 30),
        paquetes: r.paquetes || "",
        unidades: r.unidades || "",
        cantidad: cantidad,
        comprador: String(r.comprador || "").slice(0, 60),
        miembro: String(r.miembro || "").slice(0, 60),
        costo: Number(r.costo) || 0,
        fecha: Date.now()
      };
      sh.appendRow(COLUMNAS.map(function (c) { return fila[c]; }));
      return json_({ ok: true, id: fila.id });
    }

    if (body.action === "delete") {
      const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
      for (let i = ids.length - 1; i >= 1; i--) {
        if (ids[i][0] === body.id) { sh.deleteRow(i + 1); return json_({ ok: true }); }
      }
      return json_({ ok: false, error: "No se encontró el movimiento" });
    }

    return json_({ ok: false, error: "Acción desconocida" });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}
