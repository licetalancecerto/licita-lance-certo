/* Troca de idiomas do site (Português, English, Español). Traduz o texto da página e o que o JavaScript escreve depois. */
(function () {
  "use strict";
  var D = {};   /* português -> [inglês, espanhol] */
  var LANGS = ["pt", "en", "es"], HTML_LANG = { pt: "pt-BR", en: "en", es: "es" }, cur = "pt";
  var orig = new WeakMap(), ultimo = new WeakMap(), attrOrig = new WeakMap(), ATTRS = ["aria-label", "title", "placeholder", "alt"];
  var norm = function (s) { return String(s).replace(/\s+/g, " ").trim(); };
  function t(s) { if (cur === "pt") return s; var e = D[norm(s)]; return e ? e[cur === "en" ? 0 : 1] : s; }
  function texto(n) {
    var p = n.parentNode; if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.nodeName) || (p.closest && p.closest("[data-nt]"))) return;
    var o = orig.get(n); if (o === undefined || (ultimo.has(n) && n.nodeValue !== ultimo.get(n))) { o = n.nodeValue; orig.set(n, o); }
    var k = norm(o); if (!k) return; var e = cur === "pt" ? null : D[k], novo = e ? e[cur === "en" ? 0 : 1] : o;
    if (e || cur === "pt") { var l = o.match(/^\s*/)[0], r = o.match(/\s*$/)[0]; novo = e ? l + novo + r : o; }
    if (n.nodeValue !== novo) n.nodeValue = novo; ultimo.set(n, novo);
  }
  function elemento(el) {
    if (el.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.nodeName) || (el.closest && el.closest("[data-nt]"))) return;
    var ao = attrOrig.get(el); ATTRS.forEach(function (a) { if (el.hasAttribute(a)) { if (!ao) { ao = {}; attrOrig.set(el, ao); } var cv = el.getAttribute(a); if (ao[a] === undefined || (ao["~" + a] !== undefined && cv !== ao["~" + a])) ao[a] = cv; var e = cur === "pt" ? null : D[norm(ao[a])], nv = e ? e[cur === "en" ? 0 : 1] : ao[a]; if (cv !== nv) el.setAttribute(a, nv); ao["~" + a] = nv; } });
  }
  function varre(raiz) {
    if (raiz.nodeType === 3) return texto(raiz);
    if (raiz.nodeType !== 1) return; elemento(raiz);
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n; while ((n = w.nextNode())) { if (n.nodeType === 3) texto(n); else elemento(n); }
  }
  var obs = null;
  function observa() {
    if (!window.MutationObserver) return;
    obs = new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === "characterData") { if (ultimo.has(m.target) && m.target.nodeValue === ultimo.get(m.target)) return; texto(m.target); }   /* ignora as nossas próprias trocas */
        else m.addedNodes.forEach(varre);
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function meta() {
    var te = document.querySelector("title"); if (te) { if (!te.dataset.pt) te.dataset.pt = te.textContent; var e = D[norm(te.dataset.pt)]; document.title = cur === "pt" || !e ? te.dataset.pt : e[cur === "en" ? 0 : 1]; }
    var md = document.querySelector('meta[name="description"]'); if (md) { if (!md.dataset.pt) md.dataset.pt = md.getAttribute("content"); var f = D[norm(md.dataset.pt)]; md.setAttribute("content", cur === "pt" || !f ? md.dataset.pt : f[cur === "en" ? 0 : 1]); }
    document.documentElement.lang = HTML_LANG[cur];
  }
  function ui() {
    var c = document.getElementById("lang-c"); if (c) c.textContent = cur.toUpperCase();
    Array.prototype.forEach.call(document.querySelectorAll("#lang-m [data-l]"), function (b) { b.setAttribute("aria-checked", b.getAttribute("data-l") === cur ? "true" : "false"); });
  }
  function define(l, salva, ini) {
    if (LANGS.indexOf(l) < 0) l = "pt"; cur = l; if (salva) { try { localStorage.setItem("lc-lang", l); } catch (e) {} }
    varre(document.body); meta(); ui();
    window.dispatchEvent(new CustomEvent("lc:lang", { detail: { inicial: !!ini } }));
    varre(document.body);   /* traduz o que as demonstrações acabaram de escrever */
  }
  function inicial() {
    var q = (location.search.match(/[?&]lang=(pt|en|es)/) || [])[1]; if (q) return q;
    try { var s = localStorage.getItem("lc-lang"); if (s && LANGS.indexOf(s) >= 0) return s; } catch (e) {}
    var n = String(navigator.language || "pt").toLowerCase().slice(0, 2); return n === "pt" ? "pt" : n === "es" ? "es" : "en";
  }
  window.LCI = { t: t, set: function (l) { define(l, true); }, get: function () { return cur; }, dict: D };
  function menu() {
    var b = document.getElementById("lang-b"), m = document.getElementById("lang-m"); if (!b || !m) return;
    var fecha = function () { m.hidden = true; b.setAttribute("aria-expanded", "false"); };
    b.addEventListener("click", function (e) { e.stopPropagation(); var abre = m.hidden; m.hidden = !abre; b.setAttribute("aria-expanded", String(abre)); if (abre) { var f = m.querySelector('[aria-checked="true"]') || m.querySelector("button"); if (f) f.focus(); } });
    m.addEventListener("click", function (e) { var x = e.target.closest("[data-l]"); if (!x) return; window.LCI.set(x.getAttribute("data-l")); fecha(); b.focus(); });
    document.addEventListener("click", function (e) { if (!e.target.closest("#lang")) fecha(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !m.hidden) { fecha(); b.focus(); } if (!m.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); var it = Array.prototype.slice.call(m.querySelectorAll("button")), i = it.indexOf(document.activeElement); it[(i + (e.key === "ArrowDown" ? 1 : -1) + it.length) % it.length].focus(); } });
  }
  /* dicionário: texto em português -> [inglês, espanhol] */
  Object.assign(D, {
  "oportunidades públicas e privadas": ["public and private opportunities", "oportunidades públicas y privadas"],
  "12 órgãos compram": [
  "12 agencies buy",
  "12 organismos compran"
  ],
  "120 un. a R$ 47,50": [
  "120 units at R$ 47,50",
  "120 un. a R$ 47,50"
  ],
  "15 dias corridos, contados do recebimento da nota de empenho, no Almoxarifado Central. O frete é por conta da contratada.": [
  "15 calendar days, counted from receipt of the purchase commitment, at the Central Warehouse. Freight is paid by the supplier.",
  "15 días corridos, contados desde la recepción de la orden de compra, en el Almacén Central. El flete corre por cuenta del proveedor."
  ],
  "dias": [
  "days",
  "días"
  ],
  "8 passos, do emitente ao envio": [
  "8 steps, from the issuer to submission",
  "8 pasos, del emisor al envío"
  ],
  "A IA pode errar: confira sempre o edital original.": [
  "The AI can make mistakes: always check the original tender notice.",
  "La IA puede equivocarse: confirme siempre el pliego original."
  ],
  "A compra sai da previsão e vai para Publicadas.": [
  "The purchase leaves the forecast and moves to Published.",
  "La compra sale de la previsión y pasa a Publicadas."
  ],
  "A conferência acontece ao abrir o app e a cada 30 minutos.": [
  "It checks when you open the app and every 30 minutes.",
  "La revisión ocurre al abrir la app y cada 30 minutos."
  ],
  "A empresa confere documentos, situação fiscal e, às vezes, qualidade, segurança e conformidade.": [
  "The company checks documents, tax status and, sometimes, quality, safety and compliance.",
  "La empresa revisa documentos, situación fiscal y, a veces, calidad, seguridad y cumplimiento."
  ],
  "A inteligência que transforma": [
  "The intelligence that turns",
  "La inteligencia que transforma"
  ],
  "A inteligência que transforma oportunidades públicas e privadas em negócios.": [
  "The intelligence that turns public and private opportunities into business.",
  "La inteligencia que transforma oportunidades públicas y privadas en negocios."
  ],
  "A vencer": [
  "Due soon",
  "Por vencer"
  ],
  "A venda ao governo costuma ser feita por pessoa jurídica.": [
  "Selling to the government is usually done through a registered company.",
  "La venta al gobierno suele hacerse mediante una persona jurídica."
  ],
  "ATIVA": [
  "ACTIVE",
  "ACTIVA"
  ],
  "Abra e use agora, no computador ou no celular. Sem baixar nada.": [
  "Open and use it now, on a computer or phone. No download needed.",
  "Ábrala y úsela ahora, en el ordenador o en el móvil. Sin descargar nada."
  ],
  "Abra o app no Chrome, toque nos três pontos e em Instalar app. Ele vai para a tela inicial e abre mesmo sem internet.": [
  "Open the app in Chrome, tap the three dots and then Install app. It goes to your home screen and opens even without internet.",
  "Abra la app en Chrome, toque los tres puntos y luego Instalar app. Va a la pantalla de inicio y abre incluso sin internet."
  ],
  "Abra o app no Safari, toque em Compartilhar e em Adicionar à Tela de Início.": [
  "Open the app in Safari, tap Share and then Add to Home Screen.",
  "Abra la app en Safari, toque Compartir y luego Añadir a pantalla de inicio."
  ],
  "Abrir e instalar": [
  "Open and install",
  "Abrir e instalar"
  ],
  "Abrir no Safari": [
  "Open in Safari",
  "Abrir en Safari"
  ],
  "Achada": [
  "Found",
  "Encontrada"
  ],
  "Acompanhe e fidelize": [
  "Follow up and retain",
  "Haga seguimiento y fidelice"
  ],
  "Aderência ao seu perfil": [
  "Fit with your profile",
  "Ajuste a su perfil"
  ],
  "Aderência ao seu perfil (30)": [
  "Fit with your profile (30)",
  "Ajuste a su perfil (30)"
  ],
  "Adicionar à minha lista no app": [
  "Add to my list in the app",
  "Añadir a mi lista en la app"
  ],
  "Agenda": [
  "Schedule",
  "Agenda"
  ],
  "Alerta": [
  "Alert",
  "Alerta"
  ],
  "Alertas do seu perfil": [
  "Alerts from your profile",
  "Alertas de su perfil"
  ],
  "Alertas ligados e horário de Brasília conferido": [
  "Alerts on and Brasília time checked",
  "Alertas activadas y horario de Brasilia verificado"
  ],
  "Algumas empresas fazem rodadas de negociação ou leilão reverso.": [
  "Some companies run negotiation rounds or reverse auctions.",
  "Algunas empresas hacen rondas de negociación o subasta inversa."
  ],
  "Alimentos": [
  "Food",
  "Alimentos"
  ],
  "Além do governo, grandes empresas e plataformas cadastram fornecedores e pedem cotações. O painel reúne por onde começar e acompanha cada cadastro até virar cliente.": [
  "Besides the government, large companies and platforms register suppliers and request quotes. The panel gathers where to start and tracks each registration until it becomes a client.",
  "Además del gobierno, grandes empresas y plataformas registran proveedores y piden cotizaciones. El panel reúne por dónde empezar y sigue cada registro hasta que se convierte en cliente."
  ],
  "Antecipação": [
  "Advance payment",
  "Anticipo"
  ],
  "Análise": [
  "Analysis",
  "Análisis"
  ],
  "Ao ano": [
  "Per year",
  "Al año"
  ],
  "As informações são de apoio. Confirme sempre no edital e com o seu contador. Os valores e exemplos desta página são fictícios.": [
  "The information is for support only. Always confirm in the tender notice and with your accountant. Values and examples on this page are fictional.",
  "La información es de apoyo. Confirme siempre en el pliego y con su contador. Los valores y ejemplos de esta página son ficticios."
  ],
  "As sessões seguem o horário de Brasília.": [
  "Sessions follow Brasília time.",
  "Las sesiones siguen el horario de Brasilia."
  ],
  "Atualize a situação no painel, peça avaliação e mantenha o cadastro em dia.": [
  "Update the status in the panel, ask for feedback and keep the registration up to date.",
  "Actualice la situación en el panel, pida una evaluación y mantenga el registro al día."
  ],
  "Automático assistido": [
  "Assisted automatic",
  "Automático asistido"
  ],
  "Avaliar": [
  "Evaluate",
  "Evaluar"
  ],
  "Avisa prazos, documentos vencendo e oportunidades do seu perfil.": [
  "Warns about deadlines, expiring documents and opportunities for your profile.",
  "Avisa de plazos, documentos por vencer y oportunidades de su perfil."
  ],
  "Avisa você, com o valor e o prazo da proposta.": [
  "Alerts you, with the value and the proposal deadline.",
  "Le avisa, con el valor y el plazo de la propuesta."
  ],
  "Aviso no celular com o app fechado": [
  "Phone alert even with the app closed",
  "Aviso en el móvil con la app cerrada"
  ],
  "Baixa prioridade": [
  "Low priority",
  "Prioridad baja"
  ],
  "Baixar no Android": [
  "Download on Android",
  "Descargar en Android"
  ],
  "Baixar no iPhone": [
  "Download on iPhone",
  "Descargar en iPhone"
  ],
  "Baixar o aplicativo": [
  "Download the app",
  "Descargar la app"
  ],
  "Base pública do CNPJ": [
  "Public CNPJ database",
  "Base pública del CNPJ"
  ],
  "Boa chance": [
  "Good chance",
  "Buena oportunidad"
  ],
  "Brasil inteiro": [
  "All of Brazil",
  "Todo Brasil"
  ],
  "Brasileiros e naturalizados no exterior costumam participar por meio de uma empresa com CNPJ no Brasil, cadastro no SICAF e conta gov.br. As regras variam, então confirme com um contador ou advogado no Brasil. O app traz um roteiro de preparação e mostra os horários de Brasília e do seu fuso.": [
  "Brazilians and naturalized citizens abroad usually take part through a company with a CNPJ in Brazil, SICAF registration and a gov.br account. Rules vary, so confirm with an accountant or lawyer in Brazil. The app brings a preparation checklist and shows Brasília time and your time zone.",
  "Los brasileños y naturalizados en el exterior suelen participar mediante una empresa con CNPJ en Brasil, registro en el SICAF y cuenta gov.br. Las reglas varían, así que confirme con un contador o abogado en Brasil. La app trae una lista de preparación y muestra el horario de Brasilia y el de su zona horaria."
  ],
  "Brasileiros e naturalizados que moram fora também podem vender ao governo brasileiro. O app mostra os horários de Brasília e do seu fuso lado a lado, e traz um roteiro do que preparar.": [
  "Brazilians and naturalized citizens living abroad can also sell to the Brazilian government. The app shows Brasília time and your time zone side by side, and brings a checklist of what to prepare.",
  "Los brasileños y naturalizados que viven fuera también pueden vender al gobierno brasileño. La app muestra el horario de Brasilia y el de su zona horaria lado a lado, y trae una lista de lo que preparar."
  ],
  "Brasília agora": [
  "Brasília now",
  "Brasilia ahora"
  ],
  "CCMEI ou ato constitutivo, certidões federal, FGTS, trabalhista, estadual e municipal, um atestado de capacidade técnica e a declaração de que não emprega menor.": [
  "CCMEI or articles of incorporation, federal, FGTS, labor, state and municipal certificates, one technical capacity certificate and a statement that you do not employ minors.",
  "CCMEI o acta constitutiva, certificados federal, FGTS, laboral, estatal y municipal, un certificado de capacidad técnica y la declaración de que no emplea menores."
  ],
  "CNPJ ativo, cartão CNPJ, contrato social ou CCMEI, certidões em dia, dados bancários, portfólio e referências de clientes.": [
  "Active CNPJ, CNPJ card, articles of incorporation or CCMEI, up-to-date certificates, bank details, portfolio and client references.",
  "CNPJ activo, tarjeta CNPJ, contrato social o CCMEI, certificados al día, datos bancarios, portafolio y referencias de clientes."
  ],
  "Cada ferramenta usa os dados da anterior: o que você descobre no radar vira alerta, edital resumido e lance calculado.": [
  "Each tool uses the data from the previous one: what you find on the radar becomes an alert, a summarized notice and a calculated bid.",
  "Cada herramienta usa los datos de la anterior: lo que descubre en el radar se convierte en alerta, pliego resumido y puja calculada."
  ],
  "Cada oportunidade recebe uma nota de 0 a 100, com a explicação de cada parte. Mexa nos controles e veja a nota mudar, do jeito que o aplicativo calcula.": [
  "Each opportunity gets a score from 0 to 100, with an explanation of each part. Move the controls and watch the score change, just as the app calculates it.",
  "Cada oportunidad recibe una nota de 0 a 100, con la explicación de cada parte. Mueva los controles y vea cambiar la nota, tal como la calcula la app."
  ],
  "Cada participação tem início e fim dos lances, estratégia, meta de lance e lembretes. A agenda organiza o dia, o funil mostra a etapa e o painel de tempo avisa os últimos segundos.": [
  "Each participation has a start and end for bids, a strategy, a bid target and reminders. The schedule organizes your day, the funnel shows the stage and the time panel warns you in the last seconds.",
  "Cada participación tiene inicio y fin de las pujas, estrategia, meta de puja y recordatorios. La agenda organiza el día, el embudo muestra la etapa y el panel de tiempo avisa en los últimos segundos."
  ],
  "Cadastro no SICAF": [
  "SICAF registration",
  "Registro en el SICAF"
  ],
  "Cadastro parado costuma ser desativado.": [
  "Idle registrations are usually deactivated.",
  "Un registro parado suele desactivarse."
  ],
  "Calculadora e painel de lances": [
  "Calculator and bid panel",
  "Calculadora y panel de pujas"
  ],
  "Capital de giro": [
  "Working capital",
  "Capital de trabajo"
  ],
  "Catálogo e amostra": [
  "Catalog and sample",
  "Catálogo y muestra"
  ],
  "Certidão do FGTS": [
  "FGTS certificate",
  "Certificado del FGTS"
  ],
  "Checklist de certidões e dívida": [
  "Certificates and debt checklist",
  "Lista de certificados y deudas"
  ],
  "Cláusula:": [
  "Clause:",
  "Cláusula:"
  ],
  "item 4.1 a 4.4": [
  "items 4.1 to 4.4",
  "ítems 4.1 a 4.4"
  ],
  "item 6.1 a 6.3": [
  "items 6.1 to 6.3",
  "ítems 6.1 a 6.3"
  ],
  "item 7.1 e 7.2": [
  "items 7.1 and 7.2",
  "ítems 7.1 y 7.2"
  ],
  "item 9.1 a 9.4": [
  "items 9.1 to 9.4",
  "ítems 9.1 a 9.4"
  ],
  "Comece pelo radar do seu produto": [
  "Start with your product's radar",
  "Empiece por el radar de su producto"
  ],
  "Comece por uma ou duas empresas do seu segmento, não por todas.": [
  "Start with one or two companies in your segment, not all of them.",
  "Empiece por una o dos empresas de su segmento, no por todas."
  ],
  "Como funciona": [
  "How it works",
  "Cómo funciona"
  ],
  "Como vender a uma empresa privada, passo a passo": [
  "How to sell to a private company, step by step",
  "Cómo vender a una empresa privada, paso a paso"
  ],
  "Compartilhar": [
  "Share",
  "Compartir"
  ],
  "Compras.gov.br": [
  "Compras.gov.br",
  "Compras.gov.br"
  ],
  "Concorrente menos R$ 0,10, dentro da sua margem": [
  "Competitor minus R$ 0,10, within your margin",
  "Competidor menos R$ 0,10, dentro de su margen"
  ],
  "Condições de pagamento": [
  "Payment terms",
  "Condiciones de pago"
  ],
  "Conecta hospitais e outras instituições a fornecedores em compras eletrônicas.": [
  "Connects hospitals and other institutions to suppliers in electronic purchasing.",
  "Conecta hospitales y otras instituciones con proveedores en compras electrónicas."
  ],
  "Conexão em modo leitura, com a sua autorização": [
  "Read-only connection, with your authorization",
  "Conexión de solo lectura, con su autorización"
  ],
  "Confere o PNCP sozinho, pelo CNPJ do órgão, enquanto o aplicativo está aberto.": [
  "Checks the PNCP on its own, by the agency's CNPJ, while the app is open.",
  "Revisa el PNCP por sí sola, por el CNPJ del organismo, mientras la app está abierta."
  ],
  "Confiança vem de dizer os limites.": [
  "Trust comes from stating the limits.",
  "La confianza viene de decir los límites."
  ],
  "Confirme a especificação antes de enviar.": [
  "Confirm the specification before sending.",
  "Confirme la especificación antes de enviar."
  ],
  "Consulta pública do CNPJ": [
  "Public CNPJ lookup",
  "Consulta pública del CNPJ"
  ],
  "Conta bancária no Brasil": [
  "Bank account in Brazil",
  "Cuenta bancaria en Brasil"
  ],
  "Conta gov.br com nível prata ou ouro": [
  "gov.br account with silver or gold level",
  "Cuenta gov.br con nivel plata u oro"
  ],
  "Contador no Brasil": [
  "Accountant in Brazil",
  "Contador en Brasil"
  ],
  "Controle de todo o processo, da busca ao recebimento": [
  "Control of the whole process, from search to payment",
  "Control de todo el proceso, de la búsqueda al cobro"
  ],
  "Controle do DAS com multa estimada": [
  "DAS tracking with estimated penalty",
  "Control del DAS con multa estimada"
  ],
  "Converse com o edital": [
  "Chat with the tender notice",
  "Converse con el pliego"
  ],
  "Copiar link": [
  "Copy link",
  "Copiar enlace"
  ],
  "Costuma ser exigida nos portais de compras.": [
  "Usually required on procurement portals.",
  "Suele exigirse en los portales de compras."
  ],
  "Credenciamento. Propostas até 30/10": [
  "Accreditation. Proposals until 30/10",
  "Acreditación. Propuestas hasta 30/10"
  ],
  "Critérios de desclassificação": [
  "Disqualification criteria",
  "Criterios de descalificación"
  ],
  "Cronômetro com aviso antes do fim": [
  "Timer with a warning before the end",
  "Cronómetro con aviso antes del final"
  ],
  "Crédito para quem vende ao governo": [
  "Credit for those who sell to the government",
  "Crédito para quien vende al gobierno"
  ],
  "Custo de R$ 38,00 por unidade": [
  "Cost of R$ 38,00 per unit",
  "Costo de R$ 38,00 por unidad"
  ],
  "Custo efetivo ao mês": [
  "Effective monthly cost",
  "Costo efectivo mensual"
  ],
  "Custo por unidade": [
  "Cost per unit",
  "Costo por unidad"
  ],
  "Custo total": [
  "Total cost",
  "Costo total"
  ],
  "Câmara de Santos, SP. Propostas até 12/10": [
  "Santos City Council, SP. Proposals until 12/10",
  "Concejo de Santos, SP. Propuestas hasta 12/10"
  ],
  "DAS de setembro": [
  "September DAS",
  "DAS de septiembre"
  ],
  "Dados prontos para copiar": [
  "Data ready to copy",
  "Datos listos para copiar"
  ],
  "De fontes públicas oficiais: PNCP, Compras.gov.br, SICAF, Tesouro Nacional, Obrasgov, IBGE e a base pública do CNPJ.": [
  "From official public sources: PNCP, Compras.gov.br, SICAF, National Treasury, Obrasgov, IBGE and the public CNPJ database.",
  "De fuentes públicas oficiales: PNCP, Compras.gov.br, SICAF, Tesoro Nacional, Obrasgov, IBGE y la base pública del CNPJ."
  ],
  "De onde vêm os dados?": [
  "Where does the data come from?",
  "¿De dónde vienen los datos?"
  ],
  "De qualquer lugar do mundo": [
  "From anywhere in the world",
  "Desde cualquier lugar del mundo"
  ],
  "Declaração anual do MEI": [
  "MEI annual declaration",
  "Declaración anual del MEI"
  ],
  "Defina o seu limite antes e não passe dele.": [
  "Set your limit beforehand and do not go past it.",
  "Defina su límite antes y no lo sobrepase."
  ],
  "Deixe os documentos em uma pasta pronta: o cadastro costuma pedir quase tudo de uma vez.": [
  "Keep the documents in a ready folder: registration usually asks for almost everything at once.",
  "Deje los documentos en una carpeta lista: el registro suele pedir casi todo de una vez."
  ],
  "Demonstração simplificada: o aplicativo também considera o DAS ou o imposto do seu regime.": [
  "Simplified demo: the app also takes into account the DAS or the tax of your regime.",
  "Demostración simplificada: la app también considera el DAS o el impuesto de su régimen."
  ],
  "Dentro da meta de 15%": [
  "Within the 15% target",
  "Dentro de la meta del 15%"
  ],
  "Descubra o menor preço que ainda dá lucro. Na sessão, o cronômetro avisa e mostra o maior lance que vence sem passar da sua margem.": [
  "Find the lowest price that still makes a profit. During the session, the timer warns you and shows the highest winning bid that stays within your margin.",
  "Descubra el menor precio que aún da ganancia. En la sesión, el cronómetro avisa y muestra la puja más alta que gana sin pasar su margen."
  ],
  "Detergente e desinfetante": [
  "Detergent and disinfectant",
  "Detergente y desinfectante"
  ],
  "Dias até o órgão pagar": [
  "Days until the agency pays",
  "Días hasta que el organismo pague"
  ],
  "Diga o que vende, a faixa de valor, o estado e a modalidade. O app procura sozinho e dá nota a cada oportunidade.": [
  "Tell it what you sell, the value range, the state and the type. The app searches on its own and scores each opportunity.",
  "Diga qué vende, el rango de valor, el estado y la modalidad. La app busca sola y puntúa cada oportunidad."
  ],
  "Diga quanto quer vender, o que vende e onde. O app encontra oportunidades do governo, organiza as de empresas privadas, avisa quando chegar a hora, lê o edital em minutos, calcula o lance e organiza toda a sua participação, da busca ao recebimento.": [
  "Tell it how much you want to sell, what you sell and where. The app finds government opportunities, organizes the private ones, warns you when the time comes, reads the tender in minutes, calculates the bid and organizes your whole participation, from search to payment.",
  "Diga cuánto quiere vender, qué vende y dónde. La app encuentra oportunidades del gobierno, organiza las de empresas privadas, avisa cuando llega la hora, lee el pliego en minutos, calcula la puja y organiza toda su participación, de la búsqueda al cobro."
  ],
  "Dispensa 45/2026 (exemplo)": [
  "Direct award 45/2026 (example)",
  "Contratación directa 45/2026 (ejemplo)"
  ],
  "Dispensa 45/2026. Material de limpeza": [
  "Direct award 45/2026. Cleaning supplies",
  "Contratación directa 45/2026. Material de limpieza"
  ],
  "Do plano de compras do governo até a sua participação": [
  "From the government purchase plan to your participation",
  "Del plan de compras del gobierno a su participación"
  ],
  "Documentação exigida": [
  "Required documents",
  "Documentación exigida"
  ],
  "Documento vencido (-10)": [
  "Expired document (-10)",
  "Documento vencido (-10)"
  ],
  "Dê este lance agora no portal": [
  "Place this bid now on the portal",
  "Haga esta puja ahora en el portal"
  ],
  "Dúvidas": [
  "FAQ",
  "Dudas"
  ],
  "Dúvidas comuns": [
  "Common questions",
  "Dudas frecuentes"
  ],
  "Edital fictício": [
  "Fictional tender",
  "Pliego ficticio"
  ],
  "Ele dá os lances por mim?": [
  "Does it place bids for me?",
  "¿Hace las pujas por mí?"
  ],
  "Em andamento": [
  "In progress",
  "En curso"
  ],
  "Em breve nas lojas": [
  "Coming soon to the stores",
  "Pronto en las tiendas"
  ],
  "Em dia": [
  "Up to date",
  "Al día"
  ],
  "Em disputa": [
  "In dispute",
  "En disputa"
  ],
  "Em números": [
  "In numbers",
  "En cifras"
  ],
  "Embalagens": [
  "Packaging",
  "Envases"
  ],
  "Empresa com CNPJ ativo no Brasil": [
  "Company with an active CNPJ in Brazil",
  "Empresa con CNPJ activo en Brasil"
  ],
  "Empresas privadas também compram": [
  "Private companies buy too",
  "Las empresas privadas también compran"
  ],
  "Encerra em 00:04:12": [
  "Ends in 00:04:12",
  "Termina en 00:04:12"
  ],
  "Energia, óleo e gás": [
  "Energy, oil and gas",
  "Energía, petróleo y gas"
  ],
  "Entrar": [
  "Sign in",
  "Entrar"
  ],
  "Entrar pelo navegador": [
  "Use in the browser",
  "Entrar por el navegador"
  ],
  "Entre pelo navegador ou baixe o aplicativo": [
  "Use it in the browser or download the app",
  "Entre por el navegador o descargue la app"
  ],
  "Entregue e emita a nota": [
  "Deliver and issue the invoice",
  "Entregue y emita la factura"
  ],
  "Envie o PDF e pergunte. A IA responde só com o que está escrito e mostra a cláusula. Os pontos que mais importam já vêm separados.": [
  "Send the PDF and ask. The AI answers only with what is written and shows the clause. The points that matter most come pre-sorted.",
  "Envíe el PDF y pregunte. La IA responde solo con lo que está escrito y muestra la cláusula. Los puntos que más importan ya vienen separados."
  ],
  "Envie o link para o seu telefone:": [
  "Send the link to your phone:",
  "Envíe el enlace a su teléfono:"
  ],
  "Escolha o que você vende e veja, em poucos minutos, quanto o governo paga e quem está comprando.": [
  "Choose what you sell and see, in a few minutes, how much the government pays and who is buying.",
  "Elija lo que vende y vea, en pocos minutos, cuánto paga el gobierno y quién está comprando."
  ],
  "Escolha por onde entrar": [
  "Choose where to start",
  "Elija por dónde entrar"
  ],
  "Escolha um produto e veja o histórico: valor, quem venceu, de quanto em quanto tempo cada órgão compra e a sua margem se pagarem o preço típico.": [
  "Pick a product and see the history: value, who won, how often each agency buys and your margin if they pay the typical price.",
  "Elija un producto y vea el historial: valor, quién ganó, cada cuánto compra cada organismo y su margen si pagan el precio típico."
  ],
  "Especificação completa dos itens": [
  "Full item specification",
  "Especificación completa de los ítems"
  ],
  "Estatal e marketplace B2B": [
  "State-owned and B2B marketplace",
  "Estatal y marketplace B2B"
  ],
  "Estimativa com desconto composto. Peça sempre o custo efetivo total (CET) à instituição.": [
  "Estimate with compound discount. Always ask the institution for the total effective cost (CET).",
  "Estimación con descuento compuesto. Pida siempre a la institución el costo efectivo total (CET)."
  ],
  "Etapas do caminho": [
  "Steps of the path",
  "Etapas del camino"
  ],
  "Etapas para vender a empresas privadas": [
  "Steps to sell to private companies",
  "Etapas para vender a empresas privadas"
  ],
  "Exemplo fictício. No app, os resultados vêm do PNCP em tempo real e você é avisado quando surgir algo novo.": [
  "Fictional example. In the app, results come from the PNCP in real time and you are notified when something new appears.",
  "Ejemplo ficticio. En la app, los resultados vienen del PNCP en tiempo real y se le avisa cuando surge algo nuevo."
  ],
  "Exemplo ilustrativo": [
  "Illustrative example",
  "Ejemplo ilustrativo"
  ],
  "Exemplo: a prefeitura prevê 500 caixas de papel sulfite para novembro.": [
  "Example: the city hall plans to buy 500 boxes of A4 paper in November.",
  "Ejemplo: la alcaldía prevé 500 cajas de papel A4 para noviembre."
  ],
  "Experimente": [
  "Try it",
  "Pruébelo"
  ],
  "Exterior": [
  "Abroad",
  "Exterior"
  ],
  "Faixa de valor, estados e modalidades": [
  "Value range, states and types",
  "Rango de valor, estados y modalidades"
  ],
  "Faltam 5 segundos": [
  "5 seconds left",
  "Faltan 5 segundos"
  ],
  "Feito para MEI, ME e EPP": [
  "Made for MEI, ME and EPP businesses",
  "Hecho para MEI, ME y EPP"
  ],
  "Financeiro": [
  "Finance",
  "Finanzas"
  ],
  "Fontes oficiais de dados": [
  "Official data sources",
  "Fuentes oficiales de datos"
  ],
  "Fornecedores que mais venceram": [
  "Suppliers who won the most",
  "Proveedores que más ganaron"
  ],
  "Frete total": [
  "Total freight",
  "Flete total"
  ],
  "Funciona no computador e no celular. Sem cadastro para conhecer.": [
  "Works on computer and phone. No sign-up to take a look.",
  "Funciona en ordenador y móvil. Sin registro para conocerla."
  ],
  "Funciona no navegador e no celular?": [
  "Does it work in the browser and on the phone?",
  "¿Funciona en el navegador y en el móvil?"
  ],
  "Ganha": [
  "Won",
  "Ganada"
  ],
  "Garantias": [
  "Guarantees",
  "Garantías"
  ],
  "Grandes compradores convidam fornecedores. O convite chega por e-mail e leva ao cadastro.": [
  "Large buyers invite suppliers. The invitation arrives by e-mail and leads to registration.",
  "Los grandes compradores invitan a proveedores. La invitación llega por correo y lleva al registro."
  ],
  "Guarda a compra prevista, com quantidade, preço unitário e data desejada.": [
  "Stores the planned purchase, with quantity, unit price and desired date.",
  "Guarda la compra prevista, con cantidad, precio unitario y fecha deseada."
  ],
  "Guarda seus dados no seu aparelho, com cofre criptografado e verificação em duas etapas.": [
  "Keeps your data on your device, with an encrypted vault and two-step verification.",
  "Guarda sus datos en su dispositivo, con bóveda cifrada y verificación en dos pasos."
  ],
  "Guarde o comprovante de entrega.": [
  "Keep the delivery receipt.",
  "Guarde el comprobante de entrega."
  ],
  "IA": [
  "AI",
  "IA"
  ],
  "Importante:": [
  "Important:",
  "Importante:"
  ],
  "Inclusive o Pronampe para MEI, ME e EPP": [
  "Including Pronampe for MEI, ME and EPP businesses",
  "Incluido el Pronampe para MEI, ME y EPP"
  ],
  "Indústria e mineração": [
  "Industry and mining",
  "Industria y minería"
  ],
  "Informe quando os lances começam e terminam. A agenda cuida do resto.": [
  "Enter when bidding starts and ends. The schedule takes care of the rest.",
  "Indique cuándo empiezan y terminan las pujas. La agenda se ocupa del resto."
  ],
  "Informática": [
  "Computing",
  "Informática"
  ],
  "Instalar no computador": [
  "Install on your computer",
  "Instalar en el ordenador"
  ],
  "Instituições que aceitam a cessão de crédito do contrato": [
  "Institutions that accept assignment of the contract credit",
  "Instituciones que aceptan la cesión del crédito del contrato"
  ],
  "Intervalo médio entre compras: 90 dias": [
  "Average interval between purchases: 90 days",
  "Intervalo medio entre compras: 90 días"
  ],
  "Itens da nota": [
  "Invoice items",
  "Ítems de la factura"
  ],
  "Lance final": [
  "Final bid",
  "Puja final"
  ],
  "Lance final nos últimos segundos": [
  "Final bid in the last seconds",
  "Puja final en los últimos segundos"
  ],
  "Lance final: automático assistido": [
  "Final bid: assisted automatic",
  "Puja final: automático asistido"
  ],
  "Lance final: manual": [
  "Final bid: manual",
  "Puja final: manual"
  ],
  "Lance por unidade": [
  "Bid per unit",
  "Puja por unidad"
  ],
  "Lance registrado": [
  "Bid recorded",
  "Puja registrada"
  ],
  "Lance sugerido": [
  "Suggested bid",
  "Puja sugerida"
  ],
  "Li o edital. Pergunte o que quiser ou toque em uma pergunta.": [
  "I read the tender notice. Ask anything or tap a question.",
  "Leí el pliego. Pregunte lo que quiera o toque una pregunta."
  ],
  "Licita Lance Certo, início": [
  "Licita Lance Certo, home",
  "Licita Lance Certo, inicio"
  ],
  "Licita Lance Certo: a inteligência que transforma oportunidades públicas e privadas em negócios": [
  "Licita Lance Certo: the intelligence that turns public and private opportunities into business",
  "Licita Lance Certo: la inteligencia que transforma oportunidades públicas y privadas en negocios"
  ],
  "Licita Lance Certo: radar de preços, alertas de oportunidades, leitura de editais por IA, nota fiscal e crédito para quem vende ao governo.": [
  "Licita Lance Certo: price radar, opportunity alerts, AI tender reading, invoicing and credit for those who sell to the government.",
  "Licita Lance Certo: radar de precios, alertas de oportunidades, lectura de pliegos con IA, factura y crédito para quien vende al gobierno."
  ],
  "Limpeza e higiene": [
  "Cleaning and hygiene",
  "Limpieza e higiene"
  ],
  "Linha por linha, com ajuda": [
  "Line by line, with help",
  "Línea por línea, con ayuda"
  ],
  "Lucro": [
  "Profit",
  "Ganancia"
  ],
  "Lucro, margem e custo máximo do fornecedor": [
  "Profit, margin and maximum supplier cost",
  "Ganancia, margen y costo máximo del proveedor"
  ],
  "Luva descartável": [
  "Disposable gloves",
  "Guantes desechables"
  ],
  "Lê dados públicos oficiais e explica o que cada um significa.": [
  "Reads official public data and explains what each item means.",
  "Lee datos públicos oficiales y explica qué significa cada uno."
  ],
  "Lê o que cada órgão planeja comprar no ano (PCA).": [
  "Reads what each agency plans to buy during the year (PCA).",
  "Lee lo que cada organismo planea comprar en el año (PCA)."
  ],
  "Manual": [
  "Manual",
  "Manual"
  ],
  "Margem potencial": [
  "Potential margin",
  "Margen potencial"
  ],
  "Margem potencial (20)": [
  "Potential margin (20)",
  "Margen potencial (20)"
  ],
  "Margem potencial com o seu custo": [
  "Potential margin with your cost",
  "Margen potencial con su costo"
  ],
  "Marketplace B2B da cadeia de energia, óleo e gás. O cadastro de fornecedores da Petrobras fica permanentemente aberto no portal.": [
  "B2B marketplace for the energy, oil and gas supply chain. Petrobras supplier registration stays permanently open on the portal.",
  "Marketplace B2B de la cadena de energía, petróleo y gas. El registro de proveedores de Petrobras permanece siempre abierto en el portal."
  ],
  "Marketplace de saúde": [
  "Healthcare marketplace",
  "Marketplace de salud"
  ],
  "Material de escritório": [
  "Office supplies",
  "Material de oficina"
  ],
  "Material de limpeza e higiene": [
  "Cleaning and hygiene supplies",
  "Material de limpieza e higiene"
  ],
  "Medidor de margem": [
  "Margin gauge",
  "Medidor de margen"
  ],
  "Medidor e simulação do tipo e se?": [
  "Gauge and what-if simulation",
  "Medidor y simulación de \"¿y si?\""
  ],
  "Menor lance do concorrente": [
  "Competitor's lowest bid",
  "Puja más baja del competidor"
  ],
  "Meta R$ 42,00": [
  "Target R$ 42,00",
  "Meta R$ 42,00"
  ],
  "Mineração": [
  "Mining",
  "Minería"
  ],
  "Modalidade": [
  "Type",
  "Modalidad"
  ],
  "Modalidade (10)": [
  "Type (10)",
  "Modalidad (10)"
  ],
  "Monitoramento": [
  "Monitoring",
  "Monitoreo"
  ],
  "Monte a proposta": [
  "Build the proposal",
  "Arme la propuesta"
  ],
  "Mostra de onde veio cada informação do edital.": [
  "Shows where each piece of information in the notice came from.",
  "Muestra de dónde salió cada dato del pliego."
  ],
  "Mostra oportunidades de empresas privadas?": [
  "Does it show opportunities from private companies?",
  "¿Muestra oportunidades de empresas privadas?"
  ],
  "Mostra um painel com plataformas e grandes empresas que cadastram fornecedores, com links oficiais, e uma lista para acompanhar cada cadastro até virar cliente. Não existe uma base pública de cotações privadas, então o app não lista cotações em tempo real: cada empresa publica no seu portal.": [
  "It shows a panel with platforms and large companies that register suppliers, with official links, and a list to track each registration until it becomes a client. There is no public database of private quotes, so the app does not list quotes in real time: each company publishes on its own portal.",
  "Muestra un panel con plataformas y grandes empresas que registran proveedores, con enlaces oficiales, y una lista para seguir cada registro hasta que se convierte en cliente. No existe una base pública de cotizaciones privadas, así que la app no lista cotizaciones en tiempo real: cada empresa publica en su portal."
  ],
  "Motor": [
  "Engine",
  "Motor"
  ],
  "Muitas vezes o cadastro só avança quando existe uma demanda.": [
  "Often the registration only moves forward when there is demand.",
  "Muchas veces el registro solo avanza cuando hay una demanda."
  ],
  "Navegador e celular": [
  "Browser and phone",
  "Navegador y móvil"
  ],
  "Negocie com limite": [
  "Negotiate with a limit",
  "Negocie con un límite"
  ],
  "No Chrome ou no Edge, abra o app e clique no ícone de instalar na barra de endereço. Ele abre em janela própria.": [
  "In Chrome or Edge, open the app and click the install icon in the address bar. It opens in its own window.",
  "En Chrome o Edge, abra la app y haga clic en el icono de instalar de la barra de direcciones. Se abre en su propia ventana."
  ],
  "No app, a cotação vira uma participação na agenda.": [
  "In the app, the quote becomes a participation on the schedule.",
  "En la app, la cotización se convierte en una participación en la agenda."
  ],
  "No celular instalado, o aviso chega mesmo com o app fechado.": [
  "On an installed phone, the alert arrives even with the app closed.",
  "En el móvil con la app instalada, el aviso llega incluso con la app cerrada."
  ],
  "No seu aparelho. Se você ligar a conta na nuvem, o backup sai criptografado com uma senha que o servidor nunca recebe.": [
  "On your device. If you connect the cloud account, the backup leaves encrypted with a password the server never receives.",
  "En su dispositivo. Si conecta la cuenta en la nube, la copia de seguridad sale cifrada con una contraseña que el servidor nunca recibe."
  ],
  "Nos últimos segundos, o painel mostra o valor certo para você.": [
  "In the last seconds, the panel shows the right value for you.",
  "En los últimos segundos, el panel muestra el valor correcto para usted."
  ],
  "Nota fiscal passo a passo": [
  "Invoice step by step",
  "Factura paso a paso"
  ],
  "Não calcula impostos nem substitui o seu contador.": [
  "It does not calculate taxes or replace your accountant.",
  "No calcula impuestos ni sustituye a su contador."
  ],
  "Não dá lances no seu lugar. Você digita o valor no portal.": [
  "It does not place bids for you. You type the value on the portal.",
  "No hace pujas por usted. Usted escribe el valor en el portal."
  ],
  "Não emite nota fiscal sem um emissor com o seu certificado digital.": [
  "It does not issue invoices without an issuer using your digital certificate.",
  "No emite facturas sin un emisor con su certificado digital."
  ],
  "Não. Cada tela explica o que fazer, e o app tem guias passo a passo.": [
  "No. Each screen explains what to do, and the app has step-by-step guides.",
  "No. Cada pantalla explica qué hacer, y la app tiene guías paso a paso."
  ],
  "Não. O app mostra o cronômetro, calcula o lance que vence sem passar da sua margem e, no modo assistido, copia o valor nos últimos segundos. Quem cola e envia no portal é você. Robôs que dão lances sozinhos costumam ser proibidos pelos portais.": [
  "No. The app shows the timer, calculates the winning bid that stays within your margin and, in assisted mode, copies the value in the last seconds. You are the one who pastes and sends it on the portal. Bots that place bids on their own are usually forbidden by the portals.",
  "No. La app muestra el cronómetro, calcula la puja que gana sin pasar su margen y, en modo asistido, copia el valor en los últimos segundos. Quien pega y envía en el portal es usted. Los robots que pujan solos suelen estar prohibidos en los portales."
  ],
  "O app não envia o lance. No modo assistido ele abre o aviso, toca o alarme e copia o valor sozinho. Quem cola e envia no portal é você.": [
  "The app does not send the bid. In assisted mode it opens the alert, sounds the alarm and copies the value on its own. You are the one who pastes and sends it on the portal.",
  "La app no envía la puja. En modo asistido abre el aviso, suena la alarma y copia el valor solo. Quien pega y envía en el portal es usted."
  ],
  "O fornecedor recebe um convite por e-mail do comprador e completa o cadastro para entrar na rede.": [
  "The supplier receives an e-mail invitation from the buyer and completes registration to join the network.",
  "El proveedor recibe una invitación por correo del comprador y completa el registro para entrar en la red."
  ],
  "O governo paga depois da entrega, e o fornecedor compra antes. Simule o custo de antecipar um recebível e compare as propostas que você receber.": [
  "The government pays after delivery, and the supplier buys beforehand. Simulate the cost of advancing a receivable and compare the offers you receive.",
  "El gobierno paga después de la entrega, y el proveedor compra antes. Simule el costo de anticipar un cobro y compare las propuestas que reciba."
  ],
  "O governo publica o que pretende comprar e, depois, abre a compra. O Licita Lance Certo acompanha esse caminho para você chegar primeiro e decidir com números. Toque em cada etapa.": [
  "The government publishes what it plans to buy and then opens the purchase. Licita Lance Certo follows that path so you arrive first and decide with numbers. Tap each step.",
  "El gobierno publica lo que pretende comprar y luego abre la compra. Licita Lance Certo sigue ese camino para que usted llegue primero y decida con números. Toque cada etapa."
  ],
  "O mesmo aplicativo, no computador e no celular. Escolha o jeito que preferir.": [
  "The same app, on computer and phone. Choose the way you prefer.",
  "La misma app, en ordenador y móvil. Elija la forma que prefiera."
  ],
  "O portal tem a área \"Seja um fornecedor\" para cadastrar a empresa na base de fornecedores.": [
  "The portal has a \"Become a supplier\" area to register the company in the supplier database.",
  "El portal tiene el área \"Sea un proveedor\" para registrar la empresa en la base de proveedores."
  ],
  "O que desclassifica?": [
  "What disqualifies a bid?",
  "¿Qué descalifica?"
  ],
  "O que faz": [
  "What it does",
  "Lo que hace"
  ],
  "O que não faz": [
  "What it does not do",
  "Lo que no hace"
  ],
  "O que o Licita Lance Certo faz, e o que não faz": [
  "What Licita Lance Certo does, and what it does not",
  "Lo que hace Licita Lance Certo, y lo que no hace"
  ],
  "O que os órgãos compraram antes": [
  "What agencies bought before",
  "Lo que compraron antes los organismos"
  ],
  "O que você vende?": [
  "What do you sell?",
  "¿Qué vende?"
  ],
  "O resumo feito por IA pode errar: confira o edital original.": [
  "The AI summary can make mistakes: check the original tender notice.",
  "El resumen hecho por IA puede equivocarse: confirme el pliego original."
  ],
  "Onde ficam os meus dados?": [
  "Where is my data stored?",
  "¿Dónde están mis datos?"
  ],
  "Onde?": [
  "Where?",
  "¿Dónde?"
  ],
  "Open Finance": [
  "Open Finance",
  "Open Finance"
  ],
  "Open Finance Brasil": [
  "Open Finance Brazil",
  "Open Finance Brasil"
  ],
  "Oportunidades chegando até você": [
  "Opportunities coming to you",
  "Oportunidades que llegan a usted"
  ],
  "Oportunidades entre empresas privadas (B2B) não têm base pública. Os resultados abaixo são exemplos fictícios.": [
  "Opportunities between private companies (B2B) have no public database. The results below are fictional examples.",
  "Las oportunidades entre empresas privadas (B2B) no tienen base pública. Los resultados de abajo son ejemplos ficticios."
  ],
  "Opportunity Score em cada resultado": [
  "Opportunity Score on every result",
  "Opportunity Score en cada resultado"
  ],
  "Opportunity Score: quanto vale a pena disputar": [
  "Opportunity Score: how worthwhile it is to compete",
  "Opportunity Score: cuánto vale la pena disputar"
  ],
  "Os pedidos chegam pelo portal ou por e-mail. Veja prazo, especificação, volume, local e condição de pagamento.": [
  "Requests arrive through the portal or by e-mail. Check the deadline, specification, volume, location and payment terms.",
  "Los pedidos llegan por el portal o por correo. Vea plazo, especificación, volumen, lugar y condición de pago."
  ],
  "Os planos ainda não foram definidos. Esta página será atualizada quando estiverem prontos.": [
  "Plans have not been defined yet. This page will be updated when they are ready.",
  "Los planes aún no están definidos. Esta página se actualizará cuando estén listos."
  ],
  "Os órgãos pagam em reais.": [
  "Agencies pay in reais.",
  "Los organismos pagan en reales."
  ],
  "Papel e celulose": [
  "Paper and pulp",
  "Papel y celulosa"
  ],
  "Papel higiênico e papel toalha": [
  "Toilet paper and paper towels",
  "Papel higiénico y toallas de papel"
  ],
  "Papel sulfite A4": [
  "A4 copy paper",
  "Papel A4"
  ],
  "Papel, celulose e embalagens": [
  "Paper, pulp and packaging",
  "Papel, celulosa y envases"
  ],
  "Para quem mora no Brasil ou fora": [
  "For those who live in Brazil or abroad",
  "Para quien vive en Brasil o fuera"
  ],
  "Participação": [
  "Participation",
  "Participación"
  ],
  "Passe pela homologação": [
  "Go through approval",
  "Pase la homologación"
  ],
  "Passo 4 de 8": [
  "Step 4 of 8",
  "Paso 4 de 8"
  ],
  "Pelo portal da empresa ou por indicação de um comprador da área que precisa do seu produto.": [
  "Through the company portal or by referral from a buyer in the area that needs your product.",
  "Por el portal de la empresa o por recomendación de un comprador del área que necesita su producto."
  ],
  "Pendências antes que virem problema": [
  "Pending items before they become a problem",
  "Pendientes antes de que se vuelvan un problema"
  ],
  "Percebe quando a dispensa ou o pregão do que foi previsto é publicado.": [
  "Notices when the direct award or auction for what was forecast is published.",
  "Detecta cuando se publica la contratación directa o la subasta de lo que se había previsto."
  ],
  "Peça o cadastro": [
  "Request registration",
  "Pida el registro"
  ],
  "Piso R$ 36,26": [
  "Floor R$ 36,26",
  "Piso R$ 36,26"
  ],
  "Plano de compras": [
  "Purchase plan",
  "Plan de compras"
  ],
  "Plataforma de compras": [
  "Procurement platform",
  "Plataforma de compras"
  ],
  "Plataformas de compras": [
  "Procurement platforms",
  "Plataformas de compras"
  ],
  "Plataformas de compras ou o portal de fornecedores da empresa que você quer atender.": [
  "Procurement platforms or the supplier portal of the company you want to serve.",
  "Plataformas de compras o el portal de proveedores de la empresa que quiere atender."
  ],
  "Portal de fornecedores": [
  "Supplier portal",
  "Portal de proveedores"
  ],
  "Posso conectar a minha conta bancária?": [
  "Can I connect my bank account?",
  "¿Puedo conectar mi cuenta bancaria?"
  ],
  "Posso participar morando fora do Brasil?": [
  "Can I take part while living outside Brazil?",
  "¿Puedo participar viviendo fuera de Brasil?"
  ],
  "Prazo e local de entrega": [
  "Delivery deadline and location",
  "Plazo y lugar de entrega"
  ],
  "Prazo para a proposta": [
  "Proposal deadline",
  "Plazo para la propuesta"
  ],
  "Prazo para a proposta (15)": [
  "Proposal deadline (15)",
  "Plazo para la propuesta (15)"
  ],
  "Preciso de amostra?": [
  "Do I need a sample?",
  "¿Necesito muestra?"
  ],
  "Preciso entender de tecnologia para usar?": [
  "Do I need to understand technology to use it?",
  "¿Necesito entender de tecnología para usarla?"
  ],
  "Preencha a NF-e com explicação em cada campo e envie ao emissor, ou copie os dados para o emissor gratuito da SEFAZ.": [
  "Fill in the electronic invoice with an explanation for each field and send it to the issuer, or copy the data into the free SEFAZ issuer.",
  "Complete la factura electrónica con explicación en cada campo y envíela al emisor, o copie los datos al emisor gratuito de la SEFAZ."
  ],
  "Preenche o órgão e o item a partir da licitação": [
  "Fills in the agency and item from the tender",
  "Completa el organismo y el ítem a partir de la licitación"
  ],
  "Prefeitura de Campinas, SP. Propostas até 09/10": [
  "Campinas City Hall, SP. Proposals until 09/10",
  "Alcaldía de Campinas, SP. Propuestas hasta 09/10"
  ],
  "Prefeitura de Campinas. Horário de Brasília": [
  "Campinas City Hall. Brasília time",
  "Alcaldía de Campinas. Horario de Brasilia"
  ],
  "Prejuízo": [
  "Loss",
  "Pérdida"
  ],
  "Prepare a empresa": [
  "Prepare the company",
  "Prepare la empresa"
  ],
  "Previsão": [
  "Forecast",
  "Previsión"
  ],
  "Preço acima do valor de referência, proposta fora das especificações, amostra não entregue no prazo ou reprovada e documento vencido na sessão.": [
  "Price above the reference value, proposal outside the specifications, sample not delivered on time or rejected, and an expired document during the session.",
  "Precio por encima del valor de referencia, propuesta fuera de las especificaciones, muestra no entregada a tiempo o rechazada y documento vencido en la sesión."
  ],
  "Preço unitário típico": [
  "Typical unit price",
  "Precio unitario típico"
  ],
  "Preço unitário típico, estimado do texto do contrato": [
  "Typical unit price, estimated from the contract text",
  "Precio unitario típico, estimado del texto del contrato"
  ],
  "Prioridade alta": [
  "High priority",
  "Prioridad alta"
  ],
  "Privadas": [
  "Private",
  "Privadas"
  ],
  "Procuração para assinar e receber notificações.": [
  "Power of attorney to sign and receive notifications.",
  "Poder para firmar y recibir notificaciones."
  ],
  "Produtos e CNAE da sua empresa": [
  "Products and CNAE of your company",
  "Productos y CNAE de su empresa"
  ],
  "Pronto": [
  "Ready",
  "Listo"
  ],
  "Proposta enviada": [
  "Proposal sent",
  "Propuesta enviada"
  ],
  "Próxima: 04/10": [
  "Next: 04/10",
  "Próxima: 04/10"
  ],
  "Publicação": [
  "Publication",
  "Publicación"
  ],
  "Pular para o conteúdo": [
  "Skip to content",
  "Saltar al contenido"
  ],
  "Páginas oficiais e informações de imprensa conferidas em outubro de 2026. Não existe uma base pública única de cotações privadas: cada empresa publica no seu portal.": [
  "Official pages and press information checked in October 2026. There is no single public database of private quotes: each company publishes on its own portal.",
  "Páginas oficiales e información de prensa verificadas en octubre de 2026. No existe una base pública única de cotizaciones privadas: cada empresa publica en su portal."
  ],
  "Quais documentos preciso?": [
  "Which documents do I need?",
  "¿Qué documentos necesito?"
  ],
  "Qual o prazo de entrega?": [
  "What is the delivery deadline?",
  "¿Cuál es el plazo de entrega?"
  ],
  "Quando identifica uma possível fornecedora, envia convite por e-mail para o portal de cadastro.": [
  "When it identifies a potential supplier, it sends an e-mail invitation to the registration portal.",
  "Cuando identifica a un posible proveedor, envía una invitación por correo al portal de registro."
  ],
  "Quantidade": [
  "Quantity",
  "Cantidad"
  ],
  "Quanto custa?": [
  "How much does it cost?",
  "¿Cuánto cuesta?"
  ],
  "Quanto você quer vender?": [
  "How much do you want to sell?",
  "¿Cuánto quiere vender?"
  ],
  "Quanto você quer vender? O que você vende? Onde? O Lance Certo procura nas contratações públicas, dá uma nota a cada oportunidade e avisa quando aparecer algo compatível.": [
  "How much do you want to sell? What do you sell? Where? Lance Certo searches public procurement, scores each opportunity and warns you when something compatible appears.",
  "¿Cuánto quiere vender? ¿Qué vende? ¿Dónde? Lance Certo busca en las contrataciones públicas, da una nota a cada oportunidad y avisa cuando aparece algo compatible."
  ],
  "Quem digita o valor no portal é você: o app não envia lances.": [
  "You are the one who types the value on the portal: the app does not send bids.",
  "Quien escribe el valor en el portal es usted: la app no envía pujas."
  ],
  "Quer abrir no celular?": [
  "Want to open it on your phone?",
  "¿Quiere abrirla en el móvil?"
  ],
  "por un.": [
  "per unit",
  "por un."
  ],
  "R$ 48,90 por unidade": [
  "R$ 48,90 per unit",
  "R$ 48,90 por unidad"
  ],
  "Radar de produtos": [
  "Product radar",
  "Radar de productos"
  ],
  "Radar ligado: oportunidades do governo, em tempo real": [
  "Radar on: government opportunities, in real time",
  "Radar activado: oportunidades del gobierno, en tiempo real"
  ],
  "Receba convites e cotações": [
  "Receive invitations and quotes",
  "Reciba invitaciones y cotizaciones"
  ],
  "Recebida": [
  "Received",
  "Recibida"
  ],
  "Rede de compradores": [
  "Buyer network",
  "Red de compradores"
  ],
  "Regularidade do CNPJ": [
  "CNPJ compliance",
  "Regularidad del CNPJ"
  ],
  "Relação com o órgão": [
  "Relationship with the agency",
  "Relación con el organismo"
  ],
  "Relação com o órgão (10)": [
  "Relationship with the agency (10)",
  "Relación con el organismo (10)"
  ],
  "Representante no Brasil, se precisar": [
  "Representative in Brazil, if needed",
  "Representante en Brasil, si lo necesita"
  ],
  "Requisitos para participar": [
  "Requirements to take part",
  "Requisitos para participar"
  ],
  "Responda rápido e mantenha tudo atualizado.": [
  "Respond quickly and keep everything up to date.",
  "Responda rápido y mantenga todo actualizado."
  ],
  "Resume o edital, mostra o Opportunity Score e calcula a sua margem.": [
  "Summarizes the notice, shows the Opportunity Score and calculates your margin.",
  "Resume el pliego, muestra el Opportunity Score y calcula su margen."
  ],
  "Revisão": [
  "Review",
  "Revisión"
  ],
  "Revisão que aponta o que falta": [
  "A review that points out what is missing",
  "Revisión que señala lo que falta"
  ],
  "Reúne os documentos de habilitação.": [
  "Gathers the qualification documents.",
  "Reúne los documentos de habilitación."
  ],
  "Salva a licitação, mostra o cronômetro e o maior lance que vence sem passar da sua margem.": [
  "Saves the tender, shows the timer and the highest winning bid that stays within your margin.",
  "Guarda la licitación, muestra el cronómetro y la puja más alta que gana sin pasar su margen."
  ],
  "Salve a oportunidade e defina a meta de lance.": [
  "Save the opportunity and set the bid target.",
  "Guarde la oportunidad y defina la meta de puja."
  ],
  "Saúde": [
  "Healthcare",
  "Salud"
  ],
  "Segmento": [
  "Segment",
  "Segmento"
  ],
  "Seguro-garantia e fiança bancária": [
  "Surety bond and bank guarantee",
  "Seguro de caución y fianza bancaria"
  ],
  "Selecionada": [
  "Selected",
  "Seleccionada"
  ],
  "Sessão de lances": [
  "Bidding session",
  "Sesión de pujas"
  ],
  "Seu piso (margem de 15%)": [
  "Your floor (15% margin)",
  "Su piso (margen del 15%)"
  ],
  "Seu piso antes de disputar": [
  "Your floor before bidding",
  "Su piso antes de disputar"
  ],
  "Seções do site": [
  "Site sections",
  "Secciones del sitio"
  ],
  "Siga o prazo e o local do pedido. Muitas empresas pedem a nota pelo próprio portal.": [
  "Follow the order's deadline and location. Many companies ask for the invoice through their own portal.",
  "Siga el plazo y el lugar del pedido. Muchas empresas piden la factura por su propio portal."
  ],
  "Sim, em modo leitura, por Open Finance. Você autoriza no seu banco, o app nunca vê a sua senha e não movimenta dinheiro. Serve para ver saldo e conciliar os pagamentos dos órgãos.": [
  "Yes, read-only, through Open Finance. You authorize at your bank, the app never sees your password and does not move money. It is used to see your balance and reconcile payments from agencies.",
  "Sí, en modo lectura, por Open Finance. Usted autoriza en su banco, la app nunca ve su contraseña y no mueve dinero. Sirve para ver el saldo y conciliar los pagos de los organismos."
  ],
  "Sim. O aplicativo abre no navegador (no endereço /app/), pode ser instalado na tela inicial e abre sem internet. Pela loja, no Android e no iPhone, ele também consulta direto o PNCP e envia alertas.": [
  "Yes. The app opens in the browser (at the /app/ address), can be installed on your home screen and opens without internet. Through the store, on Android and iPhone, it also queries the PNCP directly and sends alerts.",
  "Sí. La app se abre en el navegador (en la dirección /app/), se puede instalar en la pantalla de inicio y abre sin internet. Por la tienda, en Android y iPhone, también consulta directamente el PNCP y envía alertas."
  ],
  "Sim. O licitante em primeiro lugar entrega 1 amostra de cada item em até 3 dias úteis após a convocação, junto com catálogo ou folha técnica.": [
  "Yes. The first-placed bidder delivers 1 sample of each item within 3 business days after being called, together with a catalog or technical sheet.",
  "Sí. El licitante en primer lugar entrega 1 muestra de cada ítem en hasta 3 días hábiles tras la convocatoria, junto con catálogo o ficha técnica."
  ],
  "Simulador de lance": [
  "Bid simulator",
  "Simulador de puja"
  ],
  "Simular os últimos segundos": [
  "Simulate the last seconds",
  "Simular los últimos segundos"
  ],
  "Simule um lance agora": [
  "Simulate a bid now",
  "Simule una puja ahora"
  ],
  "Simule uma antecipação": [
  "Simulate an advance",
  "Simule un anticipo"
  ],
  "Situação cadastral": [
  "Registration status",
  "Situación cadastral"
  ],
  "Situação cadastral, DAS, declaração anual e certidões, com aviso antes de vencer. O DAS é controlado pelo que você marca.": [
  "Registration status, DAS, annual declaration and certificates, with a warning before they expire. The DAS is tracked from what you mark.",
  "Situación cadastral, DAS, declaración anual y certificados, con aviso antes de vencer. El DAS se controla según lo que usted marca."
  ],
  "Sua margem ao preço típico": [
  "Your margin at the typical price",
  "Su margen al precio típico"
  ],
  "Sugestão de lance dentro da margem": [
  "Bid suggestion within the margin",
  "Sugerencia de puja dentro del margen"
  ],
  "Tarifas": [
  "Fees",
  "Tarifas"
  ],
  "Taxa ao mês": [
  "Monthly rate",
  "Tasa mensual"
  ],
  "Tecnologia brasileira para compras corporativas, com comunidade de compradores e fornecedores.": [
  "Brazilian technology for corporate purchasing, with a community of buyers and suppliers.",
  "Tecnología brasileña para compras corporativas, con comunidad de compradores y proveedores."
  ],
  "Tema: auto. Toque para mudar.": [
  "Theme: auto. Tap to change.",
  "Tema: auto. Toque para cambiar."
  ],
  "Tema: claro. Toque para mudar.": [
  "Theme: light. Tap to change.",
  "Tema: claro. Toque para cambiar."
  ],
  "Tema: escuro. Toque para mudar.": [
  "Theme: dark. Tap to change.",
  "Tema: oscuro. Toque para cambiar."
  ],
  "Mudar o tema": [
  "Change theme",
  "Cambiar el tema"
  ],
  "Idioma": [
  "Language",
  "Idioma"
  ],
  "Terminam os lances": [
  "Bidding ends",
  "Terminan las pujas"
  ],
  "Tesouro Nacional (SICONFI)": [
  "National Treasury (SICONFI)",
  "Tesoro Nacional (SICONFI)"
  ],
  "Todas": [
  "All",
  "Todas"
  ],
  "Total da nota": [
  "Invoice total",
  "Total de la factura"
  ],
  "Transparência:": [
  "Transparency:",
  "Transparencia:"
  ],
  "Tributos, notas fiscais e declarações.": [
  "Taxes, invoices and declarations.",
  "Tributos, facturas y declaraciones."
  ],
  "Três perguntas e o radar começa a trabalhar": [
  "Three questions and the radar starts working",
  "Tres preguntas y el radar empieza a trabajar"
  ],
  "Tudo o que um fornecedor precisa, em um só lugar": [
  "Everything a supplier needs, in one place",
  "Todo lo que un proveedor necesita, en un solo lugar"
  ],
  "Tudo preenchido": [
  "All filled in",
  "Todo completado"
  ],
  "Uniformes e EPI": [
  "Uniforms and PPE",
  "Uniformes y EPP"
  ],
  "Usa SAP Ariba e Coupa para cotações (RFI, RFP e leilões) e para o registro e a qualificação de fornecedores.": [
  "Uses SAP Ariba and Coupa for quotes (RFI, RFP and auctions) and for supplier registration and qualification.",
  "Usa SAP Ariba y Coupa para cotizaciones (RFI, RFP y subastas) y para el registro y la calificación de proveedores."
  ],
  "Use a calculadora para achar o seu piso de margem. Informe preço, prazo, validade e condições.": [
  "Use the calculator to find your margin floor. Enter price, deadline, validity and terms.",
  "Use la calculadora para hallar su piso de margen. Indique precio, plazo, validez y condiciones."
  ],
  "Valor a receber": [
  "Amount to receive",
  "Valor a cobrar"
  ],
  "Valor copiado. Cole no portal e envie.": [
  "Value copied. Paste it on the portal and send.",
  "Valor copiado. Péguelo en el portal y envíe."
  ],
  "Valor na sua faixa": [
  "Value within your range",
  "Valor en su rango"
  ],
  "Valor na sua faixa (15)": [
  "Value within your range (15)",
  "Valor en su rango (15)"
  ],
  "Vence em 5 dias": [
  "Due in 5 days",
  "Vence en 5 días"
  ],
  "Verificada há 12 dias": [
  "Checked 12 days ago",
  "Verificada hace 12 días"
  ],
  "Você decide em minutos se vale a pena disputar.": [
  "You decide in minutes whether it is worth competing.",
  "Usted decide en minutos si vale la pena disputar."
  ],
  "Você recebe hoje": [
  "You receive today",
  "Usted recibe hoy"
  ],
  "Você vê quanto o órgão pretende gastar e com que frequência compra.": [
  "You see how much the agency plans to spend and how often it buys.",
  "Usted ve cuánto pretende gastar el organismo y con qué frecuencia compra."
  ],
  "as regras variam por órgão e por situação. Confirme cada ponto com um contador ou advogado no Brasil. O roteiro é um apoio, não orientação jurídica.": [
  "rules vary by agency and by situation. Confirm each point with an accountant or lawyer in Brazil. The checklist is a support tool, not legal advice.",
  "las reglas varían según el organismo y la situación. Confirme cada punto con un contador o abogado en Brasil. La lista es un apoyo, no orientación jurídica."
  ],
  "em negócios": [
  "into business",
  "en negocios"
  ],
  "estados com portal de compras no atalho": [
  "states with a procurement portal shortcut",
  "estados con atajo al portal de compras"
  ],
  "etapas do processo, da busca ao recebimento": [
  "process steps, from search to payment",
  "etapas del proceso, de la búsqueda al cobro"
  ],
  "fontes oficiais de dados públicos": [
  "official public data sources",
  "fuentes oficiales de datos públicos"
  ],
  "hoje o Licita Lance Certo não tem parceiros financeiros ativos e não recebe comissão. Qualquer parceria futura será avisada antes de você contratar.": [
  "today Licita Lance Certo has no active financial partners and receives no commission. Any future partnership will be announced before you sign up.",
  "hoy Licita Lance Certo no tiene socios financieros activos y no recibe comisión. Cualquier alianza futura se avisará antes de que usted contrate."
  ],
  "modalidades de licitação explicadas passo a passo": [
  "bidding types explained step by step",
  "modalidades de licitación explicadas paso a paso"
  ],
  "oportunidades públicas": [
  "public opportunities",
  "oportunidades públicas"
  ],
  "É um leilão (-30)": [
  "It is an auction (-30)",
  "Es una subasta (-30)"
  ],
  "Órgãos que compram e a próxima compra provável": [
  "Agencies that buy and the likely next purchase",
  "Organismos que compran y la próxima compra probable"
  ],
  "Propostas em": [
  "Proposals in",
  "Propuestas en"
  ],
  "Link copiado.": [
  "Link copied.",
  "Enlace copiado."
  ],
  "Copie o link:": [
  "Copy the link:",
  "Copie el enlace:"
  ],
  "Abra o Licita Lance Certo no navegador do seu celular:": [
  "Open Licita Lance Certo in your phone's browser:",
  "Abra Licita Lance Certo en el navegador de su móvil:"
  ],
  "Para o seu aparelho": [
  "For your device",
  "Para su dispositivo"
  ],
  "Prefeitura de Campinas": [
  "Campinas City Hall",
  "Alcaldía de Campinas"
  ],
  "Câmara de Santos": [
  "Santos City Council",
  "Concejo de Santos"
  ],
  "Hospital Municipal de Sorocaba": [
  "Sorocaba Municipal Hospital",
  "Hospital Municipal de Sorocaba"
  ],
  "Prefeitura de Contagem": [
  "Contagem City Hall",
  "Alcaldía de Contagem"
  ],
  "Câmara de Uberlândia": [
  "Uberlândia City Council",
  "Concejo de Uberlândia"
  ],
  "Hospital Municipal de BH": [
  "Belo Horizonte Municipal Hospital",
  "Hospital Municipal de BH"
  ],
  "Prefeitura de Niterói": [
  "Niterói City Hall",
  "Alcaldía de Niterói"
  ],
  "Câmara de Petrópolis": [
  "Petrópolis City Council",
  "Concejo de Petrópolis"
  ],
  "Fundação de Saúde de Macaé": [
  "Macaé Health Foundation",
  "Fundación de Salud de Macaé"
  ],
  "Prefeitura de Londrina": [
  "Londrina City Hall",
  "Alcaldía de Londrina"
  ],
  "Câmara de Curitiba": [
  "Curitiba City Council",
  "Concejo de Curitiba"
  ],
  "Hospital de Maringá": [
  "Maringá Hospital",
  "Hospital de Maringá"
  ],
  "Papel A4 e material de expediente": [
  "A4 paper and office supplies",
  "Papel A4 y material de oficina"
  ],
  "Canetas e pastas": [
  "Pens and folders",
  "Bolígrafos y carpetas"
  ],
  "Toner e papelaria": [
  "Toner and stationery",
  "Tóner y papelería"
  ],
  "Notebooks e monitores": [
  "Laptops and monitors",
  "Portátiles y monitores"
  ],
  "Impressoras e toner": [
  "Printers and toner",
  "Impresoras y tóner"
  ],
  "Periféricos e cabos": [
  "Peripherals and cables",
  "Periféricos y cables"
  ],
  "Gêneros alimentícios para merenda": [
  "Food supplies for school meals",
  "Alimentos para la merienda escolar"
  ],
  "Cesta básica": [
  "Basic food basket",
  "Canasta básica"
  ],
  "Água mineral e café": [
  "Mineral water and coffee",
  "Agua mineral y café"
  ],
  "Uniformes para servidores": [
  "Uniforms for civil servants",
  "Uniformes para funcionarios"
  ],
  "Luvas e máscaras": [
  "Gloves and masks",
  "Guantes y mascarillas"
  ],
  "Botas e capacetes": [
  "Boots and helmets",
  "Botas y cascos"
  ],
  "Papel higiênico, papel toalha": [
  "Toilet paper, paper towels",
  "Papel higiénico, toallas de papel"
  ],
  "Abaixo da meta de 15%": [
  "Below the 15% target",
  "Por debajo de la meta del 15%"
  ]
  });

  Object.assign(D, {
    "Planos": ["Plans", "Planes"],
    "Planos para cada fase da sua empresa": ["Plans for every stage of your company", "Planes para cada etapa de su empresa"],
    "Comece grátis e assine quando quiser liberar toda a central de gestão para vender ao governo.": ["Start free and subscribe when you want the whole management center for selling to the government.", "Empiece gratis y suscríbase cuando quiera toda la central de gestión para vender al gobierno."],
    "Grátis": ["Free", "Gratis"],
    "para sempre": ["forever", "para siempre"],
    "Para conhecer o app": ["To get to know the app", "Para conocer la app"],
    "Calculadora de lance e margem": ["Bid and margin calculator", "Calculadora de oferta y margen"],
    "Licitações e documentos": ["Tenders and documents", "Licitaciones y documentos"],
    "Busca de editais e portais": ["Tender search and portals", "Búsqueda de pliegos y portales"],
    "Começar grátis": ["Start free", "Empezar gratis"],
    "Mensal": ["Monthly", "Mensual"],
    "/mês": ["/month", "/mes"],
    "Sem fidelidade": ["No lock-in", "Sin permanencia"],
    "Tudo do plano Grátis": ["Everything in the Free plan", "Todo del plan Gratis"],
    "Central B2G completa": ["Full B2G center", "Central B2G completa"],
    "Propostas com o seu logo": ["Proposals with your logo", "Propuestas con su logo"],
    "Jurídico com IA": ["Legal with AI", "Jurídico con IA"],
    "NF-e, financeiro e bancos": ["Invoicing, finance and banks", "Factura electrónica, finanzas y bancos"],
    "Motor, radar e alertas": ["Engine, radar and alerts", "Motor, radar y alertas"],
    "Busca de fornecedores com IA": ["Supplier search with AI", "Búsqueda de proveedores con IA"],
    "Assinar mensal": ["Subscribe monthly", "Suscribirse mensual"],
    "Semestral": ["Semiannual", "Semestral"],
    "/6 meses": ["/6 months", "/6 meses"],
    "Economize 23%": ["Save 23%", "Ahorre 23%"],
    "Assinar semestral": ["Subscribe semiannual", "Suscribirse semestral"],
    "Anual": ["Annual", "Anual"],
    "/12 meses": ["/12 months", "/12 meses"],
    "Economize 41% · melhor valor": ["Save 41% · best value", "Ahorre 41% · mejor valor"],
    "Assinar anual": ["Subscribe annual", "Suscribirse anual"],
    "R$ 215,00 por mês": ["R$ 215.00 per month", "R$ 215,00 por mes"],
    "R$ 163,33 por mês": ["R$ 163.33 per month", "R$ 163,33 por mes"],
    "O plano Grátis não custa nada e mostra o básico. Os planos pagos são mensal, semestral e anual e liberam todas as ferramentas. Veja os valores na seção Planos.": ["The Free plan costs nothing and shows the basics. Paid plans are monthly, semiannual and annual and unlock every tool. See the prices in the Plans section.", "El plan Gratis no cuesta nada y muestra lo básico. Los planes de pago son mensual, semestral y anual y liberan todas las herramientas. Vea los precios en la sección Planos."]
  });

  menu(); observa(); define(inicial(), false, true);
})();
