/* Licita Lance Certo: interações do site (sem dependências, sem chamadas de rede). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduz = false; try { reduz = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var brl = function (v, d) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); };
  var pc = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
  document.documentElement.classList.remove("sem-js");
  var T = function (s) { return window.LCI && window.LCI.t ? window.LCI.t(s) : s; };


  /* selos das instituições: logotipo oficial se existir em img/parceiros, senão monograma */
  var SELOS = [["antecipagov", "antecipagov", "AG"], ["compras.gov", "comprasgov", "CG"], ["pncp", "pncp", "PN"], ["sicaf", "sicaf", "SC"], ["tesouro", "tesouro", "TN"], ["obrasgov", "obrasgov", "OB"], ["ibge", "ibge", "IB"], ["cnpj", "receita", "RF"], ["pronampe", "pronampe", "PR"], ["open finance", "openfinance", "OF"], ["garantia", "garantias", "GA"], ["capital", "capital", "CG"], ["petronect", "petronect", "PT"], ["vale", "vale", "VL"], ["suzano", "suzano", "SZ"], ["tetra pak", "tetrapak", "TP"], ["mercado eletronico", "mercadoeletronico", "ME"], ["ariba", "ariba", "AR"], ["coupa", "coupa", "CP"], ["bionexo", "bionexo", "BX"]], CORES = ["#1E4FE0", "#0E7490", "#4F46E5", "#0F766E", "#7C3AED", "#B45309", "#BE185D", "#166534"];
  function selo(nome, so) {
    var k = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), m = null; SELOS.forEach(function (x) { if (!m && k.indexOf(x[0]) >= 0) m = x; });
    var slug = m ? m[1] : "", sig = m ? m[2] : nome.split(" ").slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase(), h = 0; (slug || k).split("").forEach(function (c) { h += c.charCodeAt(0); });
    return '<span class="pl"><span class="pl-lg"><i class="pl-m" style="--c:' + CORES[h % CORES.length] + '">' + sig + "</i>" + (slug && (window.LC_PARC || {})[slug] ? '<img class="pl-img" src="img/parceiros/' + slug + "." + window.LC_PARC[slug] + '" alt="">' : "") + "</span>" + (so ? "" : "<b>" + nome + "</b>") + "</span>";
  }
  document.addEventListener("error", function (e) { var t = e.target; if (t && t.classList && t.classList.contains("pl-img")) t.remove(); }, true);
  var FONTES = ["PNCP", "Compras.gov.br", "SICAF", "Tesouro Nacional (SICONFI)", "Obrasgov", "IBGE", "Base pública do CNPJ", "AntecipaGov"];
  $("#trk").innerHTML = FONTES.concat(FONTES).map(function (n) { return "<span>" + selo(n) + "</span>"; }).join("");
  $$("[data-p]").forEach(function (e) { e.innerHTML = selo(e.getAttribute("data-p")); });

  /* tema */
  var ICON = { auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>', claro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>', escuro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>' };
  var tema = "auto"; try { tema = localStorage.getItem("lc-tema-site") || "auto"; } catch (e) {}
  function aplicaTema() { var r = document.documentElement; if (tema === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", tema === "claro" ? "light" : "dark"); var b = $("#tema"); b.innerHTML = ICON[tema]; b.setAttribute("aria-label", "Tema: " + tema + ". Toque para mudar."); }
  $("#tema").addEventListener("click", function () { var o = ["auto", "claro", "escuro"]; tema = o[(o.indexOf(tema) + 1) % 3]; try { localStorage.setItem("lc-tema-site", tema); } catch (e) {} aplicaTema(); });
  aplicaTema();

  /* progresso de rolagem, destaque do menu e revelar ao rolar */
  var prog = $("#prog");
  addEventListener("scroll", function () { var h = document.documentElement; var t = (h.scrollTop || document.body.scrollTop) / Math.max(1, h.scrollHeight - h.clientHeight); prog.style.width = Math.min(100, Math.max(0, t * 100)) + "%"; }, { passive: true });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    $$(".rv").forEach(function (el) { io.observe(el); });
    var links = {}; $$("#menu a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var so = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { $$("#menu a").forEach(function (a) { a.classList.remove("on"); }); var a = links[e.target.id]; if (a) a.classList.add("on"); } }); }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) { var el = document.getElementById(id); if (el) so.observe(el); });
  } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

  /* medidor (usado no simulador) */
  function gauge(gz, gn, m, meta) {
    var cx = 110, cy = 112, R = 86, lo = -20, hi = Math.max(40, meta * 2.5), f = function (x) { return Math.min(1, Math.max(0, (x - lo) / (hi - lo))); };
    var pt = function (fr) { var a = Math.PI * (1 - fr); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; };
    var arc = function (a, b, c) { var p = pt(a), q = pt(b); return '<path class="gz ' + c + '" d="M' + p[0].toFixed(1) + " " + p[1].toFixed(1) + " A" + R + " " + R + " 0 0 1 " + q[0].toFixed(1) + " " + q[1].toFixed(1) + '"/>'; };
    gz.innerHTML = arc(0, f(0), "bd") + arc(f(0), f(meta), "wn") + arc(f(meta), 1, "ok");
    gn.style.transform = "rotate(" + (f(m) * 180).toFixed(1) + "deg)";
  }

  /* simulador de lance */
  function sim() {
    var preco = +$("#s_preco").value, custo = +$("#s_custo").value, q = +$("#s_qtd").value, fr = +$("#s_frete").value, meta = 15;
    $("#o_preco").textContent = brl(preco); $("#o_custo").textContent = brl(custo); $("#o_qtd").textContent = q; $("#o_frete").textContent = brl(fr, 0);
    var rec = preco * q, cus = custo * q + fr, luc = rec - cus, m = rec > 0 ? luc / rec * 100 : 0, piso = (cus) / (q * (1 - meta / 100));
    var st = m < 0 ? "bd" : m >= meta ? "ok" : "wn";
    var b = $("#s_m"); b.textContent = m.toFixed(1).replace(".", ",") + "%"; b.className = st;
    $("#s_st").textContent = st === "ok" ? "Dentro da meta de 15%" : st === "wn" ? "Abaixo da meta de 15%" : "Prejuízo";
    $("#s_l").textContent = brl(luc, 0); $("#s_p").textContent = brl(piso) + " " + T("por un.");
    gauge($("#gz"), $("#gn"), m, meta);
  }
  $$("#sim input").forEach(function (i) { i.addEventListener("input", sim); }); sim(); var simLance = sim;

  /* passo a passo */
  var IC = { pca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>', radar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/></svg>', bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>', doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>', chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>', flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>' };
  var mexeu = false, STEPS = [
    ["Plano de compras", IC.pca, "Lê o que cada órgão planeja comprar no ano (PCA).", "Exemplo: a prefeitura prevê 500 caixas de papel sulfite para novembro."],
    ["Previsão", IC.chart, "Guarda a compra prevista, com quantidade, preço unitário e data desejada.", "Você vê quanto o órgão pretende gastar e com que frequência compra."],
    ["Monitoramento", IC.radar, "Confere o PNCP sozinho, pelo CNPJ do órgão, enquanto o aplicativo está aberto.", "A conferência acontece ao abrir o app e a cada 30 minutos."],
    ["Publicação", IC.doc, "Percebe quando a dispensa ou o pregão do que foi previsto é publicado.", "A compra sai da previsão e vai para Publicadas."],
    ["Alerta", IC.bell, "Avisa você, com o valor e o prazo da proposta.", "No celular instalado, o aviso chega mesmo com o app fechado."],
    ["Análise", IC.chart, "Resume o edital, mostra o Opportunity Score e calcula a sua margem.", "Você decide em minutos se vale a pena disputar."],
    ["Participação", IC.flag, "Salva a licitação, mostra o cronômetro e o maior lance que vence sem passar da sua margem.", "Quem digita o valor no portal é você: o app não envia lances."]
  ], cur = 0, auto = true, tick = null, t0 = 0, DUR = 6500;
  function mostra(i) {
    cur = i; $$("#step button").forEach(function (b, k) { b.setAttribute("aria-selected", k === i ? "true" : "false"); });
    $("#step-t").textContent = STEPS[i][0]; $("#step-ic").innerHTML = STEPS[i][1]; $("#step-d").textContent = STEPS[i][2]; $("#step-x").textContent = STEPS[i][3];
    var btn = $("#step button[data-i='" + i + "']"), bar = $("#step"); if (btn && bar && bar.scrollTo && mexeu) bar.scrollTo({ left: btn.offsetLeft - (bar.clientWidth - btn.offsetWidth) / 2, behavior: reduz ? "auto" : "smooth" });
    $("#step-bar").style.width = "0"; t0 = Date.now();
  }
  $$("#step button").forEach(function (b) { b.addEventListener("click", function () { auto = false; mostra(+b.getAttribute("data-i")); $("#step-bar").style.width = "100%"; }); });
  $("#step-p").addEventListener("mouseenter", function () { t0 = Infinity; }); $("#step-p").addEventListener("mouseleave", function () { if (auto) t0 = Date.now(); });
  mostra(0); mexeu = true;
  if (!reduz) tick = setInterval(function () { if (!auto || t0 === Infinity) return; var p = (Date.now() - t0) / DUR; $("#step-bar").style.width = Math.min(100, p * 100) + "%"; if (p >= 1) mostra((cur + 1) % STEPS.length); }, 80); else auto = false;


  /* empresas privadas: diretório filtrável e passo a passo */
  var PC = [["todas", "Todas"], ["plataforma", "Plataformas de compras"], ["industria", "Indústria e mineração"], ["energia", "Energia, óleo e gás"], ["papel", "Papel, celulose e embalagens"], ["saude", "Saúde"]];
  var PV = [["Petronect (Petrobras)", "energia", "Estatal e marketplace B2B", "Marketplace B2B da cadeia de energia, óleo e gás. O cadastro de fornecedores da Petrobras fica permanentemente aberto no portal."], ["Vale", "industria", "Mineração", "Quando identifica uma possível fornecedora, envia convite por e-mail para o portal de cadastro."], ["Suzano", "papel", "Papel e celulose", "O portal tem a área \"Seja um fornecedor\" para cadastrar a empresa na base de fornecedores."], ["Tetra Pak", "papel", "Embalagens", "Usa SAP Ariba e Coupa para cotações (RFI, RFP e leilões) e para o registro e a qualificação de fornecedores."], ["Mercado Eletrônico", "plataforma", "Plataforma de compras", "Tecnologia brasileira para compras corporativas, com comunidade de compradores e fornecedores."], ["SAP Business Network (Ariba)", "plataforma", "Rede de compradores", "Grandes compradores convidam fornecedores. O convite chega por e-mail e leva ao cadastro."], ["Coupa Supplier Portal", "plataforma", "Portal de fornecedores", "O fornecedor recebe um convite por e-mail do comprador e completa o cadastro para entrar na rede."], ["Bionexo", "saude", "Marketplace de saúde", "Conecta hospitais e outras instituições a fornecedores em compras eletrônicas."]];
  var pvCat = "todas";
  function pvDesenha() {
    $("#pv_c").innerHTML = PC.map(function (c) { return '<button type="button" data-v="' + c[0] + '" class="' + (pvCat === c[0] ? "on" : "") + '">' + c[1] + "</button>"; }).join("");
    $$("#pv_c button").forEach(function (b) { b.addEventListener("click", function () { pvCat = b.getAttribute("data-v"); pvDesenha(); }); });
    $("#pv_l").innerHTML = PV.filter(function (x) { return pvCat === "todas" || x[1] === pvCat; }).map(function (x, i) { return '<div class="pvc" style="animation-delay:' + i * 0.05 + 's"><div class="top">' + selo(x[0]) + '<span class="pill">' + x[2] + "</span></div><p>" + x[3] + '</p><a class="btn ghost" href="https://claude.ai/artifact/UytMjjddAGVBpp1FFQkmZg">Adicionar à minha lista no app</a></div>'; }).join("");
  }
  pvDesenha();
  var PS = [["Prepare a empresa", IC.doc, "CNPJ ativo, cartão CNPJ, contrato social ou CCMEI, certidões em dia, dados bancários, portfólio e referências de clientes.", "Deixe os documentos em uma pasta pronta: o cadastro costuma pedir quase tudo de uma vez."], ["Escolha por onde entrar", IC.radar, "Plataformas de compras ou o portal de fornecedores da empresa que você quer atender.", "Comece por uma ou duas empresas do seu segmento, não por todas."], ["Peça o cadastro", IC.bell, "Pelo portal da empresa ou por indicação de um comprador da área que precisa do seu produto.", "Muitas vezes o cadastro só avança quando existe uma demanda."], ["Passe pela homologação", IC.flag, "A empresa confere documentos, situação fiscal e, às vezes, qualidade, segurança e conformidade.", "Responda rápido e mantenha tudo atualizado."], ["Receba convites e cotações", IC.chart, "Os pedidos chegam pelo portal ou por e-mail. Veja prazo, especificação, volume, local e condição de pagamento.", "No app, a cotação vira uma participação na agenda."], ["Monte a proposta", IC.chart, "Use a calculadora para achar o seu piso de margem. Informe preço, prazo, validade e condições.", "Confirme a especificação antes de enviar."], ["Negocie com limite", IC.radar, "Algumas empresas fazem rodadas de negociação ou leilão reverso.", "Defina o seu limite antes e não passe dele."], ["Entregue e emita a nota", IC.doc, "Siga o prazo e o local do pedido. Muitas empresas pedem a nota pelo próprio portal.", "Guarde o comprovante de entrega."], ["Acompanhe e fidelize", IC.flag, "Atualize a situação no painel, peça avaliação e mantenha o cadastro em dia.", "Cadastro parado costuma ser desativado."]], pcur = 0, pauto = true, pt0 = 0;
  $("#pstep").innerHTML = PS.map(function (s, i) { return '<button role="tab" aria-selected="' + (i === 0) + '" data-i="' + i + '"><i>' + (i + 1) + "</i>" + s[0] + "</button>"; }).join("");
  function pMostra(i) { pcur = i; $$("#pstep button").forEach(function (b, k) { b.setAttribute("aria-selected", k === i ? "true" : "false"); }); $("#pstep-t").textContent = PS[i][0]; $("#pstep-ic").innerHTML = PS[i][1]; $("#pstep-d").textContent = PS[i][2]; $("#pstep-x").textContent = PS[i][3]; $("#pstep-bar").style.width = "0"; pt0 = Date.now(); var bar = $("#pstep"), bt = $("#pstep button[data-i='" + i + "']"); if (bt && bar.scrollTo && pMexeu) bar.scrollTo({ left: bt.offsetLeft - (bar.clientWidth - bt.offsetWidth) / 2, behavior: reduz ? "auto" : "smooth" }); }
  var pMexeu = false; $$("#pstep button").forEach(function (b) { b.addEventListener("click", function () { pauto = false; pMostra(+b.getAttribute("data-i")); $("#pstep-bar").style.width = "100%"; }); }); pMostra(0); pMexeu = true;
  $("#pstep-p").addEventListener("mouseenter", function () { pt0 = Infinity; }); $("#pstep-p").addEventListener("mouseleave", function () { if (pauto) pt0 = Date.now(); });
  if (!reduz) setInterval(function () { if (!pauto || pt0 === Infinity) return; var p = (Date.now() - pt0) / 7000; $("#pstep-bar").style.width = Math.min(100, p * 100) + "%"; if (p >= 1) pMostra((pcur + 1) % PS.length); }, 90); else pauto = false;

  /* opportunity score */
  var COMP = [["Aderência ao seu perfil", 30, 90], ["Margem potencial", 20, 70], ["Valor na sua faixa", 15, 80], ["Prazo para a proposta", 15, 100], ["Modalidade", 10, 100], ["Relação com o órgão", 10, 50]];
  $("#sc-sl").innerHTML = COMP.map(function (c, i) { return '<div class="sl"><label for="sc' + i + '">' + c[0] + " (" + c[1] + ') <output id="so' + i + '">' + c[2] + '</output></label><input id="sc' + i + '" type="range" min="0" max="100" step="1" value="' + c[2] + '"></div>'; }).join("");
  function score() {
    var s = 0; COMP.forEach(function (c, i) { var v = +$("#sc" + i).value; $("#so" + i).textContent = v; s += c[1] * v / 100; });
    if ($("#sc_doc").checked) s -= 10; if ($("#sc_leil").checked) s -= 30; s = Math.round(Math.min(100, Math.max(0, s)));
    var band = s >= 80 ? ["Prioridade alta", "var(--ok)"] : s >= 60 ? ["Boa chance", "var(--ac)"] : s >= 40 ? ["Avaliar", "#F2A93B"] : ["Baixa prioridade", "var(--bd)"];
    var d = $("#donut"); d.style.setProperty("--p", s); d.style.setProperty("--c", band[1]); $("#sc_n").textContent = s; $("#sc_b").textContent = band[0];
  }
  $$("#scorebox input").forEach(function (i) { i.addEventListener("input", score); i.addEventListener("change", score); }); score();

  /* abas de recursos */
  var row = function (a, b, p) { return '<div class="mrow"><div><b>' + a + "</b><br><small>" + b + "</small></div>" + (p ? '<span class="pill ' + (p[1] || "") + '">' + p[0] + "</span>" : "") + "</div>"; };
  var TABS = [
    ["Radar de produtos", "O que os órgãos compraram antes", "Escolha um produto e veja o histórico: valor, quem venceu, de quanto em quanto tempo cada órgão compra e a sua margem se pagarem o preço típico.", ["Preço unitário típico, estimado do texto do contrato", "Órgãos que compram e a próxima compra provável", "Fornecedores que mais venceram", "Margem potencial com o seu custo"], row("Papel sulfite A4", "Preço unitário típico", ["R$ 55,00", "ok"]) + row("12 órgãos compram", "Intervalo médio entre compras: 90 dias", ["Próxima: 04/10"]) + '<div class="mbar"><i style="width:72%"></i></div>' + row("Sua margem ao preço típico", "Custo de R$ 38,00 por unidade", ["26,8%", "ok"])],
    ["Alertas do seu perfil", "Oportunidades chegando até você", "Diga o que vende, a faixa de valor, o estado e a modalidade. O app procura sozinho e dá nota a cada oportunidade.", ["Produtos e CNAE da sua empresa", "Faixa de valor, estados e modalidades", "Opportunity Score em cada resultado", "Aviso no celular com o app fechado"], row("Material de limpeza e higiene", "Prefeitura de Campinas, SP. Propostas até 09/10", ["Score 86", "ok"]) + row("Detergente e desinfetante", "Câmara de Santos, SP. Propostas até 12/10", ["Score 74"]) + row("Luva descartável", "Credenciamento. Propostas até 30/10", ["Score 52", "wn"])],
    ["Calculadora e painel de lances", "Seu piso antes de disputar", "Descubra o menor preço que ainda dá lucro. Na sessão, o cronômetro avisa e mostra o maior lance que vence sem passar da sua margem.", ["Lucro, margem e custo máximo do fornecedor", "Medidor e simulação do tipo e se?", "Cronômetro com aviso antes do fim", "Sugestão de lance dentro da margem"], row("Sessão de lances", "Encerra em 00:04:12", ["Em disputa", "wn"]) + row("Menor lance do concorrente", "R$ 48,90 por unidade") + row("Lance sugerido", "Concorrente menos R$ 0,10, dentro da sua margem", ["R$ 48,80", "ok"])],
    ["Nota fiscal passo a passo", "Linha por linha, com ajuda", "Preencha a NF-e com explicação em cada campo e envie ao emissor, ou copie os dados para o emissor gratuito da SEFAZ.", ["8 passos, do emitente ao envio", "Preenche o órgão e o item a partir da licitação", "Revisão que aponta o que falta", "Dados prontos para copiar"], row("Passo 4 de 8", "Itens da nota", ["Em andamento"]) + '<div class="mbar"><i style="width:50%"></i></div>' + row("Total da nota", "120 un. a R$ 47,50", ["R$ 5.700,00"]) + row("Revisão", "Tudo preenchido", ["Pronto", "ok"])],
    ["Regularidade do CNPJ", "Pendências antes que virem problema", "Situação cadastral, DAS, declaração anual e certidões, com aviso antes de vencer. O DAS é controlado pelo que você marca.", ["Consulta pública do CNPJ", "Controle do DAS com multa estimada", "Declaração anual do MEI", "Checklist de certidões e dívida"], row("Situação cadastral", "Base pública do CNPJ", ["ATIVA", "ok"]) + row("DAS de setembro", "Vence em 5 dias", ["A vencer", "wn"]) + row("Certidão do FGTS", "Verificada há 12 dias", ["Em dia", "ok"])]
  ];
  $("#tabs").innerHTML = TABS.map(function (t, i) { return '<button role="tab" aria-selected="' + (i === 0) + '" data-i="' + i + '">' + t[0] + "</button>"; }).join("");
  var abaAtual = 0;
  function aba(i) {
    abaAtual = i;
    $$("#tabs button").forEach(function (b, k) { b.setAttribute("aria-selected", k === i ? "true" : "false"); }); var t = TABS[i], p = $("#tab-p"), c = p.cloneNode(false); c.id = "tab-p"; c.className = "tab-p in";
    c.innerHTML = "<div><h3>" + t[1] + "</h3><p>" + t[2] + "</p><ul>" + t[3].map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul></div><div class="mock" aria-label="Exemplo ilustrativo">' + t[4] + "</div>"; p.parentNode.replaceChild(c, p);
  }
  $$("#tabs button").forEach(function (b) { b.addEventListener("click", function () { aba(+b.getAttribute("data-i")); }); }); aba(0);

  /* conversa com o edital */
  $("#sete").innerHTML = ["Requisitos para participar", "Documentação exigida", "Especificação completa dos itens", "Prazo e local de entrega", "Catálogo e amostra", "Condições de pagamento", "Critérios de desclassificação"].map(function (t) { return "<div><i></i>" + t + "</div>"; }).join("");
  var QA = [["Preciso de amostra?", "Sim. O licitante em primeiro lugar entrega 1 amostra de cada item em até 3 dias úteis após a convocação, junto com catálogo ou folha técnica.", "item 7.1 e 7.2"], ["Qual o prazo de entrega?", "15 dias corridos, contados do recebimento da nota de empenho, no Almoxarifado Central. O frete é por conta da contratada.", "item 6.1 a 6.3"], ["Quais documentos preciso?", "CCMEI ou ato constitutivo, certidões federal, FGTS, trabalhista, estadual e municipal, um atestado de capacidade técnica e a declaração de que não emprega menor.", "item 4.1 a 4.4"], ["O que desclassifica?", "Preço acima do valor de referência, proposta fora das especificações, amostra não entregue no prazo ou reprovada e documento vencido na sessão.", "item 9.1 a 9.4"]];
  $("#chat-q").innerHTML = QA.map(function (q, i) { return '<button type="button" data-i="' + i + '">' + q[0] + "</button>"; }).join("");
  var ocupado = false;
  $$("#chat-q button").forEach(function (b) {
    b.addEventListener("click", function () {
      if (ocupado) return; ocupado = true; var q = QA[+b.getAttribute("data-i")], m = $("#chat-m");
      var u = document.createElement("div"); u.className = "bub me"; u.textContent = q[0]; m.appendChild(u);
      var r = document.createElement("div"); r.className = "bub bot caret"; m.appendChild(r); m.scrollTop = m.scrollHeight; var i = 0;
      var fim = function () { r.classList.remove("caret"); var ref = document.createElement("div"); ref.className = "ref"; ref.textContent = T("Cláusula:") + " " + T(q[2]); r.appendChild(ref); ocupado = false; };
      if (reduz) { r.textContent = q[1]; fim(); return; }
      var t = setInterval(function () { i += 2; r.textContent = q[1].slice(0, i); if (i >= q[1].length) { clearInterval(t); fim(); } }, 22);
    });
  });

  /* simulador de antecipação */
  function ant() {
    var V = +$("#a_v").value, d = +$("#a_d").value, tx = +$("#a_t").value / 100, f = +$("#a_f").value;
    $("#oa_v").textContent = brl(V, 0); $("#oa_d").textContent = d + " " + T("dias"); $("#oa_t").textContent = (tx * 100).toFixed(1).replace(".", ",") + "%"; $("#oa_f").textContent = brl(f, 0);
    var t = d / 30, jur = V * (1 - 1 / Math.pow(1 + tx, t)), liq = V - jur - f, cet = Math.pow(V / liq, 1 / t) - 1;
    $("#r_liq").textContent = brl(liq, 0); $("#r_cus").textContent = brl(V - liq, 0); $("#r_cet").textContent = pc(cet); $("#r_ano").textContent = pc(Math.pow(1 + cet, 12) - 1);
  }
  $$("#ant input").forEach(function (i) { i.addEventListener("input", ant); }); ant();

  /* motor de oportunidades (exemplo fictício) */
  var MV = [1000, 3000, 5000, 10000, 25000], MP = ["Limpeza e higiene", "Material de escritório", "Informática", "Alimentos", "Uniformes e EPI"], MU = ["Brasil inteiro", "SP", "MG", "RJ", "PR"];
  var ITENS = { "Limpeza e higiene": ["Material de limpeza e higiene", "Papel higiênico e papel toalha", "Detergente e desinfetante"], "Material de escritório": ["Papel A4 e material de expediente", "Canetas e pastas", "Toner e papelaria"], "Informática": ["Notebooks e monitores", "Impressoras e toner", "Periféricos e cabos"], "Alimentos": ["Gêneros alimentícios para merenda", "Cesta básica", "Água mineral e café"], "Uniformes e EPI": ["Uniformes para servidores", "Luvas e máscaras", "Botas e capacetes"] };
  var ORG = { SP: ["Prefeitura de Campinas", "Câmara de Santos", "Hospital Municipal de Sorocaba"], MG: ["Prefeitura de Contagem", "Câmara de Uberlândia", "Hospital Municipal de BH"], RJ: ["Prefeitura de Niterói", "Câmara de Petrópolis", "Fundação de Saúde de Macaé"], PR: ["Prefeitura de Londrina", "Câmara de Curitiba", "Hospital de Maringá"] };
  var mt = { v: 5000, p: "Limpeza e higiene", u: "Brasil inteiro" };
  function chips(id, lista, chave, fmt) { $(id).innerHTML = lista.map(function (x) { return '<button type="button" data-v="' + x + '" class="' + (mt[chave] === x ? "on" : "") + '">' + (fmt ? fmt(x) : x) + "</button>"; }).join(""); $$(id + " button").forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-v"); mt[chave] = chave === "v" ? +v : v; chips(id, lista, chave, fmt); motor(); }); }); }
  function motor() {
    var estados = mt.u === "Brasil inteiro" ? ["SP", "MG", "RJ"] : [mt.u], itens = ITENS[mt.p], fat = [0.82, 1.0, 1.24], dias = [3, 5, 9], out = [];
    for (var i = 0; i < 3; i++) { var uf = estados[i % estados.length], org = ORG[uf][i % 3], v = Math.round(mt.v * fat[i] / 10) * 10, sc = Math.round(Math.max(48, Math.min(96, 92 - i * 9 - Math.abs(fat[i] - 1) * 20 - (i === 2 ? 4 : 0)))); out.push([T(itens[i]), T(org) + ", " + uf, v, sc, dias[i]]); }
    var el = $("#mt_r"); el.innerHTML = out.map(function (r, i) { return '<div class="res" style="animation-delay:' + i * 0.08 + 's"><div><b>' + r[0] + "</b><small>" + r[1] + ". " + T("Propostas em") + " " + r[4] + " " + T("dias") + '</small></div><div style="text-align:right"><b>' + brl(r[2], 0) + '</b><br><span class="pill ' + (r[3] >= 80 ? "ok" : r[3] >= 60 ? "" : "wn") + '">' + T("Score") + " " + r[3] + "</span></div></div>"; }).join("") + '<div class="res-n">Exemplo fictício. No app, os resultados vêm do PNCP em tempo real e você é avisado quando surgir algo novo.</div>';
  }
  chips("#mt_v", MV, "v", function (x) { return brl(x, 0); }); chips("#mt_p", MP, "p"); chips("#mt_u", MU, "u"); motor();

  /* agenda e painel de tempo (demonstração) */
  var FUN = $$("#funil span"), fi = 0, modo = "manual", sim = null, ocioso = Date.now() + (2 * 3600 + 14 * 60 + 37) * 1000;
  function funil(i) { FUN.forEach(function (e, k) { e.classList.toggle("on", k === i); e.classList.toggle("ok", k < i); }); }
  funil(0); var fiT = reduz ? null : setInterval(function () { if (sim) return; fi = (fi + 1) % FUN.length; funil(fi); }, 2600);
  $$(".modo button").forEach(function (b) { b.addEventListener("click", function () { modo = b.getAttribute("data-m"); $$(".modo button").forEach(function (x) { x.classList.toggle("on", x === b); }); $("#ev_modo").textContent = modo === "assistido" ? "Lance final: automático assistido" : "Lance final: manual"; }); });
  var BAR = [88, 74, 62, 55, 49, 44]; function barras(passo) { $("#bars-d").innerHTML = BAR.map(function (h, i) { return '<i style="--h:' + Math.max(8, h - (passo >= i ? 0 : 0) - (passo * 2)) + '%"></i>'; }).join(""); }
  barras(0);
  var p2 = function (n) { return String(n).padStart(2, "0"); };
  function cdTxt(ms, curto) { var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (curto ? "" : p2(h) + ":") + p2(m) + ":<i>" + p2(s % 60) + "</i>"; }
  function ocioTick() { if (sim) return; var c = $("#ev_c"); c.innerHTML = cdTxt(ocioso - Date.now()); $("#ev-d").className = "ev-d rv in"; }
  ocioTick(); setInterval(ocioTick, 1000);
  $("#ev_go").addEventListener("click", function () {
    if (sim) return; var b = $("#ev_go"), fim = Date.now() + 12000, c = $("#ev_c"), card = $("#ev-d"), al = $("#ev_al"), ok = $("#ev_ok"); b.disabled = true; al.hidden = true; ok.hidden = true; funil(3);
    sim = setInterval(function () {
      var r = fim - Date.now(), s = Math.ceil(r / 1000); c.innerHTML = cdTxt(Math.max(0, r), true); barras(12 - s);
      card.className = "ev-d rv in" + (s <= 5 ? " crit" : s <= 10 ? " urg" : "");
      if (s <= 5 && al.hidden) { al.hidden = false; $("#ev_s").textContent = modo === "assistido" ? "Valor copiado. Cole no portal e envie." : "Dê este lance agora no portal"; }
      if (r <= 0) { clearInterval(sim); sim = null; card.className = "ev-d rv in"; al.hidden = true; ok.hidden = false; funil(4); b.disabled = false; setTimeout(function () { ok.hidden = true; funil(0); fi = 0; barras(0); }, 3600); }
    }, 250);
  });

  /* exterior: relógios e roteiro */
  var CK = [["Empresa com CNPJ ativo no Brasil", "A venda ao governo costuma ser feita por pessoa jurídica."], ["Conta gov.br com nível prata ou ouro", "Costuma ser exigida nos portais de compras."], ["Cadastro no SICAF", "Reúne os documentos de habilitação."], ["Representante no Brasil, se precisar", "Procuração para assinar e receber notificações."], ["Conta bancária no Brasil", "Os órgãos pagam em reais."], ["Contador no Brasil", "Tributos, notas fiscais e declarações."], ["Alertas ligados e horário de Brasília conferido", "As sessões seguem o horário de Brasília."]];
  $("#check").innerHTML = CK.map(function (c) { return "<li><i>&#10003;</i><div><b>" + c[0] + "</b><small>" + c[1] + "</small></div></li>"; }).join("");
  var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  function relogio() { var d = new Date(), o = { hour: "2-digit", minute: "2-digit" }; $("#rl_br").textContent = d.toLocaleTimeString("pt-BR", Object.assign({ timeZone: "America/Sao_Paulo" }, o)); $("#rl_lo").textContent = d.toLocaleTimeString("pt-BR", o); $("#rl_nm").textContent = tz && tz !== "America/Sao_Paulo" ? tz.split("/").pop().replace(/_/g, " ") : "Seu horário"; }
  relogio(); setInterval(relogio, 15000);

  /* animações: palavras do título, contadores, brilho que acompanha o ponteiro */
  (function () {
    var h1 = $(".hero h1");
    function palavras(txt, cls) { return txt.split(/(\s+)/).map(function (t) { return /^\s+$/.test(t) ? t : t ? '<span class="w' + (cls || "") + '">' + t + "</span>" : ""; }).join(""); }
    function montaH1(anima) { if (!h1) return; h1.innerHTML = palavras(T("A inteligência que transforma"), anima ? "" : " w-on") + ' <span class="gt">' + palavras(T("oportunidades públicas e privadas"), anima ? "" : " w-on") + "</span> " + palavras(T("em negócios"), anima ? "" : " w-on"); if (anima) $$(".hero h1 .w").forEach(function (w, i) { w.style.animationDelay = 0.15 + i * 0.07 + "s"; }); }
    if (h1 && !reduz) montaH1(true); addEventListener("lc:lang", function (e) { if (e.detail && e.detail.inicial && window.LCI && LCI.get() === "pt") return; montaH1(false); });
    function conta(el) { var alvo = +el.getAttribute("data-count"), t0 = performance.now(); if (reduz) { el.textContent = alvo; return; } var f = function (t) { var p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
    if ("IntersectionObserver" in window) { var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { conta(e.target); io2.unobserve(e.target); } }); }, { threshold: 0.6 }); $$("[data-count]").forEach(function (e) { io2.observe(e); }); } else $$("[data-count]").forEach(conta);
    $$(".sim,.ant,.mt,.ev-d,.chat,.scorebox,.tab-p,.inst3>div,.fcards div").forEach(function (c) { c.classList.add("sp-card"); c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px"); }); });
  })();

  /* entrar pelo navegador e baixar: destaca o aparelho e envia o link */
  (function () {
    var ua = navigator.userAgent || "", os = /iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "desktop";
    var alvo = document.querySelector('#inst3 [data-os="' + os + '"]'); if (alvo) alvo.classList.add("sug");
    var base = /^https?:/.test(location.protocol) ? location.origin + "/app/" : "/app/", ok = $("#sh_ok");
    var msg = function () { return T("Abra o Licita Lance Certo no navegador do seu celular:"); };
    function atualiza() { $("#sh_wa").href = "https://wa.me/?text=" + encodeURIComponent(msg() + " " + base); $("#sh_em").href = "mailto:?subject=" + encodeURIComponent("Licita Lance Certo") + "&body=" + encodeURIComponent(msg() + " " + base); }
    atualiza(); addEventListener("lc:lang", atualiza);
    if (navigator.share) { var n = $("#sh_nat"); n.hidden = false; n.addEventListener("click", function () { navigator.share({ title: "Licita Lance Certo", text: msg(), url: base }).catch(function () {}); }); }
    $("#sh_cp").addEventListener("click", function () {
      var fim = function () { ok.textContent = T("Link copiado."); setTimeout(function () { ok.textContent = ""; }, 2400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(base).then(fim, function () { prompt(T("Copie o link:"), base); }); else { var t = document.createElement("textarea"); t.value = base; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); fim(); } catch (e) { prompt(T("Copie o link:"), base); } t.remove(); }
    });
  })();
  /* ao trocar o idioma, refaz as demonstrações para traduzir o que elas escrevem */
  addEventListener("lc:lang", function () { try { simLance(); score(); ant(); motor(); pvDesenha(); pMostra(pcur); mostra(cur); aba(abaAtual); relogio(); } catch (e) { if (window.console) console.error("lc:lang", e && e.message); } });
})();
