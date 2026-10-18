(() => {
"use strict";
/* Se o navegador bloquear o armazenamento (quadros isolados, modo privado), usa a memória da aba. Assim a tela de entrada e o app funcionam, mas nada fica salvo ao fechar. */
const SEM_ARMAZENAMENTO = [];
["localStorage", "sessionStorage"].forEach(nome => {
  let ok = true; try{ const st = window[nome]; st.setItem("lc:t", "1"); st.removeItem("lc:t"); }catch(e){ ok = false; }
  if (ok) return;
  const mp = new Map(), mem = {getItem:k => mp.has(String(k)) ? mp.get(String(k)) : null, setItem:(k, v) => { mp.set(String(k), String(v)); }, removeItem:k => { mp.delete(String(k)); }, clear:() => mp.clear(), key:i => [...mp.keys()][i] ?? null, get length(){ return mp.size; }};
  try{ Object.defineProperty(window, nome, {value:mem, configurable:true}); SEM_ARMAZENAMENTO.push(nome); }catch(e){}
});
function avisoTopo(t){
  if (document.getElementById("lcAviso")) return; const d = document.createElement("div"); d.id = "lcAviso"; d.setAttribute("role", "status");
  d.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99999;background:#E8A317;color:#111;padding:8px 12px;font:13px/1.35 system-ui,Arial,sans-serif;display:flex;gap:10px;align-items:center;justify-content:space-between;pointer-events:none";
  d.innerHTML = "<span></span><button type='button' style='border:0;background:#111;color:#fff;border-radius:8px;padding:6px 10px;font:inherit;pointer-events:auto'>Entendi</button>"; d.firstChild.textContent = t; d.lastChild.onclick = () => d.remove(); (document.body || document.documentElement).appendChild(d);
}

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const su = u => { const s = String(u == null ? "" : u).trim(); return /^https?:\/\//i.test(s) ? esc(s) : "#"; };
const BRL = new Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"});
const money = x => BRL.format(isFinite(x) ? x : 0);
const pct = x => (isFinite(x) ? x * 100 : 0).toFixed(1).replace(".", ",") + "%";
const n = v => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v ?? "").trim(); if (!s) return 0;
  s = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : (/^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s);
  const x = parseFloat(s); return isFinite(x) ? x : 0;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fdate = d => d ? d.split("-").reverse().join("/") : "";
const clone = o => JSON.parse(JSON.stringify(o));

const ST = ["Achada","Acompanhando","Selecionada","Proposta enviada","Em disputa","Ganha","Perdida","Entregue","Recebida"];
const REAL = ["Ganha","Entregue","Recebida"];
const MOD = ["Pregão eletrônico","Dispensa eletrônica","Dispensa direta","Cotação","Outra"];
const stCls = s => REAL.includes(s) ? "ok" : s === "Perdida" ? "bd" : (s === "Em disputa" || s === "Proposta enviada") ? "wn" : "";

/* ---------- dados ---------- */
const KEY = "lancecerto:v1";
const DOCS0 = () => [
  {id:"d1", nome:"Registro no SICAF (níveis I a VI)", link:"https://www.gov.br/compras/pt-br/acesso-a-informacao/perguntas-frequentes/sicaf-sistema/sicaf-sistema"},
  {id:"d2", nome:"Certidão negativa de débitos federais (Receita e PGFN)", link:"https://www.gov.br/receitafederal/pt-br"},
  {id:"d3", nome:"CRF do FGTS", link:"https://consulta-crf.caixa.gov.br"},
  {id:"d4", nome:"Certidão negativa de débitos trabalhistas (CNDT)", link:"https://cndt-certidao.tst.jus.br"},
  {id:"d5", nome:"Certidão negativa estadual"},
  {id:"d6", nome:"Certidão negativa municipal"},
  {id:"d7", nome:"Certidão de falência e recuperação judicial"},
  {id:"d8", nome:"Certificado digital e-CNPJ"}
].map(d => ({num:"", venc:"", link:"", obs:"", ...d}));
const DEF = {
  cfg:{tema:"auto", lembretes:[1440, 60, 15], alertaSeg:5, alertaSom:true, regime:"MEI", dasMei:82.05, vendasMes:1, aliq:4, margem:15, limite:81000, ano:new Date().getFullYear(), avisoDias:15, ajudaVista:false},
  calc:{preco:"", qtd:"1", custo:"", frete:"", outros:"", margem:"15"},
  lic:[], forn:[], cot:[], docs:DOCS0(), watch:[], alertas:[], nichos:[], transp:[], frete:[], pedidos:[], fired:{}, orcTot:{}, cidades:[], radar:[], prev:[], editais:[], nfe:{d:null, notas:[]}, reg:{ativo:false, pagos:{}, dasn:{}, checks:{}, ultima:null}, fin:{prop:[], ped:[], parc:[], com:{modelo:"comissao", antec:0.8, giro:1.2, garantia:15, cpa:60}}, sec:{papel:"fornecedor", totp:null, totpSecret:"", fbRefresh:""}, audit:[], perfil:{nichos:[], palavras:"", exclui:"", vmin:"", vmax:"", ufs:[], mods:[], cnaeNovo:""},
  empresa:{logradouro:"", numero:"", bairro:"", cep:"", razao:"", fantasia:"", cnpj:"", ie:"", tel:"", email:"", end:"", cidade:"", uf:""}
};
let warned = false;
function load(){
  try{
    const r = localStorage.getItem(KEY);
    if (r){ const o = JSON.parse(r); return {...clone(DEF), ...o, cfg:{...DEF.cfg, ...o.cfg}, calc:{...DEF.calc, ...o.calc}}; }
  }catch(e){}
  return clone(DEF);
}
let S = load();
if (!Array.isArray(S.docs)) S.docs = clone(DEF.docs);
["watch", "alertas", "nichos", "transp", "frete", "pedidos"].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
S.empresa = {...DEF.empresa, ...(S.empresa || {})};
if (!S.fired || typeof S.fired !== "object") S.fired = {};
if (!S.orcTot || typeof S.orcTot !== "object") S.orcTot = {};
if (!Array.isArray(S.cidades)) S.cidades = [];
if (!Array.isArray(S.radar)) S.radar = [];
if (!Array.isArray(S.prev)) S.prev = [];
if (!Array.isArray(S.editais)) S.editais = [];
S.nfe = {d:null, notas:[], ...(S.nfe || {})}; if (!Array.isArray(S.nfe.notas)) S.nfe.notas = [];
S.reg = {ativo:false, pagos:{}, dasn:{}, checks:{}, ultima:null, ...(S.reg || {})}; ["pagos", "dasn", "checks"].forEach(k => { if (!S.reg[k] || typeof S.reg[k] !== "object") S.reg[k] = {}; });
S.perfil = {...DEF.perfil, ...(S.perfil || {})}; ["nichos", "ufs", "mods"].forEach(k => { if (!Array.isArray(S.perfil[k])) S.perfil[k] = []; });
S.fin = {...DEF.fin, ...(S.fin || {})}; ["prop", "ped", "parc"].forEach(k => { if (!Array.isArray(S.fin[k])) S.fin[k] = []; }); S.fin.com = {...DEF.fin.com, ...(S.fin.com || {})};
S.sec = {...DEF.sec, ...(S.sec || {})}; if (!Array.isArray(S.audit)) S.audit = [];
(function(){ const C = window.LC_CONFIG || {}; ["fbApiKey", "fbProject", "fbBucket", "apiUrl", "aiProxy", "nfeProxy"].forEach(k => { if (C[k] && !S.cfg[k]) S.cfg[k] = String(C[k]); }); })();
if (!Array.isArray(S.empresa.cnaes)) S.empresa.cnaes = [];
function save(){
  try{ schedSoon(); }catch(e){}
  try{ localStorage.setItem(KEY, JSON.stringify(S, (k, v) => (VAULT.key && SECRET_KEYS.has(k)) ? undefined : v)); if (VAULT.key) vaultSoon(); }
  catch(e){ if(!warned){ warned = true; toast("Este navegador não permitiu salvar. Exporte um backup em Resumo."); } }
}
const ui = {enter:true, tab:"hub", fl:"Todas", qf:"", qc:"", bq:{item:"", valor:"", faixa:"30", vmin:"", vmax:"", nicho:"", uf:"", mod:""}, avisos:[], nf:""};

/* ---------- cálculo ---------- */
function calc(v){
  const c = S.cfg, q = v.qtd > 0 ? v.qtd : 1;
  const receita = v.preco * q, forn = v.custo * q, extra = v.frete + v.outros;
  const das = c.regime === "MEI" ? c.dasMei / Math.max(c.vendasMes, 1) : receita * c.aliq / 100;
  const custo = forn + extra + das, lucro = receita - custo;
  const margem = receita > 0 ? lucro / receita : 0;
  const m = (v.margem || 0) / 100;
  const maxForn = (receita - extra - das - m * receita) / q;
  const a = c.regime === "MEI" ? 0 : c.aliq / 100, den = 1 - a - m;
  const minLance = den > 0 ? (forn + extra + (c.regime === "MEI" ? das : 0)) / den / q : null;
  return {receita, forn, extra, das, custo, lucro, margem, maxForn, minLance, q};
}
const dasLabel = () => S.cfg.regime === "MEI"
  ? `DAS do MEI (rateio de ${S.cfg.vendasMes} venda${S.cfg.vendasMes > 1 ? "s" : ""} no mês)`
  : `Simples Nacional (${String(S.cfg.aliq).replace(".", ",")}% da venda)`;
const licVals = x => ({preco:n(x.preco), qtd:n(x.qtd) || 1, custo:n(x.custo), frete:n(x.frete), outros:n(x.outros), margem:S.cfg.margem});

/* ---------- utilidades de interface ---------- */
function toast(t){
  document.querySelectorAll(".toast").forEach(e => e.remove());
  const e = document.createElement("div"); e.className = "toast"; e.textContent = t; e.setAttribute("role", "status");
  document.body.appendChild(e); setTimeout(() => e.remove(), 3200);
}
function closeSheet(){ document.querySelectorAll("#sheet,#cbox").forEach(e => e.remove()); }
function confirmBox(msg, yes, label){
  const bg = document.createElement("div"); bg.className = "bg cbox"; bg.id = "cbox";
  bg.innerHTML = `<div class="sheet" role="alertdialog" aria-modal="true"><p>${esc(msg)}</p><div class="row"><button class="btn ghost" data-c="no">Cancelar</button><button class="btn danger" data-c="yes">${esc(label || "Excluir")}</button></div></div>`;
  bg.addEventListener("click", e => {
    const c = e.target.closest("[data-c]");
    if (e.target === bg || (c && c.dataset.c === "no")) bg.remove();
    else if (c && c.dataset.c === "yes"){ bg.remove(); yes(); }
  });
  document.body.appendChild(bg);
}
function fieldHTML(f, val){
  const cls = "f" + (f.w ? " " + f.w : "");
  let inner;
  if (f.t === "sel") inner = `<select name="${f.k}" id="f_${f.k}">${f.o.map(([v, t]) => `<option value="${esc(v)}"${String(val ?? "") === String(v) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  else if (f.t === "area") inner = `<textarea name="${f.k}" id="f_${f.k}">${esc(val)}</textarea>`;
  else if (f.t === "time") inner = `<input type="time" name="${f.k}" id="f_${f.k}" value="${esc(val)}">`;
  else if (f.t === "date") inner = `<input type="date" name="${f.k}" id="f_${f.k}" value="${esc(val)}">`;
  else if (f.t === "num") inner = `<input name="${f.k}" id="f_${f.k}" inputmode="decimal" autocomplete="off" value="${val == null || val === 0 || val === "" ? "" : esc(String(val).replace(".", ","))}">`;
  else inner = `<input name="${f.k}" id="f_${f.k}" autocomplete="off" value="${esc(val)}">`;
  return `<div class="${cls}"><label for="f_${f.k}">${esc(f.l)}</label>${inner}</div>`;
}
function openForm(o){
  closeSheet();
  const bg = document.createElement("div"); bg.className = "bg"; bg.id = "sheet";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
    <div class="sh-h"><h2>${esc(o.title)}</h2><button class="x" data-s="cancel" aria-label="Fechar">✕</button></div>
    <div class="sh-b"><div class="fg">${o.fields.map(f => fieldHTML(f, o.vals[f.k])).join("")}</div>
    ${o.preview ? '<div id="pv" class="pv"></div>' : ""}${o.note ? `<p class="hint">${o.note}</p>` : ""}<div id="err" class="err" role="alert"></div></div>
    <div class="sh-f">${o.del ? '<button class="btn danger" data-s="del">Excluir</button>' : ""}<span class="sp"></span><button class="btn ghost" data-s="cancel">Cancelar</button><button class="btn" data-s="ok">Salvar</button></div></div>`;
  document.body.appendChild(bg);
  const read = () => { const v = {}; o.fields.forEach(f => { const el = bg.querySelector(`[name="${f.k}"]`); v[f.k] = f.t === "num" ? n(el.value) : el.value.trim(); }); return v; };
  const pv = () => { if (o.preview) $("#pv", bg).innerHTML = o.preview(read()); };
  bg.addEventListener("input", pv); bg.addEventListener("change", pv); pv();
  bg.addEventListener("click", e => {
    if (e.target === bg) return closeSheet();
    const s = e.target.closest("[data-s]"); if (!s) return;
    const a = s.dataset.s;
    if (a === "cancel") closeSheet();
    else if (a === "ok"){
      const v = read(), m = o.check ? o.check(v) : "";
      if (m){ $("#err", bg).textContent = m; return; }
      o.save(v); closeSheet(); save(); render();
    } else if (a === "del") confirmBox("Excluir este item? Não dá para desfazer.", () => { o.del(); closeSheet(); save(); render(); });
  });
  bg.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
}

/* ---------- navegação ---------- */
const ICON = {
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  lic:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  forn:'<path d="M4 10l1.5-5h13L20 10M4 10h16v10H4zM9 20v-5h6v5"/>',
  cot:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
  res:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  docs:'<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  hub:'<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/>',
  portais:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  mais:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'
};
const TABS = [["hub","Hub"],["calc","Calcular"],["lic","Licitações"],["docs","Documentos"],["mais","Mais"]];
const SUB = ["achaforn","planos","central","prop","juridico","logos","privadas","bancos","motor","exterior","forn","cot","res","ajuda","busca","nf","conta","modal","melhores","acomp","empresa","fretes","lances","pedidos","orcamento","obras","portais","radar","analise","perfil","fin","editais","nfe","regularidade","seguranca"];
function renderNav(){
  const cur = SUB.includes(ui.tab) ? "mais" : ui.tab, p = docProblems();
  const lh = $("#logoH"); if (lh && !lh.innerHTML) lh.innerHTML = LOGO(30, true);
  aplicaTema();
  $("#nav").innerHTML = `<div class="nav-brand">${LOGO(32)}<span class="wm"><small>LICITA</small><b>Lance Certo</b></span></div>` + TABS.map(([k, t]) => `<button data-a="tab" data-t="${k}"${cur === k ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>${t}${k === "docs" && p ? `<i class="dot" aria-label="${p} com problema">${p}</i>` : ""}</button>`).join("");
}
function go(t){ ui.tab = t; closeSheet(); ui.enter = true; render(); window.scrollTo(0, 0); }
function render(){
  if (!LOGOS_OK){ LOGOS_OK = true; logosCarrega(); }
  if (document.body.classList.contains("locked")) return;
  renderNav();
  const m = $("#main");
  ({calc:viewCalc, lic:viewLic, docs:viewDocs, portais:viewPortais, mais:viewMais, ajuda:viewAjuda, busca:viewBusca, nf:viewNf, conta:viewConta, modal:viewModal, melhores:viewMelhores, acomp:viewAcomp, empresa:viewEmpresa, fretes:viewFretes, lances:viewLances, pedidos:viewPedidos, orcamento:viewOrc, obras:viewObras, hub:viewHub, central:viewCentral, prop:viewProp, juridico:viewJuridico, logos:viewLogos, privadas:viewPrivadas, bancos:viewBancos, motor:viewMotor, exterior:viewExterior, radar:viewRadar, analise:viewAnalise, perfil:viewPerfil, fin:viewFin, editais:viewEditais, nfe:viewNfe, regularidade:viewRegularidade, seguranca:viewSeguranca, forn:viewForn, cot:viewCot, res:viewRes, planos:viewPlanos, paywall:viewPaywall, achaforn:viewAchaForn})[bloqueado(ui.tab) ? "paywall" : ui.tab](m);
  if (SUB.includes(ui.tab)) m.insertAdjacentHTML("afterbegin", ui.tab === "analise" ? '<button class="btn ghost sm back" data-a="tab" data-t="hub">‹ Hub</button>' : '<button class="btn ghost sm back" data-a="tab" data-t="mais">‹ Mais</button>');
  if (ui.tab === "hub") m.insertAdjacentHTML("afterbegin", '<div class="card item" data-a="tab" data-t="central" tabindex="0" role="button"><div class="top"><b>Central B2G</b><span aria-hidden="true">›</span></div><div class="meta" style="margin:0">Da oportunidade ao financeiro, em um só lugar.</div></div>');
  if (ui.tab === "hub" && plano() === "gratis") m.insertAdjacentHTML("afterbegin", '<div class="card pc item" data-a="tab" data-t="planos" tabindex="0" role="button"><div class="top"><b>Plano Grátis</b><span aria-hidden="true">›</span></div><div class="meta" style="margin:0">Libere propostas, Jurídico com IA, NF-e e financeiro a partir de R$ 163,33 por mês.</div></div>');
  if (ui.enter){ m.classList.remove("enter"); void m.offsetWidth; m.classList.add("enter"); contaAte(m); ui.enter = false; clearTimeout(ui.entT); ui.entT = setTimeout(() => m.classList.remove("enter"), 1100); }
  if (ui.tab !== "lances" && ui.wl) keepAwake(false);
  const pubN = S.prev.filter(x => x.etapa === "publicada").length;
  const dp0 = dasPend(); if ((dp0.atr || dp0.prox) && ui.tab !== "regularidade") m.insertAdjacentHTML("afterbegin", `<button class="alert" data-a="tab" data-t="regularidade"><span>${dp0.atr ? dp0.atr + " DAS em atraso" : "DAS vence em breve"}<small>Toque para ver a regularidade do CNPJ.</small></span><span aria-hidden="true">›</span></button>`);
  if (ui.tab === "nf") m.insertAdjacentHTML("afterbegin", '<div class="card pc"><b>Emitir pelo app</b><p>Preencha a nota linha por linha, com ajuda em cada campo, e envie ao emissor ou copie para a SEFAZ.</p><button class="btn sm" data-a="tab" data-t="nfe">Emitir nota fiscal</button></div>');
  if (pubN && ui.tab !== "hub" && ui.tab !== "analise") m.insertAdjacentHTML("afterbegin", `<button class="alert" data-a="tab" data-t="hub"><span>${pubN} compra${pubN > 1 ? "s" : ""} que você previu ${pubN > 1 ? "foram publicadas" : "foi publicada"}<small>Toque para analisar no Hub.</small></span><span aria-hidden="true">›</span></button>`);
  const nv = S.alertas.reduce((s, a) => s + (a.novos || 0), 0);
  if (nv && ui.tab !== "acomp") m.insertAdjacentHTML("afterbegin", `<button class="alert" data-a="tab" data-t="acomp"><span>${nv} oportunidade${nv > 1 ? "s" : ""} dentro dos seus alertas<small>Toque para ver e salvar.</small></span><span aria-hidden="true">›</span></button>`);
  if (ui.avisos && ui.avisos[0] && ui.tab !== "analise") m.insertAdjacentHTML("afterbegin", `<button class="alert" data-a="avisoOk"><span>${esc(ui.avisos[0].t)}<small>${esc(ui.avisos[0].b)}</small></span><span aria-hidden="true">›</span></button>`);
  const ses = ui.tab === "lances" ? null : S.lic.filter(x => ATIVAS.includes(x.status)).map(x => ({x, i:cdInfo(x, Date.now())})).filter(o => o.i && o.i.ms != null && o.i.ms < 3600000).sort((a, b) => a.i.ms - b.i.ms)[0];
  if (ses) m.insertAdjacentHTML("afterbegin", `<button class="alert" data-a="tab" data-t="lances"><span>${esc(ses.x.numero || ses.x.objeto || "Sessão")}: ${ses.i.t.toLowerCase()} ${Math.max(1, Math.ceil(ses.i.ms / 60000))} min<small>Toque para abrir o painel de lances.</small></span><span aria-hidden="true">›</span></button>`);
  const p = docProblems();
  if (ui.tab === "calc" && !S.cfg.ajudaVista) m.insertAdjacentHTML("afterbegin", '<div class="card pc"><b>Primeira vez aqui?</b><p>Veja em poucos passos como usar o app e como instalar no celular ou no computador.</p><div class="links" style="margin:0"><button class="btn sm" data-a="ajudaVer">Ver como usar</button><button class="btn ghost sm" data-a="ajudaFechar">Agora não</button></div></div>');
  if (ui.tab === "calc" && !S.empresa.cnpj) m.insertAdjacentHTML("afterbegin", '<div class="card pc"><b>Cadastre o CNPJ da sua empresa</b><p>Ele aparece nos textos das notas fiscais e ajuda a manter tudo no mesmo lugar.</p><button class="btn ghost sm" data-a="tab" data-t="empresa">Cadastrar CNPJ</button></div>');
  if (ui.tab === "lic" || ui.tab === "portais") m.insertAdjacentHTML("afterbegin", '<div class="card pc"><b>Quer disputar um valor, como R$ 5.000?</b><p>Veja as licitações abertas desse valor com o item que você escolher, no Brasil inteiro ou em um estado.</p><button class="btn ghost sm" data-a="tab" data-t="busca">Buscar por valor</button></div>');
  if (p && ui.tab !== "docs") m.insertAdjacentHTML("afterbegin", `<button class="alert" data-a="tab" data-t="docs"><span>${p} documento${p > 1 ? "s" : ""} vencido${p > 1 ? "s" : ""} ou perto de vencer<small>Toque para ver e regularizar.</small></span><span aria-hidden="true">›</span></button>`);
}

/* ---------- calculadora ---------- */
function viewCalc(m){
  const c = S.calc, cf = S.cfg;
  const inp = (k, l, w) => `<div class="f ${w || ""}"><label for="c_${k}">${l}</label><input id="c_${k}" data-c="${k}" inputmode="decimal" autocomplete="off" value="${esc(c[k])}"></div>`;
  m.innerHTML = `<h1>Calculadora de lance</h1>
  <p class="sub">Use antes de dar qualquer lance. Regime atual: ${cf.regime === "MEI" ? "MEI" : "Simples Nacional"}. Dá para trocar em Ajustes.</p>
  <div class="card"><div class="fg">
    ${inp("preco", "Lance (preço unitário)", "half")}${inp("qtd", "Quantidade", "half")}
    ${inp("custo", "Custo unitário do fornecedor", "half")}${inp("frete", "Frete total", "half")}
    ${inp("outros", "Outros custos totais", "half")}${inp("margem", "Margem desejada (%)", "half")}
  </div></div>
  <div id="calcGauge" class="card gauge" hidden></div>
  <div id="calcWhatIf" class="card" hidden><b>E se eu mudar o lance?</b><div class="wi-row"><span>-30%</span><input id="wi" type="range" min="70" max="130" step="1" value="100" aria-label="Variação do lance em porcentagem"><span>+30%</span></div><div id="wiOut" class="wi-out"></div><div class="actions" style="margin-bottom:0"><button class="btn ghost sm" data-a="wiUsa">Usar este lance</button></div></div>
  <div id="calcOut"></div>
  <div class="actions"><button class="btn" data-a="calcToLic">Salvar como licitação</button><button class="btn ghost" data-a="calcClear">Limpar</button></div>`;
  updateCalc();
}
function calcVals(){ const c = S.calc; return {preco:n(c.preco), qtd:n(c.qtd) || 1, custo:n(c.custo), frete:n(c.frete), outros:n(c.outros), margem:n(c.margem)}; }
function updateCalc(){
  const out = $("#calcOut"); if (!out) return;
  const v = calcVals();
  if (v.preco <= 0){ out.innerHTML = '<div class="card empty">Digite o lance para ver o lucro antes de enviar a proposta.</div>'; const g0 = $("#calcGauge"), w0 = $("#calcWhatIf"); if (g0) g0.hidden = true; if (w0) w0.hidden = true; return; }
  const r = calc(v);
  gaugeUpdate(r.margem * 100, v.margem); updateWhatIf();
  const st = r.lucro < 0 ? "bd" : (r.margem * 100 >= v.margem ? "ok" : "wn"), lucroAnt = ui.twL == null ? r.lucro : ui.twL; ui.twL = r.lucro;
  const txt = {ok:"Dentro da margem", wn:"Abaixo da margem", bd:"Prejuízo"}[st];
  out.innerHTML = `<div class="card res">
    <div class="stamp ${st}">${txt}</div>
    <div class="lbl">Lucro estimado</div>
    <div class="big ${st}">${money(r.lucro)}</div>
    <div class="sub" style="margin:0">${pct(r.margem)} sobre a venda, meta de ${String(v.margem).replace(".", ",")}%</div>
    ${v.custo <= 0 ? '<p class="hint">Informe o custo do fornecedor para o lucro ficar realista.</p>' : ""}
    <dl class="kv">
      <div><dt>Venda total</dt><dd>${money(r.receita)}</dd></div>
      <div><dt>Fornecedor (${r.q} un.)</dt><dd>${money(r.forn)}</dd></div>
      <div><dt>Frete e outros custos</dt><dd>${money(r.extra)}</dd></div>
      <div><dt>${dasLabel()}</dt><dd>${money(r.das)}</dd></div>
      <div><dt>Custo total</dt><dd>${money(r.custo)}</dd></div>
    </dl></div>
  <div class="card lim">
    <div class="k"><span>Custo máximo do fornecedor</span><b>${money(r.maxForn)}</b></div>
    <small>Por unidade, para fechar ${String(v.margem).replace(".", ",")}% de margem com este lance.</small>
    <div class="k"><span>Lance mínimo</span><b>${r.minLance == null ? "—" : money(r.minLance)}</b></div>
    <small>Por unidade, para fechar a margem com o custo informado.</small>
  </div>`;
  tweenNum(out.querySelector(".big"), lucroAnt, r.lucro, money);
}

/* ---------- licitações ---------- */
const licFields = () => [
  {k:"tipo", l:"Tipo de compra", t:"sel", o:[["", "Pública (governo)"], ["privada", "Privada (empresa)"]]}, {k:"orgao", l:"Órgão ou empresa compradora"}, {k:"cnpjOrg", l:"CNPJ do órgão (opcional)"},
  {k:"numero", l:"Número do pregão ou processo", w:"half"}, {k:"data", l:"Dia em que começam os lances", t:"date", w:"half"},
  {k:"hora", l:"Hora em que começam (Brasília)", t:"time", w:"half"}, {k:"dataFim", l:"Dia em que terminam (se for outro dia)", t:"date", w:"half"}, {k:"horaFim", l:"Hora em que terminam os lances (Brasília)", t:"time"},
  {k:"propData", l:"Prazo da proposta: data", t:"date", w:"half"}, {k:"propHora", l:"Prazo da proposta: hora (Brasília)", t:"time", w:"half"},
  {k:"objeto", l:"Objeto (o que será fornecido)", t:"area"},
  {k:"modalidade", l:"Modalidade", t:"sel", o:MOD.map(x => [x, x]), w:"half"}, {k:"status", l:"Situação", t:"sel", o:ST.map(x => [x, x]), w:"half"},
  {k:"fornId", l:"Fornecedor", t:"sel", o:[["", "Sem fornecedor"], ...S.forn.map(f => [f.id, f.nome])]},
  {k:"preco", l:"Lance (preço unitário)", t:"num", w:"half"}, {k:"qtd", l:"Quantidade", t:"num", w:"half"},
  {k:"custo", l:"Custo unitário do fornecedor", t:"num", w:"half"}, {k:"frete", l:"Frete total", t:"num", w:"half"},
  {k:"outros", l:"Outros custos totais", t:"num"},
  {k:"eAlvo", l:"Estratégia: meta de lance (preço unitário)", t:"num", w:"half"}, {k:"eModo", l:"Lance final nos últimos segundos", t:"sel", o:[["", "Usar o padrão do app"], ["manual", "Manual (aviso e valor)"], ["assistido", "Automático assistido"]], w:"half"},
  {k:"eNota", l:"Estratégia e anotações (concorrentes, plano, limites)", t:"area"},
  {k:"link", l:"Link do edital ou da sessão"}, {k:"obs", l:"Observações", t:"area"}
];
function editLic(id, pre){
  const cur = id ? S.lic.find(x => x.id === id) : null;
  const vals = cur || {status:"Achada", modalidade:MOD[0], qtd:1, ...pre};
  openForm({
    title: cur ? "Editar licitação" : "Nova licitação", fields: licFields(), vals,
    note: docProblems() ? "Atenção: há documentos vencidos ou perto de vencer. Regularize antes da sessão." : "",
    check: v => (v.orgao || v.objeto) ? "" : "Informe o órgão ou o objeto.",
    preview: v => {
      if (v.preco <= 0) return '<span class="sub">Preencha o lance para ver o lucro.</span>';
      const r = calc({...v, qtd:v.qtd || 1, margem:S.cfg.margem});
      return `<div><span>Lucro estimado</span><b class="${r.lucro < 0 ? "bd" : "ok"}">${money(r.lucro)}</b></div><div><span>Margem</span><b>${pct(r.margem)}</b></div><div><span>Piso para a sua margem</span><b>${r.minLance == null ? "—" : money(r.minLance)}</b></div><div><span>${dasLabel()}</span><b>${money(r.das)}</b></div>`;
    },
    save: v => { const antes = cur ? cur.status : null; if (cur) Object.assign(cur, v); else S.lic.unshift({id:uid(), ...v}); if (v.status !== antes){ if (v.status === "Proposta enviada") setTimeout(() => confirmaCheck("Proposta registrada"), 250); else if (v.status === "Ganha") setTimeout(() => confirmaCheck("Licitação ganha"), 250); } },
    del: cur ? () => { S.lic = S.lic.filter(x => x.id !== id); } : null
  });
}
function viewLic(m){
  const seg = ui.lv || "agenda";
  m.innerHTML = `<div class="bar"><h1>Licitações</h1><button class="btn" data-a="newLic">Nova</button></div>
  <div class="seg" role="tablist" aria-label="Visão das licitações">${[["agenda", "Agenda"], ["funil", "Funil"], ["lista", "Lista"]].map(([k, t]) => `<button role="tab" aria-selected="${seg === k}" class="${seg === k ? "on" : ""}" data-a="licSeg" data-v="${k}">${t}</button>`).join("")}</div>
  <div id="licBody">${seg === "agenda" ? agendaHTML() : seg === "funil" ? funilHTML() : listaHTML()}</div>`;
  barrasAnima(m);
}
function listaHTML(){
  const cnt = s => s === "Todas" ? S.lic.length : S.lic.filter(x => x.status === s).length;
  const list = S.lic.filter(x => ui.fl === "Todas" || x.status === ui.fl);
  return `<div class="actions" style="margin:0 0 10px"><button class="btn ghost sm" data-a="tab" data-t="busca">Buscar licitações no Brasil por valor</button><button class="btn ghost sm" data-a="tab" data-t="lances">Painel de lances</button><button class="btn ghost sm" data-a="tab" data-t="pedidos">Rastrear pedidos</button></div>
  <div class="chips" role="tablist">${["Todas", ...ST].map(s => `<button class="chip${ui.fl === s ? " on" : ""}" data-a="fl" data-v="${s}">${s} (${cnt(s)})</button>`).join("")}</div>
  ${list.length ? list.map(x => {
    const r = calc(licVals(x)), f = S.forn.find(y => y.id === x.fornId);
    return `<div class="card item" data-a="editLic" data-id="${x.id}" tabindex="0" role="button">
      <div class="top"><b>${esc(x.objeto || x.orgao)}</b><span class="tag ${stCls(x.status)}">${esc(x.status)}</span></div>
      <div class="meta">${esc([x.orgao && x.objeto ? x.orgao : "", x.numero ? "nº " + x.numero : "", x.data ? "sessão em " + fdate(x.data) : "", f ? "fornecedor " + f.nome : ""].filter(Boolean).join(", "))}</div>
      <div class="nums"><div><small>Venda total</small><b>${money(r.receita)}</b></div><div><small>Lucro estimado</small><b class="${r.lucro < 0 ? "bd" : "ok"}">${money(r.lucro)}</b></div></div>
      ${/^https?:\/\//.test(x.link || "") ? `<div class="links"><a class="btn ghost sm" href="${su(x.link)}" target="_blank" rel="noopener">Abrir edital</a></div>` : ""}
    </div>`;
  }).join("") : `<div class="card empty">${S.lic.length ? "Nenhuma licitação com essa situação." : "Nenhuma licitação ainda. Toque em Nova ou salve uma na calculadora."}</div>`}`;
}

/* ---------- fornecedores ---------- */
const fornFields = () => [
  {k:"nome", l:"Nome do fornecedor"}, {k:"tel", l:"Telefone ou WhatsApp", w:"half"}, {k:"email", l:"E-mail", w:"half"},
  {k:"cidade", l:"Cidade e UF", w:"half"}, {k:"cnpj", l:"CNPJ", w:"half"},
  {k:"prod", l:"Produtos que fornece", t:"area"}, {k:"prazo", l:"Prazo de entrega e condições"}, {k:"obs", l:"Observações", t:"area"}
];
function editForn(id, pre){
  const cur = id ? S.forn.find(x => x.id === id) : null;
  openForm({
    title: cur ? "Editar fornecedor" : "Novo fornecedor", fields: fornFields(), vals: cur || {...pre},
    check: v => !v.nome ? "Informe o nome do fornecedor." : (v.cnpj && !cnpjOk(v.cnpj)) ? "O CNPJ está inválido. Confira os números." : "",
    save: v => { if (cur) Object.assign(cur, v); else S.forn.unshift({id:uid(), ...v}); },
    del: cur ? () => { S.forn = S.forn.filter(x => x.id !== id); } : null
  });
}
function viewForn(m){
  m.innerHTML = `<div class="bar"><h1>Fornecedores</h1><button class="btn" data-a="newForn">Novo</button></div>
  <button class="card item" data-a="tab" data-t="melhores" style="width:100%;text-align:left"><div class="top"><b>Melhores fornecedores por produto</b><span aria-hidden="true">›</span></div><div class="meta" style="margin:0">Veja as 4 empresas que mais fecharam contratos com o governo em cada nicho.</div></button>
  <div class="bar"><input id="qf" type="search" placeholder="Buscar por nome, produto ou cidade" value="${esc(ui.qf)}" aria-label="Buscar fornecedor"></div><div id="flist"></div>`;
  fillForn();
}
function fillForn(){
  const q = ui.qf.toLowerCase(), box = $("#flist"); if (!box) return;
  const list = S.forn.filter(f => !q || [f.nome, f.prod, f.cidade, f.cnpj, f.obs].join(" ").toLowerCase().includes(q));
  box.innerHTML = list.length ? list.map(f => {
    const d = (f.tel || "").replace(/\D/g, ""), wa = d.length >= 10 ? (d.length <= 11 ? "55" + d : d) : "";
    return `<div class="card item" data-a="editForn" data-id="${f.id}" tabindex="0" role="button">
      <div class="top"><b>${esc(f.nome)}</b>${f.cidade ? `<span class="tag">${esc(f.cidade)}</span>` : ""}</div>
      <div class="meta">${esc(f.prod || "Sem produtos informados")}</div>
      ${f.prazo ? `<div class="meta" style="margin:0">Prazo: ${esc(f.prazo)}</div>` : ""}
      <div class="links">${d ? `<a class="btn ghost sm" href="tel:${d}">Ligar</a>` : ""}${wa ? `<a class="btn ghost sm" href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${f.email ? `<a class="btn ghost sm" href="mailto:${esc(f.email)}">E-mail</a>` : ""}</div>
    </div>`;
  }).join("") : `<div class="card empty">${S.forn.length ? "Nenhum fornecedor encontrado." : "Nenhum fornecedor ainda. Cadastre quem você vai cotar."}</div>`;
}

/* ---------- comparação de preços ---------- */
const cotFields = () => [
  {k:"produto", l:"Produto"},
  {k:"fornId", l:"Fornecedor", t:"sel", o:[["", "Sem fornecedor"], ...S.forn.map(f => [f.id, f.nome])]},
  {k:"preco", l:"Preço unitário", t:"num", w:"half"}, {k:"data", l:"Data da cotação", t:"date", w:"half"},
  {k:"obs", l:"Condições (prazo, pedido mínimo)", t:"area"}
];
function editCot(id){
  const cur = id ? S.cot.find(x => x.id === id) : null;
  openForm({
    title: cur ? "Editar cotação" : "Nova cotação", fields: cotFields(), vals: cur || {data:new Date().toISOString().slice(0, 10)},
    check: v => !v.produto ? "Informe o produto." : v.preco <= 0 ? "Informe o preço unitário." : "",
    save: v => { if (cur) Object.assign(cur, v); else S.cot.unshift({id:uid(), ...v}); },
    del: cur ? () => { S.cot = S.cot.filter(x => x.id !== id); } : null
  });
}
function viewCot(m){
  m.innerHTML = `<div class="bar"><h1>Comparar preços</h1><button class="btn" data-a="newCot">Nova</button></div>
  <p class="sub">Cadastre a mesma mercadoria de fornecedores diferentes. O menor preço aparece em destaque.</p>
  <div class="bar"><input id="qc" type="search" placeholder="Buscar produto" value="${esc(ui.qc)}" aria-label="Buscar produto"></div><div id="clist"></div>`;
  fillCot();
}
function fillCot(){
  const q = ui.qc.toLowerCase(), box = $("#clist"); if (!box) return;
  const g = {};
  S.cot.forEach(c => { const k = c.produto.trim().toLowerCase(); if (!q || k.includes(q)) (g[k] = g[k] || []).push(c); });
  const keys = Object.keys(g).sort();
  box.innerHTML = keys.length ? keys.map(k => {
    const rows = g[k].slice().sort((a, b) => n(a.preco) - n(b.preco)), best = n(rows[0].preco);
    return `<div class="card grp"><h3>${esc(rows[0].produto)}</h3>${rows.map((c, i) => {
      const f = S.forn.find(y => y.id === c.fornId), p = n(c.preco);
      return `<div class="prow" data-a="editCot" data-id="${c.id}" tabindex="0" role="button"><div><div class="n">${esc(f ? f.nome : "Sem fornecedor")}</div><div class="d">${c.data ? fdate(c.data) : ""}${c.obs ? (c.data ? ", " : "") + esc(c.obs) : ""}</div></div>
      <div style="text-align:right"><b>${money(p)}</b><div>${i === 0 ? '<span class="tag ok">Menor preço</span>' : `<span class="d">+${pct(p / best - 1)}</span>`}</div></div></div>`;
    }).join("")}</div>`;
  }).join("") : `<div class="card empty">${S.cot.length ? "Nenhum produto encontrado." : "Nenhuma cotação ainda."}</div>`;
}

/* ---------- documentos ---------- */
const today0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const daysTo = s => { const [y, m, d] = s.split("-").map(Number); return Math.round((new Date(y, m - 1, d) - today0()) / 86400000); };
function docSt(d){
  if (!d.venc) return {k:"none", c:"wn", t:"Sem data de validade", o:2};
  const x = daysTo(d.venc);
  if (x < 0) return {k:"exp", c:"bd", t:`Vencido há ${-x} dia${x === -1 ? "" : "s"}`, o:0};
  if (x === 0) return {k:"soon", c:"bd", t:"Vence hoje", o:0};
  if (x <= (S.cfg.avisoDias || 15)) return {k:"soon", c:"wn", t:`Vence em ${x} dia${x === 1 ? "" : "s"}`, o:1};
  return {k:"ok", c:"ok", t:"Válido", o:3};
}
function docProblems(){ return S.docs.filter(d => { const k = docSt(d).k; return k === "exp" || k === "soon"; }).length; }
const docFields = () => [
  {k:"nome", l:"Documento"},
  {k:"venc", l:"Válido até (data escrita no documento)", t:"date", w:"half"}, {k:"num", l:"Número ou código", w:"half"},
  {k:"link", l:"Link para emitir ou renovar"}, {k:"obs", l:"Observações", t:"area"}
];
function editDoc(id){
  const cur = id ? S.docs.find(x => x.id === id) : null;
  openForm({
    title: cur ? "Editar documento" : "Novo documento", fields: docFields(), vals: cur || {},
    check: v => !v.nome ? "Informe o nome do documento." : (v.link && !/^https?:\/\//.test(v.link)) ? "O link deve começar com https://" : "",
    save: v => { if (cur) Object.assign(cur, v); else S.docs.push({id:uid(), ...v}); },
    del: cur ? () => { S.docs = S.docs.filter(x => x.id !== id); } : null
  });
}
function viewDocs(m){
  const list = S.docs.map(d => ({d, s:docSt(d)})).sort((a, b) => a.s.o - b.s.o || String(a.d.venc || "").localeCompare(String(b.d.venc || "")));
  const cnt = k => list.filter(x => x.s.k === k).length, p = docProblems();
  m.innerHTML = `<div class="bar"><h1>Documentos</h1><button class="btn" data-a="newDoc">Novo</button></div>
  <p class="sub">Digite a data de validade escrita em cada documento. Muitas certidões vencem em 180 dias, e certidão vencida pode bloquear sua participação ou inabilitar a empresa. Confira o prazo no próprio documento.</p>
  <div class="stats"><div class="card"><small>Vencidos ou vencendo</small><b class="${p ? "bd" : "ok"}">${p}</b></div><div class="card"><small>Válidos</small><b class="ok">${cnt("ok")}</b></div></div>
  ${cnt("none") ? `<p class="hint" style="margin:0 0 12px">${cnt("none")} documento${cnt("none") > 1 ? "s" : ""} sem data de validade. Toque para informar.</p>` : ""}
  ${list.map(({d, s}) => `<div class="card item" data-a="editDoc" data-id="${d.id}" tabindex="0" role="button">
    <div class="top"><b>${esc(d.nome)}</b><span class="tag ${s.c}">${esc(s.t)}</span></div>
    <div class="meta">${esc([d.venc ? "válido até " + fdate(d.venc) : "", d.num ? "nº " + d.num : ""].filter(Boolean).join(", ") || "Toque para informar a validade")}</div>
    ${/^https?:\/\//.test(d.link || "") ? `<div class="links"><a class="btn ghost sm" href="${su(d.link)}" target="_blank" rel="noopener">Emitir ou renovar</a></div>` : ""}</div>`).join("") || '<div class="card empty">Nenhum documento cadastrado.</div>'}`;
}

/* ---------- portais ---------- */
const UFS = [["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],["BA","Bahia"],["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],["PA","Pará"],["PB","Paraíba"],["PR","Paraná"],["PE","Pernambuco"],["PI","Piauí"],["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","São Paulo"],["SE","Sergipe"],["TO","Tocantins"]];
const PORTAIS = [
  ["Governo federal", [
    ["Compras.gov.br", "Portal oficial de compras do governo federal, onde acontecem pregões, dispensas e cotações. Para enviar proposta e dar lance você precisa de SICAF ativo e conta gov.br. Confira o nível de conta exigido no portal.", "https://www.gov.br/compras/pt-br", "Abrir Compras.gov.br"],
    ["SICAF", "Cadastro de fornecedores do governo federal. O nível I é o credenciamento e os demais níveis guardam a documentação. O registro cadastral vale um ano, e certidão vencida no sistema pode bloquear a participação.", "https://www.gov.br/compras/pt-br/acesso-a-informacao/perguntas-frequentes/sicaf-sistema/sicaf-sistema", "Abrir SICAF"],
    ["AntecipaGov", "Permite antecipar até 70% do que ainda falta receber de contratos públicos, comparando propostas de instituições financeiras credenciadas. O edital e o contrato precisam prever a cessão de crédito.", "https://antecipagov.comprasnet.gov.br", "Abrir AntecipaGov"],
    ["PNCP", "Portal Nacional de Contratações Públicas. Reúne editais de todo o Brasil (federal, estados e municípios) e os planos anuais de compras dos órgãos. Serve para buscar oportunidades. A proposta é enviada no portal onde a disputa acontece.", "https://pncp.gov.br/app/editais", "Buscar editais no PNCP"]
  ]],
  ["Plataformas privadas usadas por prefeituras e estados", [
    ["BLL Compras", "Plataforma usada por muitos municípios e alguns estados para pregões e dispensas eletrônicas. O cadastro de fornecedor é feito no portal. Confira as regras e taxas no site.", "https://bll.org.br", "Abrir BLL"],
    ["BNC (Bolsa Nacional de Compras)", "Plataforma usada por prefeituras e outros órgãos para pregões e dispensas. Tem cadastro próprio de fornecedor.", "https://bnc.org.br", "Abrir BNC"],
    ["Licitanet", "Plataforma de pregões eletrônicos e dispensas usada por órgãos municipais e estaduais. Tem cadastro próprio.", "https://www.licitanet.com.br", "Abrir Licitanet"],
    ["Portal de Compras Públicas", "Plataforma usada por prefeituras e câmaras de vários estados. Tem cadastro próprio de fornecedor.", "https://www.portaldecompraspublicas.com.br", "Abrir portal"],
    ["Licitações-e (Banco do Brasil)", "Plataforma do Banco do Brasil usada por alguns órgãos e empresas estatais. Tem cadastro próprio.", "https://www.licitacoes-e.com.br", "Abrir Licitações-e"]
  ]],
  ["Portais de governos estaduais (exemplos)", [
    ["Bahia", "Portal de compras do governo da Bahia: editais, pregões e cadastro de fornecedores.", "https://www.comprasnet.ba.gov.br", "Abrir portal da Bahia"],
    ["Paraná", "Portal de compras do governo do Paraná.", "https://www.compras.pr.gov.br", "Abrir portal do Paraná"],
    ["Minas Gerais", "Portal de compras do governo de Minas Gerais.", "https://www.compras.mg.gov.br", "Abrir portal de Minas"],
    ["Rio Grande do Sul", "Portal de compras do governo do Rio Grande do Sul.", "https://www.compras.rs.gov.br", "Abrir portal do RS"]
  ]],
  ["Empresas estatais (exemplos)", [
    ["Caixa", "Licitações da Caixa Econômica Federal.", "https://licitacoes.caixa.gov.br", "Abrir licitações da Caixa"],
    ["Petronect", "Portal de compras da Petrobras.", "https://www.petronect.com.br", "Abrir Petronect"]
  ]]
];
const CERTS = [["CRF do FGTS (Caixa)", "https://consulta-crf.caixa.gov.br"], ["Certidão trabalhista (TST)", "https://cndt-certidao.tst.jus.br"], ["Receita Federal", "https://www.gov.br/receitafederal/pt-br"]];
const gsearch = q => "https://www.google.com/search?q=" + encodeURIComponent(q);
function viewPortais(m){
  m.innerHTML = `<h1>Portais</h1>
  <p class="sub">Os portais pedem login e não abrem dentro de outros apps. Aqui você chega neles com um toque.</p>
  <div class="note2">Cada órgão escolhe onde faz a disputa, e cada plataforma tem o próprio cadastro. Veja no edital qual é a plataforma antes de se cadastrar.</div>
  ${PORTAIS.map(([g, l]) => `<h2 class="gh">${g}</h2>` + l.map(([t, d, u, b]) => `<div class="card pc"><div class="pc-h">${selo(t)}</div><p>${d}</p><a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">${b}</a></div>`).join("")).join("")}
  <h2 class="gh">Portal de compras do seu estado</h2>
  <details class="tut"><summary>Os 27 estados</summary><div class="tb"><p>Cada botão faz uma pesquisa pelo portal de compras daquele estado. Confira se o endereço é do governo (termina em .gov.br).</p>
    <div class="ufs">${UFS.map(([s, nm]) => `<a class="btn ghost sm" href="${gsearch("portal de compras governo do estado " + nm + " licitações fornecedores")}" target="_blank" rel="noopener">${s} ${nm}</a>`).join("")}</div></div></details>
  <h2 class="gh">APIs oficiais (dados em tempo real)</h2>
  <div class="note2">O app usa duas fontes abertas: a <b>API do PNCP</b> (licitações abertas, contratos e situação de cada compra) e a <b>BrasilAPI</b> (conferir o CNPJ de um fornecedor). As plataformas privadas (BLL, BNC, Licitanet e outras) não têm API pública que eu tenha encontrado, mas os editais delas aparecem no PNCP.</div>
  ${[["API de consulta do PNCP", "Usada pelo app. Editais com propostas abertas, contratos assinados, atas e planos anuais de compras.", "https://pncp.gov.br/api/consulta/swagger-ui/index.html", "Ver documentação"], ["Dados Abertos do Compras.gov.br", "Pesquisa de preços praticados, atas de registro de preço e contratações do governo federal.", "https://dadosabertos.compras.gov.br/swagger-ui/index.html", "Ver documentação"], ["API do Portal da Transparência", "Contratos e sanções de empresas. Pede uma chave gratuita.", "https://api.portaldatransparencia.gov.br/api-de-dados/cadastrar-email", "Pedir chave gratuita"], ["SICONFI (Tesouro Nacional)", "Orçamento, despesas, receitas e caixa declarados por estados e municípios. O app lê estes dados na tela Orçamento, gastos e caixa (em Mais).", "https://apidatalake.tesouro.gov.br/docs/siconfi/", "Ver documentação"], ["Obrasgov.br (obras públicas)", "API aberta de projetos de obras, contratos, empenhos e execução física, sem login. O app lê estes dados na tela Obras públicas (em Mais).", "https://api-publica.obrasgov.gestao.gov.br/obras/docs", "Ver documentação"], ["Transferegov.br (repasses da União)", "Dados abertos de transferências federais para estados e municípios (transferências especiais, fundo a fundo e TED). Mostra para onde vai o dinheiro. O app ainda não lê esses dados.", "https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos", "Ver dados abertos"], ["BrasilAPI (CNPJ)", "Usada pelo app para conferir situação cadastral e atividade de um CNPJ.", "https://brasilapi.com.br", "Abrir BrasilAPI"]].map(([t, d, u, b]) => `<div class="card pc"><div class="pc-h">${selo(t)}</div><p>${d}</p><a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">${b}</a></div>`).join("")}
  <h2 class="gh">Certidões</h2>
  <div class="card pc"><b>Emitir certidões</b><p>Emita a certidão nova e depois anote a validade em Documentos.</p><div class="links" style="margin:0">${CERTS.map(([t, u]) => `<a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">${t}</a>`).join("")}</div></div>`;
}

/* ---------- como usar ---------- */
const TUT = [
 ["Comece por aqui", true, `<ol>
  <li>Toque na engrenagem no alto da tela. Escolha seu regime (MEI ou Simples Nacional) e confira o DAS e a margem de lucro que você quer.</li>
  <li>Abra <b>Documentos</b> e digite a validade de cada documento da empresa.</li>
  <li>Em <b>Mais</b>, abra <b>Fornecedores</b> e cadastre quem vende os produtos que você quer fornecer.</li>
  <li>Antes de dar qualquer lance, use <b>Calcular</b>.</li>
  <li>Se o lance valer a pena, toque em <b>Salvar como licitação</b> para acompanhar depois.</li></ol>`],
 ["Como calcular um lance", false, `<ol>
  <li>Em <b>Calcular</b>, digite o preço do lance por unidade e a quantidade.</li>
  <li>Digite o custo do fornecedor por unidade, o frete total e outros custos.</li>
  <li>Digite a margem de lucro que você quer (por exemplo, 15).</li></ol>
  <p>O carimbo mostra se o lance está <b>Dentro da margem</b>, <b>Abaixo da margem</b> ou dando <b>Prejuízo</b>.</p>
  <ul><li><b>Custo máximo do fornecedor:</b> o mais que você pode pagar por unidade e ainda fechar a margem.</li>
  <li><b>Lance mínimo:</b> o menor preço por unidade que ainda fecha a margem com o custo informado.</li></ul>
  <div class="note2">O imposto é uma estimativa. Confirme os valores com seu contador.</div>`],
 ["Acompanhar licitações", false, `<ol>
  <li>Em <b>Licitações</b>, toque em <b>Nova</b> e preencha órgão, número, data da sessão e valores.</li>
  <li>Mude a <b>Situação</b> conforme avançar: proposta enviada, em disputa, ganha, entregue, recebida.</li>
  <li>Use os filtros no alto para ver só uma situação.</li>
  <li>Cole o link do edital para abrir a sessão com um toque.</li></ol>
  <p>O lucro estimado de cada licitação aparece no cartão.</p>`],
 ["Fornecedores e comparação de preços", false, `<ul>
  <li>Cadastre o fornecedor com telefone e produtos. No cartão dele há botões para ligar e chamar no WhatsApp.</li>
  <li>Em <b>Preços</b>, cadastre a cotação do mesmo produto em fornecedores diferentes. O menor preço fica em destaque.</li></ul>`],
 ["Documentos sempre válidos", false, `<ol>
  <li>Em <b>Documentos</b>, toque em cada documento e digite a data <b>Válido até</b> que está escrita nele.</li>
  <li>O app avisa quando um documento está vencido ou perto de vencer. Aparece um alerta no topo e um número no ícone de Documentos.</li>
  <li>Toque em <b>Emitir ou renovar</b> para abrir o site do documento, emita o novo e anote a nova validade.</li></ol>
  <div class="note2">Certidão vencida pode bloquear sua participação ou inabilitar a empresa. Renove antes do prazo. Em Ajustes você escolhe com quantos dias de antecedência quer ser avisado.</div>`],
 ["Portais (SICAF, AntecipaGov e compras)", false, `<p>Em <b>Mais</b>, <b>Portais</b> ficam os atalhos para o Compras.gov.br, o SICAF, o AntecipaGov e o PNCP.</p>
  <ul><li>Eles abrem no navegador, não dentro do app.</li>
  <li>Para enviar proposta e dar lance você precisa de cadastro no SICAF e de conta gov.br.</li>
  <li>O AntecipaGov serve para antecipar valores de contratos que você já ganhou.</li></ul>`],
 ["Resumo e backup", false, `<ul>
  <li>Em <b>Mais</b> &gt; <b>Resumo e backup</b> você vê o quanto já vendeu no ano e quanto falta para o teto do MEI.</li>
  <li>Seus dados ficam só no aparelho que você usa. Se você limpar os dados do navegador ou trocar de aparelho, perde tudo.</li>
  <li>Por isso, exporte um backup de vez em quando e guarde o arquivo. Para recuperar, use <b>Importar backup</b>.</li></ul>`],
 ["Instalar no celular", false, `<h4>Android (Chrome)</h4>
  <ol><li>Abra o link do app no Chrome.</li><li>Toque nos três pontinhos no canto de cima.</li><li>Toque em <b>Adicionar à tela inicial</b> (ou <b>Instalar app</b>, se aparecer) e confirme.</li></ol>
  <h4>iPhone (Safari)</h4>
  <ol><li>Abra o link do app no Safari.</li><li>Toque no botão <b>Compartilhar</b> (quadrado com uma seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li></ol>
  <div class="note2">O ícone abre o app com um toque. Para não perder os dados, abra sempre pelo mesmo ícone ou pelo mesmo navegador.</div>
  <p>Se você baixou o app pela loja (Google Play ou App Store), é só instalar como qualquer outro aplicativo.</p>`],
 ["Instalar no computador", false, `<h4>Pelo Chrome</h4>
  <ol><li>Abra o link do app.</li><li>Clique nos três pontinhos, depois em <b>Salvar e compartilhar</b> (ou <b>Mais ferramentas</b>) e em <b>Criar atalho</b>.</li><li>Marque <b>Abrir como janela</b> e clique em <b>Criar</b>.</li></ol>
  <h4>Pelo Edge</h4>
  <ol><li>Abra o link do app.</li><li>Clique em <b>Configurações e mais</b> (três pontinhos), depois em <b>Aplicativos</b> e em <b>Instalar este site como um aplicativo</b>.</li></ol>
  <h4>Usando o arquivo do app</h4>
  <p>Se você tem o arquivo <b>lance-certo.html</b>, dê dois cliques nele. Ele abre no navegador e funciona mesmo sem internet. Guarde o arquivo em uma pasta fácil de achar e use sempre o mesmo navegador.</p>`],
 ["Dúvidas comuns", false, `<h4>Sumiram meus dados</h4><p>Isso acontece quando os dados do navegador são apagados ou quando você troca de aparelho. Restaure pelo backup em <b>Importar backup</b>.</p>
  <h4>O portal pede login</h4><p>Os portais do governo usam login gov.br. O app não guarda sua senha.</p>
  <h4>Os valores de imposto estão certos?</h4><p>São estimativas e mudam todo ano. Confirme com seu contador e ajuste na engrenagem.</p>`]
 ,["Entrar com e-mail e senha", false, `<ol>
  <li>Na primeira vez, o app pede para criar uma conta: nome, e-mail e senha de pelo menos 8 caracteres.</li>
  <li>Nas próximas vezes, digite o e-mail e a senha para entrar.</li>
  <li>Em <b>Mais</b>, <b>Conta e senha</b>, você troca a senha ou sai do app.</li></ol>
  <div class="note2">A conta fica guardada só neste aparelho e nada é enviado a servidores. Por isso o app não consegue recuperar a senha por e-mail. Se esquecer, o app pede para apagar os dados deste aparelho e criar uma conta nova, então faça backup de vez em quando.</div>`],
 ["Buscar licitações por valor", false, `<ol>
  <li>Em <b>Mais</b>, abra <b>Buscar licitações no Brasil</b> (ou toque no botão em Licitações).</li>
  <li>Digite o item e o valor que você quer disputar, por exemplo 5.000.</li>
  <li>O app mostra a faixa de valor, em qual modalidade esse valor costuma cair e as suas licitações salvas nessa faixa.</li>
  <li>Toque em <b>Buscar no PNCP</b> para abrir a busca do portal já com o item preenchido. Lá você escolhe o estado ou o Brasil inteiro e confere o valor de cada edital.</li></ol>`],
 ["Nota fiscal", false, `<p>Em <b>Mais</b>, <b>Nota fiscal</b>, tem o passo a passo detalhado da NF-e, o que fazer se seu estado não exige certificado digital e a nota de serviços. Também dá para gerar o texto com os dados de uma licitação sua para copiar na hora de emitir. O app não emite a nota por você: a emissão acontece no sistema da SEFAZ do seu estado ou em um emissor.</p>`]
];
function viewAjuda(m){
  m.innerHTML = `<h1>Como usar e instalar</h1><p class="sub">Toque em cada assunto para abrir.</p>` +
    TUT.map(([t, open, b]) => `<details class="tut"${open ? " open" : ""}><summary>${t}</summary><div class="tb">${b}</div></details>`).join("");
}

/* ---------- mais ---------- */
function viewMais(m){
  const it = [["achaforn", "Buscar fornecedores com IA", "Cole a especificação do produto, a IA organiza a busca e você compara os preços."], ["planos", "Planos e assinatura", "Grátis, mensal, semestral e anual. Veja o que cada plano libera."], ["central", "Central B2G", "Da oportunidade à documentação, proposta, fornecedor, NF-e e financeiro, em um só lugar."], ["prop", "Propostas profissionais", "Modelos de proposta com o logo da sua empresa, prontos para imprimir ou salvar em PDF."], ["juridico", "Jurídico com IA", "Recursos, impugnações, contratos e minutas com apoio de IA (Lei 14.133/2021)."], ["logos", "Logotipos das instituições", "Envie o logotipo oficial de cada instituição para aparecer ao lado do nome."], ["privadas", "Empresas privadas", "Plataformas e grandes empresas que cadastram fornecedores e pedem cotações. Monte a sua lista e acompanhe cada cadastro."], ["bancos", "Conexões bancárias", "Saldo e recebimentos em modo leitura (Open Finance). Concilia os pagamentos dos órgãos com as licitações."], ["motor", "Motor de oportunidades", "Diga quanto quer vender, o que vende e onde. O app encontra, avisa e coloca na agenda."], ["exterior", "Participar do exterior", "Para brasileiros fora do país: fuso de Brasília, documentos e passos para disputar licitações."], ["seguranca", "Segurança e acesso", "Verificação em duas etapas, criptografia, registro de atividades, papéis e nuvem."], ["nfe", "Emitir nota fiscal (passo a passo)", "Preencha linha por linha e envie ao emissor ou copie para a SEFAZ."], ["regularidade", "Regularidade do CNPJ", "Situação cadastral, DAS em atraso, declaração anual, certidões e dívida."], ["editais", "Editais e assistente de IA", "Converse com o edital. Veja requisitos, documentos, itens, entrega, amostra, pagamento e desclassificação."], ["perfil", "Meu perfil de vendas", "Produtos, CNAE, faixa de valor, estados e modalidades para receber oportunidades."], ["fin", "Financial Hub", "Crédito, antecipação de recebíveis, garantias e Open Finance."], ["radar", "Radar de produtos", "Preço histórico, órgãos que compram, fornecedores e sua margem."], ["portais", "Portais e SICAF", "Compras.gov.br, SICAF, AntecipaGov, PNCP e outros."], ["orcamento", "Orçamento, gastos e caixa", "Quanto cada região, estado e cidade tem para gastar, já gastou e tem em caixa."], ["obras", "Obras públicas (Obrasgov)", "Orçamento, prazos, gasto, empresa e obras atrasadas, paradas ou inacabadas."], ["lances", "Painel de lances (cronômetro)", "Contagem de cada sessão, lance sugerido e aviso faltando poucos segundos."], ["pedidos", "Rastrear pedidos e entregas", "Do fornecedor até o órgão: etapas, código de rastreio e prazos."], ["empresa", "Dados da empresa (CNPJ)", "Cadastre o CNPJ, a razão social e o endereço da sua empresa."], ["fretes", "Fretes e transportadoras", "Busque transportadoras e compare preços de frete no Brasil inteiro."], ["modal", "Como funcionam as licitações", "Todas as modalidades, passo a passo: pregão, concorrência, dispensa, credenciamento, leilão e mais."], ["acomp", "Alertas e lembretes", "Receba oportunidades por valor, produto e estado, e avisos de data e hora."], ["melhores", "Melhores fornecedores por nicho", "As 4 empresas que mais fecham contratos em cada produto."], ["busca", "Buscar licitações no Brasil", "Informe o item e o valor que você quer disputar e veja a faixa, a modalidade e onde buscar."], ["nf", "Nota fiscal", "Passo a passo detalhado para emitir a nota fiscal de uma venda ao governo."], ["conta", "Conta e senha", "Trocar a senha ou sair do app."], ["ajuda", "Como usar e instalar", "Passo a passo do app e instalação no celular e no computador."], ["forn", "Fornecedores", "Cadastro e busca de quem vende para você."], ["cot", "Comparar preços", "Cotações do mesmo produto lado a lado."], ["res", "Resumo e backup", "Faturamento, teto do MEI e backup dos dados."]];
  m.innerHTML = `<h1>Mais</h1><p class="sub">Ajustes de imposto e margem ficam na engrenagem, no alto da tela.</p>` +
    it.map(([k, t, d]) => `<div class="card item" data-a="tab" data-t="${k}" tabindex="0" role="button"><div class="top"><b>${t}</b><span aria-hidden="true">›</span></div><div class="meta" style="margin:0">${d}</div></div>`).join("");
}

/* ---------- resumo ---------- */
let DL = null;
try{ if (window.claude && window.claude.use) window.claude.use("downloads").then(d => { DL = d; if (ui.tab === "res") render(); }).catch(() => {}); }catch(e){}
function viewRes(m){
  const cf = S.cfg, y = String(cf.ano);
  const real = S.lic.filter(x => REAL.includes(x.status) && (!x.data || x.data.startsWith(y)));
  let fat = 0, luc = 0; real.forEach(x => { const r = calc(licVals(x)); fat += r.receita; luc += r.lucro; });
  const p = cf.limite > 0 ? fat / cf.limite : 0;
  const cls = p > 1.2 ? "bd" : p >= 0.8 ? "wn" : "";
  const msg = p < 0.8 ? `Faltam ${money(cf.limite - fat)} para o teto anual.`
    : p <= 1 ? "Atenção: você está perto do teto anual do MEI."
    : p <= 1.2 ? `Acima do teto. Até ${money(cf.limite * 1.2)} há tolerância de 20%, com mudança de enquadramento no ano seguinte. Confirme com seu contador.`
    : "Acima da tolerância de 20%. Converse com um contador sobre a migração para o Simples Nacional.";
  m.innerHTML = `<h1>Resumo de ${y}</h1>
  <p class="sub">Conta as licitações com situação Ganha, Entregue ou Recebida.</p>
  <div class="stats"><div class="card"><small>Faturamento</small><b>${money(fat)}</b></div><div class="card"><small>Lucro estimado</small><b class="${luc < 0 ? "bd" : "ok"}">${money(luc)}</b></div></div>
  ${cf.regime === "MEI" ? `<div class="card"><b>Teto anual do MEI</b><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(p * 100))}"><i class="${cls}" style="width:${Math.min(100, p * 100)}%"></i></div><div class="sub" style="margin:0">${pct(p)} de ${money(cf.limite)}. ${msg}</div></div>` : ""}
  <div class="card"><b>Por situação</b><dl class="kv">${ST.map(s => `<div><dt>${s}</dt><dd>${S.lic.filter(x => x.status === s).length}</dd></div>`).join("")}</dl></div>
  <div class="card"><b>Backup dos dados</b><p class="sub" style="margin:4px 0 12px">Os dados ficam só neste aparelho. Exporte um backup de vez em quando.</p>
  <div class="actions" style="margin:0">${DL ? '<button class="btn ghost" data-a="export">Exportar backup</button>' : ""}<button class="btn ghost" data-a="import">Importar backup</button></div></div>`;
}

/* ---------- ajustes ---------- */
function editCfg(){
  const c = S.cfg;
  openForm({
    title: "Ajustes", vals: {...c},
    fields: [
      {k:"regime", l:"Regime de imposto", t:"sel", o:[["MEI", "MEI"], ["Simples", "Simples Nacional"]]},
      {k:"dasMei", l:"DAS mensal do MEI (R$)", t:"num", w:"half"}, {k:"vendasMes", l:"Vendas previstas por mês", t:"num", w:"half"},
      {k:"aliq", l:"Alíquota efetiva do Simples (%)", t:"num", w:"half"}, {k:"margem", l:"Margem desejada padrão (%)", t:"num", w:"half"},
      {k:"limite", l:"Teto anual do MEI (R$)", t:"num", w:"half"}, {k:"ano", l:"Ano do resumo", t:"num", w:"half"},
      {k:"avisoDias", l:"Avisar documentos (dias antes)", t:"num", w:"half"}
    ],
    note: "O DAS do MEI para comércio em 2026 é R$ 82,05 e o teto anual é R$ 81.000. Confira os valores no Portal do Empreendedor. O DAS fixo é dividido pelas vendas previstas no mês. Trocar o regime recalcula todas as licitações.",
    check: v => v.vendasMes < 1 ? "Vendas previstas por mês deve ser pelo menos 1." : v.ano < 2000 ? "Informe o ano com 4 dígitos." : v.avisoDias < 1 ? "Avise com pelo menos 1 dia de antecedência." : "",
    save: v => { Object.assign(S.cfg, v); S.cfg.vendasMes = Math.max(1, Math.round(v.vendasMes)); S.cfg.ano = Math.round(v.ano); S.cfg.avisoDias = Math.max(1, Math.round(v.avisoDias)); }
  });
}

/* ---------- buscar licitações por valor ---------- */
const LIM = {comp:65492.11, obras:130984.20};
function buscaOut(){
  const b = ui.bq, v = n(b.valor), f = clampN(n(b.faixa), 0, 90) / 100, item = b.item.trim();
  if (!(v > 0)) return '<div class="card empty">Digite o valor que você quer disputar (por exemplo 5.000) para ver a faixa e as opções de busca.</div>';
  const lo = v * (1 - f), hi = v * (1 + f), uf = UFS.find(u => u[0] === b.uf), ufNome = uf ? uf[1] : "";
  const fit = v <= LIM.comp ? 0 : v <= LIM.obras ? 1 : 2;
  const pncp = "https://pncp.gov.br/app/editais?" + (item ? "q=" + encodeURIComponent(item) + "&" : "") + "status=recebendo_proposta&pagina=1";
  const web = gsearch((item || "licitação") + " dispensa eletrônica pregão " + (ufNome || "Brasil") + " valor estimado R$ " + Math.round(v));
  const mine = S.lic.filter(x => { const r = calc(licVals(x)).receita; return r >= lo && r <= hi && (!item || String(x.objeto || "").toLowerCase().includes(item.toLowerCase())); });
  const row = (i, a, c, d) => `<tr class="${fit === i ? "hit" : ""}"><td>${a}</td><td>${c}</td><td>${d}</td></tr>`;
  return `<div class="card"><b>Faixa de valor</b><div class="big" style="font-size:26px">${money(lo)} a ${money(hi)}</div>
    <div class="sub" style="margin:0">Valor central de ${money(v)}, com margem de ${String(Math.round(f * 100))}% para mais e para menos${ufNome ? ". Estado: " + esc(ufNome) : ". Brasil inteiro"}.</div>
    <div class="links"><a class="btn sm" href="${pncp}" target="_blank" rel="noopener">Buscar no PNCP</a><a class="btn ghost sm" href="https://www.gov.br/compras/pt-br" target="_blank" rel="noopener">Compras.gov.br</a><a class="btn ghost sm" href="${web}" target="_blank" rel="noopener">Pesquisar na internet</a></div></div>
  <div class="card"><b>Em qual modalidade esse valor costuma cair</b>
    <table class="tbl"><tbody>
    ${row(0, "Até " + money(LIM.comp), "Compras e outros serviços", "Dispensa por valor")}
    ${row(1, "Até " + money(LIM.obras), "Obras, engenharia e manutenção de veículos", "Dispensa por valor")}
    ${row(2, "Acima disso", "Qualquer objeto", "Pregão eletrônico ou concorrência")}
    </tbody></table>
    <div class="sub" style="margin:0">Limites federais de 2026 (Decreto nº 12.807/2025). Estados e municípios podem ter regra própria. Confirme no edital.</div></div>
  <div class="card"><b>Suas licitações salvas nessa faixa</b>
    ${mine.length ? mine.map(x => { const r = calc(licVals(x)); return `<div class="prow" data-a="editLic" data-id="${x.id}" tabindex="0" role="button"><div><div class="n">${esc(x.objeto || x.orgao)}</div><div class="d">${esc(x.status)}${x.orgao ? ", " + esc(x.orgao) : ""}</div></div><b>${money(r.receita)}</b></div>`; }).join("") : '<p class="sub" style="margin:6px 0 0">Nenhuma licitação salva cai nessa faixa.</p>'}</div>
  <div class="note2">O botão <b>Buscar licitações abertas agora</b> consulta o PNCP e mostra só as licitações com propostas abertas cujo valor estimado cai na faixa. Só aparecem editais com valor estimado divulgado. Em Brasil inteiro a busca passa estado por estado e pode demorar. Se a consulta direta não funcionar no seu aparelho, o botão <b>Buscar no PNCP</b> abre a busca oficial com o seu item.</div>`;
}
const clampN = (x, a, b) => Math.min(b, Math.max(a, x));
function viewBusca(m){
  const b = ui.bq;
  m.innerHTML = `<h1>Buscar licitações</h1>
  <p class="sub">Diga o item e o valor que você quer disputar. O app mostra a faixa, a modalidade e leva você à busca nacional.</p>
  <div class="card"><div class="fg">
    <div class="f"><label for="b_item">Item ou produto</label><input id="b_item" data-b="item" autocomplete="off" placeholder="Ex.: papel A4, café, material de limpeza" value="${esc(b.item)}"></div>
    <div class="f half"><label for="b_valor">Valor (R$)</label><input id="b_valor" data-b="valor" inputmode="decimal" autocomplete="off" placeholder="5.000" value="${esc(b.valor)}"></div>
    <div class="f half"><label for="b_faixa">Margem da faixa (%)</label><input id="b_faixa" data-b="faixa" inputmode="decimal" autocomplete="off" value="${esc(b.faixa)}"></div>
    <div class="f half"><label for="b_vmin">Ou faixa: de (R$)</label><input id="b_vmin" data-b="vmin" inputmode="decimal" autocomplete="off" placeholder="3.000" value="${esc(b.vmin)}"></div>
    <div class="f half"><label for="b_vmax">até (R$)</label><input id="b_vmax" data-b="vmax" inputmode="decimal" autocomplete="off" placeholder="10.000" value="${esc(b.vmax)}"></div>
    <div class="f"><label for="b_nicho">Nicho (várias palavras do produto)</label><select id="b_nicho" data-b="nicho"><option value="">Usar o item digitado</option>${allNichos().map(x => `<option value="${esc(x.n)}"${b.nicho === x.n ? " selected" : ""}>${esc(x.n)}</option>`).join("")}</select></div>
    <div class="f half"><label for="b_mod">Modalidade</label><select id="b_mod" data-b="mod"><option value="">Todas</option>${MODS.map(([c, nm]) => `<option value="${c}"${b.mod === c ? " selected" : ""}>${nm}</option>`).join("")}</select></div>
    <div class="f half"><label for="b_uf">Estado</label><select id="b_uf" data-b="uf"><option value="">Brasil inteiro</option>${UFS.map(([s, nm]) => `<option value="${s}"${b.uf === s ? " selected" : ""}>${nm}</option>`).join("")}</select></div>
  </div></div>
  <div class="actions" style="margin-top:0"><button class="btn" data-a="lvGo">Buscar licitações abertas agora</button></div>
  <div class="actions" style="margin-top:0"><button class="btn ghost sm" data-a="alSave">Salvar como alerta</button><button class="btn ghost sm" data-a="tab" data-t="acomp">Ver acompanhamento</button></div>
  <div id="buscaLive">${lvHTML()}</div>
  <div id="buscaOut">${buscaOut()}</div>`;
}

/* ---------- busca ao vivo no PNCP ---------- */
const PNCP = "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta";
const LV = {run:false, stop:false, itens:[], seen:new Set(), fila:[], lidos:0, total:0, erro:"", fim:false, ord:"perto", view:"cards", ref:null, max:2500};
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const ymd = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
function lvReset(){
  const b = ui.bq, ufs = b.uf ? [b.uf] : UFS.map(u => u[0]);
  Object.assign(LV, {run:false, stop:false, itens:[], seen:new Set(), fila:ufs.map(uf => ({uf, pg:1, fim:false})), lidos:0, total:0, erro:"", fim:false});
  LV.ref = refOf(b);
}
async function lvFetch(t){
  const d = new Date(); d.setDate(d.getDate() + 120);
  const u = new URL(PNCP); u.searchParams.set("dataFinal", ymd(d)); u.searchParams.set("pagina", t.pg); u.searchParams.set("tamanhoPagina", 50);
  if (t.uf) u.searchParams.set("uf", t.uf);
  if (ui.bq.mod) u.searchParams.set("codigoModalidadeContratacao", ui.bq.mod);
  const res = await fetch(u.toString(), {headers:{Accept:"application/json"}});
  if (res.status === 204) return {data:[], paginasRestantes:0, totalRegistros:0};
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function lvRun(){
  if (LV.run) return; LV.run = true; LV.stop = false; LV.erro = "";
  lvDraw();
  try{
    while (!LV.stop && LV.lidos < LV.max && LV.fila.some(t => !t.fim)){
      for (const t of LV.fila){
        if (t.fim || LV.stop || LV.lidos >= LV.max) continue;
        const j = await lvFetch(t), arr = j.data || [];
        if (t.pg === 1) LV.total += j.totalRegistros || 0;
        arr.forEach(c => { LV.lidos++; const k = c.numeroControlePNCP; if (k && LV.seen.has(k)) return; if (k) LV.seen.add(k); if (lvAccept(c)) LV.itens.push(c); });
        if (!arr.length || !(j.paginasRestantes > 0)) t.fim = true; else t.pg++;
        lvDraw();
      }
    }
    LV.fim = LV.fila.every(t => t.fim);
  }catch(e){
    LV.erro = (e && e.message && /HTTP/.test(e.message)) ? "O PNCP respondeu com erro (" + e.message + "). Tente de novo em alguns minutos." : "net";
  }
  LV.run = false; lvDraw();
}
function lvLink(c){
  const l = String(c.linkSistemaOrigem || "");
  if (/^https?:\/\//.test(l)) return l;
  const cn = c.orgaoEntidade && c.orgaoEntidade.cnpj; return cn ? `https://pncp.gov.br/app/editais/${cn}/${c.anoCompra}/${c.sequencialCompra}` : "https://pncp.gov.br/app/editais";
}
function lvSorted(){
  const v = LV.ref ? LV.ref.v : 0, a = LV.itens.slice();
  if (LV.ord === "valor") a.sort((x, y) => x.valorTotalEstimado - y.valorTotalEstimado);
  else if (LV.ord === "data") a.sort((x, y) => String(x.dataEncerramentoProposta || "9").localeCompare(String(y.dataEncerramentoProposta || "9")));
  else if (LV.ord === "score") a.sort((x, y) => lvScore(y).score - lvScore(x).score);
  else a.sort((x, y) => Math.abs(x.valorTotalEstimado - v) - Math.abs(y.valorTotalEstimado - v));
  return a;
}
function lvHTML(){
  if (!LV.ref) return "";
  const a = lvSorted(), pr = LV.total > 0 ? clampN(LV.lidos / LV.total * 100, 0, 100) : 0;
  let h = `<div class="card lv"><b>Licitações abertas encontradas</b>`;
  if (LV.erro === "net") return h + `<p class="sub" style="margin:6px 0 0">Não foi possível consultar o PNCP a partir deste app. O navegador ou o link em que você abriu o app bloqueia esse acesso. Na versão de loja (aplicativo instalado) a consulta funciona. Enquanto isso, use o botão <b>Buscar no PNCP</b> acima: ele abre a busca oficial já com o seu item.</p></div>`;
  h += `<div class="prg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pr)}"><i style="width:${pr}%"></i></div>
    <div class="sub" style="margin:0 0 8px">${LV.run ? "Buscando… " : ""}Analisadas ${LV.lidos.toLocaleString("pt-BR")} de ${LV.total.toLocaleString("pt-BR")} licitações abertas${LV.fim ? ". Busca completa." : "."}</div>`;
  if (LV.erro) h += `<p class="note2">${esc(LV.erro)}</p>`;
  if (a.length){
    const vs = a.map(x => x.valorTotalEstimado), med = vs.reduce((s, x) => s + x, 0) / vs.length;
    h += `<div class="stats" style="margin:8px 0"><div class="card"><small>Encontradas</small><b>${a.length}</b></div><div class="card"><small>Valor médio</small><b>${money(med)}</b></div></div>
      <div class="chips" style="margin:0"><button class="chip${LV.ord === "perto" ? " on" : ""}" data-a="lvOrd" data-v="perto">Mais perto do valor</button><button class="chip${LV.ord === "valor" ? " on" : ""}" data-a="lvOrd" data-v="valor">Menor valor</button><button class="chip${LV.ord === "data" ? " on" : ""}" data-a="lvOrd" data-v="data">Encerra primeiro</button><button class="chip${LV.ord === "score" ? " on" : ""}" data-a="lvOrd" data-v="score">Maior score</button></div>
      <div class="chips" style="margin:0"><button class="chip${LV.view !== "tabela" ? " on" : ""}" data-a="lvView" data-v="cards">Cartões</button><button class="chip${LV.view === "tabela" ? " on" : ""}" data-a="lvView" data-v="tabela">Tabela</button></div>`;
    h += LV.view === "tabela" ? lvTable(a) : a.slice(0, 100).map((c, i) => { const uo = c.unidadeOrgao || {}, oe = c.orgaoEntidade || {}, enc = c.dataEncerramentoProposta ? fdate(String(c.dataEncerramentoProposta).slice(0, 10)) : "";
      const sc = lvScore(c); return `<div class="it"><b>${money(c.valorTotalEstimado)}</b> ${scoreTag(sc)} <span class="tag">${esc(uo.ufSigla || "")}</span>
        <div class="obj">${esc(String(c.objetoCompra || "").slice(0, 220))}</div>
        <div class="d">${esc(oe.razaoSocial || "")}${uo.municipioNome ? ", " + esc(uo.municipioNome) : ""}</div>
        <div class="d">${esc(c.modalidadeNome || "")}${enc ? ". Propostas até " + enc : ""}</div>
        <div class="links"><a class="btn ghost sm" href="${su(lvLink(c))}" target="_blank" rel="noopener">Abrir edital</a><button class="btn sm" data-a="lvSave" data-i="${LV.itens.indexOf(c)}">Salvar em Licitações</button><button class="btn ghost sm" data-a="lvWatch" data-i="${LV.itens.indexOf(c)}">Acompanhar</button></div>${scoreDet(sc)}</div>`; }).join("");
    if (a.length > 100) h += `<p class="sub" style="margin:8px 0 0">Mostrando as 100 primeiras. Estreite a faixa ou o item para ver o resto.</p>`;
  } else if (!LV.run) h += `<p class="sub" style="margin:6px 0 0">Nenhuma licitação encontrada nessa faixa até agora.</p>`;
  if (!LV.run && !LV.fim) h += `<div class="actions"><button class="btn ghost sm" data-a="lvMais">Buscar mais</button></div>`;
  if (LV.run) h += `<div class="actions"><button class="btn ghost sm" data-a="lvStop">Parar</button></div>`;
  return h + `</div>`;
}
function lvTable(a){
  return `<div class="tw"><table class="tbl lvt"><thead><tr><th>Valor</th><th>UF</th><th>Órgão e objeto</th><th>Propostas até</th><th></th></tr></thead><tbody>` + a.slice(0, 100).map(c => {
    const uo = c.unidadeOrgao || {}, oe = c.orgaoEntidade || {}, enc = c.dataEncerramentoProposta ? fdate(String(c.dataEncerramentoProposta).slice(0, 10)) : "";
    return `<tr><td><b>${money(c.valorTotalEstimado)}</b><small>${scoreTag(lvScore(c))}</small></td><td>${esc(uo.ufSigla || "")}</td><td>${esc(oe.razaoSocial || "")}<small>${esc(String(c.objetoCompra || "").slice(0, 120))}</small></td><td>${enc}</td><td><a class="btn ghost sm" href="${su(lvLink(c))}" target="_blank" rel="noopener">Abrir</a></td></tr>`; }).join("") + `</tbody></table></div>`;
}
function lvDraw(){ const o = $("#buscaLive"); if (o) o.innerHTML = lvHTML(); }

/* ---------- nota fiscal ---------- */
const NF = [
 ["Antes de começar", true, `<div class="note2">O app não emite a nota por você. A emissão acontece no sistema da SEFAZ do seu estado ou em um emissor, porque exige credenciamento e, na maioria dos casos, certificado digital. Aqui você vê o passo a passo e prepara os dados.</div>
  <ul><li>Venda de mercadoria para empresa ou órgão público: a nota fiscal é <b>obrigatória</b>, mesmo sendo MEI.</li>
  <li>Quem vende <b>produtos</b> emite NF-e (nota de produtos). Quem presta <b>serviços</b> emite NFS-e (nota de serviços).</li>
  <li>Para pagar, o órgão normalmente exige a nota com o número do empenho.</li></ul>`],
 ["O que você precisa ter", false, `<ol>
  <li><b>CNPJ ativo</b>, com atividade (CNAE) de comércio compatível com o que você vende.</li>
  <li><b>Inscrição estadual ativa.</b> Consulte no Sintegra com o seu CNPJ.</li>
  <li><b>Certificado digital e-CNPJ</b> (A1, um arquivo, ou A3, token ou cartão). Alguns estados exigem para emitir NF-e, mesmo para MEI. Outros oferecem alternativa. Confirme no site da SEFAZ do seu estado.</li>
  <li><b>Credenciamento</b> para emitir NF-e na SEFAZ do seu estado.</li>
  <li>A <b>nota de empenho</b>, a ordem de fornecimento ou o contrato do órgão.</li></ol>
  <div class="links"><a class="btn ghost sm" href="https://www.sintegra.gov.br" target="_blank" rel="noopener">Sintegra</a><a class="btn ghost sm" href="https://www.nfe.fazenda.gov.br" target="_blank" rel="noopener">Portal da NF-e</a><a class="btn ghost sm" href="${gsearch("SEFAZ emissor NF-e gratuito MEI")}" target="_blank" rel="noopener">Achar a SEFAZ do meu estado</a></div>`],
 ["Passo a passo da NF-e de produtos", false, `<ol>
  <li><b>Confirme os dados com o órgão:</b> CNPJ, razão social, endereço e o número do empenho ou da ordem de fornecimento.</li>
  <li><b>Entre no emissor:</b> o portal da SEFAZ do seu estado, o emissor gratuito dela ou um sistema de emissão que você contratar. Entre com o certificado digital ou com login e senha, conforme o estado.</li>
  <li><b>Escolha emitir uma NF-e nova</b> e informe o destinatário (CNPJ do órgão).</li>
  <li><b>Natureza da operação:</b> "Venda de mercadoria". Finalidade: NF-e normal.</li>
  <li><b>Itens:</b> descrição igual à do edital, NCM do produto, unidade, quantidade e valor unitário igual ao da proposta vencedora. O total precisa bater com o empenho.</li>
  <li><b>Impostos:</b> para MEI e Simples costuma ser CSOSN 102. O CFOP costuma ser 5102 para venda dentro do estado e 6102 para venda a outro estado. Produto com substituição tributária usa outro CFOP. Confirme com seu contador ou com o emissor.</li>
  <li><b>Transporte:</b> informe quem faz o frete. Se a entrega for sua, marque frete por conta do emitente.</li>
  <li><b>Informações complementares:</b> escreva o número do pregão ou processo, do empenho, do contrato ou ata e a UASG.</li>
  <li><b>Confira tudo e transmita.</b> Espere o status "Autorizada" da SEFAZ. Sem autorização, a nota não vale.</li>
  <li><b>Baixe o XML e o DANFE (PDF).</b> Envie ao órgão pelo e-mail ou sistema dele e leve o DANFE impresso junto com a mercadoria.</li></ol>`],
 ["Seu estado não exige certificado? Nota avulsa", false, `<p>Alguns estados, como Minas Gerais e Rio de Janeiro, deixam o MEI emitir a <b>Nota Fiscal Avulsa Eletrônica (NFA-e)</b> no site da SEFAZ. No sistema de Minas existe a opção de venda para órgão público.</p>
  <ol><li>Procure "NFA-e MEI" no site da SEFAZ do seu estado.</li><li>Entre com gov.br ou com a conta que o estado pedir.</li><li>Escolha venda e a opção de venda para órgão público, quando existir.</li><li>Preencha destinatário, itens e valores como no passo a passo da NF-e e emita.</li></ol>`],
 ["Nota fiscal de serviços (NFS-e)", false, `<p>Para prestação de serviços, o MEI usa o <b>Emissor Nacional da NFS-e</b>, que não exige certificado digital.</p>
  <ol><li>Acesse o Emissor Nacional e entre com sua conta gov.br.</li><li>Informe o tomador (o órgão), a descrição do serviço e o valor.</li><li>Confira e emita. Guarde o arquivo da nota.</li></ol>
  <div class="links"><a class="btn ghost sm" href="https://www.nfse.gov.br" target="_blank" rel="noopener">Emissor Nacional NFS-e</a></div>`],
 ["Triangulação: venda à ordem (entrega direta do fornecedor ao órgão)", false, `<p>Na <b>triangulação</b>, você vende ao órgão, mas a mercadoria sai <b>direto do seu fornecedor</b> para o endereço do órgão, sem passar por você. Por isso são emitidas <b>3 notas</b>, por duas empresas.</p>
  <svg class="dg" viewBox="0 0 340 250" role="img" aria-label="Triângulo entre fornecedor, você e o órgão, com três notas fiscais">
   <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--ac)"/></marker><marker id="ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--mut)"/></marker></defs>
   <rect class="bx" x="8" y="8" width="112" height="50" rx="10"/><text x="64" y="30" text-anchor="middle" font-weight="700">Fornecedor</text><text class="m" x="64" y="46" text-anchor="middle">fábrica ou distribuidor</text>
   <rect class="bx" x="220" y="8" width="112" height="50" rx="10"/><text x="276" y="30" text-anchor="middle" font-weight="700">Você</text><text class="m" x="276" y="46" text-anchor="middle">MEI ou empresa</text>
   <rect class="bx" x="114" y="190" width="112" height="50" rx="10"/><text x="170" y="212" text-anchor="middle" font-weight="700">Órgão público</text><text class="m" x="170" y="228" text-anchor="middle">cliente</text>
   <path class="ac" d="M122 33H218" marker-end="url(#ah)"/><text x="170" y="26" text-anchor="middle">1: venda à ordem</text>
   <path class="ac" d="M272 60L206 188" marker-end="url(#ah)"/><text x="262" y="132">2: sua nota</text>
   <path class="ds" d="M60 60L132 188" marker-end="url(#ah2)"/><text x="8" y="116">3: remessa</text><text class="m" x="8" y="130">e mercadoria</text>
  </svg>
  <table class="tbl"><tbody>
  <tr><td><b>Nota 1</b></td><td>O fornecedor emite para você: venda à ordem. CFOP 5.118 ou 6.118 (produto que ele fabrica) ou 5.119 ou 6.119 (produto que ele comprou de terceiros).</td></tr>
  <tr><td><b>Nota 2</b></td><td>Você emite para o órgão. CFOP 5.120 ou 6.120: venda entregue ao destinatário pelo vendedor remetente, em venda à ordem. <b>É a nota que o órgão usa para pagar você.</b></td></tr>
  <tr><td><b>Nota 3</b></td><td>O fornecedor emite para o órgão: remessa por conta e ordem de terceiros. CFOP 5.923 ou 6.923. <b>Acompanha a mercadoria</b> e cita a sua nota.</td></tr>
  </tbody></table>
  <p>O primeiro número é 5 quando o emitente e o destinatário estão no mesmo estado, e 6 quando estão em estados diferentes.</p>
  <h4>Passo a passo</h4>
  <ol>
  <li><b>Leia o edital.</b> Veja se ele aceita que o fornecedor entregue direto e se a entrega precisa ser feita pelo licitante.</li>
  <li><b>Combine com o fornecedor:</b> ele precisa topar a venda à ordem e emitir as notas 1 e 3. Passe a ele o CNPJ, o endereço de entrega e o contato do órgão, e o número do empenho.</li>
  <li><b>Emita a sua nota (nota 2)</b> para o órgão, com os itens e valores da proposta. Nas informações complementares, escreva o número do pregão ou processo, o do empenho e que a mercadoria é entregue pelo fornecedor (nome, CNPJ e número da nota de remessa).</li>
  <li><b>O fornecedor emite a nota 1</b> para você, indicando que a entrega ao órgão é por sua conta e ordem e citando a sua nota.</li>
  <li><b>O fornecedor emite a nota 3</b> para o órgão. O DANFE dela viaja com a mercadoria e deve citar a sua nota (nota 2).</li>
  <li><b>Entrega:</b> o órgão recebe e atesta. Peça que o ateste ligue a entrega à sua nota.</li>
  <li><b>Guarde tudo:</b> as 3 notas e o comprovante de entrega. Se o órgão pedir, anexe a nota 3 como prova da entrega.</li>
  <li><b>Pagamento:</b> o órgão paga você, conforme o empenho. Você paga o fornecedor no prazo combinado.</li></ol>
  <h4>Cuidados</h4>
  <ul><li>As regras de ICMS variam por estado. Confirme com seu contador e com o contador do fornecedor antes da primeira operação.</li>
  <li>Se o produto tem substituição tributária, os CFOPs são outros.</li>
  <li>Se o fornecedor errar a nota 3, o seu pagamento pode ficar parado.</li>
  <li>Alguns órgãos exigem que a nota de entrega venha em nome do licitante. Pergunte ao fiscal do contrato antes.</li>
  <li>Não confunda com <b>entrega em endereço diverso</b>: nesse caso há só uma venda e uma nota.</li></ul>
  <div class="note2">Em Mais, Nota fiscal, mais abaixo, você escolhe uma licitação e o app monta o texto das 3 notas.</div>`],
 ["Errei a nota. E agora?", false, `<ul><li>Se acabou de emitir e a mercadoria ainda não saiu, <b>cancele</b> logo. O prazo para cancelar é curto, em geral 24 horas, mas confirme na SEFAZ do seu estado.</li>
  <li>Depois do prazo, só dá para corrigir dados que não mudam valor, itens nem destinatário, com a <b>Carta de Correção</b>.</li>
  <li>Para qualquer outro erro, fale com seu contador antes de fazer outra nota.</li></ul>`],
 ["Depois de emitir", false, `<ol><li>Entregue a mercadoria com o DANFE e peça o atesto ou recebimento do órgão.</li>
  <li>Mude a situação da licitação para <b>Entregue</b> no app.</li>
  <li>Guarde o XML e o DANFE. A guarda fiscal costuma ser de 5 anos.</li>
  <li>O pagamento depende do atesto do órgão e de você estar com os documentos em dia. Confira a aba <b>Documentos</b> antes de cobrar.</li></ol>
  <div class="note2">Em 2026 a reforma tributária trouxe campos novos na NF-e. Use um emissor atualizado e confirme com seu contador.</div>`]
];
const nfText = id => {
  const x = S.lic.find(y => y.id === id); if (!x) return "";
  const q = n(x.qtd) || 1, pu = n(x.preco);
  return ["Emitente: " + empLine(), "Destinatário: " + (x.orgao || "(órgão)") + (x.cnpjOrg ? ", CNPJ " + x.cnpjOrg : ""), "Natureza da operação: Venda de mercadoria", "Objeto: " + (x.objeto || "(descreva igual ao edital)"),
    "Quantidade: " + q, "Valor unitário: " + money(pu), "Valor total dos produtos: " + money(q * pu), "",
    "Informações complementares:", "Pregão/Processo nº " + (x.numero || "____") + ". Empenho nº ____. Contrato/Ata nº ____. UASG ____."].join("\n");
};
const triText = id => {
  const x = S.lic.find(y => y.id === id); if (!x) return "";
  const q = n(x.qtd) || 1, pu = n(x.preco), f = S.forn.find(z => z.id === x.fornId), org = (x.orgao || "(órgão)") + (x.cnpjOrg ? ", CNPJ " + x.cnpjOrg : ""), fn = f ? f.nome + (f.cnpj ? " (CNPJ " + f.cnpj + ")" : "") : "(fornecedor)";
  return ["NOTA 1 - Fornecedor para você (CFOP 5.119 ou 6.119; 5.118 ou 6.118 se ele fabrica)", "Natureza da operação: Venda à ordem", "Destinatário: " + empLine(), "Informações complementares: Mercadoria entregue a " + org + " por conta e ordem do adquirente originário, conforme NF-e nº ____ (emitida por você).", "",
    "NOTA 2 - Você para o órgão (CFOP 5.120 ou 6.120)", "Emitente: " + empLine(), "Natureza da operação: Venda de mercadoria entregue ao destinatário pelo vendedor remetente, em venda à ordem", "Destinatário: " + org, "Objeto: " + (x.objeto || "(descreva igual ao edital)"), "Quantidade: " + q + ". Valor unitário: " + money(pu) + ". Total: " + money(q * pu),
    "Informações complementares: Pregão/Processo nº " + (x.numero || "____") + ". Empenho nº ____. Mercadoria entregue por " + fn + ", remessa NF-e nº ____.", "",
    "NOTA 3 - Fornecedor para o órgão (CFOP 5.923 ou 6.923)", "Natureza da operação: Remessa por conta e ordem de terceiros, em venda à ordem", "Destinatário: " + org, "Informações complementares: Remessa por conta e ordem de sua empresa (adquirente originário), conforme NF-e nº ____. Empenho nº ____."].join("\n");
};
function viewNf(m){
  m.innerHTML = `<h1>Nota fiscal</h1><p class="sub">Passo a passo para emitir a nota de uma venda ao governo.</p>` +
    NF.map(([t, o, b]) => `<details class="tut"${o ? " open" : ""}><summary>${t}</summary><div class="tb">${b}</div></details>`).join("") +
    `<div class="card"><b>Dados para a nota</b><p class="sub" style="margin:4px 0 10px">Escolha uma licitação e copie o texto na hora de emitir.</p>
    <select id="nfSel" aria-label="Licitação"><option value="">Escolha uma licitação</option>${S.lic.map(x => `<option value="${x.id}"${ui.nf === x.id ? " selected" : ""}>${esc((x.numero ? x.numero + " - " : "") + (x.objeto || x.orgao || "Sem descrição"))}</option>`).join("")}</select>
    <textarea id="nfOut" class="ro" readonly aria-label="Dados para a nota" placeholder="O texto aparece aqui">${esc(nfText(ui.nf))}</textarea>
    <div class="actions"><button class="btn ghost sm" data-a="nfCopy">Copiar texto</button></div>
    ${S.lic.length ? "" : '<p class="hint">Cadastre uma licitação para usar esta função.</p>'}</div>
    <div class="card"><b>Dados da triangulação (3 notas)</b><p class="sub" style="margin:4px 0 10px">Usa a licitação escolhida acima e o fornecedor cadastrado nela.</p>
    <textarea id="triOut" class="ro" readonly aria-label="Dados das 3 notas da triangulação" placeholder="O texto das 3 notas aparece aqui" style="min-height:260px">${esc(triText(ui.nf))}</textarea>
    <div class="actions"><button class="btn ghost sm" data-a="triCopy">Copiar texto</button></div></div>`;
}

/* ---------- como funcionam as licitações ---------- */
const MODG = [
 ["Visão geral: qual modalidade é qual", true, `<p>Cada modalidade é um jeito de o governo comprar, contratar ou vender. Estes são os nomes que aparecem no PNCP:</p>
  <div class="tw"><table class="tbl"><thead><tr><th>Modalidade</th><th>Serve para</th><th>Quem ganha</th></tr></thead><tbody>
  <tr><td><b>Pregão eletrônico</b></td><td>Comprar bens e serviços comuns, pela internet</td><td>Menor preço ou maior desconto</td></tr>
  <tr><td><b>Pregão presencial</b></td><td>O mesmo, com sessão no local</td><td>Menor preço ou maior desconto</td></tr>
  <tr><td><b>Concorrência eletrônica</b></td><td>Obras, engenharia, bens e serviços especiais, pela internet</td><td>Menor preço, técnica e preço ou outro critério</td></tr>
  <tr><td><b>Concorrência presencial</b></td><td>O mesmo, com sessão no local</td><td>Igual à eletrônica</td></tr>
  <tr><td><b>Dispensa</b></td><td>Compra sem licitação completa (valor baixo ou casos previstos em lei)</td><td>Em geral, o menor preço</td></tr>
  <tr><td><b>Inexigibilidade</b></td><td>Quando não existe competição possível</td><td>O único fornecedor ou o profissional notório</td></tr>
  <tr><td><b>Credenciamento</b></td><td>Cadastrar todos os interessados que cumprem as regras</td><td>Todos os credenciados</td></tr>
  <tr><td><b>Leilão eletrônico</b></td><td>O governo VENDE bens, pela internet</td><td>Maior lance</td></tr>
  <tr><td><b>Leilão presencial</b></td><td>O governo VENDE bens, no local</td><td>Maior lance</td></tr>
  </tbody></table></div>
  <p>Pela Lei 14.133/2021, a forma eletrônica é a regra. A forma presencial só é usada com justificativa, e a sessão precisa ser registrada em ata e gravada em áudio e vídeo.</p>
  <p>O valor da compra costuma indicar o caminho: até ${money(LIM.comp)} em compras e serviços, e até ${money(LIM.obras)} em obras e engenharia, o órgão pode usar a <b>dispensa</b> por valor (valores federais de 2026, Decreto nº 12.807/2025). Acima disso, usa <b>pregão</b> para o que é comum e <b>concorrência</b> para o que é especial.</p>
  <div class="note2">Para começar, a dispensa eletrônica e o pregão eletrônico são os caminhos mais acessíveis para MEI e pequenas empresas.</div>`],
 ["Pregão eletrônico, passo a passo", false, `<p><b>O que é:</b> o órgão compra bens e serviços comuns, aqueles que dá para descrever bem no edital, como papel, notebook, material de limpeza e merenda. A disputa acontece em um sistema na internet (Compras.gov.br, BLL, BNC e outros). Ganha quem oferece o <b>menor preço</b> ou o <b>maior desconto</b>.</p>
  <h4>Passo a passo para você</h4>
  <ol>
  <li><b>Ache o edital.</b> Use o Radar, a busca por valor ou o PNCP. Veja a data de abertura e o prazo para enviar a proposta.</li>
  <li><b>Leia o edital.</b> Confira o objeto, as quantidades, o valor de referência, o prazo de entrega, as marcas aceitas e os documentos pedidos.</li>
  <li><b>Tenha seus cadastros prontos:</b> conta gov.br, cadastro no SICAF e cadastro no portal onde acontece a disputa. Confira também a validade dos documentos.</li>
  <li><b>Tire dúvidas ou conteste o edital.</b> O pedido de esclarecimento ou a impugnação vai até 3 dias úteis antes da abertura.</li>
  <li><b>Calcule seu piso.</b> Use a aba Calcular para saber o menor preço que você aceita.</li>
  <li><b>Envie a proposta e os documentos</b> pelo sistema antes da abertura. No federal, os documentos de habilitação costumam ser anexados junto com a proposta. A proposta inicial não pode ser alterada depois da abertura.</li>
  <li><b>Sessão pública.</b> O pregoeiro abre as propostas, e a fase de lances começa. No modo <b>aberto</b>, os lances são públicos e sucessivos. Em outros modos, parte da disputa é fechada. Muitas sessões prorrogam o tempo quando há lance perto do fim.</li>
  <li><b>Desempate.</b> Micro e pequena empresa pode cobrir a melhor oferta se ficou até 5% acima dela no pregão.</li>
  <li><b>Negociação e aceitação.</b> O pregoeiro pode pedir desconto e confere se a proposta atende ao edital. Você envia a proposta ajustada ao último lance, no prazo que ele der.</li>
  <li><b>Habilitação.</b> O pregoeiro confere seus documentos. Se algo estiver errado ou vencido, ele chama o próximo colocado.</li>
  <li><b>Recurso.</b> A intenção de recorrer precisa ser registrada logo na sessão. Depois, o prazo para as razões é de 3 dias úteis.</li>
  <li><b>Adjudicação e homologação.</b> O objeto é entregue ao vencedor e a autoridade confirma o resultado.</li>
  <li><b>Contrato ou nota de empenho, entrega, nota fiscal, ateste e pagamento.</b></li></ol>
  <h4>Atenção</h4>
  <ul><li>O prazo mínimo para enviar proposta na compra de bens por menor preço costuma ser de 8 dias úteis. Confira no edital.</li><li>Dar lance e desistir pode gerar multa e impedimento de licitar. Só dê lance que você pode cumprir.</li></ul>`],
 ["Pregão presencial, passo a passo", false, `<p><b>O que é:</b> o mesmo tipo de compra do pregão eletrônico, mas a sessão acontece em uma sala do órgão. A lei permite a forma presencial só com justificativa. Por isso é mais rara. A sessão precisa ser registrada em ata e gravada em áudio e vídeo.</p>
  <h4>Passo a passo para você</h4>
  <ol>
  <li><b>Leia o edital</b> e anote o endereço, a data e a hora. Você ou um representante precisa estar lá.</li>
  <li><b>Prepare dois envelopes lacrados:</b> um com a <b>proposta de preços</b> e outro com os <b>documentos de habilitação</b>, como o edital pedir.</li>
  <li><b>Leve o credenciamento do representante:</b> documento com foto e, se não for o sócio, uma procuração. Sem isso, você não dá lance.</li>
  <li><b>Entregue os envelopes</b> até a hora marcada. Depois disso, ninguém mais entra.</li>
  <li><b>Abertura das propostas.</b> O pregoeiro abre os envelopes de proposta e classifica os preços.</li>
  <li><b>Lances verbais.</b> Os classificados dão lances falados, cada vez menores, conforme as regras do edital.</li>
  <li><b>Negociação.</b> O pregoeiro tenta baixar mais o preço do primeiro colocado.</li>
  <li><b>Habilitação.</b> Abre-se o envelope de documentos do primeiro. Se estiver tudo certo, ele ganha.</li>
  <li><b>Recurso.</b> A intenção de recorrer é dita na sessão e registrada em ata. Depois, 3 dias úteis para as razões.</li>
  <li><b>Adjudicação, homologação, contrato, entrega, nota fiscal e pagamento.</b></li></ol>
  <h4>Atenção</h4><ul><li>Conte o custo de ir até o local. Em compras pequenas, ele pode comer a margem.</li><li>Documento vencido no envelope pode tirar você da disputa.</li></ul>`],
 ["Concorrência eletrônica, passo a passo", false, `<p><b>O que é:</b> modalidade para obras, serviços de engenharia e bens e serviços especiais, aqueles mais complexos. Pode julgar por menor preço, melhor técnica, técnica e preço, maior retorno econômico ou maior desconto. A disputa é pela internet.</p>
  <h4>Passo a passo para você</h4>
  <ol>
  <li><b>Ache e leia o edital.</b> Os prazos são maiores: em geral 10 dias úteis para obras e serviços comuns de engenharia por menor preço, 25 dias úteis para serviços e obras especiais, e 15 dias úteis para bens quando o critério não é menor preço ou maior desconto. Confira no edital.</li>
  <li><b>Veja as exigências técnicas.</b> Muitas pedem atestado de capacidade técnica, equipe e, às vezes, visita ao local.</li>
  <li><b>Veja a garantia de proposta.</b> O edital pode exigir até 1% do valor estimado, antes da disputa.</li>
  <li><b>Monte a proposta.</b> Quando o critério é técnica e preço, você envia uma proposta técnica e uma de preço. A técnica recebe nota.</li>
  <li><b>Envie pelo sistema</b> até a abertura, com os documentos que o edital pedir.</li>
  <li><b>Sessão pública.</b> A comissão abre as propostas, e pode haver fase de lances.</li>
  <li><b>Julgamento.</b> A comissão pontua e classifica conforme o critério do edital.</li>
  <li><b>Habilitação ampla.</b> Pedem documentos jurídicos, fiscais, trabalhistas, atestados técnicos e balanço.</li>
  <li><b>Recurso</b>, <b>adjudicação</b> e <b>homologação</b>.</li>
  <li><b>Contrato.</b> Pode exigir garantia de execução, como seguro-garantia ou fiança bancária. Depois vêm a ordem de serviço, as medições e os pagamentos.</li></ol>
  <h4>Atenção</h4><ul><li>Não é o melhor caminho para começar. Prefira dispensa e pregão até ter experiência e atestados.</li><li>A garantia e o prazo longo de pagamento pedem capital de giro. Veja o Financial Hub.</li></ul>`],
 ["Concorrência presencial, passo a passo", false, `<p><b>O que é:</b> a mesma modalidade da concorrência eletrônica, com a sessão em uma sala do órgão. Exige justificativa, ata e gravação em áudio e vídeo.</p>
  <h4>Passo a passo para você</h4>
  <ol>
  <li><b>Leia o edital</b> e anote o local, a data e a hora.</li>
  <li><b>Prepare os envelopes lacrados:</b> habilitação, proposta técnica (quando houver) e proposta de preços.</li>
  <li><b>Leve o representante credenciado</b>, com documento e procuração.</li>
  <li><b>Entregue os envelopes</b> até a hora marcada.</li>
  <li><b>Abertura.</b> A comissão abre os envelopes na ordem do edital e registra tudo em ata.</li>
  <li><b>Julgamento</b> conforme o critério do edital.</li>
  <li><b>Recurso</b> na sessão ou no prazo legal, depois adjudicação e homologação.</li>
  <li><b>Contrato</b>, garantia se exigida, execução e pagamento.</li></ol>
  <h4>Atenção</h4><ul><li>Falta ou erro de documento no envelope costuma eliminar a proposta. Faça uma lista de conferência.</li></ul>`],
 ["Dispensa, passo a passo", false, `<p><b>O que é:</b> o órgão compra sem licitação completa. A lei prevê vários casos. O mais comum é a dispensa por <b>valor baixo</b>: até ${money(LIM.comp)} em compras e serviços, e até ${money(LIM.obras)} em obras e engenharia (valores federais de 2026). Mesmo assim, há disputa: o órgão publica um aviso e qualquer empresa pode mandar proposta.</p>
  <h4>Outros casos de dispensa</h4>
  <ul><li>Licitação anterior sem interessados ou fracassada.</li><li>Emergência ou calamidade pública.</li><li>Compra de produtor rural ou agricultura familiar, e outros casos previstos em lei. Cada um tem regra própria.</li></ul>
  <h4>Passo a passo para você (dispensa eletrônica)</h4>
  <ol>
  <li><b>Ache o aviso</b> no Compras.gov.br ou no PNCP. O prazo para propostas é de, no mínimo, 3 dias úteis.</li>
  <li><b>Leia o aviso:</b> objeto, quantidade, valor, entrega e documentos.</li>
  <li><b>Calcule o seu piso</b> na aba Calcular.</li>
  <li><b>Cadastre a proposta</b> no sistema antes do prazo. Alguns avisos permitem informar um valor final mínimo para o sistema dar lances até esse valor.</li>
  <li><b>Fase de lances.</b> Na data e hora do aviso começa a disputa. Você baixa o preço enquanto o tempo corre.</li>
  <li><b>Julgamento.</b> O órgão confere se a melhor proposta atende ao pedido.</li>
  <li><b>Documentos.</b> Quem ganhou envia a proposta ajustada e os documentos pedidos.</li>
  <li><b>Contratação.</b> O órgão emite a nota de empenho.</li>
  <li><b>Entrega e nota fiscal</b> com o número do empenho, depois ateste e pagamento.</li></ol>
  <h4>Atenção</h4><ul><li>É proibido dividir uma compra para ficar abaixo do limite (fracionamento).</li><li>Muitos avisos são exclusivos para MEI, ME e EPP quando o item fica em até R$ 80.000.</li><li>Há dispensas feitas por contato direto, sem disputa pública. Ter o cadastro e os documentos em dia ajuda a ser lembrado.</li></ul>`],
 ["Inexigibilidade, passo a passo", false, `<p><b>O que é:</b> contratação direta quando é <b>impossível competir</b>. Se existe mais de um fornecedor que atende, não cabe inexigibilidade.</p>
  <h4>Quando se aplica (Lei 14.133, art. 74)</h4>
  <ul><li><b>Fornecedor exclusivo:</b> só uma empresa ou representante vende ou presta aquilo. É proibido preferir marca.</li><li><b>Artista consagrado:</b> contratação de profissional do setor artístico.</li><li><b>Serviço técnico especializado</b> de natureza intelectual, com profissional de notória especialização.</li><li>Objetos que podem ser contratados por <b>credenciamento</b>.</li><li><b>Imóvel</b> cuja localização e instalações tornem necessária a escolha.</li></ul>
  <h4>Passo a passo para você</h4>
  <ol>
  <li>O órgão identifica a necessidade e que só você atende.</li>
  <li>Você envia proposta e a <b>prova de exclusividade</b>: atestado de exclusividade, contrato de exclusividade, declaração do fabricante ou outro documento idôneo.</li>
  <li>O órgão faz a <b>justificativa de preço</b>, comparando com o que você cobra de outros clientes.</li>
  <li>Você envia os documentos de habilitação.</li>
  <li>O órgão faz o parecer jurídico e a autoridade autoriza.</li>
  <li>O ato é publicado no PNCP.</li>
  <li>Vêm o contrato ou empenho, a entrega, a nota fiscal, o ateste e o pagamento.</li></ol>
  <h4>Atenção</h4><ul><li>Guarde as notas fiscais de vendas parecidas para provar o preço.</li><li>A exclusividade precisa ser real e documentada.</li></ul>`],
 ["Credenciamento, passo a passo", false, `<p><b>O que é:</b> o órgão chama <b>todos os interessados</b> que cumprirem as regras e contrata os que se credenciarem. Não há disputa de preço: o órgão define os valores no edital. É usado, por exemplo, em serviços de saúde e quando a escolha do prestador é de quem usa o serviço.</p>
  <h4>Quando se usa (Lei 14.133, art. 79)</h4>
  <ul><li>Contratação paralela e não excludente: vários credenciados atendem ao mesmo tempo.</li><li>Seleção a critério de terceiros, como o beneficiário do serviço.</li><li>Mercado fluido, em que os preços mudam e o órgão paga o preço do dia.</li></ul>
  <h4>Passo a passo para você</h4>
  <ol>
  <li><b>Ache o edital de chamamento público.</b> Muitos ficam abertos de forma permanente para novos interessados.</li>
  <li><b>Leia as condições:</b> serviço, tabela de preços, requisitos e documentos.</li>
  <li><b>Peça o credenciamento</b> com a documentação pedida.</li>
  <li><b>O órgão analisa</b> a documentação e publica a lista de credenciados.</li>
  <li><b>Assine o termo</b> ou contrato de credenciamento.</li>
  <li><b>Seja chamado</b> conforme a demanda, por rodízio ou pela escolha de quem usa o serviço.</li>
  <li><b>Execute, emita a nota fiscal e receba</b> pelo valor da tabela.</li></ol>
  <h4>Atenção</h4><ul><li>Ser credenciado não garante volume de vendas.</li><li>Mantenha os documentos em dia, porque o credenciamento pode ser cancelado se vencerem.</li></ul>`],
 ["Leilão eletrônico, passo a passo", false, `<p><b>O que é:</b> o governo <b>vende</b> bens, como imóveis, móveis inservíveis ou bens apreendidos, a quem der o <b>maior lance</b>. Aqui você é o <b>comprador</b> (arrematante), não o fornecedor. Pode ser uma boa fonte de equipamentos e estoque a preço baixo.</p>
  <h4>Passo a passo para você</h4>
  <ol>
  <li><b>Ache o leilão</b> no PNCP ou no site do leiloeiro.</li>
  <li><b>Leia o edital:</b> descrição do lote, estado do bem, valor mínimo, forma e prazo de pagamento, comissão do leiloeiro, custos e prazo para retirar.</li>
  <li><b>Cadastre-se no site do leiloeiro</b> e envie os documentos pedidos, antes do leilão.</li>
  <li><b>Veja o bem</b>, quando houver visitação, e pesquise dívidas e restrições.</li>
  <li><b>Dê lances</b> na data e hora marcadas. Os lances sobem, e o tempo costuma ser prorrogado quando alguém dá lance perto do fim.</li>
  <li><b>Arrematou?</b> Pague no prazo do edital, mais a comissão do leiloeiro.</li>
  <li><b>Retire o bem</b> e guarde a nota ou a ata de arrematação e os documentos para a transferência.</li></ol>
  <h4>Atenção</h4><ul><li>Os bens costumam ser vendidos no estado em que estão, sem garantia.</li><li>Defina antes o seu valor máximo e não passe dele.</li><li>Atraso no pagamento ou na retirada pode gerar multa.</li></ul>`],
 ["Leilão presencial, passo a passo", false, `<p><b>O que é:</b> o mesmo leilão, com os lances dados no local. Como no eletrônico, o governo vende e você compra.</p>
  <h4>Passo a passo para você</h4>
  <ol>
  <li><b>Leia o edital</b> e anote o local, a data e a hora.</li>
  <li><b>Cadastre-se e leve os documentos</b> pedidos. Alguns leilões pedem caução ou habilitação no local.</li>
  <li><b>Visite os bens</b> nos dias de visitação.</li>
  <li><b>Dê lances</b> em voz alta ou com a plaqueta numerada, conforme o leiloeiro.</li>
  <li><b>Arrematou?</b> Assine o termo, pague no prazo e a comissão do leiloeiro.</li>
  <li><b>Retire o bem</b> e guarde os documentos.</li></ol>
  <h4>Atenção</h4><ul><li>Compare o valor do bem com o preço de mercado e some os custos de transporte e regularização.</li></ul>`],
 ["Outros procedimentos: registro de preços, pré-qualificação e mais", false, `<h4>Registro de preços (SRP)</h4><p>O órgão faz uma licitação e registra os preços dos vencedores em uma <b>ata</b>, válida por até 1 ano, podendo ser prorrogada. Depois compra aos poucos. Estar na ata não obriga o órgão a comprar. Outros órgãos podem aderir à ata. Calcule se o preço cobre custo, frete e imposto durante todo o período.</p>
  <h4>Pré-qualificação</h4><p>O órgão avalia antes se a empresa ou o produto atende às exigências e cria uma lista. Quem está na lista participa das licitações seguintes.</p>
  <h4>Manifestação de interesse</h4><p>O órgão convida empresas a propor soluções e estudos para depois fazer a licitação.</p>
  <h4>Concurso</h4><p>Escolha de trabalho técnico, científico ou artístico, com prêmio ou remuneração.</p>
  <h4>Diálogo competitivo</h4><p>Para soluções complexas e inovadoras. O órgão conversa com os licitantes antes de pedir as propostas finais.</p>`],
 ["Fases e prazos mínimos", false, `<p>As fases de uma licitação, pela Lei 14.133 (art. 17), são: preparatória, divulgação do edital, apresentação de propostas e lances, julgamento, habilitação, recursal e homologação. O órgão pode antecipar a habilitação, se justificar.</p>
  <p>Prazos mínimos para divulgar o edital (art. 55), contados em dias úteis:</p>
  <div class="tw"><table class="tbl"><tbody>
  <tr><td>Compra de bens, menor preço ou maior desconto</td><td>8</td></tr>
  <tr><td>Compra de bens, outros critérios</td><td>15</td></tr>
  <tr><td>Serviços e obras comuns, menor preço ou maior desconto</td><td>10</td></tr>
  <tr><td>Serviços e obras especiais</td><td>25</td></tr>
  <tr><td>Leilão</td><td>15</td></tr>
  <tr><td>Concurso</td><td>35</td></tr>
  <tr><td>Diálogo competitivo</td><td>25</td></tr>
  <tr><td>Dispensa eletrônica (aviso)</td><td>3</td></tr>
  </tbody></table></div>
  <p>Confira sempre o prazo no próprio edital.</p>`],
 ["Documentos de habilitação mais pedidos", false, `<ul><li><b>Jurídica:</b> contrato social ou certificado do MEI (CCMEI) e documento do responsável.</li><li><b>Fiscal, social e trabalhista:</b> certidões federal, estadual e municipal, regularidade do FGTS e certidão trabalhista.</li><li><b>Econômico-financeira:</b> balanço e certidão de falência, quando exigidos.</li><li><b>Técnica:</b> atestados de capacidade técnica, para obras e serviços.</li><li><b>Declarações:</b> que não emprega menor, que cumpre o edital e que é micro ou pequena empresa.</li></ul><p>O cadastro no <b>SICAF</b> guarda boa parte desses documentos. Controle as validades na aba <b>Documentos</b>.</p>`],
 ["Vantagens para MEI, ME e EPP", false, `<ul><li><b>Itens exclusivos:</b> compras de até R$ 80.000 por item podem ser reservadas só para micro e pequenas empresas, incluindo MEI.</li><li><b>Empate:</b> se a sua proposta ficar até 5% acima (no pregão) ou 10% acima (nas outras modalidades) da melhor de uma empresa grande, você pode cobrir o preço e levar.</li><li><b>Regularização fiscal tardia:</b> se uma certidão tiver problema, você ganha prazo adicional para regularizar depois de ganhar. Veja o prazo no edital.</li></ul><div class="note2">Essas regras vêm da Lei Complementar nº 123/2006. Cada edital diz se aplica a vantagem.</div>`],
 ["Linha do tempo: da proposta ao pagamento", false, `<ol><li>Achar a oportunidade (Hub, Radar, busca por valor ou Mais, Portais).</li><li>Calcular o lance (aba Calcular).</li><li>Conferir os documentos (aba Documentos).</li><li>Enviar proposta e disputar lances no portal.</li><li>Ganhou: enviar documentos e proposta ajustada.</li><li>Receber a nota de empenho.</li><li>Comprar do fornecedor e entregar.</li><li>Emitir a nota fiscal (Mais, Nota fiscal).</li><li>Ateste e pagamento. Se o prazo for longo, veja a antecipação no Financial Hub.</li></ol>`],
 ["Palavras que aparecem no edital", false, `<dl class="kv">${[["Empenho","Reserva de dinheiro que vale como pedido de compra."],["Ateste","Declaração do órgão de que recebeu certo."],["Habilitação","Conferência dos seus documentos."],["Adjudicação","Entrega do objeto ao vencedor."],["Homologação","Confirmação final do resultado."],["Impugnação","Contestar o edital antes da abertura."],["Esclarecimento","Pergunta ao órgão sobre o edital."],["Proposta ajustada","Sua proposta final, com o preço do lance e os detalhes do produto."],["Termo de referência","Documento que descreve o que o órgão quer comprar."],["UASG","Código da unidade do governo federal que faz a compra."],["Lote e item","No item, você disputa cada produto. No lote, você disputa o conjunto inteiro."],["Valor de referência","Preço estimado pelo órgão. Propostas acima dele podem ser recusadas."],["Cessão de crédito","Transferir a um banco o direito de receber do órgão. Só vale se o edital permitir."]].map(([a, b]) => `<div><dt>${a}</dt><dd style="text-align:left;font-weight:500">${b}</dd></div>`).join("")}</dl>`]
];
function viewModal(m){
  m.innerHTML = `<h1>Como funcionam as licitações</h1><p class="sub">Toque em cada título para abrir. Confirme sempre as regras no edital.</p>` +
    MODG.map(([t, o, b]) => `<details class="tut"${o ? " open" : ""}><summary>${t}</summary><div class="tb">${b}</div></details>`).join("");
}

/* ---------- acompanhar em tempo real ---------- */
const PNCP_BASE = "https://pncp.gov.br/api/consulta/v1";
const hhmm = d => new Date(d).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
async function pncpGet(path, params){
  const u = new URL(PNCP_BASE + path);
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== "" && v != null) u.searchParams.set(k, v); });
  const r = await fetch(u.toString(), {headers:{Accept:"application/json"}});
  if (r.status === 204) return {data:[], paginasRestantes:0, totalRegistros:0};
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
const netMsg = e => (e && e.message && /HTTP/.test(e.message)) ? "O PNCP respondeu com erro (" + e.message + ")." : "net";
function snapOf(c){ return {sit:c.situacaoCompraNome || "", enc:c.dataEncerramentoProposta || "", hom:+c.valorTotalHomologado || 0, res:!!c.existeResultado, est:+c.valorTotalEstimado || 0}; }
function diffSnap(a, b){
  if (!a) return "";
  const o = [];
  if (a.sit !== b.sit) o.push(`Situação: ${a.sit || "?"} para ${b.sit || "?"}`);
  if (a.enc !== b.enc) o.push("O prazo das propostas mudou");
  if (a.res !== b.res && b.res) o.push("Resultado publicado");
  if (a.hom !== b.hom && b.hom) o.push("Valor homologado: " + money(b.hom));
  if (a.est !== b.est && b.est) o.push("Valor estimado mudou para " + money(b.est));
  return o.join(". ");
}
async function watchOne(w){
  const j = await (async () => { const r = await fetch(`${PNCP_BASE}/orgaos/${w.cnpj}/compras/${w.ano}/${w.seq}`, {headers:{Accept:"application/json"}}); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })();
  const s = snapOf(j), d = diffSnap(w.snap, s);
  if (d){ w.mudou = d; w.mudouEm = Date.now(); }
  w.snap = s; w.checado = Date.now(); w.erro = "";
}
let acBusy = false;
async function watchAll(){
  if (acBusy) return; acBusy = true; ui.acErr = ""; acDraw();
  try{ for (const w of S.watch){ try{ await watchOne(w); }catch(e){ const m = netMsg(e); if (m === "net") throw e; w.erro = m; } } ui.acAt = Date.now(); }
  catch(e){ ui.acErr = netMsg(e); }
  acBusy = false; save(); acDraw();
}
async function alertAll(){ await rodaAlertas(); }
function acHTML(){
  let h = "";
  if (ui.acErr === "net") h += `<div class="note2">Não foi possível consultar o PNCP a partir deste app. O navegador ou o link em que você abriu o app bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</div>`;
  else if (ui.acErr) h += `<div class="note2">${esc(ui.acErr)} Tente de novo em alguns minutos.</div>`;
  h += `<h2 class="gh">Licitações que você acompanha</h2>`;
  h += S.watch.length ? S.watch.map(w => `<div class="card"><div class="top"><b>${esc(w.titulo || "Licitação")}</b>${w.snap ? `<span class="tag ${/revog|anul|suspens|fracass|deserta/i.test(w.snap.sit) ? "bd" : "ok"}">${esc(w.snap.sit || "Sem situação")}</span>` : ""}</div>
    <div class="meta">${esc(w.orgao || "")}${w.uf ? ", " + esc(w.uf) : ""}</div>
    ${w.snap ? `<div class="meta">${w.snap.enc ? "Propostas até " + fdate(String(w.snap.enc).slice(0, 10)) + ". " : ""}${w.snap.est ? "Estimado " + money(w.snap.est) + ". " : ""}${w.snap.hom ? "Homologado " + money(w.snap.hom) + "." : ""}</div>` : '<div class="meta">Ainda não consultei. Toque em Atualizar.</div>'}
    ${w.mudou ? `<div class="note2"><b>Mudou:</b> ${esc(w.mudou)}</div>` : ""}${w.erro ? `<div class="meta">${esc(w.erro)}</div>` : ""}
    <div class="links"><a class="btn ghost sm" href="https://pncp.gov.br/app/editais/${esc(w.cnpj)}/${esc(w.ano)}/${esc(w.seq)}" target="_blank" rel="noopener">Abrir no PNCP</a>${w.mudou ? `<button class="btn ghost sm" data-a="acOk" data-id="${w.id}">Ok, vi</button>` : ""}<button class="btn danger sm" data-a="acDel" data-id="${w.id}">Parar de acompanhar</button></div></div>`).join("")
    : `<div class="card empty">Nenhuma licitação acompanhada. Em <b>Buscar licitações</b>, toque em <b>Acompanhar</b> no resultado.</div>`;
  h += `<h2 class="gh">Alertas de busca</h2>`;
  if (!S.alertas.some(a => a.nicho === "Limpeza e higiene" && a.uf === "SP" && n(a.vmin) === 3000 && n(a.vmax) === 10000)) h += `<div class="card pc"><b>Alerta pronto: produtos de limpeza em São Paulo</b><p>Licitações abertas de material de limpeza e higiene, de R$ 3.000 a R$ 10.000, no estado de São Paulo. O app confere sozinho enquanto estiver aberto.</p><button class="btn ghost sm" data-a="alPreset">Criar este alerta</button></div>`;
  h += S.alertas.length ? S.alertas.map(a => { const uf = UFS.find(u => u[0] === a.uf);
    return `<div class="card"><div class="top"><b>${esc(a.perfil ? "Meu perfil de vendas" : (a.nicho || a.item || "Qualquer item"))}</b>${a.novos ? `<span class="tag bd">${a.novos} nova${a.novos > 1 ? "s" : ""}</span>` : ""}</div>
    <div class="meta">${esc(alertDesc(a))}</div>
    <div class="meta">${a.checado ? "Verificado às " + hhmm(a.checado) + (a.base != null ? ". Base inicial: " + a.base + " encontradas." : ".") : "Ainda não verificado."}</div>
    ${(() => { const ref = refOf(a); return (a.novosLista || []).map(x => ({x, sc:oppScore({v:x.v, o:x.o, uf:x.uf, m:x.m, p:x.p, cn:x.cn, g:x.g}, ref)})).sort((p, q) => q.sc.score - p.sc.score); })().map(({x, sc}) => `<div class="it" style="border-top:1px solid var(--line);padding:10px 0"><b>${money(x.v)}</b> ${scoreTag(sc)} <span class="tag">${esc(x.uf)}</span><div class="d" style="font-size:14px">${esc(x.o)}</div><div class="d" style="font-size:13px;color:var(--mut)">${esc(x.g)}</div><div class="links"><a class="btn ghost sm" href="${su(x.l)}" target="_blank" rel="noopener">Abrir edital</a><button class="btn sm" data-a="alItem" data-id="${a.id}" data-k="${esc(x.k)}">Salvar em Licitações</button></div>${scoreDet(sc)}</div>`).join("")}
    <div class="links">${a.novos ? `<button class="btn ghost sm" data-a="alOk" data-id="${a.id}">Ok, vi</button>` : ""}<button class="btn danger sm" data-a="alDel" data-id="${a.id}">Remover alerta</button></div></div>`; }).join("")
    : `<div class="card empty">Nenhum alerta. Em <b>Buscar licitações</b>, preencha item, valor e estado e toque em <b>Salvar como alerta</b>.</div>`;
  return h;
}
function acDraw(){ const o = $("#acOut"); if (o) o.innerHTML = acHTML(); const s = $("#acSt"); if (s) s.textContent = acBusy ? "Consultando o PNCP…" : ui.acAt ? "Última consulta às " + hhmm(ui.acAt) + "." : "Ainda não consultado."; }
function viewAcomp(m){
  m.innerHTML = `<h1>Alertas e lembretes</h1>
  <p class="sub">O app consulta o PNCP quando esta tela está aberta e a cada 5 minutos. Não envia avisos com o app fechado.</p>
  ${lembHTML()}
  <div class="actions" style="margin-top:0"><button class="btn" data-a="acAll">Atualizar agora</button><button class="btn ghost" data-a="acAlerts">Verificar alertas</button></div>
  <p class="hint" id="acSt" style="margin:0 0 6px"></p><div id="acOut"></div>`;
  acDraw();
  if (!ui.acTimer) ui.acTimer = setInterval(() => { if (ui.tab !== "acomp"){ clearInterval(ui.acTimer); ui.acTimer = null; return; } watchAll(); }, 300000);
  if (S.watch.length && (!ui.acAt || Date.now() - ui.acAt > 120000)) watchAll();
}

/* ---------- melhores fornecedores por nicho ---------- */
const NICHOS = [
 {n:"Material de escritório", k:["papel a4","papelaria","caneta","material de expediente","material de escritorio"]},
 {n:"Limpeza e higiene", k:["material de limpeza","detergente","desinfetante","sabao","papel higienico","alcool"]},
 {n:"Informática", k:["computador","notebook","impressora","toner","monitor","cartucho"]},
 {n:"Alimentos e merenda", k:["merenda","genero alimenticio","alimento","cesta basica","refeicao"]},
 {n:"Uniformes e EPI", k:["uniforme","epi","equipamento de protecao","fardamento","luva"]},
 {n:"Móveis", k:["mobiliario","cadeira","mesa","armario","movel"]},
 {n:"Construção e ferramentas", k:["material de construcao","ferramenta","tinta","cimento","material eletrico"]},
 {n:"Material hospitalar", k:["material hospitalar","insumo hospitalar","material medico"]},
 {n:"Transporte e frete", k:["frete","transporte de carga","transporte de mercadoria","transportadora","entrega de mercadoria"]}
];
const MX = {run:false, stop:false, grupos:{}, seen:new Set(), lidos:0, total:0, pg:1, maxPg:60, fim:false, erro:"", sel:["Material de escritório"], dias:90, uf:"", cnpj:{}, feito:false};
const allNichos = () => NICHOS.concat(S.nichos.map(x => ({n:x.n, k:x.k.map(norm), custom:x.id})));
const kwTest = (txt, k) => k.length <= 4 ? new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "s?\\b").test(txt) : txt.includes(k);
const fmtCnpj = s => String(s || "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
function mxReset(){ Object.assign(MX, {run:false, stop:false, grupos:{}, seen:new Set(), lidos:0, total:0, pg:1, maxPg:60, fim:false, erro:"", feito:true}); }
function mxAdd(c){
  if (c.tipoPessoa && c.tipoPessoa !== "PJ") return;
  const ni = String(c.niFornecedor || "").replace(/\D/g, ""); if (!ni) return;
  const k = c.numeroControlePNCP; if (k){ if (MX.seen.has(k)) return; MX.seen.add(k); }
  const uo = c.unidadeOrgao || {}, uf = uo.ufSigla || ""; if (MX.uf && uf !== MX.uf) return;
  const txt = norm(c.objetoContrato), val = +c.valorGlobal || 0, dt = String(c.dataAssinatura || c.dataPublicacaoPncp || "").slice(0, 10), org = (c.orgaoEntidade || {}).cnpj || "";
  allNichos().filter(x => MX.sel.includes(x.n)).forEach(x => {
    if (!x.k.some(w => kwTest(txt, w))) return;
    const g = MX.grupos[x.n] = MX.grupos[x.n] || {f:{}, ufs:{}, n:0, valor:0};
    const f = g.f[ni] = g.f[ni] || {ni, nome:c.nomeRazaoSocialFornecedor || "", n:0, valor:0, orgs:new Set(), ufs:new Set(), ult:""};
    f.n++; f.valor += val; if (org) f.orgs.add(org); if (uf) f.ufs.add(uf); if (dt > f.ult) f.ult = dt;
    g.n++; g.valor += val; const u = g.ufs[uf || "?"] = g.ufs[uf || "?"] || {n:0, valor:0}; u.n++; u.valor += val;
  });
}
async function mxRun(){
  if (MX.run) return; MX.run = true; MX.stop = false; MX.erro = ""; mxDraw();
  try{
    const fim = new Date(), ini = new Date(); ini.setDate(ini.getDate() - MX.dias);
    while (!MX.stop && !MX.fim && MX.pg <= MX.maxPg){
      const j = await pncpGet("/contratos", {dataInicial:ymd(ini), dataFinal:ymd(fim), pagina:MX.pg, tamanhoPagina:500}), arr = j.data || [];
      MX.total = j.totalRegistros || MX.total; arr.forEach(mxAdd); MX.lidos += arr.length;
      if (!arr.length || !(j.paginasRestantes > 0)) MX.fim = true; else MX.pg++;
      mxDraw();
    }
  }catch(e){ MX.erro = netMsg(e); }
  MX.run = false; mxDraw();
}
function mxHTML(){
  if (!MX.feito) return "";
  if (MX.erro === "net") return `<div class="card"><b>Não foi possível consultar o PNCP</b><p class="sub" style="margin:6px 0 0">O navegador ou o link em que você abriu o app bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`;
  const pr = MX.total > 0 ? clampN(MX.lidos / MX.total * 100, 0, 100) : 0;
  let h = `<div class="card"><div class="prg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pr)}"><i style="width:${pr}%"></i></div>
    <div class="sub" style="margin:0">${MX.run ? "Analisando… " : ""}${MX.lidos.toLocaleString("pt-BR")} de ${MX.total.toLocaleString("pt-BR")} contratos analisados${MX.fim ? ". Análise completa." : "."}</div>
    ${MX.erro ? `<p class="note2">${esc(MX.erro)}</p>` : ""}
    <div class="actions">${MX.run ? '<button class="btn ghost sm" data-a="mxStop">Parar</button>' : (!MX.fim ? '<button class="btn ghost sm" data-a="mxMais">Analisar mais</button>' : "")}</div></div>`;
  MX.sel.forEach(nm => {
    const g = MX.grupos[nm];
    h += `<div class="card"><b style="font-size:18px">${esc(nm)}</b>`;
    if (!g){ h += `<p class="sub" style="margin:6px 0 0">${MX.run ? "Procurando…" : "Nenhum contrato encontrado nas páginas analisadas."}</p></div>`; return; }
    const top = Object.values(g.f).sort((a, b) => b.n - a.n || b.valor - a.valor).slice(0, 4);
    h += `<div class="sub" style="margin:2px 0 6px">${g.n.toLocaleString("pt-BR")} contratos, ${money(g.valor)} no total.</div>`;
    h += top.map((f, i) => `<div class="top4"><div><span class="rk">${i + 1}</span><span class="nm">${esc(f.nome || "Sem nome")}</span></div>
      <div class="d">CNPJ ${esc(fmtCnpj(f.ni))}</div>
      <div class="cn"><b>${f.n}</b> contrato${f.n > 1 ? "s" : ""}, ${money(f.valor)}. ${f.orgs.size} órgão${f.orgs.size > 1 ? "s" : ""} em ${f.ufs.size} estado${f.ufs.size > 1 ? "s" : ""}.${f.ult ? " Último em " + fdate(f.ult) + "." : ""}</div>
      <div id="cn_${f.ni}" class="cn">${MX.cnpj[f.ni] ? esc(MX.cnpj[f.ni]) : ""}</div>
      <div class="links"><button class="btn sm" data-a="mxForn" data-n="${esc(nm)}" data-ni="${f.ni}" data-r="${i + 1}">Salvar fornecedor</button><button class="btn ghost sm" data-a="mxCnpj" data-ni="${f.ni}">Conferir CNPJ</button></div></div>`).join("");
    const ufs = Object.entries(g.ufs).filter(([u]) => u !== "?").sort((a, b) => b[1].valor - a[1].valor).slice(0, 3);
    if (ufs.length) h += `<div class="sub" style="margin:8px 0 0"><b>Estados que mais compram:</b> ${ufs.map(([u, v]) => `${u} (${money(v.valor)}, ${v.n})`).join("; ")}.</div>`;
    h += `</div>`;
  });
  return h;
}
function mxDraw(){ const o = $("#mxOut"); if (o) o.innerHTML = mxHTML(); }
function viewMelhores(m){
  const all = allNichos();
  m.innerHTML = `<h1>Melhores fornecedores</h1>
  <p class="sub">O app olha os contratos assinados com o governo e mostra as 4 empresas que mais fecharam contratos em cada nicho.</p>
  <div class="card"><b>1. Escolha os nichos</b><div class="chips" style="flex-wrap:wrap;margin:8px 0 0;padding:0">${all.map(x => `<button class="chip${MX.sel.includes(x.n) ? " on" : ""}" data-a="mxTog" data-n="${esc(x.n)}">${esc(x.n)}</button>`).join("")}</div>
    <details class="tut" style="margin-top:10px"><summary>Criar um nicho meu</summary><div class="tb"><div class="fg">
      <div class="f"><label for="nx_nome">Nome do nicho</label><input id="nx_nome" autocomplete="off" placeholder="Ex.: Ar-condicionado"></div>
      <div class="f"><label for="nx_kw">Palavras do produto (separe por vírgula)</label><input id="nx_kw" autocomplete="off" placeholder="ar condicionado, split, climatizador"></div></div>
      <div class="actions"><button class="btn ghost sm" data-a="mxNovo">Adicionar nicho</button></div></div></details></div>
  <div class="card"><b>2. Período e estado</b><div class="fg" style="margin-top:8px">
    <div class="f half"><label for="mx_dias">Contratos dos últimos</label><select id="mx_dias" data-mx="dias">${[30, 90, 180].map(d => `<option value="${d}"${MX.dias === d ? " selected" : ""}>${d} dias</option>`).join("")}</select></div>
    <div class="f half"><label for="mx_uf">Estado</label><select id="mx_uf" data-mx="uf"><option value="">Brasil inteiro</option>${UFS.map(([s, nm]) => `<option value="${s}"${MX.uf === s ? " selected" : ""}>${nm}</option>`).join("")}</select></div></div>
    <div class="actions"><button class="btn" data-a="mxGo">Analisar contratos</button></div></div>
  <div id="mxOut">${mxHTML()}</div>
  <div class="note2"><b>Como ler:</b> o ranking usa o número de contratos e o valor assinados com o governo. Ele não mede qualidade nem preço. Quem aparece pode ser seu fornecedor ou seu concorrente. Antes de comprar, peça cotação, confira o CNPJ e consulte sanções no <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener">Portal da Transparência</a>. A busca é por palavras no texto do contrato, então alguns resultados podem não ser do produto.</div>`;
}
async function cnpjCheck(ni){
  const el = $("#cn_" + ni); if (el) el.textContent = "Consultando…";
  try{
    const r = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + ni); if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    MX.cnpj[ni] = `Situação: ${j.descricao_situacao_cadastral || "?"}. Atividade: ${j.cnae_fiscal_descricao || "?"}. Porte: ${j.descricao_porte || j.porte || "?"}. ${j.municipio ? j.municipio + "/" + (j.uf || "") + "." : ""}`;
  }catch(e){ MX.cnpj[ni] = "Não foi possível consultar o CNPJ agora."; }
  const el2 = $("#cn_" + ni); if (el2) el2.textContent = MX.cnpj[ni];
}

/* ---------- dados da empresa (CNPJ) ---------- */
const cnpjDig = s => String(s || "").replace(/\D/g, "");
function cnpjOk(s){
  const d = cnpjDig(s); if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = len => { let p = len - 7, t = 0; for (let i = 0; i < len; i++){ t += +d[i] * p--; if (p < 2) p = 9; } const r = t % 11; return r < 2 ? 0 : 11 - r; };
  return dv(12) === +d[12] && dv(13) === +d[13];
}
function maskCnpj(s){
  const d = cnpjDig(s).slice(0, 14);
  if (d.length > 12) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, "$1.$2.$3/$4-$5");
  if (d.length > 8) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/, "$1.$2.$3/$4");
  if (d.length > 5) return d.replace(/^(\d{2})(\d{3})(\d{0,3})$/, "$1.$2.$3");
  if (d.length > 2) return d.replace(/^(\d{2})(\d{0,3})$/, "$1.$2");
  return d;
}
const cnpjMsg = s => { const d = cnpjDig(s); return !d ? "" : d.length < 14 ? "Faltam " + (14 - d.length) + " dígitos." : cnpjOk(d) ? "CNPJ válido." : "CNPJ inválido. Confira os números."; };
const empLine = () => { const e = S.empresa; return (e.razao || "(sua empresa)") + (e.cnpj ? ", CNPJ " + e.cnpj : "") + (e.ie ? ", IE " + e.ie : ""); };
function viewEmpresa(m){
  const e = S.empresa;
  const F = (k, l, o = {}) => `<div class="f${o.half ? " half" : ""}"><label for="em_${k}">${l}</label><input id="em_${k}" data-emp="${k}" autocomplete="off"${o.mode ? ` inputmode="${o.mode}"` : ""}${o.ph ? ` placeholder="${o.ph}"` : ""} value="${esc(e[k])}"></div>`;
  m.innerHTML = `<h1>Dados da empresa</h1>
  <p class="sub">Cadastre uma vez. O app usa esses dados nos textos das notas fiscais. Tudo é salvo ao digitar.</p>
  <div class="card"><div class="fg">
    ${F("cnpj", "CNPJ da sua empresa", {mode:"numeric", ph:"00.000.000/0000-00"})}
    <div class="hint" id="em_msg" role="status" style="margin:-4px 0 0">${esc(cnpjMsg(e.cnpj))}</div>
    ${F("razao", "Razão social")}${F("fantasia", "Nome fantasia")}
    ${F("ie", "Inscrição estadual", {half:true})}${F("tel", "Telefone ou WhatsApp", {half:true})}
    ${F("email", "E-mail da empresa")}${F("end", "Endereço completo (texto livre)")}${F("logradouro", "Logradouro (rua, avenida)")}${F("numero", "Número", {half:true})}${F("bairro", "Bairro", {half:true})}${F("cep", "CEP", {half:true})}
    ${F("cidade", "Cidade", {half:true})}
    <div class="f half"><label for="em_uf">Estado</label><select id="em_uf" data-emp="uf"><option value=""></option>${UFS.map(([s, nm]) => `<option value="${s}"${e.uf === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
  </div>
  <div class="actions"><button class="btn ghost" data-a="empBusca">Preencher pelo CNPJ</button></div><div class="hint" id="em_busca" role="status"></div></div>
  <div class="note2">O botão <b>Preencher pelo CNPJ</b> consulta dados públicos da Receita pela BrasilAPI e completa os campos que estiverem vazios. Funciona no aplicativo instalado. Se não funcionar, digite os dados à mão.</div>`;
}

/* ---------- fretes e transportadoras ---------- */
const TR_TIPOS = ["Fracionada (carga pequena)", "Lotação (caminhão fechado)", "Encomendas e Correios", "Expressa (urgente)", "Outra"];
const TR_NAC = [
  ["Correios", "Encomendas e cargas pequenas.", "https://www.correios.com.br"],
  ["Jadlog", "Encomendas e cargas fracionadas.", "https://www.jadlog.com.br"],
  ["Braspress", "Cargas fracionadas e lotação.", "https://www.braspress.com"],
  ["Rodonaves", "Cargas fracionadas e lotação.", "https://www.rodonaves.com.br"],
  ["Loggi", "Entregas e encomendas.", "https://www.loggi.com"]
];
const TR_COT = [
  ["Melhor Envio", "Compara várias transportadoras de encomendas em uma só cotação.", "https://melhorenvio.com.br"],
  ["Frenet", "Cotação de frete em várias transportadoras.", "https://www.frenet.com.br"],
  ["Fretebras", "Contratação de caminhoneiros para carga fechada.", "https://www.fretebras.com.br"]
];
const UFSEL = [["", "Selecione"], ...UFS.map(([s, nm]) => [s, s + " - " + nm])];
const trFields = () => [
  {k:"nome", l:"Nome da transportadora"}, {k:"cnpj", l:"CNPJ", w:"half"}, {k:"tipo", l:"Tipo de serviço", t:"sel", o:TR_TIPOS.map(x => [x, x]), w:"half"},
  {k:"ufs", l:"Estados que atende (ex.: SP, MG, RJ ou Nacional)"}, {k:"tel", l:"Telefone ou WhatsApp", w:"half"}, {k:"email", l:"E-mail", w:"half"},
  {k:"site", l:"Site"}, {k:"obs", l:"Observações", t:"area"}
];
const frFields = () => [
  {k:"transp", l:"Transportadora"}, {k:"origUF", l:"Estado de origem", t:"sel", o:UFSEL, w:"half"}, {k:"destUF", l:"Estado de destino", t:"sel", o:UFSEL, w:"half"},
  {k:"cidades", l:"Cidades (origem para destino)"}, {k:"peso", l:"Peso (kg)", t:"num", w:"half"}, {k:"valorMerc", l:"Valor da mercadoria (R$)", t:"num", w:"half"},
  {k:"frete", l:"Valor do frete (R$)", t:"num", w:"half"}, {k:"prazo", l:"Prazo (dias)", t:"num", w:"half"},
  {k:"servico", l:"Serviço", w:"half"}, {k:"validade", l:"Cotação válida até", t:"date", w:"half"}, {k:"obs", l:"Observações", t:"area"}
];
function editTr(id, pre){
  const cur = id ? S.transp.find(x => x.id === id) : null;
  openForm({title: cur ? "Editar transportadora" : "Nova transportadora", fields: trFields(), vals: cur || {tipo:TR_TIPOS[0], ...pre},
    check: v => !v.nome ? "Informe o nome da transportadora." : (v.cnpj && !cnpjOk(v.cnpj)) ? "O CNPJ está inválido. Confira os números." : (v.site && !/^https?:\/\//.test(v.site)) ? "O site deve começar com https://" : "",
    save: v => { if (v.cnpj) v.cnpj = maskCnpj(v.cnpj); if (cur) Object.assign(cur, v); else S.transp.unshift({id:uid(), ...v}); },
    del: cur ? () => { S.transp = S.transp.filter(x => x.id !== id); } : null});
}
function editFr(id, pre){
  const cur = id ? S.frete.find(x => x.id === id) : null;
  openForm({title: cur ? "Editar cotação de frete" : "Nova cotação de frete", fields: frFields(), vals: cur || {destUF:ui.frUF || "", ...pre},
    check: v => !v.transp ? "Informe a transportadora." : !v.origUF || !v.destUF ? "Escolha o estado de origem e o de destino." : !(v.frete > 0) ? "Informe o valor do frete." : "",
    preview: v => { const kg = v.peso > 0 ? v.frete / v.peso : null, pc = v.valorMerc > 0 ? v.frete / v.valorMerc : null; return `<div><span>Frete por kg</span><b>${kg == null ? "-" : money(kg)}</b></div><div><span>Frete sobre a mercadoria</span><b>${pc == null ? "-" : pct(pc)}</b></div>`; },
    save: v => { if (cur) Object.assign(cur, v); else S.frete.unshift({id:uid(), ...v}); },
    del: cur ? () => { S.frete = S.frete.filter(x => x.id !== id); } : null});
}
const trCobre = (t, uf) => { if (!uf) return true; const s = norm(t.ufs); return /nacional|todo o brasil|brasil inteiro|todos/.test(s) || new RegExp("\\b" + uf.toLowerCase() + "\\b").test(s); };
function frListHTML(){
  const q = norm(ui.frQ || ""), uf = ui.frUF || "";
  const r = S.transp.filter(t => trCobre(t, uf) && (!q || norm([t.nome, t.cnpj, t.tipo, t.ufs, t.obs].join(" ")).includes(q)));
  if (!r.length) return `<div class="card empty">${S.transp.length ? "Nenhuma transportadora sua atende esse filtro." : "Você ainda não cadastrou transportadoras. Toque em Nova transportadora."}</div>`;
  return r.map(t => { const tel = cnpjDig(t.tel);
    return `<div class="card" style="cursor:default"><div class="item" data-a="editTr" data-id="${t.id}" tabindex="0" role="button"><div class="top"><b>${esc(t.nome)}</b><span class="tag">${esc(t.tipo || "")}</span></div>
      <div class="meta">${esc(t.ufs ? "Atende: " + t.ufs : "Cobertura não informada")}${t.cnpj ? ". CNPJ " + esc(t.cnpj) : ""}</div></div>
      <div class="links"><button class="btn ghost sm" data-a="newFr" data-t="${esc(t.nome)}">Nova cotação</button>${tel ? `<a class="btn ghost sm" href="https://wa.me/55${tel}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${/^https?:\/\//.test(t.site || "") ? `<a class="btn ghost sm" href="${su(t.site)}" target="_blank" rel="noopener">Site</a>` : ""}</div></div>`; }).join("");
}
function frGroupHTML([k, arr], gi){
  const a = arr.slice().sort((x, y) => n(x.frete) - n(y.frete)), min = n(a[0].frete), max = n(a[a.length - 1].frete);
  const prazos = a.map(x => n(x.prazo)).filter(x => x > 0), pmin = prazos.length ? Math.min(...prazos) : 0, hoje = new Date().toISOString().slice(0, 10);
  const [o, d] = k.split(">");
  return `<div class="card"><b>${esc(o)} para ${esc(d)}</b><div class="sub" style="margin:2px 0 6px">${a.length} cotaç${a.length > 1 ? "ões" : "ão"}.${a.length > 1 && min > 0 ? " A mais cara custa " + pct((max - min) / min) + " a mais que a mais barata." : ""}</div>
  <div class="tw"><table class="tbl fr"><thead><tr><th>Transportadora</th><th>Frete</th><th>Prazo</th><th>Por kg</th><th>% merc.</th></tr></thead><tbody>
  ${a.map(q => { const f = n(q.frete), p = n(q.peso), v = n(q.valorMerc), pz = n(q.prazo), venc = q.validade && q.validade < hoje;
    const tags = (a.length > 1 && f === min ? '<span class="tag ok">Mais barato</span>' : "") + (a.length > 1 && pz > 0 && pz === pmin ? '<span class="tag">Mais rápido</span>' : "") + (venc ? '<span class="tag wn">Vencida</span>' : "");
    return `<tr class="${a.length > 1 && f === min ? "hit" : ""}" data-a="editFr" data-id="${q.id}" tabindex="0" role="button"><td><b>${esc(q.transp)}</b>${tags}<small>${[p > 0 ? p + " kg" : "", q.servico || "", q.cidades || ""].filter(Boolean).map(esc).join(", ")}</small></td><td><b>${money(f)}</b></td><td>${pz > 0 ? pz + " d" : "-"}</td><td>${p > 0 ? money(f / p) : "-"}</td><td>${v > 0 ? pct(f / v) : "-"}</td></tr>`; }).join("")}
  </tbody></table></div>
  <div class="actions"><button class="btn ghost sm" data-a="frUsar" data-g="${gi}">Usar o menor frete no Calcular</button></div></div>`;
}
const frGroups = () => { const g = {}, uf = ui.frUF || ""; S.frete.forEach(q => { if (uf && q.destUF !== uf) return; (g[(q.origUF || "?") + ">" + (q.destUF || "?")] = g[(q.origUF || "?") + ">" + (q.destUF || "?")] || []).push(q); }); return Object.entries(g); };
function viewFretes(m){
  const g = frGroups();
  m.innerHTML = `<h1>Fretes e transportadoras</h1>
  <p class="sub">Compare cotações de frete e encontre transportadoras em todo o Brasil.</p>
  <div class="card"><div class="f"><label for="fr_uf">Estado de destino</label><select id="fr_uf" data-fr="frUF"><option value="">Brasil inteiro</option>${UFS.map(([s, nm]) => `<option value="${s}"${ui.frUF === s ? " selected" : ""}>${nm}</option>`).join("")}</select></div></div>
  <div class="actions" style="margin-top:0"><button class="btn" data-a="newFr">Nova cotação</button><button class="btn ghost" data-a="newTr">Nova transportadora</button></div>
  <h2 class="gh">Comparação de preços</h2>
  ${g.length ? g.map(frGroupHTML).join("") : `<div class="card empty">Nenhuma cotação${ui.frUF ? " para este estado" : ""}. Peça preço a cada transportadora e lance aqui. O app mostra qual é a mais barata e a mais rápida de cada rota.</div>`}
  <h2 class="gh">Minhas transportadoras</h2>
  <div class="bar"><input id="fr_q" type="search" data-fr="frQ" placeholder="Buscar por nome, tipo ou estado" value="${esc(ui.frQ || "")}" aria-label="Buscar transportadora"></div>
  <div id="frList">${frListHTML()}</div>
  <h2 class="gh">Quem mais vende ao governo</h2>
  <div class="card pc"><p>Veja as 4 empresas de transporte e frete que mais fecharam contratos com o governo nos últimos meses, em todo o Brasil ou no estado que você escolher.</p><button class="btn ghost sm" data-a="frMelhores">Ver as 4 melhores</button></div>
  <h2 class="gh">Transportadoras de atuação nacional</h2>
  ${TR_NAC.map(([t, d, u]) => `<div class="card pc"><b>${t}</b><p>${d}</p><div class="links" style="margin:0"><a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">Abrir site</a><button class="btn ghost sm" data-a="newTr" data-t="${t}" data-s="${u}">Salvar na minha lista</button></div></div>`).join("")}
  <h2 class="gh">Cotar em vários sites</h2>
  ${TR_COT.map(([t, d, u]) => `<div class="card pc"><div class="pc-h">${selo(t)}</div><p>${d}</p><a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">Abrir ${t}</a></div>`).join("")}
  <div class="note2">Os preços de frete dependem do peso, do volume, da distância e do valor da mercadoria, e cada transportadora cobra de um jeito. Por isso o app compara as cotações que você lança. Confira a cobertura e as condições no site de cada uma. Antes de contratar, confirme que a transportadora tem registro na ANTT (RNTRC): no site da <a href="https://www.gov.br/antt/pt-br" target="_blank" rel="noopener">ANTT</a> vá em Cargas, RNTRC, Consulta Pública.</div>`;
}

/* ---------- painel de lances ---------- */
const ATIVAS = ["Achada", "Acompanhando", "Selecionada", "Proposta enviada", "Em disputa"], PRE = ["Achada", "Acompanhando", "Selecionada"];
const bsTs = (d, h) => (d && h) ? new Date(`${d}T${h}:00-03:00`).getTime() : NaN;
const iniTs = x => bsTs(x.data, x.hora);
const fimTs = x => { const t = bsTs(x.dataFim || x.data, x.horaFim); return isNaN(t) ? NaN : t + (+x.fimAjuste || 0) * 60000; };
const fmtCd = ms => { let s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), p = v => String(v).padStart(2, "0"); return (d ? d + "d " : "") + (h || d ? p(h) + ":" : "") + p(m) + ":" + p(s % 60); };
function cdInfo(x, now){
  const a = iniTs(x), f = fimTs(x);
  if (!isNaN(a) && now < a) return {t:"Abre em", ms:a - now, c:""};
  if (!isNaN(f) && now < f){ const ms = f - now; return {t:"Lances terminam em", ms, c:ms <= 60000 ? "bd" : ms <= 300000 ? "wn" : "ok"}; }
  if (!isNaN(f)) return {t:"Sessão encerrada", ms:null, c:""};
  if (!isNaN(a)) return {t:"Sessão já aberta", ms:null, c:"wn"};
  return null;
}
const cdBlock = (x, now = Date.now()) => { const i = cdInfo(x, now); return i ? `<div class="cd ${i.c}"><small>${i.t}</small><b>${i.ms == null ? "" : fmtCdH(i.ms)}</b></div>` : `<div class="cd"><small>Sem horário</small><b style="font-size:16px">Informe data e hora</b></div>`; };
function lancePlano(x){
  const v = licVals(x), r = calc({...v, margem:S.cfg.margem});
  const piso = r.minLance != null ? Math.ceil(r.minLance * 100 - 1e-9) / 100 : null;
  const conc = n(x.conc), dec = n(x.decr) || 0.01, meu = n(x.preco), o = {piso, conc, dec, meu, v, st:"semConc"};
  if (!(conc > 0)) return o;
  o.alvo = Math.floor((conc - dec) * 100 + 1e-9) / 100;
  if (meu > 0 && meu < conc){ o.st = "frente"; o.dif = conc - meu; return o; }
  if (!(o.alvo > 0)){ o.st = "impossivel"; return o; }
  const rr = calc({...v, preco:o.alvo, margem:S.cfg.margem}); o.lucro = rr.lucro; o.mg = rr.margem;
  o.st = (piso != null && o.alvo + 1e-9 >= piso) ? "ok" : "abaixo";
  return o;
}
function planoHTML(x){
  const p = lancePlano(x), mg = S.cfg.margem / 100; let h;
  if (p.st === "semConc") h = `<div class="pl"><small>Lance sugerido</small><span>Digite o menor lance do concorrente para ver o seu lance.</span></div>`;
  else if (p.st === "frente") h = `<div class="pl ok"><small>Você está na frente</small><b style="font-size:24px">${money(p.dif)} abaixo do concorrente</b><span>Só dê novo lance se ele baixar.</span></div>`;
  else if (p.st === "impossivel") h = `<div class="pl bd"><small>Lance sugerido</small><span>O lance do concorrente é menor que a diferença mínima. Confira os valores.</span></div>`;
  else h = `<div class="pl ${p.st === "ok" ? "ok" : "bd"}"><small>Lance sugerido (por unidade)</small><b>${money(p.alvo)}</b>
    <span>${p.st === "ok" ? "É o maior preço que ainda vence o concorrente e mantém a sua margem." : "Esse preço fica abaixo do seu piso: a margem seria menor que a sua meta."} Margem de ${pct(p.mg)} e lucro de ${money(p.lucro)}.</span>
    <div class="links"><button class="btn sm" data-a="lcCopy" data-id="${x.id}">Copiar valor</button></div></div>`;
  return h + `<div class="sub" style="margin:6px 0 0">Seu piso na margem de ${pct(mg)}: <b>${p.piso != null ? money(p.piso) : "não calculável"}</b> por unidade. É o valor mínimo que você pode cadastrar no portal.</div>`;
}
function lcCard(x){
  const inp = (k, l, v, ph) => `<div class="f half"><label for="lc_${k}_${x.id}">${l}</label><input id="lc_${k}_${x.id}" data-lc="${k}" data-id="${x.id}" inputmode="decimal" autocomplete="off" placeholder="${ph || ""}" value="${v ? esc(String(v).replace(".", ",")) : ""}"></div>`;
  return `<div class="card lc"><div class="top"><b>${esc(x.objeto || x.orgao || "Licitação")}</b><span class="tag ${stCls(x.status)}">${esc(x.status)}</span></div>
  <div class="meta">${esc([x.orgao && x.objeto ? x.orgao : "", x.numero ? "nº " + x.numero : "", x.data ? fdate(x.data) + (x.hora ? " às " + x.hora : "") : ""].filter(Boolean).join(", "))}</div>
  <div data-cdb="${x.id}">${cdBlock(x)}</div>
  <div class="fg" style="margin-top:8px">${inp("preco", "Meu menor lance (R$ por unidade)", x.preco)}${inp("conc", "Menor lance do concorrente (R$)", x.conc)}${inp("decr", "Diferença mínima entre lances (R$)", x.decr, "0,01")}
    <div class="f half"><label for="lc_horaFim_${x.id}">Encerramento (Brasília)</label><input id="lc_horaFim_${x.id}" type="time" data-lc="horaFim" data-id="${x.id}" value="${esc(x.horaFim || "")}"></div></div>
  <div id="pl_${x.id}">${planoHTML(x)}</div>
  <div class="links"><button class="btn ghost sm" data-a="lcExtra" data-id="${x.id}">+2 min no encerramento</button>${/^https?:\/\//.test(x.link || "") ? `<a class="btn ghost sm" href="${su(x.link)}" target="_blank" rel="noopener">Abrir sessão</a>` : ""}<button class="btn ghost sm" data-a="editLic" data-id="${x.id}">Editar licitação</button></div></div>`;
}
let AUD = null;
function beep(){
  if (S.cfg.alertaSom === false) return;
  try{ AUD = AUD || new (window.AudioContext || window.webkitAudioContext)(); if (AUD.state === "suspended") AUD.resume();
    [0, .25, .5].forEach(d => { const o = AUD.createOscillator(), g = AUD.createGain(); o.frequency.value = 880; g.gain.value = .2; o.connect(g); g.connect(AUD.destination); o.start(AUD.currentTime + d); o.stop(AUD.currentTime + d + .15); }); }catch(e){}
}
function lanceAlerta(x){
  const p = lancePlano(x), seg = S.cfg.alertaSeg || 5, modo = x.eModo || S.cfg.modoFinal || "manual", val = (p.st === "ok" || p.st === "abaixo"), v = val ? p.alvo.toFixed(2).replace(".", ",") : "";
  beep(); try{ if (S.cfg.alertaSom !== false && navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250]); }catch(e){}
  let copiado = false; if (modo === "assistido" && val){ try{ navigator.clipboard.writeText(v).then(() => { const e = $("#lcCp"); if (e) e.textContent = "Valor copiado. Cole no portal e envie."; }, () => {}); copiado = true; }catch(e){} }
  document.querySelectorAll("#lcAlert").forEach(e => e.remove());
  const bg = document.createElement("div"); bg.className = "bg"; bg.id = "lcAlert";
  bg.innerHTML = `<div class="sheet lcal crit-glow" role="alertdialog" aria-modal="true" aria-label="Aviso de lance"><div class="lcal-t">Faltam ${seg} segundos</div><div class="lcal-n">${esc(x.objeto || x.orgao || "")}</div>
    ${val ? `<small>${p.st === "ok" ? "Dê este lance agora no portal" : "Lance necessário para cobrir, fora da sua margem"}</small><div class="lcal-v ${p.st === "ok" ? "ok" : "bd"}">${money(p.alvo)}</div><div class="lcal-m">Margem de ${pct(p.mg)}</div>${modo === "assistido" ? `<div class="lcal-c" id="lcCp">${copiado ? "Valor copiado. Cole no portal e envie." : "Toque em Copiar valor."}</div>` : ""}`
      : p.st === "frente" ? `<div class="lcal-v ok">Você está na frente</div>` : `<div class="lcal-v" style="font-size:22px">Informe o lance do concorrente</div>`}
    <p class="hint">O app não envia o lance. Digite ou cole o valor no portal. Modo: ${modo === "assistido" ? "automático assistido" : "manual"}.</p>
    <div class="row">${val ? `<button class="btn" data-a="lcCopy" data-id="${x.id}">Copiar valor</button><button class="btn ghost" data-a="lcEnviou" data-id="${x.id}">Enviei o lance</button>` : ""}<button class="btn ghost" data-a="lcClose">Fechar</button></div></div>`;
  document.body.appendChild(bg); setTimeout(() => bg.remove(), 20000);
}
const lcFired = new Set();
const DEMO_LC = {id:"demo", objeto:"Teste do aviso (simulação)", preco:25, qtd:100, custo:15, frete:0, outros:0, conc:24, decr:0.01};
function tickLances(){
  if (document.body.classList.contains("locked")) return;
  const now = Date.now();
  document.querySelectorAll("[data-cdb]").forEach(el => { const x = S.lic.find(y => y.id === el.dataset.cdb); if (x) el.innerHTML = cdBlock(x, now); });
  tickAgenda(now);
  const lim = S.cfg.alertaSeg || 5;
  S.lic.forEach(x => { if (!ATIVAS.includes(x.status)) return; const f = fimTs(x); if (isNaN(f)) return;
    const rem = (f - now) / 1000, key = x.id + ":" + f;
    if (rem > 0 && rem <= lim && !lcFired.has(key)){ lcFired.add(key); lanceAlerta(x); } });
}
async function keepAwake(on){ try{ if (on && "wakeLock" in navigator && !ui.wl) ui.wl = await navigator.wakeLock.request("screen"); else if (!on && ui.wl){ await ui.wl.release(); ui.wl = null; } }catch(e){ ui.wl = null; } }
function viewLances(m){
  const now = Date.now(), key = x => { const a = iniTs(x), f = fimTs(x), t = (!isNaN(f) && f > now) ? f : !isNaN(a) ? a : NaN; return isNaN(t) ? 9e15 : (t < now ? t + 1e14 : t); };
  const lista = S.lic.filter(x => ATIVAS.includes(x.status)).sort((a, b) => key(a) - key(b));
  m.innerHTML = `<h1>Painel de lances</h1>
  <p class="sub">Cronômetro de cada sessão, lance sugerido e aviso faltando poucos segundos. Os horários são os de Brasília.</p>
  <div class="card"><div class="fg"><div class="f half"><label for="lc_seg">Avisar faltando</label><select id="lc_seg" data-lcs="alertaSeg">${[3, 5, 10, 15].map(s => `<option value="${s}"${(S.cfg.alertaSeg || 5) === s ? " selected" : ""}>${s} segundos</option>`).join("")}</select></div>
    <div class="f half"><label for="lc_som">Som e vibração</label><select id="lc_som" data-lcs="alertaSom"><option value="1"${S.cfg.alertaSom !== false ? " selected" : ""}>Ligados</option><option value="0"${S.cfg.alertaSom === false ? " selected" : ""}>Desligados</option></select></div>
    <div class="f"><label for="lc_modo">Lance final nos últimos segundos</label><select id="lc_modo" data-lcs="modoFinal"><option value="manual"${(S.cfg.modoFinal || "manual") === "manual" ? " selected" : ""}>Manual: o app avisa e mostra o valor</option><option value="assistido"${S.cfg.modoFinal === "assistido" ? " selected" : ""}>Automático assistido: copia o valor sozinho</option></select></div></div>
    <div class="actions"><button class="btn ghost sm" data-a="lcTest">Testar o aviso</button></div></div>
  <details class="tut"><summary>Como funciona e cuidados</summary><div class="tb"><b>Como funciona:</b> o app mostra o cronômetro, calcula o <b>maior preço que ainda vence o concorrente</b> sem passar da sua margem e avisa com som e vibração. Em licitação de menor preço, ganha o menor valor, por isso o lance sugerido é o do concorrente menos a diferença mínima. <b>O app não envia o lance:</b> você digita o valor no portal. No modo <b>automático assistido</b>, nos últimos segundos o app abre o aviso, toca o alarme e copia o valor sozinho. Você só cola e envia. Não encontrei API pública dos portais para dar lances por outro app, e muitos editais e portais restringem programas automáticos de lance. Alguns avisos de dispensa eletrônica descrevem um recurso do próprio sistema, em que você cadastra um valor final mínimo. Use o piso mostrado em cada cartão e veja se o seu edital prevê isso.<br><b>Cuidado:</b> muitas sessões prorrogam o tempo quando alguém dá lance perto do fim, e algumas terminam em horário aleatório. A contagem oficial é a do portal. Use o botão +2 min para acompanhar uma prorrogação. Mantenha a tela do app aberta.</div></details>
  ${lista.length ? lista.map(lcCard).join("") : `<div class="card empty">Nenhuma licitação em andamento. Cadastre a licitação com data, hora de abertura e hora de encerramento dos lances.</div>`}
  <div class="actions"><button class="btn" data-a="newLic">Nova licitação</button></div>`;
  keepAwake(true);
}

/* ---------- rastreamento de pedidos ---------- */
const PED_ETAPAS = ["Pedido feito ao fornecedor", "Fornecedor separando e faturando", "Saiu do fornecedor", "Em trânsito", "Chegou ao destino", "Recebido e atestado pelo órgão", "Pagamento recebido"];
const pedFields = () => [
  {k:"licId", l:"Licitação", t:"sel", o:[["", "Sem licitação"], ...S.lic.map(x => [x.id, (x.numero ? x.numero + " - " : "") + (x.objeto || x.orgao || "Licitação")])]},
  {k:"fornId", l:"Fornecedor", t:"sel", o:[["", "Sem fornecedor"], ...S.forn.map(f => [f.id, f.nome])]},
  {k:"transp", l:"Transportadora", w:"half"}, {k:"codigo", l:"Código de rastreio", w:"half"},
  {k:"nfForn", l:"Nota do fornecedor nº", w:"half"}, {k:"etapa", l:"Etapa atual", t:"sel", o:PED_ETAPAS.map((s, i) => [String(i), (i + 1) + ". " + s]), w:"half"},
  {k:"previsao", l:"Previsão de chegada", t:"date", w:"half"}, {k:"prazoLim", l:"Prazo limite da entrega no contrato", t:"date", w:"half"},
  {k:"destino", l:"Destino final (órgão, cidade e estado)"}, {k:"obs", l:"Observações", t:"area"}
];
function editPed(id, pre){
  const cur = id ? S.pedidos.find(x => x.id === id) : null;
  openForm({title: cur ? "Editar pedido" : "Novo pedido", fields: pedFields(), vals: cur || {etapa:0, ...pre},
    check: v => (!v.licId && !v.fornId && !v.destino) ? "Escolha a licitação, o fornecedor ou informe o destino." : "",
    save: v => { v.etapa = +v.etapa || 0; const l = S.lic.find(x => x.id === v.licId); if (l){ v.fornId = v.fornId || l.fornId || ""; v.destino = v.destino || l.orgao || ""; }
      const now = new Date().toISOString();
      if (cur){ if (v.etapa !== (+cur.etapa || 0)) (cur.hist = cur.hist || []).push({e:v.etapa, t:now}); Object.assign(cur, v); }
      else S.pedidos.unshift({id:uid(), ...v, hist:[{e:v.etapa, t:now}]}); },
    del: cur ? () => { S.pedidos = S.pedidos.filter(x => x.id !== id); } : null});
}
const hhist = t => new Date(t).toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
const pedRastreio = p => { const c = String(p.codigo || "").trim().toUpperCase(); if (!c) return ""; if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c)) return "https://rastreamento.correios.com.br/app/index.php"; const t = S.transp.find(x => norm(x.nome) === norm(p.transp) && /^https?:\/\//.test(x.site || "")); return t ? t.site : ""; };
function pedAvisos(p){
  const e = +p.etapa || 0, a = [];
  if (e < 4 && p.previsao){ const d = daysTo(p.previsao); a.push(d < 0 ? {c:"bd", t:"Atrasado " + (-d) + " dia" + (d === -1 ? "" : "s")} : d === 0 ? {c:"wn", t:"Chega hoje"} : {c:"", t:"Chega em " + d + " dia" + (d === 1 ? "" : "s")}); }
  if (e < 4 && p.prazoLim){ const d = daysTo(p.prazoLim); if (d < 0) a.push({c:"bd", t:"Passou do prazo do contrato"}); else if (d <= 3) a.push({c:"wn", t:"Prazo do contrato em " + d + " dia" + (d === 1 ? "" : "s")}); }
  if (p.previsao && p.prazoLim && p.previsao > p.prazoLim && e < 4) a.push({c:"bd", t:"A previsão passa do prazo do contrato"});
  if (e >= 4) a.push({c:"ok", t:e >= 6 ? "Concluído" : e === 5 ? "Falta receber o pagamento" : "Chegou. Peça o ateste do órgão"});
  return a;
}
function pedCard(p){
  const l = S.lic.find(x => x.id === p.licId), f = S.forn.find(x => x.id === p.fornId), e = +p.etapa || 0, tel = cnpjDig(f && f.tel), rl = pedRastreio(p);
  const last = i => { const h = (p.hist || []).filter(z => z.e === i).pop(); return h ? hhist(h.t) : ""; };
  return `<div class="card"><div class="item" data-a="editPed" data-id="${p.id}" tabindex="0" role="button">
    <div class="top"><b>${esc(l ? (l.numero ? l.numero + " - " : "") + (l.objeto || l.orgao) : "Pedido sem licitação")}</b><span class="tag ${e >= 4 ? "ok" : "wn"}">${esc(PED_ETAPAS[e])}</span></div>
    <div class="meta">${esc([f ? "de " + f.nome : "", p.destino ? "para " + p.destino : "", p.transp ? "via " + p.transp : "", p.nfForn ? "NF " + p.nfForn : ""].filter(Boolean).join(", "))}</div>
    <div class="pgb" role="progressbar" aria-valuemin="1" aria-valuemax="${PED_ETAPAS.length}" aria-valuenow="${e + 1}"><i style="width:${Math.round((e + 1) / PED_ETAPAS.length * 100)}%"></i></div>
    <div class="meta">Etapa ${e + 1} de ${PED_ETAPAS.length}${p.codigo ? ". Código " + esc(p.codigo) : ""}</div>
    <div>${pedAvisos(p).map(a => `<span class="tag ${a.c}" style="margin:2px 6px 2px 0">${esc(a.t)}</span>`).join("")}</div></div>
    <details class="tut" style="margin-top:8px"><summary>Ver histórico</summary><div class="tb"><ol class="tl">${PED_ETAPAS.map((s, i) => `<li class="${i < e ? "done" : i === e ? "cur" : ""}"><i></i><span>${esc(s)}<small>${last(i) || (i <= e ? "" : "Ainda não")}</small></span></li>`).join("")}</ol></div></details>
    <div class="links">${e < PED_ETAPAS.length - 1 ? `<button class="btn sm" data-a="pedNext" data-id="${p.id}">Avançar: ${esc(PED_ETAPAS[e + 1])}</button>` : ""}
      ${p.codigo ? `<button class="btn ghost sm" data-a="pedCopy" data-id="${p.id}">Copiar código</button>` : ""}${rl ? `<a class="btn ghost sm" href="${su(rl)}" target="_blank" rel="noopener">Rastrear no site</a>` : ""}
      ${tel ? `<a class="btn ghost sm" href="https://wa.me/55${tel}" target="_blank" rel="noopener">Falar com o fornecedor</a>` : ""}${e >= 4 ? `<button class="btn ghost sm" data-a="tab" data-t="nf">Nota fiscal</button>` : ""}</div></div>`;
}
function viewPedidos(m){
  const fl = ui.pf || "todos", all = S.pedidos, lista = all.filter(p => fl === "todos" || (fl === "andamento" ? (+p.etapa || 0) < 5 : (+p.etapa || 0) >= 5));
  const atr = all.filter(p => pedAvisos(p).some(a => a.c === "bd")).length, tr = all.filter(p => { const e = +p.etapa || 0; return e >= 2 && e < 4; }).length;
  m.innerHTML = `<div class="bar"><h1>Rastrear pedidos</h1><button class="btn" data-a="newPed">Novo</button></div>
  <p class="sub">Acompanhe cada pedido do fornecedor até o órgão. Você avança as etapas e o app avisa de atrasos e do prazo do contrato.</p>
  <div class="stats"><div class="card"><small>Em trânsito</small><b>${tr}</b></div><div class="card"><small>Com alerta de prazo</small><b class="${atr ? "bd" : "ok"}">${atr}</b></div></div>
  <div class="chips">${[["todos", "Todos"], ["andamento", "Em andamento"], ["entregues", "Entregues"]].map(([k, t]) => `<button class="chip${fl === k ? " on" : ""}" data-a="pedFl" data-v="${k}">${t}</button>`).join("")}</div>
  ${lista.length ? lista.map(pedCard).join("") : `<div class="card empty">${all.length ? "Nenhum pedido neste filtro." : "Nenhum pedido ainda. Quando fechar a compra com o fornecedor, toque em Novo para acompanhar até a entrega."}</div>`}
  <div class="note2">O acompanhamento é manual: você atualiza a etapa. Para ver o trânsito da carga em tempo real, use o código no site da transportadora (botão Rastrear no site). O rastreamento automático depende de contrato com a transportadora ou com um serviço de rastreio.</div>`;
}

/* ---------- avisos, lembretes de data e hora ---------- */
const LNP = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
const LEADS = [[2880, "2 dias"], [1440, "1 dia"], [180, "3 horas"], [60, "1 hora"], [30, "30 min"], [15, "15 min"], [5, "5 min"]];
const fmtLeft = min => min < 60 ? Math.max(1, min) + " min" : min < 1440 ? Math.round(min / 60) + " h" : Math.round(min / 1440) + " dia" + (Math.round(min / 1440) > 1 ? "s" : "");
const dtBRT = ts => { const s = new Date(ts - 3 * 3600e3).toISOString(); return {d:s.slice(0, 10), h:s.slice(11, 16)}; };
const pncpDT = s => { const t = String(s || ""); return {d:t.slice(0, 10), h:/T\d\d:\d\d/.test(t) ? t.slice(11, 16) : ""}; };
function EVT(x){
  const o = [], a = bsTs(x.data, x.hora || (x.data ? "08:00" : "")), p = bsTs(x.propData, x.propHora || (x.propData ? "08:00" : ""));
  if (!isNaN(a)) o.push({k:"ab", ts:a, t:"Abertura da sessão" + (x.hora ? "" : " (sem horário)")});
  if (!isNaN(p) && PRE.includes(x.status)) o.push({k:"pr", ts:p, t:"Prazo para enviar a proposta" + (x.propHora ? "" : " (sem horário)")});
  return o;
}
function notifica(titulo, corpo){
  toast(titulo + (corpo ? ". " + corpo : ""));
  try{ const LN = LNP(); if (LN){ LN.schedule({notifications:[{id:Math.floor(Date.now() % 2147483000) + 1, title:titulo, body:corpo || "", schedule:{at:new Date(Date.now() + 700)}}]}); return; } }catch(e){}
  try{ if ("Notification" in window && Notification.permission === "granted") new Notification(titulo, {body:corpo || ""}); }catch(e){}
}
const hid = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 2147483000 + 1; };
let schedT = null;
function schedSoon(){ clearTimeout(schedT); schedT = setTimeout(agendaNativa, 1200); }
async function agendaNativa(){
  const LN = LNP(); if (!LN) return;
  try{
    const pend = await LN.getPending(); if (pend && pend.notifications && pend.notifications.length) await LN.cancel({notifications:pend.notifications.map(p => ({id:p.id}))});
    const now = Date.now(), list = [];
    S.lic.forEach(x => { if (!ATIVAS.includes(x.status)) return; EVT(x).forEach(ev => (S.cfg.lembretes || []).forEach(l => { const at = ev.ts - l * 60000;
      if (at > now + 5000) list.push({id:hid(`${x.id}:${ev.k}:${ev.ts}:${l}`), title:"Lembrete: " + ev.t, body:(x.numero ? "Licitação " + x.numero + ". " : "") + (x.orgao || x.objeto || "") + ". Faltam " + fmtLeft(l) + ".", schedule:{at:new Date(at)}}); })); });
    if (list.length) await LN.schedule({notifications:list.slice(0, 60)});
  }catch(e){}
}
let remLast = 0;
function tickLembretes(){
  const now = Date.now(); if (now - remLast < 5000) return; remLast = now;
  const leads = (S.cfg.lembretes || []).slice().sort((a, b) => a - b); if (!leads.length) return;
  S.lic.forEach(x => { if (!ATIVAS.includes(x.status)) return; EVT(x).forEach(ev => {
    if (ev.ts <= now) return;
    const L = leads.find(l => now >= ev.ts - l * 60000); if (L == null) return;
    if (S.fired[`${x.id}:${ev.k}:${ev.ts}:${L}`]) return;
    leads.filter(l => l >= L).forEach(l => { S.fired[`${x.id}:${ev.k}:${ev.ts}:${l}`] = now; });
    const txt = (x.numero ? "Licitação " + x.numero + ". " : "") + (x.orgao || x.objeto || "") + ". Faltam " + fmtLeft(Math.round((ev.ts - now) / 60000)) + ".";
    ui.avisos.unshift({t:"Lembrete: " + ev.t, b:txt}); notifica("Lembrete: " + ev.t, txt); save(); if (ui.tab === "acomp") acDraw();
  }); });
}
const avisoStatus = () => { const a = []; if ("Notification" in window) a.push("Navegador: " + ({granted:"ligado", denied:"bloqueado", default:"ainda não ativado"})[Notification.permission]); if (LNP()) a.push("Aparelho: instalado, avisos agendados mesmo com o app fechado"); return a.join(". ") || "Este aparelho não permite avisos aqui. Os lembretes aparecem dentro do app."; };
function lembHTML(){
  const now = Date.now(), ev = [];
  S.lic.forEach(x => { if (!ATIVAS.includes(x.status)) return; EVT(x).forEach(e => { if (e.ts > now && e.ts - now < 14 * 864e5) ev.push({x, e}); }); });
  ev.sort((a, b) => a.e.ts - b.e.ts);
  return `<div class="card"><b>Lembretes de data e hora</b><p class="sub" style="margin:4px 0 8px">O app avisa quando faltar:</p>
    <div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${LEADS.map(([m, t]) => `<button class="chip${(S.cfg.lembretes || []).includes(m) ? " on" : ""}" data-a="leadTog" data-m="${m}" aria-pressed="${(S.cfg.lembretes || []).includes(m)}">${t}</button>`).join("")}</div>
    <div class="actions"><button class="btn ghost sm" data-a="avisosOn">Ativar avisos no aparelho</button></div><div class="hint" id="avSt">${esc(avisoStatus())}</div>
    <b style="display:block;margin-top:10px">Próximos prazos (14 dias)</b>
    ${ev.length ? ev.map(({x, e}) => { const t = dtBRT(e.ts); return `<div class="it" style="border-top:1px solid var(--line);padding:8px 0"><b>${fdate(t.d)} às ${t.h}</b><div class="d" style="font-size:14px">${esc(e.t)}: ${esc(x.numero || x.objeto || x.orgao || "")}</div></div>`; }).join("") : `<div class="sub" style="margin:6px 0 0">Nenhum prazo nos próximos 14 dias. Informe data e hora nas licitações.</div>`}</div>`;
}
const alertDesc = a => { const vmin = n(a.vmin), vmax = n(a.vmax), uf = UFS.find(u => u[0] === a.uf);
  const val = (vmin > 0 || vmax > 0) ? (vmin > 0 && vmax > 0 ? `de ${money(vmin)} a ${money(vmax)}` : vmin > 0 ? `a partir de ${money(vmin)}` : `até ${money(vmax)}`) : `perto de ${money(n(a.valor))}, faixa de ${a.faixa}%`;
  const nm = (a.nichos && a.nichos.length) ? "Produtos: " + a.nichos.join(", ") + (a.palavras ? ", " + a.palavras : "") : (a.palavras ? "Produtos: " + a.palavras : (a.nicho ? "Nicho " + a.nicho : (a.item || "Qualquer item")));
  const ufT = (a.ufs && a.ufs.length) ? a.ufs.join(", ") : (uf ? uf[1] : "Brasil inteiro"), md = (a.mods && a.mods.length) ? " Modalidades: " + a.mods.map(c => (MODS.find(x => x[0] === String(c)) || [0, c])[1]).join(", ") + "." : "";
  return `${nm}. Valor ${val}. ${ufT}.${md}`; };
let autoLast = 0;
async function rodaAlertas(){
  if (acBusy || !S.alertas.length) return; acBusy = true; ui.acErr = ""; autoLast = Date.now(); acDraw();
  const antes = S.alertas.reduce((s, a) => s + (a.novos || 0), 0);
  try{ for (const a of S.alertas) await alertScan(a); ui.acAt = Date.now(); }catch(e){ ui.acErr = netMsg(e); }
  acBusy = false; save(); acDraw();
  const depois = S.alertas.reduce((s, a) => s + (a.novos || 0), 0);
  if (depois > antes){ const k = depois - antes; ui.avisos.unshift({t:"Oportunidade compatível", b:k + " licitação" + (k > 1 ? "ões" : "") + " dentro dos seus alertas."}); notifica("Oportunidade compatível", k + " licitação" + (k > 1 ? "ões" : "") + " dentro dos seus alertas."); if (ui.tab !== "acomp") render(); }
}
function tickAvisos(){
  if (document.body.classList.contains("locked") || !S.cfg) return;
  tickLembretes();
  if (S.alertas.length && !acBusy && Date.now() - autoLast > 15 * 60000) rodaAlertas();
  if (S.prev.some(x => x.etapa === "previsao") && !monBusy && Date.now() - monLast > 30 * 60000) monitoraPrev();
}

/* ---------- regiões, estados e cidades ---------- */
const REG = {N:"Norte", NE:"Nordeste", SE:"Sudeste", S:"Sul", CO:"Centro-Oeste"};
const UFI = {AC:["N",12], AL:["NE",27], AP:["N",16], AM:["N",13], BA:["NE",29], CE:["NE",23], DF:["CO",53], ES:["SE",32], GO:["CO",52], MA:["NE",21], MT:["CO",51], MS:["CO",50], MG:["SE",31], PA:["N",15], PB:["NE",25], PR:["S",41], PE:["NE",26], PI:["NE",22], RJ:["SE",33], RN:["NE",24], RS:["S",43], RO:["N",11], RR:["N",14], SC:["S",42], SP:["SE",35], SE:["NE",28], TO:["N",17]};
const ufNome = s => (UFS.find(u => u[0] === s) || [s, s])[1];
const bt = v => bi(v).replace(/R\$\s*/, "").replace(/ /g, "\u00a0");
const bi = v => v == null || !isFinite(v) ? "-" : Math.abs(v) >= 1e9 ? "R$ " + (v / 1e9).toFixed(2).replace(".", ",") + " bi" : Math.abs(v) >= 1e6 ? "R$ " + (v / 1e6).toFixed(1).replace(".", ",") + " mi" : money(v);
const gk = (o, ...ns) => { if (!o) return ""; for (const k of ns) if (o[k] != null && o[k] !== "") return o[k]; const ks = Object.keys(o); for (const k of ns){ const t = k.replace(/_/g, "").toLowerCase(), f = ks.find(z => z.replace(/_/g, "").toLowerCase() === t); if (f && o[f] != null && o[f] !== "") return o[f]; } return ""; };
const d10 = s => String(s || "").slice(0, 10);
let IBGE_C = {};
async function ibgeCidades(uf){
  if (IBGE_C[uf]) return IBGE_C[uf];
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`); if (!r.ok) throw new Error("HTTP " + r.status);
  return IBGE_C[uf] = (await r.json()).map(x => ({id:x.id, nome:x.nome})).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
const PK = {orc:{uf:"", q:"", lista:[], erro:""}, obr:{uf:"", q:"", lista:[], erro:""}};
function pkHTML(ctx){
  const p = PK[ctx];
  return `<div class="fg"><div class="f half"><label for="pk_uf_${ctx}">Estado</label><select id="pk_uf_${ctx}" data-pk="${ctx}" data-pkk="uf"><option value="">Escolha</option>${UFS.map(([s, nm]) => `<option value="${s}"${p.uf === s ? " selected" : ""}>${nm}</option>`).join("")}</select></div>
    <div class="f half"><label for="pk_q_${ctx}">Buscar cidade</label><input id="pk_q_${ctx}" data-pk="${ctx}" data-pkk="q" autocomplete="off" placeholder="Digite o nome" value="${esc(p.q)}"></div></div><div id="pkl_${ctx}">${pkList(ctx)}</div>`;
}
function pkList(ctx){
  const p = PK[ctx]; if (p.erro) return `<div class="hint">${p.erro === "net" ? "Não foi possível consultar a lista de cidades agora." : esc(p.erro)}</div>`;
  if (!p.uf) return `<div class="hint">Escolha o estado.</div>`;
  const q = norm(p.q), l = p.lista.filter(c => !q || norm(c.nome).includes(q)).slice(0, 12);
  if (!p.lista.length) return `<div class="hint">Carregando cidades…</div>`;
  return `<div class="chips" style="flex-wrap:wrap;margin:6px 0 0;padding:0">${l.map(c => `<button class="chip" data-a="pkSel" data-ctx="${ctx}" data-id="${c.id}" data-n="${esc(c.nome)}">${esc(c.nome)}</button>`).join("") || '<span class="hint">Nenhuma cidade encontrada.</span>'}</div>${p.lista.length > 12 && !q ? '<div class="hint">Digite para filtrar. Mostrando as primeiras 12.</div>' : ""}`;
}
async function pkLoad(ctx){ const p = PK[ctx]; p.erro = ""; p.lista = []; const o = $("#pkl_" + ctx); if (o) o.innerHTML = pkList(ctx); if (!p.uf) return; try{ p.lista = await ibgeCidades(p.uf); }catch(e){ p.erro = netMsg(e); } const o2 = $("#pkl_" + ctx); if (o2) o2.innerHTML = pkList(ctx); }

/* ---------- orçamento, gastos e caixa (SICONFI, Tesouro Nacional) ---------- */
const SIC = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";
async function sicGet(path, params){
  let rows = [], off = 0;
  for (let i = 0; i < 6; i++){
    const u = new URL(SIC + path); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v)); if (off) u.searchParams.set("offset", off);
    const r = await fetch(u.toString(), {headers:{Accept:"application/json"}}); if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(), it = j.items || []; rows = rows.concat(it); if (!j.hasMore || !it.length) break; off += it.length;
  }
  return rows;
}
const rgfTries = (esf, bim) => { const q = {2:1, 3:1, 4:2, 6:3}[bim], s = {3:1, 4:1, 6:2}[bim], a = [];
  if (q) a.push({in_periodicidade:"Q", nr_periodo:q, co_tipo_demonstrativo:"RGF"});
  if (esf === "M" && s) a.push({in_periodicidade:"S", nr_periodo:s, co_tipo_demonstrativo:"RGF"}, {in_periodicidade:"S", nr_periodo:s, co_tipo_demonstrativo:"RGF Simplificado"});
  return a; };
const slim = rows => rows.map(r => ({c:String(r.conta || r.rotulo || ""), k:String(r.coluna || ""), v:+r.valor || 0}));
function pickRow(rows, contaRx, colRx){ const r = rows.filter(x => contaRx.test(norm(x.c)) && colRx.test(norm(x.k))); return r.length ? r[r.length - 1].v : null; }
function rreoTot(rows){
  const DS = /^total das despesas/, DS2 = /^despesas \(exceto intra/, RC = /^total das receitas/, RC2 = /^receitas \(exceto intra/;
  const g = (a, b, col) => { const v = pickRow(rows, a, col); return v != null ? v : pickRow(rows, b, col); };
  return {orc:g(DS, DS2, /dotacao atualizada/), emp:g(DS, DS2, /empenhadas?.*ate o bimestre/), liq:g(DS, DS2, /liquidadas?.*ate o bimestre/), pag:g(DS, DS2, /pagas?.*ate o bimestre/),
    recPrev:g(RC, RC2, /previsao atualizada/), recReal:g(RC, RC2, /receitas? realizadas?.*ate o bimestre/)};
}
function caixaTot(rows){
  const T = /^total/, b = pickRow(rows, T, /disponibilidade de caixa bruta/);
  const l = pickRow(rows, T, /disponibilidade de caixa liquida.*apos/) ?? pickRow(rows, T, /disponibilidade de caixa liquida/);
  return {caixaB:b, caixaL:l};
}
const ORC = {ano:0, per:"3", aba:"regiao", run:false, stop:false, prog:0, err:"", det:{}, sel:null, loading:false, cidErr:""};
(() => { const y = new Date().getFullYear(), m = new Date().getMonth() + 1; [ORC.ano, ORC.per] = m >= 10 ? [y, "4"] : m >= 8 ? [y, "3"] : m >= 6 ? [y, "2"] : [y - 1, "6"]; })();
const orcKey = () => ORC.ano + "-" + ORC.per;
async function orcEnte(esf, id){
  const bim = +ORC.per, base = {an_exercicio:ORC.ano, id_ente:id, co_esfera:esf};
  const rreo = await sicGet("/rreo", {...base, nr_periodo:bim, co_tipo_demonstrativo:"RREO", no_anexo:"RREO-Anexo 01"});
  let rgf = [];
  for (const t of rgfTries(esf, bim)){ try{ rgf = await sicGet("/rgf", {...base, ...t, co_poder:"E", no_anexo:"RGF-Anexo 05"}); }catch(e){ if (netMsg(e) === "net") throw e; rgf = []; } if (rgf.length) break; }
  const r = slim(rreo), g = slim(rgf);
  return {tot:{...rreoTot(r), ...caixaTot(g), n:r.length, ng:g.length}, rreo:r, rgf:g};
}
async function orcLoadUFs(){
  if (ORC.run) return; ORC.run = true; ORC.stop = false; ORC.err = ""; ORC.prog = 0; orcDraw();
  const key = orcKey(), st = S.orcTot[key] = S.orcTot[key] || {uf:{}, at:0}, ufs = Object.keys(UFI); let done = 0, falhas = 0;
  try{
    for (let i = 0; i < ufs.length && !ORC.stop; i += 3){
      await Promise.all(ufs.slice(i, i + 3).map(async uf => { try{ let d; try{ d = await orcEnte("E", UFI[uf][1]); }catch(e){ if (uf === "DF" && netMsg(e) !== "net") d = await orcEnte("D", UFI[uf][1]); else throw e; } st.uf[uf] = d.tot; ORC.det[key + "-" + uf] = d; }catch(e){ if (netMsg(e) === "net") throw e; falhas++; } done++; ORC.prog = Math.round(done / ufs.length * 100); }));
      orcDraw();
    }
    st.at = Date.now(); st.falhas = falhas; save();
  }catch(e){ ORC.err = netMsg(e); }
  ORC.run = false; orcDraw();
}
async function orcCidade(id, nome, uf){
  ORC.loading = true; ORC.cidErr = ""; ORC.sel = {tipo:"M", id, nome, uf}; orcDraw();
  try{ const d = await orcEnte("M", id); ORC.det[orcKey() + "-M" + id] = d; const st = S.orcTot[orcKey()] = S.orcTot[orcKey()] || {uf:{}, at:0}; (st.cid = st.cid || {})[id] = {...d.tot, nome, uf}; save(); }
  catch(e){ ORC.cidErr = netMsg(e) === "net" ? "net" : "O Tesouro respondeu com erro. Tente outro período."; }
  ORC.loading = false; orcDraw();
}
const COLD = [["Dotação atualizada", /dotacao atualizada/], ["Empenhado", /empenhadas?.*ate o bimestre/], ["Liquidado", /liquidadas?.*ate o bimestre/], ["Pago", /pagas?.*ate o bimestre/]];
const COLR = [["Previsão atualizada", /previsao atualizada/], ["Realizada", /receitas? realizadas?.*ate o bimestre/]];
function pivotHTML(rows, cols, filtroConta, max = 80){
  const ordem = [], m = {};
  rows.forEach(r => { if (filtroConta && !filtroConta.test(norm(r.c))) return; const ci = cols.findIndex(c => c[1].test(norm(r.k))); if (ci < 0) return; if (!m[r.c]){ m[r.c] = []; ordem.push(r.c); } m[r.c][ci] = r.v; });
  if (!ordem.length) return `<div class="hint">Sem linhas detalhadas para este período.</div>`;
  return `<div class="tw"><table class="tbl"><thead><tr><th>Conta</th>${cols.map(c => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${ordem.slice(0, max).map(c => `<tr><td>${esc(c.slice(0, 70))}</td>${cols.map((_, i) => `<td>${m[c][i] == null ? "-" : bt(m[c][i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${ordem.length > max ? `<div class="hint">Mostrando as primeiras ${max} linhas de ${ordem.length}.</div>` : ""}`;
}
function caixaPivot(rows){
  const cols = [], ordem = [], m = {};
  rows.forEach(r => { let ci = cols.indexOf(r.k); if (ci < 0){ cols.push(r.k); ci = cols.length - 1; } if (!m[r.c]){ m[r.c] = []; ordem.push(r.c); } m[r.c][ci] = r.v; });
  if (!ordem.length) return `<div class="hint">O ente não tem demonstrativo de caixa publicado para este período.</div>`;
  return `<div class="tw"><table class="tbl"><thead><tr><th>Conta</th>${cols.map(c => `<th>${esc(c.replace(/\s*\(.*$/, "").slice(0, 38))}</th>`).join("")}</tr></thead><tbody>${ordem.slice(0, 40).map(c => `<tr><td>${esc(c.slice(0, 60))}</td>${cols.map((_, i) => `<td>${m[c][i] == null ? "-" : bt(m[c][i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function orcDetalhe(d, titulo){
  const t = d.tot, p = t.orc > 0 && t.emp != null ? t.emp / t.orc : null;
  return `<div class="card"><b style="font-size:18px">${esc(titulo)}</b>
    <div class="kpis" style="margin:8px 0"><div class="kpi"><small>Orçamento (dotação atual)</small><b>${bi(t.orc)}</b></div><div class="kpi"><small>Empenhado</small><b>${bi(t.emp)}</b></div>
      <div class="kpi"><small>Liquidado</small><b>${bi(t.liq)}</b></div><div class="kpi"><small>Pago</small><b>${bi(t.pag)}</b></div>
      <div class="kpi"><small>Caixa bruta</small><b>${bi(t.caixaB)}</b></div><div class="kpi"><small>Caixa líquida</small><b>${bi(t.caixaL)}</b></div></div>
    ${p != null ? `<div class="pgb" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}"><i style="width:${clampN(p * 100, 0, 100)}%"></i></div><div class="sub" style="margin:0 0 6px">Já foi empenhado ${pct(p)} do orçamento.${t.orc - t.emp > 0 ? " Ainda dá para gastar " + bi(t.orc - t.emp) + "." : ""}</div>` : '<div class="hint">Não consegui identificar os totais de despesa. Veja a tabela detalhada.</div>'}
    <details class="tut" open><summary>Despesas: orçamento e gasto por conta</summary><div class="tb">${pivotHTML(d.rreo, COLD, /despesa|saude|educacao|pessoal|encargos|investimentos|juros|amortizacao|reserva|total|custeio|obrigac|inativos|outras/, 120)}</div></details>
    <details class="tut"><summary>Receitas: previsto e realizado</summary><div class="tb">${pivotHTML(d.rreo, COLR, /receita|tribut|contribu|patrimonial|agropecuaria|industrial|servicos|transferencias|total|imposto|taxa|operacoes|alienacao/, 120)}</div></details>
    <details class="tut"><summary>O que tem em caixa (demonstrativo de disponibilidade)</summary><div class="tb">${caixaPivot(d.rgf)}</div></details></div>`;
}
const PERS = [["2", "Até abril"], ["3", "Até junho"], ["4", "Até agosto"], ["6", "Até dezembro"]];
function orcRegHTML(){
  const key = orcKey(), st = S.orcTot[key], ufs = st ? st.uf : {};
  let h = "", tot = {orc:0, emp:0, caixaB:0, n:0}, algum = false;
  Object.keys(REG).forEach(r => {
    const l = Object.keys(UFI).filter(u => UFI[u][0] === r).sort(), s = {orc:0, emp:0, liq:0, pag:0, caixaB:0};
    const rows = l.map(u => { const t = ufs[u]; if (t){ algum = true; s.orc += t.orc || 0; s.emp += t.emp || 0; s.liq += t.liq || 0; s.pag += t.pag || 0; s.caixaB += t.caixaB || 0; }
      return `<tr data-a="orcUF" data-uf="${u}" tabindex="0" role="button"><td><b>${u}</b></td><td>${t ? bt(t.orc) : "-"}</td><td>${t ? bt(t.emp) : "-"}</td><td>${t && t.orc > 0 && t.emp != null ? pct(t.emp / t.orc) : "-"}</td><td>${t ? bt(t.caixaB) : "-"}</td></tr>`; }).join("");
    tot.orc += s.orc; tot.emp += s.emp; tot.caixaB += s.caixaB;
    h += `<div class="card"><b style="font-size:17px">${REG[r]}</b><div class="tw"><table class="tbl fr"><thead><tr><th>UF</th><th>Orçamento</th><th>Empenhado</th><th>% gasto</th><th>Caixa bruta</th></tr></thead><tbody>${rows}
      <tr class="hit"><td><b>Total</b></td><td><b>${bt(s.orc)}</b></td><td><b>${bt(s.emp)}</b></td><td><b>${s.orc > 0 ? pct(s.emp / s.orc) : "-"}</b></td><td><b>${bt(s.caixaB)}</b></td></tr></tbody></table></div></div>`; });
  const topo = `<div class="card"><b>Brasil (soma dos estados e do DF)</b><div class="kpis" style="margin:8px 0 0"><div class="kpi"><small>Orçamento</small><b>${bi(tot.orc)}</b></div><div class="kpi"><small>Empenhado</small><b>${bi(tot.emp)}</b></div><div class="kpi"><small>Ainda para gastar</small><b>${bi(Math.max(0, tot.orc - tot.emp))}</b></div><div class="kpi"><small>Caixa bruta</small><b>${bi(tot.caixaB)}</b></div></div>
    <div class="hint" style="margin-top:6px">${st && st.at ? "Atualizado em " + new Date(st.at).toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}) + (st.falhas ? ". " + st.falhas + " estado(s) sem dados." : ".") : "Ainda não carregado."} Não inclui municípios nem a União.</div></div>`;
  return (algum ? topo : "") + h;
}
function orcCidHTML(){
  const key = orcKey(), st = S.orcTot[key] || {}, mine = S.cidades;
  let h = `<div class="card"><b>Consultar uma cidade</b><p class="sub" style="margin:2px 0 8px">Escolha o estado e a cidade. O app busca o orçamento, o gasto e o caixa que ela declarou ao Tesouro.</p>${pkHTML("orc")}</div>`;
  if (ORC.loading) h += `<div class="card"><div class="sub" style="margin:0">Consultando o Tesouro…</div><div class="prg"><i style="width:60%"></i></div></div>`;
  else if (ORC.cidErr === "net") h += `<div class="card"><b>Não foi possível consultar o Tesouro</b><p class="sub" style="margin:6px 0 0">O navegador ou o link em que você abriu o app bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`;
  else if (ORC.cidErr) h += `<div class="note2">${esc(ORC.cidErr)}</div>`;
  else if (ORC.sel && ORC.sel.tipo === "M"){ const d = ORC.det[key + "-M" + ORC.sel.id];
    if (d){ h += d.tot.n ? orcDetalhe(d, ORC.sel.nome + "/" + ORC.sel.uf) : `<div class="card"><b>${esc(ORC.sel.nome)}/${esc(ORC.sel.uf)}</b><p class="sub" style="margin:6px 0 0">Esta cidade não tem demonstrativo publicado para este período. Tente outro período.</p></div>`;
      h += `<div class="actions" style="margin-top:0"><button class="btn ghost sm" data-a="orcSalvaCid">Salvar em Minhas cidades</button></div>`; } }
  if (mine.length){
    h += `<h2 class="gh">Minhas cidades</h2><div class="card"><div class="tw"><table class="tbl fr"><thead><tr><th>Cidade</th><th>Orçamento</th><th>Empenhado</th><th>% gasto</th><th>Caixa bruta</th></tr></thead><tbody>${mine.map(c => { const t = (st.cid || {})[c.id];
      return `<tr data-a="orcVer" data-id="${c.id}" data-n="${esc(c.nome)}" data-uf="${esc(c.uf)}" tabindex="0" role="button"><td><b>${esc(c.nome)}</b><small>${esc(c.uf)}</small></td><td>${t ? bt(t.orc) : "-"}</td><td>${t ? bt(t.emp) : "-"}</td><td>${t && t.orc > 0 && t.emp != null ? pct(t.emp / t.orc) : "-"}</td><td>${t ? bt(t.caixaB) : "-"}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="actions"><button class="btn ghost sm" data-a="orcAtualiza">Atualizar minhas cidades</button></div></div>`;
  }
  return h;
}
function orcHTML(){
  let h = "";
  if (ORC.aba === "regiao"){
    if (ORC.err === "net") h += `<div class="card"><b>Não foi possível consultar o Tesouro</b><p class="sub" style="margin:6px 0 0">O navegador ou o link em que você abriu o app bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`;
    h += `<div class="actions" style="margin-top:0">${ORC.run ? '<button class="btn ghost" data-a="orcStop">Parar</button>' : '<button class="btn" data-a="orcGo">Carregar os estados</button>'}</div>`;
    if (ORC.run) h += `<div class="prg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ORC.prog}"><i style="width:${ORC.prog}%"></i></div><div class="hint">Consultando os 27 estados… ${ORC.prog}%</div>`;
    if (ORC.sel && ORC.sel.tipo === "E"){ const d = ORC.det[orcKey() + "-" + ORC.sel.uf]; if (d) h += orcDetalhe(d, ufNome(ORC.sel.uf) + " (governo estadual)") + `<div class="actions" style="margin-top:0"><button class="btn ghost sm" data-a="orcFecha">Fechar detalhes</button></div>`; }
    h += orcRegHTML();
  } else h += orcCidHTML();
  return h;
}
function orcDraw(){ const o = $("#orcOut"); if (o) o.innerHTML = orcHTML(); }
function viewOrc(m){
  m.innerHTML = `<h1>Orçamento, gastos e caixa</h1>
  <p class="sub">Quanto cada região, estado e cidade tem para gastar, quanto já gastou e o que tem em caixa. Dados que os próprios governos declaram ao Tesouro Nacional (SICONFI).</p>
  <div class="card"><div class="fg"><div class="f half"><label for="orc_ano">Ano</label><select id="orc_ano" data-orc="ano">${[0, 1, 2, 3].map(i => { const a = new Date().getFullYear() - i; return `<option value="${a}"${ORC.ano === a ? " selected" : ""}>${a}</option>`; }).join("")}</select></div>
    <div class="f half"><label for="orc_per">Período</label><select id="orc_per" data-orc="per">${PERS.map(([k, t]) => `<option value="${k}"${ORC.per === k ? " selected" : ""}>${t}</option>`).join("")}</select></div></div></div>
  <div class="chips"><button class="chip${ORC.aba === "regiao" ? " on" : ""}" data-a="orcAba" data-v="regiao">Regiões e estados</button><button class="chip${ORC.aba === "cidade" ? " on" : ""}" data-a="orcAba" data-v="cidade">Cidades</button></div>
  <div class="hint" style="margin:0 0 8px">Nas tabelas, os valores são em reais: bi = bilhões e mi = milhões.</div>
  <div id="orcOut">${orcHTML()}</div>
  <div class="note2"><b>Como ler:</b> o <b>orçamento</b> é a dotação atualizada, o que o governo pode gastar no ano. <b>Empenhado</b> é o que já foi reservado, <b>liquidado</b> o que já foi entregue e conferido, e <b>pago</b> o que já saiu do caixa. A <b>caixa bruta</b> e a <b>líquida</b> vêm do demonstrativo de disponibilidade de caixa do relatório de gestão fiscal. Alguns governos entregam os relatórios com atraso ou não entregam, e municípios pequenos informam por semestre. Os rótulos das contas podem variar entre governos. A soma por região usa só os governos estaduais e o DF.</div>`;
  if (PK.orc.uf && !PK.orc.lista.length) pkLoad("orc");
}

/* ---------- obras públicas (Obrasgov.br) ---------- */
const OBR = "https://api-publica.obrasgov.gestao.gov.br/obras";
const OBS_SIT = ["Em execução", "Paralisada", "Inacabada", "Concluída", "Cadastrada", "Cancelada"];
function obrUnwrap(j){
  let arr = Array.isArray(j) ? j : null;
  if (!arr && j && typeof j === "object"){ for (const k of ["data", "content", "items", "resultado", "results", "registros", "projetos"]) if (Array.isArray(j[k])){ arr = j[k]; break; } if (!arr){ const k = Object.keys(j).find(z => Array.isArray(j[z])); if (k) arr = j[k]; } }
  const num = ks => j && typeof j === "object" ? ks.map(k => j[k]).find(v => typeof v === "number") : undefined;
  return {rows:arr || [], total:num(["totalElements", "total", "totalRegistros", "total_registros", "count", "totalItems"]), pages:num(["totalPages", "totalPaginas", "total_paginas", "pages"])};
}
async function obrGet(res, params){
  const u = new URL(OBR + "/" + res); Object.entries(params).forEach(([k, v]) => { if (v !== "" && v != null) u.searchParams.set(k, v); });
  const r = await fetch(u.toString(), {headers:{Accept:"application/json"}}); OB.dbg = {url:u.toString(), status:r.status};
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json(), o = obrUnwrap(j); OB.dbg.keys = Array.isArray(j) ? ["(lista)"] : Object.keys(j || {}); OB.dbg.n = o.rows.length; OB.dbg.sample = o.rows[0] ? Object.keys(o.rows[0]) : []; OB.dbg.total = o.total; return o;
}
const pgP = (pg, size) => ({pagina:pg, page:pg, tamanhoDaPagina:size, tamanho_da_pagina:size, size});
const OB = {aba:"lista", uf:"", sit:"Em execução", atras:false, rows:[], seen:new Set(), pg:0, fim:false, run:false, erro:"", total:undefined, det:{}, abre:null, pan:{run:false, stop:false, dados:{}, prog:0, erro:""}, cid:null, cidRows:[], cidRun:false, dbg:null};
const hojeISO = () => new Date().toISOString().slice(0, 10);
function vm(o){
  const ex = gk(o, "executores");
  return {id:String(gk(o, "id_projeto_investimento", "id_unico", "idUnico", "id")), nome:String(gk(o, "desc_nome", "nome", "nome_projeto")), sit:String(gk(o, "situacao")), uf:String(gk(o, "uf_principal", "uf")),
    ini:d10(gk(o, "dt_inicial_prevista", "data_inicial_prevista")), fim:d10(gk(o, "dt_final_prevista", "data_final_prevista")), iniE:d10(gk(o, "dt_inicial_efetiva", "data_inicial_efetiva")), fimE:d10(gk(o, "dt_final_efetiva", "data_final_efetiva")),
    orgao:String(gk(o, "organizacao_resp", "orgao_responsavel")), exec:Array.isArray(ex) ? ex.map(e => e && (e.nome || e.razao_social || e.razaoSocial) || "").filter(Boolean) : []};
}
const obAtrasada = v => norm(v.sit) === "em execucao" && v.fim && !v.fimE && v.fim < hojeISO();
const diasAtraso = v => Math.max(0, Math.round((new Date(hojeISO()) - new Date(v.fim)) / 864e5));
async function obLista(mais){
  if (OB.run) return; if (!mais){ Object.assign(OB, {rows:[], seen:new Set(), pg:0, fim:false, erro:"", total:undefined}); } OB.run = true; obDraw();
  try{
    for (let i = 0; i < (OB.atras ? 4 : 1) && !OB.fim; i++){
      OB.pg++; const o = await obrGet("projeto-investimento", {uf_principal:OB.uf, situacao:OB.sit, ...pgP(OB.pg, 200)}); if (o.total != null) OB.total = o.total;
      let novos = 0; o.rows.forEach(r => { const v = vm(r); const k = v.id || JSON.stringify(r).slice(0, 80); if (OB.seen.has(k)) return; OB.seen.add(k); OB.rows.push(v); novos++; });
      if (!o.rows.length || !novos || o.rows.length < 200) OB.fim = true;
    }
  }catch(e){ OB.erro = netMsg(e); }
  OB.run = false; obDraw();
}
async function obDetalhe(id){
  OB.det[id] = {loading:true}; obDraw();
  try{
    const q = {id_projeto_investimento:id, ...pgP(1, 100)};
    const [c, e, x] = await Promise.all([obrGet("contrato", q), obrGet("empenho", q), obrGet("execucao-fisica", q)]);
    const sm = (a, ...ks) => a.reduce((s, r) => s + (+gk(r, ...ks) || 0), 0);
    const pf = x.rows.slice().sort((a, b) => String(gk(b, "dt_atualizacao_execucao")).localeCompare(String(gk(a, "dt_atualizacao_execucao"))))[0];
    OB.det[id] = {contratos:c.rows.map(r => ({forn:String(gk(r, "fornecedor_contrato")), cnpj:String(gk(r, "cnpj_fornecedor_contrato")), valor:+gk(r, "valor_global_contrato") || 0, acum:+gk(r, "valor_acumulado_contrato") || 0, ini:d10(gk(r, "vigencia_inicio_contrato")), fim:d10(gk(r, "vigencia_fim_contrato")), sit:String(gk(r, "situacao_contrato"))})),
      contratado:sm(c.rows, "valor_global_contrato"), empenhado:sm(e.rows, "valor_empenho"), liquidado:sm(e.rows, "liquidado"), pago:sm(e.rows, "pago"), fisico:pf ? (+gk(pf, "percentual_execucao_fisica") || 0) : null};
  }catch(err){ OB.det[id] = {erro:netMsg(err)}; }
  obDraw();
}
function obCard(v){
  const at = obAtrasada(v), d = OB.det[v.id], aberto = OB.abre === v.id;
  const tag = at ? `<span class="tag bd">Atrasada ${diasAtraso(v)} dias</span>` : `<span class="tag ${norm(v.sit) === "concluida" ? "ok" : /paralisada|inacabada|cancelada/.test(norm(v.sit)) ? "bd" : "wn"}">${esc(v.sit || "Sem situação")}</span>`;
  return `<div class="card"><div class="item" data-a="obAbre" data-id="${esc(v.id)}" tabindex="0" role="button"><div class="top"><b>${esc(v.nome || "Obra sem nome")}</b>${tag}</div>
    <div class="meta">${esc([v.uf, v.orgao].filter(Boolean).join(". "))}</div>
    <div class="meta">Início previsto ${v.ini ? fdate(v.ini) : "-"}${v.iniE ? ", iniciada em " + fdate(v.iniE) : ""}. Término previsto ${v.fim ? fdate(v.fim) : "-"}${v.fimE ? ", concluída em " + fdate(v.fimE) : ""}.</div>
    <div class="meta">Empresa: ${v.exec.length ? esc(v.exec.slice(0, 2).join(", ")) : "veja o contrato"}</div></div>
    ${aberto ? (!d || d.loading ? '<div class="hint">Buscando contrato e gastos…</div>' : d.erro === "net" ? '<div class="hint">Não foi possível consultar agora.</div>' : d.erro ? `<div class="hint">${esc(d.erro)}</div>` : `<div class="kpis" style="margin:8px 0"><div class="kpi"><small>Valor contratado</small><b>${bi(d.contratado)}</b></div><div class="kpi"><small>Empenhado</small><b>${bi(d.empenhado)}</b></div><div class="kpi"><small>Liquidado</small><b>${bi(d.liquidado)}</b></div><div class="kpi"><small>Pago (gasto)</small><b>${bi(d.pago)}</b></div></div>
      ${d.fisico != null ? `<div class="pgb"><i style="width:${clampN(d.fisico, 0, 100)}%"></i></div><div class="sub" style="margin:0 0 6px">Execução física: ${String(d.fisico).replace(".", ",")}%</div>` : '<div class="hint">Sem execução física informada.</div>'}
      ${d.contratos.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Empresa contratada</th><th>Valor</th><th>Vigência</th></tr></thead><tbody>${d.contratos.map(c => `<tr><td><b>${esc(c.forn || "-")}</b><small>${esc(c.cnpj)}</small></td><td>${bt(c.valor)}</td><td>${c.ini ? fdate(c.ini) : "-"} a ${c.fim ? fdate(c.fim) : "-"}</td></tr>`).join("")}</tbody></table></div>` : '<div class="hint">Nenhum contrato vinculado.</div>'}`) : ""}</div>`;
}
const obFiltradas = () => OB.rows.filter(v => !OB.atras || obAtrasada(v));
function obListaHTML(){
  let h = "";
  if (OB.erro === "net") return `<div class="card"><b>Não foi possível consultar o Obrasgov</b><p class="sub" style="margin:6px 0 0">O navegador ou o link em que você abriu o app bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`;
  if (OB.erro) h += `<div class="note2">${esc(OB.erro)} Tente de novo em alguns minutos.</div>`;
  const l = obFiltradas(), at = OB.rows.filter(obAtrasada).length;
  h += `<div class="stats"><div class="card"><small>Obras carregadas</small><b>${OB.rows.length}${OB.total != null ? " de " + OB.total : ""}</b></div><div class="card"><small>Atrasadas</small><b class="${at ? "bd" : "ok"}">${at}</b></div></div>`;
  h += l.length ? l.slice(0, 80).map(obCard).join("") : (OB.run ? '<div class="card empty">Buscando…</div>' : '<div class="card empty">Nenhuma obra encontrada com esse filtro. Escolha um estado e toque em Buscar obras.</div>');
  if (l.length > 80) h += `<div class="hint">Mostrando 80 de ${l.length}. Refine o filtro.</div>`;
  if (!OB.run && !OB.fim && OB.rows.length) h += `<div class="actions"><button class="btn ghost sm" data-a="obMais">Carregar mais</button></div>`;
  return h;
}
async function obPainel(){
  const P = OB.pan; if (P.run) return; P.run = true; P.stop = false; P.erro = ""; P.prog = 0; obDraw();
  const ufs = Object.keys(UFI), sits = ["Em execução", "Paralisada", "Inacabada"]; let feitos = 0; const tarefas = [];
  ufs.forEach(u => sits.forEach(s => tarefas.push([u, s])));
  try{
    for (let i = 0; i < tarefas.length && !P.stop; i += 3){
      await Promise.all(tarefas.slice(i, i + 3).map(async ([u, s]) => { const o = await obrGet("projeto-investimento", {uf_principal:u, situacao:s, ...pgP(1, 200)}); const d = P.dados[u] = P.dados[u] || {};
        const vs = o.rows.map(vm); d[s] = {n:o.total != null ? o.total : vs.length, exato:o.total != null, amostra:vs.length, atras:s === "Em execução" ? vs.filter(obAtrasada).length : 0}; feitos++; P.prog = Math.round(feitos / tarefas.length * 100); }));
      obDraw();
    }
  }catch(e){ P.erro = netMsg(e); }
  P.run = false; obDraw();
}
function obPainelHTML(){
  const P = OB.pan; let h = "";
  if (P.erro === "net") h += `<div class="card"><b>Não foi possível consultar o Obrasgov</b><p class="sub" style="margin:6px 0 0">O navegador ou o link bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`;
  else if (P.erro) h += `<div class="note2">${esc(P.erro)}</div>`;
  h += `<div class="actions" style="margin-top:0">${P.run ? '<button class="btn ghost" data-a="obPStop">Parar</button>' : '<button class="btn" data-a="obPGo">Montar o painel</button>'}</div>`;
  if (P.run) h += `<div class="prg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${P.prog}"><i style="width:${P.prog}%"></i></div><div class="hint">Consultando… ${P.prog}%</div>`;
  const tem = Object.keys(P.dados).length; if (!tem) return h;
  const T = {ex:0, at:0, pa:0, ina:0}, bloc = Object.keys(REG).map(r => { const s = {ex:0, at:0, pa:0, ina:0};
    const rows = Object.keys(UFI).filter(u => UFI[u][0] === r).sort().map(u => { const d = P.dados[u] || {}, ex = (d["Em execução"] || {}).n || 0, at = (d["Em execução"] || {}).atras || 0, pa = (d["Paralisada"] || {}).n || 0, ina = (d["Inacabada"] || {}).n || 0;
      s.ex += ex; s.at += at; s.pa += pa; s.ina += ina; return `<tr><td><b>${u}</b></td><td>${ex}</td><td class="${at ? "bd" : ""}">${at}</td><td>${pa}</td><td>${ina}</td></tr>`; }).join("");
    T.ex += s.ex; T.at += s.at; T.pa += s.pa; T.ina += s.ina;
    return `<div class="card"><b style="font-size:17px">${REG[r]}</b><div class="tw"><table class="tbl fr"><thead><tr><th>UF</th><th>Em execução</th><th>Atrasadas*</th><th>Paralisadas</th><th>Inacabadas</th></tr></thead><tbody>${rows}<tr class="hit"><td><b>Total</b></td><td><b>${s.ex}</b></td><td><b>${s.at}</b></td><td><b>${s.pa}</b></td><td><b>${s.ina}</b></td></tr></tbody></table></div></div>`; }).join("");
  const exato = Object.values(P.dados).some(d => Object.values(d).some(x => x.exato));
  return h + `<div class="card"><b>Brasil</b><div class="kpis" style="margin:8px 0 0"><div class="kpi"><small>Em execução</small><b>${T.ex}</b></div><div class="kpi"><small>Atrasadas*</small><b class="${T.at ? "bd" : "ok"}">${T.at}</b></div><div class="kpi"><small>Paralisadas</small><b>${T.pa}</b></div><div class="kpi"><small>Inacabadas</small><b>${T.ina}</b></div></div></div>${bloc}
    <div class="hint">*Atrasada: está em execução, o término previsto já passou e não há data de conclusão. ${exato ? "Os totais por situação vêm da própria API." : "Sem total na resposta da API, as contagens são da amostra de até 200 obras por estado e situação."} As atrasadas são contadas nas primeiras 200 obras em execução de cada estado.</div>`;
}
async function obCidade(id, nome, uf){
  OB.cid = {id, nome, uf}; OB.cidRows = []; OB.cidRun = true; OB.erro = ""; obDraw();
  try{
    const g = await obrGet("geometria", {cod_ibge:id, ...pgP(1, 200)}), ids = [...new Set(g.rows.map(r => String(gk(r, "id_projeto_investimento"))).filter(Boolean))].slice(0, 30);
    for (let i = 0; i < ids.length; i += 4){ await Promise.all(ids.slice(i, i + 4).map(async pid => { try{ const o = await obrGet("projeto-investimento", {id_projeto_investimento:pid, ...pgP(1, 1)}); if (o.rows[0]) OB.cidRows.push(vm(o.rows[0])); }catch(e){ if (netMsg(e) === "net") throw e; } })); obDraw(); }
    OB.cid.total = new Set(g.rows.map(r => String(gk(r, "id_projeto_investimento")))).size;
  }catch(e){ OB.erro = netMsg(e); }
  OB.cidRun = false; obDraw();
}
function obCidHTML(){
  let h = `<div class="card"><b>Obras de uma cidade</b><p class="sub" style="margin:2px 0 8px">Escolha o estado e a cidade para ver as obras federais cadastradas nela.</p>${pkHTML("obr")}</div>`;
  if (OB.erro === "net") return h + `<div class="card"><b>Não foi possível consultar o Obrasgov</b><p class="sub" style="margin:6px 0 0">O navegador ou o link bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`;
  if (OB.erro) h += `<div class="note2">${esc(OB.erro)}</div>`;
  if (OB.cid){ const l = OB.cidRows.slice().sort((a, b) => (obAtrasada(b) ? 1 : 0) - (obAtrasada(a) ? 1 : 0)), at = l.filter(obAtrasada).length;
    h += `<div class="stats"><div class="card"><small>${esc(OB.cid.nome)}/${esc(OB.cid.uf)}</small><b>${OB.cid.total != null ? OB.cid.total + " obras" : "Buscando…"}</b></div><div class="card"><small>Atrasadas</small><b class="${at ? "bd" : "ok"}">${at}</b></div></div>`;
    h += OB.cidRun ? '<div class="prg"><i style="width:50%"></i></div><div class="hint">Buscando as obras…</div>' : "";
    h += l.map(obCard).join("") || (OB.cidRun ? "" : '<div class="card empty">Nenhuma obra encontrada para esta cidade.</div>');
    if (OB.cid.total > 30) h += `<div class="hint">Mostrando as primeiras 30 obras.</div>`; }
  return h;
}
function obDiagHTML(){
  const d = OB.dbg; if (!d) return `<div class="hint">Nenhuma consulta feita ainda.</div>`;
  return `<div class="card"><b>Diagnóstico da última consulta</b><div class="meta" style="overflow-wrap:anywhere">${esc(d.url)}<br>Resposta ${esc(d.status)}. Campos do topo: ${esc((d.keys || []).join(", "))}. Registros: ${d.n ?? "-"}. Total informado: ${d.total ?? "não informado"}.<br>Campos do 1º registro: ${esc((d.sample || []).join(", ") || "-")}</div></div>`;
}
function obHTML(){
  if (OB.aba === "painel") return obPainelHTML();
  if (OB.aba === "cidade") return obCidHTML();
  if (OB.aba === "diag") return obDiagHTML();
  return obListaHTML();
}
function obDraw(){ const o = $("#obOut"); if (o) o.innerHTML = obHTML(); }
function viewObras(m){
  m.innerHTML = `<h1>Obras públicas</h1>
  <p class="sub">Obras federais do Obrasgov.br: orçamento, início e término, gasto, empresa e quais estão atrasadas, paradas ou inacabadas.</p>
  <div class="chips">${[["lista", "Obras"], ["painel", "Painel"], ["cidade", "Cidade"], ["diag", "Diagnóstico"]].map(([k, t]) => `<button class="chip${OB.aba === k ? " on" : ""}" data-a="obAba" data-v="${k}">${t}</button>`).join("")}</div>
  ${OB.aba === "lista" ? `<div class="card"><div class="fg"><div class="f half"><label for="ob_uf">Estado</label><select id="ob_uf" data-ob="uf"><option value="">Escolha</option>${UFS.map(([s, nm]) => `<option value="${s}"${OB.uf === s ? " selected" : ""}>${nm}</option>`).join("")}</select></div>
    <div class="f half"><label for="ob_sit">Situação</label><select id="ob_sit" data-ob="sit">${OBS_SIT.map(s => `<option${OB.sit === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="ob_at" data-ob="atras"${OB.atras ? " checked" : ""} style="width:auto;min-height:0"> Só as atrasadas (em execução com término previsto vencido)</label></div>
    <div class="actions"><button class="btn" data-a="obGo">Buscar obras</button></div></div>` : ""}
  <div id="obOut">${obHTML()}</div>
  <div class="note2"><b>Como ler:</b> o <b>valor contratado</b> é a soma dos contratos da obra. <b>Empenhado, liquidado e pago</b> vêm dos empenhos ligados à obra, e o pago é o que já saiu do caixa. A empresa é a contratada no contrato. Só aparecem obras cadastradas no Obrasgov.br (obras com dinheiro federal), não todas as obras do país. Se algum dado vier em branco, use a aba Diagnóstico e me envie o texto.</div>`;
  if (PK.obr.uf && !PK.obr.lista.length) pkLoad("obr");
}

/* ---------- Hub B2G: radar de preços, previsão de compra e funil ---------- */
const QUN = "caixas?|resmas?|pacotes?|unidades?|unid\\.?|und\\.?|un|kg|quilos?|litros?|lts?|gal[oõ]es|metros?|frascos?|rolos?|fardos?|kits?|pares?|pe[cç]as?|sacos?|latas?|bombonas?|cartuchos?|toners?";
function qtdTexto(t){
  const s = String(t || "").toLowerCase().replace(/\s+/g, " "), re = new RegExp("(?:^|[^\\d.,])(\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d+)?\\s*(" + QUN + ")(?![a-zà-ú])", "g"), m = []; let x;
  while ((x = re.exec(s))){ const q = +x[1].replace(/\./g, ""); if (q >= 2 && q <= 1e7) m.push({q, un:x[2]}); }
  return [...new Set(m.map(z => z.q))].length === 1 ? m[0] : null;
}
const kwOk = (txt, ws) => ws.every(w => txt.includes(w));
const qnt = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const dBR = s => s ? fdate(String(s).slice(0, 10)) : "-";
const RD = {run:false, stop:false, q:{produto:"", uf:"", dias:"90", custo:"", extra:""}, rows:[], seen:new Set(), lidos:0, total:0, pg:1, maxPg:40, fim:false, erro:"", words:[], ts:0, dos:{}, abre:null, feito:false};
function rdReset(){ RD.words = norm(RD.q.produto).split(/\s+/).filter(Boolean); Object.assign(RD, {rows:[], seen:new Set(), lidos:0, total:0, pg:1, maxPg:40, fim:false, erro:"", stop:false, dos:{}, abre:null, feito:true, ts:Date.now()}); }
function rdAdd(c){
  if (c.tipoPessoa && c.tipoPessoa !== "PJ") return;
  const k = c.numeroControlePNCP; if (k){ if (RD.seen.has(k)) return; RD.seen.add(k); }
  const uo = c.unidadeOrgao || {}, oe = c.orgaoEntidade || {}; if (RD.q.uf && uo.ufSigla !== RD.q.uf) return;
  if (!kwOk(norm(c.objetoContrato), RD.words)) return;
  const valor = +c.valorGlobal || +c.valorInicial || 0, q = qtdTexto(c.objetoContrato);
  RD.rows.push({k, data:String(c.dataAssinatura || c.dataPublicacaoPncp || "").slice(0, 10), cnpj:oe.cnpj || "", orgao:oe.razaoSocial || "", uf:uo.ufSigla || "", mun:uo.municipioNome || "", forn:c.nomeRazaoSocialFornecedor || "", ni:String(c.niFornecedor || ""), valor, obj:String(c.objetoContrato || ""), ncc:c.numeroControlePncpCompra || "", q:q ? q.q : null, un:q ? q.un : "", vu:q && valor > 0 ? valor / q.q : null});
}
async function rdRun(){
  if (RD.run) return; RD.run = true; RD.stop = false; RD.erro = ""; rdDraw();
  try{
    const fim = new Date(), ini = new Date(Date.now() - (+RD.q.dias || 90) * 864e5);
    while (!RD.stop && !RD.fim && RD.pg <= RD.maxPg && RD.rows.length < 600){
      const j = await pncpGet("/contratos", {dataInicial:ymd(ini), dataFinal:ymd(fim), pagina:RD.pg, tamanhoPagina:500}), arr = j.data || [];
      RD.total = j.totalRegistros || RD.total; arr.forEach(rdAdd); RD.lidos += arr.length;
      if (!arr.length || !(j.paginasRestantes > 0)) RD.fim = true; else RD.pg++;
      rdDraw();
    }
  }catch(e){ RD.erro = netMsg(e); }
  RD.run = false; rdDraw();
}
function rdStats(){
  const R = RD.rows, vals = R.map(r => r.valor).filter(v => v > 0), vus = R.map(r => r.vu).filter(v => v != null);
  const por = {}; R.forEach(r => { const o = por[r.cnpj] = por[r.cnpj] || {cnpj:r.cnpj, orgao:r.orgao, uf:r.uf, mun:r.mun, n:0, total:0, datas:[]}; o.n++; o.total += r.valor; if (r.data) o.datas.push(r.data); });
  const orgs = Object.values(por).map(o => { o.datas.sort(); const ds = o.datas.map(d => +new Date(d)); let iv = null; if (ds.length > 1) iv = Math.round((ds[ds.length - 1] - ds[0]) / (ds.length - 1) / 864e5);
    o.ult = o.datas[o.datas.length - 1] || ""; o.iv = iv; o.prox = iv && o.ult ? new Date(+new Date(o.ult) + iv * 864e5).toISOString().slice(0, 10) : ""; return o; }).sort((a, b) => b.n - a.n || b.total - a.total);
  const pf = {}; R.forEach(r => { if (!r.ni) return; const f = pf[r.ni] = pf[r.ni] || {ni:r.ni, nome:r.forn, n:0, total:0, orgs:new Set()}; f.n++; f.total += r.valor; f.orgs.add(r.cnpj); });
  const forns = Object.values(pf).sort((a, b) => b.n - a.n || b.total - a.total);
  return {n:R.length, med:qnt(vals, .5), p25:qnt(vals, .25), p75:qnt(vals, .75), min:vals.length ? Math.min(...vals) : null, max:vals.length ? Math.max(...vals) : null,
    nvu:vus.length, vuMed:qnt(vus, .5), vuMin:vus.length ? Math.min(...vus) : null, vuMax:vus.length ? Math.max(...vus) : null, qMed:qnt(R.map(r => r.q).filter(Boolean), .5), orgs, forns};
}
function margemPot(vu, qtd){
  const custo = n(RD.q.custo), extra = n(RD.q.extra); if (!(custo > 0) || !(vu > 0)) return null;
  const q = qtd > 0 ? qtd : 100, r = calc({preco:vu, qtd:q, custo, frete:extra * q, outros:0, margem:S.cfg.margem});
  return {margem:r.margem, lucroU:r.lucro / q, piso:r.minLance, folga:r.minLance != null ? (vu - r.minLance) / vu : null};
}
function margHTML(vu, qtd, rot){
  const m = margemPot(vu, qtd); if (!m) return `<div class="hint">Digite o seu custo por unidade para ver a margem potencial.</div>`;
  const ok = m.margem * 100 >= S.cfg.margem;
  return `<div class="pl ${ok ? "ok" : "bd"}"><small>${rot}</small><b>${pct(m.margem)}</b><span>Lucro de ${money(m.lucroU)} por unidade. Seu piso para a margem de ${pct(S.cfg.margem / 100)} é ${m.piso != null ? money(m.piso) : "-"} por unidade${m.folga != null ? ", " + (m.folga >= 0 ? pct(m.folga) + " abaixo do preço de referência" : pct(-m.folga) + " acima do preço de referência") : ""}.</span></div>`;
}
const rowsTbl = (rows, n0 = 25) => `<div class="tw"><table class="tbl"><thead><tr><th>Quando e quem</th><th>Valor</th><th>Qtd e preço unit.*</th></tr></thead><tbody>${rows.slice(0, n0).map(r => `<tr><td><b>${dBR(r.data)}</b>, ${esc(r.uf)}<small>${esc(r.orgao.slice(0, 48))}</small><small>Venceu: ${esc((r.forn || "-").slice(0, 40))}</small></td><td><b>${bt(r.valor)}</b></td><td>${r.q ? r.q + " " + esc(r.un) + "<small>" + money(r.vu) + " cada</small>" : "-"}</td></tr>`).join("")}</tbody></table></div>`;
function rdDossieHTML(c){
  const d = RD.dos[c]; if (!d) return ""; if (d.loading) return `<div class="hint">Montando o histórico deste órgão…</div>`; if (d.erro === "net") return `<div class="hint">Não foi possível consultar o PNCP agora.</div>`; if (d.erro) return `<div class="hint">${esc(d.erro)}</div>`;
  const ds = d.contr.map(x => x.data).filter(Boolean).sort(), iv = ds.length > 1 ? Math.round((+new Date(ds[ds.length - 1]) - +new Date(ds[0])) / (ds.length - 1) / 864e5) : null, prox = iv ? new Date(+new Date(ds[ds.length - 1]) + iv * 864e5).toISOString().slice(0, 10) : "";
  const vus = d.contr.map(x => x.vu).filter(v => v != null), vm = qnt(vus, .5);
  let h = `<div class="sub" style="margin:6px 0"><b>${d.contr.length}</b> compra${d.contr.length === 1 ? "" : "s"} deste produto nos últimos 12 meses${iv ? ", uma a cada " + iv + " dias. Última em " + dBR(ds[ds.length - 1]) + ". Próxima provável perto de " + dBR(prox) + "." : "."}</div>`;
  if (d.contr.length) h += `<div class="tw"><table class="tbl"><thead><tr><th>Compra anterior</th><th>Valor</th><th>Como foi</th></tr></thead><tbody>${d.contr.slice(0, 12).map(x => `<tr><td><b>${dBR(x.data)}</b><small>Venceu: ${esc((x.forn || "-").slice(0, 38))}</small><small>${esc(x.obj.slice(0, 70))}</small></td><td><b>${bt(x.valor)}</b></td><td>${esc(x.modal || "-")}${x.q ? "<small>" + x.q + " " + esc(x.un) + ", " + money(x.vu) + " cada</small>" : ""}</td></tr>`).join("")}</tbody></table></div>`;
  if (d.pca.length) h += `<b style="display:block;margin-top:8px">Previsto no plano de compras (PCA)</b><div class="tw"><table class="tbl"><thead><tr><th>Item</th><th>Qtd</th><th>Unitário</th><th>Quando</th></tr></thead><tbody>${d.pca.slice(0, 8).map((x, i) => `<tr><td>${esc(x.desc.slice(0, 70))}<small>${esc(x.unidade || "")}</small></td><td>${x.qtd || "-"}</td><td>${x.vu ? bt(x.vu) : "-"}</td><td>${dBR(x.data)}</td></tr>`).join("")}</tbody></table></div>
    <div class="links">${d.pca.slice(0, 3).map((x, i) => `<button class="btn sm" data-a="rdMonPca" data-c="${c}" data-i="${i}">Monitorar item ${i + 1} do PCA</button>`).join("")}</div>`;
  else h += `<div class="hint">Nenhum item deste produto no PCA publicado por este órgão.</div>`;
  if (vm) h += margHTML(vm, qnt(d.contr.map(x => x.q).filter(Boolean), .5), "Margem se pagarem o preço unitário típico deste órgão");
  h += `<div class="links">${prox ? `<button class="btn ghost sm" data-a="rdMonNext" data-c="${c}">Monitorar a próxima compra estimada</button>` : ""}</div>`;
  return h;
}
async function rdDossie(c){
  RD.dos[c] = {loading:true}; rdDraw();
  try{
    const fim = new Date(), ini = new Date(Date.now() - 365 * 864e5), contr = []; let pg = 1;
    for (; pg <= 4; pg++){ const j = await pncpGet("/contratos", {dataInicial:ymd(ini), dataFinal:ymd(fim), cnpjOrgao:c, pagina:pg, tamanhoPagina:500});
      (j.data || []).forEach(x => { if (!kwOk(norm(x.objetoContrato), RD.words)) return; const v = +x.valorGlobal || +x.valorInicial || 0, q = qtdTexto(x.objetoContrato); contr.push({data:String(x.dataAssinatura || x.dataPublicacaoPncp || "").slice(0, 10), forn:x.nomeRazaoSocialFornecedor || "", valor:v, obj:String(x.objetoContrato || ""), ncc:x.numeroControlePncpCompra || "", q:q ? q.q : null, un:q ? q.un : "", vu:q && v > 0 ? v / q.q : null}); });
      if (!(j.paginasRestantes > 0)) break; }
    contr.sort((a, b) => b.data.localeCompare(a.data));
    const pca = [];
    try{ const pj = await pncpGet("/pca/atualizacao", {dataInicio:ymd(ini), dataFim:ymd(fim), cnpj:c, pagina:1, tamanhoPagina:10});
      (pj.data || []).forEach(p => (p.itens || []).forEach(it => { if (!kwOk(norm(it.descricaoItem), RD.words)) return; pca.push({desc:it.descricaoItem || "", qtd:+it.quantidadeEstimada || 0, vu:+it.valorUnitario || 0, vt:+it.valorTotal || 0, data:String(it.dataDesejada || "").slice(0, 10), unidade:it.unidadeFornecimento || "", ano:p.anoPca, orgao:p.orgaoEntidadeRazaoSocial || "", unid:p.nomeUnidade || ""}); })); }catch(e){ if (netMsg(e) === "net") throw e; }
    for (const x of contr.slice(0, 3)){ const m = /^(\d{14})-1-(\d+)\/(\d{4})$/.exec(x.ncc); if (!m) continue; try{ const cp = await pncpGet(`/orgaos/${m[1]}/compras/${m[3]}/${+m[2]}`, {}); x.modal = cp.modalidadeNome || ""; x.hom = +cp.valorTotalHomologado || 0; }catch(e){ if (netMsg(e) === "net") throw e; } }
    RD.dos[c] = {contr, pca};
  }catch(e){ RD.dos[c] = {erro:netMsg(e)}; }
  rdDraw();
}
function rdHTML(){
  if (!RD.feito) return "";
  if (RD.erro === "net") return `<div class="card"><b>Não foi possível consultar o PNCP</b><p class="sub" style="margin:6px 0 0">O navegador ou o link em que você abriu o app bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`;
  const st = rdStats(), pr = RD.total > 0 ? clampN(RD.lidos / RD.total * 100, 0, 100) : 0;
  let h = `<div class="card"><div class="prg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pr)}"><i style="width:${pr}%"></i></div><div class="sub" style="margin:0">${RD.run ? "Analisando… " : ""}${RD.lidos.toLocaleString("pt-BR")} de ${RD.total.toLocaleString("pt-BR")} contratos lidos${RD.fim ? ". Completo." : ". Amostra dos contratos mais recentes publicados."} ${st.n} deste produto.</div>
    ${RD.erro ? `<p class="note2">${esc(RD.erro)}</p>` : ""}<div class="actions">${RD.run ? '<button class="btn ghost sm" data-a="rdStop">Parar</button>' : (!RD.fim ? '<button class="btn ghost sm" data-a="rdMais">Ler mais contratos</button>' : "")}</div></div>`;
  if (!st.n) return h + (RD.run ? "" : `<div class="card empty">Nenhum contrato deste produto na amostra lida. Tente outras palavras, tire o estado ou toque em Ler mais contratos.</div>`);
  h += `<div class="kpis" style="margin:0 0 10px"><div class="kpi"><small>Contratos encontrados</small><b>${st.n}</b></div><div class="kpi"><small>Valor típico (mediana)</small><b>${bi(st.med)}</b></div><div class="kpi"><small>Faixa comum (25% a 75%)</small><b style="font-size:15px">${bt(st.p25)} a ${bt(st.p75)}</b></div><div class="kpi"><small>Preço unitário típico*</small><b>${st.nvu ? money(st.vuMed) : "-"}</b></div></div>`;
  if (st.nvu) h += `<div class="hint" style="margin:0 0 8px">*Estimado do texto do contrato (valor dividido pela quantidade citada), em ${st.nvu} de ${st.n} contratos. Faixa: ${money(st.vuMin)} a ${money(st.vuMax)}.</div>`;
  h += margHTML(st.vuMed, st.qMed, "Margem potencial ao preço unitário típico");
  h += `<div class="actions"><button class="btn" data-a="rdAlerta">Criar alerta de novas compras</button><button class="btn ghost" data-a="rdAbertas">Ver abertas agora</button><button class="btn ghost" data-a="rdSalva">Salvar este radar</button></div>`;
  h += `<details class="tut" open><summary>Órgãos que compram (frequência)</summary><div class="tb"><div class="tw"><table class="tbl fr"><thead><tr><th>Órgão</th><th>Compras</th><th>Total</th><th>Intervalo</th><th>Próxima</th></tr></thead><tbody>${st.orgs.slice(0, 15).map(o => `<tr data-a="rdOrg" data-c="${o.cnpj}" tabindex="0" role="button"><td><b>${esc(o.orgao.slice(0, 40))}</b><small>${esc(o.mun)}${o.mun ? "/" : ""}${esc(o.uf)}</small></td><td>${o.n}</td><td>${bt(o.total)}</td><td>${o.iv ? o.iv + " d" : "-"}</td><td>${o.prox ? dBR(o.prox) : "-"}</td></tr>`).join("")}</tbody></table></div><div class="hint">Toque em um órgão para ver o histórico completo, o plano de compras (PCA) e monitorar.</div>
    ${st.orgs.slice(0, 15).map(o => RD.abre === o.cnpj ? `<div class="card" style="margin-top:8px"><b>${esc(o.orgao)}</b>${rdDossieHTML(o.cnpj)}</div>` : "").join("")}</div></details>`;
  h += `<details class="tut"><summary>Resultados anteriores (quem comprou e quem venceu)</summary><div class="tb">${rowsTbl(RD.rows.slice().sort((a, b) => b.data.localeCompare(a.data)))}</div></details>`;
  h += `<details class="tut"><summary>Fornecedores que mais venceram</summary><div class="tb">${st.forns.slice(0, 8).map((f, i) => `<div class="top4"><div><span class="rk">${i + 1}</span><span class="nm">${esc(f.nome || "Sem nome")}</span></div><div class="cn"><b>${f.n}</b> contrato${f.n > 1 ? "s" : ""}, ${money(f.total)}. ${f.orgs.size} órgão${f.orgs.size > 1 ? "s" : ""}.</div></div>`).join("")}</div></details>`;
  return h;
}
function rdDraw(){ const o = $("#rdOut"); if (o) o.innerHTML = rdHTML(); }
function viewRadar(m){
  const q = RD.q;
  m.innerHTML = `<h1>Radar de produtos</h1>
  <p class="sub">Escolha um produto. O app olha o que os órgãos compraram antes: quanto pagaram, quem venceu e de quanto em quanto tempo compram. Depois calcula a sua margem.</p>
  <div class="card"><div class="fg">
    <div class="f"><label for="rd_produto">Produto (palavras do objeto)</label><input id="rd_produto" data-rd="produto" autocomplete="off" placeholder="Ex.: papel sulfite" value="${esc(q.produto)}"></div>
    <div class="f half"><label for="rd_uf">Estado</label><select id="rd_uf" data-rd="uf"><option value="">Brasil inteiro</option>${UFS.map(([s, nm]) => `<option value="${s}"${q.uf === s ? " selected" : ""}>${nm}</option>`).join("")}</select></div>
    <div class="f half"><label for="rd_dias">Contratos dos últimos</label><select id="rd_dias" data-rd="dias">${[30, 90, 180, 365].map(d => `<option value="${d}"${q.dias === String(d) ? " selected" : ""}>${d} dias</option>`).join("")}</select></div>
    <div class="f half"><label for="rd_custo">Meu custo por unidade (R$)</label><input id="rd_custo" data-rd="custo" inputmode="decimal" autocomplete="off" placeholder="40" value="${esc(q.custo)}"></div>
    <div class="f half"><label for="rd_extra">Frete e outros por unidade (R$)</label><input id="rd_extra" data-rd="extra" inputmode="decimal" autocomplete="off" placeholder="2" value="${esc(q.extra)}"></div></div>
    <div class="actions"><button class="btn" data-a="rdGo">Analisar o histórico</button></div></div>
  <div id="rdOut">${rdHTML()}</div>
  <div class="note2"><b>Como ler:</b> os contratos vêm do PNCP e mostram o valor total, não o preço de cada unidade. O preço unitário é <b>estimado</b> quando o texto do contrato cita uma única quantidade (por exemplo, 500 caixas). O PNCP não permite buscar por palavra, então o app lê os contratos mais recentes e filtra pelas suas palavras: é uma <b>amostra</b>. Aumente o período ou toque em Ler mais contratos para cobrir mais. O valor do contrato nem sempre é o que foi pago.</div>`;
}

/* ---------- previsões (PCA), monitoramento e funil ---------- */
const kwFrom = s => norm(s).split(/\s+/).filter(w => w.length > 2).slice(0, 4);
function addPrev(o){
  if (S.prev.some(p => p.cnpj === o.cnpj && norm(p.item) === norm(o.item) && p.etapa !== "arquivada")){ toast("Esta previsão já está sendo monitorada."); return; }
  S.prev.unshift({id:uid(), etapa:"previsao", criado:Date.now(), pub:null, an:{}, ...o}); save(); toast("Previsão salva. O app confere o PNCP sozinho."); setTimeout(monitoraPrev, 400);
}
let monBusy = false, monLast = 0;
async function monitoraPrev(){
  if (monBusy) return; const at = S.prev.filter(p => p.etapa === "previsao"); if (!at.length) return;
  monBusy = true; ui.monErro = ""; monLast = Date.now(); ui.monAt = monLast; hubDraw();
  const ja = new Set(S.prev.filter(x => x.pub && x.pub.k).map(x => x.pub.k));
  try{
    for (const p of at){
      const j = await pncpGet("/contratacoes/proposta", {dataFinal:ymd(new Date(Date.now() + 180 * 864e5)), cnpj:p.cnpj, pagina:1, tamanhoPagina:50});
      p.checado = Date.now(); const hit = (j.data || []).find(c => kwOk(norm(c.objetoCompra), p.kw && p.kw.length ? p.kw : kwFrom(p.item)));
      if (hit){ const oe = hit.orgaoEntidade || {};
        p.etapa = "publicada"; p.pub = {k:hit.numeroControlePNCP || "", link:lvLink(hit), valor:+hit.valorTotalEstimado || 0, modal:hit.modalidadeNome || "", obj:String(hit.objetoCompra || ""), ab:hit.dataAberturaProposta || "", en:hit.dataEncerramentoProposta || "", numero:String(hit.numeroCompra || "") + (hit.anoCompra ? "/" + hit.anoCompra : ""), cnpj:oe.cnpj || p.cnpj, orgao:oe.razaoSocial || p.orgao};
        const msg = (p.orgao || "") + ": " + String(hit.modalidadeNome || "compra") + " de " + money(+hit.valorTotalEstimado || 0) + ". Propostas até " + dBR(hit.dataEncerramentoProposta) + ".";
        if (!hit.numeroControlePNCP || !ja.has(hit.numeroControlePNCP)){ ui.avisos.unshift({t:"Compra publicada que você previu", b:msg}); notifica("Compra publicada que você previu", msg); }
        if (hit.numeroControlePNCP) ja.add(hit.numeroControlePNCP); }
    }
  }catch(e){ ui.monErro = netMsg(e); }
  monBusy = false; save(); hubDraw();
}
const ETAPAS = [["previsao", "Monitorando"], ["publicada", "Publicada"], ["analise", "Em análise"], ["participando", "Participando"]];
function pvCard(p){
  const e = p.etapa, due = p.dataDesejada ? daysTo(String(p.dataDesejada).slice(0, 10)) : null;
  return `<div class="card"><div class="top"><b>${esc(p.item.slice(0, 80))}</b><span class="tag ${e === "publicada" ? "bd" : e === "previsao" ? "wn" : "ok"}">${esc((ETAPAS.find(x => x[0] === e) || [0, e])[1])}</span></div>
    <div class="meta">${esc(p.orgao || "")}${p.uf ? ", " + esc(p.uf) : ""}</div>
    <div class="meta">${p.orig === "pca" ? "Do plano de compras (PCA)" : "Estimativa pelo histórico"}${p.qtd ? ". " + p.qtd + " un" : ""}${p.vu ? " a " + money(p.vu) : ""}${p.dataDesejada ? ". Data desejada " + dBR(p.dataDesejada) + (due != null ? (due < 0 ? " (já passou)" : " (em " + due + " dias)") : "") : ""}</div>
    ${e === "previsao" ? `<div class="meta">${p.checado ? "Conferido às " + hhmm(p.checado) + ". Nada publicado ainda." : "Ainda não conferido."}</div>` : ""}
    ${p.pub ? `<div class="note2"><b>${esc(p.pub.modal || "Compra")} publicada:</b> ${money(p.pub.valor)}. Propostas até ${dBR(p.pub.en)}.<br>${esc(p.pub.obj.slice(0, 160))}</div>` : ""}
    <div class="links">${e === "previsao" ? `<button class="btn ghost sm" data-a="pvCheck">Conferir agora</button>` : ""}${e === "publicada" || e === "analise" ? `<button class="btn sm" data-a="pvAn" data-id="${p.id}">${e === "publicada" ? "Analisar" : "Abrir análise"}</button>` : ""}${p.pub ? `<a class="btn ghost sm" href="${su(p.pub.link)}" target="_blank" rel="noopener">Abrir edital</a>` : ""}<button class="btn ghost sm" data-a="pvArq" data-id="${p.id}">Arquivar</button></div></div>`;
}
/* ---------- marca e centro de comando (Hub) ---------- */
let LOGO_N = 0;
const LOGO = (s = 30, an) => { const id = "lcClip" + (++LOGO_N); return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true"${an ? ' class="lg-anim"' : ""}><defs><clipPath id="lcClip"><rect width="64" height="64" rx="16"/></clipPath></defs><rect width="64" height="64" rx="16" fill="#0E2150"/><g clip-path="url(#lcClip)" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="1.6"><circle cx="44" cy="20" r="14"/><circle cx="44" cy="20" r="22"/><circle cx="44" cy="20" r="30"/></g><path class="lg-l" pathLength="1" d="M21 15v30h22" fill="none" stroke="#fff" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/><g class="lg-b"><circle cx="44" cy="20" r="10.5" fill="#0E2150"/><circle cx="44" cy="20" r="8.5" fill="#17D6A0"/></g><path class="lg-c" pathLength="1" d="M39.6 20.3l3.2 3.2 5.6-6.4" fill="none" stroke="#05243A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`.replace(/lcClip/g, id); };
function proxPrazo(){
  const now = Date.now(); let b = null;
  S.lic.forEach(x => { if (!ATIVAS.includes(x.status)) return; EVT(x).forEach(e => { if (e.ts > now && (!b || e.ts < b.ts)) b = {ts:e.ts, t:e.t, x}; }); });
  return b;
}
const saud = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };
function hubHero(P, nova){
  let nome = ""; try{ nome = String(((getAuth() || {}).nome || "")).trim().split(/\s+/)[0]; }catch(e){}
  const mon = P.filter(p => p.etapa === "previsao").length, al = S.alertas.length, pubs = P.filter(p => p.etapa === "publicada").length;
  const pulso = (mon || al) ? `Monitorando ${mon} previsão${mon === 1 ? "" : "ões"} e ${al} alerta${al === 1 ? "" : "s"} de oportunidades` : "Monte seu perfil de vendas para o radar começar a trabalhar";
  const nb = Math.min(14, Math.max(4, nova + mon + al + pubs)), blips = Array.from({length:nb}, (_, i) => `<i class="blip${i < nova + pubs ? " hot" : ""}" style="--a:${(i * 137.5) % 360}deg;--r:${34 + (i * 47) % 96};--d:${((i % 7) * 0.45).toFixed(2)}s"></i>`).join("");
  return `<section class="hero" aria-labelledby="hero-t">
    <div class="radar" aria-hidden="true"><svg viewBox="0 0 320 320"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="160" cy="160" r="52"/><circle cx="160" cy="160" r="98"/><circle cx="160" cy="160" r="144"/><circle class="ping" cx="160" cy="160" r="150"/><circle class="ping p2" cx="160" cy="160" r="150"/></g><path d="M160 10V310M10 160H310" stroke="currentColor" stroke-width=".6" opacity=".5"/></svg><div class="sweep"></div>${blips}</div>
    <p class="hero-hi">${saud()}${nome ? ", " + esc(nome) : ""}.</p>
    <h1 id="hero-t">A inteligência que transforma oportunidades públicas e privadas em negócios</h1>
    <div class="pulse"><i></i><span>${pulso}</span></div>
    <div class="hero-act"><button class="btn sig" data-a="tab" data-t="motor">Encontrar oportunidades</button><button class="btn glass" data-a="tab" data-t="lic">Minha agenda</button></div></section>`;
}
function hubBand(P, nova){
  const pp = proxPrazo(), sf = semaforo(), pend = sf.filter(x => x.k === "bd").length, aten = sf.filter(x => x.k === "wn").length;
  const pubs = P.filter(p => p.etapa === "publicada").length;
  const cell = (tab, l, v, cls, c) => `<button data-a="tab" data-t="${tab}"><small>${l}</small><b class="${cls}"${typeof v === "number" ? ` data-cu="${v}"` : ""}>${v}</b><span>${c}</span></button>`;
  return `<div class="hkb">${cell("acomp", "Oportunidades novas", nova, nova ? "ok" : "", S.alertas.length ? "no seu perfil" : "crie um perfil")}
    ${cell("radar", "Previsões monitoradas", P.filter(p => p.etapa === "previsao").length, "", pubs ? pubs + " publicada" + (pubs > 1 ? "s" : "") : "nada publicado ainda")}
    ${cell(pp ? "lances" : "acomp", "Próximo prazo", pp ? fmtLeft(Math.max(1, Math.round((pp.ts - Date.now()) / 60000))) : "Nenhum", pp && pp.ts - Date.now() < 36e5 ? "bd" : pp && pp.ts - Date.now() < 864e5 ? "wn" : "", pp ? esc(pp.t) : "sem prazos marcados")}
    ${cell("regularidade", "Regularidade", pend ? pend + " pendência" + (pend > 1 ? "s" : "") : aten ? aten + " em atenção" : "Em dia", pend ? "bd" : aten ? "wn" : "ok", "CNPJ, DAS e certidões")}</div>`;
}
function hubHTML(){
  const P = S.prev.filter(p => p.etapa !== "arquivada"), c = e => P.filter(p => p.etapa === e).length;
  const nova = S.alertas.reduce((s, a) => s + (a.novos || 0), 0), ses = S.lic.filter(x => ATIVAS.includes(x.status)).length;
  const step = (n, t, d, k) => `<div class="fn${k ? " on" : ""}"><b>${n}</b><span>${t}</span><small>${d}</small></div>`;
  let a = `<h2 class="gh" style="margin-top:6px">Funil de oportunidades</h2><div class="funil">${step(P.length, "Previsões", "do PCA e do histórico", P.length)}<i>›</i>${step(c("previsao"), "Monitorando", "conferindo o PNCP", c("previsao"))}<i>›</i>${step(c("publicada"), "Publicadas", "alerta enviado", c("publicada"))}<i>›</i>${step(c("analise"), "Em análise", "margem e preço", c("analise"))}<i>›</i>${step(c("participando") + ses, "Participando", "lances e pedidos", c("participando") + ses)}</div>`;
  if (ui.monErro === "net") a += `<div class="note2">Não foi possível consultar o PNCP a partir deste app. No aplicativo instalado pela loja o monitoramento funciona.</div>`;
  a += `<div class="actions" style="margin:8px 0 0"><button class="btn ghost sm" data-a="hubMon">${monBusy ? "Conferindo…" : "Conferir previsões agora"}</button></div><div class="hint" id="monSt" style="margin-top:6px">${ui.monAt ? "Última conferência às " + hhmm(ui.monAt) + "." : "O app confere as previsões ao abrir e a cada 30 minutos, com o app aberto."}</div>`;
  const fila = P.filter(p => p.etapa === "publicada" || p.etapa === "analise");
  a += `<h2 class="gh">Para agir agora</h2>${fila.length ? fila.map(pvCard).join("") : '<div class="card empty">Nada pedindo ação. Quando uma compra prevista for publicada, ela aparece aqui com alerta.</div>'}`;
  const mon = P.filter(p => p.etapa === "previsao").sort((x, y) => String(x.dataDesejada || "9").localeCompare(String(y.dataDesejada || "9")));
  a += `<h2 class="gh">Previsões monitoradas</h2>${mon.length ? mon.map(pvCard).join("") : '<div class="card empty">Nenhuma previsão ainda. No Radar de produtos, abra um órgão e toque em Monitorar para acompanhar o plano de compras dele.</div>'}`;
  let m = "";
  if (nova) m += `<button class="alert" data-a="tab" data-t="acomp" style="margin:0 0 8px"><span>${nova} oportunidade${nova > 1 ? "s" : ""} nos seus alertas de busca<small>Toque para ver.</small></span><span aria-hidden="true">›</span></button>`;
  m += hubOpp();
  if (S.radar.length) m += `<h2 class="gh">Meus radares</h2>${S.radar.map(r => `<div class="card"><div class="top"><b>${esc(r.produto)}</b><span class="tag">${esc(r.uf || "Brasil")}</span></div><div class="meta">${r.n} contratos. Valor típico ${bi(r.med)}${r.vuMed ? ". Unitário típico " + money(r.vuMed) : ""}. Analisado em ${dBR(new Date(r.at).toISOString())}.</div><div class="links"><button class="btn sm" data-a="rdReana" data-id="${r.id}">Analisar de novo</button><button class="btn ghost sm" data-a="rdDel" data-id="${r.id}">Remover</button></div></div>`).join("")}`;
  m += `<h2 class="gh">Ferramentas</h2><div class="gridk">${[["radar", "Radar de produtos", "histórico e margem"], ["busca", "Buscar licitações", "por valor e item"], ["acomp", "Alertas e lembretes", "datas e oportunidades"], ["lances", "Painel de lances", "cronômetro"], ["pedidos", "Rastrear pedidos", "entregas"], ["fretes", "Fretes", "transportadoras"], ["orcamento", "Orçamento e caixa", "regiões e cidades"], ["obras", "Obras públicas", "atrasos"], ["nfe", "Emitir nota fiscal", "passo a passo"], ["regularidade", "Regularidade do CNPJ", "DAS e pendências"], ["seguranca", "Segurança e acesso", "2FA e registro"], ["editais", "Editais com IA", "resumo e perguntas"], ["perfil", "Meu perfil", "produtos e CNAE"], ["fin", "Financial Hub", "crédito e antecipação"], ["modal", "Modalidades", "passo a passo"], ["portais", "Portais", "SICAF e compras"]].map(([k, t, d]) => `<button class="card item" data-a="tab" data-t="${k}"><b>${t}</b><small>${d}</small></button>`).join("")}</div>`;
  m += `<div class="note2"><b>O caminho:</b> o <b>PCA</b> mostra o que o órgão planeja comprar. O app guarda essa <b>previsão</b>, <b>monitora</b> o PNCP e, quando a compra (por exemplo uma <b>dispensa</b>) é <b>publicada</b>, manda o <b>alerta</b>. Aí você faz a <b>análise</b> da margem e decide <b>participar</b>.</div>`;
  return hubHero(P, nova) + instCard() + hubBand(P, nova) + `<div class="hubg"><div class="huba">${a}</div><div class="hubm">${m}</div></div>` + privHub() + fontesHub();
}
function hubDraw(){ const o = $("#hubOut"); if (o) o.innerHTML = hubHTML(); }
function viewHub(m){
  m.innerHTML = `<div id="hubOut">${hubHTML()}</div>`;
  if (S.prev.some(p => p.etapa === "previsao") && Date.now() - monLast > 120000) monitoraPrev();
}
function anHTML(p){
  const a = p.an = p.an || {}, q = n(a.qtd) || p.qtd || 0, pu = p.vu || (q > 0 && p.pub && p.pub.valor ? p.pub.valor / q : 0), custo = n(a.custo), extra = n(a.extra), pb = p.pub;
  let r = null; if (custo > 0 && pu > 0 && q > 0) r = calc({preco:pu, qtd:q, custo, frete:extra * q, outros:0, margem:S.cfg.margem});
  const rad = S.radar.find(x => kwFrom(x.produto).some(w => (p.kw || kwFrom(p.item)).includes(w)));
  return `<div class="card"><b style="font-size:18px">${esc(p.orgao || "")}</b><div class="meta">${esc(p.item)}</div>
    ${pb ? `<div class="kpis" style="margin:8px 0"><div class="kpi"><small>Modalidade</small><b style="font-size:15px">${esc(pb.modal || "-")}</b></div><div class="kpi"><small>Valor estimado</small><b>${bi(pb.valor)}</b></div><div class="kpi"><small>Propostas até</small><b style="font-size:15px">${dBR(pb.en)}</b></div><div class="kpi"><small>Abertura</small><b style="font-size:15px">${dBR(pb.ab)}</b></div></div><div class="meta">${esc(pb.obj.slice(0, 220))}</div>` : ""}
    <div class="meta" style="margin-top:6px">${p.qtd ? "Previsto no PCA: " + p.qtd + " un" + (p.vu ? " a " + money(p.vu) : "") + "." : "Sem quantidade no PCA."}${rad && rad.vuMed ? " Histórico: unitário típico " + money(rad.vuMed) + "." : ""}</div></div>
    <div class="card"><b>Sua margem</b><div class="fg" style="margin-top:8px"><div class="f half"><label for="an_qtd">Quantidade</label><input id="an_qtd" data-an="qtd" data-id="${p.id}" inputmode="decimal" value="${esc(a.qtd || (p.qtd ? String(p.qtd) : ""))}"></div>
      <div class="f half"><label for="an_custo">Meu custo por unidade (R$)</label><input id="an_custo" data-an="custo" data-id="${p.id}" inputmode="decimal" value="${esc(a.custo || "")}"></div>
      <div class="f"><label for="an_extra">Frete e outros por unidade (R$)</label><input id="an_extra" data-an="extra" data-id="${p.id}" inputmode="decimal" value="${esc(a.extra || "")}"></div></div>
    <div id="anRes">${anRes(p, r, pu)}</div></div>
    <div class="actions"><button class="btn" data-a="pvPart" data-id="${p.id}">Participar: salvar em Licitações</button><button class="btn ghost" data-a="pvArq" data-id="${p.id}">Descartar</button></div>`;
}
function anRes(p, r, pu){
  if (!r) return `<div class="hint">Digite quantidade e custo. O preço de referência usado é ${pu > 0 ? money(pu) + " por unidade" : "o do PCA ou o valor estimado dividido pela quantidade"}.</div>`;
  const ok = r.margem * 100 >= S.cfg.margem;
  return `<div class="pl ${ok ? "ok" : "bd"}"><small>${ok ? "Vale participar" : "Margem abaixo da meta"}</small><b>${pct(r.margem)}</b><span>Preço de referência ${money(pu)} por unidade. Lucro total de ${money(r.lucro)}. Seu piso para ${pct(S.cfg.margem / 100)} de margem: ${r.minLance != null ? money(r.minLance) : "-"} por unidade.</span></div>`;
}
function viewAnalise(m){
  const p = S.prev.find(x => x.id === ui.anId);
  m.innerHTML = `<h1>Análise da oportunidade</h1>${p ? anHTML(p) : '<div class="card empty">Oportunidade não encontrada.</div>'}`;
}

/* ---------- modalidades, perfil de vendas e oportunidades ---------- */
const MODS = [["4", "Concorrência - Eletrônica"], ["5", "Concorrência - Presencial"], ["12", "Credenciamento"], ["8", "Dispensa"], ["9", "Inexigibilidade"], ["1", "Leilão - Eletrônico"], ["13", "Leilão - Presencial"], ["6", "Pregão - Eletrônico"], ["7", "Pregão - Presencial"]];
const modKey = s => norm(s).replace(/[^a-z]/g, "");
const modOk = (c, mods) => !mods || !mods.length || mods.some(code => { const m = MODS.find(x => x[0] === String(code)); return String(c.modalidadeId) === String(code) || (m && modKey(c.modalidadeNome).includes(modKey(m[1]))); });
const termos = s => String(s || "").split(/[,;\n]/).map(x => norm(x).trim()).filter(Boolean);
function refOf(s){
  const vmin = n(s.vmin), vmax = n(s.vmax), v = n(s.valor), f = clampN(n(s.faixa), 0, 90) / 100, faixa = vmin > 0 || vmax > 0, groups = [];
  const it = norm(s.item).split(/\s+/).filter(Boolean); if (it.length) groups.push(it);
  [s.nicho].concat(s.nichos || []).filter(Boolean).forEach(nm => { const nc = allNichos().find(x => x.n === nm); if (nc) nc.k.map(norm).forEach(k => groups.push([k])); });
  termos(s.palavras).forEach(p => groups.push(p.split(/\s+/).filter(Boolean)));
  return {min:faixa ? vmin : v * (1 - f), max:faixa ? (vmax > 0 ? vmax : Infinity) : v * (1 + f), v:faixa ? (vmin > 0 && vmax > 0 ? (vmin + vmax) / 2 : (vmax > 0 ? vmax : vmin)) : v, groups, exc:termos(s.exclui), mods:(s.mods && s.mods.length) ? s.mods : (s.mod ? [s.mod] : [])};
}
function lvAccept(c, r = LV.ref){
  const v = c.valorTotalEstimado;
  if (!(v > 0) || v < r.min || v > r.max) return false;
  const o = norm(c.objetoCompra);
  if (r.exc && r.exc.some(w => kwTest(o, w))) return false;
  if (r.groups.length && !r.groups.some(g => g.every(t => kwTest(o, t)))) return false;
  if (r.mods.length && !modOk(c, r.mods)) return false;
  return true;
}
async function alertScan(a){
  const ref = refOf(a), ufs = (a.ufs && a.ufs.length) ? a.ufs : (a.uf ? [a.uf] : UFS.map(u => u[0])), vistos = new Set(a.vistos || []), novos = [], mod1 = ref.mods.length === 1 ? ref.mods[0] : "";
  const fila = ufs.map(uf => ({uf, pg:1, fim:false}));
  for (let r = 0; r < 3; r++){
    for (const t of fila){ if (t.fim) continue;
      const j = await pncpGet("/contratacoes/proposta", {dataFinal:ymd(new Date(Date.now() + 120 * 864e5)), pagina:t.pg, tamanhoPagina:50, uf:t.uf, codigoModalidadeContratacao:mod1});
      (j.data || []).forEach(c => { const k = c.numeroControlePNCP; if (!k || !lvAccept(c, ref) || vistos.has(k)) return; vistos.add(k); novos.push(c); });
      if (!(j.paginasRestantes > 0)) t.fim = true; else t.pg++;
    }
  }
  a.vistos = [...vistos].slice(-600); a.checado = Date.now();
  if (novos.length){ a.novosLista = novos.slice(0, 20).map(c => ({k:c.numeroControlePNCP, v:c.valorTotalEstimado, o:String(c.objetoCompra || "").slice(0, 160), g:(c.orgaoEntidade || {}).razaoSocial || "", uf:(c.unidadeOrgao || {}).ufSigla || "", l:lvLink(c), d:c.dataAberturaProposta || "", p:c.dataEncerramentoProposta || "", cn:(c.orgaoEntidade || {}).cnpj, an:c.anoCompra, sq:c.sequencialCompra, m:c.modalidadeNome || ""})).concat(a.novosLista || []).slice(0, 20); }
  a.novos = (a.novos || 0) + novos.length; a.base = (a.base || 0) + novos.length;
}
const CNAE_MAP = [[/limpeza|higiene|saneante|conservacao domiciliar/, "Limpeza e higiene"], [/hospitalar|medico|cirurgic|odontolog|laborat|medicament|farmac|ortopedi|protese/, "Material hospitalar"], [/informatica|computador|software/, "Informática"], [/papelaria|escritorio|livros/, "Material de escritório"], [/alimenticio|bebida|hortifrut|carnes|mercearia|cereais|laticin|merenda/, "Alimentos e merenda"], [/vestuario|roupas|seguranca do trabalho|uniforme|calcados|texteis/, "Uniformes e EPI"], [/moveis|mobiliario/, "Móveis"], [/construcao|ferragens|ferramentas|eletric|tintas/, "Construção e ferramentas"], [/transporte rodoviario de carga|frete|entrega/, "Transporte e frete"]];
const cnaeFmt = c => { const s = String(c || "").replace(/\D/g, "").padStart(7, "0"); return s.slice(0, 4) + "-" + s[4] + "/" + s.slice(5); };
const sugNichos = () => { const o = new Set(); (S.empresa.cnaes || []).forEach(c => { const t = norm(c.desc); CNAE_MAP.forEach(([rx, nm]) => { if (rx.test(t)) o.add(nm); }); }); return [...o]; };
function perfilAlerta(){ return S.alertas.find(a => a.perfil); }
function viewPerfil(m){
  const P = S.perfil, E = S.empresa, sug = sugNichos().filter(x => !P.nichos.includes(x)), al = perfilAlerta();
  const chip = (on, a, d, t) => `<button class="chip${on ? " on" : ""}" data-a="${a}" ${d} aria-pressed="${on}">${esc(t)}</button>`;
  m.innerHTML = `<h1>Meu perfil de vendas</h1>
  <p class="sub">Diga o que você vende, quanto e onde. O app procura sozinho as oportunidades que combinam e avisa quando aparecer.</p>
  <div class="card"><b>1. Minha atividade (CNAE)</b>
    ${(E.cnaes || []).length ? `<div style="margin:8px 0">${E.cnaes.map((c, i) => `<div class="meta" style="display:flex;justify-content:space-between;gap:8px"><span>${esc(c.cod)} ${esc(c.desc)}</span><button class="btn ghost sm" data-a="pfCnaeDel" data-i="${i}" aria-label="Remover CNAE">Tirar</button></div>`).join("")}</div>` : `<p class="sub" style="margin:4px 0 8px">Nenhum CNAE cadastrado. Busque pelo CNPJ ou digite abaixo.</p>`}
    <div class="actions" style="margin-top:0"><button class="btn ghost sm" data-a="pfCnae">Buscar CNAEs pelo CNPJ</button></div><div class="hint" id="pfMsg">${cnpjOk(E.cnpj) ? "CNPJ da empresa: " + esc(E.cnpj) : "Cadastre o CNPJ em Mais, Dados da empresa, para buscar."}</div>
    <div class="fg"><div class="f"><label for="pf_cnaeNovo">Ou digite uma atividade (código e descrição)</label><input id="pf_cnaeNovo" data-pf="cnaeNovo" autocomplete="off" placeholder="4649-4/08 Comércio atacadista de produtos de limpeza" value="${esc(P.cnaeNovo || "")}"></div></div>
    <div class="actions" style="margin-top:0"><button class="btn ghost sm" data-a="pfCnaeAdd">Adicionar atividade</button></div>
    ${sug.length ? `<div class="note2">Pelos seus CNAEs, o app sugere: <b>${sug.map(esc).join(", ")}</b>.<br><button class="btn sm" style="margin-top:8px" data-a="pfSug">Adicionar aos meus produtos</button></div>` : ""}</div>
  <div class="card"><b>2. Produtos que eu vendo</b><div class="chips" style="flex-wrap:wrap;margin:8px 0 0;padding:0">${allNichos().map(x => chip(P.nichos.includes(x.n), "pfNicho", `data-n="${esc(x.n)}"`, x.n)).join("")}</div>
    <div class="fg" style="margin-top:8px"><div class="f"><label for="pf_palavras">Outros produtos (separe por vírgula)</label><input id="pf_palavras" data-pf="palavras" autocomplete="off" placeholder="detergente, luva descartável, máscara" value="${esc(P.palavras)}"></div>
    <div class="f"><label for="pf_exclui">Ignorar editais com estas palavras</label><input id="pf_exclui" data-pf="exclui" autocomplete="off" placeholder="serviço de limpeza predial, obra" value="${esc(P.exclui)}"></div></div></div>
  <div class="card"><b>3. Quanto, onde e como</b><div class="fg" style="margin-top:8px"><div class="f half"><label for="pf_vmin">Valor de (R$)</label><input id="pf_vmin" data-pf="vmin" inputmode="decimal" autocomplete="off" placeholder="3.000" value="${esc(P.vmin)}"></div><div class="f half"><label for="pf_vmax">até (R$)</label><input id="pf_vmax" data-pf="vmax" inputmode="decimal" autocomplete="off" placeholder="10.000" value="${esc(P.vmax)}"></div></div>
    <div class="sub" style="margin:10px 0 4px"><b>Estados</b> (sem escolher nenhum, vale o Brasil inteiro)</div><div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${UFS.map(([s]) => chip(P.ufs.includes(s), "pfUF", `data-u="${s}"`, s)).join("")}</div>
    <div class="sub" style="margin:10px 0 4px"><b>Modalidades</b> (sem escolher nenhuma, valem todas)</div><div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${MODS.map(([c, nm]) => chip(P.mods.includes(c), "pfMod", `data-c="${c}"`, nm)).join("")}</div></div>
  <div class="actions"><button class="btn" data-a="pfSalvar">${al ? "Atualizar e procurar agora" : "Salvar e receber oportunidades"}</button><button class="btn ghost" data-a="pfEx">Usar meu exemplo</button>${al ? '<button class="btn danger" data-a="pfOff">Desligar</button>' : ""}</div>
  ${al ? `<div class="hint">Ativo. ${al.checado ? "Última verificação às " + hhmm(al.checado) + "." : "Ainda não verificado."} As oportunidades aparecem no Hub.</div>` : ""}
  <div class="note2">O app confere o PNCP ao abrir e a cada 15 minutos, com o app aberto. Aparecem só editais com valor estimado divulgado e propostas abertas.</div>
  <details class="tut"><summary>Como o Opportunity Score é calculado</summary><div class="tb"><p>Cada oportunidade recebe uma nota de 0 a 100 para você decidir onde gastar o seu tempo:</p><ul><li><b>Aderência ao perfil (30):</b> quantos termos dos seus produtos aparecem no objeto.</li><li><b>Margem potencial (20):</b> usa o seu radar salvo e o seu custo. Sem radar, a nota é neutra.</li><li><b>Valor na faixa (15):</b> mais perto do meio da sua faixa, melhor.</li><li><b>Prazo (15):</b> tempo bom para montar a proposta.</li><li><b>Modalidade (10):</b> dispensa e pregão eletrônico são as mais acessíveis.</li><li><b>Relação com o órgão (10):</b> órgão em que você já tem licitação ou plano monitorado.</li></ul><p>Documentos vencidos e situação cadastral irregular tiram pontos. A nota ajuda a priorizar e não garante ganho.</p></div></details>${pfPushHTML()}`;
}
function hubOpp(){
  const a = perfilAlerta();
  if (!a) return `<div class="card pc"><b>Receba oportunidades do seu ramo</b><p>Diga o que você vende (limpeza, hospitalar e outros), a faixa de valor, o estado e a modalidade. O app procura sozinho e avisa.</p><button class="btn sm" data-a="tab" data-t="perfil">Montar meu perfil de vendas</button></div>`;
  if (!ui.oppSeen) ui.oppSeen = new Set((a.novosLista || []).map(x => "o:" + x.k));
  const nov = x => { const k = "o:" + x.k, r = !ui.oppSeen.has(k); ui.oppSeen.add(k); return r; };
  const ref = refOf(a), l = (a.novosLista || []).map(x => ({x, sc:oppScore({v:x.v, o:x.o, uf:x.uf, m:x.m, p:x.p, cn:x.cn, g:x.g}, ref)})).sort((p, q) => q.sc.score - p.sc.score).slice(0, 5);
  return `<h2 class="gh">Minhas oportunidades</h2><div class="card"><div class="meta">${esc(alertDesc(a))}</div><div class="meta">${a.checado ? "Verificado às " + hhmm(a.checado) + "." : "Ainda não verificado."} ${a.novos ? "<b>" + a.novos + " nova" + (a.novos > 1 ? "s" : "") + ".</b>" : "Nada novo."}</div><div class="links"><button class="btn ghost sm" data-a="acAlerts">Procurar agora</button><button class="btn ghost sm" data-a="tab" data-t="perfil">Editar perfil</button></div></div>`
    + l.map(({x, sc}) => `<div class="card${nov(x) ? " novo" : ""}"><div class="top"><b>${money(x.v)}</b><span>${scoreTag(sc)} <span class="tag">${esc(x.uf)}</span></span></div><div class="meta">${esc(x.o)}</div><div class="meta">${esc(x.g)}${x.m ? ". " + esc(x.m) : ""}${x.p ? ". Propostas até " + dBR(x.p) : ""}</div><div class="links"><a class="btn ghost sm" href="${su(x.l)}" target="_blank" rel="noopener">Abrir edital</a><button class="btn sm" data-a="alItem" data-id="${a.id}" data-k="${esc(x.k)}">Salvar em Licitações</button></div>${scoreDet(sc)}</div>`).join("");
}

/* ---------- Opportunity Score ---------- */
const SC_W = {ad:30, ma:20, va:15, pr:15, mo:10, or:10};
const SC_L = {ad:"Aderência ao seu perfil", ma:"Margem potencial", va:"Valor na sua faixa", pr:"Prazo para a proposta", mo:"Modalidade", or:"Relação com o órgão"};
const SCC = new WeakMap();
const scOp = c => { const uo = c.unidadeOrgao || {}, oe = c.orgaoEntidade || {}; return {v:+c.valorTotalEstimado || 0, o:String(c.objetoCompra || ""), uf:uo.ufSigla || "", m:c.modalidadeNome || "", p:c.dataEncerramentoProposta || "", cn:oe.cnpj || "", g:oe.razaoSocial || ""}; };
function oppScore(op, ref){
  const T = norm(op.o), comps = [], add = (k, s, txt) => comps.push({k, l:SC_L[k], w:SC_W[k], s:Math.round(clampN(s, 0, 100)), txt});
  // 1. aderência ao perfil
  let ad = 55, adt = "Sem perfil configurado. Nota neutra.";
  if (ref && ref.groups && ref.groups.length){ const hits = ref.groups.filter(g => g.every(t => kwTest(T, t))).length; ad = hits ? 70 + Math.min(3, hits - 1) * 10 : 0; adt = hits ? hits + " termo" + (hits > 1 ? "s" : "") + " do seu perfil " + (hits > 1 ? "aparecem" : "aparece") + " no objeto." : "Nenhum termo do seu perfil aparece no objeto."; }
  add("ad", ad, adt);
  // 2. margem potencial (usa o radar salvo com o seu custo)
  const rd = S.radar.find(r => r.vuMed && n(r.custo) > 0 && kwFrom(r.produto).some(w => T.includes(w)));
  if (rd){ const meta = +S.cfg.margem || 15, r = calc({preco:rd.vuMed, qtd:100, custo:n(rd.custo), frete:n(rd.extra) * 100, outros:0, margem:meta}), mg = r.margem * 100;
    add("ma", mg <= 0 ? 0 : mg < meta ? 40 + 40 * (mg / meta) : Math.min(100, 80 + 20 * ((mg - meta) / (meta * 0.5))), `Margem de ${pct(r.margem)} ao preço típico do radar "${rd.produto}" (sua meta é ${meta}%).`); }
  else add("ma", 50, "Faça o radar do produto e informe o seu custo para medir a margem.");
  // 3. valor na faixa
  let va = 70, vat = "Sem faixa de valor definida.";
  if (ref && (ref.min > 0 || isFinite(ref.max))){ const lo = ref.min || 0, hi = isFinite(ref.max) ? ref.max : null;
    if (op.v < lo || (hi != null && op.v > hi)){ va = 10; vat = "Fora da sua faixa de valor."; }
    else if (hi != null && hi > lo){ const half = (hi - lo) / 2, d = Math.abs(op.v - (lo + hi) / 2) / half; va = Math.round(100 - clampN(d, 0, 1) * 40); vat = "Dentro da sua faixa de " + money(lo) + " a " + money(hi) + "."; }
    else { va = 80; vat = "Acima do seu valor mínimo."; } }
  add("va", va, vat);
  // 4. prazo
  const dias = op.p ? daysTo(String(op.p).slice(0, 10)) : null; let pr, prt;
  if (dias == null){ pr = 60; prt = "Prazo não informado."; } else if (dias < 0){ pr = 0; prt = "O prazo da proposta já passou."; } else if (dias === 0){ pr = 20; prt = "O prazo termina hoje."; } else if (dias <= 2){ pr = 50; prt = "Faltam " + dias + " dia" + (dias > 1 ? "s" : "") + ". Pouco tempo."; } else if (dias <= 10){ pr = 100; prt = "Faltam " + dias + " dias. Tempo bom."; } else if (dias <= 30){ pr = 85; prt = "Faltam " + dias + " dias."; } else { pr = 70; prt = "Faltam " + dias + " dias. Sem pressa."; }
  add("pr", pr, prt);
  // 5. modalidade
  const mk = modKey(op.m); let mo = 60, mot = op.m ? op.m + "." : "Modalidade não informada.";
  if (/pregaoeletronico|dispensa/.test(mk)){ mo = 100; mot = op.m + ": acessível para MEI, ME e EPP."; } else if (/concorrenciaeletronica/.test(mk)){ mo = 65; mot = op.m + ": exige mais documentos."; } else if (/credenciamento/.test(mk)){ mo = 55; mot = op.m + ": sem disputa de preço, volume incerto."; } else if (/presencial/.test(mk)){ mo = 45; mot = op.m + ": exige deslocamento."; } else if (/inexigibilidade/.test(mk)){ mo = 30; mot = op.m + ": só vale se você for fornecedor exclusivo."; } else if (/leilao/.test(mk)){ mo = 10; mot = op.m + ": o governo vende, não compra."; }
  add("mo", mo, mot);
  // 6. relação com o órgão
  const cn = digs(op.cn); let or = 50, ort = "Órgão novo para você.";
  if (cn && S.lic.some(l => digs(l.cnpjOrg) === cn)){ or = 100; ort = "Você já tem licitação com este órgão."; } else if (cn && S.prev.some(p => digs(p.cnpj) === cn)){ or = 85; ort = "Você monitora o plano de compras deste órgão."; }
  add("or", or, ort);
  // penalidades de regularidade
  const pen = [], dp = docProblems(), U = S.reg && S.reg.ultima;
  if (/leilao/.test(mk)) pen.push({t:"Leilão: o governo está vendendo. Você seria comprador, não fornecedor.", v:-30});
  if (dp) pen.push({t:dp + " documento" + (dp > 1 ? "s" : "") + " vencido" + (dp > 1 ? "s" : "") + " ou vencendo. Pode impedir a participação.", v:-10});
  if (U && norm(U.sit) !== "ativa") pen.push({t:"Situação cadastral do seu CNPJ: " + U.sit + ".", v:-15});
  const score = Math.round(clampN(comps.reduce((s, c) => s + c.w * c.s / 100, 0) + pen.reduce((s, p) => s + p.v, 0), 0, 100));
  return {score, comps, pen, band:score >= 80 ? {b:4, t:"Prioridade alta"} : score >= 60 ? {b:3, t:"Boa chance"} : score >= 40 ? {b:2, t:"Avaliar"} : {b:1, t:"Baixa prioridade"}};
}
const lvScore = c => { let s = SCC.get(c); if (!s){ s = oppScore(scOp(c), LV.ref); SCC.set(c, s); } return s; };
const scoreTag = sc => `<span class="tag score s${sc.band.b}" style="--p:${sc.score}" title="${esc(sc.band.t)}"><i class="anel"></i>Score ${sc.score}</span>`;
function scoreDet(sc){
  return `<details class="tut sc"><summary>Por que ${sc.score}? ${esc(sc.band.t)}</summary><div class="tb">${sc.comps.map(c => `<div class="scr"><b>${esc(c.l)}</b><span>${Math.round(c.w * c.s / 100)} de ${c.w}</span><div class="pgb" style="grid-column:1/-1;margin:2px 0"><i style="width:${c.s}%"></i></div><small style="grid-column:1/-1">${esc(c.txt)}</small></div>`).join("")}
    ${sc.pen.map(p => `<div class="scr"><b>Atenção</b><span>${p.v}</span><small style="grid-column:1/-1">${esc(p.t)}</small></div>`).join("")}<div class="hint">A nota ajuda a priorizar. Ela não garante ganho: leia o edital antes de decidir.</div></div></details>`;
}
/* ---------- plataforma: API, perfil no servidor e notificações push ---------- */
const PROD_API = {"Antecipação de recebível":"antecipacao", "Capital de giro":"capital_giro", "Seguro-garantia ou fiança":"garantia"};
const ST_API = {solicitado:"Solicitado", em_analise:"Em análise", aprovado:"Aprovado", contratado:"Contratado", recusado:"Recusado"};
async function apiFetch(path, o = {}){
  if (!S.cfg.apiUrl) throw {code:"SEM_API"};
  const tok = await fbToken(), r = await fetch(S.cfg.apiUrl.replace(/\/$/, "") + path, {method:o.method || "GET", headers:{authorization:"Bearer " + tok, ...(o.body ? {"content-type":"application/json"} : {})}, body:o.body ? JSON.stringify(o.body) : undefined});
  const j = await r.json().catch(() => ({})); if (!r.ok) throw {code:"API_" + r.status, message:j.error}; return j;
}
async function apiMe(){ const m = await apiFetch("/me"); if (m.atualizarToken){ CLOUD.exp = 0; await fbToken(); } return m; }
async function finSync(){
  const env = S.fin.ped.filter(p => !p.srv && PROD_API[p.tipo] && n(p.valor) > 0); let enviados = 0;
  for (const p of env){ const r = await apiFetch("/leads", {method:"POST", body:{valor:n(p.valor), produto:PROD_API[p.tipo], obs:String(p.obs || "").slice(0, 500)}}); p.srv = r.id; enviados++; }
  const lista = await apiFetch("/leads"); let atualizados = 0;
  lista.forEach(l => { const p = S.fin.ped.find(x => x.srv === l.id), st = ST_API[l.status]; if (p && st && p.status !== st){ (p.hist = p.hist || []).push({s:st, t:new Date().toISOString()}); p.status = st; atualizados++; } });
  save(); logEv("Pedidos sincronizados com a plataforma", enviados + " enviados, " + atualizados + " atualizados"); return {enviados, atualizados};
}
const fsEnc = v => Array.isArray(v) ? {arrayValue:{values:v.map(fsEnc)}} : typeof v === "number" ? {doubleValue:v} : typeof v === "boolean" ? {booleanValue:v} : {stringValue:String(v)};
async function fsPatch(path, campos){
  const tok = await fbToken(), f = {}; Object.keys(campos).forEach(k => { f[k] = fsEnc(campos[k]); });
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(S.cfg.fbProject)}/databases/(default)/documents/${path}`, {method:"PATCH", headers:{authorization:"Bearer " + tok, "content-type":"application/json"}, body:JSON.stringify({fields:f})});
  if (!r.ok) throw {code:"FIRESTORE_" + r.status};
}
async function fbGravaPerfil(){
  const P = S.perfil, nm = P.nichos.flatMap(x => { const nc = allNichos().find(z => z.n === x); return nc ? nc.k : []; }), palavras = nm.concat(termos(P.palavras)).join(", ");
  await fsPatch(`users/${CLOUD.uid}/perfil/principal`, {palavras, exclui:String(P.exclui || ""), valorMin:n(P.vmin) || 0, valorMax:n(P.vmax) || 0, ufs:P.ufs.slice(), modalidades:P.mods.slice(), atualizadoEm:new Date().toISOString()});
}
async function pushAtiva(){
  const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
  if (!P) throw {code:"SEM_PLUGIN"}; if (!CLOUD.uid) throw {code:"SEM_SESSAO"}; if (!S.cfg.fbProject) throw {code:"NAO_CONFIGURADO"};
  const perm = await P.requestPermissions(); if (perm.receive !== "granted") throw {code:"NEGADO"};
  return new Promise((ok, no) => {
    P.addListener("registration", async t => { try{ const tok = String(t.value), id = tok.slice(-40).replace(/[^A-Za-z0-9_-]/g, "_"); await fsPatch(`users/${CLOUD.uid}/tokens/${id}`, {token:tok, plataforma:(window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : ""), atualizadoEm:new Date().toISOString()}); await fbGravaPerfil().catch(() => {}); S.sec.push = true; save(); logEv("Notificações push ativadas", ""); ok(); }catch(e){ no(e); } });
    P.addListener("registrationError", e => no({code:"REG", message:e && e.error}));
    P.addListener("pushNotificationReceived", nt => { toast((nt && nt.title) || "Nova oportunidade no seu perfil"); });
    P.register();
  });
}
const pushMsg = e => ({SEM_PLUGIN:"As notificações com o app fechado funcionam só no aplicativo instalado.", SEM_SESSAO:"Entre na nuvem primeiro (Mais, Segurança e acesso).", NAO_CONFIGURADO:"Falta o ID do projeto do Firebase.", NEGADO:"A permissão de notificações foi negada. Libere nas configurações do celular."})[e && e.code] || (e && /^FIRESTORE_/.test(e.code || "") ? "O Firestore recusou o envio (" + e.code.slice(10) + "). Confira as regras." : "Não foi possível ativar as notificações.");
function pfPushHTML(){
  const nativo = !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications);
  return `<div class="card"><div class="top"><b>Alertas com o app fechado</b><span class="tag ${S.sec.push ? "ok" : ""}">${S.sec.push ? "Ativos" : "Desligados"}</span></div><p class="sub" style="margin:4px 0 8px">O servidor procura oportunidades do seu perfil a cada 15 minutos e avisa por notificação no celular, mesmo com o app fechado. Precisa do aplicativo instalado e da conta na nuvem.</p>${PUSHST.msg ? `<div class="hint">${esc(PUSHST.msg)}</div>` : ""}<div class="actions"><button class="btn${S.sec.push ? " ghost" : ""}" data-a="pushLiga"${nativo ? "" : " disabled"}>${S.sec.push ? "Ativar de novo" : "Ativar no celular"}</button><button class="btn ghost" data-a="pfNuvem">Enviar o perfil ao servidor</button></div>${nativo ? "" : '<div class="hint">Disponível só no aplicativo instalado.</div>'}</div>`;
}
const PUSHST = {msg:""};
/* ---------- Financial Hub ---------- */
const FIN_TIPOS = ["Antecipação de recebível", "Capital de giro", "Seguro-garantia ou fiança"];
const FIN_ST = ["Solicitado", "Em análise", "Aprovado", "Contratado", "Recusado"];
const FIN = {aba:"produtos", sim:{tipo:FIN_TIPOS[0], valor:"", dias:"60", parcelas:"1", taxa:"", tarifas:"", iof:"", metodo:"composto", inst:""}};
function irrM(fl){ const f = r => fl.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0); if (f(0) >= 0) return 0; let lo = 0, hi = 1; while (f(hi) < 0 && hi < 1e4) hi *= 2; if (f(hi) < 0) return null; for (let i = 0; i < 100; i++){ const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; } return (lo + hi) / 2; }
function calcProp(p){
  const V = n(p.valor), i = n(p.taxa) / 100, tar = n(p.tarifas), iof = n(p.iof), np = Math.max(1, Math.round(n(p.parcelas) || 1)), dias = n(p.dias);
  if (!(V > 0)) return null;
  if (p.tipo === FIN_TIPOS[2]){ const c = V * i * (dias / 365) + tar + iof; return {custo:c, pctV:c / V, garantia:true}; }
  if (p.tipo === FIN_TIPOS[1] && np > 1){
    const pmt = i > 0 ? V * i / (1 - Math.pow(1 + i, -np)) : V / np, liq = V - tar - iof, fl = [liq]; for (let k = 0; k < np; k++) fl.push(-pmt);
    const cet = irrM(fl); return {liq, custo:pmt * np - liq, total:pmt * np, parcela:pmt, cetM:cet, cetA:cet != null ? Math.pow(1 + cet, 12) - 1 : null, pctV:(pmt * np - liq) / V};
  }
  const t = dias / 30, juros = p.metodo === "simples" ? V * i * t : V * (1 - 1 / Math.pow(1 + i, t)), liq = V - juros - tar - iof, cetM = liq > 0 && t > 0 ? Math.pow(V / liq, 1 / t) - 1 : null;
  return {liq, custo:V - liq, total:V, parcela:null, cetM, cetA:cetM != null ? Math.pow(1 + cetM, 12) - 1 : null, pctV:(V - liq) / V};
}
const pc2 = v => v == null || !isFinite(v) ? "-" : pct(v);
function finRes(p){
  const r = calcProp(p); if (!r) return `<div class="hint">Digite o valor, o prazo e a taxa para ver o custo.</div>`;
  if (r.garantia) return `<div class="kpis"><div class="kpi"><small>Custo da garantia</small><b>${money(r.custo)}</b></div><div class="kpi"><small>% do valor garantido</small><b>${pc2(r.pctV)}</b></div></div>`;
  return `<div class="kpis"><div class="kpi"><small>Você recebe</small><b>${money(r.liq)}</b></div><div class="kpi"><small>Custo total</small><b>${money(r.custo)}</b></div><div class="kpi"><small>Custo efetivo ao mês</small><b>${pc2(r.cetM)}</b></div><div class="kpi"><small>Custo efetivo ao ano</small><b>${pc2(r.cetA)}</b></div></div>${r.parcela ? `<div class="hint" style="margin-top:6px">Parcela de ${money(r.parcela)} por mês. Total pago ${money(r.total)}.</div>` : ""}`;
}
const finFields = () => [
  {k:"inst", l:"Instituição"}, {k:"tipo", l:"Produto", t:"sel", o:FIN_TIPOS.map(x => [x, x])}, {k:"valor", l:"Valor (R$)", t:"money", w:"half"}, {k:"dias", l:"Prazo até receber ou vencer (dias)", t:"num", w:"half"},
  {k:"parcelas", l:"Parcelas (capital de giro)", t:"num", w:"half"}, {k:"taxa", l:"Taxa (% ao mês; garantia: % ao ano)", t:"num", w:"half"}, {k:"tarifas", l:"Tarifas (R$)", t:"money", w:"half"}, {k:"iof", l:"IOF (R$)", t:"money", w:"half"},
  {k:"metodo", l:"Desconto", t:"sel", o:[["composto", "Composto"], ["simples", "Simples"]]}, {k:"obs", l:"Observações", t:"area"}];
function editProp(id, pre){
  const cur = id ? S.fin.prop.find(x => x.id === id) : null;
  openForm({title:cur ? "Editar proposta" : "Nova proposta", fields:finFields(), vals:cur || {tipo:FIN_TIPOS[0], dias:60, parcelas:1, metodo:"composto", ...pre},
    check: v => !v.inst ? "Informe a instituição." : !(v.valor > 0) ? "Informe o valor." : "",
    save: v => { if (cur) Object.assign(cur, v); else S.fin.prop.unshift({id:uid(), ...v}); },
    del: cur ? () => { S.fin.prop = S.fin.prop.filter(x => x.id !== id); } : null});
}
const pedFin = () => [
  {k:"inst", l:"Instituição"}, {k:"tipo", l:"Produto", t:"sel", o:FIN_TIPOS.map(x => [x, x])}, {k:"valor", l:"Valor (R$)", t:"money", w:"half"},
  {k:"status", l:"Situação", t:"sel", o:FIN_ST.map(x => [x, x]), w:"half"}, {k:"licId", l:"Licitação ou contrato", t:"sel", o:[["", "Nenhuma"], ...S.lic.map(x => [x.id, (x.numero ? x.numero + " - " : "") + (x.objeto || x.orgao || "Licitação")])]}, {k:"obs", l:"Observações", t:"area"}];
function editPedFin(id, pre){
  const cur = id ? S.fin.ped.find(x => x.id === id) : null;
  openForm({title:cur ? "Editar pedido de crédito" : "Novo pedido de crédito", fields:pedFin(), vals:cur || {tipo:FIN_TIPOS[0], status:"Solicitado", ...pre},
    check: v => !v.inst ? "Informe a instituição." : "",
    save: v => { const now = new Date().toISOString(); logEv(cur ? "Pedido de crédito atualizado" : "Pedido de crédito criado", v.inst + ", " + v.tipo); if (cur){ if (v.status !== cur.status) (cur.hist = cur.hist || []).push({s:v.status, t:now}); Object.assign(cur, v); } else S.fin.ped.unshift({id:uid(), ...v, criado:now, hist:[{s:v.status, t:now}]}); },
    del: cur ? () => { S.fin.ped = S.fin.ped.filter(x => x.id !== id); } : null});
}
const parcFields = () => [{k:"nome", l:"Instituição"}, {k:"tipo", l:"Tipo", t:"sel", o:["Banco público", "Banco privado", "Cooperativa de crédito", "Fintech", "Plataforma de antecipação", "Seguradora ou corretora", "Outra"].map(x => [x, x])}, {k:"produtos", l:"O que oferece"}, {k:"tel", l:"WhatsApp ou telefone", w:"half"}, {k:"email", l:"E-mail", w:"half"}, {k:"site", l:"Site"}, {k:"obs", l:"Observações", t:"area"}];
function editParc(id, pre){
  const cur = id ? S.fin.parc.find(x => x.id === id) : null;
  openForm({title:cur ? "Editar instituição" : "Nova instituição", fields:parcFields(), vals:cur || {tipo:"Banco privado", ...pre},
    check: v => !v.nome ? "Informe o nome." : (v.site && !/^https?:\/\//.test(v.site)) ? "O site deve começar com https://" : "",
    save: v => { if (cur) Object.assign(cur, v); else S.fin.parc.unshift({id:uid(), ...v}); },
    del: cur ? () => { S.fin.parc = S.fin.parc.filter(x => x.id !== id); } : null});
}
function finMsg(p){
  const l = S.lic.find(x => x.id === p.licId), E = S.empresa;
  return `Olá! Sou ${E.razao || "(nome da empresa)"}${E.cnpj ? ", CNPJ " + E.cnpj : ""}${E.cidade ? ", de " + E.cidade + (E.uf ? "/" + E.uf : "") : ""}.\nGostaria de uma proposta de ${p.tipo.toLowerCase()} de ${money(n(p.valor))}.${l ? "\nTenho " + (l.numero ? "o contrato/licitação " + l.numero + " com " : "contrato com ") + (l.orgao || "o órgão") + (l.objeto ? " para " + l.objeto : "") + "." : ""}\nPor favor, informe a taxa, o custo efetivo total (CET), as tarifas, os documentos necessários e o prazo de liberação.${p.tipo === FIN_TIPOS[0] ? "\nO edital permite a cessão de crédito." : ""}`;
}
const FIN_PROD = [
  ["Antecipação de contrato público (AntecipaGov)", true, `<p><b>O que é:</b> um portal do Governo Federal em que quem tem contrato ativo com a Administração Pública pede antecipação de crédito. Bancos, fintechs e outras instituições credenciadas mandam propostas, como em um leilão de crédito, e você compara. O contrato é a garantia, por cessão fiduciária do direito de receber. Dá para antecipar até 70% do que falta receber.</p>
   <h4>Passo a passo</h4><ol><li>Veja se o edital e o contrato <b>permitem a cessão de crédito</b>. Sem isso, não dá.</li><li>Tenha um contrato ativo ou um empenho com força de contrato. Ata de registro de preços sozinha não vale.</li><li>Entre no AntecipaGov (Mais, Portais) e peça uma cotação, informando o contrato.</li><li>O gestor do contrato valida o pedido.</li><li>As instituições credenciadas enviam propostas com prazos e taxas diferentes.</li><li>Compare o <b>custo efetivo total</b> (use o simulador abaixo) e escolha.</li><li>Assine, e a instituição passa a receber o pagamento do órgão em vez de você, até quitar.</li></ol>
   <p class="sub" style="margin:6px 0 0">As instituições decidem o crédito e as taxas. O portal cobra delas uma taxa de uso, não de você.</p>`],
  ["Antecipação de nota fiscal ou duplicata", false, `<p>Bancos, fintechs e fundos antecipam notas fiscais que você emitiu e o órgão ainda vai pagar. Funciona melhor depois do <b>ateste</b>, quando o órgão já reconheceu a entrega. Pergunte se a instituição aceita receber contra o governo, e veja se o contrato permite a cessão.</p><ul><li>Compare a taxa ao mês e todas as tarifas.</li><li>Pergunte quem recebe do órgão e como você é avisado.</li></ul>`],
  ["Capital de giro e Pronampe", false, `<p>É dinheiro para comprar estoque, pagar fornecedor e frete enquanto o governo não paga. Micro e pequenas empresas, incluindo MEI, podem usar o <b>Pronampe</b>, linha federal com garantia do FGO. O limite se baseia na receita bruta anual, e os juros têm teto ligado à Selic. As condições mudam, então confirme no banco.</p>
   <h4>Como pedir</h4><ol><li>Tenha o CNPJ ativo e a situação fiscal em dia.</li><li>No e-CAC da Receita Federal, autorize o compartilhamento do seu faturamento com o banco escolhido.</li><li>Peça a linha ao banco e passe pela análise de crédito.</li><li>Compare o custo efetivo com o de outras ofertas.</li></ol>`],
  ["Garantias para licitar: seguro-garantia e fiança", false, `<p>Alguns editais exigem garantia. A <b>garantia de proposta</b> pode ser pedida até 1% do valor estimado. A <b>garantia de execução</b> do contrato pode ser caução em dinheiro, <b>seguro-garantia</b>, <b>fiança bancária</b> ou título de capitalização. Em obras e engenharia, o percentual costuma ser de 5%, podendo chegar a 10%. Confira no edital.</p><ul><li>Seguradoras e corretoras emitem o seguro-garantia. Bancos emitem a fiança.</li><li>Peça cotação a mais de uma e compare o custo pelo simulador.</li></ul>`],
  ["Qual produto usar", false, `<div class="tw"><table class="tbl"><tbody><tr><td><b>Ganhei e vou demorar a receber</b></td><td>Antecipação de contrato ou de nota</td></tr><tr><td><b>Preciso comprar estoque antes de receber</b></td><td>Capital de giro ou Pronampe</td></tr><tr><td><b>O edital pede garantia</b></td><td>Seguro-garantia ou fiança</td></tr><tr><td><b>Quero a melhor oferta</b></td><td>Compare em Simular e comparar</td></tr></tbody></table></div>`],
  ["Cuidados antes de contratar", false, `<ul><li>Compare sempre o <b>custo efetivo total</b>, não só a taxa.</li><li>Só contrate com instituições autorizadas pelo Banco Central. Você confere no site do Banco Central.</li><li>Desconfie de quem pede pagamento antecipado para liberar o crédito. É golpe comum.</li><li>Leia o contrato: multas, vencimento antecipado e quem avisa o órgão.</li><li>Não antecipe mais do que precisa. Cada real antecipado tem custo.</li></ul>`]
];
const FIN_DIR = [
  ["AntecipaGov", "Plataforma de antecipação", "Portal do Governo Federal. As instituições credenciadas mandam propostas.", "https://antecipagov.comprasnet.gov.br"],
  ["Banco do Brasil", "Banco público", "Citado em matérias como operador do Pronampe. Confirme condições na agência.", "https://www.bb.com.br"],
  ["Caixa Econômica Federal", "Banco público", "Citada em matérias como operadora do Pronampe. Confirme condições.", "https://www.caixa.gov.br"],
  ["Bradesco", "Banco privado", "Citado em matérias como operador do Pronampe. Confirme condições.", "https://www.bradesco.com.br"],
  ["Itaú", "Banco privado", "Citado em matérias como operador do Pronampe. Confirme condições.", "https://www.itau.com.br"],
  ["Santander", "Banco privado", "Citado em matérias como operador do Pronampe. Confirme condições.", "https://www.santander.com.br"],
  ["Sicoob", "Cooperativa de crédito", "Citado em matérias como operador do Pronampe. Confirme condições.", "https://www.sicoob.com.br"],
  ["Banco Inter", "Fintech", "Banco digital citado em matérias como operador do Pronampe. Confirme condições.", "https://inter.co"]
];
function finHTML(){
  const A = FIN.aba;
  if (A === "mercado") return finMkHTML();
  if (A === "operador") return finOpHTML();
  if (A === "produtos") return FIN_PROD.map(([t, o, b]) => `<details class="tut"${o ? " open" : ""}><summary>${t}</summary><div class="tb">${b}</div></details>`).join("") + `<div class="note2"><b>Transparência:</b> nesta versão o Licita Lance Certo não tem parceiros financeiros ativos e não recebe comissão. As instituições listadas são exemplos para você pesquisar, e todas as condições são definidas por elas. Se houver parceria no futuro, o app vai avisar aqui antes de qualquer contratação.</div>`;
  if (A === "simular"){
    const s = FIN.sim, F = (k, l, ph, half = true, mode = "decimal") => `<div class="f${half ? " half" : ""}"><label for="fs_${k}">${l}</label><input id="fs_${k}" data-fs="${k}" inputmode="${mode}" autocomplete="off" placeholder="${ph}" value="${esc(s[k])}"></div>`;
    const grupos = {}; S.fin.prop.forEach(p => (grupos[p.tipo] = grupos[p.tipo] || []).push(p));
    return `<div class="card"><b>Simulador</b><div class="fg" style="margin-top:8px"><div class="f"><label for="fs_tipo">Produto</label><select id="fs_tipo" data-fs="tipo">${FIN_TIPOS.map(x => `<option${s.tipo === x ? " selected" : ""}>${x}</option>`).join("")}</select></div>
      ${F("valor", "Valor (R$)", "25.000")}${F("dias", "Prazo até receber (dias)", "60")}${F("parcelas", "Parcelas (capital de giro)", "1")}${F("taxa", s.tipo === FIN_TIPOS[2] ? "Taxa (% ao ano)" : "Taxa (% ao mês)", "2,5")}${F("tarifas", "Tarifas (R$)", "0")}${F("iof", "IOF (R$)", "0")}
      <div class="f"><label for="fs_metodo">Desconto (antecipação)</label><select id="fs_metodo" data-fs="metodo"><option value="composto"${s.metodo === "composto" ? " selected" : ""}>Composto</option><option value="simples"${s.metodo === "simples" ? " selected" : ""}>Simples</option></select></div>
      <div class="f"><label for="fs_inst">Instituição (para salvar)</label><input id="fs_inst" data-fs="inst" autocomplete="off" value="${esc(s.inst)}"></div></div>
      <div id="finRes" style="margin-top:8px">${finRes(s)}</div><div class="actions"><button class="btn" data-a="finSalva">Salvar na comparação</button></div></div>
      ${Object.keys(grupos).map(t => { const l = grupos[t].map(p => ({p, r:calcProp(p)})).filter(x => x.r), key = x => x.r.garantia ? x.r.custo : (x.r.cetM == null ? 9e9 : x.r.cetM), min = l.length ? Math.min(...l.map(key)) : 0;
        return `<div class="card"><b>${esc(t)}</b><div class="tw"><table class="tbl fr"><thead><tr><th>Instituição</th><th>${t === FIN_TIPOS[2] ? "Custo" : "Recebe"}</th><th>${t === FIN_TIPOS[2] ? "% valor" : "Custo"}</th><th>${t === FIN_TIPOS[2] ? "" : "CET a.m."}</th></tr></thead><tbody>${l.sort((a, b) => key(a) - key(b)).map(x => `<tr class="${l.length > 1 && key(x) === min ? "hit" : ""}" data-a="editProp" data-id="${x.p.id}" tabindex="0" role="button"><td><b>${esc(x.p.inst)}</b>${l.length > 1 && key(x) === min ? '<span class="tag ok">Menor custo</span>' : ""}<small>${money(n(x.p.valor))}, ${n(x.p.dias)} dias</small></td><td>${x.r.garantia ? bt(x.r.custo) : bt(x.r.liq)}</td><td>${x.r.garantia ? pc2(x.r.pctV) : bt(x.r.custo)}</td><td>${x.r.garantia ? "" : pc2(x.r.cetM)}</td></tr>`).join("")}</tbody></table></div></div>`; }).join("")}
      <div class="note2">O cálculo é uma estimativa com os dados que você informa. Use desconto composto ou simples conforme a proposta. O custo efetivo real depende do contrato. Peça o CET à instituição.</div>`;
  }
  if (A === "pedidos"){
    return `<div class="actions" style="margin-top:0"><button class="btn" data-a="newPedFin">Novo pedido de crédito</button>${S.cfg.apiUrl && CLOUD.uid ? '<button class="btn ghost" data-a="finSync">Sincronizar com a plataforma</button>' : ""}</div>${FIN.sync ? `<div class="hint">${esc(FIN.sync)}</div>` : ""}` + (S.fin.ped.length ? S.fin.ped.map(p => `<div class="card"><div class="item" data-a="editPedFin" data-id="${p.id}" tabindex="0" role="button"><div class="top"><b>${esc(p.inst)}</b><span class="tag ${p.status === "Contratado" || p.status === "Aprovado" ? "ok" : p.status === "Recusado" ? "bd" : "wn"}">${esc(p.status)}</span></div><div class="meta">${esc(p.tipo)}, ${money(n(p.valor))}</div></div>
      <div class="links"><button class="btn ghost sm" data-a="finCopia" data-id="${p.id}">Copiar mensagem de pedido</button>${FIN_ST.indexOf(p.status) < 3 ? `<button class="btn sm" data-a="finNext" data-id="${p.id}">Avançar: ${FIN_ST[FIN_ST.indexOf(p.status) + 1]}</button>` : ""}</div></div>`).join("") : `<div class="card empty">Nenhum pedido. Peça propostas e acompanhe aqui cada pedido, da solicitação até a contratação.</div>`);
  }
  if (A === "inst"){
    const mine = S.fin.parc;
    return `<div class="actions" style="margin-top:0"><button class="btn" data-a="newParc">Nova instituição</button></div>
      ${mine.length ? `<h2 class="gh">Minha lista</h2>` + mine.map(x => { const tel = cnpjDig(x.tel); return `<div class="card"><div class="item" data-a="editParc" data-id="${x.id}" tabindex="0" role="button"><div class="top"><b>${esc(x.nome)}</b><span class="tag">${esc(x.tipo)}</span></div><div class="meta">${esc(x.produtos || "")}</div></div><div class="links"><button class="btn sm" data-a="finPedir" data-n="${esc(x.nome)}">Pedir proposta</button>${tel ? `<a class="btn ghost sm" href="https://wa.me/55${tel}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${/^https?:\/\//.test(x.site || "") ? `<a class="btn ghost sm" href="${su(x.site)}" target="_blank" rel="noopener">Site</a>` : ""}</div></div>`; }).join("") : ""}
      <h2 class="gh">Onde pesquisar</h2>${FIN_DIR.map(([nm, tp, d, u]) => `<div class="card pc"><b>${nm}</b> <span class="tag">${tp}</span><p>${d}</p><div class="links" style="margin:0"><a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">Abrir site</a><button class="btn ghost sm" data-a="newParc" data-n="${esc(nm)}" data-t="${esc(tp)}" data-s="${u}">Salvar na minha lista</button></div></div>`).join("")}
      <div class="note2">Esta lista é só um ponto de partida, não é recomendação. Cada instituição define o crédito, a taxa e as condições. Fintechs e financeiras também podem entrar na sua lista: cadastre as que você conhece.</div>`;
  }
  return `<details class="tut" open><summary>O que é o Open Finance</summary><div class="tb"><p>É o sistema do Banco Central que permite compartilhar dados e serviços financeiros entre instituições autorizadas, <b>com o seu consentimento</b>. Você escolhe o que compartilhar, com quem e por quanto tempo, e pode cancelar quando quiser.</p><ul><li>Com os seus dados, uma instituição pode oferecer crédito mais barato ou adequado ao seu movimento.</li><li>Também permite iniciar pagamentos por outro aplicativo.</li></ul></div></details>
    <details class="tut"><summary>Como ficaria no Licita Lance Certo</summary><div class="tb"><ol><li>Você escolhe o banco e autoriza o compartilhamento dos seus dados.</li><li>O app mostra ofertas de crédito e antecipação com base no seu movimento e nos seus contratos públicos.</li><li>Você compara o custo efetivo e contrata na instituição.</li><li>Você pode cancelar o consentimento a qualquer momento.</li></ol></div></details>
    <details class="tut"><summary>O que ainda falta</summary><div class="tb"><ul><li>O app <b>ainda não está conectado</b> ao Open Finance.</li><li>Para participar é preciso ser instituição autorizada pelo Banco Central ou trabalhar em parceria com uma que seja.</li><li>É preciso cumprir a LGPD, ter política de privacidade, consentimento claro e segurança dos dados.</li><li>Nesta versão, você pode pedir o compartilhamento direto nas instituições e usar o simulador para comparar.</li></ul></div></details>`;
}
function finDraw(){ const o = $("#finOut"); if (o) o.innerHTML = finHTML(); }
function viewFin(m){
  m.innerHTML = `<h1>Financial Hub</h1><p class="sub">Crédito, antecipação de recebíveis e garantias para quem vende ao governo. Compare, simule e acompanhe seus pedidos.</p>
  <div class="chips">${[["produtos", "Produtos"], ["mercado", "Marketplace"], ["simular", "Simular e comparar"], ["pedidos", "Meus pedidos"], ["inst", "Instituições"], ["open", "Open Finance"]].concat(can("comissao.ver") ? [["operador", "Operador"]] : []).map(([k, t]) => `<button class="chip${FIN.aba === k ? " on" : ""}" data-a="finAba" data-v="${k}">${t}</button>`).join("")}</div><div id="finOut">${finHTML()}</div>`;
}

/* ---------- IA: conversa com o edital, resumo e robô assistente ---------- */
const AI = {cap:null, pronto:false};
(async () => { try{ if (window.claude && typeof window.claude.use === "function") AI.cap = await window.claude.use("sample"); }catch(e){ AI.cap = null; } AI.pronto = true; try{ iaDraw(); }catch(e){} })();
const aiModo = () => AI.cap ? "claude" : ((S.cfg || {}).aiProxy ? "proxy" : ((S.cfg || {}).aiKey ? "chave" : "nenhum"));
const AI_NOMES = {claude:"Claude da sua conta (este site)", proxy:"Servidor intermediário próprio", chave:"Chave da API da Anthropic neste aparelho", nenhum:"Sem conexão"};
const AI_MODELOS = [["claude-fable-5-1", "Máxima precisão (recomendado para editais)"], ["claude-opus-5-5", "Alta precisão"], ["claude-sonnet-5-5", "Equilibrado"], ["claude-haiku-5-5", "Rápido e econômico"]];
const aiCadeia = () => { const ordem = AI_MODELOS.map(x => x[0]), sel = (S.cfg || {}).aiModel; return sel && ordem.includes(sel) ? ordem.slice(ordem.indexOf(sel)) : sel ? [sel] : ordem; };
async function askAI(turns, o = {}){
  if (!can("ia.usar")) throw {code:"sem_permissao"};
  const modo = aiModo(), system = o.system || "Responda em português do Brasil, em linguagem simples e direta.";
  if (modo === "claude"){
    const t = turns.map(x => ({role:x.role, content:x.content})); t[0] = {role:"user", content:system + "\n\n---\n\n" + t[0].content};
    const r = await AI.cap(t, {cache:false, signal:o.signal, modelTier:o.tier || "default", onText:o.onText ? (x => o.onText(x.text)) : undefined});
    return r.text;
  }
  if (modo === "proxy" || modo === "chave"){
    const msgs = turns.map((x, i) => ({role:x.role, content:(i === 0 && o.docs && o.docs.length) ? o.docs.map(d => ({type:"document", source:{type:"base64", media_type:"application/pdf", data:d.b64}, cache_control:{type:"ephemeral"}})).concat([{type:"text", text:x.content}]) : x.content}));
    const headers = {"content-type":"application/json"};
    if (modo === "chave"){ headers["x-api-key"] = S.cfg.aiKey; headers["anthropic-version"] = "2023-06-01"; headers["anthropic-dangerous-direct-browser-access"] = "true"; }
    else if (S.cfg.aiToken) headers.authorization = "Bearer " + S.cfg.aiToken;
    let ult = null;
    for (const model of aiCadeia()){
      const body = {model, max_tokens:o.maxTokens || 4096, system, messages:msgs}; if (o.web){ if (modo === "proxy") body.web = true; else body.tools = [{type:"web_search_20250305", name:"web_search", max_uses:5}]; }
      const r = await fetch(modo === "proxy" ? S.cfg.aiProxy : "https://api.anthropic.com/v1/messages", {method:"POST", headers, body:JSON.stringify(body), signal:o.signal});
      if (!r.ok){ let m = ""; try{ const j = await r.json(); m = (j.error && j.error.message) || j.message || ""; }catch(e){} const er = {code:"http_" + r.status, message:m}; if (r.status === 404 || (r.status === 400 && /model/i.test(m))){ ult = er; continue; } throw er; }
      const j = await r.json(), text = typeof j.text === "string" ? j.text : (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      ui.aiUsado = j.model || model; if (o.onText) o.onText(text); return text;
    }
    throw ult || {code:"http_404", message:"modelo não encontrado"};
  }
  throw {code:"sem_ia"};
}
function aiErr(e){
  const c = e && e.code;
  if (c === "cancelled") return "";
  if (c === "sem_permissao") return "Seu papel não permite usar a IA.";
  if (c === "sem_ia") return "Falta conectar a IA. Abra Mais, Editais e assistente, e configure a conexão.";
  if (c === "not_granted") return "Você não liberou o uso do Claude para este app.";
  if (c === "rate_limited" || c === "http_429") return "Muitas perguntas em pouco tempo, ou o limite de uso acabou. Tente mais tarde.";
  if (c === "session_expired") return "Entre de novo na sua conta Claude e tente outra vez.";
  if (c === "sampling_disabled") return "O Claude não está disponível nesta conta.";
  if (c === "prompt_too_large") return "O texto ficou grande demais para uma pergunta. Tente uma pergunta mais específica.";
  if (c === "http_401" || c === "http_403") return "A chave ou o acesso foi recusado. Confira a configuração da IA.";
  if (/^http_/.test(c || "")) return "A IA respondeu com erro" + (e.message ? ": " + e.message : "") + ".";
  return "Não foi possível falar com a IA agora. Confira a internet e a configuração.";
}
function jsonLoose(t){
  const s = String(t || "").trim(); try{ return JSON.parse(s); }catch(e){}
  const f = /```(?:json)?\s*([\s\S]*?)```/.exec(s); if (f){ try{ return JSON.parse(f[1]); }catch(e){} }
  const a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a >= 0 && b > a){ try{ return JSON.parse(s.slice(a, b + 1)); }catch(e){} }
  return null;
}
/* armazenamento do texto dos editais (IndexedDB, separado dos dados do app) */
const idb = (() => { let p; const open = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open("lancecerto-editais", 1); r.onupgradeneeded = () => r.result.createObjectStore("txt"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction("txt", mode), q = fn(t.objectStore("txt")); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return {put:(k, v) => tx("readwrite", s => s.put(v, k)), get:k => tx("readonly", s => s.get(k)), del:k => tx("readwrite", s => s.delete(k))}; })();
const ED = {sel:"", busy:false, prog:"", err:"", msgs:{}, ctrl:null, txt:{}, pdf:{}, pdfPend:null, novo:{titulo:"", texto:"", licId:""}, chatBusy:false};
const edKey = id => String(KEY) + ":" + id;
async function edTexto(id){ if (ED.txt[id] != null) return ED.txt[id]; let t = ""; try{ t = (await idb.get(edKey(id))) || ""; }catch(e){} ED.txt[id] = t; return t; }
/* leitura de arquivos */
const b64de = buf => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
function loadScript(src){ return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("script")); document.head.appendChild(s); }); }
async function pdfLib(){
  if (!window.pdfjsLib){ await loadScript(PDFJS + "pdf.min.js"); for (let i = 0; i < 60 && !window.pdfjsLib; i++) await new Promise(r => setTimeout(r, 100)); }
  const l = window.pdfjsLib; if (!l) throw new Error("pdfjs"); try{ l.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; }catch(e){} return l;
}
async function pdfTexto(buf, onProg){
  const lib = await pdfLib(), doc = await lib.getDocument({data:buf}).promise, out = [];
  for (let i = 1; i <= doc.numPages; i++){ const pg = await doc.getPage(i), tc = await pg.getTextContent();
    out.push(tc.items.map(x => x.str + (x.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim()); if (onProg) onProg(i, doc.numPages); }
  return out.join("\n\n");
}
const htmlTxt = h => { try{ const d = new DOMParser().parseFromString(h, "text/html"); d.querySelectorAll("script,style,noscript").forEach(e => e.remove()); return (d.body.innerText || d.body.textContent || "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim(); }catch(e){ return String(h).replace(/<[^>]+>/g, " "); } };
async function lerArquivo(f, onProg){
  const nome = (f.name || "").toLowerCase();
  if (nome.endsWith(".pdf") || f.type === "application/pdf"){ const buf = await f.arrayBuffer(); ED.pdfPend = buf.byteLength <= 25e6 ? b64de(buf) : null; return pdfTexto(buf.slice(0), onProg); }
  if (/\.(txt|md|csv|html?)$/.test(nome) || /^text\//.test(f.type)){ const t = await f.text(); return /\.html?$/.test(nome) ? htmlTxt(t) : t; }
  throw {code:"formato"};
}
const fatia = (t, max) => { const ps = t.split(/\n{2,}/), out = []; let cur = ""; for (const p of ps){ if (cur && (cur + "\n\n" + p).length > max){ out.push(cur); cur = p; } else cur = cur ? cur + "\n\n" + p : p; } if (cur) out.push(cur); return out.flatMap(c => c.length > max * 1.4 ? c.match(new RegExp("[\\s\\S]{1," + max + "}", "g")) : [c]); };
/* resumo estruturado */
const ESQ = `{"identificacao":{"orgao":"","modalidade":"","numero":"","objeto":"","valor_estimado":"","proposta_ate":"","abertura_sessao":""},
"requisitos_participacao":[{"texto":"","ref":""}],
"documentos_exigidos":{"habilitacao_juridica":[{"texto":"","ref":""}],"regularidade_fiscal_social_trabalhista":[{"texto":"","ref":""}],"qualificacao_economico_financeira":[{"texto":"","ref":""}],"qualificacao_tecnica":[{"texto":"","ref":""}],"declaracoes":[{"texto":"","ref":""}],"outros":[{"texto":"","ref":""}]},
"itens":[{"item":"","descricao_completa":"","quantidade":"","unidade":"","valor_referencia":"","marca_modelo":"","garantia":"","normas_certificacoes":"","ref":""}],
"entrega":{"prazo":"","local":"","condicoes":"","ref":""},
"catalogo_amostra":{"catalogo":"sim|nao|nao_informado","amostra":"sim|nao|nao_informado","detalhes":"","prazo":"","ref":""},
"pagamento":{"prazo":"","forma":"","condicoes":"","retencoes_reajuste":"","garantia_contratual":"","ref":""},
"desclassificacao":[{"texto":"","ref":""}],
"alertas":[""]}`;
const P_EXTRAI = `Você analisa editais de licitação e contratação direta do Brasil para um pequeno fornecedor.
Leia o TRECHO do edital abaixo e extraia só o que está escrito nele. NÃO invente nada. O que não aparecer neste trecho fica como texto vazio ("") ou lista vazia.
Responda SOMENTE com um JSON válido neste formato:
${ESQ}
Regras:
- "ref" é o número do item ou da cláusula onde a informação aparece (por exemplo "9.2"), quando estiver visível.
- Em "itens", copie TODAS as especificações técnicas de cada item, sem resumir: dimensões, capacidade, material, cor, tipo de fixação, compatibilidade com refil ou consumível, normas, marca ou modelo de referência e garantia.
- Em "documentos_exigidos", liste cada documento separadamente.
- Em "desclassificacao", liste cada motivo de desclassificação, inabilitação, recusa da proposta ou penalidade.
- Em "alertas", aponte pontos que podem eliminar o fornecedor ou custar dinheiro (amostra, prazo curto, exigência incomum, garantia, visita técnica).
- Frases curtas, em português.`;
const P_EXTRAI_PDF = P_EXTRAI.replace("Leia o TRECHO do edital abaixo e extraia só o que está escrito nele.", "Leia o edital em PDF anexo, do começo ao fim, incluindo tabelas, anexos e termo de referência, e extraia só o que está escrito nele.").replace("neste trecho", "neste edital");
const P_JUNTA = `Os JSONs abaixo foram extraídos de trechos diferentes do MESMO edital. Junte tudo em um único JSON, no mesmo formato, sem duplicar itens. Mantenha todas as especificações dos itens e todas as referências. Se dois trechos divergirem, mantenha as duas versões em "alertas". Responda SOMENTE com o JSON.`;
const arr = v => Array.isArray(v) ? v : (v ? [v] : []);
const tx = v => v == null ? "" : typeof v === "string" ? v : (typeof v === "object" ? Object.values(v).map(tx).filter(Boolean).join("; ") : String(v));
const lst = v => arr(v).map(x => typeof x === "string" ? {texto:x, ref:""} : {texto:tx(x.texto || x), ref:tx(x.ref)}).filter(x => x.texto);
async function edAnalisa(id){
  if (ED.busy) return; const ed = S.editais.find(x => x.id === id); if (!ed) return;
  ED.busy = true; ED.err = ""; ED.prog = "Preparando o texto…"; ED.ctrl = new AbortController(); edDraw();
  try{
    const t = await edTexto(id), pdf = ED.pdf[id], modoIA = aiModo();
    if (pdf && (modoIA === "proxy" || modoIA === "chave")){
      try{ ED.prog = "Lendo o PDF inteiro com a IA…"; edDraw();
        const r = await askAI([{role:"user", content:P_EXTRAI_PDF}], {docs:[{b64:pdf}], signal:ED.ctrl.signal, maxTokens:16000}), j = jsonLoose(r); if (!j) throw {code:"json"};
        ed.resumo = j; ed.analisado = Date.now(); ed.truncado = false; ed.modelo = ui.aiUsado || ""; ed.leitura = "pdf"; save(); ED.busy = false; ED.prog = ""; edDraw(); return;
      }catch(e){ if (e && (e.code === "cancelled" || e.code === "http_401" || e.code === "http_403" || e.code === "http_429")) throw e; if (!t || t.length < 200 || /sem texto selecionável/.test(t)) throw e; ED.prog = "A leitura direta falhou. Lendo pelo texto…"; edDraw(); }
    }
    if (!t || t.length < 200 || /sem texto selecionável/.test(t)) throw {code:"vazio"};
    const partes = fatia(t, 40000).slice(0, 7), par = [];
    for (let i = 0; i < partes.length; i++){ ED.prog = `Lendo o edital: parte ${i + 1} de ${partes.length}…`; edDraw();
      const r = await askAI([{role:"user", content:P_EXTRAI + `\n\nTRECHO ${i + 1} de ${partes.length}:\n` + partes[i]}], {signal:ED.ctrl.signal, maxTokens:8000}), j = jsonLoose(r); if (!j) throw {code:"json"}; par.push(j); }
    let res = par[0];
    if (par.length > 1){ ED.prog = "Juntando as partes…"; edDraw(); const r = await askAI([{role:"user", content:P_JUNTA + "\n\nFormato:\n" + ESQ + "\n\nJSONs:\n" + JSON.stringify(par).slice(0, 200000)}], {signal:ED.ctrl.signal, maxTokens:8000}); res = jsonLoose(r) || par[0]; }
    ed.resumo = res; ed.analisado = Date.now(); ed.truncado = fatia(t, 40000).length > 7; ed.modelo = ui.aiUsado || ""; ed.leitura = "texto"; save();
  }catch(e){ ED.err = e && e.code === "vazio" ? "Não encontrei texto no arquivo. Se for um PDF escaneado (imagem), cole o texto ou use um PDF com texto." : e && e.code === "json" ? "A IA não devolveu o resumo no formato esperado. Tente de novo." : aiErr(e); }
  ED.busy = false; ED.prog = ""; edDraw();
}
const DOCMAP = [[/sicaf/, /sicaf/], [/fgts/, /fgts/], [/trabalhist|cndt/, /trabalhist|cndt/], [/estadual/, /estadual/], [/municipal/, /municipal/], [/falencia|recuperacao judicial/, /falencia/], [/federa(l|is)|receita federal|pgfn|tributos federais|divida ativa da uniao/, /federais/], [/certificado digital|e-cnpj|ecnpj/, /e-cnpj|certificado digital/]];
function docStatus(req){ const t = norm(req); for (const [rq, dn] of DOCMAP){ if (rq.test(t)){ const d = S.docs.find(x => dn.test(norm(x.nome))); if (!d) return {c:"wn", t:"Não cadastrado"}; const s = docSt(d); return {c:s.c, t:s.t}; } } return null; }
const refTag = r => r ? `<span class="tag" style="margin-left:6px">${esc(r)}</span>` : "";
const ulL = (l, docs) => l.length ? `<ul>${l.map(x => { const s = docs ? docStatus(x.texto) : null; return `<li>${esc(x.texto)}${refTag(x.ref)}${s ? `<span class="tag ${s.c}" style="margin-left:6px">${esc(s.t)}</span>` : ""}</li>`; }).join("")}</ul>` : `<div class="hint">Não consta no texto lido.</div>`;
const kvL = (o, ks) => ks.map(([k, l]) => tx(o && o[k]) ? `<div class="meta"><b>${l}:</b> ${esc(tx(o[k]))}</div>` : "").join("") || `<div class="hint">Não consta no texto lido.</div>`;
const simNao = v => ({sim:"Sim", nao:"Não", nao_informado:"Não informado"})[norm(tx(v)).replace(/[^a-z_]/g, "")] || tx(v) || "Não informado";
function resumoHTML(ed){
  const r = ed.resumo; if (!r) return "";
  const id = r.identificacao || {}, d = r.documentos_exigidos || {}, en = r.entrega || {}, ca = r.catalogo_amostra || {}, pg = r.pagamento || {};
  const GD = [["habilitacao_juridica", "Habilitação jurídica"], ["regularidade_fiscal_social_trabalhista", "Regularidade fiscal, social e trabalhista"], ["qualificacao_economico_financeira", "Qualificação econômico-financeira"], ["qualificacao_tecnica", "Qualificação técnica"], ["declaracoes", "Declarações"], ["outros", "Outros"]];
  const itens = arr(r.itens);
  const D = (t, body, open) => `<details class="tut"${open ? " open" : ""}><summary>${t}</summary><div class="tb">${body}</div></details>`;
  return `<div class="card"><b>Identificação</b>${kvL(id, [["orgao", "Órgão"], ["modalidade", "Modalidade"], ["numero", "Número"], ["objeto", "Objeto"], ["valor_estimado", "Valor estimado"], ["proposta_ate", "Propostas até"], ["abertura_sessao", "Abertura da sessão"]])}
    <div class="links"><button class="btn sm" data-a="edLic" data-id="${ed.id}">Salvar em Licitações</button><button class="btn ghost sm" data-a="edRe" data-id="${ed.id}">Reanalisar</button></div></div>
  ${arr(r.alertas).length ? `<div class="note2"><b>Atenção:</b><ul style="margin:6px 0 0">${arr(r.alertas).map(a => `<li>${esc(tx(a))}</li>`).join("")}</ul></div>` : ""}
  ${D("Requisitos para participar", ulL(lst(r.requisitos_participacao)), true)}
  ${D("Documentação exigida", GD.map(([k, l]) => lst(d[k]).length ? `<h4>${l}</h4>${ulL(lst(d[k]), true)}` : "").join("") || '<div class="hint">Não consta no texto lido.</div>', true)}
  ${D("Especificação completa do(s) item(ns)", itens.length ? itens.map(x => `<div class="top4"><div class="nm">${esc(tx(x.item) || "Item")}${refTag(tx(x.ref))}</div><div class="cn">${esc(tx(x.descricao_completa))}</div>${kvL(x, [["quantidade", "Quantidade"], ["unidade", "Unidade"], ["valor_referencia", "Valor de referência"], ["marca_modelo", "Marca ou modelo"], ["garantia", "Garantia"], ["normas_certificacoes", "Normas e certificações"]])}</div>`).join("") : '<div class="hint">Não consta no texto lido.</div>', true)}
  ${D("Prazo e local de entrega", kvL(en, [["prazo", "Prazo"], ["local", "Local"], ["condicoes", "Condições"]]) + refTag(tx(en.ref)), true)}
  ${D("Catálogo e amostra", `<div class="meta"><b>Catálogo:</b> ${esc(simNao(ca.catalogo))}</div><div class="meta"><b>Amostra:</b> ${esc(simNao(ca.amostra))}</div>${kvL(ca, [["detalhes", "Detalhes"], ["prazo", "Prazo"]])}${refTag(tx(ca.ref))}`, true)}
  ${D("Condições de pagamento", kvL(pg, [["prazo", "Prazo"], ["forma", "Forma"], ["condicoes", "Condições"], ["retencoes_reajuste", "Retenções e reajuste"], ["garantia_contratual", "Garantia contratual"]]) + refTag(tx(pg.ref)), true)}
  ${D("Critérios para desclassificação", ulL(lst(r.desclassificacao)), true)}
  <div class="hint">${ed.modelo ? "Analisado com " + esc(ed.modelo) + (ed.leitura === "pdf" ? ", lendo o PDF inteiro. " : ". ") : ""}${ed.truncado ? "O edital é muito grande: o resumo cobre as primeiras partes. " : ""}O resumo é feito por IA a partir do texto. Confira sempre no edital original antes de decidir.</div>`;
}
/* perguntas ao edital */
const STOP = new Set("para com sem que uma uns umas dos das nos nas pelo pela por como qual quais quando onde pode podem deve devem edital item itens isso esse essa este esta ser foi sao nao mais mas tem ter".split(" "));
const tok = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
function pedacos(texto, size = 1600){ const ps = String(texto).split(/\n{2,}|\n(?=\d+(\.\d+)*\s)/), out = []; let cur = ""; for (const p of ps){ if (!p) continue; if (cur && (cur + "\n" + p).length > size){ out.push(cur); cur = p; } else cur = cur ? cur + "\n" + p : p; } if (cur) out.push(cur); return out.flatMap(c => c.length > size * 1.6 ? c.match(new RegExp("[\\s\\S]{1," + size + "}", "g")) : [c]).map((c, i) => ({n:i + 1, c, t:tok(c)})); }
function recupera(cs, q, k = 10){
  const qt = tok(q), df = {}, N = cs.length; cs.forEach(c => new Set(c.t).forEach(w => df[w] = (df[w] || 0) + 1));
  const sc = cs.map((c, i) => { const tf = {}; c.t.forEach(w => tf[w] = (tf[w] || 0) + 1); let s = 0; qt.forEach(w => { if (tf[w]) s += (1 + Math.log(tf[w])) * Math.log(1 + N / df[w]); }); return {i, s}; });
  const top = sc.filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k); if (!top.length) return cs.slice(0, Math.min(3, N));
  return top.sort((a, b) => a.i - b.i).map(x => cs[x.i]);
}
const P_SYS_ED = `Você é o assistente do Licita Lance Certo e ajuda um pequeno fornecedor a entender um edital.
Responda APENAS com base nos trechos do edital e no resumo que vêm na pergunta. Se a resposta não estiver neles, diga que não encontrou no texto e sugira conferir o edital completo ou fazer um pedido de esclarecimento ao órgão. Não invente prazos, valores nem exigências.
Cite o item ou a cláusula do edital quando aparecer no texto (por exemplo "item 9.2"). Seja direto: respostas curtas, com listas quando ajudar. Responda em português do Brasil.
Se a pergunta envolver risco de desclassificação ou decisão jurídica, lembre de confirmar com o órgão ou com um profissional.`;
const histTurns = h => { const o = []; h.filter(m => m.c && !m.e).slice(-6).forEach(m => { if (o.length && o[o.length - 1].role === m.r) return; o.push({role:m.r, content:m.c}); }); while (o.length && o[0].role !== "user") o.shift(); if (o.length && o[o.length - 1].role === "user") o.pop(); return o; };
async function edPergunta(id, q, onText, hist){
  const ed = S.editais.find(x => x.id === id), t = await edTexto(id); if (!ed || !t) throw {code:"vazio"};
  ED.pc = ED.pc || {}; const cs = ED.pc[id] = ED.pc[id] || pedacos(t), top = recupera(cs, q), h = (ED.msgs[id] = ED.msgs[id] || []);
  const ctx = `RESUMO ESTRUTURADO:\n${JSON.stringify(ed.resumo || {}).slice(0, 12000)}\n\nTRECHOS DO EDITAL:\n${top.map(c => `[Trecho ${c.n}]\n${c.c}`).join("\n\n")}\n\nPERGUNTA: ${q}`;
  const pdf = ED.pdf[id], modoIA = aiModo(), direto = !!pdf && (modoIA === "proxy" || modoIA === "chave");
  const ctxD = `RESUMO ESTRUTURADO:\n${JSON.stringify(ed.resumo || {}).slice(0, 12000)}\n\nPERGUNTA: ${q}`;
  const turns = histTurns(hist || []).concat([{role:"user", content:direto ? ctxD : ctx}]);
  return {texto:await askAI(turns, {system:P_SYS_ED, signal:ED.ctrl && ED.ctrl.signal, onText, maxTokens:2000, docs:direto ? [{b64:pdf}] : undefined}), trechos:direto ? [] : top.map(c => c.n)};
}
async function edNovo(texto, titulo, fonte, licId){
  const id = uid(); ED.txt[id] = texto; if (ED.pdfPend){ ED.pdf[id] = ED.pdfPend; ED.pdfPend = null; } try{ await idb.put(edKey(id), texto); }catch(e){}
  S.editais.unshift({id, titulo:titulo || "Edital sem título", at:Date.now(), chars:texto.length, fonte:fonte || "", resumo:null, licId:licId || ""}); save(); ED.sel = id; edAnalisa(id);
}
function edRowHTML(ed){ return `<div class="card"><div class="item" data-a="edAbre" data-id="${ed.id}" tabindex="0" role="button"><div class="top"><b>${esc(ed.titulo)}</b><span class="tag ${ed.resumo ? "ok" : "wn"}">${ed.resumo ? "Analisado" : "Sem resumo"}</span></div><div class="meta">${(ed.chars / 1000).toFixed(0)} mil caracteres. ${new Date(ed.at).toLocaleDateString("pt-BR")}${ed.fonte ? ". " + esc(ed.fonte) : ""}</div></div></div>`; }
function aiCardHTML(){
  const m = aiModo(), c = S.cfg;
  return `<details class="tut"${m === "nenhum" ? " open" : ""}><summary id="aiSum">Conexão com a IA: ${esc(AI_NOMES[m])}</summary><div class="tb">
    <p class="sub" style="margin:0 0 8px">${m === "claude" ? "Neste site, as perguntas usam a sua conta do Claude. Não precisa de chave." : m === "nenhum" ? "Neste aparelho, escolha uma das duas formas abaixo." : "Conexão ativa."}</p>
    <div class="fg"><div class="f"><label for="ai_proxy">Endereço do servidor intermediário (recomendado)</label><input id="ai_proxy" data-ai="aiProxy" autocomplete="off" placeholder="https://meu-servidor.com/ia" value="${esc(c.aiProxy || "")}"></div>
    <div class="f"><label for="ai_token">Senha do servidor (se houver)</label><input id="ai_token" type="password" data-ai="aiToken" autocomplete="off" value="${esc(c.aiToken || "")}"></div>
    <div class="f"><label for="ai_key">Ou a sua chave da API da Anthropic (fica só neste aparelho)</label><input id="ai_key" type="password" data-ai="aiKey" autocomplete="off" placeholder="sk-ant-..." value="${esc(c.aiKey || "")}"></div>
    <div class="f"><label for="ai_model">Modelo da IA</label><select id="ai_model" data-ai="aiModel"><option value="">Automático: o melhor disponível</option>${AI_MODELOS.map(([v, t]) => `<option value="${v}"${c.aiModel === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div></div>
    <p class="hint" style="margin:6px 0 0">Com servidor ou chave, a IA <b>lê o PDF inteiro</b>, inclusive tabelas e arquivos escaneados. Se o modelo escolhido não estiver liberado na sua conta, o app tenta o próximo mais capaz.${ui.aiUsado ? " Último modelo usado: <b>" + esc(ui.aiUsado) + "</b>." : ""}</p>
    <div class="note2"><b>Segurança:</b> a chave no aparelho pode ser extraída por quem tiver acesso a ele, e o uso é cobrado na sua conta. Para vender o app, use um servidor intermediário que guarda a chave e limita o uso (há um exemplo pronto no projeto da loja). O texto dos editais é enviado à Anthropic para gerar as respostas. Não suba documentos com dados pessoais de terceiros.</div></div></details>`;
}
function edTelaHTML(){
  const ed = S.editais.find(x => x.id === ED.sel);
  let h = "";
  if (!ed){
    h += `<div class="card"><b>Novo edital</b><p class="sub" style="margin:2px 0 8px">Envie o PDF do edital ou cole o texto. A IA lê e mostra o que importa.</p>
      <div class="fg"><div class="f"><label for="ed_arq">Arquivo do edital (PDF ou TXT)</label><input id="ed_arq" type="file" accept=".pdf,.txt,.md,.html,.htm,application/pdf,text/plain"></div>
      <div class="f"><label for="ed_tit">Título (opcional)</label><input id="ed_tit" data-edn="titulo" autocomplete="off" placeholder="Dispensa 12/2026 - dispensers" value="${esc(ED.novo.titulo)}"></div>
      <div class="f"><label for="ed_txt">Ou cole o texto do edital</label><textarea id="ed_txt" data-edn="texto" rows="5" placeholder="Cole aqui o texto copiado do edital">${esc(ED.novo.texto)}</textarea></div>
      <div class="f"><label for="ed_lic">Ligar a uma licitação (opcional)</label><select id="ed_lic" data-edn="licId"><option value="">Nenhuma</option>${S.lic.map(l => `<option value="${l.id}"${ED.novo.licId === l.id ? " selected" : ""}>${esc((l.numero ? l.numero + " - " : "") + (l.objeto || l.orgao || "Licitação"))}</option>`).join("")}</select></div></div>
      <div class="actions"><button class="btn" data-a="edColar">Analisar o texto colado</button><button class="btn ghost" data-a="edPncp">Buscar o edital no PNCP</button></div>
      <div class="hint">"Buscar no PNCP" usa a licitação escolhida acima e só funciona no aplicativo instalado. Se não funcionar, baixe o PDF no PNCP e envie aqui.</div></div>`;
    h += S.editais.length ? `<h2 class="gh">Meus editais</h2>` + S.editais.map(edRowHTML).join("") : "";
  } else {
    h += `<div class="actions" style="margin-top:0"><button class="btn ghost sm" data-a="edVolta">‹ Meus editais</button><button class="btn danger sm" data-a="edDel" data-id="${ed.id}">Excluir</button></div><h2 class="gh" style="margin-top:6px">${esc(ed.titulo)}</h2>`;
    if (ED.busy) h += `<div class="card"><div class="sub" style="margin:0">${esc(ED.prog || "Trabalhando…")}</div><div class="prg"><i style="width:60%"></i></div><div class="actions"><button class="btn ghost sm" data-a="edPara">Parar</button></div></div>`;
    if (ED.err) h += `<div class="note2">${esc(ED.err)}</div>`;
    h += ed.resumo ? resumoHTML(ed) : (!ED.busy ? `<div class="card empty">Ainda sem resumo. <button class="btn sm" data-a="edRe" data-id="${ed.id}">Analisar agora</button></div>` : "");
    const ms = ED.msgs[ed.id] || [];
    h += `<h2 class="gh">Converse com o edital</h2><div class="card"><div class="chips" style="flex-wrap:wrap;margin:0 0 8px;padding:0">${["O que preciso para participar?", "Quais documentos preciso enviar?", "Qual o prazo e o local de entrega?", "Precisa de amostra ou catálogo?", "Como é o pagamento?", "O que desclassifica a proposta?"].map(q => `<button class="chip" data-a="edQ" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <div id="edChat">${ms.map(msgHTML).join("")}</div>
      <div class="fg" style="margin-top:8px"><div class="f"><label for="ed_q">Sua pergunta</label><textarea id="ed_q" rows="2" placeholder="Ex.: a amostra precisa ser entregue antes da sessão?"></textarea></div></div>
      <div class="actions"><button class="btn" data-a="edEnvia">${ED.chatBusy ? "Pensando…" : "Perguntar"}</button>${ED.chatBusy ? '<button class="btn ghost" data-a="edPara">Parar</button>' : ""}</div></div>`;
  }
  return h + aiCardHTML();
}
const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^(?:- |• )(.*)$/gm, "&bull; $1").replace(/\n/g, "<br>");
const msgHTML = m => `<div class="bub ${m.r === "user" ? "me" : "bot"}">${mdLite(m.c)}${m.t && m.t.length ? `<div class="bsrc">Trechos usados: ${m.t.join(", ")}</div>` : ""}${m.e ? `<div class="bsrc" style="color:var(--bd)">${esc(m.e)}</div>` : ""}</div>`;
function edDraw(){ const o = $("#edOut"); if (o) o.innerHTML = edTelaHTML(); }
function iaDraw(){ edDraw(); botDraw(); }
function viewEditais(m){
  m.innerHTML = `<h1>Editais e assistente</h1><p class="sub">Envie o edital e converse com ele. A IA mostra os requisitos, os documentos, a especificação dos itens, o prazo e o local de entrega, amostra, pagamento e os motivos de desclassificação.</p><div id="edOut">${edTelaHTML()}</div>`;
}
async function edEnviaPergunta(q){
  const id = ED.sel; if (!q.trim() || ED.chatBusy) return; const h = (ED.msgs[id] = ED.msgs[id] || []);
  h.push({r:"user", c:q}); const resp = {r:"assistant", c:""}; h.push(resp); ED.chatBusy = true; ED.ctrl = new AbortController(); edDraw();
  try{ const r = await edPergunta(id, q, t => { resp.c = t; const c = $("#edChat"); if (c) c.innerHTML = h.map(msgHTML).join(""); }, h.slice(0, -2)); resp.c = r.texto; resp.t = r.trechos; }
  catch(e){ const m = e && e.code === "vazio" ? "O texto deste edital não está disponível. Envie o arquivo de novo." : aiErr(e); if (!resp.c) h.pop(); else resp.e = m; if (m){ ED.err = m; } }
  ED.chatBusy = false; edDraw();
}
/* ---------- robô assistente ---------- */
const BOT = {open:false, modo:"edital", msgs:{edital:[], app:[], pagina:[]}, pag:{texto:"", url:"", msg:""}, busy:false, ctrl:null, kb:null, edId:""};
const MAPA_APP = `# Mapa do aplicativo Licita Lance Certo
Abas de baixo: Hub (tela inicial: funil de oportunidades, minhas oportunidades, previsões do plano de compras), Calcular (calculadora de lance: lucro, margem, custo máximo do fornecedor, lance mínimo), Licitações (lista das licitações, situação, lucro), Documentos (validade das certidões e alertas), Mais.
Em Mais: Meu perfil de vendas (produtos, CNAE, faixa de valor, estados e modalidades para receber oportunidades), Financial Hub (antecipação, capital de giro, garantias, simulador e comparador, Open Finance), Radar de produtos (preço histórico, órgãos que compram, fornecedores, margem), Portais e SICAF (links do Compras.gov.br, SICAF, AntecipaGov, PNCP), Orçamento gastos e caixa (regiões, estados, cidades), Obras públicas (Obrasgov, atrasos), Alertas e lembretes, Painel de lances (cronômetro e lance sugerido), Rastrear pedidos, Fretes e transportadoras, Nota fiscal (passo a passo e triangulação), Como funcionam as licitações (todas as modalidades), Editais e assistente (resumo do edital por IA e perguntas), Fornecedores, Comparar preços, Resumo e backup, Dados da empresa (CNPJ), Conta e senha, Como usar e instalar.
A engrenagem no alto abre os ajustes: regime (MEI ou Simples), DAS, margem desejada.
Os dados ficam no aparelho. O app não envia lances aos portais. A consulta ao PNCP funciona no aplicativo instalado pela loja.`;
const stripH = h => String(h).replace(/<h4>/g, "\n").replace(/<\/(li|p|tr|h4|div)>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&bull;/g, "-").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
function kbChunks(){
  if (BOT.kb) return BOT.kb; const ps = [MAPA_APP]; const add = (t, b) => ps.push(("# " + t + "\n" + stripH(b)).slice(0, 3000));
  [typeof TUT !== "undefined" && TUT, typeof NF !== "undefined" && NF, MODG, FIN_PROD].forEach(l => { (l || []).forEach(x => { try{ add(x[0], x[2]); }catch(e){} }); });
  return BOT.kb = ps.map((c, i) => ({n:i + 1, c, t:tok(c)}));
}
const P_SYS_APP = `Você é o robô assistente do aplicativo Licita Lance Certo, que ajuda pequenos fornecedores (MEI, ME e EPP) a vender para o governo.
Responda APENAS com base no CONHECIMENTO que vem na pergunta. Diga em qual tela ou aba a pessoa encontra o que procura. Se não souber, diga que não sabe e sugira Mais, Como usar e instalar. Não invente funções que o app não tem. Respostas curtas e em passos. Português do Brasil.`;
const P_SYS_PAG = `Você é o robô assistente do Licita Lance Certo e ajuda a entender o conteúdo de uma página de portal ou site de compras públicas, que a pessoa colou ou o app leu.
Responda APENAS com base no TEXTO DA PÁGINA que vem na pergunta. Explique em linguagem simples, diga os próximos passos e avise quando o texto não trouxer a resposta. Português do Brasil.`;
function botCtxHTML(){
  if (BOT.modo === "edital"){ const l = S.editais; return l.length ? `<div class="f"><label for="bot_ed">Edital</label><select id="bot_ed" data-bot="edId">${l.map(e => `<option value="${e.id}"${(BOT.edId || ED.sel || l[0].id) === e.id ? " selected" : ""}>${esc(e.titulo)}</option>`).join("")}</select></div>` : `<div class="hint">Você ainda não enviou nenhum edital. <button class="btn sm" data-a="botNovoEd">Enviar um edital</button></div>`; }
  if (BOT.modo === "pagina") return `<div class="f"><label for="bot_url">Endereço da página (só no aplicativo instalado)</label><div class="toolbar" style="margin:0"><input id="bot_url" data-bot="url" autocomplete="off" placeholder="https://..." value="${esc(BOT.pag.url)}"><button class="btn ghost sm" data-a="botLer">Ler</button></div></div><div class="f"><label for="bot_pag">Ou cole o texto da página</label><textarea id="bot_pag" data-bot="pag" rows="3" placeholder="Copie e cole aqui o texto do portal">${esc(BOT.pag.texto)}</textarea></div>${BOT.pag.msg ? `<div class="hint">${esc(BOT.pag.msg)}</div>` : ""}`;
  return `<div class="hint">Pergunte como usar o aplicativo, onde fica cada função ou como funciona uma modalidade.</div>`;
}
const BOT_SUG = {edital:["Quais documentos preciso?", "Tem amostra?", "Qual o prazo de entrega?"], app:["Como calculo meu lance?", "Como recebo oportunidades?", "Onde vejo as modalidades?"], pagina:["Resuma esta página", "O que devo fazer agora?"]};
function botDraw(){
  const p = $("#botPanel"); if (!p) return; p.classList.toggle("on", BOT.open); if (!BOT.open) return;
  const ms = BOT.msgs[BOT.modo], sem = aiModo() === "nenhum";
  $("#botModes").innerHTML = [["edital", "Edital"], ["app", "Aplicativo"], ["pagina", "Site"]].map(([k, t]) => `<button class="chip${BOT.modo === k ? " on" : ""}" data-a="botModo" data-v="${k}">${t}</button>`).join("");
  $("#botCtx").innerHTML = botCtxHTML();
  $("#botMsgs").innerHTML = (ms.length ? ms.map(msgHTML).join("") : `<div class="hint">${BOT_SUG[BOT.modo].map(q => `<button class="chip" data-a="botQ" data-q="${esc(q)}">${esc(q)}</button>`).join(" ")}</div>`) + (sem ? `<div class="note2">Falta conectar a IA. <button class="btn sm" data-a="botConfig">Configurar</button></div>` : "");
  $("#botSend").textContent = BOT.busy ? "Pensando…" : "Enviar"; $("#botStop").hidden = !BOT.busy;
  const box = $("#botMsgs"); box.scrollTop = box.scrollHeight;
}
async function botEnvia(q){
  q = String(q || "").trim(); if (!q || BOT.busy) return; const modo = BOT.modo, h = BOT.msgs[modo]; h.push({r:"user", c:q}); const resp = {r:"assistant", c:""}; h.push(resp); BOT.busy = true; BOT.ctrl = new AbortController(); botDraw();
  const live = t => { resp.c = t; const b = $("#botMsgs"); if (b){ b.innerHTML = h.map(msgHTML).join(""); b.scrollTop = b.scrollHeight; } };
  try{
    if (modo === "edital"){ const id = BOT.edId || ED.sel || (S.editais[0] || {}).id; if (!id) throw {code:"semEd"}; ED.sel = ED.sel || id; ED.ctrl = BOT.ctrl; const r = await edPergunta(id, q, live, h.slice(0, -2)); resp.c = r.texto; resp.t = r.trechos; }
    else {
      let ctx, sys;
      if (modo === "app"){ const top = recupera(kbChunks(), q, 6); ctx = `CONHECIMENTO DO APLICATIVO:\n${MAPA_APP}\n\n${top.filter(c => c.n !== 1).map(c => c.c).join("\n\n")}\n\nTela atual do usuário: ${ui.tab}\n\nPERGUNTA: ${q}`; sys = P_SYS_APP; }
      else { const t = BOT.pag.texto.trim(); if (!t) throw {code:"semPag"}; const cs = pedacos(t, 1800), top = cs.length > 8 ? recupera(cs, q, 8) : cs; ctx = `TEXTO DA PÁGINA:\n${top.map(c => c.c).join("\n\n")}\n\nPERGUNTA: ${q}`; sys = P_SYS_PAG; }
      const turns = histTurns(h.slice(0, -2)).concat([{role:"user", content:ctx}]);
      resp.c = await askAI(turns, {system:sys, signal:BOT.ctrl.signal, onText:live, maxTokens:1500});
    }
  }catch(e){ const m = e && e.code === "semEd" ? "Escolha ou envie um edital primeiro." : e && e.code === "semPag" ? "Cole o texto da página ou leia um endereço primeiro." : e && e.code === "vazio" ? "O texto deste edital não está disponível. Envie o arquivo de novo." : aiErr(e); if (!resp.c) h.pop(); else resp.e = m; if (m) toast(m); }
  BOT.busy = false; botDraw();
}
function botInit(){
  if ($("#botBtn")) return;
  const b = document.createElement("button"); b.id = "botBtn"; b.setAttribute("aria-label", "Abrir o assistente"); b.dataset.a = "botToggle";
  b.innerHTML = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4v4"/><circle cx="16" cy="3.5" r="1.4" fill="currentColor"/><rect x="6" y="8" width="20" height="15" rx="5"/><circle cx="12" cy="15" r="1.8" fill="currentColor"/><circle cx="20" cy="15" r="1.8" fill="currentColor"/><path d="M12 19.5h8"/><path d="M3 14v4M29 14v4"/><path d="M11 23v3M21 23v3"/></svg>`;
  document.body.appendChild(b);
  const p = document.createElement("div"); p.id = "botPanel"; p.className = "botp"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Assistente");
  p.innerHTML = `<div class="bot-h"><b>Assistente</b><button class="btn ghost sm" data-a="botClose">Fechar</button></div><div class="chips" id="botModes"></div><div id="botCtx"></div><div id="botMsgs" aria-live="polite"></div><div class="bot-f"><textarea id="botIn" rows="2" placeholder="Escreva sua pergunta" aria-label="Pergunta para o assistente"></textarea><div class="bot-b"><button class="btn" id="botSend" data-a="botSend">Enviar</button><button class="btn ghost" id="botStop" data-a="botStop" hidden>Parar</button></div></div>`;
  document.body.appendChild(p);
}

const copia = (txt, msg) => { try{ navigator.clipboard.writeText(txt).then(() => toast(msg), () => toast("Não consegui copiar.")); }catch(e){ toast("Não consegui copiar."); } };
/* ---------- emissão de nota fiscal (NF-e) passo a passo ---------- */
const NFE_STEPS = ["Origem", "Emitente", "Destinatário", "Operação", "Itens", "Frete e pagamento", "Informações", "Revisão e envio"];
const pget = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
const pset = (o, p, v) => { const ks = p.split("."); let a = o; ks.slice(0, -1).forEach(k => { if (a[k] == null || typeof a[k] !== "object") a[k] = {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };
const r2 = v => Math.round((+v + Number.EPSILON) * 100) / 100;
const f2 = v => r2(v).toFixed(2);
const digs = s => String(s || "").replace(/\D/g, "");
const nowBRT = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 19);
const nfeItem = () => ({cod:"", desc:"", ncm:"", cfop:"", un:"un", qtd:"", vu:"", origem:"0", icms:"102", pis:"07", cofins:"07"});
function nfeNovoRasc(pre){
  const E = S.empresa;
  return {id:uid(), ref:"", licId:"", em:{cnpj:E.cnpj, nome:E.razao, fantasia:E.fantasia || E.razao, ie:E.ie, logradouro:E.logradouro || "", numero:E.numero || "", bairro:E.bairro || "", municipio:E.cidade, uf:E.uf, cep:E.cep || "", tel:E.tel},
    de:{cnpj:"", nome:"", ind:"9", ie:"", logradouro:"", numero:"", bairro:"", municipio:"", uf:"", cep:"", tel:""},
    op:{natureza:"Venda de mercadoria", finalidade:"1", consumidor:"1", presenca:"9", emissao:nowBRT()}, itens:[nfeItem()], tr:{modfrete:"0", frete:"", seguro:""}, pg:{forma:"99", ind:"1"}, inf:{}, ...pre};
}
const NFE = {step:0, it:0, aba:"emitir", busy:false, err:"", resp:null, prog:"", ok:false, lista:[], buscaMsg:""};
const localDest = d => d.em.uf && d.de.uf ? (d.em.uf === d.de.uf ? "1" : "2") : "";
const cfopPad = d => ({"1":"5102", "2":"6102"})[localDest(d)] || "";
const UFSEL2 = [["", "Escolha"], ...UFS.map(([s, nm]) => [s, s + " - " + nm])];
const CFOPS = [["", "Automático (5102 ou 6102)"], ["5102", "5102 - Venda de mercadoria adquirida de terceiros, no estado"], ["6102", "6102 - Venda de mercadoria adquirida de terceiros, para outro estado"], ["5101", "5101 - Venda de produção própria, no estado"], ["6101", "6101 - Venda de produção própria, para outro estado"], ["6108", "6108 - Venda a não contribuinte, para outro estado"], ["5120", "5120 - Venda à ordem, entregue pelo fornecedor (triangulação)"], ["6120", "6120 - Venda à ordem, para outro estado (triangulação)"]];
const NFE_F = {
  1:[{p:"em.cnpj", l:"CNPJ do emitente", t:"cnpj", req:1, h:"É o CNPJ da sua empresa. Está no cartão CNPJ.", ex:"00.000.000/0001-00"}, {p:"em.nome", l:"Razão social", req:1, h:"Nome da empresa como no cartão CNPJ."}, {p:"em.fantasia", l:"Nome fantasia", h:"Se não tiver, repita a razão social."}, {p:"em.ie", l:"Inscrição estadual", req:1, h:"Número da inscrição na SEFAZ do seu estado. Quem vende mercadorias precisa dela."},
    {p:"em.logradouro", l:"Logradouro (rua, avenida)", req:1, h:"Sem o número."}, {p:"em.numero", l:"Número", req:1, h:"Use S/N se não houver."}, {p:"em.bairro", l:"Bairro", req:1}, {p:"em.municipio", l:"Município", req:1}, {p:"em.uf", l:"UF", t:"sel", o:UFSEL2, req:1}, {p:"em.cep", l:"CEP", t:"cep", req:1, h:"8 números.", ex:"13010-000"}, {p:"em.tel", l:"Telefone", h:"Com DDD, só números."}],
  2:[{p:"de.cnpj", l:"CNPJ do destinatário (órgão)", t:"cnpj", req:1, h:"Está no edital, na nota de empenho ou no contrato.", ex:"00.000.000/0001-00"}, {p:"de.nome", l:"Razão social do órgão", req:1, h:"Escreva igual à nota de empenho."}, {p:"de.ind", l:"Indicador de inscrição estadual", t:"sel", o:[["9", "9 - Não contribuinte (comum em órgão público)"], ["2", "2 - Isento"], ["1", "1 - Contribuinte do ICMS"]], req:1, h:"Se não souber, use 9."}, {p:"de.ie", l:"Inscrição estadual do destinatário", h:"Só preencha se for contribuinte."},
    {p:"de.logradouro", l:"Logradouro", req:1}, {p:"de.numero", l:"Número", req:1, h:"Use S/N se não houver."}, {p:"de.bairro", l:"Bairro", req:1}, {p:"de.municipio", l:"Município", req:1}, {p:"de.uf", l:"UF", t:"sel", o:UFSEL2, req:1}, {p:"de.cep", l:"CEP", t:"cep", req:1}, {p:"de.tel", l:"Telefone", h:"Opcional."}],
  3:[{p:"op.natureza", l:"Natureza da operação", req:1, h:"Descreve a operação. Para vender produto, use Venda de mercadoria.", ex:"Venda de mercadoria"}, {p:"op.finalidade", l:"Finalidade da emissão", t:"sel", o:[["1", "1 - Normal"], ["2", "2 - Complementar"], ["3", "3 - Ajuste"], ["4", "4 - Devolução"]], req:1}, {p:"op.consumidor", l:"Consumidor final?", t:"sel", o:[["1", "1 - Sim (órgão usa o produto)"], ["0", "0 - Não (vai revender)"]], req:1, h:"Para órgão público que usa o produto, normalmente é Sim. Confirme com o contador."},
    {p:"op.presenca", l:"Presença do comprador", t:"sel", o:[["9", "9 - Outros"], ["2", "2 - Não presencial, pela internet"], ["0", "0 - Não se aplica"], ["1", "1 - Presencial"]], req:1, h:"Compra feita em portal de licitação costuma ser não presencial."}, {p:"op.emissao", l:"Data e hora de emissão", req:1, h:"Horário de Brasília. Formato AAAA-MM-DDTHH:MM:SS.", ex:"2026-10-06T10:30:00"}],
  5:[{p:"tr.modfrete", l:"Quem paga o frete", t:"sel", o:[["0", "0 - Por conta do emitente (você)"], ["1", "1 - Por conta do destinatário"], ["2", "2 - Por conta de terceiros"], ["9", "9 - Sem frete"]], req:1, h:"O edital diz quem paga. Em muitos, o frete é por conta do fornecedor."}, {p:"tr.frete", l:"Valor do frete (R$)", t:"money", h:"Só preencha se cobrar o frete na nota."}, {p:"tr.seguro", l:"Valor do seguro (R$)", t:"money", h:"Opcional."},
    {p:"pg.ind", l:"Pagamento à vista ou a prazo", t:"sel", o:[["1", "1 - A prazo"], ["0", "0 - À vista"]], req:1, h:"O governo costuma pagar depois do ateste: a prazo."}, {p:"pg.forma", l:"Forma de pagamento", t:"sel", o:[["99", "99 - Outros"], ["18", "18 - Transferência bancária"], ["15", "15 - Boleto bancário"], ["17", "17 - Pix"], ["90", "90 - Sem pagamento"]], req:1, h:"Órgãos pagam por ordem bancária. Confirme a opção com o contador."}],
  6:[{p:"inf.empenho", l:"Número da nota de empenho", h:"Está na nota de empenho que o órgão enviou.", ex:"2026NE000123"}, {p:"inf.processo", l:"Processo, pregão ou dispensa", ex:"Dispensa 45/2026"}, {p:"inf.contrato", l:"Número do contrato", h:"Se houver."}, {p:"inf.banco", l:"Banco", ex:"Banco do Brasil"}, {p:"inf.agencia", l:"Agência", ex:"1234-5"}, {p:"inf.conta", l:"Conta corrente", h:"Conta em nome da empresa.", ex:"12345-6"}, {p:"inf.extra", l:"Outras informações", t:"area", h:"Texto livre, por exemplo a entrega por conta e ordem em triangulação."}]
};
const NFE_I = [{k:"cod", l:"Código do produto", req:1, h:"Seu código interno. Pode ser um número qualquer.", ex:"001"}, {k:"desc", l:"Descrição do item", t:"area", req:1, h:"Escreva igual ao edital e à nota de empenho."}, {k:"ncm", l:"NCM", t:"ncm", req:1, h:"Código de 8 números do produto. Peça ao seu fornecedor ou ao contador.", ex:"39269090"},
  {k:"cfop", l:"CFOP", t:"sel", o:CFOPS, h:"Código da operação. Deixe automático se vender no estado (5102) ou para outro estado (6102)."}, {k:"un", l:"Unidade", req:1, ex:"un"}, {k:"qtd", l:"Quantidade", t:"num", req:1}, {k:"vu", l:"Valor unitário (R$)", t:"money", req:1, h:"Igual ao valor da proposta."},
  {k:"origem", l:"Origem da mercadoria", t:"sel", o:[["0", "0 - Nacional"], ["1", "1 - Estrangeira, importação direta"], ["2", "2 - Estrangeira, adquirida no mercado interno"]], req:1}, {k:"icms", l:"Situação tributária do ICMS (CSOSN)", t:"sel", o:[["102", "102 - Simples sem crédito"], ["103", "103 - Isento no Simples"], ["400", "400 - Não tributada no Simples"], ["500", "500 - ICMS já cobrado por substituição tributária"]], req:1, h:"Para MEI e Simples, 102 é o mais comum. Confirme com o contador."},
  {k:"pis", l:"Situação tributária do PIS", t:"sel", o:[["07", "07 - Operação isenta"], ["49", "49 - Outras operações de saída"], ["99", "99 - Outras operações"]], req:1}, {k:"cofins", l:"Situação tributária da COFINS", t:"sel", o:[["07", "07 - Operação isenta"], ["49", "49 - Outras operações de saída"], ["99", "99 - Outras operações"]], req:1}];
const numP = v => { const s = String(v == null ? "" : v).trim(); return s ? n(s) : 0; };
const itBruto = it => r2(numP(it.qtd) * numP(it.vu));
function nfeTotais(d){ const prod = r2(d.itens.reduce((s, it) => s + itBruto(it), 0)), fr = numP(d.tr.frete), seg = numP(d.tr.seguro); return {prod, fr, seg, total:r2(prod + fr + seg)}; }
function nfeInfo(d){
  const I = d.inf || {}, p = [];
  if (I.processo) p.push(I.processo + "."); if (I.empenho) p.push("Empenho nº " + I.empenho + "."); if (I.contrato) p.push("Contrato nº " + I.contrato + ".");
  if (I.banco || I.agencia || I.conta) p.push("Dados bancários: " + [I.banco, I.agencia ? "agência " + I.agencia : "", I.conta ? "conta " + I.conta : ""].filter(Boolean).join(", ") + ".");
  if (I.extra) p.push(I.extra);
  p.push(`DOCUMENTO EMITIDO POR ${S.cfg.regime === "MEI" ? "MEI" : "ME OU EPP"} OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.`);
  return p.join(" ");
}
function nfeValidar(d){
  const v = [], add = (s, m) => v.push({s, m});
  if (!cnpjOk(d.em.cnpj)) add(1, "CNPJ do emitente inválido."); [["nome", "Razão social do emitente"], ["ie", "Inscrição estadual do emitente"], ["logradouro", "Logradouro do emitente"], ["numero", "Número do emitente"], ["bairro", "Bairro do emitente"], ["municipio", "Município do emitente"], ["uf", "UF do emitente"]].forEach(([k, l]) => { if (!String(d.em[k] || "").trim()) add(1, l + " em branco."); });
  if (digs(d.em.cep).length !== 8) add(1, "CEP do emitente precisa de 8 números.");
  if (!cnpjOk(d.de.cnpj)) add(2, "CNPJ do destinatário inválido."); [["nome", "Razão social do destinatário"], ["logradouro", "Logradouro do destinatário"], ["numero", "Número do destinatário"], ["bairro", "Bairro do destinatário"], ["municipio", "Município do destinatário"], ["uf", "UF do destinatário"]].forEach(([k, l]) => { if (!String(d.de[k] || "").trim()) add(2, l + " em branco."); });
  if (digs(d.de.cep).length !== 8) add(2, "CEP do destinatário precisa de 8 números.");
  if (d.de.ind === "1" && !String(d.de.ie || "").trim()) add(2, "Informe a inscrição estadual do destinatário contribuinte.");
  if (!String(d.op.natureza || "").trim()) add(3, "Natureza da operação em branco."); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(String(d.op.emissao || ""))) add(3, "Data e hora de emissão fora do formato AAAA-MM-DDTHH:MM:SS.");
  if (!d.itens.length) add(4, "Inclua pelo menos um item.");
  d.itens.forEach((it, i) => { const n1 = "Item " + (i + 1) + ": "; if (!String(it.cod).trim()) add(4, n1 + "código em branco."); if (!String(it.desc).trim()) add(4, n1 + "descrição em branco."); if (digs(it.ncm).length !== 8) add(4, n1 + "NCM precisa de 8 números."); if (!(numP(it.qtd) > 0)) add(4, n1 + "quantidade inválida."); if (!(numP(it.vu) > 0)) add(4, n1 + "valor unitário inválido."); if (!String(it.un).trim()) add(4, n1 + "unidade em branco."); if (!(it.cfop || cfopPad(d))) add(4, n1 + "CFOP não definido: escolha os estados do emitente e do destinatário."); });
  return v;
}
function nfePayload(d, amb){
  const T = nfeTotais(d), loc = localDest(d), hom = amb !== "producao", em = d.em, de = d.de;
  const p = {natureza_operacao:d.op.natureza, data_emissao:d.op.emissao, data_entrada_saida:d.op.emissao, tipo_documento:"1", finalidade_emissao:d.op.finalidade, consumidor_final:d.op.consumidor, presenca_comprador:d.op.presenca, local_destino:loc,
    cnpj_emitente:digs(em.cnpj), nome_emitente:em.nome, nome_fantasia_emitente:em.fantasia || em.nome, logradouro_emitente:em.logradouro, numero_emitente:em.numero, bairro_emitente:em.bairro, municipio_emitente:em.municipio, uf_emitente:em.uf, cep_emitente:digs(em.cep), inscricao_estadual_emitente:digs(em.ie), regime_tributario_emitente:"1",
    cnpj_destinatario:digs(de.cnpj), nome_destinatario:hom ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : de.nome, indicador_inscricao_estadual_destinatario:de.ind, logradouro_destinatario:de.logradouro, numero_destinatario:de.numero, bairro_destinatario:de.bairro, municipio_destinatario:de.municipio, uf_destinatario:de.uf, pais_destinatario:"Brasil", cep_destinatario:digs(de.cep),
    valor_frete:f2(T.fr), valor_seguro:f2(T.seg), valor_produtos:f2(T.prod), valor_total:f2(T.total), modalidade_frete:d.tr.modfrete, informacoes_adicionais_contribuinte:nfeInfo(d), forma_pagamento:d.pg.ind, formas_pagamento:[{forma_pagamento:d.pg.forma, valor_pagamento:f2(T.total)}],
    items:d.itens.map((it, i) => ({numero_item:String(i + 1), codigo_produto:it.cod, descricao:hom && i === 0 ? it.desc : it.desc, cfop:it.cfop || cfopPad(d), unidade_comercial:it.un, quantidade_comercial:String(numP(it.qtd)), valor_unitario_comercial:String(numP(it.vu)), valor_unitario_tributavel:String(numP(it.vu)), unidade_tributavel:it.un, codigo_ncm:digs(it.ncm), quantidade_tributavel:String(numP(it.qtd)), valor_bruto:f2(itBruto(it)), icms_origem:it.origem, icms_situacao_tributaria:it.icms, pis_situacao_tributaria:it.pis, cofins_situacao_tributaria:it.cofins}))};
  if (digs(de.ie)) p.inscricao_estadual_destinatario = digs(de.ie); if (digs(de.tel)) p.telefone_destinatario = digs(de.tel);
  return p;
}
function nfeCampos(d){
  const T = nfeTotais(d), L = [], add = (g, l, v) => { if (String(v == null ? "" : v).trim() !== "") L.push([g, l, String(v)]); };
  const em = d.em, de = d.de;
  [["CNPJ", em.cnpj], ["Razão social", em.nome], ["Nome fantasia", em.fantasia], ["Inscrição estadual", em.ie], ["Logradouro", em.logradouro], ["Número", em.numero], ["Bairro", em.bairro], ["Município", em.municipio], ["UF", em.uf], ["CEP", em.cep], ["Telefone", em.tel]].forEach(([l, v]) => add("Emitente", l, v));
  [["CNPJ", de.cnpj], ["Razão social", de.nome], ["Indicador de IE", de.ind], ["Inscrição estadual", de.ie], ["Logradouro", de.logradouro], ["Número", de.numero], ["Bairro", de.bairro], ["Município", de.municipio], ["UF", de.uf], ["CEP", de.cep], ["Telefone", de.tel]].forEach(([l, v]) => add("Destinatário", l, v));
  [["Natureza da operação", d.op.natureza], ["Finalidade", d.op.finalidade], ["Consumidor final", d.op.consumidor], ["Presença do comprador", d.op.presenca], ["Data e hora de emissão", d.op.emissao], ["Tipo de operação", "1 - Saída"], ["Destino da operação", localDest(d) === "1" ? "1 - Interna" : "2 - Interestadual"]].forEach(([l, v]) => add("Operação", l, v));
  d.itens.forEach((it, i) => [["Código", it.cod], ["Descrição", it.desc], ["NCM", digs(it.ncm)], ["CFOP", it.cfop || cfopPad(d)], ["Unidade", it.un], ["Quantidade", numP(it.qtd)], ["Valor unitário", numP(it.vu)], ["Valor total", f2(itBruto(it))], ["Origem", it.origem], ["CSOSN do ICMS", it.icms], ["CST do PIS", it.pis], ["CST da COFINS", it.cofins]].forEach(([l, v]) => add("Item " + (i + 1), l, v)));
  [["Valor dos produtos", f2(T.prod)], ["Valor do frete", f2(T.fr)], ["Valor total da nota", f2(T.total)], ["Modalidade do frete", d.tr.modfrete], ["Indicador de pagamento", d.pg.ind], ["Forma de pagamento", d.pg.forma]].forEach(([l, v]) => add("Totais, transporte e pagamento", l, v));
  add("Informações complementares", "Texto", nfeInfo(d));
  return L;
}
function nfeRowHTML(f, v, pathKey){
  const id = "nf_" + pathKey.replace(/\./g, "_"), req = f.req && !String(v == null ? "" : v).trim();
  const attrs = `id="${id}" data-nf="${pathKey}" data-t="${f.t || ""}"`;
  let inp;
  if (f.t === "sel") inp = `<select ${attrs}>${f.o.map(([c, t]) => `<option value="${esc(c)}"${String(v) === String(c) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  else if (f.t === "area") inp = `<textarea ${attrs} rows="3">${esc(v)}</textarea>`;
  else inp = `<input ${attrs} autocomplete="off" inputmode="${f.t === "money" || f.t === "num" ? "decimal" : f.t === "cnpj" || f.t === "cep" || f.t === "ncm" ? "numeric" : "text"}" placeholder="${esc(f.ex || "")}" value="${esc(v)}">`;
  return `<div class="nl${req ? " miss" : ""}"><label for="${id}"><b>${esc(f.l)}</b>${f.req ? " *" : ""}</label>${inp}${f.h || f.ex ? `<div class="nh">${esc(f.h || "")}${f.ex && f.t !== "sel" ? " Exemplo: " + esc(f.ex) : ""}</div>` : ""}</div>`;
}
function nfeCfgHTML(){
  const c = S.cfg, modo = c.nfeProxy ? "servidor intermediário" : c.nfeToken ? "direto, com o token" : "sem emissor conectado";
  return `<details class="tut"${!c.nfeProxy && !c.nfeToken ? " open" : ""}><summary id="nfeCfgSum">Conexão com o emissor de notas: ${esc(modo)}</summary><div class="tb">
    <p class="sub" style="margin:0 0 8px">Para o app enviar a nota à SEFAZ, você precisa de um emissor de notas (API) com o seu certificado digital cadastrado. O app foi preparado para a <b>Focus NFe</b>. Sem emissor, use a tela de revisão para copiar cada linha no emissor gratuito da SEFAZ.</p>
    <div class="fg"><div class="f"><label for="nc_amb">Ambiente</label><select id="nc_amb" data-nfec="nfeAmb"><option value="homologacao"${c.nfeAmb !== "producao" ? " selected" : ""}>Homologação (teste, sem valor fiscal)</option><option value="producao"${c.nfeAmb === "producao" ? " selected" : ""}>Produção (nota com valor fiscal)</option></select></div>
    <div class="f"><label for="nc_proxy">Endereço do servidor intermediário (recomendado)</label><input id="nc_proxy" data-nfec="nfeProxy" autocomplete="off" placeholder="https://meu-servidor.com" value="${esc(c.nfeProxy || "")}"></div>
    <div class="f"><label for="nc_ptok">Senha do servidor</label><input id="nc_ptok" type="password" data-nfec="nfeProxyToken" autocomplete="off" value="${esc(c.nfeProxyToken || "")}"></div>
    <div class="f"><label for="nc_tok">Ou o token da Focus NFe (fica só neste aparelho)</label><input id="nc_tok" type="password" data-nfec="nfeToken" autocomplete="off" value="${esc(c.nfeToken || "")}"></div></div>
    <div class="note2"><b>Segurança:</b> o token dá poder de emitir notas em nome da sua empresa. No app instalado ele fica no aparelho. Para vender o app, use o servidor intermediário (pasta backend/ia-proxy do projeto), que guarda o token. Teste sempre em <b>Homologação</b> antes de usar a Produção.</div></div></details>`;
}
function nfeTopo(d){ const T = nfeTotais(d); return `<div class="pgb" role="progressbar" aria-valuemin="1" aria-valuemax="${NFE_STEPS.length}" aria-valuenow="${NFE.step + 1}"><i style="width:${Math.round((NFE.step + 1) / NFE_STEPS.length * 100)}%"></i></div><div class="sub" style="margin:0 0 8px"><b>Passo ${NFE.step + 1} de ${NFE_STEPS.length}: ${NFE_STEPS[NFE.step]}</b>${T.total > 0 ? ". Total da nota: " + money(T.total) : ""}</div><div class="chips" style="flex-wrap:wrap;margin:0 0 8px;padding:0">${NFE_STEPS.map((s, i) => `<button class="chip${i === NFE.step ? " on" : ""}" data-a="nfeIr" data-s="${i}">${i + 1}</button>`).join("")}</div>`; }
function nfeStepHTML(d){
  const s = NFE.step; let h = "";
  if (s === 0){
    h += `<div class="card"><b>De onde vêm os dados?</b><p class="sub" style="margin:2px 0 8px">Escolha uma licitação para já preencher o destinatário e o primeiro item. Você confere cada linha nos próximos passos.</p>
      <div class="f"><label for="nf_licId">Licitação ou contrato</label><select id="nf_licId" data-nf="licId"><option value="">Começar em branco</option>${S.lic.map(l => `<option value="${l.id}"${d.licId === l.id ? " selected" : ""}>${esc((l.numero ? l.numero + " - " : "") + (l.objeto || l.orgao || "Licitação"))}</option>`).join("")}</select></div>
      <div class="actions"><button class="btn" data-a="nfeUsaLic">Usar os dados da licitação</button></div></div>
      <div class="note2"><b>Antes de começar, tenha em mãos:</b> a nota de empenho, o edital ou contrato, o CNPJ e o endereço do órgão, o NCM e o código de cada produto, e a inscrição estadual da sua empresa. Os valores de imposto aqui são sugestões. Confirme com o seu contador.</div>`;
  } else if (s === 4){
    const it = d.itens[NFE.it] || d.itens[0]; if (NFE.it >= d.itens.length) NFE.it = 0;
    h += `<div class="chips" style="flex-wrap:wrap;margin:0 0 8px;padding:0">${d.itens.map((x, i) => `<button class="chip${i === NFE.it ? " on" : ""}" data-a="nfeItSel" data-i="${i}">Item ${i + 1}</button>`).join("")}<button class="chip" data-a="nfeItAdd">+ Novo item</button></div>`;
    h += `<div class="card"><b>Item ${NFE.it + 1}</b>${NFE_I.map(f => nfeRowHTML(f, f.k === "cfop" ? (it.cfop || "") : it[f.k], "itens." + NFE.it + "." + f.k)).join("")}
      <div class="meta" id="nfeBruto">Valor total do item: <b>${money(itBruto(it))}</b>${!it.cfop && cfopPad(d) ? ". CFOP automático: " + cfopPad(d) : ""}</div>${d.itens.length > 1 ? `<div class="actions"><button class="btn danger sm" data-a="nfeItDel">Remover este item</button></div>` : ""}</div>
      <div class="card"><div class="kpis"><div class="kpi"><small>Produtos</small><b id="nfeP">${money(nfeTotais(d).prod)}</b></div><div class="kpi"><small>Total da nota</small><b id="nfeT">${money(nfeTotais(d).total)}</b></div></div></div>`;
  } else if (s === 7){
    const v = nfeValidar(d), L = nfeCampos(d); NFE.lista = L; const T = nfeTotais(d), amb = S.cfg.nfeAmb === "producao" ? "producao" : "homologacao";
    h += v.length ? `<div class="note2" style="border:1px solid var(--bd)"><b>Faltam ajustes (${v.length}):</b><ul style="margin:6px 0 0">${v.slice(0, 12).map(x => `<li><button class="btn ghost sm" data-a="nfeIr" data-s="${x.s}">Passo ${x.s + 1}</button> ${esc(x.m)}</li>`).join("")}</ul></div>` : `<div class="note2" style="border:1px solid var(--ok)"><b>Tudo preenchido.</b> Confira o resumo abaixo antes de enviar.</div>`;
    h += `<div class="card"><b>Resumo da nota</b><div class="meta"><b>De:</b> ${esc(d.em.nome)} (${esc(d.em.cnpj)}), ${esc(d.em.municipio)}/${esc(d.em.uf)}</div><div class="meta"><b>Para:</b> ${esc(d.de.nome)} (${esc(d.de.cnpj)}), ${esc(d.de.municipio)}/${esc(d.de.uf)}</div><div class="meta"><b>Operação:</b> ${esc(d.op.natureza)}. ${localDest(d) === "1" ? "Dentro do estado." : localDest(d) === "2" ? "Para outro estado." : ""}</div>
      <div class="tw"><table class="tbl"><thead><tr><th>Item</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${d.itens.map((it, i) => `<tr><td>${i + 1}. ${esc(String(it.desc).slice(0, 60))}<small>NCM ${esc(digs(it.ncm))}, CFOP ${esc(it.cfop || cfopPad(d))}</small></td><td>${numP(it.qtd)} ${esc(it.un)}</td><td>${money(numP(it.vu))}</td><td><b>${money(itBruto(it))}</b></td></tr>`).join("")}</tbody></table></div>
      <div class="meta">Produtos ${money(T.prod)}. Frete ${money(T.fr)}. <b>Total ${money(T.total)}.</b></div><div class="meta" style="margin-top:6px"><b>Informações complementares:</b> ${esc(nfeInfo(d))}</div></div>`;
    h += `<details class="tut"><summary>Dados linha por linha (para copiar no emissor da SEFAZ)</summary><div class="tb">${(() => { let g = "", o = ""; L.forEach(([gr, l, val], i) => { if (gr !== g){ g = gr; o += `<h4>${esc(gr)}</h4>`; } o += `<div class="cp"><div><small>${esc(l)}</small><div>${esc(val.length > 140 ? val.slice(0, 140) + "…" : val)}</div></div><button class="btn ghost sm" data-a="nfeCopia" data-i="${i}">Copiar</button></div>`; }); return o; })()}</div></details>
      <div class="actions" style="margin-top:0"><button class="btn ghost" data-a="nfeJson">Copiar os dados em JSON</button></div>`;
    const ambTxt = amb === "producao" ? "Produção (nota com valor fiscal)" : "Homologação (teste, sem valor fiscal)";
    h += `<div class="card"><b>Enviar para emissão</b><p class="sub" style="margin:2px 0 8px">Ambiente: <b id="nfeAmbTxt">${ambTxt}</b>. Configure a conexão com o emissor no fim da tela. Sem emissor, copie as linhas acima para o emissor da SEFAZ.</p>
      <label class="f" id="nfeOkBox" style="flex-direction:row;align-items:center;gap:8px"${amb === "producao" ? "" : " hidden"}><input type="checkbox" data-nfeok="1"${NFE.ok ? " checked" : ""} style="width:auto;min-height:0"> Entendo que esta nota tem valor fiscal e confirmei os dados com o contador.</label>
      <div class="actions"><button class="btn" data-a="nfeEnviar"${NFE.busy ? " disabled" : ""}>${NFE.busy ? "Enviando…" : "Enviar para emissão"}</button></div>
      ${NFE.prog ? `<div class="hint">${esc(NFE.prog)}</div>` : ""}${NFE.err ? `<div class="note2" style="border:1px solid var(--bd)">${NFE.err}</div>` : ""}${NFE.resp ? nfeRespHTML(NFE.resp) : ""}</div>`;
  } else {
    h += `<div class="card">${(NFE_F[s] || []).map(f => nfeRowHTML(f, pget(d, f.p), f.p)).join("")}
      ${s === 1 || s === 2 ? `<div class="actions"><button class="btn ghost sm" data-a="nfeBusca" data-w="${s === 1 ? "em" : "de"}">Preencher pelo CNPJ</button></div><div class="hint">${esc(NFE.buscaMsg)}</div>` : ""}
      ${s === 3 ? `<div class="meta">Destino da operação: <b>${localDest(d) === "1" ? "1 - Interna (mesmo estado)" : localDest(d) === "2" ? "2 - Interestadual" : "defina os estados no emitente e no destinatário"}</b></div><div class="meta">Regime do emitente: <b>${S.cfg.regime === "MEI" ? "MEI (Simples Nacional)" : "Simples Nacional"}</b></div>` : ""}
      ${s === 6 ? `<div class="meta" id="nfeInfoPrev"><b>Texto final:</b> ${esc(nfeInfo(d))}</div>` : ""}</div>`;
  }
  return h;
}
function nfeRespHTML(r){
  const ok = r.status === "autorizado", base = r.base || "";
  return `<div class="card" style="margin-top:8px"><div class="top"><b>${ok ? "Nota autorizada" : /erro|rejeit|cancel|denega/.test(String(r.status)) ? "Nota não autorizada" : "Em processamento"}</b><span class="tag ${ok ? "ok" : /erro|rejeit/.test(String(r.status)) ? "bd" : "wn"}">${esc(r.status || "")}</span></div>
    ${r.numero ? `<div class="meta">Número ${esc(r.numero)}, série ${esc(r.serie || "")}</div>` : ""}${r.chave ? `<div class="meta" style="overflow-wrap:anywhere">Chave: ${esc(r.chave)}</div>` : ""}${r.msg ? `<div class="meta">${esc(r.msg)}</div>` : ""}
    <div class="links">${r.danfe ? `<a class="btn sm" href="${su(base + r.danfe)}" target="_blank" rel="noopener">Abrir DANFE (PDF)</a>` : ""}${r.xml ? `<a class="btn ghost sm" href="${su(base + r.xml)}" target="_blank" rel="noopener">Baixar XML</a>` : ""}${!ok && r.ref ? `<button class="btn ghost sm" data-a="nfeConsulta">Consultar de novo</button>` : ""}</div></div>`;
}
function nfeNotasHTML(){
  const l = S.nfe.notas; if (!l.length) return `<div class="card empty">Nenhuma nota enviada ainda.</div>`;
  return l.map(n => `<div class="card"><div class="top"><b>${esc(n.destino || "Nota")}</b><span class="tag ${n.status === "autorizado" ? "ok" : "wn"}">${esc(n.status)}</span></div><div class="meta">${n.numero ? "Nº " + esc(n.numero) + ". " : ""}${money(n.valor || 0)}. ${esc(n.amb === "producao" ? "Produção" : "Homologação")}. ${new Date(n.at).toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"})}</div>
    <div class="links">${n.danfe ? `<a class="btn sm" href="${su((n.base || "") + n.danfe)}" target="_blank" rel="noopener">DANFE</a>` : ""}${n.xml ? `<a class="btn ghost sm" href="${su((n.base || "") + n.xml)}" target="_blank" rel="noopener">XML</a>` : ""}<button class="btn ghost sm" data-a="nfeNotaDel" data-id="${n.id}">Remover da lista</button></div></div>`).join("");
}
function nfeHTML(){
  const d = S.nfe.d;
  let h = `<div class="chips"><button class="chip${NFE.aba === "emitir" ? " on" : ""}" data-a="nfeAba" data-v="emitir">Emitir</button><button class="chip${NFE.aba === "notas" ? " on" : ""}" data-a="nfeAba" data-v="notas">Notas enviadas</button></div>`;
  if (NFE.aba === "notas") return h + nfeNotasHTML() + nfeCfgHTML();
  if (!d) return h + `<div class="card"><b>Emitir uma nota fiscal</b><p class="sub" style="margin:2px 0 8px">O app leva você linha por linha, em 8 passos, do emitente até o envio.</p><div class="actions"><button class="btn" data-a="nfeNovo">Começar uma nota</button></div></div>` + nfeCfgHTML();
  h += nfeTopo(d) + nfeStepHTML(d);
  h += `<div class="actions"><button class="btn ghost" data-a="nfeVolta"${NFE.step === 0 ? " disabled" : ""}>Voltar</button>${NFE.step < NFE_STEPS.length - 1 ? `<button class="btn" data-a="nfeProx">Próximo</button>` : ""}<button class="btn danger sm" data-a="nfeLimpa">Descartar rascunho</button></div>`;
  return h + nfeCfgHTML();
}
function nfeDraw(){ const o = $("#nfeOut"); if (o) o.innerHTML = nfeHTML(); }
function viewNfe(m){
  m.innerHTML = `<h1>Emitir nota fiscal</h1><p class="sub">Preencha cada linha da NF-e, com ajuda em cada campo, e envie ao emissor ou copie para a SEFAZ.</p><div id="nfeOut">${nfeHTML()}</div>
  <div class="note2"><b>Importante:</b> emitir nota exige certificado digital e cadastro na SEFAZ, feitos no emissor. Códigos de imposto, CFOP e NCM dependem do produto e do estado: confirme com o seu contador antes de usar a Produção. O app não calcula impostos nem garante a aceitação da SEFAZ.</div>`;
}
function nfeSet(path, value, el){
  const d = S.nfe.d; if (!d) return; const t = el && el.dataset.t; let v = value;
  if (t === "cnpj"){ v = maskCnpj(v); if (el) el.value = v; } else if (t === "cep"){ const x = digs(v).slice(0, 8); v = x.length > 5 ? x.slice(0, 5) + "-" + x.slice(5) : x; if (el) el.value = v; } else if (t === "ncm"){ v = digs(v).slice(0, 8); if (el) el.value = v; }
  pset(d, path, v); save();
  const T = nfeTotais(d), it = d.itens[NFE.it]; const b = $("#nfeBruto"); if (b && it) b.innerHTML = `Valor total do item: <b>${money(itBruto(it))}</b>${!it.cfop && cfopPad(d) ? ". CFOP automático: " + cfopPad(d) : ""}`;
  const p1 = $("#nfeP"), p2 = $("#nfeT"); if (p1) p1.textContent = money(T.prod); if (p2) p2.textContent = money(T.total); const ip = $("#nfeInfoPrev"); if (ip) ip.innerHTML = "<b>Texto final:</b> " + esc(nfeInfo(d));
}
async function nfeBusca(w){
  const d = S.nfe.d, dg = digs(d[w].cnpj); if (!cnpjOk(dg)){ NFE.buscaMsg = "Digite um CNPJ válido primeiro."; nfeDraw(); return; }
  NFE.buscaMsg = "Consultando…"; nfeDraw();
  try{ const r = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + dg); if (!r.ok) throw new Error("HTTP " + r.status); const j = await r.json(), x = d[w];
    const put = (k, v) => { if (v && !String(x[k] || "").trim()) x[k] = String(v); };
    put("nome", gk(j, "razao_social")); if (w === "em") put("fantasia", gk(j, "nome_fantasia")); put("logradouro", [gk(j, "descricao_tipo_de_logradouro"), gk(j, "logradouro")].filter(Boolean).join(" ")); put("numero", gk(j, "numero")); put("bairro", gk(j, "bairro")); put("municipio", gk(j, "municipio")); put("uf", gk(j, "uf")); put("cep", String(gk(j, "cep") || "").replace(/^(\d{5})(\d{3})$/, "$1-$2")); put("tel", gk(j, "ddd_telefone_1"));
    save(); NFE.buscaMsg = "Dados preenchidos. Confira cada linha."; }
  catch(e){ NFE.buscaMsg = "Não foi possível consultar agora. Digite os dados à mão."; }
  nfeDraw();
}
async function nfeFetch(path, opts, amb){
  const c = S.cfg, base = amb === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
  if (c.nfeProxy){ const u = c.nfeProxy.replace(/\/$/, "") + path.proxy + (path.proxy.includes("?") ? "&" : "?") + "amb=" + amb; const h = {"content-type":"application/json"}; if (c.nfeProxyToken) h.authorization = "Bearer " + c.nfeProxyToken; return {r:await fetch(u, {method:opts.method, headers:h, body:opts.body}), base}; }
  const h = {"content-type":"application/json", authorization:"Basic " + btoa(c.nfeToken + ":")}; return {r:await fetch(base + path.direct, {method:opts.method, headers:h, body:opts.body}), base};
}
function nfeLerResp(j, base, ref){
  const erros = Array.isArray(j.erros) ? j.erros.map(e => esc((e.mensagem || "") + (e.campo ? " (" + e.campo + ")" : ""))).join("<br>") : "";
  return {status:j.status || j.codigo || "", numero:j.numero, serie:j.serie, chave:j.chave_nfe, msg:j.mensagem_sefaz || j.mensagem || "", danfe:j.caminho_danfe, xml:j.caminho_xml_nota_fiscal, base, ref, erros};
}
async function nfeEnviar(){
  const d = S.nfe.d; if (!d || NFE.busy) return; if (!can("notas.emitir")){ NFE.err = "Seu papel não permite emitir notas."; nfeDraw(); return; } const v = nfeValidar(d); if (v.length){ NFE.err = "Corrija os itens acima antes de enviar."; nfeDraw(); return; }
  if (!S.cfg.nfeProxy && !S.cfg.nfeToken){ NFE.err = "Conecte um emissor de notas no fim da tela, ou copie as linhas para a SEFAZ."; nfeDraw(); return; }
  const amb = S.cfg.nfeAmb === "producao" ? "producao" : "homologacao"; if (amb === "producao" && !NFE.ok){ NFE.err = "Marque a confirmação para emitir em Produção."; nfeDraw(); return; }
  NFE.busy = true; NFE.err = ""; NFE.resp = null; NFE.prog = "Enviando a nota…"; nfeDraw();
  d.ref = d.ref || "lc" + Date.now().toString(36);
  try{
    const {r, base} = await nfeFetch({direct:"/v2/nfe?ref=" + d.ref, proxy:"/nfe?ref=" + d.ref}, {method:"POST", body:JSON.stringify(nfePayload(d, amb))}, amb);
    let j = {}; try{ j = await r.json(); }catch(e){}
    if (!r.ok && !j.status){ NFE.err = esc(j.mensagem || "O emissor recusou o envio (HTTP " + r.status + ").") + (Array.isArray(j.erros) ? "<br>" + j.erros.map(e => esc((e.mensagem || "") + (e.campo ? " (" + e.campo + ")" : ""))).join("<br>") : ""); NFE.busy = false; NFE.prog = ""; nfeDraw(); return; }
    let resp = nfeLerResp(j, base, d.ref);
    for (let i = 0; i < 8 && /processando/.test(resp.status); i++){ NFE.prog = "Aguardando a SEFAZ… (" + (i + 1) + ")"; NFE.resp = resp; nfeDraw(); await new Promise(z => setTimeout(z, 2500));
      const q = await nfeFetch({direct:"/v2/nfe/" + d.ref, proxy:"/nfe/status?ref=" + d.ref}, {method:"GET"}, amb); let k = {}; try{ k = await q.r.json(); }catch(e){} resp = nfeLerResp(k, base, d.ref); }
    NFE.resp = resp; NFE.prog = ""; if (resp.erros) NFE.err = resp.erros; logEv("Nota fiscal enviada ao emissor", (amb === "producao" ? "produção" : "homologação") + ": " + resp.status);
    S.nfe.notas.unshift({id:uid(), ref:d.ref, status:resp.status, numero:resp.numero, serie:resp.serie, chave:resp.chave, danfe:resp.danfe, xml:resp.xml, base, destino:d.de.nome, valor:nfeTotais(d).total, amb, at:Date.now()}); save();
  }catch(e){ NFE.err = "Não foi possível falar com o emissor daqui. No site, o navegador bloqueia esse envio: use o app instalado, o servidor intermediário ou copie as linhas para a SEFAZ."; NFE.prog = ""; }
  NFE.busy = false; nfeDraw();
}
async function nfeConsulta(){
  const d = S.nfe.d, ref = (NFE.resp && NFE.resp.ref) || (d && d.ref); if (!ref) return; const amb = S.cfg.nfeAmb === "producao" ? "producao" : "homologacao";
  try{ const q = await nfeFetch({direct:"/v2/nfe/" + ref, proxy:"/nfe/status?ref=" + ref}, {method:"GET"}, amb); const k = await q.r.json(); NFE.resp = nfeLerResp(k, q.base, ref); const n = S.nfe.notas.find(x => x.ref === ref); if (n){ Object.assign(n, {status:NFE.resp.status, numero:NFE.resp.numero, chave:NFE.resp.chave, danfe:NFE.resp.danfe, xml:NFE.resp.xml}); save(); } }catch(e){ NFE.err = "Não foi possível consultar agora."; }
  nfeDraw();
}

/* ---------- regularidade do CNPJ: situação, DAS e pendências ---------- */
const RG = {cnpj:"", loading:false, dados:null, erro:"", fonte:""};
const pad2 = v => String(v).padStart(2, "0");
const compsRecentes = () => { const o = [], t = new Date(); for (let i = 11; i >= 0; i--){ const d = new Date(t.getFullYear(), t.getMonth() - i, 1); o.push(d.getFullYear() + "-" + pad2(d.getMonth() + 1)); } return o; };
function dasVenc(c){ let [y, m] = c.split("-").map(Number); m++; if (m > 12){ m = 1; y++; } const d = new Date(y, m - 1, 20); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
const compTxt = c => { const [y, m] = c.split("-"); return ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][+m] + "/" + y; };
function dasInfo(c){
  const pago = !!(S.reg.pagos && S.reg.pagos[c]), v = dasVenc(c), dias = -daysTo(v), valor = n(S.cfg.dasMei) || 0;
  if (pago) return {c, pago, v, k:"ok", t:"Pago", valor};
  if (dias > 0) return {c, pago, v, k:"bd", t:`Atrasado ${dias} dia${dias > 1 ? "s" : ""}`, dias, multa:valor * Math.min(0.0033 * dias, 0.20), valor};
  const f = -dias; return {c, pago, v, k:f <= 3 ? "wn" : "", t:f === 0 ? "Vence hoje" : `Vence em ${f} dia${f > 1 ? "s" : ""}`, f, valor};
}
function dasPend(){
  if (!S.reg || !S.reg.ativo || S.cfg.regime !== "MEI") return {atr:0, prox:null};
  const l = compsRecentes().map(dasInfo).filter(x => !x.pago); return {atr:l.filter(x => x.k === "bd").length, prox:l.filter(x => x.k === "wn")[0] || null};
}
const dasnInfo = () => { const y = new Date().getFullYear() - 1, prazo = y + 1 + "-05-31", feito = !!(S.reg.dasn && S.reg.dasn[y]), d = -daysTo(prazo);
  if (!feito && !S.reg.ativo) return {ano:y, prazo, feito, k:"", t:"Marque se já entregou"};
  return {ano:y, prazo, feito, k:feito ? "ok" : d > 0 ? "bd" : (-d <= 30 ? "wn" : ""), t:feito ? "Entregue" : d > 0 ? `Atrasada ${d} dia${d > 1 ? "s" : ""}` : `Vence em ${-d} dias`}; };
const CHK = [
  ["das", "DAS e pendências no SIMEI (extrato)", "Exige login gov.br com nível prata ou ouro.", "https://www8.receita.fazenda.gov.br/SimplesNacional/Servicos/Grupo.aspx?grp=t&area=2"],
  ["pgfn", "Dívida ativa (PGFN)", "Mostra dívidas inscritas, inclusive de DAS atrasado antigo.", "https://www.regularize.pgfn.gov.br"],
  ["cnd", "Certidão federal (Receita e PGFN)", "Emita e anote a validade na aba Documentos.", "https://www.gov.br/receitafederal/pt-br"],
  ["fgts", "Regularidade do FGTS (CRF)", "Só aparece se tiver empregado ou obrigação no FGTS.", "https://consulta-crf.caixa.gov.br"],
  ["cndt", "Certidão trabalhista (CNDT)", "Confira se não há débitos trabalhistas.", "https://cndt-certidao.tst.jus.br"],
  ["sanc", "Sanções e impedimentos (CEIS e CNEP)", "Empresa sancionada não pode contratar com o governo.", "https://portaldatransparencia.gov.br"],
  ["sicaf", "Cadastro no SICAF", "Veja se o cadastro está ativo e com documentos válidos.", "https://www.gov.br/compras/pt-br/acesso-a-informacao/perguntas-frequentes/sicaf-sistema/sicaf-sistema"]
];
function chkInfo(k){ const c = (S.reg.checks || {})[k]; if (!c) return {k:"", t:"Não verificado"}; const dias = -daysTo(c.d); if (c.r === "pend") return {k:"bd", t:"Com pendência", c, dias}; return dias > 30 ? {k:"wn", t:"Verificar de novo", c, dias} : {k:"ok", t:"Sem pendência", c, dias}; }
async function rgBusca(){
  const d = cnpjDig(RG.cnpj); RG.erro = ""; if (!cnpjOk(d)){ RG.erro = "Digite um CNPJ válido."; rgDraw(); return; }
  RG.loading = true; RG.dados = null; rgDraw();
  try{ const r = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + d); if (r.status === 404) throw {code:"nf"}; if (!r.ok) throw new Error("HTTP " + r.status); RG.dados = await r.json(); RG.fonte = Date.now();
    if (d === cnpjDig(S.empresa.cnpj)){ const j = RG.dados; S.reg.ultima = {at:Date.now(), sit:String(gk(j, "descricao_situacao_cadastral")), motivo:String(gk(j, "descricao_motivo_situacao_cadastral", "motivo_situacao_cadastral")), simples:!!gk(j, "opcao_pelo_simples") && !gk(j, "data_exclusao_do_simples"), mei:!!gk(j, "opcao_pelo_mei") && !gk(j, "data_exclusao_do_mei")}; save(); } }
  catch(e){ RG.erro = e && e.code === "nf" ? "CNPJ não encontrado na base pública." : (e instanceof TypeError ? "net" : "A consulta pública está indisponível agora. Tente mais tarde."); }
  RG.loading = false; rgDraw();
}
function rgPublicoHTML(j){
  const g = (...k) => String(gk(j, ...k) || ""), sit = g("descricao_situacao_cadastral"), ativa = norm(sit) === "ativa", al = [];
  if (!ativa && sit) al.push({c:"bd", t:"Situação cadastral: " + sit + (g("descricao_motivo_situacao_cadastral", "motivo_situacao_cadastral") ? ". Motivo: " + g("descricao_motivo_situacao_cadastral", "motivo_situacao_cadastral") : "") + ". Regularize antes de participar de licitações."});
  if (g("data_exclusao_do_simples")) al.push({c:"bd", t:"Excluída do Simples Nacional em " + fdate(d10(g("data_exclusao_do_simples"))) + "."});
  if (g("data_exclusao_do_mei")) al.push({c:"bd", t:"Desenquadrada do MEI em " + fdate(d10(g("data_exclusao_do_mei"))) + "."});
  if (g("situacao_especial")) al.push({c:"wn", t:"Situação especial: " + g("situacao_especial") + "."});
  const mei = !!gk(j, "opcao_pelo_mei") && !g("data_exclusao_do_mei"), sn = !!gk(j, "opcao_pelo_simples") && !g("data_exclusao_do_simples");
  const q = (j.qsa || []).slice(0, 6);
  return `<div class="card"><div class="top"><b>${esc(g("razao_social") || "Empresa")}</b><span class="tag ${ativa ? "ok" : "bd"}">${esc(sit || "Sem situação")}</span></div>
    ${g("nome_fantasia") ? `<div class="meta">${esc(g("nome_fantasia"))}</div>` : ""}
    <div class="meta">Situação desde ${g("data_situacao_cadastral") ? fdate(d10(g("data_situacao_cadastral"))) : "-"}. Aberta em ${g("data_inicio_atividade") ? fdate(d10(g("data_inicio_atividade"))) : "-"}.</div>
    <div class="meta">${esc(g("descricao_porte", "porte"))}${g("natureza_juridica") ? ". " + esc(g("natureza_juridica")) : ""}</div><div class="meta">Atividade: ${esc(g("cnae_fiscal_descricao"))}</div>
    <div class="meta">${esc(g("municipio"))}${g("uf") ? "/" + esc(g("uf")) : ""}${gk(j, "capital_social") !== "" ? ". Capital social " + money(+gk(j, "capital_social") || 0) : ""}</div>
    <div class="meta"><b>MEI:</b> ${mei ? "sim" : "não"}. <b>Simples Nacional:</b> ${sn ? "sim" : "não"}.</div>
    ${q.length ? `<div class="meta"><b>Sócios:</b> ${q.map(x => esc(String(gk(x, "nome_socio") || ""))).filter(Boolean).join("; ")}</div>` : ""}</div>
    ${al.map(a => `<div class="note2" style="border:1px solid var(--${a.c === "bd" ? "bd" : "wn"})">${esc(a.t)}</div>`).join("")}`;
}
function semaforo(){
  const it = [], U = S.reg.ultima, D = dasPend(), N = dasnInfo(), dp = docProblems();
  it.push({n:"Situação cadastral", k:!U ? "" : norm(U.sit) === "ativa" ? "ok" : "bd", t:!U ? "Consulte o CNPJ" : U.sit});
  if (S.cfg.regime === "MEI"){ it.push({n:"DAS mensal", k:!S.reg.ativo ? "" : D.atr ? "bd" : D.prox ? "wn" : "ok", t:!S.reg.ativo ? "Marque os meses pagos" : D.atr ? D.atr + " em atraso" : D.prox ? "Vence em breve" : "Em dia"}); it.push({n:"Declaração anual (DASN-SIMEI)", k:N.k, t:N.t}); }
  it.push({n:"Documentos de habilitação", k:dp ? "bd" : "ok", t:dp ? dp + " vencido(s) ou vencendo" : "Em dia"});
  CHK.forEach(([k, l]) => { const c = chkInfo(k); it.push({n:l, k:c.k, t:c.t}); });
  return it;
}
function rgOwnHTML(){
  const R = S.reg, mei = S.cfg.regime === "MEI", S0 = semaforo(), pend = S0.filter(x => x.k === "bd").length, aten = S0.filter(x => x.k === "wn").length, nv = S0.filter(x => !x.k).length;
  let h = `<div class="card"><b>Resumo da regularidade</b><div class="kpis" style="margin:8px 0"><div class="kpi"><small>Pendências</small><b class="${pend ? "bd" : ""}">${pend}</b></div><div class="kpi"><small>Atenção</small><b>${aten}</b></div><div class="kpi"><small>Em dia</small><b>${S0.filter(x => x.k === "ok").length}</b></div><div class="kpi"><small>Não verificado</small><b>${nv}</b></div></div>
    <ul class="rows" style="margin:0">${S0.map(x => `<li><span>${esc(x.n)}</span><span><span class="tag ${x.k}">${esc(x.t)}</span></span></li>`).join("")}</ul>
    <div class="hint" style="margin-top:6px">O app só sabe o que a consulta pública mostra e o que você marcou. Ele não enxerga o seu extrato na Receita.</div></div>`;
  if (mei){
    const comps = compsRecentes(), L = comps.map(dasInfo), atr = L.filter(x => x.k === "bd"), tot = atr.reduce((s, x) => s + x.valor + x.multa, 0);
    h += `<div class="card"><b>DAS mensal do MEI</b><p class="sub" style="margin:2px 0 8px">Valor mensal considerado: ${money(n(S.cfg.dasMei))} (mude na engrenagem). Vence todo dia 20 do mês seguinte, ou no próximo dia útil.</p>
      <div class="f"><label for="rg_ate">Já paguei todos os meses até</label><select id="rg_ate" data-rgp="ate"><option value="">Escolha</option>${comps.map(c => `<option value="${c}">${compTxt(c)}</option>`).join("")}</select></div>
      ${atr.length ? `<div class="note2" style="border:1px solid var(--bd)"><b>${atr.length} DAS em atraso.</b> Estimativa com multa de 0,33% ao dia (máximo 20%), sem os juros: ${money(tot)}. Gere o valor exato e a guia atualizada no PGMEI.</div>` : ""}
      <div class="tw"><table class="tbl"><thead><tr><th>Mês</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead><tbody>${L.slice().reverse().map(x => `<tr><td><b>${compTxt(x.c)}</b></td><td>${fdate(x.v)}</td><td><span class="tag ${x.k}">${esc(x.t)}</span>${x.multa ? `<small>Com multa: ${money(x.valor + x.multa)}</small>` : ""}</td><td><button class="btn ${x.pago ? "ghost" : ""} sm" data-a="rgDas" data-c="${x.c}">${x.pago ? "Desmarcar" : "Paguei"}</button></td></tr>`).join("")}</tbody></table></div>
      <div class="links"><a class="btn sm" href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao" target="_blank" rel="noopener">Emitir DAS no PGMEI</a></div></div>`;
    const N = dasnInfo();
    h += `<div class="card"><div class="top"><b>Declaração anual do MEI (DASN-SIMEI)</b><span class="tag ${N.k}">${esc(N.t)}</span></div><div class="meta">Declaração do ano ${N.ano}, com prazo até 31 de maio de ${N.ano + 1}.</div><div class="links"><button class="btn ${N.feito ? "ghost" : ""} sm" data-a="rgDasn" data-y="${N.ano}">${N.feito ? "Desmarcar" : "Já entreguei"}</button><a class="btn ghost sm" href="https://www8.receita.fazenda.gov.br/simplesnacional/" target="_blank" rel="noopener">Portal do Simples Nacional</a></div></div>`;
  } else h += `<div class="note2">Para empresas do Simples Nacional, o valor do DAS muda todo mês. Confira o PGDAS-D e o extrato no <a href="https://www8.receita.fazenda.gov.br/simplesnacional/" target="_blank" rel="noopener">Portal do Simples Nacional</a> ou com o seu contador.</div>`;
  h += `<h2 class="gh">Verificações manuais</h2>` + CHK.map(([k, l, d, u]) => { const c = chkInfo(k); return `<div class="card"><div class="top"><b>${esc(l)}</b><span class="tag ${c.k}">${esc(c.t)}</span></div><div class="meta">${esc(d)}</div>${c.c ? `<div class="meta">Verificado em ${fdate(c.c.d)}.</div>` : ""}
    <div class="links"><a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">Abrir o site</a><button class="btn sm" data-a="rgChk" data-k="${k}" data-r="ok">Sem pendência</button><button class="btn danger sm" data-a="rgChk" data-k="${k}" data-r="pend">Com pendência</button></div></div>`; }).join("");
  return h;
}
function rgHTML(){
  let h = `<div class="card"><div class="fg"><div class="f"><label for="rg_cnpj">CNPJ para consultar</label><input id="rg_cnpj" data-rg="cnpj" inputmode="numeric" autocomplete="off" placeholder="00.000.000/0000-00" value="${esc(RG.cnpj)}"></div></div><div class="hint" id="rg_msg">${esc(cnpjMsg(RG.cnpj))}</div><div class="actions"><button class="btn" data-a="rgConsulta">${RG.loading ? "Consultando…" : "Consultar"}</button></div></div>`;
  if (RG.erro === "net") h += `<div class="card"><b>Não foi possível consultar</b><p class="sub" style="margin:6px 0 0">O navegador ou o link em que você abriu o app bloqueia esse acesso. No aplicativo instalado pela loja a consulta funciona.</p></div>`; else if (RG.erro) h += `<div class="note2">${esc(RG.erro)}</div>`;
  if (RG.dados) h += rgPublicoHTML(RG.dados);
  const own = cnpjOk(RG.cnpj) && cnpjDig(RG.cnpj) === cnpjDig(S.empresa.cnpj);
  if (own) h += rgOwnHTML();
  else if (RG.dados) h += `<div class="note2">Este não é o CNPJ da sua empresa. Para conferir outro fornecedor, peça as certidões dele e consulte as sanções no <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener">Portal da Transparência</a>.</div>`;
  else if (!cnpjOk(S.empresa.cnpj)) h += `<div class="note2">Para acompanhar o DAS e as pendências da sua empresa, cadastre o CNPJ em Mais, Dados da empresa.</div>`;
  return h;
}
function rgDraw(){ const o = $("#rgOut"); if (o) o.innerHTML = rgHTML(); }
function viewRegularidade(m){
  if (!RG.cnpj && S.empresa.cnpj) RG.cnpj = S.empresa.cnpj;
  m.innerHTML = `<h1>Regularidade do CNPJ</h1><p class="sub">Digite o CNPJ para ver a situação cadastral e os alertas. Para a sua empresa, o app também controla o DAS e as pendências.</p><div id="rgOut">${rgHTML()}</div>
  <div class="note2"><b>O que o app consegue e o que não consegue:</b> a situação cadastral, a opção pelo MEI e pelo Simples e as datas vêm da base pública do CNPJ. <b>DAS em atraso, débitos e certidões não aparecem só com o CNPJ</b>: a Receita exige login gov.br para mostrar o extrato. Por isso o app controla o DAS a partir do que você marca e leva você aos sites oficiais. Contadores podem consultar esses dados por serviço pago da Receita (Integra Contador), que o app ainda não usa.</div>`;
}

/* ---------- segurança: papéis, registro de atividades, 2FA, cofre e nuvem ---------- */
const PERM_L = {"financeiro.pedidos":"Pedir crédito e antecipação", "notas.emitir":"Emitir notas fiscais", "ia.usar":"Usar a IA nos editais", "backup.nuvem":"Backup na nuvem", "logs.ver":"Ver o registro de atividades", "logs.exportar":"Exportar o registro", "comissao.ver":"Ver as comissões", "comissao.editar":"Editar o modelo de comissão", "usuarios.gerir":"Gerir usuários e papéis", "bancos.conectar":"Conectar contas bancárias (somente leitura)"};
const ROLES = {
  fornecedor:{n:"Fornecedor", p:["financeiro.pedidos", "notas.emitir", "ia.usar", "backup.nuvem", "logs.ver", "bancos.conectar"]},
  analista:{n:"Analista", p:["financeiro.pedidos", "ia.usar", "logs.ver"]},
  financeiro:{n:"Financeiro", p:["financeiro.pedidos", "comissao.ver", "logs.ver", "bancos.conectar"]},
  operador:{n:"Operador da plataforma", p:["financeiro.pedidos", "comissao.ver", "comissao.editar", "logs.ver", "logs.exportar"]},
  admin:{n:"Administrador", p:Object.keys(PERM_L)}
};
const CLOUD = {tok:null, uid:"", email:"", claims:null, exp:0};
const papelAtual = () => { const r = CLOUD.claims && CLOUD.claims.role; return ROLES[r] ? r : ((S.sec && ROLES[S.sec.papel]) ? S.sec.papel : "fornecedor"); };
const can = p => ROLES[papelAtual()].p.includes(p);
const sha256hex = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
const dec = b => new TextDecoder().decode(b);
const rnd = n => crypto.getRandomValues(new Uint8Array(n));
/* registro de atividades com hash encadeado (mostra se alguém alterou o histórico) */
let logChain = Promise.resolve();
function logEv(ev, det){
  logChain = logChain.then(async () => { try{
    const a = S.audit = Array.isArray(S.audit) ? S.audit : [], prev = a.length ? a[a.length - 1].h : "0", t = new Date().toISOString(), u = (getAuth() || {}).email || "", d = String(det || "").slice(0, 200);
    const h = await sha256hex(prev + "|" + t + "|" + u + "|" + ev + "|" + d); a.push({t, u, e:ev, d, h}); if (a.length > 600) a.splice(0, a.length - 600); save();
  }catch(e){} });
  return logChain;
}
async function logVerifica(){ const a = S.audit || []; for (let i = 1; i < a.length; i++){ const x = a[i], h = await sha256hex(a[i - 1].h + "|" + x.t + "|" + x.u + "|" + x.e + "|" + x.d); if (h !== x.h) return {ok:false, em:i}; } return {ok:true, n:a.length}; }
/* verificação em duas etapas (TOTP, RFC 6238) */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32enc = by => { let bits = "", o = ""; by.forEach(x => bits += x.toString(2).padStart(8, "0")); for (let i = 0; i < bits.length; i += 5) o += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; return o; };
const b32dec = s => { let bits = ""; String(s).replace(/=+$/, "").toUpperCase().split("").forEach(c => { const v = B32.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, "0"); }); const o = []; for (let i = 0; i + 8 <= bits.length; i += 8) o.push(parseInt(bits.slice(i, i + 8), 2)); return new Uint8Array(o); };
async function hotp(sec, ctr){ const k = await crypto.subtle.importKey("raw", b32dec(sec), {name:"HMAC", hash:"SHA-1"}, false, ["sign"]), buf = new ArrayBuffer(8), dv = new DataView(buf); dv.setUint32(0, Math.floor(ctr / 4294967296)); dv.setUint32(4, ctr >>> 0); const h = new Uint8Array(await crypto.subtle.sign("HMAC", k, buf)), o = h[19] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000).padStart(6, "0"); }
async function totpOk(sec, code){ const c = String(code || "").replace(/\s/g, ""), t = Math.floor(Date.now() / 30000); if (!/^\d{6}$/.test(c)) return false; for (const d of [-1, 0, 1]) if (await hotp(sec, t + d) === c) return true; return false; }
async function recOk(code){ const m = S.sec.totp; if (!m) return false; const h = await sha256hex("rec:" + String(code || "").trim().toLowerCase()), i = (m.rec || []).indexOf(h); if (i < 0) return false; m.rec.splice(i, 1); save(); return true; }
/* cofre: segredos criptografados (AES-GCM) com chave derivada da senha */
const VAULT = {key:null, salt:null};
const SECRET_CFG = ["aiKey", "aiToken", "nfeToken", "nfeProxyToken"], SECRET_KEYS = new Set([...SECRET_CFG, "totpSecret", "fbRefresh"]);
const vKey = () => String(KEY) + ":cofre";
async function derive(pw, salt){ const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]); return crypto.subtle.deriveKey({name:"PBKDF2", salt, iterations:150000, hash:"SHA-256"}, k, {name:"AES-GCM", length:256}, false, ["encrypt", "decrypt"]); }
const secretsOf = () => { const o = {}; SECRET_CFG.forEach(k => { o[k] = S.cfg[k] || ""; }); o.totpSecret = S.sec.totpSecret || ""; o.fbRefresh = S.sec.fbRefresh || ""; return o; };
function applySecrets(o){ SECRET_CFG.forEach(k => { if (o[k] && !S.cfg[k]) S.cfg[k] = o[k]; }); if (o.totpSecret && !S.sec.totpSecret) S.sec.totpSecret = o.totpSecret; if (o.fbRefresh && !S.sec.fbRefresh) S.sec.fbRefresh = o.fbRefresh; }
async function vaultSave(){
  if (!VAULT.key) return; const iv = rnd(12), ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, VAULT.key, enc.encode(JSON.stringify(secretsOf())));
  try{ localStorage.setItem(vKey(), JSON.stringify({v:1, salt:b64(VAULT.salt), iv:b64(iv), ct:b64(ct)})); }catch(e){}
}
let vaultT = null; const vaultSoon = () => { clearTimeout(vaultT); vaultT = setTimeout(() => { vaultSave().catch(() => {}); }, 400); };
async function vaultOpen(pw){
  let raw = null; try{ raw = localStorage.getItem(vKey()); }catch(e){}
  if (raw){ const o = JSON.parse(raw), salt = unb64(o.salt), key = await derive(pw, salt);
    try{ applySecrets(JSON.parse(dec(await crypto.subtle.decrypt({name:"AES-GCM", iv:unb64(o.iv)}, key, unb64(o.ct))))); VAULT.key = key; VAULT.salt = salt; await vaultSave(); save(); return true; }catch(e){ return false; } }
  VAULT.salt = rnd(16); VAULT.key = await derive(pw, VAULT.salt); await vaultSave(); save(); return true;
}
async function vaultRekey(cur, nw){ if (!VAULT.key && !(await vaultOpen(cur))) return false; VAULT.salt = rnd(16); VAULT.key = await derive(nw, VAULT.salt); await vaultSave(); return true; }
/* nuvem (Firebase, pela API REST) */
const jwtPayload = t => { try{ return JSON.parse(decodeURIComponent(escape(atob(String(t).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); }catch(e){ return null; } };
const fbErr = c => ({EMAIL_NOT_FOUND:"E-mail não cadastrado.", INVALID_PASSWORD:"Senha incorreta.", INVALID_LOGIN_CREDENTIALS:"E-mail ou senha incorretos.", EMAIL_EXISTS:"Este e-mail já tem conta.", WEAK_PASSWORD:"Senha fraca. Use pelo menos 6 caracteres.", SEM_SESSAO:"Entre na nuvem primeiro.", NAO_CONFIGURADO:"Preencha a chave da API, o projeto e o bucket do Firebase.", MFA_REQUIRED:"Esta conta exige segundo fator do Firebase, que o app ainda não conclui."})[String(c).split(" ")[0]] || "O Firebase recusou o pedido (" + c + ").";
function fbSet(j){ CLOUD.emailOk = !!(jwtPayload(j.idToken) || {}).email_verified; CLOUD.tok = j.idToken; CLOUD.uid = j.localId; CLOUD.email = j.email || CLOUD.email; CLOUD.exp = Date.now() + (+j.expiresIn || 3600) * 1000 - 60000; CLOUD.claims = jwtPayload(j.idToken); if (j.refreshToken){ S.sec.fbRefresh = j.refreshToken; save(); } if (!CLOUD.syncAss) assinaturaSync(); }
async function fbAuth(criar, email, senha){
  if (!S.cfg.fbApiKey) throw {code:"NAO_CONFIGURADO"};
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${criar ? "signUp" : "signInWithPassword"}?key=${encodeURIComponent(S.cfg.fbApiKey)}`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({email, password:senha, returnSecureToken:true})});
  const j = await r.json(); if (!r.ok) throw {code:(j.error && j.error.message) || "ERRO"}; if (j.mfaPendingCredential) throw {code:"MFA_REQUIRED"}; fbSet(j); CLOUD.email = email; return j;
}
async function fbToken(){
  if (CLOUD.tok && Date.now() < CLOUD.exp) return CLOUD.tok; if (!S.sec.fbRefresh) throw {code:"SEM_SESSAO"};
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(S.cfg.fbApiKey)}`, {method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"}, body:"grant_type=refresh_token&refresh_token=" + encodeURIComponent(S.sec.fbRefresh)});
  const j = await r.json(); if (!r.ok) throw {code:(j.error && j.error.message) || "SEM_SESSAO"}; fbSet({idToken:j.id_token, refreshToken:j.refresh_token, localId:j.user_id, expiresIn:j.expires_in}); return CLOUD.tok;
}
async function fbMailEnvia(){ const tok = await fbToken(), r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(S.cfg.fbApiKey)}`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({requestType:"VERIFY_EMAIL", idToken:tok})}); if (!r.ok){ const j = await r.json().catch(() => ({})); throw {code:(j.error && j.error.message) || "ERRO"}; } }
async function fbMailConfere(){ let tok = await fbToken(); const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(S.cfg.fbApiKey)}`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({idToken:tok})}); const j = await r.json(); if (!r.ok) throw {code:(j.error && j.error.message) || "ERRO"};
  const ok = !!(j.users && j.users[0] && j.users[0].emailVerified); if (ok){ CLOUD.exp = 0; await fbToken(); } CLOUD.emailOk = ok; return ok; }
async function fbDiagnostico(){
  const k = S.cfg.fbApiKey, p = S.cfg.fbProject, b = S.cfg.fbBucket, out = [], add = (n, ok, t) => out.push({n, ok, t});
  if (!k || !p || !b) return [{n:"Configuração", ok:false, t:"Preencha a chave da API, o ID do projeto e o bucket do Storage."}];
  const j = async r => { try{ return await r.json(); }catch(e){ return {}; } };
  try{ const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(k)}`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({idToken:"teste"})}), m = JSON.stringify((await j(r)).error || {});
    if (/API key not valid|API_KEY_INVALID/i.test(m)) add("Chave da API", false, "A chave não é válida. Copie de novo em Configurações do projeto, aba Geral.");
    else if (/SERVICE_BLOCKED|blocked/i.test(m)) add("Chave da API", false, "A chave existe, mas está restrita e bloqueia o login. Inclua a Identity Toolkit API nas restrições da chave.");
    else if (/CONFIGURATION_NOT_FOUND/i.test(m)) add("Authentication", false, "A chave vale, mas o Authentication ainda não foi ativado. Abra Authentication, Começar, e ative E-mail/senha.");
    else add("Chave da API e Authentication", true, "Funcionando.");
  }catch(e){ add("Chave da API", false, "Sem conexão com o Firebase. Confira a internet. No link de teste do Claude, este recurso não funciona."); return out; }
  try{ const r = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(p)}/databases/(default)/documents/diagnostico/teste?key=${encodeURIComponent(k)}`), m = JSON.stringify((await j(r)).error || {});
    if (r.status === 403 || r.status === 401) add("Firestore e regras", true, "O banco existe e as regras estão negando acesso sem login. É o esperado.");
    else if (r.status === 200) add("Firestore e regras", false, "ATENÇÃO: o banco está aberto ao público. Publique as regras do projeto agora.");
    else if (/does not exist|not been used|disabled/i.test(m)) add("Firestore", false, "O Firestore ainda não foi criado. Abra Firestore Database, Criar banco de dados, modo produção.");
    else if (r.status === 404 && /NOT_FOUND/i.test(m)) add("Firestore e regras", false, "O banco responde sem exigir login: as regras podem estar abertas. Publique as regras do projeto (firebase deploy).");
    else add("Firestore", false, "Não encontrei o projeto \"" + p + "\". Confira o ID em Configurações do projeto.");
  }catch(e){ add("Firestore", false, "Sem conexão com o Firestore."); }
  try{ const r = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(b)}/o?maxResults=1`);
    if (r.status === 401 || r.status === 403) add("Storage privado", true, "O bucket existe e não é público.");
    else if (r.status === 200) add("Storage privado", false, "ATENÇÃO: o bucket está aberto ao público. Publique as regras do Storage.");
    else add("Storage", false, "Não encontrei o bucket \"" + b + "\". Abra Storage, Começar. Pode ser que o Storage peça o plano Blaze (pague conforme o uso, com cota grátis).");
  }catch(e){ add("Storage", false, "Sem conexão com o Storage."); }
  return out;
}
const fbPath = () => `users/${CLOUD.uid}/backup.enc`;
async function fbBackup(senha){
  if (!S.cfg.fbBucket || !S.cfg.fbProject) throw {code:"NAO_CONFIGURADO"}; const tok = await fbToken();
  const salt = rnd(16), iv = rnd(12), key = await derive(senha, salt), snap = JSON.stringify(S, (k, v) => SECRET_KEYS.has(k) ? undefined : v);
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, enc.encode(snap))), blob = new Uint8Array(28 + ct.length); blob.set(salt, 0); blob.set(iv, 16); blob.set(ct, 28);
  const r = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(S.cfg.fbBucket)}/o?name=${encodeURIComponent(fbPath())}`, {method:"POST", headers:{authorization:"Bearer " + tok, "content-type":"application/octet-stream"}, body:blob});
  if (!r.ok) throw {code:"STORAGE_" + r.status};
  await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(S.cfg.fbProject)}/databases/(default)/documents/users/${CLOUD.uid}?updateMask.fieldPaths=backupAt&updateMask.fieldPaths=backupBytes&updateMask.fieldPaths=appVersion`, {method:"PATCH", headers:{authorization:"Bearer " + tok, "content-type":"application/json"}, body:JSON.stringify({fields:{backupAt:{timestampValue:new Date().toISOString()}, backupBytes:{integerValue:String(blob.length)}, appVersion:{stringValue:"1"}}})}).catch(() => {});
  return blob.length;
}
async function fbBaixa(senha){
  const tok = await fbToken(), r = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(S.cfg.fbBucket)}/o/${encodeURIComponent(fbPath())}?alt=media`, {headers:{authorization:"Bearer " + tok}});
  if (!r.ok) throw {code:r.status === 404 ? "SEM_BACKUP" : "STORAGE_" + r.status}; const b = new Uint8Array(await r.arrayBuffer());
  try{ return JSON.parse(dec(await crypto.subtle.decrypt({name:"AES-GCM", iv:b.slice(16, 28)}, await derive(senha, b.slice(0, 16)), b.slice(28)))); }catch(e){ throw {code:"SENHA_BACKUP"}; }
}
function restauraS(o){
  const keepSec = S.sec, keep = {}; SECRET_CFG.forEach(k => { keep[k] = S.cfg[k]; });
  S = {...clone(DEF), ...o}; S.cfg = {...DEF.cfg, ...(o.cfg || {}), ...keep}; S.sec = keepSec; S.calc = {...DEF.calc, ...(o.calc || {})};
  ["lic", "forn", "cot", "docs", "watch", "alertas", "nichos", "transp", "frete", "pedidos", "radar", "prev", "editais", "cidades", "audit"].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
  S.empresa = {...DEF.empresa, ...(S.empresa || {})}; S.perfil = {...DEF.perfil, ...(S.perfil || {})}; S.fin = {...DEF.fin, ...(S.fin || {})}; ["prop", "ped", "parc"].forEach(k => { if (!Array.isArray(S.fin[k])) S.fin[k] = []; });
  S.nfe = {d:null, notas:[], ...(S.nfe || {})}; S.reg = {ativo:false, pagos:{}, dasn:{}, checks:{}, ultima:null, ...(S.reg || {})}; S.orcTot = S.orcTot || {}; S.fired = S.fired || {};
  save();
}
/* telas */
const SEC = {msg:"", err:"", novo:null, rec:null, fbMsg:"", busy:false, verLog:null};
function secMatriz(){
  const rs = Object.keys(ROLES), ps = Object.keys(PERM_L);
  return `<div class="tw"><table class="tbl fr"><thead><tr><th>Permissão</th>${rs.map(r => `<th>${esc(ROLES[r].n.split(" ")[0])}</th>`).join("")}</tr></thead><tbody>${ps.map(p => `<tr><td>${esc(PERM_L[p])}</td>${rs.map(r => `<td>${ROLES[r].p.includes(p) ? '<span class="tag ok">Sim</span>' : '<span class="tag">Não</span>'}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function secHTML(){
  const a = getAuth() || {}, t = S.sec.totp, cloud = CLOUD.uid ? `Conectado como ${esc(CLOUD.email)}` : "Não conectado", pa = papelAtual();
  let h = `<div class="card"><b>Seu acesso</b><div class="meta">${esc(a.email || "Sem conta neste aparelho")}</div><div class="meta">Papel: <b>${esc(ROLES[pa].n)}</b>${CLOUD.claims && CLOUD.claims.role ? " (definido pelo servidor)" : ""}</div>
    ${CLOUD.claims && CLOUD.claims.role ? "" : `<div class="f" style="margin-top:8px"><label for="sec_papel">Simular outro papel (só demonstração)</label><select id="sec_papel" data-sec="papel">${Object.keys(ROLES).map(r => `<option value="${r}"${S.sec.papel === r ? " selected" : ""}>${esc(ROLES[r].n)}</option>`).join("")}</select></div><div class="hint">Neste aparelho o papel não protege nada de verdade. Quem protege é o servidor, com as regras de acesso do Firebase e do PostgreSQL.</div>`}
    <details class="tut" style="margin-top:10px"><summary>Matriz de permissões por papel</summary><div class="tb">${secMatriz()}</div></details></div>`;
  h += `<div class="card"><div class="top"><b>Verificação em duas etapas</b><span class="tag ${t && t.ativo ? "ok" : "wn"}">${t && t.ativo ? "Ativa" : "Desativada"}</span></div>
    <p class="sub" style="margin:4px 0 8px">Pede um código do aplicativo autenticador (Google Authenticator, Microsoft Authenticator e outros) além da senha, ao entrar neste aparelho.</p>`;
  if (SEC.novo){ h += `<div class="note2"><b>1. Adicione ao autenticador</b><br>No aplicativo autenticador, escolha adicionar por chave e digite:<div style="font:600 17px/1.5 'Sora',monospace;letter-spacing:.06em;word-break:break-all;margin:6px 0">${esc(SEC.novo.match(/.{1,4}/g).join(" "))}</div><a href="otpauth://totp/Lance%20Certo:${encodeURIComponent(a.email || "conta")}?secret=${SEC.novo}&issuer=Lance%20Certo&digits=6&period=30">Abrir no autenticador</a></div>
      <div class="f"><label for="sec_cod">2. Digite o código de 6 números que aparece</label><input id="sec_cod" inputmode="numeric" autocomplete="one-time-code" maxlength="7" data-sec="cod"></div><div class="actions"><button class="btn" data-a="sec2faOk">Confirmar e ativar</button><button class="btn ghost" data-a="sec2faCancela">Cancelar</button></div>`; }
  else if (SEC.rec){ h += `<div class="note2"><b>Guarde estes códigos de recuperação.</b> Cada um vale uma vez, caso você perca o autenticador. Eles não serão mostrados de novo.<div style="font:600 15px/1.7 'Sora',monospace;margin:6px 0">${SEC.rec.map(esc).join("<br>")}</div></div><div class="actions"><button class="btn ghost sm" data-a="secRecCopia">Copiar códigos</button><button class="btn sm" data-a="secRecOk">Já guardei</button></div>`; }
  else h += `<div class="actions" style="margin-top:0">${t && t.ativo ? `<button class="btn danger" data-a="sec2faOff">Desativar</button><span class="hint" style="align-self:center">${(t.rec || []).length} códigos de recuperação restantes</span>` : `<button class="btn" data-a="sec2faIni">Ativar a verificação</button>`}</div>`;
  h += `</div>`;
  h += `<div class="card"><div class="top"><b>Criptografia</b><span class="tag ${VAULT.key ? "ok" : "wn"}">${VAULT.key ? "Cofre aberto" : "Cofre fechado"}</span></div><p class="sub" style="margin:4px 0 0">As chaves e senhas de integração (IA, emissor de notas, segredo da verificação em duas etapas) ficam em um cofre criptografado com AES-256-GCM, usando uma chave gerada da sua senha. ${VAULT.key ? "" : "Entre de novo com a senha para abrir o cofre e usar essas integrações."}</p><div class="hint">Isso protege os dados guardados no aparelho. Não protege contra quem está usando o app aberto, nem contra programas maliciosos no aparelho.</div></div>`;
  h += segChecklist();
  const lg = S.audit || [];
  h += `<div class="card"><b>Registro de atividades</b><p class="sub" style="margin:4px 0 8px">${lg.length} eventos. Cada evento leva o selo do anterior: se alguém mudar o histórico, a verificação acusa.</p>
    <div class="actions" style="margin-top:0"><button class="btn ghost sm" data-a="secLogVer">Verificar integridade</button>${can("logs.exportar") ? '<button class="btn ghost sm" data-a="secLogExp">Copiar o registro</button>' : ""}</div>${SEC.verLog ? `<div class="note2" style="border:1px solid var(--${SEC.verLog.ok ? "ok" : "bd"})">${SEC.verLog.ok ? "Registro íntegro: " + SEC.verLog.n + " eventos conferidos." : "Atenção: o evento " + SEC.verLog.em + " foi alterado."}</div>` : ""}
    ${can("logs.ver") ? `<div class="tw"><table class="tbl fr"><thead><tr><th>Quando</th><th>Evento</th></tr></thead><tbody>${lg.slice(-15).reverse().map(x => `<tr><td>${new Date(x.t).toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"})}</td><td><b>${esc(x.e)}</b><small>${esc(x.d)}</small></td></tr>`).join("") || '<tr><td colspan="2">Nenhum evento ainda.</td></tr>'}</tbody></table></div>` : '<div class="hint">Seu papel não permite ver o registro.</div>'}</div>`;
  const c = S.cfg;
  h += `<div class="card"><div class="top"><b>Nuvem (Firebase)</b><span class="tag ${CLOUD.uid ? "ok" : ""}">${cloud}</span></div><p class="sub" style="margin:4px 0 8px">Entra com a conta do Firebase Authentication e guarda um backup criptografado no Cloud Storage. Só você consegue abrir: a criptografia usa uma senha que o servidor nunca recebe.</p>
    <div class="fg"><div class="f"><label for="fb_key">Chave da API web do Firebase</label><input id="fb_key" data-fb="fbApiKey" autocomplete="off" value="${esc(c.fbApiKey || "")}"></div><div class="f half"><label for="fb_proj">ID do projeto</label><input id="fb_proj" data-fb="fbProject" autocomplete="off" value="${esc(c.fbProject || "")}"></div><div class="f"><label for="fb_api">Endereço da API da plataforma</label><input id="fb_api" data-fb="apiUrl" autocomplete="off" placeholder="https://api.meudominio.com" value="${esc(c.apiUrl || "")}"></div><div class="f half"><label for="fb_bkt">Bucket do Storage</label><input id="fb_bkt" data-fb="fbBucket" autocomplete="off" placeholder="meu-projeto.appspot.com" value="${esc(c.fbBucket || "")}"></div>
      <div class="f half"><label for="fb_em">E-mail da conta</label><input id="fb_em" data-secf="email" autocomplete="off" value="${esc(SEC.fbEmail || a.email || "")}"></div><div class="f half"><label for="fb_pw">Senha da conta</label><input id="fb_pw" type="password" data-secf="pw" autocomplete="off"></div></div>
    <div class="actions" style="margin-bottom:0"><button class="btn ghost" data-a="fbTesta">Testar a conexão</button></div>
    ${SEC.diag ? `<ul class="rows" style="margin:8px 0 0">${SEC.diag.map(x => `<li><span><b>${esc(x.n)}</b><small style="display:block;color:var(--mut)">${esc(x.t)}</small></span><span><span class="tag ${x.ok ? "ok" : "bd"}">${x.ok ? "Certo" : "Ajustar"}</span></span></li>`).join("")}</ul>` : ""}
    <div class="actions"><button class="btn" data-a="fbEntrar">Entrar</button><button class="btn ghost" data-a="fbCriar">Criar conta</button>${CLOUD.uid ? '<button class="btn ghost" data-a="fbSair">Sair da nuvem</button>' : ""}</div>
    ${CLOUD.uid ? `<div class="note2" style="border:1px solid var(--${CLOUD.emailOk ? "ok" : "wn"})">${CLOUD.emailOk ? "E-mail verificado." : "<b>E-mail ainda não verificado.</b> O servidor só libera dados da empresa depois da verificação."} ${CLOUD.emailOk ? "" : '<div class="actions" style="margin-top:8px"><button class="btn sm" data-a="fbMail">Reenviar e-mail</button><button class="btn ghost sm" data-a="fbMailOk">Já confirmei</button></div>'}</div><div class="fg"><div class="f"><label for="fb_bp">Senha de criptografia do backup</label><input id="fb_bp" type="password" data-secf="bp" autocomplete="off"></div></div><div class="actions"><button class="btn" data-a="fbBackup"${can("backup.nuvem") && CLOUD.emailOk ? "" : " disabled"}>Fazer backup agora</button><button class="btn ghost" data-a="fbRestaura">Restaurar o backup</button></div>` : ""}
    ${SEC.fbMsg ? `<div class="hint">${esc(SEC.fbMsg)}</div>` : ""}</div>`;
  return h + `<div class="note2"><b>Servidor:</b> as regras de acesso por função, o banco de dados PostgreSQL com proteção por linha, o envio de notificações (FCM) e o registro de auditoria no servidor estão na pasta <code>backend</code> do projeto da loja. Elas precisam ser publicadas na sua conta do Firebase e no seu servidor.</div>`;
}
async function fbEntra(criar){
  const em = String(SEC.fbEmail || (getAuth() || {}).email || "").trim(), pw = SEC.pw || ""; if (!em || !pw){ SEC.fbMsg = "Digite o e-mail e a senha da conta do Firebase."; secDraw(); return; }
  SEC.fbMsg = "Entrando…"; secDraw();
  try{ await fbAuth(criar, em, pw); if (criar){ try{ await fbMailEnvia(); }catch(e){} } SEC.fbMsg = (criar ? "Conta criada. Enviamos um e-mail para você confirmar o endereço. " : "") + "Conectado." + (CLOUD.claims && CLOUD.claims.role ? " Papel definido pelo servidor: " + ROLES[papelAtual()].n + "." : ""); logEv(criar ? "Conta da nuvem criada" : "Entrada na nuvem", em); if (S.cfg.apiUrl && CLOUD.emailOk){ try{ await apiMe(); }catch(e){} } }
  catch(e){ SEC.fbMsg = e instanceof TypeError ? "Não foi possível falar com o Firebase daqui. Use o app instalado." : fbErr(e && e.code); }
  SEC.pw = ""; secDraw();
}
function segChecklist(){
  const hp = location.protocol, https = hp === "https:" || hp === "capacitor:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname), pa = papelAtual(), cl = CLOUD.claims || {}, bk = S.sec.bk, dias = bk ? Math.floor((Date.now() - new Date(bk.t)) / 864e5) : null;
  const it = [
    ["HTTPS/TLS", https ? "ok" : "wn", https ? "Este app abre por conexão segura. A API exige HTTPS (HSTS) e o banco usa TLS." : "Aberto como arquivo local. Em uso real, publique em HTTPS."],
    ["Firebase Authentication", CLOUD.uid ? "ok" : "sv", CLOUD.uid ? "Conectado como " + CLOUD.email + "." : "Conecte na seção Nuvem abaixo."],
    ["MFA / 2FA", (S.sec.totp && S.sec.totp.ativo) || cl.firebase && cl.firebase.sign_in_second_factor ? "ok" : "wn", S.sec.totp && S.sec.totp.ativo ? "Verificação em duas etapas ativa neste app." : "Ative a verificação em duas etapas. Funcionários só entram com ela no servidor."],
    ["Verificação de e-mail", CLOUD.uid ? (CLOUD.emailOk ? "ok" : "wn") : "sv", CLOUD.uid ? (CLOUD.emailOk ? "E-mail verificado." : "Pendente. O servidor bloqueia dados da empresa sem isso.") : "Vale depois de conectar à nuvem."],
    ["RBAC (papéis)", "ok", "Papel atual: " + ROLES[pa].n + (cl.role ? " (vem do servidor)" : " (demonstração local)") + "."],
    ["Permissões", "ok", ROLES[pa].p.length + " permissões neste papel. Matriz completa acima."],
    ["company_id (empresa)", cl.company_id ? "ok" : "sv", cl.company_id ? "Seu token carrega o company_id. Todo dado fica preso à empresa." : "Definido pelo servidor no primeiro acesso à nuvem."],
    ["PostgreSQL", "sv", "Esquema e testes em backend/postgres. Precisa ser instalado no seu servidor."],
    ["PostgreSQL RLS", "sv", "Regras de linha por papel e empresa em backend/postgres. Rode os testes antes de usar."],
    ["Firebase Security Rules", "sv", "Firestore e Storage em backend/firebase. Precisa ser publicado e testado no emulador."],
    ["Storage privado", "sv", "Regras negam tudo por padrão. O backup do app já sai criptografado do aparelho."],
    ["Proteção contra SQL Injection", "sv", "A API só usa consultas com parâmetros (testado). Vale quando a API estiver no ar."],
    ["Proteção contra XSS, CSRF e IDOR", "ok", "App: todo texto é escapado, links só http e https, e há política CSP (testado). API: sem cookies, então sem CSRF, e dados presos ao company_id."],
    ["Registro de auditoria", (S.audit || []).length ? "ok" : "wn", (S.audit || []).length + " eventos neste aparelho, com selo de integridade. No servidor, a tabela audit_log só aceita inclusão."],
    ["Backups", bk ? (dias <= 7 ? "ok" : "wn") : "wn", bk ? "Último backup " + (bk.onde === "nuvem" ? "na nuvem" : "em arquivo") + " há " + dias + " dia" + (dias === 1 ? "" : "s") + "." + (dias > 7 ? " Faça um novo." : "") : "Nenhum backup feito ainda. Faça um agora."]
  ], nOk = it.filter(x => x[1] === "ok").length, nWn = it.filter(x => x[1] === "wn").length, nSv = it.filter(x => x[1] === "sv").length;
  return `<div class="card"><b>Checklist de segurança</b><p class="sub" style="margin:4px 0 8px">${nOk} ativos, ${nWn} pedem atenção, ${nSv} dependem do servidor. "No servidor" quer dizer que está pronto na pasta backend, e só vale depois de instalado e testado.</p><ul class="rows" style="margin:0">${it.map(([n, k, t]) => `<li><span><b>${esc(n)}</b><small style="display:block;color:var(--mut)">${esc(t)}</small></span><span><span class="tag ${k === "ok" ? "ok" : k === "wn" ? "wn" : ""}">${k === "ok" ? "Ativo" : k === "wn" ? "Atenção" : "No servidor"}</span></span></li>`).join("")}</ul></div>`;
}
function secDraw(){ const o = $("#secOut"); if (o) o.innerHTML = secHTML(); }
function viewSeguranca(m){ m.innerHTML = `<h1>Segurança e acesso</h1><p class="sub">Verificação em duas etapas, criptografia, registro de atividades, papéis e nuvem.</p><div id="secOut">${secHTML()}</div>`; }
/* ---------- marketplace financeiro: catálogo, prontidão e operador ---------- */
const FIN_CATS = [["todos", "Todos"], ["banco", "Bancos"], ["financeira", "Financeiras e cooperativas"], ["fintech", "Fintechs"], ["open", "Open Finance"], ["garantia", "Garantias"], ["oficial", "Plataformas oficiais"]];
const FIN_CAT = [
  {n:"AntecipaGov", c:"oficial", p:["Antecipação de recebível"], d:"Portal do Governo Federal. Instituições credenciadas disputam o seu pedido de antecipação de contrato.", u:"https://antecipagov.comprasnet.gov.br"},
  {n:"Banco do Brasil", c:"banco", p:["Capital de giro"], d:"Citado em matérias como operador do Pronampe. Confirme as condições vigentes.", u:"https://www.bb.com.br"},
  {n:"Caixa Econômica Federal", c:"banco", p:["Capital de giro"], d:"Citada em matérias como operadora do Pronampe. Confirme as condições vigentes.", u:"https://www.caixa.gov.br"},
  {n:"Bradesco", c:"banco", p:["Capital de giro"], d:"Citado em matérias como operador do Pronampe. Confirme as condições vigentes.", u:"https://www.bradesco.com.br"},
  {n:"Itaú", c:"banco", p:["Capital de giro"], d:"Citado em matérias como operador do Pronampe. Confirme as condições vigentes.", u:"https://www.itau.com.br"},
  {n:"Santander", c:"banco", p:["Capital de giro"], d:"Citado em matérias como operador do Pronampe. Confirme as condições vigentes.", u:"https://www.santander.com.br"},
  {n:"Sicoob", c:"financeira", p:["Capital de giro"], d:"Cooperativa de crédito citada em matérias como operadora do Pronampe. Confirme as condições vigentes.", u:"https://www.sicoob.com.br"},
  {n:"Banco Inter", c:"fintech", p:["Capital de giro"], d:"Banco digital citado em matérias como operador do Pronampe. Confirme as condições vigentes.", u:"https://inter.co"},
  {n:"Open Finance Brasil", c:"open", p:[], d:"Estrutura regulada pelo Banco Central que permite compartilhar dados entre instituições, com o seu consentimento. Veja como funciona.", u:"https://openfinancebrasil.org.br"}
];
const TIPO_CAT = {"Banco público":"banco", "Banco privado":"banco", "Cooperativa de crédito":"financeira", "Fintech":"fintech", "Plataforma de antecipação":"oficial", "Seguradora ou corretora":"garantia", "Outra":"financeira"};
const PERGUNTAS = ["Qual é a taxa ao mês e o custo efetivo total (CET)?", "Quais tarifas e IOF entram no custo?", "Aceita receber contra órgãos públicos e a cessão de crédito do contrato?", "Quanto tempo leva para liberar o dinheiro?", "Que documentos e garantias pede?", "Há multa para pagar antes do prazo?"];
function prontidao(){
  const it = [], E = S.empresa, U = S.reg.ultima, sf = semaforo(), vend = S.lic.filter(l => REAL.includes(l.status)), recebivel = S.lic.filter(l => ["Ganha", "Entregue"].includes(l.status));
  const dv = S.docs.filter(d => d.venc), dok = dv.filter(d => docSt(d).k === "ok").length;
  it.push({l:"CNPJ cadastrado", p:cnpjOk(E.cnpj) ? 10 : 0, m:10, t:cnpjOk(E.cnpj) ? "CNPJ válido cadastrado." : "Cadastre o CNPJ em Dados da empresa.", a:"empresa"});
  it.push({l:"Situação cadastral ativa", p:U && norm(U.sit) === "ativa" ? 10 : 0, m:10, t:U ? (norm(U.sit) === "ativa" ? "ATIVA." : "Situação: " + U.sit + ".") : "Consulte o CNPJ em Regularidade.", a:"regularidade"});
  it.push({l:"Documentos em dia", p:S.docs.length ? Math.round(20 * dok / S.docs.length) : 0, m:20, t:dok + " de " + S.docs.length + " documentos com validade em dia.", a:"docs"});
  it.push({l:"Regularidade fiscal", p:sf.some(x => x.k === "bd") ? 0 : sf.some(x => x.k === "wn" || !x.k) ? 10 : 20, m:20, t:sf.some(x => x.k === "bd") ? "Há pendências." : sf.some(x => x.k === "wn" || !x.k) ? "Há itens a verificar." : "Tudo em dia.", a:"regularidade"});
  it.push({l:"Histórico de vendas ao governo", p:vend.length >= 3 ? 25 : vend.length === 2 ? 20 : vend.length === 1 ? 15 : 0, m:25, t:vend.length + " venda" + (vend.length === 1 ? "" : "s") + " ganha" + (vend.length === 1 ? "" : "s") + ", entregue" + (vend.length === 1 ? "" : "s") + " ou recebida" + (vend.length === 1 ? "" : "s") + ".", a:"lic"});
  it.push({l:"Contrato ou empenho a receber", p:recebivel.length ? 15 : 0, m:15, t:recebivel.length ? recebivel.length + " licitação(ões) a receber." : "Sem contrato ganho a receber.", a:"lic"});
  return {score:it.reduce((s, x) => s + x.p, 0), it, recebivel};
}
function finMkHTML(){
  const P = prontidao(), cat = FIN.cat || "todos", mine = S.fin.parc.map(x => ({n:x.nome, c:TIPO_CAT[x.tipo] || "financeira", p:[], d:x.produtos || x.obs || "", u:x.site, meu:true, id:x.id}));
  const list = FIN_CAT.concat(mine).filter(x => cat === "todos" || x.c === cat);
  let h = `<div class="card"><div class="top"><b>Prontidão para crédito</b><span class="tag score s${P.score >= 80 ? 4 : P.score >= 60 ? 3 : P.score >= 40 ? 2 : 1}">${P.score} de 100</span></div><p class="sub" style="margin:4px 0 8px">Instituições decidem o crédito por conta própria. Isto mostra o quanto você já está preparado para pedir.</p>
    ${P.it.map(x => `<div class="scr"><b>${esc(x.l)}</b><span>${x.p} de ${x.m}</span><div class="pgb" style="grid-column:1/-1;margin:2px 0"><i style="width:${Math.round(x.p / x.m * 100)}%"></i></div><small style="grid-column:1/-1">${esc(x.t)}${x.p < x.m ? ` <button class="btn ghost sm" data-a="tab" data-t="${x.a}">Ajustar</button>` : ""}</small></div>`).join("")}</div>`;
  h += `<div class="card"><b>Seus recebíveis do governo</b>${P.recebivel.length ? P.recebivel.map(l => { const v = n(l.qtd) * n(l.preco); return `<div class="cp"><div><small>${esc(l.numero || l.orgao || "Licitação")}</small><div>${esc(l.objeto || "")} ${v ? "<b>" + money(v) + "</b>" : ""}</div></div><button class="btn ghost sm" data-a="finRecSim" data-id="${l.id}">Simular antecipação</button></div>`; }).join("") : `<p class="sub" style="margin:4px 0 0">Quando você ganhar uma licitação, ela aparece aqui como possível recebível para antecipar.</p>`}</div>`;
  h += `<h2 class="gh">Instituições</h2><div class="chips" style="flex-wrap:wrap;margin:0 0 8px;padding:0">${FIN_CATS.map(([k, t]) => `<button class="chip${cat === k ? " on" : ""}" data-a="finCat" data-v="${k}">${t}</button>`).join("")}</div>`;
  h += list.length ? list.map(x => `<div class="card pc"><div class="pc-h">${selo(x.n)}<span class="tag">${esc((FIN_CATS.find(c => c[0] === x.c) || [0, x.c])[1])}</span></div>${x.meu ? ' <span class="tag ok">Na sua lista</span>' : ""}<p>${esc(x.d)}</p><div class="links" style="margin:0">${x.p.length ? `<button class="btn sm" data-a="finPedir" data-n="${esc(x.n)}">Pedir proposta</button>` : ""}${/^https?:\/\//.test(x.u || "") ? `<a class="btn ghost sm" href="${su(x.u)}" target="_blank" rel="noopener">Abrir site</a>` : ""}${!x.meu ? `<button class="btn ghost sm" data-a="newParc" data-n="${esc(x.n)}" data-t="${x.c === "banco" ? "Banco privado" : x.c === "fintech" ? "Fintech" : x.c === "oficial" ? "Plataforma de antecipação" : "Cooperativa de crédito"}" data-s="${esc(x.u || "")}">Salvar na minha lista</button>` : `<button class="btn ghost sm" data-a="editParc" data-id="${x.id}">Editar</button>`}</div></div>`).join("") : `<div class="card empty">${cat === "garantia" ? "Seguradoras e corretoras de seguro-garantia: cadastre as que você conhece em Instituições." : "Nenhuma instituição nesta categoria ainda. Cadastre as que você conhece em Instituições."} <button class="btn sm" data-a="newParc">Cadastrar</button></div>`;
  h += `<details class="tut"><summary>O que perguntar antes de contratar</summary><div class="tb"><ul>${PERGUNTAS.map(q => `<li>${esc(q)}</li>`).join("")}</ul></div></details>
    <div class="note2"><b>Transparência:</b> o Licita Lance Certo ainda não tem parceiros financeiros ativos e não recebe comissão. As instituições são exemplos para pesquisar, e cada uma define o crédito e as taxas. Se houver parceria no futuro, o app avisa aqui antes de qualquer contratação.</div>`;
  return h;
}
function comissaoCalc(){
  const C = S.fin.com, rate = t => t === FIN_TIPOS[0] ? C.antec : t === FIN_TIPOS[1] ? C.giro : C.garantia;
  const rows = S.fin.ped.map(p => { const v = n(p.valor), base = v * rate(p.tipo) / 100, cpaOk = ["Em análise", "Aprovado", "Contratado"].includes(p.status), cpa = C.modelo !== "comissao" && cpaOk ? n(C.cpa) : 0, com = C.modelo !== "cpa" ? base : 0;
    return {p, v, com, cpa, rec:(p.status === "Contratado" ? com : 0) + cpa, prev:p.status === "Aprovado" ? com : 0}; });
  return {rows, rec:rows.reduce((s, r) => s + r.rec, 0), prev:rows.reduce((s, r) => s + r.prev, 0), vol:rows.filter(r => r.p.status === "Contratado").reduce((s, r) => s + r.v, 0)};
}
function finOpHTML(){
  if (!can("comissao.ver")) return `<div class="card empty">Seu papel (${esc(ROLES[papelAtual()].n)}) não permite ver as comissões. Em Segurança e acesso você vê as permissões de cada papel.</div>`;
  const C = S.fin.com, ed = can("comissao.editar"), L = comissaoCalc(), F = (k, l, ph) => `<div class="f half"><label for="com_${k}">${l}</label><input id="com_${k}" data-com="${k}" inputmode="decimal" autocomplete="off" placeholder="${ph}" value="${esc(String(C[k]).replace(".", ","))}"${ed ? "" : " disabled"}></div>`;
  return `<div class="card"><b>Modelo de comissão</b><p class="sub" style="margin:4px 0 8px">Visão do operador da plataforma. Os percentuais abaixo são hipóteses de exemplo: defina conforme o contrato com cada parceiro.</p>
    <div class="fg"><div class="f"><label for="com_modelo">Como a plataforma é remunerada</label><select id="com_modelo" data-com="modelo"${ed ? "" : " disabled"}><option value="comissao"${C.modelo === "comissao" ? " selected" : ""}>Comissão sobre o valor contratado</option><option value="cpa"${C.modelo === "cpa" ? " selected" : ""}>Valor por lead qualificado (CPA)</option><option value="ambos"${C.modelo === "ambos" ? " selected" : ""}>Comissão e CPA</option></select></div>
    ${F("antec", "Antecipação (% do valor)", "0,8")}${F("giro", "Capital de giro (% do valor)", "1,2")}${F("garantia", "Garantia (% do prêmio)", "15")}${F("cpa", "CPA por lead (R$)", "60")}</div>${ed ? "" : '<div class="hint">Seu papel pode ver, mas não editar.</div>'}</div>
    <div class="kpis"><div class="kpi"><small>Comissão reconhecida</small><b>${money(L.rec)}</b></div><div class="kpi"><small>Prevista (aprovados)</small><b>${money(L.prev)}</b></div><div class="kpi"><small>Volume contratado</small><b>${bi(L.vol)}</b></div><div class="kpi"><small>Pedidos</small><b>${L.rows.length}</b></div></div>
    <div class="card"><b>Livro de comissões</b><div class="tw"><table class="tbl fr"><thead><tr><th>Pedido</th><th>Valor</th><th>Situação</th><th>Receita</th></tr></thead><tbody>${L.rows.map(r => `<tr><td><b>${esc(r.p.inst)}</b><small>${esc(r.p.tipo)}</small></td><td>${bt(r.v)}</td><td>${esc(r.p.status)}</td><td><b>${money(r.rec || r.prev)}</b>${r.prev && !r.rec ? "<small>prevista</small>" : ""}</td></tr>`).join("") || '<tr><td colspan="4">Nenhum pedido de crédito ainda.</td></tr>'}</tbody></table></div></div>
    <div class="note2">Esta é uma visão local de demonstração, calculada com os pedidos deste aparelho. Com parceiros reais, o livro de comissões fica no servidor (tabela commission_ledger do PostgreSQL), com acesso só para operador e administrador. A planilha financial-hub-modelo-de-comissao.xlsx projeta a receita.</div>`;
}
/* ---------- conta e senha ---------- */
const AUTH_KEY = "lancecerto:auth";
const canCrypto = !!(window.crypto && crypto.subtle);
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPw(pw, salt){
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({name:"PBKDF2", salt, iterations:150000, hash:"SHA-256"}, key, 256));
}
const getAuth = () => { try{ return JSON.parse(localStorage.getItem(AUTH_KEY)); }catch(e){ return null; } };
const setAuth = o => { try{ localStorage.setItem(AUTH_KEY, JSON.stringify(o)); return true; }catch(e){ return false; } };
let authFails = 0, authLockUntil = 0;
function storageOK(){ try{ localStorage.setItem("lc:t", "1"); localStorage.removeItem("lc:t"); return true; }catch(e){ return false; } }
function startSession(){ try{ sessionStorage.setItem("lc:ok", "1"); }catch(e){} document.body.classList.remove("locked"); render(); }
function renderAuth(mode){
  document.body.classList.add("locked");
  const create = mode === "create", a = getAuth();
  if (mode === "totp"){ $("#main").innerHTML = `<div class="auth"><div class="auth-hero">${LOGO(44, true)}<span class="wm"><small>LICITA</small><b>Lance Certo</b></span></div><h1 style="font-size:22px">Verificação em duas etapas</h1><p class="sub">Digite o código de 6 números do seu aplicativo autenticador. Se perdeu o aplicativo, use um código de recuperação.</p><div class="f"><label for="au_totp">Código</label><input id="au_totp" inputmode="numeric" autocomplete="one-time-code" maxlength="9"></div><div class="err" id="au_err" role="alert"></div><div class="actions"><button class="btn" data-a="authTotp">Confirmar</button><button class="btn ghost" data-a="logout">Voltar</button></div></div>`; setTimeout(() => { const i = $("#au_totp"); if (i) i.focus(); }, 50); return; }
  $("#main").innerHTML = `<div class="auth"><div class="auth-hero">${LOGO(44, true)}<h1 class="auth-h1"><span class="wm wm-l"><small>LICITA</small><b>Lance Certo</b></span></h1></div><div class="auth-tag">A inteligência que transforma oportunidades públicas e privadas em negócios</div>
  <p class="sub">${create ? "Crie sua conta para proteger o app com senha." : "Entre para continuar."}</p>
  <div class="card"><div class="fg">
    ${create ? '<div class="f"><label for="au_nome">Seu nome</label><input id="au_nome" autocomplete="name"></div>' : ""}
    <div class="f"><label for="au_email">E-mail</label><input id="au_email" type="email" inputmode="email" autocapitalize="none" autocomplete="${create ? "email" : "username"}" value="${!create && a ? esc(a.email) : ""}"></div>
    <div class="f"><label for="au_pw">Senha</label><input id="au_pw" data-pw="1" type="password" autocomplete="${create ? "new-password" : "current-password"}"></div>
    ${create ? '<div class="f"><label for="au_pw2">Repita a senha</label><input id="au_pw2" data-pw="1" type="password" autocomplete="new-password"></div>' : ""}
  </div>
  <div class="err" id="au_err" role="alert"></div>
  <div class="actions"><button class="btn" data-a="${create ? "authCreate" : "authLogin"}">${create ? "Criar conta e entrar" : "Entrar"}</button><button class="btn ghost" data-a="pwToggle">Mostrar senha</button></div></div>
  ${create ? '<p class="hint">Use pelo menos 8 caracteres. A conta fica guardada só neste aparelho e nada é enviado a servidores. Por isso o app não consegue recuperar a senha por e-mail.</p>' : '<button class="btn ghost sm" data-a="authForgot">Esqueci a senha</button>'}</div>`;
  const f = $(create ? "#au_nome" : "#au_pw"); if (f) f.focus();
}
async function authCreate(){
  const g = id => $("#" + id).value, err = t => { $("#au_err").textContent = t; };
  const nome = g("au_nome").trim(), email = g("au_email").trim().toLowerCase(), pw = g("au_pw"), pw2 = g("au_pw2");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Digite um e-mail válido.");
  if (pw.length < 8) return err("A senha precisa ter pelo menos 8 caracteres.");
  if (pw !== pw2) return err("As senhas não são iguais.");
  try{
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPw(pw, salt);
    if (!setAuth({nome, email, salt:b64(salt), hash, v:1})) return err("Este navegador não permitiu guardar a conta.");
    try{ await vaultOpen(pw); }catch(e){}
    logEv("Conta criada", ""); startSession(); toast("Conta criada.");
  }catch(e){ err("Não foi possível criar a conta neste navegador."); }
}
async function authLogin(){
  const a = getAuth(), err = t => { $("#au_err").textContent = t; };
  if (Date.now() < authLockUntil) return err("Muitas tentativas. Espere " + Math.ceil((authLockUntil - Date.now()) / 1000) + " segundos.");
  const email = $("#au_email").value.trim().toLowerCase(), pw = $("#au_pw").value;
  let ok = false;
  try{ ok = !!a && email === a.email && (await hashPw(pw, unb64(a.salt))) === a.hash; }catch(e){}
  if (ok){ authFails = 0; let abriu = false; try{ abriu = await vaultOpen(pw); }catch(e){}
    if (S.sec.totp && S.sec.totp.ativo){ if (!abriu || !S.sec.totpSecret) return err("Não foi possível abrir o cofre para conferir o segundo fator. Tente de novo."); renderAuth("totp"); return; }
    logEv("Entrada no app", ""); startSession(); return; }
  logEv("Tentativa de entrada recusada", "");
  $("#au_pw").value = "";
  if (++authFails >= 5){ authFails = 0; authLockUntil = Date.now() + 30000; err("Muitas tentativas. Espere 30 segundos."); }
  else err("E-mail ou senha incorretos.");
}
async function authTotp(){
  const err = t => { $("#au_err").textContent = t; };
  if (Date.now() < authLockUntil) return err("Muitas tentativas. Espere " + Math.ceil((authLockUntil - Date.now()) / 1000) + " segundos.");
  const c = $("#au_totp").value; let ok = await totpOk(S.sec.totpSecret, c), rec = false; if (!ok){ rec = await recOk(c); ok = rec; }
  if (ok){ authFails = 0; logEv(rec ? "Entrada com código de recuperação" : "Entrada com verificação em duas etapas", ""); startSession(); return; }
  $("#au_totp").value = ""; logEv("Código de duas etapas recusado", "");
  if (++authFails >= 5){ authFails = 0; authLockUntil = Date.now() + 30000; err("Muitas tentativas. Espere 30 segundos."); } else err("Código incorreto.");
}
function authForgot(){
  confirmBox("Para criar uma nova senha, os dados deste aparelho (licitações, fornecedores, documentos) serão apagados. Se você tem um backup, dá para importar depois. Continuar?", () => {
    try{ localStorage.removeItem(AUTH_KEY); localStorage.removeItem(KEY); localStorage.removeItem(vKey()); }catch(e){} VAULT.key = null;
    S = clone(DEF); renderAuth("create");
  }, "Apagar e continuar");
}
function viewConta(m){
  const a = getAuth();
  m.innerHTML = `<h1>Conta e senha</h1>` + (!a ? `<div class="card empty">Este navegador não permite proteger o app com senha.</div>` :
  `<p class="sub">${a.nome ? esc(a.nome) + ", " : ""}${esc(a.email)}</p>
  <div class="card"><b>Alterar senha</b><div class="fg" style="margin-top:10px">
    <div class="f"><label for="pc_cur">Senha atual</label><input id="pc_cur" type="password" autocomplete="current-password"></div>
    <div class="f"><label for="pc_new">Nova senha</label><input id="pc_new" type="password" autocomplete="new-password"></div>
    <div class="f"><label for="pc_new2">Repita a nova senha</label><input id="pc_new2" type="password" autocomplete="new-password"></div></div>
    <div class="err" id="pc_err" role="alert"></div><div class="actions"><button class="btn" data-a="pwChange">Alterar senha</button></div></div>
  <div class="card"><b>Sair do app</b><p class="sub" style="margin:4px 0 10px">Você volta para a tela de entrada. Seus dados continuam guardados.</p><button class="btn ghost" data-a="logout">Sair</button></div>
  <p class="hint">A conta fica só neste aparelho. A senha protege o acesso ao app, mas não criptografa os dados guardados no navegador.</p>`);
}
async function pwChange(){
  const a = getAuth(), g = id => $("#" + id).value, msg = t => { $("#pc_err").textContent = t; };
  if (!a) return;
  const cur = g("pc_cur"), nw = g("pc_new"), nw2 = g("pc_new2");
  let ok = false; try{ ok = (await hashPw(cur, unb64(a.salt))) === a.hash; }catch(e){}
  if (!ok) return msg("A senha atual está incorreta.");
  if (nw.length < 8) return msg("A nova senha precisa ter pelo menos 8 caracteres.");
  if (nw !== nw2) return msg("As senhas novas não são iguais.");
  const salt = crypto.getRandomValues(new Uint8Array(16)); a.salt = b64(salt); a.hash = await hashPw(nw, salt);
  if (!setAuth(a)) return msg("Não foi possível guardar a nova senha.");
  try{ await vaultRekey(cur, nw); }catch(e){} logEv("Senha alterada", "");
  ["pc_cur", "pc_new", "pc_new2"].forEach(id => { $("#" + id).value = ""; }); msg(""); toast("Senha alterada.");
}
function boot(){
  if (!canCrypto){ avisoTopo("Esta conexão não é segura (use https). Sem ela não dá para proteger o app com senha."); render(); return; }
  if (!storageOK()){ render(); return; }
  if (SEM_ARMAZENAMENTO.length) avisoTopo("Este navegador não deixa guardar dados. Sua conta e seus dados valem só nesta aba e somem ao fechar. Para usar de verdade, abra o app direto no navegador.");
  let sess = false; try{ sess = sessionStorage.getItem("lc:ok") === "1"; }catch(e){}
  if (!getAuth()) renderAuth("create"); else if (!sess) renderAuth("login"); else render();
}

/* ---------- eventos ---------- */
const act = {
  tab: t => go(t.dataset.t),
  cfg: () => editCfg(),
  newLic: () => editLic(null), editLic: t => editLic(t.dataset.id),
  newForn: () => editForn(null), editForn: t => editForn(t.dataset.id),
  newCot: () => editCot(null), editCot: t => editCot(t.dataset.id),
  newDoc: () => editDoc(null), editDoc: t => editDoc(t.dataset.id),
  authCreate: () => authCreate(), authLogin: () => authLogin(), authForgot: () => authForgot(), pwChange: () => pwChange(),
  pwToggle: t => { const els = [...document.querySelectorAll("input[data-pw]")]; if (!els.length) return; const show = els[0].type === "password"; els.forEach(e => { e.type = show ? "text" : "password"; }); t.textContent = show ? "Ocultar senha" : "Mostrar senha"; },
  lvGo: () => { if (!(n(ui.bq.valor) > 0 || n(ui.bq.vmin) > 0 || n(ui.bq.vmax) > 0)){ toast("Digite o valor ou a faixa de valores."); return; } if (LV.run){ toast("A busca está em andamento. Toque em Parar para recomeçar."); return; } lvReset(); lvRun(); },
  lvMais: () => lvRun(), lvStop: () => { LV.stop = true; },
  lvOrd: t => { LV.ord = t.dataset.v; lvDraw(); },
  lvSave: t => { const c = LV.itens[+t.dataset.i]; if (!c) return; const uo = c.unidadeOrgao || {}, oe = c.orgaoEntidade || {};
    go("lic"); editLic(null, {orgao:oe.razaoSocial || "", cnpjOrg:oe.cnpj ? fmtCnpj(oe.cnpj) : "", numero:String(c.numeroCompra || "") + (c.anoCompra ? "/" + c.anoCompra : ""), objeto:String(c.objetoCompra || "").slice(0, 300), link:lvLink(c), preco:c.valorTotalEstimado, qtd:1, data:pncpDT(c.dataAberturaProposta || c.dataEncerramentoProposta).d, hora:pncpDT(c.dataAberturaProposta || c.dataEncerramentoProposta).h, propData:pncpDT(c.dataEncerramentoProposta).d, propHora:pncpDT(c.dataEncerramentoProposta).h, status:"Acompanhando"}); },
  lvWatch: t => { const c = LV.itens[+t.dataset.i]; if (!c) return; const oe = c.orgaoEntidade || {}, uo = c.unidadeOrgao || {};
    if (!oe.cnpj || !c.anoCompra || !c.sequencialCompra){ toast("Esta licitação não tem identificação para acompanhar."); return; }
    if (S.watch.some(w => w.cnpj === oe.cnpj && w.ano === c.anoCompra && w.seq === c.sequencialCompra)){ toast("Você já acompanha esta licitação."); return; }
    S.watch.unshift({id:uid(), cnpj:oe.cnpj, ano:c.anoCompra, seq:c.sequencialCompra, titulo:String(c.objetoCompra || "").slice(0, 90), orgao:oe.razaoSocial || "", uf:uo.ufSigla || "", snap:snapOf(c)}); save(); toast("Acompanhando. Veja em Mais, Acompanhar em tempo real."); },
  acAll: () => watchAll(), acAlerts: () => alertAll(),
  acOk: t => { const w = S.watch.find(x => x.id === t.dataset.id); if (w){ w.mudou = ""; save(); acDraw(); } },
  acDel: t => { S.watch = S.watch.filter(x => x.id !== t.dataset.id); save(); acDraw(); },
  alSave: () => { const b = ui.bq; if (!(n(b.valor) > 0 || n(b.vmin) > 0 || n(b.vmax) > 0)){ toast("Digite o valor ou a faixa antes de salvar o alerta."); return; } S.alertas.unshift({id:uid(), item:b.item.trim(), valor:b.valor, faixa:b.faixa, vmin:b.vmin, vmax:b.vmax, nicho:b.nicho, uf:b.uf, mod:b.mod, vistos:[], novos:0, checado:0}); save(); toast("Alerta salvo. Veja em Mais, Alertas e lembretes."); rodaAlertas(); },
  alPreset: () => { S.alertas.unshift({id:uid(), item:"", valor:"", faixa:"30", vmin:"3000", vmax:"10000", nicho:"Limpeza e higiene", uf:"SP", mod:"", vistos:[], novos:0, checado:0}); save(); acDraw(); toast("Alerta criado. Vou conferir agora."); rodaAlertas(); },
  alItem: t => { const a = S.alertas.find(y => y.id === t.dataset.id), x = a && (a.novosLista || []).find(z => z.k === t.dataset.k); if (!x) return; const ab = pncpDT(x.d || x.p), pr = pncpDT(x.p);
    go("lic"); editLic(null, {orgao:x.g, cnpjOrg:x.cn ? fmtCnpj(x.cn) : "", objeto:x.o, link:x.l, preco:x.v, qtd:1, data:ab.d, hora:ab.h, propData:pr.d, propHora:pr.h, status:"Achada"}); },
  leadTog: t => { const m = +t.dataset.m, a = S.cfg.lembretes || [], i = a.indexOf(m); if (i >= 0) a.splice(i, 1); else a.push(m); S.cfg.lembretes = a; save(); render(); },
  avisoOk: () => { ui.avisos = []; go("lic"); },
  avisosOn: async () => { const o = []; try{ if ("Notification" in window){ const r = await Notification.requestPermission(); o.push(r === "granted" ? "Avisos do navegador ligados." : "Avisos do navegador não permitidos."); } }catch(e){}
    try{ const LN = LNP(); if (LN){ const r = await LN.requestPermissions(); o.push(r && r.display === "granted" ? "Avisos do aparelho ligados." : "Avisos do aparelho não permitidos."); agendaNativa(); } }catch(e){}
    toast(o.join(" ") || "Este aparelho não permite avisos aqui."); const s = $("#avSt"); if (s) s.textContent = avisoStatus(); },
  alOk: t => { const a = S.alertas.find(x => x.id === t.dataset.id); if (a){ a.novos = 0; a.novosLista = []; save(); acDraw(); } },
  alDel: t => { S.alertas = S.alertas.filter(x => x.id !== t.dataset.id); save(); acDraw(); },
  mxTog: t => { const nm = t.dataset.n, i = MX.sel.indexOf(nm); if (i >= 0) MX.sel.splice(i, 1); else MX.sel.push(nm); t.classList.toggle("on", i < 0); },
  mxNovo: () => { const nm = $("#nx_nome").value.trim(), kw = $("#nx_kw").value.split(",").map(s => s.trim()).filter(Boolean);
    if (!nm || !kw.length){ toast("Informe o nome e pelo menos uma palavra."); return; }
    if (allNichos().some(x => x.n.toLowerCase() === nm.toLowerCase())){ toast("Já existe um nicho com esse nome."); return; }
    S.nichos.push({id:uid(), n:nm, k:kw}); MX.sel.push(nm); save(); render(); },
  mxGo: () => { if (!MX.sel.length){ toast("Escolha pelo menos um nicho."); return; } if (MX.run){ toast("A análise está em andamento."); return; } mxReset(); mxRun(); },
  mxMais: () => { MX.maxPg += 40; mxRun(); }, mxStop: () => { MX.stop = true; },
  mxCnpj: t => cnpjCheck(t.dataset.ni),
  mxForn: t => { const g = MX.grupos[t.dataset.n], f = g && g.f[t.dataset.ni]; if (!f) return; const nc = allNichos().find(x => x.n === t.dataset.n);
    go("forn"); editForn(null, {nome:f.nome, cnpj:fmtCnpj(f.ni), prod:t.dataset.n + (nc ? " (" + nc.k.slice(0, 3).join(", ") + ")" : ""), obs:"Top " + t.dataset.r + " em " + t.dataset.n + ": " + f.n + " contratos (" + money(f.valor) + ") nos últimos " + MX.dias + " dias no PNCP."}); },
  triCopy: () => { const o = $("#triOut"); if (!o || !o.value){ toast("Escolha uma licitação primeiro."); return; } o.focus(); o.select(); try{ navigator.clipboard.writeText(o.value).then(() => toast("Texto copiado."), () => toast("Selecionei o texto. Use Copiar do seu aparelho.")); }catch(e){ toast("Selecionei o texto. Use Copiar do seu aparelho."); } },
  lvView: t => { LV.view = t.dataset.v; lvDraw(); },
  newTr: t => editTr(null, t.dataset && t.dataset.t ? {nome:t.dataset.t, site:t.dataset.s || "", ufs:t.dataset.s ? "Nacional" : ""} : {}), editTr: t => editTr(t.dataset.id),
  newFr: t => editFr(null, t && t.dataset && t.dataset.t ? {transp:t.dataset.t} : {}), editFr: t => editFr(t.dataset.id),
  frUsar: t => { const g = frGroups()[+t.dataset.g]; if (!g) return; const q = g[1].slice().sort((a, b) => n(a.frete) - n(b.frete))[0]; S.calc.frete = String(n(q.frete)).replace(".", ","); save(); go("calc"); toast("Frete de " + money(n(q.frete)) + " colocado no Calcular."); },
  frMelhores: () => { MX.sel = ["Transporte e frete"]; MX.uf = ui.frUF || ""; go("melhores"); },
  empBusca: async () => { const out = $("#em_busca"), d = cnpjDig(S.empresa.cnpj); if (!cnpjOk(d)){ out.textContent = "Digite um CNPJ válido primeiro."; return; }
    out.textContent = "Consultando…";
    try{ const r = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + d); if (!r.ok) throw new Error("HTTP " + r.status); const j = await r.json(), e = S.empresa;
      const put = (k, v) => { if (v && !e[k]) e[k] = String(v); };
      put("razao", j.razao_social); put("fantasia", j.nome_fantasia); put("end", [j.logradouro, j.numero, j.bairro].filter(Boolean).join(", ")); put("logradouro", j.logradouro); put("numero", j.numero); put("bairro", j.bairro); put("cep", String(j.cep || "").replace(/^(\d{5})(\d{3})$/, "$1-$2")); put("cidade", j.municipio); put("uf", j.uf); put("tel", j.ddd_telefone_1); put("email", j.email);
      save(); render();
      const o2 = $("#em_busca"); if (o2) o2.textContent = "Situação: " + (j.descricao_situacao_cadastral || "?") + ". Atividade: " + (j.cnae_fiscal_descricao || "?") + ". MEI: " + (j.opcao_pelo_mei ? "sim" : "não") + "."; }
    catch(err){ out.textContent = "Não foi possível consultar agora. Digite os dados à mão."; } },
  newPed: () => editPed(null), editPed: t => editPed(t.dataset.id), pedFl: t => { ui.pf = t.dataset.v; render(); },
  pedNext: t => { const p = S.pedidos.find(x => x.id === t.dataset.id); if (!p) return; const e = (+p.etapa || 0) + 1; if (e >= PED_ETAPAS.length) return; p.etapa = e; (p.hist = p.hist || []).push({e, t:new Date().toISOString()}); save(); render(); toast("Etapa: " + PED_ETAPAS[e]); },
  pedCopy: t => { const p = S.pedidos.find(x => x.id === t.dataset.id); if (!p) return; try{ navigator.clipboard.writeText(p.codigo).then(() => toast("Código copiado."), () => toast("Não consegui copiar. Selecione o código à mão.")); }catch(e){ toast("Não consegui copiar. Selecione o código à mão."); } },
  lcCopy: t => { const x = S.lic.find(y => y.id === t.dataset.id) || DEMO_LC, p = lancePlano(x); if (p.alvo == null) return; const v = p.alvo.toFixed(2).replace(".", ","); try{ navigator.clipboard.writeText(v).then(() => toast("Valor " + v + " copiado."), () => toast("Valor: " + v)); }catch(e){ toast("Valor: " + v); } },
  lcExtra: t => { const x = S.lic.find(y => y.id === t.dataset.id); if (!x) return; if (isNaN(fimTs(x))){ toast("Informe o horário de encerramento primeiro."); return; } x.fimAjuste = (+x.fimAjuste || 0) + 2; lcFired.delete(x.id + ":" + fimTs(x)); save(); const c = document.querySelector(`[data-cdb="${x.id}"]`); if (c) c.innerHTML = cdBlock(x); toast("Encerramento adiado em 2 minutos."); },
  lcClose: () => document.querySelectorAll("#lcAlert").forEach(e => e.remove()),
  lcTest: () => { lanceAlerta(DEMO_LC); },
  orcGo: () => orcLoadUFs(), orcStop: () => { ORC.stop = true; },
  orcAba: t => { ORC.aba = t.dataset.v; render(); },
  orcUF: t => { ORC.sel = {tipo:"E", uf:t.dataset.uf}; const k = orcKey() + "-" + t.dataset.uf;
    if (ORC.det[k]) orcDraw(); else { ORC.run = true; orcDraw(); orcEnte("E", UFI[t.dataset.uf][1]).then(d => { ORC.det[k] = d; }).catch(e => { ORC.err = netMsg(e); }).finally(() => { ORC.run = false; orcDraw(); }); } },
  orcFecha: () => { ORC.sel = null; orcDraw(); },
  orcVer: t => { PK.orc.uf = t.dataset.uf; orcCidade(t.dataset.id, t.dataset.n, t.dataset.uf); },
  orcSalvaCid: () => { const s = ORC.sel; if (!s || s.tipo !== "M") return; if (S.cidades.some(c => String(c.id) === String(s.id))){ toast("Esta cidade já está na lista."); return; } S.cidades.push({id:s.id, nome:s.nome, uf:s.uf}); save(); orcDraw(); toast("Cidade salva."); },
  orcAtualiza: async () => { for (const c of S.cidades) await orcCidade(c.id, c.nome, c.uf); },
  pkSel: t => { const c = t.dataset.ctx; if (c === "orc") orcCidade(t.dataset.id, t.dataset.n, PK.orc.uf); else obCidade(t.dataset.id, t.dataset.n, PK.obr.uf); },
  obGo: () => { if (!OB.uf){ toast("Escolha um estado."); return; } obLista(false); },
  obMais: () => obLista(true),
  obAbre: t => { const id = t.dataset.id; if (OB.abre === id){ OB.abre = null; obDraw(); return; } OB.abre = id; if (!OB.det[id] || OB.det[id].erro) obDetalhe(id); else obDraw(); },
  obAba: t => { OB.aba = t.dataset.v; render(); },
  obPGo: () => obPainel(), obPStop: () => { OB.pan.stop = true; },
  rdGo: () => { if (!RD.q.produto.trim()){ toast("Digite o produto."); return; } if (RD.run){ toast("A análise está em andamento."); return; } rdReset(); rdRun(); },
  rdStop: () => { RD.stop = true; }, rdMais: () => { RD.maxPg += 30; rdRun(); },
  rdOrg: t => { const c = t.dataset.c; RD.abre = RD.abre === c ? null : c; if (RD.abre && !RD.dos[c]) rdDossie(c); else rdDraw(); },
  rdMonPca: t => { const c = t.dataset.c, d = RD.dos[c], it = d && d.pca[+t.dataset.i]; if (!it) return; const o = RD.rows.find(r => r.cnpj === c) || {};
    addPrev({orig:"pca", cnpj:c, orgao:it.orgao || o.orgao || "", uf:o.uf || "", item:it.desc, qtd:it.qtd, vu:it.vu, dataDesejada:it.data, kw:RD.words.slice(0, 4)}); hubDraw(); },
  rdMonNext: t => { const c = t.dataset.c, s = rdStats(), o = s.orgs.find(z => z.cnpj === c); if (!o) return;
    addPrev({orig:"hist", cnpj:c, orgao:o.orgao, uf:o.uf, item:RD.q.produto, qtd:s.qMed || 0, vu:s.vuMed || 0, dataDesejada:o.prox, kw:RD.words.slice(0, 4)}); },
  rdAlerta: () => { const s = rdStats(); if (!(s.p25 > 0)){ toast("Sem valores para montar a faixa."); return; } S.alertas.unshift({id:uid(), item:RD.q.produto.trim(), valor:"", faixa:"30", vmin:String(Math.floor(s.p25)), vmax:String(Math.ceil(s.p75)), nicho:"", uf:RD.q.uf, mod:"", vistos:[], novos:0, checado:0}); save(); toast("Alerta criado com a faixa " + bt(s.p25) + " a " + bt(s.p75) + "."); rodaAlertas(); },
  rdAbertas: () => { const s = rdStats(); Object.assign(ui.bq, {item:RD.q.produto, uf:RD.q.uf, valor:"", vmin:s.p25 > 0 ? String(Math.floor(s.p25)) : "", vmax:s.p75 > 0 ? String(Math.ceil(s.p75)) : "", nicho:""}); go("busca"); setTimeout(() => { const b = document.querySelector('[data-a="lvGo"]'); if (b) b.click(); }, 60); },
  rdSalva: () => { const s = rdStats(), k = norm(RD.q.produto) + "|" + RD.q.uf, r = S.radar.find(x => x.k === k), o = {k, produto:RD.q.produto.trim(), uf:RD.q.uf, dias:RD.q.dias, custo:RD.q.custo, extra:RD.q.extra, n:s.n, med:s.med, vuMed:s.vuMed, at:Date.now()};
    if (r) Object.assign(r, o); else S.radar.unshift({id:uid(), ...o}); save(); toast("Radar salvo no Hub."); },
  rdReana: t => { const r = S.radar.find(x => x.id === t.dataset.id); if (!r) return; RD.q = {produto:r.produto, uf:r.uf, dias:String(r.dias || "90"), custo:r.custo || "", extra:r.extra || ""}; go("radar"); rdReset(); rdRun(); },
  rdDel: t => { S.radar = S.radar.filter(x => x.id !== t.dataset.id); save(); hubDraw(); },
  hubMon: () => monitoraPrev(), pvCheck: () => monitoraPrev(),
  pvAn: t => { const p = S.prev.find(x => x.id === t.dataset.id); if (!p) return; if (p.etapa === "publicada") p.etapa = "analise"; ui.anId = p.id; save(); go("analise"); },
  pvArq: t => { const p = S.prev.find(x => x.id === t.dataset.id); if (!p) return; p.etapa = "arquivada"; save(); if (ui.tab === "analise") go("hub"); else hubDraw(); },
  pvPart: t => { const p = S.prev.find(x => x.id === t.dataset.id); if (!p || !p.pub) return; const a = p.an || {}, q = n(a.qtd) || p.qtd || 1, pu = p.vu || (p.pub.valor > 0 ? p.pub.valor / q : 0), ab = pncpDT(p.pub.ab), en = pncpDT(p.pub.en);
    p.etapa = "participando"; save(); go("lic");
    editLic(null, {status:"Selecionada", orgao:p.pub.orgao, cnpjOrg:fmtCnpj(p.pub.cnpj), numero:p.pub.numero, objeto:p.pub.obj.slice(0, 300), link:p.pub.link, preco:pu, qtd:q, custo:n(a.custo), frete:n(a.extra) * q, data:ab.d, hora:ab.h, propData:en.d, propHora:en.h, status:"Acompanhando"}); },
  pfNicho: t => { const a = S.perfil.nichos, i = a.indexOf(t.dataset.n); if (i >= 0) a.splice(i, 1); else a.push(t.dataset.n); save(); render(); },
  pfUF: t => { const a = S.perfil.ufs, i = a.indexOf(t.dataset.u); if (i >= 0) a.splice(i, 1); else a.push(t.dataset.u); save(); render(); },
  pfMod: t => { const a = S.perfil.mods, i = a.indexOf(t.dataset.c); if (i >= 0) a.splice(i, 1); else a.push(t.dataset.c); save(); render(); },
  pfSug: () => { sugNichos().forEach(x => { if (!S.perfil.nichos.includes(x)) S.perfil.nichos.push(x); }); save(); render(); },
  pfCnaeDel: t => { S.empresa.cnaes.splice(+t.dataset.i, 1); save(); render(); },
  pfCnaeAdd: () => { const s = String(S.perfil.cnaeNovo || "").trim(); if (!s){ toast("Digite o código e a descrição."); return; } const m = /^([\d.\-\/]{4,})\s+(.*)$/.exec(s); S.empresa.cnaes.push(m ? {cod:m[1], desc:m[2]} : {cod:"", desc:s}); S.perfil.cnaeNovo = ""; save(); render(); },
  pfCnae: async () => { const d = cnpjDig(S.empresa.cnpj), o = $("#pfMsg"); if (!cnpjOk(d)){ if (o) o.textContent = "Cadastre um CNPJ válido em Mais, Dados da empresa."; return; } if (o) o.textContent = "Consultando…";
    try{ const r = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + d); if (!r.ok) throw new Error("HTTP " + r.status); const j = await r.json(), l = [];
      if (j.cnae_fiscal) l.push({cod:cnaeFmt(j.cnae_fiscal), desc:j.cnae_fiscal_descricao || ""}); (j.cnaes_secundarios || []).forEach(c => { if (c && +c.codigo > 0) l.push({cod:cnaeFmt(c.codigo), desc:c.descricao || ""}); });
      S.empresa.cnaes = l; save(); render(); const o2 = $("#pfMsg"); if (o2) o2.textContent = l.length + " atividade(s) encontrada(s)."; }
    catch(e){ if (o) o.textContent = "Não foi possível consultar agora. Digite as atividades à mão."; } },
  pfSalvar: () => { const P = S.perfil; if (!P.nichos.length && !termos(P.palavras).length){ toast("Escolha pelo menos um produto."); return; }
    const c = {perfil:true, item:"", valor:"", faixa:"30", vmin:P.vmin, vmax:P.vmax, nicho:"", nichos:P.nichos.slice(), palavras:P.palavras, exclui:P.exclui, uf:"", ufs:P.ufs.slice(), mod:"", mods:P.mods.slice(), vistos:[], novos:0, novosLista:[], checado:0, base:0};
    const a = perfilAlerta(); if (a) Object.assign(a, c); else S.alertas.unshift({id:uid(), ...c}); save(); toast("Perfil salvo. Procurando oportunidades."); render(); rodaAlertas(); },
  pfEx: () => { Object.assign(S.perfil, {nichos:["Limpeza e higiene"], palavras:"", exclui:"", vmin:"3000", vmax:"10000", ufs:["SP"], mods:[]}); save(); render(); toast("Exemplo preenchido. Toque em Salvar."); },
  pfOff: () => { S.alertas = S.alertas.filter(a => !a.perfil); save(); render(); toast("Perfil desligado."); },
  finAba: t => { FIN.aba = t.dataset.v; render(); },
  finSalva: () => { const s = FIN.sim; if (!s.inst.trim()){ toast("Informe a instituição para salvar."); return; } if (!calcProp(s)){ toast("Digite valor, prazo e taxa."); return; } S.fin.prop.unshift({id:uid(), ...s, obs:""}); save(); finDraw(); toast("Proposta salva na comparação."); },
  editProp: t => editProp(t.dataset.id),
  newPedFin: () => editPedFin(null), editPedFin: t => editPedFin(t.dataset.id),
  finCopia: t => { const p = S.fin.ped.find(x => x.id === t.dataset.id); if (!p) return; const v = finMsg(p); try{ navigator.clipboard.writeText(v).then(() => toast("Mensagem copiada."), () => toast("Não consegui copiar.")); }catch(e){ toast("Não consegui copiar."); } },
  finNext: t => { const p = S.fin.ped.find(x => x.id === t.dataset.id); if (!p) return; const i = FIN_ST.indexOf(p.status); if (i < 0 || i >= 3) return; p.status = FIN_ST[i + 1]; (p.hist = p.hist || []).push({s:p.status, t:new Date().toISOString()}); save(); finDraw(); },
  newParc: t => editParc(null, t && t.dataset && t.dataset.n ? {nome:t.dataset.n, tipo:t.dataset.t, site:t.dataset.s} : {}), editParc: t => editParc(t.dataset.id),
  finPedir: t => { FIN.aba = "pedidos"; render(); editPedFin(null, {inst:t.dataset.n}); },
  botToggle: () => { BOT.open = !BOT.open; botDraw(); if (BOT.open) setTimeout(() => { const i = $("#botIn"); if (i) i.focus(); }, 50); },
  botClose: () => { BOT.open = false; botDraw(); },
  botModo: t => { BOT.modo = t.dataset.v; botDraw(); },
  botSend: () => { const i = $("#botIn"), q = i.value; i.value = ""; botEnvia(q); },
  botStop: () => { if (BOT.ctrl) BOT.ctrl.abort(); },
  botQ: t => botEnvia(t.dataset.q),
  botConfig: () => { BOT.open = false; botDraw(); ED.sel = ""; go("editais"); },
  botNovoEd: () => { BOT.open = false; botDraw(); ED.sel = ""; go("editais"); },
  botLer: async () => { const u = BOT.pag.url.trim(); if (!/^https?:\/\//.test(u)){ BOT.pag.msg = "Digite um endereço que comece com https://"; botDraw(); return; } BOT.pag.msg = "Lendo a página…"; botDraw();
    try{ const r = await fetch(u); if (!r.ok) throw 0; BOT.pag.texto = htmlTxt(await r.text()).slice(0, 150000); BOT.pag.msg = "Página lida: " + BOT.pag.texto.length + " caracteres."; }catch(e){ BOT.pag.msg = "Não consegui ler a página daqui, porque o site pode bloquear. Copie o texto e cole abaixo."; } botDraw(); },
  edAbre: t => { ED.sel = t.dataset.id; ED.err = ""; edDraw(); },
  edVolta: () => { ED.sel = ""; ED.err = ""; edDraw(); },
  edDel: async t => { if (!t.dataset.armed){ t.dataset.armed = "1"; t.textContent = "Toque de novo para excluir"; setTimeout(() => { t.dataset.armed = ""; t.textContent = "Excluir"; }, 4000); return; }
    const id = t.dataset.id; S.editais = S.editais.filter(x => x.id !== id); try{ await idb.del(edKey(id)); }catch(e){} delete ED.txt[id]; ED.sel = ""; save(); edDraw(); },
  edPara: () => { if (ED.ctrl) ED.ctrl.abort(); },
  edRe: t => edAnalisa(t.dataset.id),
  edLic: t => { const ed = S.editais.find(x => x.id === t.dataset.id); if (!ed) return; const i = (ed.resumo || {}).identificacao || {}; go("lic"); editLic(null, {status:"Selecionada", orgao:tx(i.orgao), numero:tx(i.numero), objeto:tx(i.objeto).slice(0, 300), obs:"Resumo do edital na tela Editais e assistente.", status:"Acompanhando"}); },
  edColar: () => { const t = ED.novo.texto.trim(); if (t.length < 200){ toast("Cole o texto do edital, pelo menos algumas linhas."); return; } const n0 = ED.novo; ED.novo = {titulo:"", texto:"", licId:""}; edNovo(t, n0.titulo, "Texto colado", n0.licId); },
  edPncp: () => edPncp(),
  edQ: t => edEnviaPergunta(t.dataset.q),
  edEnvia: () => { const i = $("#ed_q"); if (!i) return; const q = i.value; i.value = ""; edEnviaPergunta(q); },
  nfeNovo: () => { S.nfe.d = nfeNovoRasc(); Object.assign(NFE, {step:0, it:0, resp:null, err:"", prog:"", ok:false}); save(); nfeDraw(); },
  nfeProx: () => { NFE.step = Math.min(NFE_STEPS.length - 1, NFE.step + 1); nfeDraw(); window.scrollTo(0, 0); },
  nfeVolta: () => { NFE.step = Math.max(0, NFE.step - 1); nfeDraw(); window.scrollTo(0, 0); },
  nfeIr: t => { NFE.step = +t.dataset.s; nfeDraw(); window.scrollTo(0, 0); },
  nfeUsaLic: () => { const d = S.nfe.d, l = S.lic.find(x => x.id === d.licId); if (!l){ toast("Escolha uma licitação."); return; } d.de.nome = l.orgao || d.de.nome; if (l.cnpjOrg) d.de.cnpj = l.cnpjOrg; const it = d.itens[0];
    if (!String(it.desc).trim()) it.desc = String(l.objeto || ""); if (!it.qtd) it.qtd = String(l.qtd || ""); if (!it.vu && l.preco) it.vu = String(l.preco).replace(".", ","); d.inf = d.inf || {}; if (!d.inf.processo) d.inf.processo = l.numero || ""; save(); toast("Dados da licitação aplicados."); NFE.step = 1; nfeDraw(); },
  nfeBusca: t => nfeBusca(t.dataset.w),
  nfeItAdd: () => { S.nfe.d.itens.push(nfeItem()); NFE.it = S.nfe.d.itens.length - 1; save(); nfeDraw(); },
  nfeItDel: () => { const d = S.nfe.d; if (d.itens.length < 2) return; d.itens.splice(NFE.it, 1); NFE.it = Math.max(0, NFE.it - 1); save(); nfeDraw(); },
  nfeItSel: t => { NFE.it = +t.dataset.i; nfeDraw(); },
  nfeCopia: t => { const x = NFE.lista[+t.dataset.i]; if (x) copia(x[2], "Copiado: " + x[1]); },
  nfeJson: () => copia(JSON.stringify(nfePayload(S.nfe.d, S.cfg.nfeAmb), null, 2), "Dados em JSON copiados."),
  nfeEnviar: () => nfeEnviar(), nfeConsulta: () => nfeConsulta(),
  nfeAba: t => { NFE.aba = t.dataset.v; nfeDraw(); },
  nfeNotaDel: t => { S.nfe.notas = S.nfe.notas.filter(x => x.id !== t.dataset.id); save(); nfeDraw(); },
  nfeLimpa: t => { if (!t.dataset.armed){ t.dataset.armed = "1"; t.textContent = "Toque de novo para descartar"; setTimeout(() => { t.dataset.armed = ""; t.textContent = "Descartar rascunho"; }, 4000); return; } S.nfe.d = null; Object.assign(NFE, {step:0, it:0, resp:null, err:"", prog:""}); save(); nfeDraw(); },
  rgConsulta: () => rgBusca(),
  rgDas: t => { const c = t.dataset.c; S.reg.pagos[c] = !S.reg.pagos[c]; S.reg.ativo = true; save(); rgDraw(); },
  rgDasn: t => { const y = t.dataset.y; S.reg.dasn[y] = !S.reg.dasn[y]; S.reg.ativo = true; save(); rgDraw(); },
  rgChk: t => { S.reg.checks[t.dataset.k] = {r:t.dataset.r, d:hojeISO()}; save(); rgDraw(); },
  logout: () => { logEv("Saída do app", "").then(() => vaultSave()).catch(() => {}).finally(() => { save(); SECRET_CFG.forEach(k => { S.cfg[k] = ""; }); S.sec.totpSecret = ""; S.sec.fbRefresh = ""; VAULT.key = null; Object.assign(CLOUD, {tok:null, uid:"", email:"", claims:null}); });
    try{ sessionStorage.removeItem("lc:ok"); }catch(e){} renderAuth("login"); },
  authTotp: () => authTotp(),
  instala: async () => { if (!instEv) return; instEv.prompt(); try{ await instEv.userChoice; }catch(e){} instEv = null; render(); },
  instNao: () => { S.cfg.instOcultar = true; save(); render(); },
  mtVal: t => { MT.alvo = t.dataset.v; MT.vmin = String(Math.round(+t.dataset.v * 0.6)); MT.vmax = String(Math.round(+t.dataset.v * 1.4)); render(); },
  mtNicho: t => { const v = t.dataset.v, i = MT.nichos.indexOf(v); if (i >= 0) MT.nichos.splice(i, 1); else MT.nichos.push(v); render(); },
  mtUf: t => { MT.uf = t.dataset.v; render(); },
  mtMod: t => { const v = t.dataset.v, i = MT.mods.indexOf(v); if (i >= 0) MT.mods.splice(i, 1); else MT.mods.push(v); render(); },
  mtGo: () => { if (!MT.nichos.length && !termos(MT.palavras).length){ toast("Diga o que você vende."); return; } if (!(n(MT.vmin) > 0 || n(MT.vmax) > 0)){ toast("Informe a faixa de valor."); return; }
    Object.assign(S.perfil, {nichos:MT.nichos.slice(), palavras:MT.palavras, vmin:String(MT.vmin), vmax:String(MT.vmax), ufs:MT.uf ? [MT.uf] : [], mods:MT.mods.slice()}); save(); act.pfSalvar(); confirmaCheck("Alerta criado"); },
  bkAtualiza: () => { BK.msg = ""; bkCarrega(); },
  bkConecta: async () => { if (!bkPronto()) return; BK.msg = "Abrindo a conexão segura…"; BK.erro = ""; render();
    try{ const t = await apiFetch("/bancos/connect-token", {method:"POST", body:{}}); await loadScript(PLUGGY_JS); if (!window.PluggyConnect) throw {code:"WIDGET"};
      const pc = new window.PluggyConnect({connectToken:t.accessToken, language:"pt",
        onSuccess: async d => { const id = d && ((d.item && d.item.id) || d.itemId); try{ if (id){ await apiFetch("/bancos/itens", {method:"POST", body:{itemId:id}}); logEv("Conta bancária conectada", ""); confirmaCheck("Conta conectada"); await bkCarrega(); } }catch(e){ BK.erro = bkErr(e); render(); } },
        onError: () => { BK.erro = "Não foi possível concluir a conexão com o banco."; BK.msg = ""; render(); }, onClose: () => { BK.msg = ""; if (ui.tab === "bancos") render(); } });
      pc.init(); BK.msg = "";
    }catch(e){ BK.msg = ""; BK.erro = e && e.code === "WIDGET" ? "Não foi possível carregar a janela de conexão do provedor. Confira a internet." : e instanceof TypeError ? "Não foi possível carregar a janela de conexão. Verifique a internet e a política de segurança." : bkErr(e); } render(); },
  bkDesc: t => confirmBox("Desconectar esta conta? O app deixa de ver saldo e recebimentos. Você pode conectar de novo depois.", async () => { try{ await apiFetch("/bancos/itens/" + t.dataset.id, {method:"DELETE"}); logEv("Conta bancária desconectada", ""); BK.contas = null; BK.rec = null; confirmaCheck("Conta desconectada"); await bkCarrega(); }catch(e){ BK.erro = bkErr(e); render(); } }, "Desconectar"),
  bkBaixa: t => { const x = S.lic.find(y => y.id === t.dataset.id); if (!x) return; const antes = x.status; x.status = "Recebida"; stMudou(x, antes); toast("Licitação marcada como recebida."); render(); },
  privAdd: () => editPriv(null), privEdit: t => editPriv(t.dataset.id),
  privCat: t => { ui.pcat = t.dataset.v; render(); },
  privDir: t => { const x = PRIV[+t.dataset.i]; if (!x) return; if (privLista().some(y => y.n === x.n)){ toast("Já está na sua lista."); return; } editPriv(null, {n:x.n, cat:(PRIV_CATS.find(c => c[0] === x.c) || [0, PRIV_CATS[1][1]])[1], passo:"Pedir o cadastro de fornecedor", obs:"Página: " + x.u}); },
  privLic: t => { const x = privLista().find(y => y.id === t.dataset.id); if (!x) return; go("lic"); editLic(null, {status:"Selecionada", tipo:"privada", orgao:x.n, obs:x.obs || ""}); },
  logoDel: async t => { const s = t.dataset.s; delete LOGOS[s]; try{ await idb.del("logo:" + s); }catch(e){} logEv("Logotipo removido", s); toast("Logotipo removido."); render(); },
  licSeg: t => { ui.lv = t.dataset.v; render(); },
  agLance: () => go("lances"),
  stSet: t => { const x = S.lic.find(y => y.id === t.dataset.id); if (!x) return; const antes = x.status; x.status = t.dataset.v; stMudou(x, antes); render(); },
  stMove: t => { const x = S.lic.find(y => y.id === t.dataset.id); if (!x) return; const i = ST.indexOf(x.status) + (+t.dataset.d), antes = x.status; if (i < 0 || i >= ST.length) return; x.status = ST[i]; stMudou(x, antes); render(); },
  icsUm: t => { const x = S.lic.find(y => y.id === t.dataset.id); if (!x) return; const l = agEventos().filter(e => e.x.id === x.id); if (!l.length){ toast("Informe a data e a hora para criar o evento."); return; } baixaTexto("licitacao-" + x.id + ".ics", icsDe(l), "text/calendar"); toast("Arquivo do calendário gerado. Abra para adicionar."); },
  icsTodos: () => { const l = agEventos().filter(e => e.ts > Date.now() - 36e5); if (!l.length){ toast("Nada para adicionar."); return; } baixaTexto("agenda-licitacoes.ics", icsDe(l), "text/calendar"); toast("Arquivo do calendário gerado. Abra para adicionar."); },
  lcEnviou: t => { const x = S.lic.find(y => y.id === t.dataset.id); if (x){ const p = lancePlano(x); x.ult = {v:p.alvo, t:Date.now()}; save(); logEv("Lance registrado", x.objeto || x.orgao || ""); } document.querySelectorAll("#lcAlert").forEach(e => e.remove()); confirmaCheck("Lance registrado"); },
  tema: () => { const o = ["auto", "claro", "escuro"], t = o[(o.indexOf(S.cfg.tema || "auto") + 1) % 3]; S.cfg.tema = t; save(); aplicaTema(); vibra(8); toast("Tema: " + t); },
  fabAbre: () => { const m = $("#fabMenu"), b = $("#fabB"); const abre = m.hidden; m.hidden = !abre; b.setAttribute("aria-expanded", String(abre)); b.classList.toggle("on", abre); vibra(8); },
  fabLic: () => { fabFecha(); go("lic"); editLic(null); }, fabCalc: () => { fabFecha(); go("calc"); }, fabBusca: () => { fabFecha(); go("busca"); }, fabRadar: () => { fabFecha(); go("radar"); },
  wiUsa: () => { const s = $("#wi"), v = calcVals(); if (!s || v.preco <= 0) return; S.calc.preco = String(Math.round(v.preco * (+s.value) / 100 * 100) / 100).replace(".", ","); save(); const i = $("#c_preco"); if (i) i.value = S.calc.preco; s.value = 100; updateCalc(); toast("Lance atualizado."); },
  pushLiga: async () => { PUSHST.msg = "Ativando…"; render(); try{ await pushAtiva(); PUSHST.msg = "Pronto. Você vai receber os alertas neste celular."; }catch(e){ PUSHST.msg = pushMsg(e); } render(); },
  pfNuvem: async () => { try{ if (!CLOUD.uid) throw {code:"SEM_SESSAO"}; if (!S.cfg.fbProject) throw {code:"NAO_CONFIGURADO"}; await fbGravaPerfil(); PUSHST.msg = "Perfil enviado ao servidor."; logEv("Perfil enviado ao servidor", ""); }catch(e){ PUSHST.msg = e instanceof TypeError ? "Não foi possível falar com o Firebase daqui. Use o app instalado." : pushMsg(e); } render(); },
  finSync: async () => { FIN.sync = "Sincronizando…"; finDraw(); try{ const r = await finSync(); FIN.sync = r.enviados + " pedido(s) enviado(s), " + r.atualizados + " atualizado(s)."; }catch(e){ FIN.sync = e && e.code === "SEM_API" ? "Preencha o endereço da API." : e && e.code === "SEM_SESSAO" ? "Entre na nuvem primeiro." : e && /^API_/.test(e.code || "") ? "A plataforma recusou (" + e.code.slice(4) + (e.message ? ": " + e.message : "") + ")." : e instanceof TypeError ? "Não foi possível falar com a API daqui. Use o app instalado." : fbErr(e && e.code); } finDraw(); },
  finCat: t => { FIN.cat = t.dataset.v; render(); },
  finRecSim: t => { const l = S.lic.find(x => x.id === t.dataset.id); if (!l) return; const v = n(l.qtd) * n(l.preco); FIN.sim = {...FIN.sim, tipo:FIN_TIPOS[0], valor:v ? String(v).replace(".", ",") : "", dias:"60", inst:""}; FIN.aba = "simular"; render(); },
  sec2faIni: () => { SEC.novo = b32enc(rnd(20)); secDraw(); },
  sec2faCancela: () => { SEC.novo = null; secDraw(); },
  sec2faOk: async () => { const c = $("#sec_cod"); if (!SEC.novo || !c) return; if (!(await totpOk(SEC.novo, c.value))){ toast("Código incorreto. Confira a hora do aparelho e tente de novo."); return; }
    const cods = Array.from({length:8}, () => [...rnd(4)].map(b => b.toString(16).padStart(2, "0")).join("").replace(/^(.{4})(.{4})$/, "$1-$2")), hs = [];
    for (const x of cods) hs.push(await sha256hex("rec:" + x.toLowerCase()));
    S.sec.totpSecret = SEC.novo; S.sec.totp = {ativo:true, rec:hs, desde:Date.now()}; SEC.rec = cods; SEC.novo = null; save(); await vaultSave(); logEv("Verificação em duas etapas ativada", ""); secDraw(); },
  sec2faOff: async t => { if (!t.dataset.armed){ t.dataset.armed = "1"; t.textContent = "Toque de novo para desativar"; setTimeout(() => { t.dataset.armed = ""; t.textContent = "Desativar"; }, 4000); return; } S.sec.totp = null; S.sec.totpSecret = ""; save(); await vaultSave(); logEv("Verificação em duas etapas desativada", ""); secDraw(); },
  secRecCopia: () => copia((SEC.rec || []).join("\n"), "Códigos copiados."),
  secRecOk: () => { SEC.rec = null; secDraw(); },
  secLogVer: async () => { SEC.verLog = await logVerifica(); secDraw(); },
  secLogExp: () => { if (!can("logs.exportar")) return; copia(JSON.stringify(S.audit || [], null, 1), "Registro copiado."); logEv("Registro de atividades exportado", ""); },
  fbEntrar: () => fbEntra(false), fbCriar: () => fbEntra(true),
  fbMail: async () => { try{ await fbMailEnvia(); SEC.fbMsg = "E-mail de verificação enviado. Abra o link e depois toque em Já confirmei."; logEv("E-mail de verificação reenviado", ""); }catch(e){ SEC.fbMsg = e instanceof TypeError ? "Não foi possível falar com o Firebase daqui. Use o app instalado." : fbErr(e && e.code); } secDraw(); },
  fbMailOk: async () => { try{ SEC.fbMsg = (await fbMailConfere()) ? "E-mail confirmado." : "O e-mail ainda não foi confirmado. Abra o link que enviamos."; if (CLOUD.emailOk) logEv("E-mail verificado", ""); }catch(e){ SEC.fbMsg = e instanceof TypeError ? "Não foi possível falar com o Firebase daqui. Use o app instalado." : fbErr(e && e.code); } secDraw(); },
  fbTesta: async () => { SEC.diag = [{n:"Testando", ok:true, t:"Conferindo a chave, o banco e o armazenamento…"}]; secDraw(); SEC.diag = await fbDiagnostico(); logEv("Teste de conexão com o Firebase", SEC.diag.every(x => x.ok) ? "tudo certo" : "há itens a ajustar"); secDraw(); },
  fbSair: () => { Object.assign(CLOUD, {tok:null, uid:"", email:"", claims:null}); S.sec.fbRefresh = ""; save(); SEC.fbMsg = "Você saiu da nuvem."; secDraw(); },
  fbBackup: async () => { if (!can("backup.nuvem")){ SEC.fbMsg = "Seu papel não permite backup na nuvem."; secDraw(); return; } if (String(SEC.bp || "").length < 8){ SEC.fbMsg = "Digite uma senha de criptografia com pelo menos 8 caracteres. Guarde-a: sem ela o backup não abre."; secDraw(); return; }
    SEC.fbMsg = "Enviando o backup criptografado…"; secDraw(); try{ const nb = await fbBackup(SEC.bp); SEC.fbMsg = "Backup enviado (" + (nb / 1024).toFixed(0) + " KB, criptografado)."; S.sec.bk = {t:new Date().toISOString(), onde:"nuvem"}; save(); logEv("Backup na nuvem enviado", nb + " bytes"); }catch(e){ SEC.fbMsg = e instanceof TypeError ? "Não foi possível falar com o Firebase daqui. Use o app instalado." : e && /^STORAGE_/.test(e.code || "") ? "O Storage recusou o envio (" + e.code.slice(8) + "). Confira as regras e o bucket." : fbErr(e && e.code); } secDraw(); },
  fbRestaura: () => { if (String(SEC.bp || "").length < 8){ SEC.fbMsg = "Digite a senha de criptografia usada no backup."; secDraw(); return; }
    confirmBox("Restaurar o backup da nuvem substitui os dados deste aparelho (as chaves do cofre ficam). Continuar?", async () => { SEC.fbMsg = "Baixando…"; secDraw();
      try{ const o = await fbBaixa(SEC.bp); restauraS(o); logEv("Backup da nuvem restaurado", ""); SEC.fbMsg = "Backup restaurado."; }catch(e){ SEC.fbMsg = e && e.code === "SENHA_BACKUP" ? "Senha de criptografia incorreta." : e && e.code === "SEM_BACKUP" ? "Ainda não há backup na nuvem." : e instanceof TypeError ? "Não foi possível falar com o Firebase daqui. Use o app instalado." : fbErr(e && e.code); } secDraw(); }, "Restaurar"); },
  nfCopy: () => { const o = $("#nfOut"); if (!o || !o.value){ toast("Escolha uma licitação primeiro."); return; } o.focus(); o.select(); try{ navigator.clipboard.writeText(o.value).then(() => toast("Texto copiado."), () => toast("Selecionei o texto. Use Copiar do seu aparelho.")); }catch(e){ toast("Selecionei o texto. Use Copiar do seu aparelho."); } },
  ajudaVer: () => { S.cfg.ajudaVista = true; save(); go("ajuda"); },
  ajudaFechar: () => { S.cfg.ajudaVista = true; save(); render(); },
  fl: t => { ui.fl = t.dataset.v; render(); },
  calcClear: () => { S.calc = {...DEF.calc, margem:String(S.cfg.margem)}; save(); render(); },
  calcToLic: () => {
    const v = calcVals();
    if (v.preco <= 0){ toast("Digite o lance antes de salvar."); return; }
    go("lic"); editLic(null, {status:"Selecionada", preco:v.preco, qtd:v.qtd, custo:v.custo, frete:v.frete, outros:v.outros});
  },
  export: () => {
    baixaTexto("licita-lance-certo-backup.json", JSON.stringify(S, (k, v) => SECRET_KEYS.has(k) ? undefined : v, 2), "application/json")
      .then(() => { S.sec.bk = {t:new Date().toISOString(), onde:"arquivo"}; save(); logEv("Backup salvo em arquivo", ""); toast("Backup gerado."); })
      .catch(() => toast("Não foi possível salvar o arquivo."));
  },
  import: () => $("#file").click()
};
document.addEventListener("click", e => {
  if (e.target.closest("a")) return;
  const t = e.target.closest("[data-a]"); if (!t || t.closest("#sheet") || t.closest("#cbox")) return;
  if (t.dataset.a === "tab") vibra(6);
  const f = act[t.dataset.a]; if (f) f(t);
});
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches('div[data-a]')){ e.preventDefault(); e.target.click(); }
});
document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a[href]"); if (a && !/^(https?:|blob:|otpauth:|#|mailto:|tel:)/i.test(a.getAttribute("href") || "")){ e.preventDefault(); } }, true);
document.addEventListener("change", async e => { const t = e.target;
  if (t && t.dataset && t.dataset.logo && t.files && t.files[0]){ const s = t.dataset.logo; try{ const v = await logoLe(t.files[0]); await idb.put("logo:" + s, v); LOGOS[s] = v; logEv("Logotipo enviado", s); confirmaCheck("Logotipo salvo"); }catch(er){ toast((er && er.m) || "Não foi possível salvar o logotipo."); } t.value = ""; render(); return; } if (t && t.dataset && t.dataset.ext){ S.ext = S.ext || {chk:{}}; S.ext.chk[t.dataset.ext] = t.checked; save(); render(); } });
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "wi"){ updateWhatIf(); }
  else if (t.dataset && t.dataset.mt !== undefined){ MT[t.dataset.mt] = t.value; }
  else if (t.dataset && t.dataset.ex !== undefined){ exCalc(); }
  else if (t.dataset && t.dataset.c){ S.calc[t.dataset.c] = t.value; save(); updateCalc(); }
  else if (t.id === "qf"){ ui.qf = t.value; fillForn(); }
  else if (t.id === "qc"){ ui.qc = t.value; fillCot(); }
  else if (t.dataset && t.dataset.b !== undefined){ ui.bq[t.dataset.b] = t.value; const o = $("#buscaOut"); if (o) o.innerHTML = buscaOut(); }
  else if (t.id === "nfSel"){ ui.nf = t.value; const o = $("#nfOut"); if (o) o.value = nfText(ui.nf); const o2 = $("#triOut"); if (o2) o2.value = triText(ui.nf); }
  else if (t.dataset && t.dataset.sec !== undefined){ if (t.dataset.sec === "papel"){ S.sec.papel = t.value; save(); logEv("Papel simulado alterado", t.value); secDraw(); } }
  else if (t.dataset && t.dataset.fb !== undefined){ S.cfg[t.dataset.fb] = t.value.trim(); save(); }
  else if (t.dataset && t.dataset.secf !== undefined){ const k = t.dataset.secf; if (k === "email") SEC.fbEmail = t.value; else if (k === "pw") SEC.pw = t.value; else SEC.bp = t.value; }
  else if (t.dataset && t.dataset.com !== undefined){ if (!can("comissao.editar")) return; const k = t.dataset.com; S.fin.com[k] = k === "modelo" ? t.value : n(t.value); save(); if (k === "modelo") finDraw(); }
  else if (t.dataset && t.dataset.nf !== undefined){ nfeSet(t.dataset.nf, t.value, t); }
  else if (t.dataset && t.dataset.nfec !== undefined){ S.cfg[t.dataset.nfec] = t.value.trim(); save(); const at = $("#nfeAmbTxt"), ob = $("#nfeOkBox"); if (at) at.textContent = S.cfg.nfeAmb === "producao" ? "Produção (nota com valor fiscal)" : "Homologação (teste, sem valor fiscal)"; if (ob) ob.hidden = S.cfg.nfeAmb !== "producao"; const s = $("#nfeCfgSum"); if (s) s.textContent = "Conexão com o emissor de notas: " + (S.cfg.nfeProxy ? "servidor intermediário" : S.cfg.nfeToken ? "direto, com o token" : "sem emissor conectado"); }
  else if (t.dataset && t.dataset.nfeok !== undefined){ NFE.ok = t.checked; }
  else if (t.dataset && t.dataset.rg !== undefined){ RG.cnpj = maskCnpj(t.value); t.value = RG.cnpj; const m = $("#rg_msg"); if (m) m.textContent = cnpjMsg(RG.cnpj); }
  else if (t.dataset && t.dataset.rgp !== undefined){ const v = t.value; if (v){ compsRecentes().forEach(c => { if (c <= v) S.reg.pagos[c] = true; }); S.reg.ativo = true; save(); rgDraw(); } }
  else if (t.dataset && t.dataset.ai !== undefined){ S.cfg[t.dataset.ai] = t.value.trim(); save(); }
  else if (t.dataset && t.dataset.edn !== undefined){ ED.novo[t.dataset.edn] = t.value; }
  else if (t.dataset && t.dataset.bot !== undefined){ const k = t.dataset.bot; if (k === "edId") BOT.edId = t.value; else if (k === "url") BOT.pag.url = t.value; else BOT.pag.texto = t.value; }
  else if (t.dataset && t.dataset.pf !== undefined){ S.perfil[t.dataset.pf] = t.value; save(); }
  else if (t.dataset && t.dataset.fs !== undefined){ const k = t.dataset.fs; FIN.sim[k] = t.value; if (k === "tipo" || k === "metodo") finDraw(); else { const o = $("#finRes"); if (o) o.innerHTML = finRes(FIN.sim); } }
  else if (t.dataset && t.dataset.rd !== undefined){ RD.q[t.dataset.rd] = t.value; }
  else if (t.dataset && t.dataset.an !== undefined){ const p = S.prev.find(x => x.id === t.dataset.id); if (!p) return; (p.an = p.an || {})[t.dataset.an] = t.value; save();
    const a = p.an, q = n(a.qtd) || p.qtd || 0, pu = p.vu || (q > 0 && p.pub && p.pub.valor ? p.pub.valor / q : 0), custo = n(a.custo), extra = n(a.extra);
    const r = (custo > 0 && pu > 0 && q > 0) ? calc({preco:pu, qtd:q, custo, frete:extra * q, outros:0, margem:S.cfg.margem}) : null; const o = $("#anRes"); if (o) o.innerHTML = anRes(p, r, pu); }
  else if (t.dataset && t.dataset.orc !== undefined){ if (t.dataset.orc === "ano") ORC.ano = +t.value; else ORC.per = t.value; ORC.sel = null; ORC.det = {}; orcDraw(); }
  else if (t.dataset && t.dataset.pk !== undefined){ const c = t.dataset.pk, p = PK[c]; if (t.dataset.pkk === "uf"){ p.uf = t.value; p.q = ""; pkLoad(c); } else { p.q = t.value; const o = $("#pkl_" + c); if (o) o.innerHTML = pkList(c); } }
  else if (t.dataset && t.dataset.ob !== undefined){ if (t.dataset.ob === "atras") OB.atras = t.checked; else OB[t.dataset.ob] = t.value; }
  else if (t.dataset && t.dataset.lc !== undefined){ const x = S.lic.find(y => y.id === t.dataset.id); if (!x) return; const k = t.dataset.lc; x[k] = k === "horaFim" ? t.value : n(t.value); if (k === "horaFim") x.fimAjuste = 0; save(); const o = $("#pl_" + x.id); if (o) o.innerHTML = planoHTML(x); const c = document.querySelector(`[data-cdb="${x.id}"]`); if (c) c.innerHTML = cdBlock(x); }
  else if (t.dataset && t.dataset.lcs !== undefined){ S.cfg[t.dataset.lcs] = t.dataset.lcs === "alertaSom" ? t.value === "1" : t.dataset.lcs === "modoFinal" ? t.value : +t.value; save(); }
  else if (t.dataset && t.dataset.emp !== undefined){ let v = t.value; if (t.dataset.emp === "cnpj"){ v = maskCnpj(v); t.value = v; const mg = $("#em_msg"); if (mg) mg.textContent = cnpjMsg(v); } S.empresa[t.dataset.emp] = v; save(); }
  else if (t.dataset && t.dataset.fr !== undefined){ ui[t.dataset.fr] = t.value; if (t.dataset.fr === "frQ"){ const o = $("#frList"); if (o) o.innerHTML = frListHTML(); } else render(); }
  else if (t.dataset && t.dataset.mx !== undefined){ if (t.dataset.mx === "dias") MX.dias = +t.value; else MX[t.dataset.mx] = t.value; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.closest && e.target.closest(".auth")){ const b = $(".auth [data-a='authCreate'], .auth [data-a='authLogin']"); if (b){ e.preventDefault(); b.click(); } }
});
$("#file").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const o = JSON.parse(r.result);
      if (!o || !Array.isArray(o.lic) || !Array.isArray(o.forn) || !Array.isArray(o.cot)) throw new Error("formato");
      confirmBox("Importar substitui os dados atuais deste aparelho. Continuar?", () => {
        S = {...clone(DEF), ...o, cfg:{...DEF.cfg, ...o.cfg}, calc:{...DEF.calc, ...o.calc}, docs:Array.isArray(o.docs) ? o.docs : clone(DEF.docs)}; save(); render(); toast("Backup importado.");
      }, "Importar");
    }catch(err){ toast("Arquivo inválido. Use um backup exportado por este app."); }
    e.target.value = "";
  };
  r.readAsText(f);
});

async function edPncp(){
  const l = S.lic.find(x => x.id === ED.novo.licId), m = l && /pncp\.gov\.br\/app\/editais\/(\d{14})\/(\d{4})\/(\d+)/.exec(l.link || "");
  if (!m){ ED.err = "Escolha, em Ligar a uma licitação, uma licitação que tenha o link do PNCP."; edDraw(); return; }
  ED.busy = true; ED.prog = "Buscando os arquivos no PNCP…"; ED.err = ""; edDraw();
  try{
    const base = `https://pncp.gov.br/pncp-api/v1/orgaos/${m[1]}/compras/${m[2]}/${+m[3]}/arquivos`, r = await fetch(base, {headers:{Accept:"application/json"}}); if (!r.ok) throw {code:"http_" + r.status};
    const a = await r.json(), f = (Array.isArray(a) ? a : []).find(x => /edital/i.test(tx(x.tipoDocumentoNome) + " " + tx(x.titulo))) || (a || [])[0]; if (!f) throw {code:"vazio"};
    const d = await fetch(base + "/" + (f.sequencialDocumento || f.sequencial || 1)); if (!d.ok) throw {code:"http_" + d.status};
    const buf = await d.arrayBuffer(); ED.prog = "Lendo o PDF…"; edDraw();
    const t = await pdfTexto(buf, (i, n) => { ED.prog = `Lendo o PDF: página ${i} de ${n}`; edDraw(); });
    ED.busy = false; const n0 = ED.novo; ED.novo = {titulo:"", texto:"", licId:""}; await edNovo(t, n0.titulo || tx(f.titulo) || "Edital do PNCP", "PNCP", l.id);
  }catch(e){ ED.busy = false; ED.prog = ""; ED.err = (e instanceof TypeError || /^http_/.test((e && e.code) || "")) ? "Não foi possível baixar o edital do PNCP daqui. Baixe o PDF no PNCP e envie o arquivo." : e && e.code === "vazio" ? "Não encontrei arquivo de edital nesta contratação." : "Não consegui ler o edital do PNCP. Envie o PDF."; edDraw(); }
}
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset && t.dataset.com !== undefined){ finDraw(); return; }
  if (t.dataset && t.dataset.ai !== undefined){ const s = $("#aiSum"); if (s) s.textContent = "Conexão com a IA: " + AI_NOMES[aiModo()]; return; }
  if (t.id !== "ed_arq" || !t.files || !t.files[0]) return;
  const f = t.files[0]; ED.busy = true; ED.err = ""; ED.prog = "Lendo o arquivo…"; edDraw();
  try{ let txt = await lerArquivo(f, (i, n) => { ED.prog = `Lendo o PDF: página ${i} de ${n}`; edDraw(); }); ED.busy = false;
    if (!txt || txt.trim().length < 200){ if (ED.pdfPend && (aiModo() === "proxy" || aiModo() === "chave")) txt = "[PDF sem texto selecionável. O arquivo é lido direto pela IA.]"; else { ED.pdfPend = null; ED.err = "Não encontrei texto no arquivo. Se for PDF escaneado (imagem), conecte a IA por servidor ou chave, que lê o PDF inteiro, ou cole o texto."; edDraw(); return; } }
    const n0 = ED.novo; ED.novo = {titulo:"", texto:"", licId:""}; await edNovo(txt, n0.titulo || f.name.replace(/\.[^.]+$/, ""), f.name, n0.licId);
  }catch(err){ ED.busy = false; ED.prog = ""; ED.err = err && err.code === "formato" ? "Formato não suportado. Use PDF ou TXT, ou cole o texto." : "Não consegui ler o arquivo. Tente outro PDF ou cole o texto."; edDraw(); }
});
document.addEventListener("keydown", e => { if (e.target && e.target.id === "botIn" && e.key === "Enter" && !e.shiftKey){ e.preventDefault(); const i = e.target, q = i.value; i.value = ""; botEnvia(q); } });
setInterval(tickLances, 500);
setInterval(tickAvisos, 1000);
/* ---------- selos das instituições: logotipo oficial se existir em img/parceiros, senão monograma ---------- */
const SELOS = [["antecipagov", "antecipagov", "AG"], ["banco do brasil", "bb", "BB"], ["caixa", "caixa", "CX"], ["bradesco", "bradesco", "BR"], ["itau", "itau", "IT"], ["santander", "santander", "ST"], ["sicoob", "sicoob", "SI"], ["inter", "inter", "IN"], ["open finance", "openfinance", "OF"], ["pluggy", "pluggy", "PL"], ["pncp", "pncp", "PN"], ["compras.gov", "comprasgov", "CG"], ["sicaf", "sicaf", "SC"], ["tesouro", "tesouro", "TN"], ["siconfi", "tesouro", "TN"], ["obrasgov", "obrasgov", "OB"], ["ibge", "ibge", "IB"], ["receita", "receita", "RF"], ["brasilapi", "brasilapi", "BA"], ["focus", "focusnfe", "FN"], ["pronampe", "pronampe", "PR"], ["petronect", "petronect", "PT"], ["vale", "vale", "VL"], ["suzano", "suzano", "SZ"], ["tetra pak", "tetrapak", "TP"], ["mercado eletronico", "mercadoeletronico", "ME"], ["ariba", "ariba", "AR"], ["coupa", "coupa", "CP"], ["bionexo", "bionexo", "BX"]];
const SELO_COR = ["#1E4FE0", "#0E7490", "#4F46E5", "#0F766E", "#7C3AED", "#B45309", "#BE185D", "#166534"];
function selo(nome, o = {}){
  const k = String(nome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), m = SELOS.find(x => k.includes(x[0])), slug = m ? m[1] : "";
  const sig = m ? m[2] : (String(nome).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"), cor = SELO_COR[[...(slug || k)].reduce((a, c) => a + c.charCodeAt(0), 0) % SELO_COR.length];
  return `<span class="pl${o.sm ? " sm" : ""}"><span class="pl-lg"><i class="pl-m" style="--c:${cor}">${esc(sig)}</i>${slug && LOGOS[slug] ? `<img class="pl-img" src="${LOGOS[slug]}" alt="">` : slug && (window.LC_PARC || {})[slug] ? `<img class="pl-img" src="img/parceiros/${slug}.${window.LC_PARC[slug]}" alt="" loading="lazy">` : ""}</span>${o.so ? "" : `<b>${esc(nome)}</b>`}</span>`;
}
document.addEventListener("error", e => { const t = e.target; if (t && t.classList && t.classList.contains("pl-img")) t.remove(); }, true);
const fontesHub = () => `<div class="fontes-h"><small>Fontes e parceiros oficiais</small><div>${["PNCP", "Compras.gov.br", "SICAF", "Tesouro Nacional", "Obrasgov", "IBGE", "AntecipaGov"].map(n => selo(n, {sm:true})).join("")}</div></div>`;

/* ---------- empresas privadas que compram (diretório e minha lista) ---------- */
const PRIV_CATS = [["todas", "Todas"], ["plataforma", "Plataformas de compras"], ["industria", "Indústria e mineração"], ["energia", "Energia, óleo e gás"], ["papel", "Papel, celulose e embalagens"], ["saude", "Saúde"]];
const PRIV_ST = ["Quero me cadastrar", "Cadastro enviado", "Homologada", "Cotação aberta", "Cliente"];
const PRIV = [
  {n:"Petronect (Petrobras)", c:"energia", t:"Estatal e marketplace B2B", d:"Marketplace B2B da cadeia de suprimentos de energia, óleo e gás. O cadastro de fornecedores da Petrobras fica permanentemente aberto no portal Petronect. Notas fiscais e pedidos de bens e serviços passam pelo SAP Business Network (Ariba).", p:["Cadastre a empresa no portal Petronect", "Acompanhe as oportunidades e os convites", "Emita pedidos e notas pelo SAP Business Network"], u:"https://www.petronect.com.br", u2:"https://www.canalfornecedor.petrobras.com.br", obs:"A Petrobras é estatal e segue regras próprias (Lei 13.303), diferentes das licitações comuns."},
  {n:"Vale", c:"industria", t:"Mineração", d:"Quando a Vale identifica uma empresa como possível fornecedora, ela envia um convite por e-mail para o portal de cadastro (GSRP). Depois do cadastro, o portal de fornecedores concentra cotações, pedidos e documentos.", p:["Procure um comprador da Vale que conheça a sua empresa", "Aceite o convite por e-mail e conclua o cadastro", "Mantenha os dados atualizados no próprio portal"], u:"https://vale.com/cadastro-de-fornecedores"},
  {n:"Suzano", c:"papel", t:"Papel e celulose", d:"O portal de relacionamento com fornecedores tem a área \"Seja um fornecedor\", para cadastrar a empresa na base, e a área de quem já fornece, com orientações de nota fiscal e acompanhamento de pagamentos.", p:["Cadastre a empresa na base de fornecedores", "Leia os critérios legais e socioambientais", "Depois de contratado, acompanhe notas e pagamentos"], u:"https://portaldofornecedor.suzano.com.br"},
  {n:"Tetra Pak", c:"papel", t:"Embalagens", d:"Usa plataformas digitais de compras: o SAP Ariba como preferida e o Coupa em projetos de logística. Os módulos incluem cotações (RFI, RFP e leilões) e o registro e a qualificação de fornecedores.", p:["Leia a página de compras digitais", "Prepare-se para o registro e a qualificação", "Responda às cotações que chegarem pela plataforma"], u:"https://www.tetrapak.com/pt-br/suppliers/digital-procurement"},
  {n:"Mercado Eletrônico", c:"plataforma", t:"Plataforma de compras corporativas", d:"Empresa brasileira de tecnologia para compras corporativas, com uma comunidade de compradores e fornecedores. Os compradores usam o portal para cotar e comprar. Também há a ProcPro, para pedir cotações.", p:["Procure o cadastro de fornecedor no site", "Informe categorias, regiões e documentos", "Responda às cotações dos compradores"], u:"http://www.me.com.br"},
  {n:"SAP Business Network (Ariba)", c:"plataforma", t:"Rede de compradores e fornecedores", d:"Grandes compradores convidam fornecedores para a rede. O convite chega por e-mail e leva ao cadastro. Há dois caminhos: o comprador convida, ou o fornecedor inicia a relação.", p:["Espere o convite do comprador, ou procure o cadastro da rede", "Crie a conta da empresa e complete o perfil", "Responda a cotações, receba pedidos e envie notas"], u:gsearch("SAP Business Network Ariba cadastro de fornecedor"), busca:true},
  {n:"Coupa Supplier Portal", c:"plataforma", t:"Portal de fornecedores", d:"Usado por compradores como a Vale. O fornecedor recebe um convite por e-mail do Coupa Supplier Portal e completa o cadastro para entrar na rede do comprador.", p:["Aguarde o convite por e-mail do comprador", "Complete o cadastro da empresa no portal", "Acompanhe cotações, pedidos e pagamentos"], u:gsearch("Coupa Supplier Portal cadastro de fornecedor"), busca:true},
  {n:"Bionexo", c:"saude", t:"Marketplace de saúde", d:"Plataforma de compras eletrônicas para a saúde, que conecta hospitais e outras instituições a fornecedores.", p:["Procure o cadastro de fornecedor", "Informe produtos, regiões e documentos sanitários", "Responda às cotações dos hospitais"], u:gsearch("Bionexo cadastro de fornecedor"), busca:true}
];
const privLista = () => (S.priv = S.priv || {lista:[]}).lista;
function editPriv(id, pre){
  const cur = id ? privLista().find(x => x.id === id) : null, vals = cur || {status:PRIV_ST[0], cat:PRIV_CATS[1][1], ...pre};
  openForm({title:cur ? "Editar comprador" : "Novo comprador privado", vals,
    fields:[{k:"n", l:"Empresa compradora"}, {k:"cat", l:"Segmento", t:"sel", o:PRIV_CATS.slice(1).map(c => [c[1], c[1]])}, {k:"contato", l:"Contato (nome, e-mail ou telefone)"}, {k:"status", l:"Situação", t:"sel", o:PRIV_ST.map(s => [s, s])}, {k:"passo", l:"Próximo passo", w:"half"}, {k:"prox", l:"Data do próximo passo", t:"date", w:"half"}, {k:"obs", l:"Anotações", t:"area"}],
    check: v => String(v.n || "").trim() ? "" : "Informe a empresa.",
    save: v => { const antes = cur ? cur.status : null; if (cur) Object.assign(cur, v); else privLista().unshift({id:uid(), ...v}); if (v.status !== antes && v.status === "Homologada") setTimeout(() => confirmaCheck("Empresa homologada"), 250); },
    del: cur ? () => { S.priv.lista = privLista().filter(x => x.id !== id); } : null});
}
function viewPrivadas(m){
  const cat = ui.pcat || "todas", L = privLista(), cont = PRIV_ST.map(s => L.filter(x => x.status === s).length), dir = PRIV.filter(x => cat === "todas" || x.c === cat);
  m.innerHTML = `<h1>Empresas privadas</h1><p class="sub">Grandes empresas e plataformas que cotam, fazem concorrências e cadastram fornecedores. Aqui não existe um edital público único: cada empresa tem o seu portal e o seu cadastro.</p>
  <div class="ag-kpi"><div><small>Na minha lista</small><b data-cu="${L.length}">${L.length}</b></div><div><small>Homologadas</small><b data-cu="${cont[2]}">${cont[2]}</b></div><div><small>Cotações abertas</small><b data-cu="${cont[3]}">${cont[3]}</b></div><div><small>Clientes</small><b data-cu="${cont[4]}">${cont[4]}</b></div></div>
  <div class="card"><b>Meu funil de cadastro</b><p class="sub" style="margin:2px 0 8px">Quantas empresas estão em cada etapa, do primeiro contato até virar cliente.</p>${barsHTML("priv", cont, ["Quero", "Enviado", "Homolog.", "Cotação", "Cliente"])}</div>
  <div class="card"><div class="top"><b>Meus compradores privados</b><button class="btn sm" data-a="privAdd">Adicionar</button></div>${!L.length ? '<div class="empty" style="padding:10px 0">Nenhum ainda. Escolha uma empresa abaixo ou toque em Adicionar.</div>' : `<ul class="rows" style="margin:6px 0 0">${L.map(x => `<li><span><b>${esc(x.n)}</b><small style="display:block;color:var(--mut)">${esc(x.cat || "")}${x.passo ? " · " + esc(x.passo) : ""}${x.prox ? " · " + fdate(x.prox) : ""}</small><span class="pv-a"><button class="btn ghost sm" data-a="privEdit" data-id="${x.id}">Editar</button>${x.status === "Cotação aberta" || x.status === "Homologada" ? `<button class="btn ghost sm" data-a="privLic" data-id="${x.id}">Criar participação</button>` : ""}</span></span><span><span class="tag ${x.status === "Cliente" || x.status === "Homologada" ? "ok" : x.status === "Cotação aberta" ? "wn" : ""}">${esc(x.status)}</span></span></li>`).join("")}</ul>`}</div>
  <h2 class="gh">Onde procurar</h2><div class="chips" style="flex-wrap:wrap;margin:0 0 10px;padding:0">${PRIV_CATS.map(([k, t]) => `<button class="chip${cat === k ? " on" : ""}" data-a="privCat" data-v="${k}">${t}</button>`).join("")}</div>
  ${dir.map(x => `<div class="card pc"><div class="pc-h">${selo(x.n)}<span class="tag">${esc(x.t)}</span></div><p>${esc(x.d)}</p><ol class="pv-p">${x.p.map(p => `<li>${esc(p)}</li>`).join("")}</ol>${x.obs ? `<div class="hint">${esc(x.obs)}</div>` : ""}<div class="link"><a class="btn ghost sm" href="${su(x.u)}" target="_blank" rel="noopener">${x.busca ? "Procurar o cadastro" : "Abrir página oficial"}</a>${x.u2 ? `<a class="btn ghost sm" href="${su(x.u2)}" target="_blank" rel="noopener">Canal do fornecedor</a>` : ""}<button class="btn sm" data-a="privDir" data-i="${PRIV.indexOf(x)}">Adicionar à minha lista</button></div></div>`).join("")}
  <details class="tut"><summary>Passo a passo para vender a empresas privadas</summary><div class="tb"><ol class="pv-steps">
    <li><b>Prepare a empresa.</b> CNPJ ativo, cartão CNPJ, contrato social ou CCMEI, certidões em dia, dados bancários, portfólio e referências de clientes.</li>
    <li><b>Escolha por onde entrar.</b> Plataformas de compras (como as do diretório) ou o portal de fornecedores da empresa que você quer atender.</li>
    <li><b>Peça o cadastro.</b> Pelo portal da empresa ou por indicação de um comprador da área que precisa do seu produto. Muitas vezes o cadastro só avança quando existe uma demanda.</li>
    <li><b>Passe pela homologação.</b> A empresa confere documentos, situação fiscal e, às vezes, qualidade, segurança e conformidade. Responda rápido e mantenha tudo atualizado.</li>
    <li><b>Receba convites e cotações.</b> Os pedidos de cotação chegam pelo portal ou por e-mail. Veja prazo, especificação, volume, local e condição de pagamento.</li>
    <li><b>Monte a proposta.</b> Use a calculadora para achar o seu piso de margem. Informe preço, prazo, validade e condições. Confirme a especificação.</li>
    <li><b>Negocie ou participe do leilão.</b> Algumas empresas fazem rodadas de negociação ou leilão reverso. Defina o seu limite antes e não passe dele.</li>
    <li><b>Receba o pedido, entregue e emita a nota.</b> Siga o prazo e o local. Muitas empresas pedem a nota pelo próprio portal.</li>
    <li><b>Acompanhe o relacionamento.</b> Atualize a situação aqui, crie a participação na agenda e peça avaliação para manter a nota de fornecedor.</li>
  </ol><div class="hint"><b>Cuidado:</b> confirme sempre o endereço oficial com o comprador. Desconfie de quem cobra para cadastrar a sua empresa. Cada empresa tem as suas regras.</div></div></details>
  <p class="hint">Este painel é um diretório de apoio, com páginas oficiais e informações de imprensa conferidas em outubro de 2026. Não existe uma base pública única de cotações privadas, por isso o app não mostra cotações em tempo real. Cada empresa publica no seu portal.</p>`;
  barrasAnima(m); contaAte(m);
}
const privHub = () => { const L = privLista(), ab = L.filter(x => x.status === "Cotação aberta").length; return `<div class="card priv-h"><div class="top"><b>Empresas privadas</b><span class="tag ${ab ? "wn" : ""}">${ab ? ab + " cotação aberta" : L.length + " na lista"}</span></div><p class="sub" style="margin:4px 0 10px">Plataformas e grandes compradores que cadastram fornecedores e pedem cotações. Monte a sua lista e acompanhe cada cadastro.</p><button class="btn ghost" data-a="tab" data-t="privadas">Abrir o painel</button></div>`; };

/* ---------- conexões bancárias (somente leitura, via Open Finance) ---------- */
const PLUGGY_JS = "https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js";
const BK = {contas:null, rec:null, busy:"", msg:"", erro:"", t:0};
const bkPronto = () => !!(S.cfg.apiUrl && CLOUD.uid && CLOUD.emailOk);
const bkErr = e => { const c = e && e.code; return c === "SEM_API" ? "Preencha o endereço da API em Mais, Segurança e acesso, Nuvem." : c === "SEM_SESSAO" ? "Entre na nuvem primeiro." : c === "API_503" ? "O servidor ainda não tem a conexão bancária configurada. Veja o Guia de APIs bancárias." : c === "API_403" ? (e.message || "Seu papel não permite conectar contas.") : c === "API_404" ? "Conexão não encontrada." : /^API_/.test(c || "") ? "A plataforma recusou (" + c.slice(4) + (e.message ? ": " + e.message : "") + ")." : e instanceof TypeError ? "Não foi possível falar com a API daqui. Use o app instalado ou o site publicado." : "Não foi possível concluir. Tente de novo."; };
async function bkCarrega(){
  if (!bkPronto()) return; BK.busy = "Atualizando contas e recebimentos…"; BK.t = Date.now(); if (ui.tab === "bancos") render();
  try{ const [c, r] = await Promise.all([apiFetch("/bancos/contas"), apiFetch("/bancos/recebimentos?dias=30")]); BK.contas = c; BK.rec = r; BK.erro = ""; }catch(e){ BK.erro = bkErr(e); }
  BK.busy = ""; if (ui.tab === "bancos") render();
}
const licTotal = x => n(x.preco) * (n(x.qtd) || 1);
function bkMatch(r){
  const d = norm(r.descricao), cand = S.lic.filter(x => ["Ganha", "Entregue"].includes(x.status) && licTotal(x) > 0 && Math.abs(licTotal(x) - r.valor) <= Math.max(1, licTotal(x) * 0.01));
  const pts = x => { const t = norm(x.orgao || "").split(/\s+/).filter(w => w.length > 3 && !["prefeitura", "municipal", "secretaria", "camara", "estado", "governo"].includes(w)); return t.filter(w => d.includes(w)).length + (d.includes("prefeitura") && /prefeitura/.test(norm(x.orgao || "")) ? 1 : 0); };
  return cand.sort((a, b) => pts(b) - pts(a))[0] || null;
}
function viewBancos(m){
  if (bkPronto() && !BK.contas && !BK.busy && Date.now() - BK.t > 30000) setTimeout(bkCarrega, 0);
  const pre = [["Conta na nuvem conectada", !!CLOUD.uid, "Mais, Segurança e acesso, Nuvem."], ["E-mail confirmado", !!CLOUD.emailOk, "Confirme o e-mail da conta."], ["Endereço da API preenchido", !!S.cfg.apiUrl, "Cole o endereço da API em Nuvem."]];
  m.innerHTML = `<h1>Conexões bancárias</h1><p class="sub">Veja saldo e recebimentos em modo leitura e concilie os pagamentos dos órgãos com as suas licitações. Funciona por Open Finance, com a sua autorização.</p>
  <div class="card"><b>Como funciona</b><ul class="bk-l"><li>Você autoriza no ambiente do seu banco. <b>O app nunca vê a sua senha.</b></li><li>É só leitura: o app não movimenta dinheiro nem faz pagamentos.</li><li>As chaves do provedor ficam <b>só no servidor</b>, nunca no aparelho.</li><li>Você pode desconectar quando quiser.</li></ul></div>
  <div class="card"><div class="top"><b>Antes de conectar</b><span class="tag ${bkPronto() ? "ok" : "wn"}">${bkPronto() ? "Pronto" : "Falta ajustar"}</span></div><ul class="rows" style="margin:6px 0 0">${pre.map(([t, ok, d]) => `<li><span><b>${t}</b>${ok ? "" : `<small style="display:block;color:var(--mut)">${d}</small>`}</span><span class="tag ${ok ? "ok" : "wn"}">${ok ? "Certo" : "Pendente"}</span></li>`).join("")}</ul>${bkPronto() ? "" : '<div class="actions"><button class="btn ghost sm" data-a="tab" data-t="seguranca">Abrir Segurança e acesso</button></div>'}</div>
  <div class="card"><b>Conectar uma conta</b>
    <div class="bk-p"><div>${selo("Open Finance Brasil", {sm:true})}<small>Bancos e fintechs pelo agregador ${selo("Pluggy", {sm:true})}</small></div><button class="btn" data-a="bkConecta"${bkPronto() && !BK.busy ? "" : " disabled"}>Conectar</button></div>
    <div class="bk-p"><div>${selo("Inter Empresas", {sm:true})}<small>Cria a integração no Internet Banking e conecta com Client ID, Client Secret, chave e certificado. O passo a passo está no guia.</small></div><button class="btn ghost" data-a="bkConecta"${bkPronto() && !BK.busy ? "" : " disabled"}>Conectar</button></div>
    <div class="bk-p"><div><b>Outros bancos com API própria</b><div class="pls">${["Banco do Brasil", "Itaú", "Bradesco", "Santander", "Sicoob", "Caixa"].map(n => selo(n, {sm:true, so:true})).join("")}</div><small>Exigem um conector no servidor.</small></div><span class="tag">Avançado</span></div>
    ${BK.msg ? `<div class="hint">${esc(BK.msg)}</div>` : ""}${BK.erro ? `<div class="err" role="alert">${esc(BK.erro)}</div>` : ""}</div>
  <div class="card"><div class="top"><b>Contas conectadas</b><button class="btn ghost sm" data-a="bkAtualiza"${bkPronto() && !BK.busy ? "" : " disabled"}>Atualizar</button></div>${BK.busy ? `<div class="hint">${esc(BK.busy)}</div><span class="skel"></span><span class="skel" style="width:70%"></span>` : ""}
    ${!BK.contas ? '<div class="empty" style="padding:10px 0">Nenhuma conta carregada.</div>' : !BK.contas.length ? '<div class="empty" style="padding:10px 0">Nenhuma conta conectada ainda.</div>' : `<ul class="rows" style="margin:6px 0 0">${BK.contas.map(a => a.erro ? `<li><span><b>${esc(a.instituicao || "Banco")}</b><small style="display:block;color:var(--bd)">${esc(a.erro)}</small></span><span><button class="btn ghost sm" data-a="bkDesc" data-id="${esc(a.conexao)}">Desconectar</button></span></li>` : `<li><span><b>${esc(a.instituicao || "Banco")}</b><small style="display:block;color:var(--mut)">${esc(a.nome)}${a.tipo === "CREDIT" ? " (cartão)" : ""}</small></span><span><b>${a.saldo == null ? "" : money(a.saldo)}</b>${a.tipo === "BANK" ? `<br><button class="btn ghost sm" data-a="bkDesc" data-id="${esc(a.conexao)}">Desconectar</button>` : ""}</span></li>`).join("")}</ul>`}</div>
  <div class="card"><b>Recebimentos dos últimos 30 dias</b>${!BK.rec ? '<div class="empty" style="padding:10px 0">Conecte uma conta para ver as entradas.</div>' : !BK.rec.length ? '<div class="empty" style="padding:10px 0">Nenhuma entrada no período.</div>' : `<ul class="rows" style="margin:6px 0 0">${BK.rec.slice(0, 40).map(r => { const lc = bkMatch(r); return `<li><span><b>${esc(r.descricao || "Entrada")}</b><small style="display:block;color:var(--mut)">${fdate(r.data)} · ${esc(r.instituicao || "")}</small>${lc ? `<small class="bk-m">Parece o pagamento de: ${esc(lc.objeto || lc.orgao)} <button class="btn ghost sm" data-a="bkBaixa" data-id="${lc.id}">Marcar como recebida</button></small>` : ""}</span><span><b class="ok">${money(r.valor)}</b></span></li>`; }).join("")}</ul>`}</div>
  <p class="hint">O app compara o valor e o nome do órgão com as licitações ganhas ou entregues. Confira sempre antes de marcar como recebida.</p>`;
}

/* ---------- logotipos oficiais enviados pelo usuário (ficam só neste aparelho) ---------- */
const LOGOS = {};
let LOGOS_OK = false;
const LOGO_LISTA = [["antecipagov", "AntecipaGov"], ["pncp", "PNCP"], ["comprasgov", "Compras.gov.br"], ["sicaf", "SICAF"], ["tesouro", "Tesouro Nacional"], ["obrasgov", "Obrasgov"], ["ibge", "IBGE"], ["receita", "Receita Federal"], ["pronampe", "Pronampe"], ["openfinance", "Open Finance Brasil"], ["pluggy", "Pluggy"], ["inter", "Inter Empresas"], ["bb", "Banco do Brasil"], ["itau", "Itaú"], ["bradesco", "Bradesco"], ["santander", "Santander"], ["sicoob", "Sicoob"], ["caixa", "Caixa Econômica Federal"], ["petronect", "Petronect (Petrobras)"], ["vale", "Vale"], ["suzano", "Suzano"], ["tetrapak", "Tetra Pak"], ["mercadoeletronico", "Mercado Eletrônico"], ["ariba", "SAP Business Network (Ariba)"], ["coupa", "Coupa Supplier Portal"], ["bionexo", "Bionexo"], ["brasilapi", "BrasilAPI"], ["focusnfe", "Focus NFe"]];
async function logosCarrega(){ for (const [s] of LOGO_LISTA){ try{ const v = await idb.get("logo:" + s); if (v) LOGOS[s] = v; }catch(e){} } if (Object.keys(LOGOS).length) render(); }
function logoLe(f){
  return new Promise((ok, no) => {
    if (!/^image\/(svg\+xml|png|jpeg|webp)$/.test(f.type)) return no({m:"Use um arquivo SVG, PNG, JPG ou WebP."});
    if (f.size > 400000) return no({m:"O arquivo é grande demais (máximo de 400 KB)."});
    const r = new FileReader();
    r.onerror = () => no({m:"Não foi possível ler o arquivo."});
    r.onload = () => {
      if (f.type === "image/svg+xml"){ const t = atob(String(r.result).split(",")[1] || ""); if (/<script|<foreignObject|\son[a-z]+\s*=|javascript:|<!ENTITY|<iframe/i.test(t)) return no({m:"Este SVG tem conteúdo ativo e foi recusado por segurança."}); return ok(r.result); }
      const im = new Image(); im.onerror = () => no({m:"Imagem inválida."});
      im.onload = () => { const k = Math.min(1, 256 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL("image/png")); };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  });
}
function viewLogos(m){
  m.innerHTML = `<h1>Logotipos das instituições</h1><p class="sub">Onde aparece o nome de uma instituição (AntecipaGov, PNCP, bancos e outras), o app mostra o nome com o logotipo. Envie aqui o logotipo oficial de cada uma. Até lá, aparece um selo com as iniciais.</p>
  <div class="card"><b>Como conseguir o logotipo oficial</b><ul class="bk-l"><li>Procure a página de <b>identidade visual</b>, <b>imprensa</b> ou <b>marca</b> no site oficial da instituição e baixe o arquivo (SVG é o melhor; PNG também serve).</li><li>Os logotipos são <b>marcas das próprias instituições</b>: siga as regras de uso de cada uma.</li><li>O arquivo enviado aqui fica <b>só neste aparelho</b>. Para valer para todos os usuários do site e do aplicativo, coloque o arquivo na pasta <code>img/parceiros</code> e publique de novo, ou use o comando <code>npm run logos</code> (veja o LEIA-PRIMEIRO).</li></ul></div>
  <div class="card"><ul class="rows" style="margin:0">${LOGO_LISTA.map(([s, n]) => `<li><span>${selo(n)}</span><span class="lg-a">${LOGOS[s] ? `<button class="btn ghost sm" data-a="logoDel" data-s="${s}">Remover</button>` : ""}<label class="btn ghost sm lg-up">${LOGOS[s] ? "Trocar" : "Enviar logotipo"}<input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" data-logo="${s}" aria-label="Enviar o logotipo de ${esc(n)}"></label></span></li>`).join("")}</ul></div>`;
}

/* ---------- instalar o aplicativo (navegador) ---------- */
let instEv = null;
try{ addEventListener("beforeinstallprompt", e => { e.preventDefault(); instEv = e; if (ui.tab === "hub") render(); }); addEventListener("appinstalled", () => { instEv = null; toast("Aplicativo instalado."); }); }catch(e){}
const emApp = () => { try{ return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }catch(e){ return false; } };
function instCard(){
  if (emApp() || S.cfg.instOcultar) return ""; const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); if (!instEv && !ios) return "";
  return `<div class="card inst"><div class="top"><b>Instale o aplicativo</b><button class="btn ghost sm" data-a="instNao" aria-label="Dispensar">Agora não</button></div><p class="sub" style="margin:4px 0 10px">Abre mais rápido, fica na tela inicial, funciona sem internet e avisa os prazos.</p>${instEv ? '<button class="btn" data-a="instala">Instalar agora</button>' : '<div class="hint">No iPhone: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</div>'}</div>`;
}
/* ---------- motor de oportunidades ---------- */
const MT = {alvo:"5000", vmin:"3000", vmax:"7000", nichos:[], palavras:"", uf:"", mods:[], init:false};
function viewMotor(m){
  const P = S.perfil; if (!MT.init){ MT.init = true; if (P.nichos.length || termos(P.palavras).length){ MT.nichos = P.nichos.slice(); MT.palavras = P.palavras; } if (n(P.vmin) > 0 || n(P.vmax) > 0){ MT.vmin = P.vmin; MT.vmax = P.vmax; } MT.uf = P.ufs.length === 1 ? P.ufs[0] : ""; MT.mods = P.mods.slice(); }
  const ch = (on, a, d, t) => `<button class="chip${on ? " on" : ""}" data-a="${a}" ${d} aria-pressed="${on}">${esc(t)}</button>`, al = perfilAlerta();
  m.innerHTML = `<h1>Motor de oportunidades</h1><p class="sub">Três respostas e o app procura no Brasil inteiro, avisa quando aparecer algo compatível e coloca na sua agenda.</p>
  <div class="card mt"><div class="mt-q"><i>1</i><b>Quanto você quer vender?</b></div><div class="chips" style="flex-wrap:wrap;margin:8px 0">${[1000, 3000, 5000, 10000, 25000, 50000].map(v => ch(+MT.alvo === v, "mtVal", `data-v="${v}"`, money(v).replace(",00", ""))).join("")}</div>
    <div class="fg"><div class="f half"><label for="mt_min">De (R$)</label><input id="mt_min" data-mt="vmin" inputmode="decimal" value="${esc(MT.vmin)}"></div><div class="f half"><label for="mt_max">Até (R$)</label><input id="mt_max" data-mt="vmax" inputmode="decimal" value="${esc(MT.vmax)}"></div></div></div>
  <div class="card mt"><div class="mt-q"><i>2</i><b>O que você vende?</b></div><div class="chips" style="flex-wrap:wrap;margin:8px 0">${allNichos().map(x => ch(MT.nichos.includes(x.n), "mtNicho", `data-v="${esc(x.n)}"`, x.n)).join("")}</div>
    <div class="f"><label for="mt_pal">Outros produtos (separe por vírgula)</label><input id="mt_pal" data-mt="palavras" autocomplete="off" placeholder="detergente, luva descartável" value="${esc(MT.palavras)}"></div></div>
  <div class="card mt"><div class="mt-q"><i>3</i><b>Onde?</b></div><div class="chips" style="flex-wrap:wrap;margin:8px 0">${ch(!MT.uf, "mtUf", 'data-v=""', "Brasil inteiro")}${ch(MT.uf === "SP", "mtUf", 'data-v="SP"', "São Paulo")}</div>
    <div class="f"><label for="mt_uf">Ou escolha um estado</label><select id="mt_uf" data-mt="uf"><option value="">Brasil inteiro</option>${UFS.map(([s, nm]) => `<option value="${s}"${MT.uf === s ? " selected" : ""}>${esc(nm)}</option>`).join("")}</select></div></div>
  <div class="card mt"><div class="mt-q"><i>4</i><b>Como você quer disputar?</b><span class="tag">opcional</span></div><div class="chips" style="flex-wrap:wrap;margin:8px 0 0">${MODS.filter(x => ["6", "8", "12", "4"].includes(x[0])).map(x => ch(MT.mods.includes(x[0]), "mtMod", `data-v="${x[0]}"`, x[1])).join("")}</div></div>
  <div class="actions"><button class="btn" data-a="mtGo">Encontrar e criar alerta</button></div>
  <p class="hint">Fonte: contratações públicas (PNCP). Oportunidades entre empresas privadas (B2B) não têm base pública, por isso não entram aqui.</p>
  ${al ? hubOpp() : ""}`;
}
/* ---------- participar do exterior ---------- */
const EXT_CHK = [
  ["cnpj", "Empresa com CNPJ ativo no Brasil", "A venda ao governo costuma ser feita por pessoa jurídica. Alguns editais aceitam pessoa física. Leia o edital."],
  ["govbr", "Conta gov.br com nível prata ou ouro", "Os portais de compras e o SICAF costumam exigir esse nível. Veja no gov.br como validar a identidade do exterior."],
  ["sicaf", "Cadastro no SICAF", "O cadastro reúne os documentos de habilitação. Confira o nível que o edital pede."],
  ["rep", "Representante no Brasil (procuração), se precisar", "Alguém de confiança pode assinar documentos e receber notificações quando você não puder."],
  ["cert", "Certificado digital, se o edital ou o portal exigir", "Alguns atos e a nota fiscal pedem certificado. Veja o que o seu caso pede."],
  ["banco", "Conta bancária no Brasil para receber em reais", "Os órgãos pagam em reais, por ordem bancária. Pergunte ao banco sobre conta para quem mora fora."],
  ["contab", "Contador no Brasil para tributos e declarações", "Impostos, DAS, notas fiscais e imposto sobre o que entra e sai do país mudam o seu caso."],
  ["log", "Quem entrega: fornecedor ou transportadora no Brasil", "O órgão recebe no endereço dele. Combine prazo, frete e nota fiscal antes de dar o lance."],
  ["fuso", "Alertas ligados e horário de Brasília conferido", "As sessões seguem o horário de Brasília. O app mostra o seu horário ao lado."]
];
function viewExterior(m){
  S.ext = S.ext || {chk:{}}; const now = Date.now(), ok = EXT_CHK.filter(c => S.ext.chk[c[0]]).length;
  m.innerHTML = `<h1>Participar do exterior</h1><p class="sub">Para brasileiros e naturalizados que moram fora e querem vender ao governo brasileiro.</p>
  <div class="card"><b>Horário</b><div class="ex-h"><div><small>Brasília agora</small><b id="exBr">${new Date(now).toLocaleTimeString("pt-BR", {timeZone:"America/Sao_Paulo", hour:"2-digit", minute:"2-digit"})}</b></div><div><small>${esc(cidadeTz() || "Seu horário")}</small><b id="exLoc">${new Date(now).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}</b></div></div><p class="hint" style="margin:0">${foraBR() ? "Os horários da agenda e dos lances aparecem em Brasília e no seu fuso." : "Seu aparelho está no fuso de Brasília. Se viajar, a agenda mostra os dois horários."}</p></div>
  <div class="card"><div class="top"><b>Lista de preparação</b><span class="tag ${ok === EXT_CHK.length ? "ok" : ""}">${ok} de ${EXT_CHK.length}</span></div><div class="mbar2"><i style="width:${Math.round(ok / EXT_CHK.length * 100)}%"></i></div>
    <ul class="rows" style="margin:8px 0 0">${EXT_CHK.map(([k, t, d]) => `<li><span><b>${esc(t)}</b><small style="display:block;color:var(--mut)">${esc(d)}</small></span><span><label class="sw"><input type="checkbox" data-ext="${k}"${S.ext.chk[k] ? " checked" : ""} aria-label="${esc(t)}"><i></i></label></span></li>`).join("")}</ul>
    <p class="hint">Isto é um roteiro de apoio, não orientação jurídica. As regras variam por órgão e por situação. <b>Confirme cada ponto com um contador ou advogado no Brasil.</b></p></div>
  <div class="card"><b>Quanto vale em outra moeda</b><p class="sub" style="margin:2px 0 8px">Digite a cotação do dia. O app não busca cotação sozinho.</p><div class="fg"><div class="f half"><label for="ex_brl">Valor em reais</label><input id="ex_brl" data-ex="brl" inputmode="decimal" value="5000"></div><div class="f half"><label for="ex_tx">1 unidade da moeda vale (R$)</label><input id="ex_tx" data-ex="tx" inputmode="decimal" placeholder="5,40"></div></div><div class="ex-r" id="exRes">Informe a cotação.</div></div>`;
}
function exCalc(){ const r = $("#exRes"); if (!r) return; const b = n($("#ex_brl").value), t = n($("#ex_tx").value); r.textContent = b > 0 && t > 0 ? (b / t).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2}) + " na outra moeda" : "Informe a cotação."; }

/* ---------- agenda de participações, funil e microinterações ---------- */
const TZ_LOCAL = (() => { try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }catch(e){ return ""; } })();
const dtBR = ts => new Date(ts).toLocaleString("pt-BR", {timeZone:"America/Sao_Paulo", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}).replace(",", "");
const dtLoc = ts => new Date(ts).toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}).replace(",", "");
const foraBR = () => !!TZ_LOCAL && TZ_LOCAL !== "America/Sao_Paulo" && new Date().toLocaleTimeString("pt-BR", {timeZone:"America/Sao_Paulo", hour:"2-digit", minute:"2-digit"}) !== new Date().toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
const cidadeTz = () => (TZ_LOCAL.split("/").pop() || "").replace(/_/g, " ");
const diaBR = ts => new Date(ts).toLocaleDateString("sv-SE", {timeZone:"America/Sao_Paulo"});
const fmtCdH = ms => { let s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), p = v => String(v).padStart(2, "0"); return (d ? d + "d " : "") + (h || d ? p(h) + ":" : "") + p(m) + ":" + `<i class="sd">${p(s % 60)}</i>`; };
function agEventos(){
  const o = [];
  S.lic.forEach(x => {
    if (!ATIVAS.includes(x.status)) return;
    const a = iniTs(x), f = fimTs(x), p = bsTs(x.propData, x.propHora || (x.propData ? "08:00" : ""));
    if (!isNaN(p) && PRE.includes(x.status)) o.push({k:"pr", ts:p, x, t:"Prazo da proposta"});
    if (!isNaN(a)) o.push({k:"ab", ts:a, x, t:"Começam os lances"});
    if (!isNaN(f)) o.push({k:"fim", ts:f, x, t:"Terminam os lances"});
  });
  return o.sort((a, b) => a.ts - b.ts);
}
function agCard(e, now){
  const x = e.x, p = lancePlano(x), alvo = n(x.eAlvo), modo = x.eModo || S.cfg.modoFinal || "manual", rem = e.ts - now;
  const cls = rem > 0 && rem <= 60000 ? " crit" : rem > 0 && rem <= 900000 ? " urg" : rem <= 0 ? " passou" : "";
  const fora = foraBR();
  return `<div class="ev${cls}" data-id="${x.id}">
    <div class="ev-h"><span class="ev-k ${e.k}">${e.t}</span><b class="ev-cd" data-cda="${e.ts}">${rem > 0 ? fmtCdH(rem) : "agora"}</b></div>
    <div class="ev-n">${esc(x.objeto || x.orgao || "Licitação")}</div>
    <div class="ev-m">${esc(x.orgao && x.objeto ? x.orgao + ". " : "")}${dtBR(e.ts)} em Brasília${fora ? `. ${dtLoc(e.ts)} no seu horário (${esc(cidadeTz())})` : ""}</div>
    <div class="ev-e"><span class="tag ${stCls(x.status)}">${esc(x.status)}</span>${x.tipo === "privada" ? '<span class="tag">Privada</span>' : ""}<span>Meta ${alvo > 0 ? money(alvo) : "não definida"}</span><span>Piso ${p.piso != null ? money(p.piso) : "—"}</span><span>Lance final: ${modo === "assistido" ? "automático assistido" : "manual"}</span></div>
    <div class="ev-a">${x.status === "Achada" || x.status === "Acompanhando" ? `<button class="btn ghost sm" data-a="stSet" data-id="${x.id}" data-v="Selecionada">Selecionar</button>` : ""}${PRE.includes(x.status) ? `<button class="btn ghost sm" data-a="stSet" data-id="${x.id}" data-v="Proposta enviada">Proposta enviada</button>` : ""}<button class="btn ghost sm" data-a="agLance">Painel de lances</button><button class="btn ghost sm" data-a="editLic" data-id="${x.id}">Estratégia</button><button class="btn ghost sm" data-a="icsUm" data-id="${x.id}">Calendário</button></div>
  </div>`;
}
const UI_BARS = {};
function barsHTML(key, vals, labs){
  const mx = Math.max(1, ...vals), prev = UI_BARS[key] || vals.map(() => 0);
  UI_BARS[key] = vals.slice();
  return `<div class="bars" data-bars="${key}" role="img" aria-label="Gráfico de barras">${vals.map((v, i) => `<div class="bc"><b>${v}</b><i style="--h:${Math.round(prev[i] / mx * 100)}%" data-h="${Math.round(v / mx * 100)}"></i><small>${esc(labs[i])}</small></div>`).join("")}</div>`;
}
function barrasAnima(raiz){ const els = (raiz || document).querySelectorAll(".bars i[data-h]"); if (!els.length) return; requestAnimationFrame(() => requestAnimationFrame(() => els.forEach(e => e.style.setProperty("--h", e.dataset.h + "%")))); }
function agendaHTML(){
  const now = Date.now(), ev = agEventos(), hoje = diaBR(now), dd = ts => Math.round((Date.parse(diaBR(ts)) - Date.parse(hoje)) / 864e5);
  const grp = {atr:[], hoje:[], amanha:[], sem:[], dep:[]};
  ev.forEach(e => { const d = dd(e.ts); (e.ts < now - 3600000 ? grp.atr : d <= 0 ? grp.hoje : d === 1 ? grp.amanha : d <= 7 ? grp.sem : grp.dep).push(e); });
  const aguard = S.lic.filter(x => x.status === "Proposta enviada"), sel = S.lic.filter(x => x.status === "Selecionada"), disp = S.lic.filter(x => x.status === "Em disputa");
  const dias = Array.from({length:7}, (_, i) => { const t = now + i * 864e5; return {k:diaBR(t), l:i === 0 ? "Hoje" : new Date(t).toLocaleDateString("pt-BR", {timeZone:"America/Sao_Paulo", weekday:"short"}).replace(".", "")}; });
  const vals = dias.map(d => ev.filter(e => diaBR(e.ts) === d.k).length);
  const bloco = (t, l) => l.length ? `<h2 class="ag-g">${t} <span>${l.length}</span></h2>${l.map(e => agCard(e, now)).join("")}` : "";
  const tem = ev.length;
  return `<div class="ag-kpi"><div><small>Hoje</small><b data-cu="${grp.hoje.length}">${grp.hoje.length}</b></div><div><small>Esta semana</small><b data-cu="${grp.amanha.length + grp.sem.length + grp.hoje.length}">${grp.amanha.length + grp.sem.length + grp.hoje.length}</b></div><div><small>Aguardando</small><b data-cu="${aguard.length + sel.length}">${aguard.length + sel.length}</b></div><div><small>Em disputa</small><b data-cu="${disp.length}">${disp.length}</b></div></div>
  <div class="card"><b>Próximos 7 dias</b><p class="sub" style="margin:2px 0 8px">Quantos eventos você tem em cada dia (prazos de proposta, início e fim dos lances).</p>${barsHTML("ag7", vals, dias.map(d => d.l))}</div>
  ${(aguard.length || sel.length) ? `<div class="card wait"><b>Aguardando</b><ul class="rows" style="margin:6px 0 0">${sel.map(x => `<li><span><b>${esc(x.objeto || x.orgao)}</b><small style="display:block;color:var(--mut)">Selecionada. Falta enviar a proposta${x.propData ? " até " + fdate(x.propData) + (x.propHora ? " " + x.propHora : "") : ""}.</small></span><span><button class="btn ghost sm" data-a="stSet" data-id="${x.id}" data-v="Proposta enviada">Enviei</button></span></li>`).join("")}${aguard.map(x => `<li><span><b>${esc(x.objeto || x.orgao)}</b><small style="display:block;color:var(--mut)">Proposta enviada. ${isNaN(iniTs(x)) ? "Informe quando começam os lances." : "Lances começam " + dtBR(iniTs(x)) + " (Brasília)."}</small></span><span class="tag wn">Aguardando</span></li>`).join("")}</ul></div>` : ""}
  ${tem ? bloco("Sem desfecho", grp.atr) + bloco("Hoje", grp.hoje) + bloco("Amanhã", grp.amanha) + bloco("Esta semana", grp.sem) + bloco("Mais adiante", grp.dep) : `<div class="card empty">Nenhuma participação com data. Toque em <b>Nova</b> ou salve uma oportunidade na busca e informe quando os lances começam e terminam. A agenda monta o resto e avisa.</div>`}
  ${tem ? `<div class="actions"><button class="btn ghost" data-a="icsTodos">Adicionar tudo ao calendário do celular</button></div>` : ""}`;
}
function funilHTML(){
  const cols = ST.map(s => ({s, l:S.lic.filter(x => x.status === s)}));
  return `<p class="sub">O caminho de cada licitação, de achada até recebida. Toque nas setas para avançar ou voltar uma etapa.</p><div class="kb">${cols.map(c => `<section class="kc"><h3>${c.s} <span>${c.l.length}</span></h3>${c.l.length ? c.l.map(x => `<div class="kcard"><b>${esc(x.objeto || x.orgao || "Licitação")}</b><small>${esc(x.orgao && x.objeto ? x.orgao : "")}${!isNaN(iniTs(x)) ? " · lances " + dtBR(iniTs(x)) : ""}</small><div class="kmv"><button data-a="stMove" data-id="${x.id}" data-d="-1" aria-label="Voltar etapa"${ST.indexOf(c.s) === 0 ? " disabled" : ""}>&#8249;</button><button class="ed" data-a="editLic" data-id="${x.id}">Abrir</button><button data-a="stMove" data-id="${x.id}" data-d="1" aria-label="Avançar etapa"${ST.indexOf(c.s) === ST.length - 1 ? " disabled" : ""}>&#8250;</button></div></div>`).join("") : '<div class="kempty">vazio</div>'}</section>`).join("")}</div>`;
}
function stMudou(x, antes){
  if (x.status === antes) return; save(); logEv("Licitação: " + antes + " para " + x.status, x.objeto || x.orgao || "");
  if (x.status === "Proposta enviada") confirmaCheck("Proposta registrada"); else if (x.status === "Ganha") confirmaCheck("Licitação ganha"); else vibra(8);
}
async function baixaTexto(nome, texto, mime){
  try{ if (DL && DL.save){ await DL.save({filename:nome, data:texto}); return; } }catch(e){}
  try{ const P = window.Capacitor && window.Capacitor.Plugins; if (P && P.Filesystem && P.Share){ await P.Filesystem.writeFile({path:nome, data:texto, directory:"CACHE", encoding:"utf8"}); const u = await P.Filesystem.getUri({path:nome, directory:"CACHE"}); await P.Share.share({title:nome, url:u.uri}); return; } }catch(e){}
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([texto], {type:mime})); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function icsDe(lista){
  const z = ts => new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""), t = s => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Licita Lance Certo//PT-BR//", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  lista.forEach(e => { const x = e.x, d = [x.orgao, x.numero ? "nº " + x.numero : "", x.eAlvo ? "Meta de lance: " + money(n(x.eAlvo)) : "", x.eNota || "", x.link || "", "Horários de Brasília. Confirme no portal."].filter(Boolean).join("\n");
    L.push("BEGIN:VEVENT", "UID:" + x.id + "-" + e.k + "@licitalancecerto", "DTSTAMP:" + z(Date.now()), "DTSTART:" + z(e.ts), "DTEND:" + z(e.ts + (e.k === "fim" ? 5 : 30) * 60000), "SUMMARY:" + t(e.t + ": " + (x.objeto || x.orgao || "Licitação")), "DESCRIPTION:" + t(d), "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:" + t(e.t), "END:VALARM", "BEGIN:VALARM", "TRIGGER:-PT5M", "ACTION:DISPLAY", "DESCRIPTION:" + t(e.t), "END:VALARM", "END:VEVENT"); });
  L.push("END:VCALENDAR"); return L.join("\r\n");
}
function confirmaCheck(msg){
  document.querySelectorAll(".okc").forEach(e => e.remove()); vibra(10);
  const d = document.createElement("div"); d.className = "okc"; d.setAttribute("role", "status"); d.innerHTML = `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-17"/></svg><span>${esc(msg)}</span>`; document.body.appendChild(d); setTimeout(() => d.remove(), semMov() ? 1800 : 1700);
}
function tweenNum(el, de, para, fmt, ms = 340){
  if (!el || semMov() || !isFinite(de) || !isFinite(para) || de === para){ if (el) el.textContent = fmt(para); return; }
  const t0 = performance.now(); const f = t => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(de + (para - de) * e); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f);
}
function tickAgenda(now){
  document.querySelectorAll("[data-cda]").forEach(el => { const rem = +el.dataset.cda - now; el.innerHTML = rem > 0 ? fmtCdH(rem) : "agora"; const c = el.closest(".ev"); if (c){ c.classList.toggle("crit", rem > 0 && rem <= 60000); c.classList.toggle("urg", rem > 60000 && rem <= 900000); c.classList.toggle("passou", rem <= 0); } });
}

/* ---------- interações e visual vivo ---------- */
const semMov = () => { try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; } };
const vibra = ms => { try{ if (navigator.vibrate && !semMov()) navigator.vibrate(ms); }catch(e){} };
const TEMA_ICON = {auto:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>', claro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>', escuro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>'};
function aplicaTema(){
  const t = (S.cfg && S.cfg.tema) || "auto", r = document.documentElement;
  if (t === "auto") r.removeAttribute("data-theme"); else r.dataset.theme = t === "claro" ? "light" : "dark";
  const escuro = t === "escuro" || (t === "auto" && (() => { try{ return matchMedia("(prefers-color-scheme: dark)").matches; }catch(e){ return false; } })());
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = escuro ? "#050B1A" : "#0C1F46";
  const b = $("#temaBtn"); if (b && b.dataset.t !== t){ b.dataset.t = t; b.innerHTML = TEMA_ICON[t] || TEMA_ICON.auto; b.setAttribute("aria-label", "Tema: " + t + ". Toque para mudar."); }
}
function contaAte(raiz){
  if (semMov()) return;
  (raiz || document).querySelectorAll("[data-cu]").forEach(el => { const alvo = +el.dataset.cu; if (!isFinite(alvo) || alvo <= 0) return; const t0 = performance.now(); el.textContent = "0";
    const f = t => { const p = Math.min(1, (t - t0) / 700); el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
}
function gaugeUpdate(m, meta){
  const g = $("#calcGauge"); if (!g) return; g.hidden = false;
  if (!g.dataset.ok){ g.dataset.ok = "1"; g.innerHTML = `<svg viewBox="0 0 220 128" role="img" aria-label="Medidor de margem"><g id="gzones"></g><g id="gneedle" class="needle"><line x1="110" y1="112" x2="34" y2="112"/><circle cx="110" cy="112" r="6"/></g></svg><div class="gl"><b id="gtxt"></b><span id="gsub"></span></div>`; }
  const cx = 110, cy = 112, R = 86, lo = -20, hi = Math.max(40, meta * 2.5), f = x => Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  const pt = fr => { const a = Math.PI * (1 - fr); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; }, arc = (a, b, cls) => { const [x0, y0] = pt(a), [x1, y1] = pt(b); return `<path class="gz ${cls}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`; };
  $("#gzones").innerHTML = arc(0, f(0), "bd") + arc(f(0), f(meta), "wn") + arc(f(meta), 1, "ok");
  const nd = $("#gneedle"); nd.style.transform = `rotate(${(f(m) * 180).toFixed(1)}deg)`;
  const st = m < 0 ? "bd" : m >= meta ? "ok" : "wn"; $("#gtxt").className = st; tweenNum($("#gtxt"), ui.twM == null ? m : ui.twM, m, v => v.toFixed(1).replace(".", ",") + "%"); ui.twM = m; $("#gsub").textContent = "margem, meta de " + String(meta).replace(".", ",") + "%";
}
function updateWhatIf(){
  const w = $("#calcWhatIf"), s = $("#wi"); if (!w || !s) return; const v = calcVals(); if (v.preco <= 0){ w.hidden = true; return; } w.hidden = false;
  const k = (+s.value) / 100, r = calc({...v, preco:v.preco * k}), d = Math.round((k - 1) * 100), st = r.lucro < 0 ? "bd" : r.margem * 100 >= v.margem ? "ok" : "wn";
  $("#wiOut").innerHTML = `<div><small>Lance</small><b>${money(v.preco * k)}</b><em>${d > 0 ? "+" : ""}${d}%</em></div><div><small>Lucro</small><b class="${st}">${money(r.lucro)}</b></div><div><small>Margem</small><b class="${st}">${pct(r.margem)}</b></div>`;
}
function celebra(){ confirmaCheck("Parabéns! Licitação ganha."); }
function fabInit(){
  if ($("#fab")) return; const d = document.createElement("div"); d.id = "fab"; d.className = "fab";
  const itens = [["fabLic", "Nova licitação"], ["fabCalc", "Calcular lance"], ["fabBusca", "Buscar licitações"], ["fabRadar", "Radar de produtos"]];
  d.innerHTML = `<div class="fab-menu" id="fabMenu" hidden>${itens.map(([a, t], i) => `<button data-a="${a}" style="--i:${i}">${t}</button>`).join("")}</div><button class="fab-b" id="fabB" data-a="fabAbre" aria-label="Ações rápidas" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>`;
  document.body.appendChild(d);
  document.addEventListener("click", e => { if (!e.target.closest("#fab")) fabFecha(); });
}
function fabFecha(){ const m = $("#fabMenu"), b = $("#fabB"); if (m) m.hidden = true; if (b){ b.setAttribute("aria-expanded", "false"); b.classList.remove("on"); } }

/* ---------- abertura animada ---------- */
function splash(){
  try{ if (semMov() || sessionStorage.getItem("lc:splash")) return; sessionStorage.setItem("lc:splash", "1"); }catch(e){ return; }
  const d = document.createElement("div"); d.id = "splash"; d.setAttribute("aria-hidden", "true");
  d.innerHTML = `<div class="sp-in">${LOGO(84, true)}<span class="wm wm-l wm-w"><small>LICITA</small><b>Lance Certo</b></span><p>A inteligência que transforma oportunidades públicas e privadas em negócios</p><div class="sp-bar"><i></i></div></div>`;
  document.body.appendChild(d); setTimeout(() => d.classList.add("out"), 1350); setTimeout(() => d.remove(), 1900);
}

/* ================= Planos e assinatura ================= */
const PLANOS = [
  {id:"gratis", nome:"Grátis", preco:"R$ 0", per:"para sempre", eq:"Para conhecer o app"},
  {id:"mensal", nome:"Mensal", preco:"R$ 277,90", per:"/mês", eq:"Sem fidelidade, cancele quando quiser"},
  {id:"semestral", nome:"Semestral", preco:"R$ 1.290,00", per:"/6 meses", eq:"R$ 215,00 por mês", eco:"Economize 23%"},
  {id:"anual", nome:"Anual", preco:"R$ 1.960,00", per:"/12 meses", eq:"R$ 163,33 por mês", eco:"Economize 41% · melhor valor", dest:true}
];
const PL_GRATIS = ["Calculadora de lance e margem", "Licitações e documentos com validade", "Busca de editais e portais do governo", "Regularidade do CNPJ e dados da empresa", "Segurança e ajuda"];
const PL_PAGO = ["Central B2G completa", "Propostas profissionais com o seu logo", "Jurídico com IA (recursos, impugnações, minutas)", "Assistente de editais com IA", "Motor de oportunidades, radar e alertas", "Busca de fornecedores com IA e comparação de preços", "Fornecedores, cotações, pedidos e fretes", "NF-e passo a passo", "Financial Hub e conexões bancárias", "Painel de lances e acompanhamento", "Backup na nuvem e suporte"];
const LIVRES = ["hub", "calc", "lic", "docs", "portais", "mais", "ajuda", "busca", "conta", "empresa", "modal", "res", "perfil", "regularidade", "central", "planos", "paywall", "logos", "seguranca"];
const LCX = () => window.LC_CONFIG || {};
const lic = () => { const l = S.licenca; return l && l.p && l.x && Date.parse(l.x + "T23:59:59Z") > Date.now() ? l : null; };
const plano = () => (LCX().demo && S.plano) || (lic() ? lic().p : "gratis");
async function licVerifica(cod){
  const k = LCX().licencaChave; if (!k || !k.x) throw new Error("sem chave");
  const [v, pl, sg] = String(cod).trim().split("."); if (v !== "LC1" || !pl || !sg) throw new Error("formato");
  const b = t => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("jwk", k, {name:"ECDSA", namedCurve:"P-256"}, false, ["verify"]);
  if (!await crypto.subtle.verify({name:"ECDSA", hash:"SHA-256"}, key, b(sg), b(pl))) throw new Error("assinatura");
  const d = JSON.parse(new TextDecoder().decode(b(pl)));
  if (!["mensal", "semestral", "anual"].includes(d.p) || !(Date.parse(d.x + "T23:59:59Z") > Date.now())) throw new Error("vencido");
  return d;
}
const bloqueado = t => plano() === "gratis" && !LIVRES.includes(t);
function viewPaywall(m){
  m.innerHTML = `<h1>Recurso dos planos pagos</h1><p class="sub">Esta ferramenta faz parte do plano mensal, semestral ou anual. O plano Grátis mostra o básico para você conhecer o app.</p><div class="card pc"><b>O que você libera ao assinar</b><div style="margin:6px 0">${PL_PAGO.map(x => `<div style="margin:5px 0">✓ ${x}</div>`).join("")}</div><button class="btn" data-a="tab" data-t="planos">Ver planos e preços</button></div>`;
}
function viewPlanos(m){
  const at = plano();
  m.innerHTML = `<h1>Planos e assinatura</h1><p class="sub">Comece grátis. Assine para liberar toda a central de gestão B2G. Seu plano atual: <b>${PLANOS.find(x => x.id === at).nome}</b>.</p>` +
  PLANOS.map(x => `<div class="card${x.dest ? " pc" : ""}"><div class="top"><b>${x.nome}</b>${x.eco ? `<span class="meta" style="margin:0">${x.eco}</span>` : ""}</div><div style="font-size:26px;font-weight:700;margin:4px 0">${x.preco} <span class="meta" style="margin:0;font-size:13px">${x.per}</span></div><div class="meta">${x.eq}</div><div style="margin:8px 0">${(x.id === "gratis" ? PL_GRATIS : ["Tudo do plano Grátis"].concat(PL_PAGO)).map(i => `<div style="margin:5px 0">✓ ${i}</div>`).join("")}</div>${x.id === at ? '<button class="btn ghost" disabled>Plano atual</button>' : x.id === "gratis" ? "" : `<button class="btn" data-mod="plAssinar" data-v="${x.id}">Assinar ${x.nome.toLowerCase()}</button>`}</div>`).join("") +
  `<div class="card"><b>Já tenho um código de ativação</b>${lic() ? `<p class="meta">Plano <b>${lic().p}</b> ativo até ${new Date(lic().x + "T12:00:00Z").toLocaleDateString("pt-BR")}.</p><button class="btn ghost sm" data-mod="plRemover">Remover código</button>` : `<p class="meta">Depois de assinar, você recebe um código. Cole aqui para liberar todas as ferramentas.</p><div class="f"><label for="plCod">Código de ativação</label><input id="plCod" autocomplete="off" placeholder="LC1..."></div><button class="btn" data-mod="plAtivar">Ativar</button>`}</div>` + (LCX().demo ? `<div class="card"><b>Modo demonstração</b><p class="meta">Para avaliar o app como assinante, sem pagar. Remova este bloco antes de vender.</p><div class="chips" style="flex-wrap:wrap;margin:6px 0 0;padding:0">${PLANOS.map(x => `<button class="btn ghost sm" data-mod="plDemo" data-v="${x.id}">Ver como ${x.nome}</button>`).join("")}</div></div>` : "");
}

/* ================= Central B2G, Propostas profissionais e Jurídico com IA ================= */
var MYLOGO, JUR = {msgs:[], busy:false};
const PR_TPL = {
  pregao:{nome:"Pregão eletrônico", titulo:"PROPOSTA COMERCIAL", prazoL:"Prazo de entrega", intro:"Em atendimento ao edital em referência, apresentamos nossa proposta para o fornecimento do objeto descrito abaixo.", decl:"Declaramos que nos preços propostos estão incluídos todos os custos e despesas (tributos, frete, seguros e demais encargos), que conhecemos e aceitamos as condições do edital e de seus anexos e que atendemos aos requisitos de habilitação."},
  dispensa:{nome:"Dispensa ou cotação direta", titulo:"PROPOSTA DE PREÇOS", prazoL:"Prazo de entrega", intro:"Em resposta à solicitação de cotação, apresentamos nossa proposta de preços para o objeto abaixo.", decl:"Declaramos que os preços incluem todos os custos de entrega e que mantemos as condições desta proposta pelo prazo de validade informado."},
  servico:{nome:"Serviços (técnica e comercial)", titulo:"PROPOSTA TÉCNICA E COMERCIAL", prazoL:"Prazo de execução", intro:"Apresentamos nossa proposta técnica e comercial para a execução dos serviços descritos abaixo, conforme o escopo e as condições informados.", decl:"Declaramos que a proposta contempla mão de obra, materiais, equipamentos, tributos e demais encargos necessários à execução, e que atenderemos às exigências técnicas e de habilitação do edital."}
};
const JUR_Q = ["Posso recorrer? Quais são os prazos?", "Como impugnar um edital?", "Fui desclassificado. O que posso fazer?", "Posso ser multado ou sancionado? Quais as penas?", "Como pedir reequilíbrio econômico-financeiro?"];
const JUR_T = ["Impugnação ao edital", "Pedido de esclarecimento", "Recurso administrativo", "Contrarrazões de recurso", "Pedido de reequilíbrio econômico-financeiro"];
const JUR_SYS = () => `Você é um assistente jurídico para fornecedores de licitações e contratos públicos no Brasil. Base: Lei 14.133/2021, Lei 8.666/1993 (contratos antigos), LC 123/2006 e jurisprudência do TCU. Responda em português simples. Cite artigos só quando tiver certeza e diga quando não tiver. Informe prazos e lembre que é preciso conferir o edital e consultar um advogado. Nunca invente artigo, súmula ou acórdão. Não ajude em fraude, conluio ou qualquer prática ilegal. Empresa do usuário: ${empLine()}.`;
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^#{1,4} (.+)$/gm, "<b>$1</b>").replace(/^[-*] /gm, "• ").replace(/\n/g, "<br>");
const prP = () => (S.prop = S.prop || {tpl:"pregao", orgao:"", proc:"", objeto:"", validade:"60", prazo:"", pgto:"30 dias após o recebimento definitivo", garantia:"", banco:"", resp:"", cargo:"", obs:"", itens:[{d:"", u:"un", q:"1", v:""}]});

function viewCentral(m){
  const L = a => Array.isArray(a) ? a.length : 0, nf = (S.nfe || {}).notas;
  const E = [["1", "Encontrar oportunidades", "Perfil de vendas, motor de oportunidades e radar de produtos.", [["perfil", "Perfil"], ["motor", "Motor"], ["radar", "Radar"]], L(S.radar) + " no radar"],
    ["2", "Documentação", "Certidões com validade e regularidade do CNPJ.", [["docs", "Documentos"], ["regularidade", "Regularidade"]], L(S.docs) + " documentos"],
    ["3", "Proposta", "Modelos profissionais com o logo da sua empresa.", [["prop", "Propostas"], ["calc", "Calculadora"]], L(S.propostas) + " salvas"],
    ["4", "Jurídico com IA", "Recursos, impugnações e dúvidas sobre o edital ou o contrato.", [["juridico", "Jurídico"], ["editais", "Editais"]], ""],
    ["5", "Fornecedores e cotações", "Cadastre fornecedores e compare preços.", [["achaforn", "Buscar com IA"], ["forn", "Fornecedores"], ["cot", "Cotações"]], L(S.forn) + " fornecedores"],
    ["6", "Pedido e NF-e", "Acompanhe pedidos e fretes e emita a nota fiscal.", [["pedidos", "Pedidos"], ["nfe", "NF-e"], ["fretes", "Fretes"]], L(nf) + " notas"],
    ["7", "Financeiro", "Antecipação, capital de giro, contas e recebimentos.", [["fin", "Financial Hub"], ["bancos", "Bancos"], ["orcamento", "Orçamento"]], L((S.fin || {}).prop) + " pedidos de crédito"]];
  const API = [["AntecipaGov", "Antecipação de recebíveis de fornecedores do governo federal"], ["PNCP", "Portal Nacional de Contratações Públicas"], ["Compras.gov.br", "Compras do governo federal"], ["SICAF", "Cadastro unificado de fornecedores"], ["Receita Federal", "CNPJ e regularidade"], ["Open Finance Brasil", "Dados financeiros com consentimento"], ["Pluggy", "Conexão bancária"]];
  m.innerHTML = `<h1>Central B2G</h1><p class="sub">Da oportunidade ao dinheiro na conta, em um só lugar.</p>` +
    E.map(e => `<div class="card"><div class="top"><b>${e[0]}. ${e[1]}</b></div><div class="meta">${e[2]}${e[4] ? " · <b>" + e[4] + "</b>" : ""}</div><div class="chips" style="flex-wrap:wrap;margin:6px 0 0;padding:0">${e[3].map(([k, t]) => `<button class="btn ghost sm" data-a="tab" data-t="${k}">${t}</button>`).join("")}</div></div>`).join("") +
    `<div class="card"><b>Integrações e fontes oficiais</b>${API.map(([a, d]) => `<div style="margin:10px 0">${selo(a)}<div class="meta" style="margin:3px 0 0">${esc(d)}</div></div>`).join("")}<button class="btn ghost sm" data-a="tab" data-t="logos">Enviar os logotipos oficiais</button></div>`;
}

function prDoc(){
  const p = prP(), e = S.empresa, T = PR_TPL[p.tpl] || PR_TPL.pregao, it = p.itens.filter(i => i.d), tot = it.reduce((a, i) => a + n(i.q) * n(i.v), 0);
  const end = e.end || [e.logradouro, e.numero, e.bairro].filter(Boolean).join(", ");
  return `<div id="propDoc" class="pdoc"><div class="ph">${MYLOGO ? `<img class="plogo" src="${esc(MYLOGO)}" alt="Logo">` : ""}<div><b>${esc(e.razao || "Nome da empresa")}</b>${e.fantasia ? " (" + esc(e.fantasia) + ")" : ""}<br>CNPJ ${esc(e.cnpj || "—")}${e.ie ? " · IE " + esc(e.ie) : ""}<br>${esc([end, e.cidade && e.uf ? e.cidade + "/" + e.uf : ""].filter(Boolean).join(" · "))}<br>${esc([e.tel, e.email].filter(Boolean).join(" · "))}</div></div>
  <h2>${T.titulo}</h2><p><b>Ao</b> ${esc(p.orgao || "Órgão ou entidade")}<br><b>Processo ou edital:</b> ${esc(p.proc || "—")}<br><b>Objeto:</b> ${esc(p.objeto || "—")}</p><p>${T.intro}</p>
  <table class="pt"><tr><th>Item</th><th>Descrição</th><th>Un.</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr>${it.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.d)}</td><td>${esc(i.u)}</td><td>${esc(i.q)}</td><td>${money(n(i.v))}</td><td>${money(n(i.q) * n(i.v))}</td></tr>`).join("") || '<tr><td colspan="6">Adicione os itens.</td></tr>'}<tr><td colspan="5"><b>Valor total da proposta</b></td><td><b>${money(tot)}</b></td></tr></table>
  <p><b>Validade da proposta:</b> ${esc(p.validade || "60")} dias.<br><b>${T.prazoL}:</b> ${esc(p.prazo || "conforme o edital")}<br><b>Condições de pagamento:</b> ${esc(p.pgto)}${p.garantia ? "<br><b>Garantia:</b> " + esc(p.garantia) : ""}${p.banco ? "<br><b>Dados bancários:</b> " + esc(p.banco) : ""}</p>${p.obs ? `<p>${esc(p.obs).replace(/\n/g, "<br>")}</p>` : ""}<p>${T.decl}</p>
  <p>${esc(e.cidade || "Local")}, ${new Date().toLocaleDateString("pt-BR", {day:"numeric", month:"long", year:"numeric"})}.<br><br>______________________________<br>${esc(p.resp || "Responsável")}${p.cargo ? " — " + esc(p.cargo) : ""}<br>${esc(e.razao || "")}</p></div>`;
}
const prDraw = () => { const x = $("#propPrev"); if (x) x.innerHTML = prDoc(); };
function viewProp(m){
  const p = prP(), F = (k, l, ph = "") => `<div class="f"><label for="pr_${k}">${l}</label><input id="pr_${k}" data-pr="${k}" autocomplete="off" placeholder="${ph}" value="${esc(p[k])}"></div>`;
  if (MYLOGO === undefined){ MYLOGO = null; idb.get("logo:minha").then(v => { if (v){ MYLOGO = v; render(); } }).catch(() => {}); }
  m.innerHTML = `<h1>Propostas profissionais</h1><p class="sub">Escolha o modelo, preencha e imprima ou salve em PDF. Os dados da empresa vêm de Mais, Dados da empresa. Revise o texto conforme o edital.</p>
  <div class="card"><b>Modelo</b><div class="chips" style="flex-wrap:wrap;margin:6px 0 0;padding:0">${Object.entries(PR_TPL).map(([k, t]) => `<button class="btn ${p.tpl === k ? "" : "ghost "}sm" data-mod="prTpl" data-v="${k}">${t.nome}</button>`).join("")}</div></div>
  <div class="card"><b>Logo da sua empresa</b><p class="meta">PNG, JPG, WebP ou SVG, até 400 KB. Fica só neste aparelho.</p><div class="f"><label for="pr_logo">Escolher arquivo</label><input id="pr_logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-mod="prLogo"></div>${MYLOGO ? '<button class="btn ghost sm" data-mod="prLogoDel">Remover logo</button>' : ""}</div>
  <div class="card"><div class="fg">${F("orgao", "Órgão ou entidade")}${F("proc", "Processo ou edital", "Pregão 00/0000")}${F("objeto", "Objeto")}${F("validade", "Validade (dias)")}${F("prazo", "Prazo de entrega ou execução")}${F("pgto", "Condições de pagamento")}${F("garantia", "Garantia (opcional)")}${F("banco", "Dados bancários (opcional)")}${F("resp", "Responsável pela assinatura")}${F("cargo", "Cargo")}</div>
  <div class="f"><label for="pr_obs">Observações ou escopo (opcional)</label><textarea id="pr_obs" rows="3" data-pr="obs">${esc(p.obs)}</textarea></div></div>
  <div class="card"><b>Itens</b>${p.itens.map((i, k) => `<div class="fg" style="margin-top:8px"><div class="f"><label>Descrição</label><input data-pi="${k}.d" value="${esc(i.d)}"></div><div class="f half"><label>Unidade</label><input data-pi="${k}.u" value="${esc(i.u)}"></div><div class="f half"><label>Quantidade</label><input data-pi="${k}.q" inputmode="decimal" value="${esc(i.q)}"></div><div class="f half"><label>Valor unitário</label><input data-pi="${k}.v" inputmode="decimal" value="${esc(i.v)}"></div><button class="btn ghost sm" data-mod="prDel" data-i="${k}">Remover item</button></div>`).join("")}<p><button class="btn ghost sm" data-mod="prAdd">+ Adicionar item</button></p></div>
  <div class="card"><b>Pré-visualização</b><div id="propPrev" style="margin-top:8px;overflow-x:auto">${prDoc()}</div><p style="margin-top:10px"><button class="btn" data-mod="prPrint">Imprimir ou salvar PDF</button> <button class="btn ghost" data-mod="prCopy">Copiar texto</button> <button class="btn ghost" data-mod="prSave">Salvar modelo</button></p></div>
  ${(S.propostas || []).length ? `<div class="card"><b>Propostas salvas</b><ul class="rows">${S.propostas.map((x, k) => `<li><span>${esc(x.t)}</span><span><button class="btn ghost sm" data-mod="prOpen" data-i="${k}">Abrir</button> <button class="btn ghost sm" data-mod="prRm" data-i="${k}">Excluir</button></span></li>`).join("")}</ul></div>` : ""}`;
}

const jurDraw = () => { const c = $("#jurChat"); if (c) c.innerHTML = JUR.msgs.map(x => `<div class="card"><b>${x.role === "user" ? "Você" : "Assistente jurídico"}</b><div style="margin-top:4px">${md(x.content) || (JUR.busy ? "Pensando…" : "")}</div></div>`).join(""); };
async function jurEnvia(txt){
  if (!txt.trim() || JUR.busy) return; if (!can("ia.usar")){ toast("Seu papel não permite usar a IA."); return; }
  JUR.msgs.push({role:"user", content:txt}); const r = {role:"assistant", content:""}; JUR.msgs.push(r); JUR.busy = true; jurDraw();
  try{ const turns = JUR.msgs.slice(0, -1).slice(-9).map(x => ({role:x.role, content:x.content})); r.content = await askAI(turns, {system:JUR_SYS(), maxTokens:4096, onText:t => { r.content = t; jurDraw(); }}); }
  catch(e){ JUR.msgs.splice(-2, 2); const m = aiErr(e); if (m) toast(m); const i = $("#jurQ"); if (i && !i.value) i.value = txt; }
  JUR.busy = false; jurDraw();
}
function viewJuridico(m){
  const ok = can("ia.usar"), modo = aiModo();
  m.innerHTML = `<h1>Jurídico com IA</h1><p class="sub">Dúvidas sobre edital, recursos, impugnações e contratos, com base na Lei 14.133/2021. É uma orientação geral e não substitui um advogado. Não cole dados sensíveis de terceiros.</p>` +
  (!ok ? '<div class="card pc"><b>Seu papel não libera a IA.</b></div>' : modo === "nenhum" ? '<div class="card pc"><b>Falta conectar a IA</b><p>Abra Editais e assistente e configure a conexão.</p><button class="btn ghost sm" data-a="tab" data-t="editais">Configurar</button></div>' : "") +
  `<div class="card"><b>Perguntas rápidas</b><div class="chips" style="flex-wrap:wrap;margin:6px 0 0;padding:0">${JUR_Q.map((x, i) => `<button class="btn ghost sm" data-mod="jurQ" data-i="${i}">${esc(x)}</button>`).join("")}</div></div><div id="jurChat"></div>
  <div class="card"><div class="f"><label for="jurQ">Sua pergunta, ou o trecho do edital ou contrato</label><textarea id="jurQ" rows="4"></textarea></div><button class="btn" data-mod="jurSend">Perguntar</button> <button class="btn ghost" data-mod="jurCopy">Copiar última resposta</button></div>
  <div class="card"><b>Gerar minuta</b><div class="f"><label for="jurT">Tipo</label><select id="jurT">${JUR_T.map(x => `<option>${x}</option>`).join("")}</select></div><div class="f"><label for="jurF">Fatos e pedido (órgão, processo, o que aconteceu)</label><textarea id="jurF" rows="4"></textarea></div><button class="btn" data-mod="jurMin">Gerar minuta</button><p class="meta">Revise tudo, confira prazos e dados e, se possível, valide com um advogado antes de protocolar.</p></div>`;
  jurDraw();
}

(function(){
  const css = document.createElement("style");
  css.textContent = ".pdoc{background:#fff;color:#111;padding:18px;border-radius:8px;font:14px/1.5 Georgia,serif}.pdoc h2{text-align:center;font-size:16px}.pdoc .ph{display:flex;gap:12px;align-items:center;border-bottom:2px solid #0E2150;padding-bottom:8px}.pdoc .plogo{max-height:56px;max-width:140px}.pt{width:100%;border-collapse:collapse;font-size:12px}.pt td,.pt th{border:1px solid #999;padding:4px;text-align:left}@media print{body *{visibility:hidden!important}#propDoc,#propDoc *{visibility:visible!important}#propDoc{position:absolute;left:0;top:0;width:100%;padding:0}}";
  document.head.appendChild(css);
  document.addEventListener("input", ev => { const t = ev.target, d = t && t.dataset; if (!d) return;
    if (d.pr){ prP()[d.pr] = t.value; prDraw(); save(); }
    else if (d.pi){ const [i, k] = d.pi.split("."); if (prP().itens[+i]){ prP().itens[+i][k] = t.value; prDraw(); save(); } } });
  document.addEventListener("change", async ev => { const t = ev.target; if (!t.dataset || t.dataset.mod !== "prLogo" || !t.files || !t.files[0]) return;
    try{ const v = await logoLe(t.files[0]); await idb.put("logo:minha", v); MYLOGO = v; render(); toast("Logo salvo."); }catch(e){ toast((e && e.m) || "Não foi possível salvar o logo."); } });
  document.addEventListener("click", async ev => { const t = ev.target.closest && ev.target.closest("[data-mod]"); if (!t || t.type === "file") return; const a = t.dataset.mod, i = +t.dataset.i, p = prP();
    if (a === "plAssinar"){ const u = ((LCX().checkout || {})[t.dataset.v] || ""); if (u) window.open(u, "_blank", "noopener"); else toast("O link de pagamento deste plano ainda não foi configurado."); }
    else if (a === "plAtivar"){ const v = (($("#plCod") || {}).value || "").trim(); if (!v) return; try{ const d = await licVerifica(v); S.licenca = {p:d.p, x:d.x, e:d.e, c:v}; save(); render(); toast("Plano " + d.p + " ativado."); }catch(e){ toast(e.message === "sem chave" ? "A ativação ainda não foi configurada neste site." : "Código inválido ou vencido."); } }
    else if (a === "plRemover"){ S.licenca = null; save(); render(); }
    else if (a === "plDemo" && LCX().demo){ S.plano = t.dataset.v; save(); render(); toast("Plano: " + t.dataset.v); }
    else if (a === "prTpl"){ p.tpl = t.dataset.v; save(); render(); }
    else if (a === "prAdd"){ p.itens.push({d:"", u:"un", q:"1", v:""}); save(); render(); }
    else if (a === "prDel"){ p.itens.splice(i, 1); if (!p.itens.length) p.itens.push({d:"", u:"un", q:"1", v:""}); save(); render(); }
    else if (a === "prLogoDel"){ MYLOGO = null; try{ await idb.del("logo:minha"); }catch(e){} render(); }
    else if (a === "prPrint") window.print();
    else if (a === "prCopy") copia(($("#propDoc") || {}).innerText || "", "Texto copiado.");
    else if (a === "prSave"){ S.propostas = S.propostas || []; S.propostas.unshift({t:(p.orgao || "Sem órgão") + " · " + (p.proc || "sem processo") + " · " + new Date().toLocaleDateString("pt-BR"), d:JSON.stringify(p)}); S.propostas = S.propostas.slice(0, 30); save(); toast("Proposta salva."); render(); }
    else if (a === "prOpen"){ try{ S.prop = JSON.parse(S.propostas[i].d); save(); render(); window.scrollTo(0, 0); }catch(e){ toast("Não consegui abrir."); } }
    else if (a === "prRm"){ S.propostas.splice(i, 1); save(); render(); }
    else if (a === "jurQ") jurEnvia(JUR_Q[i]);
    else if (a === "jurSend"){ const x = $("#jurQ"); if (x){ const v = x.value; x.value = ""; jurEnvia(v); } }
    else if (a === "jurCopy"){ const l = [...JUR.msgs].reverse().find(x => x.role === "assistant" && x.content); if (l) copia(l.content, "Resposta copiada."); }
    else if (a === "jurMin"){ const f = ($("#jurF") || {}).value || "", ty = ($("#jurT") || {}).value || ""; if (!f.trim()){ toast("Descreva os fatos e o pedido."); return; } jurEnvia(`Redija uma minuta de "${ty}" em nome da minha empresa, para licitação ou contrato público no Brasil, com endereçamento, qualificação, fatos, fundamentos jurídicos, pedidos e fecho. Marque entre colchetes o que eu precisar preencher. Fatos: ${f}`); }
  });
})();
/* Reconfere a assinatura do código de ativação ao abrir o app (editar o armazenamento do aparelho não libera planos). */
(async () => { const l = S.licenca; if (!l) return; try { if (!l.c) throw new Error("formato"); const d = await licVerifica(l.c); S.licenca = {p:d.p, x:d.x, e:d.e, c:l.c, o:l.o}; } catch (e) { if (/assinatura|vencido|formato/.test(String((e && e.message) || ""))) S.licenca = null; else return; } save(); })();

/* ================= Buscar fornecedores com IA e comparar preços ================= */
var AF = {busy:false};
const afP = () => (S.af = S.af || {spec:"", qtd:"1", lance:"", uf:"", web:true, res:null, linhas:[]});
const AF_SYS = "Você ajuda empresas que vendem ao governo brasileiro a encontrar fornecedores. Responda SOMENTE com um objeto JSON válido, sem texto antes nem depois. Nunca invente nomes de empresas, sites, telefones, e-mails nem preços.";
const afPrompt = (a, web) => `Especificação do produto (copiada do edital):
"""${a.spec.slice(0, 6000)}"""
Quantidade: ${a.qtd || "não informada"}. Entrega em: ${a.uf || "não informado"}. Preço alvo de venda (lance) por unidade: ${a.lance ? "R$ " + a.lance : "não informado"}.

Devolva este JSON:
{"produto":"nome curto e padronizado","especificacoes":["característica: valor"],"termos_busca":["3 a 5 termos de busca em português, do mais específico ao mais amplo"],"tipos_fornecedor":["fabricante, distribuidor, atacadista..."],"exigencias":["normas, registros e certificações a conferir, como INMETRO, ANVISA ou ABNT, quando a especificação ou o produto exigir"],"perguntas":["perguntas para fazer ao fornecedor"],"mensagem":"mensagem pronta de pedido de cotação, educada e objetiva, com [campos] para preencher","fornecedores":[{"nome":"","site":"","o_que_vende":"","preco":null,"fonte":"","obs":""}]}
${web ? "Use a busca na web para achar até 6 fornecedores ou lojas brasileiras que vendem o produto. Em 'fornecedores' coloque só o que apareceu nos resultados: 'preco' em reais por unidade (número) ou null se não achou, e 'fonte' com o endereço da página. Se não achou nada confiável, devolva []." : "Você não tem acesso à internet agora: deixe 'fornecedores' como []."}`;
const afUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const afLista = a => (Array.isArray(a) ? a : []).map(x => String(x).slice(0, 400)).filter(Boolean).slice(0, 12);
const afLinks = t => [["Google", "https://www.google.com/search?q=" + encodeURIComponent(t)], ["Google Shopping", "https://www.google.com/search?tbm=shop&q=" + encodeURIComponent(t)], ["Mercado Livre", "https://lista.mercadolivre.com.br/" + encodeURIComponent(t.trim().replace(/\s+/g, "-"))], ["Amazon", "https://www.amazon.com.br/s?k=" + encodeURIComponent(t)], ["Shopee", "https://shopee.com.br/search?keyword=" + encodeURIComponent(t)], ["Compras públicas (PNCP)", "https://pncp.gov.br/app/editais?q=" + encodeURIComponent(t)]].map(([l, u]) => `<a class="btn ghost sm" href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join(" ");
const afPct = v => v.toFixed(1).replace(".", ",") + "%";
function afCalc(){
  const a = afP(), q = n(a.qtd) || 1, L = n(a.lance);
  const r = a.linhas.map((l, i) => { const p = n(l.preco), tot = p > 0 ? p * q + n(l.frete) : 0; return {i, l, tot, un:p > 0 ? tot / q : 0, ok:l.ok !== false && p > 0}; });
  const v = r.filter(x => x.ok).sort((x, y) => x.tot - y.tot);
  return {q, L, v, fora:r.filter(x => !x.ok), best:v.length ? v[0].tot : 0, worst:v.length ? v[v.length - 1].tot : 0};
}
function afSumHTML(){
  const c = afCalc(); if (!afP().linhas.length) return '<p class="meta">Adicione os fornecedores e os preços para comparar.</p>';
  if (!c.v.length) return '<p class="meta">Preencha o preço unitário de pelo menos um fornecedor que atenda à especificação.</p>';
  const lin = (x, k) => `<tr><td>${k === 0 ? "🏆 " : ""}${esc(x.l.nome || "Fornecedor " + (x.i + 1))}</td><td>${money(x.tot)}</td><td>${money(x.un)}</td><td>${x.tot === c.best ? "melhor" : "+" + afPct((x.tot / c.best - 1) * 100)}</td>${c.L > 0 ? `<td style="${x.un > c.L ? "color:#c0392b;font-weight:700" : ""}">${afPct((c.L - x.un) / c.L * 100)}</td>` : ""}</tr>`;
  return `<div style="overflow-x:auto"><table class="pt" style="width:100%;font-size:13px"><tr><th>Fornecedor</th><th>Total (${c.q} un.)</th><th>Custo por unidade</th><th>Diferença</th>${c.L > 0 ? "<th>Margem no lance</th>" : ""}</tr>${c.v.map(lin).join("")}</table></div><p class="meta">O total inclui o frete. ${c.v.length > 1 ? "Diferença entre o melhor e o pior preço: <b>" + money(c.worst - c.best) + "</b>. " : ""}${c.L > 0 && c.v.some(x => x.un > c.L) ? "Em vermelho: o custo passa do seu lance." : ""}${c.fora.length ? " Fora da comparação (sem preço ou não atende): " + c.fora.map(x => esc(x.l.nome || "Fornecedor " + (x.i + 1))).join(", ") + "." : ""}</p>`;
}
const afSum = () => { const x = $("#afSum"); if (x) x.innerHTML = afSumHTML(); };
const afSt = m => { const x = $("#afSt"); if (x) x.textContent = m; };
function afRes(r){
  if (!r) return "";
  if (r.raw) return `<div class="card"><b>Resposta da IA</b><p class="meta">Não consegui organizar em tópicos. Segue o texto:</p><div>${md(r.raw)}</div></div>`;
  const L = (t, a) => a.length ? `<div class="card"><b>${t}</b><div style="margin-top:4px">${a.map(x => "• " + esc(x)).join("<br>")}</div></div>` : "";
  const msg = r.mensagem || "";
  return `<div class="card"><b>${esc(r.produto || "Produto")}</b>${r.especificacoes.length ? `<div style="margin-top:4px">${r.especificacoes.map(x => "• " + esc(x)).join("<br>")}</div>` : ""}</div>
  <div class="card"><b>Onde procurar</b><p class="meta">Abra a busca de cada termo. A IA não substitui a conferência dos preços nos sites.</p>${r.termos.map(t => `<div style="margin:8px 0"><div>${esc(t)}</div><div class="chips" style="flex-wrap:wrap;margin:4px 0 0;padding:0">${afLinks(t)}</div></div>`).join("")}</div>
  ${L("Tipos de fornecedor", r.tipos)}${L("Exigências para conferir", r.exig)}${L("Perguntas para o fornecedor", r.perg)}
  ${msg ? `<div class="card"><b>Mensagem de cotação</b><div style="margin:6px 0;white-space:pre-wrap">${esc(msg)}</div><button class="btn ghost sm" data-afa="copia">Copiar</button> <a class="btn ghost sm" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Enviar por WhatsApp</a> <a class="btn ghost sm" href="mailto:?subject=${encodeURIComponent("Pedido de cotação: " + (r.produto || ""))}&body=${encodeURIComponent(msg)}">Enviar por e-mail</a></div>` : ""}`;
}
function viewAchaForn(m){
  const a = afP(), modo = aiModo(), webOk = modo === "proxy" || modo === "chave";
  m.innerHTML = `<h1>Buscar fornecedores com IA</h1><p class="sub">Cole a especificação do produto. A IA organiza a busca, escreve o pedido de cotação e, se a pesquisa na web estiver ligada, traz fornecedores com preço. Você compara e decide.</p>
  ${modo === "nenhum" ? '<div class="card pc"><b>Falta conectar a IA</b><p>Abra Editais e assistente e configure a conexão.</p><button class="btn ghost sm" data-a="tab" data-t="editais">Configurar</button></div>' : ""}
  <div class="card"><div class="f"><label for="af_spec">Especificação do produto</label><textarea id="af_spec" rows="6" data-af="spec" placeholder="Cole aqui a descrição do item do edital">${esc(a.spec)}</textarea></div>
  <div class="fg"><div class="f half"><label for="af_qtd">Quantidade</label><input id="af_qtd" data-af="qtd" inputmode="decimal" value="${esc(a.qtd)}"></div><div class="f half"><label for="af_lance">Seu lance por unidade (opcional)</label><input id="af_lance" data-af="lance" inputmode="decimal" value="${esc(a.lance)}"></div><div class="f"><label for="af_uf">Cidade ou UF de entrega (opcional)</label><input id="af_uf" data-af="uf" value="${esc(a.uf)}"></div></div>
  ${webOk ? `<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-af="web" ${a.web ? "checked" : ""}> Pesquisar na web (a IA busca fornecedores e preços)</label>` : '<p class="meta">Neste modo de IA não há pesquisa na web: ela organiza a busca e você coleta as cotações.</p>'}
  <button class="btn" data-afa="analisa">Buscar com IA</button> <button class="btn ghost" data-afa="limpa">Limpar</button><p class="meta" id="afSt"></p></div>
  ${afRes(a.res)}
  <div class="card"><b>Comparar preços</b>${a.res && a.res.web ? '<p class="meta">Preços e endereços trazidos pela pesquisa na web. Confirme com o fornecedor antes de decidir.</p>' : ""}${a.linhas.map((l, i) => `<div class="card" style="margin:8px 0"><div class="fg"><div class="f"><label>Fornecedor</label><input data-afi="${i}.nome" value="${esc(l.nome)}"></div><div class="f half"><label>Preço unitário</label><input data-afi="${i}.preco" inputmode="decimal" value="${esc(l.preco)}"></div><div class="f half"><label>Frete total</label><input data-afi="${i}.frete" inputmode="decimal" value="${esc(l.frete)}"></div><div class="f half"><label>Prazo (dias)</label><input data-afi="${i}.prazo" inputmode="numeric" value="${esc(l.prazo)}"></div><div class="f half"><label>Pagamento</label><input data-afi="${i}.pgto" value="${esc(l.pgto)}"></div></div><label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" data-afi="${i}.ok" ${l.ok !== false ? "checked" : ""}> Atende à especificação</label>${l.obs ? `<div class="meta">${esc(l.obs)}</div>` : ""}<div class="chips" style="flex-wrap:wrap;margin:6px 0 0;padding:0">${afUrl(l.fonte || l.site) ? `<a class="btn ghost sm" href="${esc(afUrl(l.fonte || l.site))}" target="_blank" rel="noopener">Abrir página</a>` : ""}<button class="btn ghost sm" data-afa="forn" data-i="${i}">Salvar fornecedor</button><button class="btn ghost sm" data-afa="cot" data-i="${i}">Criar cotação</button><button class="btn ghost sm" data-afa="del" data-i="${i}">Remover</button></div></div>`).join("")}<p><button class="btn ghost sm" data-afa="add">+ Adicionar fornecedor</button></p><div id="afSum">${afSumHTML()}</div></div>`;
}
async function afAnalisa(){
  const a = afP(); if (!a.spec.trim()){ toast("Cole a especificação do produto."); return; } if (AF.busy) return;
  if (!can("ia.usar")){ toast("Seu papel não permite usar a IA."); return; }
  AF.busy = true; const modo = aiModo(); let web = !!a.web && (modo === "proxy" || modo === "chave"), aviso = "";
  afSt(web ? "Pesquisando na web… pode levar um minuto." : "Analisando…");
  const chama = w => askAI([{role:"user", content:afPrompt(a, w)}], {system:AF_SYS, maxTokens:4096, web:w});
  try{
    let t; try{ t = await chama(web); }catch(e){ if (web && /^http_4/.test((e && e.code) || "") && e.code !== "http_401" && e.code !== "http_403" && e.code !== "http_429"){ web = false; aviso = "A pesquisa na web não está disponível nesta conexão. Mostrei só a organização da busca."; t = await chama(false); } else throw e; }
    const j = jsonLoose(t);
    if (!j || typeof j !== "object" || Array.isArray(j)) a.res = {raw:String(t).slice(0, 6000)};
    else{
      a.res = {produto:String(j.produto || "").slice(0, 120), especificacoes:afLista(j.especificacoes), termos:afLista(j.termos_busca).slice(0, 6), tipos:afLista(j.tipos_fornecedor), exig:afLista(j.exigencias), perg:afLista(j.perguntas), mensagem:String(j.mensagem || "").slice(0, 3000), web};
      if (web) (Array.isArray(j.fornecedores) ? j.fornecedores : []).slice(0, 6).forEach(f => { if (f && f.nome) a.linhas.push({id:uid(), nome:String(f.nome).slice(0, 80), site:afUrl(f.site), fonte:afUrl(f.fonte), preco:+f.preco > 0 ? String(+f.preco).replace(".", ",") : "", frete:"", prazo:"", pgto:"", obs:String(f.obs || f.o_que_vende || "").slice(0, 200), ok:true}); });
    }
    save(); AF.busy = false; render(); if (aviso) toast(aviso);
  }catch(e){ AF.busy = false; const mm = aiErr(e); if (mm) toast(mm); afSt(mm || ""); }
}
(function(){
  document.addEventListener("input", ev => { const t = ev.target, d = t && t.dataset; if (!d) return;
    if (d.af){ afP()[d.af] = t.type === "checkbox" ? t.checked : t.value; save(); if (d.af === "qtd" || d.af === "lance") afSum(); }
    else if (d.afi){ const [i, k] = d.afi.split("."), l = afP().linhas[+i]; if (l){ l[k] = t.type === "checkbox" ? t.checked : t.value; save(); afSum(); } } });
  document.addEventListener("click", ev => { const t = ev.target.closest && ev.target.closest("[data-afa]"); if (!t) return; const a = afP(), i = +t.dataset.i, l = a.linhas[i], act = t.dataset.afa;
    if (act === "analisa") afAnalisa();
    else if (act === "limpa"){ S.af = null; save(); render(); }
    else if (act === "add"){ a.linhas.push({id:uid(), nome:"", site:"", fonte:"", preco:"", frete:"", prazo:"", pgto:"", obs:"", ok:true}); save(); render(); }
    else if (act === "del"){ a.linhas.splice(i, 1); save(); render(); }
    else if (act === "copia") copia((a.res || {}).mensagem || "", "Mensagem copiada.");
    else if (act === "forn" && l) editForn(null, {nome:l.nome, prod:(a.res || {}).produto || "", prazo:[l.prazo && l.prazo + " dias", l.pgto].filter(Boolean).join(" · "), obs:afUrl(l.fonte || l.site)});
    else if (act === "cot" && l){ if (!(n(l.preco) > 0)){ toast("Informe o preço unitário."); return; } const f = S.forn.find(x => x.nome && l.nome && x.nome.toLowerCase() === l.nome.toLowerCase()); S.cot.unshift({id:uid(), produto:(a.res || {}).produto || a.spec.slice(0, 60), fornId:f ? f.id : "", preco:n(l.preco), data:new Date().toISOString().slice(0, 10), obs:[l.frete && "Frete " + l.frete, l.prazo && "Prazo " + l.prazo + " dias", l.pgto].filter(Boolean).join(" · ")}); save(); toast("Cotação criada em Cotações."); } });
})();

/* Cobrança automática: ao entrar na conta, busca o código de ativação gravado pelo servidor (webhook do provedor de pagamento). */
async function assinaturaSync(){
  if (!S.cfg.fbProject || !CLOUD.email || !CLOUD.emailOk) return; CLOUD.syncAss = 1;
  try{
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(S.cfg.fbProject)}/databases/(default)/documents/assinaturas/${encodeURIComponent(String(CLOUD.email).toLowerCase())}`, {headers:{authorization:"Bearer " + await fbToken()}});
    if (!r.ok) return;   // 404 = ainda não há assinatura; mantém um código colado à mão
    const f = ((await r.json()).fields) || {}, cod = (f.codigo && f.codigo.stringValue) || "";
    if (!cod){ if (S.licenca && S.licenca.o === "auto"){ S.licenca = null; save(); render(); } return; }
    const d = await licVerifica(cod); S.licenca = {p:d.p, x:d.x, e:d.e, c:cod, o:"auto"}; save(); render();
  }catch(e){}
}
botInit();
fabInit();
splash();
boot();
})();
