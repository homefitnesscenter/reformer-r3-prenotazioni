/* Reformer R3 · Prenotazioni — logica della pagina.
   I valori (prezzi, acconti, recapiti, invio) arrivano da js/config.js (oggetto PRENOTAZIONI).
   Senza `invio.endpoint` il sito non invia né salva dati: prepara il messaggio e apre email o WhatsApp. */

(() => {
  const C = window.PRENOTAZIONI;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Formati ---------- */
  // formato italiano scritto a mano: Intl in italiano non mette il punto sotto 10.000 (5490,00)
  const fmt = (cent) => {
    const [i, d] = (Math.abs(cent) / 100).toFixed(2).split('.');
    return `${cent < 0 ? '−' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d} €`;
  };
  const pct = (n) => `${String(n).replace('.', ',')}%`;

  /* ---------- Conteggio eventi (per misurare le conversioni) ---------- */
  // Se in pagina c'è Google Tag Manager / GA4 (dataLayer) o gtag, gli eventi arrivano lì.
  // Senza strumenti di statistica non succede niente.
  const traccia = (evento, dati = {}) => {
    const d = { event: `r3_${evento}`, ...dati };
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(d);
    if (typeof window.gtag === 'function') window.gtag('event', `r3_${evento}`, dati);
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-evento]');
    if (el && el.dataset.evento !== 'invio_richiesta') traccia(el.dataset.evento);
  });

  // provenienza della visita (campagne): finisce nel messaggio e nell'invio
  const provenienza = (() => {
    try {
      const u = new URL(location.href); const o = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => { const v = u.searchParams.get(k); if (v) o[k] = v.slice(0, 80); });
      return o;
    } catch (e) { return {}; }
  })();

  /* ---------- Calcolo (in centesimi, così gli arrotondamenti tornano esatti) ---------- */
  const calcola = (tipo, quantita) => {
    const cl = C.clienti[tipo];
    const q = Math.min(Math.max(1, Math.round(quantita) || 1), cl.quantitaMax);
    const iva = C.ivaPercento / 100, sconto = (C.scontoPercento || 0) / 100;
    let unitario, imponibile, ivaC, totale;
    if (cl.prezzoIvaInclusa != null) {
      unitario = Math.round(cl.prezzoIvaInclusa * 100 * (1 - sconto));
      totale = unitario * q; imponibile = Math.round(totale / (1 + iva)); ivaC = totale - imponibile;
    } else {
      const fascia = cl.fasce.filter((f) => q >= f.da).pop();
      unitario = Math.round(fascia.prezzo * 100 * (1 - sconto));
      imponibile = unitario * q; ivaC = Math.round(imponibile * iva); totale = imponibile + ivaC;
    }
    const acconto = Math.round(totale * cl.accontoPercento / 100);
    const azienda = cl.prezzoIvaInclusa == null;
    const leasing = azienda && C.leasing && C.leasing.attivo ? Math.round(imponibile * C.leasing.coefficienteMensile) : null;
    return { tipo, cl, q, unitario, imponibile, iva: ivaC, totale, acconto, saldo: totale - acconto, leasing, azienda };
  };

  /* ---------- Testi dalla configurazione ---------- */
  const minStudio = Math.min(...C.clienti.studio.fasce.map((f) => f.prezzo));
  const maxStudio = Math.max(...C.clienti.studio.fasce.map((f) => f.prezzo));
  const prezzi = { 'studio-min': fmt(minStudio * 100), 'studio-max': fmt(maxStudio * 100), privato: fmt(C.clienti.privato.prezzoIvaInclusa * 100) };
  $$('[data-prezzo]').forEach((el) => { el.textContent = prezzi[el.dataset.prezzo] || ''; });
  $$('[data-acconto]').forEach((el) => { el.textContent = pct(C.clienti[el.dataset.acconto].accontoPercento); });
  $$('[data-consegna]').forEach((el) => { el.textContent = C.consegna; });
  $$('[data-soglia]').forEach((el) => { el.textContent = C.lotto.soglia; });
  // rata leasing a reformer sul prezzo studio più basso, arrotondata all'euro (es. 3.990 × 0,031 → 124 €)
  if (C.leasing && C.leasing.attivo) {
    const rata = Math.round(minStudio * C.leasing.coefficienteMensile);
    $$('[data-leasing-rata]').forEach((el) => { el.textContent = `${rata} €`; });
    $$('[data-leasing-mesi]').forEach((el) => { el.textContent = C.leasing.mesi; });
  }
  if (!C.mostraPrezzi) $$('[data-solo-prezzi]').forEach((el) => el.remove());
  if (!(C.leasing && C.leasing.attivo)) $$('[data-solo-leasing]').forEach((el) => el.remove());
  $$('[data-op-prezzo]').forEach((el) => {
    const cl = C.clienti[el.dataset.opPrezzo];
    el.textContent = !C.mostraPrezzi ? '' : cl.prezzoIvaInclusa != null ? `${fmt(cl.prezzoIvaInclusa * 100)} IVA inclusa` : `da ${fmt(Math.min(...cl.fasce.map((f) => f.prezzo)) * 100)} + IVA`;
  });
  if (C.trustpilot && C.trustpilot.mostra) {
    const t = $('[data-trustpilot]'); t.hidden = false;
    $('[data-trustpilot-voto]').textContent = C.trustpilot.voto;
    const testo = $('[data-trustpilot-testo]');
    if (C.trustpilot.url) {
      const a = document.createElement('a'); a.href = C.trustpilot.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = C.trustpilot.testo;
      testo.appendChild(a);
    } else testo.textContent = C.trustpilot.testo;
  }
  if (C.lotto && C.lotto.prenotazioniRaccolte != null) {
    $('[data-lotto]').hidden = false;
    $('[data-lotto-numeri]').textContent = `${C.lotto.prenotazioniRaccolte} su ${C.lotto.soglia}`;
  }
  // recapiti in fondo: i segnaposto ancora da sostituire ([...]) non si mostrano
  const vero = (v) => v && !/^\[.*\]$/.test(String(v).trim());
  const righe = $('#c-righe');
  [[C.recapiti.showroom, ''], [C.recapiti.telefono, 'Tel. '], [C.recapiti.email, '']].filter(([v]) => vero(v)).forEach(([v, pre], i) => {
    if (i) righe.append(' · ');
    const s = document.createElement('span'); s.textContent = pre + v; if (pre || v.includes('@')) s.className = 'seleziona'; righe.append(s);
  });
  if (vero(C.privacyUrl)) $('#link-privacy').href = C.privacyUrl; else $('#link-privacy').removeAttribute('target');
  if (C.anteprima) {
    const a = document.createElement('p'); a.className = 'anteprima';
    a.textContent = 'Anteprima del sito: le richieste non vengono ancora inviate.';
    document.body.prepend(a);
  }
  $('#sotto-invio').textContent = C.invio.endpoint
    ? 'Ti rispondiamo entro un giorno lavorativo. Nessun pagamento online.'
    : 'Si apre la tua email con la richiesta già scritta: basta inviarla. Nessun pagamento online.';

  /* ---------- Modulo e riepilogo ---------- */
  const form = $('#modulo');
  const qIn = $('#quantita');
  const tipo = () => $('input[name="tipo"]:checked', form).value;
  const finitura = () => $('input[name="finitura"]:checked', form).value;
  const nomeFin = (f) => (f === 'nero' ? 'Nero' : 'Chiaro');
  const sezione = $('#prenota');

  // le righe possono mancare (con mostraPrezzi: false vengono tolte): in quel caso non si fa niente
  const riga = (sel, testo, mostra = true) => { const el = $(sel); if (!el) return; el.closest('[data-riga]').hidden = !mostra; el.textContent = testo; };
  const scrivi = (sel, testo) => { const el = $(sel); if (el) el.textContent = testo; };
  let r = null;
  const aggiorna = () => {
    r = calcola(tipo(), qIn.value);
    qIn.max = r.cl.quantitaMax;
    if (String(r.q) !== qIn.value) qIn.value = r.q;
    $('#q-max').textContent = `da 1 a ${r.cl.quantitaMax}`;
    $('#meno').disabled = r.q <= 1; $('#piu').disabled = r.q >= r.cl.quantitaMax;
    const prossima = (r.cl.fasce || []).find((f) => f.da > r.q);
    $('#fascia').textContent = C.mostraPrezzi && prossima ? `Da ${prossima.da} pezzi: ${fmt(prossima.prezzo * 100)} + IVA a pezzo.` : (r.cl.nota || '');
    $$('[data-solo-azienda]').forEach((el) => { el.hidden = !r.azienda; });

    const ivaTxt = `IVA ${pct(C.ivaPercento)}`;
    riga('#r-unitario', r.azienda ? `${fmt(r.unitario)} + IVA` : `${fmt(r.unitario)} IVA inclusa`);
    riga('#r-sconto', `−${pct(C.scontoPercento)} incluso nel prezzo`, (C.scontoPercento || 0) > 0);
    riga('#r-q', `${r.q} ${r.q === 1 ? 'pezzo' : 'pezzi'} · ${nomeFin(finitura())}`);
    scrivi('#r-imponibile-et', r.azienda ? 'Imponibile (IVA esclusa)' : 'di cui imponibile');
    scrivi('#r-iva-et', r.azienda ? ivaTxt : `di cui ${ivaTxt}`);
    riga('#r-imponibile', fmt(r.imponibile));
    riga('#r-iva', fmt(r.iva));
    riga('#r-totale', fmt(r.totale));
    scrivi('#r-acconto-et', `Acconto alla conferma (${pct(r.cl.accontoPercento)})`);
    scrivi('#r-acconto', fmt(r.acconto));
    riga('#r-saldo', fmt(r.saldo));
    riga('#r-leasing', r.leasing != null ? `circa ${fmt(r.leasing)} al mese × ${C.leasing.mesi} mesi` : '', r.leasing != null);
    riga('#r-consegna', C.consegna);
    sezione.classList.toggle('azienda', r.azienda);
    const mini = $('#mini-rie');
    if (mini) mini.innerHTML = `<span>${r.azienda ? 'Imponibile' : 'Totale'} <b>${fmt(r.azienda ? r.imponibile : r.totale)}</b>${r.azienda ? ' + IVA' : ''}</span><span>Acconto <b>${fmt(r.acconto)}</b> solo alla conferma</span>`;
  };
  // senza prezzi il riepilogo resta, ma solo con quantità, finitura e consegna
  if (!C.mostraPrezzi) {
    ['#r-unitario', '#r-imponibile', '#r-iva', '#r-totale', '#r-saldo', '#r-leasing'].forEach((s) => $(s).closest('[data-riga]').remove());
    $('.acconto').remove(); $('.rie-nota').textContent = 'Il prezzo te lo indichiamo nella proposta d\'ordine.';
  }

  form.addEventListener('change', (e) => { if (e.target.name === 'finitura') impostaFinitura(e.target.value, 'modulo'); aggiornaSicuro(); });
  qIn.addEventListener('input', () => aggiornaSicuro());
  $('#meno').addEventListener('click', () => { qIn.value = Number(qIn.value) - 1; aggiornaSicuro(); });
  $('#piu').addEventListener('click', () => { qIn.value = Number(qIn.value) + 1; aggiornaSicuro(); });
  const aggiornaSicuro = () => aggiorna();

  // i pulsanti "Prenota per lo studio / per casa" impostano già il tipo di cliente
  $$('[data-tipo-vai]').forEach((a) => a.addEventListener('click', () => {
    const radio = $(`input[name="tipo"][value="${a.dataset.tipoVai}"]`, form);
    if (radio) { radio.checked = true; aggiornaSicuro(); }
  }));

  /* ---------- Finitura: modulo, galleria e 3D vanno insieme ---------- */
  const impostaFinitura = (fin, da) => {
    $$('[data-fin]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.fin === fin)));
    const radio = $(`input[name="finitura"][value="${fin}"]`, form); if (radio && !radio.checked) radio.checked = true;
    $$('img[data-render]').forEach((img) => { img.src = `img/render/${fin}-${img.dataset.render}.jpg`; });
    document.dispatchEvent(new CustomEvent('r3:finitura', { detail: fin }));
    if (da !== 'avvio') traccia('finitura', { finitura: fin, da });
    aggiornaSicuro();
  };
  $$('[data-fin]').forEach((b) => b.addEventListener('click', () => impostaFinitura(b.dataset.fin, 'galleria')));
  window.R3 = { finitura, impostaFinitura };

  /* ---------- Messaggio della richiesta ---------- */
  const val = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
  const messaggio = () => {
    const righe = [
      'Richiesta di prenotazione · Reformer R3 Tekkfit Pilates', '',
      `Nome: ${val('nome')}`,
      r.azienda && val('azienda') ? `Studio o azienda: ${val('azienda')}` : null,
      val('telefono') ? `Telefono: ${val('telefono')}` : null,
      val('email') ? `Email: ${val('email')}` : null,
      val('citta') ? `Città: ${val('citta')}` : null, '',
      `Tipo di cliente: ${r.cl.nome}`,
      `Finitura: ${nomeFin(finitura())}`,
      `Quantità: ${r.q}`,
    ];
    if (C.mostraPrezzi) righe.push(
      `Prezzo unitario: ${fmt(r.unitario)} ${r.azienda ? '+ IVA' : 'IVA inclusa'}`,
      (C.scontoPercento || 0) > 0 ? `Sconto pre-ordine: ${pct(C.scontoPercento)}` : null,
      `Imponibile: ${fmt(r.imponibile)}`, `IVA ${pct(C.ivaPercento)}: ${fmt(r.iva)}`, `Totale IVA inclusa: ${fmt(r.totale)}`,
      `Acconto alla conferma (${pct(r.cl.accontoPercento)}): ${fmt(r.acconto)}`, `Saldo alla consegna: ${fmt(r.saldo)}`,
      r.leasing != null ? `Rata leasing indicativa: circa ${fmt(r.leasing)} al mese per ${C.leasing.mesi} mesi` : null,
    );
    righe.push(`Consegna: ${C.consegna}`);
    if (val('note')) righe.push('', `Note: ${val('note')}`);
    if (Object.keys(provenienza).length) righe.push('', `Provenienza: ${Object.entries(provenienza).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    return righe.filter((x) => x !== null).join('\n');
  };

  /* ---------- Controlli e invio ---------- */
  const errori = $('#errori');
  const controlla = () => {
    const msg = [];
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    const segna = (id, testo) => { $(`#${id}`).setAttribute('aria-invalid', 'true'); msg.push(testo); };
    if (!val('nome')) segna('nome', 'Scrivi nome e cognome.');
    const email = val('email'), tel = val('telefono');
    if (!email && !tel) { segna('telefono', 'Lascia almeno un recapito: telefono o email.'); }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) segna('email', 'Controlla l\'indirizzo email.');
    if (tel && tel.replace(/\D/g, '').length < 6) segna('telefono', 'Controlla il numero di telefono.');
    if (!$('#privacy').checked) { $('#privacy').setAttribute('aria-invalid', 'true'); msg.push('Spunta la casella dell\'informativa privacy.'); }
    errori.hidden = msg.length === 0;
    errori.textContent = msg.join(' ');
    if (msg.length) { const primo = $('[aria-invalid="true"]', form); if (primo) primo.focus(); }
    return msg.length === 0;
  };

  // modo: 'inviata' (servizio di invio ok), 'email' (si è aperta l'email), 'errore' (servizio non raggiungibile)
  const TESTI_GRAZIE = {
    inviata: ['Richiesta ricevuta. Grazie!', 'Ti contattiamo per confermare i dettagli e mandarti la proposta d\'ordine. Oggi non devi pagare niente.'],
    email: ['Ultimo passo: invia l\'email che si è aperta.', 'Se l\'email non si è aperta, mandaci la richiesta su WhatsApp oppure copiala e inviala a '],
    errore: ['L\'invio non è riuscito.', 'Nessun problema: mandaci la stessa richiesta su WhatsApp oppure copiala e inviala a '],
    anteprima: ['Anteprima: richiesta non inviata.', 'Questa è una versione di prova del sito e la richiesta non arriva a nessuno. Qui sotto il testo che riceveremmo.'],
  };
  const mostraGrazie = (modo) => {
    const testo = messaggio();
    const [titolo, frase] = TESTI_GRAZIE[modo];
    $('#grazie-titolo').textContent = titolo;
    const p = $('#grazie-testo'); p.textContent = frase;
    const conRecapiti = modo === 'email' || modo === 'errore';
    if (conRecapiti) { const b = document.createElement('b'); b.className = 'seleziona'; b.textContent = C.recapiti.email; p.append(b, '.'); }
    $('#grazie-messaggio').textContent = testo;
    $('#grazie-messaggio').hidden = modo === 'inviata';
    $('#grazie-copia').hidden = !conRecapiti;
    $('#grazie-whatsapp').hidden = !conRecapiti;
    $('#grazie-whatsapp').href = `https://wa.me/${String(C.recapiti.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(testo)}`;
    form.hidden = true; $('.riepilogo').hidden = true;
    const g = $('#grazie'); g.hidden = false; g.focus();
  };
  $('#grazie-modifica').addEventListener('click', () => {
    $('#grazie').hidden = true; form.hidden = false; $('.riepilogo').hidden = false; $('#nome').focus();
  });
  $('#grazie-copia').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText($('#grazie-messaggio').textContent); b.textContent = 'Testo copiato'; }
    catch (err) { const sel = getSelection(); const rg = document.createRange(); rg.selectNodeContents($('#grazie-messaggio')); sel.removeAllRanges(); sel.addRange(rg); b.textContent = 'Testo selezionato: copialo'; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements.sito.value) return;                 // robot
    if (!controlla()) { traccia('modulo_errori'); return; }
    const dati = {
      tipo: r.tipo, finitura: finitura(), quantita: r.q,
      nome: val('nome'), azienda: val('azienda'), telefono: val('telefono'), email: val('email'), citta: val('citta'), note: val('note'),
      totale: r.totale / 100, acconto: r.acconto / 100, provenienza, pagina: location.href.split('#')[0],
    };
    if (C.anteprima) { mostraGrazie('anteprima'); return; }
    traccia('invio_richiesta', { tipo: r.tipo, finitura: dati.finitura, quantita: r.q, valore: C.mostraPrezzi ? r.imponibile / 100 : undefined });

    if (C.invio.endpoint) {
      const b = $('#invia'); b.disabled = true; b.textContent = 'Invio in corso…';
      try {
        const risp = await fetch(C.invio.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(dati) });
        if (!risp.ok) throw new Error(risp.status);
        traccia('richiesta_inviata', { tipo: r.tipo, quantita: r.q });
        mostraGrazie('inviata');
      } catch (err) {
        traccia('invio_fallito');
        mostraGrazie('errore');
      } finally { b.disabled = false; b.textContent = 'Invia la richiesta di prenotazione'; }
      return;
    }
    // senza servizio di invio: email già compilata (e WhatsApp come alternativa)
    location.href = `mailto:${C.recapiti.email}?subject=${encodeURIComponent(`Prenotazione Reformer R3 · ${val('nome')}`)}&body=${encodeURIComponent(messaggio())}`;
    mostraGrazie('email');
  });

  /* ---------- Barra fissa su telefono ---------- */
  const barra = $('#barra-cta');
  const heroAzioni = $('.hero-azioni');
  let vedoHero = true, vedoModulo = false;
  const aggiornaBarra = () => {
    const visibile = !vedoHero && !vedoModulo;
    barra.classList.toggle('visibile', visibile);
    barra.setAttribute('aria-hidden', String(!visibile));
    $('a', barra).tabIndex = visibile ? 0 : -1;
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { vedoHero = e.isIntersecting; aggiornaBarra(); }).observe(heroAzioni);
    new IntersectionObserver(([e]) => { vedoModulo = e.isIntersecting; aggiornaBarra(); }, { threshold: 0.05 }).observe(sezione);
    // chi arriva al modulo: utile per capire dove si perde gente
    let visto = false;
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !visto) { visto = true; traccia('modulo_visto'); } }, { threshold: 0.3 }).observe(form);
  }

  /* ---------- Avvio ---------- */
  // link già impostati: ?tipo=studio&quantita=6&finitura=nero
  try {
    const u = new URL(location.href);
    const t = u.searchParams.get('tipo'); if (t && C.clienti[t]) $(`input[name="tipo"][value="${t}"]`, form).checked = true;
    const q = u.searchParams.get('quantita'); if (q) qIn.value = q;
    const f = u.searchParams.get('finitura'); impostaFinitura(f === 'nero' ? 'nero' : 'chiaro', 'avvio');
  } catch (e) { impostaFinitura('chiaro', 'avvio'); }
  aggiornaSicuro();

  window.__prenotazioni = { calcola, fmt, messaggio: () => messaggio(), get r() { return r; } };
})();
