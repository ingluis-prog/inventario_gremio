/* Inventario del Gremio — lógica de la página.
   Los datos viven en una Google Sheet a través de Apps Script (ver apps-script/Code.gs). */
(function () {
  const CFG = window.GREMIO_CONFIG || {};
  const MEMBERS = CFG.MEMBERS || [];
  const API = CFG.API_URL || "";
  const POOL = "Bolsa común";
  const N = MEMBERS.length;
  const KEY_STORE = "gremio-clave";
  const ME_STORE = "gremio-me";

  let events = [];
  let busy = false;

  const $ = (id) => document.getElementById(id);
  const norm = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  const fmtDate = (ts) => new Date(Number(ts)).toLocaleString("es-PA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const money = (n) => "B/. " + Number(n).toFixed(2);
  const first = (n) => n.split(" ")[0];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- API (Apps Script) ---------- */
  const configured = API && !API.startsWith("PEGA_AQUI");

  async function apiList() {
    const r = await fetch(API + "?action=list&t=" + Date.now());
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Error al leer");
    return j.rows;
  }
  async function apiPost(body) {
    // text/plain evita la verificación CORS previa, que Apps Script no soporta.
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, key: store.get(KEY_STORE) || "" })
    });
    const j = await r.json();
    if (!j.ok) {
      if (j.error === "clave") { store.del(KEY_STORE); showKey(true); throw new Error("Clave del gremio incorrecta"); }
      throw new Error(j.error || "Error al guardar");
    }
    return j;
  }

  /* ---------- Miembro activo ---------- */
  let me = store.get(ME_STORE);
  if (!MEMBERS.includes(me)) me = MEMBERS[MEMBERS.length - 1];

  function opts(sel, list, val) {
    sel.innerHTML = "";
    list.forEach((v) => { const o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
    if (val != null) sel.value = val;
  }
  opts($("me"), MEMBERS, me);
  opts($("bBuyer"), MEMBERS, me);
  opts($("uWho"), [...MEMBERS, POOL], me);
  $("me").addEventListener("change", (e) => {
    me = e.target.value; store.set(ME_STORE, me);
    $("bBuyer").value = me; $("uWho").value = me; render();
  });

  /* ---------- Reparto ----------
     Por producto: disponible = comprado − consumido de la bolsa común.
     Cada miembro recibe floor(disponible / N); la bolsa común guarda el resto. */
  function compute() {
    const P = new Map();
    for (const e of events) {
      const k = norm(e.producto); if (!k) continue;
      if (!P.has(k)) P.set(k, { k, name: e.producto, cat: e.categoria || "Otro", bought: 0, poolUsed: 0, used: Object.fromEntries(MEMBERS.map((m) => [m, 0])) });
      const p = P.get(k);
      const q = Number(e.cantidad) || 0;
      if (e.tipo === "compra") { p.bought += q; p.name = e.producto; p.cat = e.categoria || p.cat; }
      else if (e.tipo === "consumo") {
        if (e.miembro === POOL) p.poolUsed += q;
        else if (p.used[e.miembro] != null) p.used[e.miembro] += q;
      }
    }
    for (const p of P.values()) {
      const avail = p.bought - p.poolUsed;
      p.each = Math.floor(avail / N);
      p.pool = avail - p.each * N;
      p.left = Object.fromEntries(MEMBERS.map((m) => [m, p.each - p.used[m]]));
    }
    return [...P.values()].sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  }

  /* ---------- Render ---------- */
  function render() {
    const prods = compute();
    $("prodList").innerHTML = prods.map((p) => `<option value="${esc(p.name)}">`).join("");

    const tbl = $("tbl");
    if (!prods.length) tbl.innerHTML = "";
    else {
      let h = "<thead><tr><th>Producto</th><th>Total</th><th>C/u</th><th title="Bolsa común">Bolsa</th>" +
        MEMBERS.map((m) => `<th class="${m === me ? "me" : ""}" title="${esc(m)}">${esc(first(m))}</th>`).join("") + "</tr></thead><tbody>";
      for (const p of prods) {
        h += `<tr><td><span class="cat">${esc(p.cat)}</span>${esc(p.name)}</td><td class="num">${p.bought}</td><td class="num">${p.each}</td><td><span class="pool ${p.pool ? "" : "zero"}">${p.pool}</span></td>` +
          MEMBERS.map((m) => `<td class="num ${m === me ? "me" : ""}">${p.left[m]} <span class="of">/ ${p.each}</span></td>`).join("") + "</tr>";
      }
      tbl.innerHTML = h + "</tbody>";
    }

    $("mineTitle").textContent = "Saldo de " + me;
    $("mine").innerHTML = prods.length
      ? prods.map((p) => `<div class="it ${p.left[me] ? "" : "zero"}"><span class="n">${p.left[me]}</span><span class="l">${esc(p.name)}</span></div>`).join("")
      : `<p class="empty">Aún no hay productos. Carga la primera compra.</p>`;

    const cur = $("uProd").value;
    $("uProd").innerHTML = prods.length
      ? prods.map((p) => `<option value="${esc(p.k)}">${esc(p.name)}</option>`).join("")
      : `<option value="">Sin productos todavía</option>`;
    if (cur && prods.some((p) => p.k === cur)) $("uProd").value = cur;

    const ev = [...events].sort((a, b) => Number(b.fecha) - Number(a.fecha)).slice(0, 60);
    $("hist").innerHTML = ev.length ? ev.map((e) => {
      const isC = e.tipo === "compra";
      const txt = isC
        ? `${esc(e.comprador)} compró <b>${esc(e.cantidad)}</b> ${esc(e.producto)}${e.paquetes ? ` <span class="d">(${esc(e.paquetes)}×${esc(e.unidades)})</span>` : ""}${Number(e.costo) ? ` · ${money(e.costo)}` : ""}`
        : `${esc(e.miembro)} consumió <b>${esc(e.cantidad)}</b> ${esc(e.producto)}`;
      return `<div class="e"><span class="tag ${isC ? "c" : "u"}">${isC ? "Compra" : "Consumo"}</span><div class="t">${txt}<div class="d">${fmtDate(e.fecha)}</div></div><button class="ghost" data-del="${esc(e.id)}">Borrar</button></div>`;
    }).join("") : `<p class="empty">Aquí aparecerá cada compra y consumo registrado.</p>`;

    previewBuy(); previewUse();
  }

  function previewBuy() {
    const packs = +$("bPacks").value || 0, units = +$("bUnits").value || 0, qty = packs * units, cost = +$("bCost").value || 0;
    const p = compute().find((x) => x.k === norm($("bName").value));
    const prevPool = p ? p.pool : 0;
    const tot = qty + prevPool, each = Math.floor(tot / N), rest = tot - each * N;
    const el = $("bPrev");
    if (!qty) { el.className = "preview err"; el.textContent = "Indica paquetes y unidades."; return; }
    el.className = "preview" + (rest ? " warn" : "");
    el.innerHTML = `${qty} unidades${prevPool ? ` + ${prevPool} de la bolsa` : ""} → <b>${each} c/u</b>${rest ? ` · ${rest} a la bolsa común` : ""}${cost ? `<br>${money(cost / N)} por persona` : ""}`;
  }
  function previewUse() {
    const p = compute().find((x) => x.k === $("uProd").value);
    const who = $("uWho").value, q = +$("uQty").value || 0, el = $("uPrev");
    if (!p) { el.className = "preview warn"; el.textContent = "Carga una compra primero."; $("uBtn").disabled = true; return; }
    const have = who === POOL ? p.pool : p.left[who];
    $("uBtn").disabled = busy || q < 1 || q > have;
    if (q > have) { el.className = "preview err"; el.textContent = `${who === POOL ? "La bolsa común" : first(who)} solo tiene ${have} de ${p.name}.`; }
    else { el.className = "preview"; el.textContent = `${who === POOL ? "Bolsa común" : first(who)}: ${have} → ${have - q} ${p.name}`; }
  }
  ["bPacks", "bUnits", "bCost", "bName"].forEach((id) => $(id).addEventListener("input", previewBuy));
  ["uWho", "uProd", "uQty"].forEach((id) => $(id).addEventListener("input", previewUse));

  let toastT;
  function toast(m) { const t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2400); }
  function setStatus(msg, err) { $("status").textContent = msg; $("status").className = "status" + (err ? " err" : ""); }

  /* ---------- Clave ---------- */
  function showKey(v) { $("keyPanel").hidden = !v; if (v) $("keyInput").focus(); }
  function needKey() { if (!store.get(KEY_STORE)) { showKey(true); toast("Primero escribe la clave del gremio"); return true; } return false; }
  $("fKey").addEventListener("submit", (e) => { e.preventDefault(); store.set(KEY_STORE, $("keyInput").value.trim()); $("keyInput").value = ""; showKey(false); toast("Clave guardada"); });
  $("changeKey").addEventListener("click", () => { store.del(KEY_STORE); showKey(true); });

  /* ---------- Acciones ---------- */
  $("fBuy").addEventListener("submit", async (ev) => {
    ev.preventDefault(); if (!configured || needKey()) return;
    const name = $("bName").value.trim();
    const packs = Math.floor(+$("bPacks").value), units = Math.floor(+$("bUnits").value);
    if (!name || packs < 1 || units < 1) return;
    const existing = compute().find((x) => x.k === norm(name));
    const c = parseFloat($("bCost").value);
    const row = { tipo: "compra", producto: existing ? existing.name : name, categoria: $("bCat").value, paquetes: packs, unidades: units, cantidad: packs * units, comprador: $("bBuyer").value, miembro: "", costo: c > 0 ? Math.round(c * 100) / 100 : 0 };
    $("bBtn").disabled = true;
    try { await apiPost({ action: "add", row }); toast("Compra cargada"); $("bName").value = ""; $("bCost").value = ""; $("bPacks").value = 1; await refresh(); }
    catch (e) { toast(e.message || "No se pudo guardar"); }
    finally { $("bBtn").disabled = false; }
  });

  $("fUse").addEventListener("submit", async (ev) => {
    ev.preventDefault(); if (!configured || needKey()) return;
    const p = compute().find((x) => x.k === $("uProd").value); if (!p) return;
    const who = $("uWho").value, q = Math.floor(+$("uQty").value);
    const have = who === POOL ? p.pool : p.left[who];
    if (q < 1 || q > have) return;
    busy = true; previewUse();
    try { await apiPost({ action: "add", row: { tipo: "consumo", producto: p.name, categoria: p.cat, paquetes: "", unidades: "", cantidad: q, comprador: "", miembro: who, costo: 0 } }); toast("Consumo registrado"); $("uQty").value = 1; await refresh(); }
    catch (e) { toast(e.message || "No se pudo guardar"); }
    finally { busy = false; previewUse(); }
  });

  let armed = null;
  $("hist").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-del]"); if (!b || !configured) return;
    if (armed !== b) { if (armed) { armed.classList.remove("armed"); armed.textContent = "Borrar"; } armed = b; b.classList.add("armed"); b.textContent = "¿Seguro?"; return; }
    if (needKey()) return;
    b.disabled = true;
    try { await apiPost({ action: "delete", id: b.dataset.del }); toast("Movimiento borrado"); await refresh(); }
    catch (e) { toast(e.message || "No se pudo borrar"); b.disabled = false; }
    armed = null;
  });

  /* ---------- Carga ---------- */
  async function refresh() {
    try {
      events = await apiList();
      setStatus("Saldo restante / asignado a cada uno. Se actualiza cada " + (CFG.REFRESH_SECONDS || 15) + " s.");
      render();
    } catch (e) {
      setStatus("No se pudo leer la hoja del gremio. Revisa la URL en config.js o tu conexión.", true);
    }
  }

  render();
  if (!configured) {
    setStatus("Falta configurar: pega la URL de tu Apps Script en config.js (ver README).", true);
  } else {
    if (!store.get(KEY_STORE)) showKey(true);
    refresh();
    setInterval(() => { if (!document.hidden && !busy) refresh(); }, (CFG.REFRESH_SECONDS || 15) * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  }
})();
