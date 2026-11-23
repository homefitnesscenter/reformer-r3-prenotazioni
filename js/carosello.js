/* Carosello orizzontale delle immagini: si sfoglia con
   - il dito (scorrimento nativo del browser),
   - le frecce ‹ › e la tastiera (frecce sinistra/destra quando la riga ha il focus),
   - il mouse, trascinando (sui computer lo scorrimento orizzontale col mouse non esiste).
   Uso nell'HTML: <div data-carosello> … <button data-car-prec> <span data-car-conta> <button data-car-succ> …
   con dentro una riga [data-car-riga] i cui figli sono le card. */

(() => {
  const RIDOTTO = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const avvia = (box) => {
    const riga = box.querySelector('[data-car-riga]');
    const prec = box.querySelector('[data-car-prec]');
    const succ = box.querySelector('[data-car-succ]');
    const conta = box.querySelector('[data-car-conta]');
    if (!riga) return;
    const card = () => [...riga.children];

    // indice della card più vicina al bordo sinistro visibile
    const indice = () => {
      const x = riga.getBoundingClientRect().left + parseFloat(getComputedStyle(riga).paddingLeft || 0);
      let migliore = 0, dist = Infinity;
      card().forEach((c, i) => { const d = Math.abs(c.getBoundingClientRect().left - x); if (d < dist) { dist = d; migliore = i; } });
      return migliore;
    };
    const vaiA = (i) => {
      // la riga ha position: relative, quindi offsetLeft delle card è misurato dalla riga
      const lista = card(); const n = Math.max(0, Math.min(lista.length - 1, i));
      riga.scrollTo({ left: lista[n].offsetLeft - lista[0].offsetLeft, behavior: RIDOTTO ? 'auto' : 'smooth' });
    };
    const aggiorna = () => {
      const max = riga.scrollWidth - riga.clientWidth - 2;
      if (prec) prec.disabled = riga.scrollLeft <= 2;
      if (succ) succ.disabled = riga.scrollLeft >= max;
      // in fondo alla riga si vede l'ultima card anche se non è allineata a sinistra
      const n = card().length;
      if (conta) conta.textContent = `${riga.scrollLeft >= max ? n : Math.min(indice() + 1, n)} / ${n}`;
    };

    if (prec) prec.addEventListener('click', () => vaiA(indice() - 1));
    if (succ) succ.addEventListener('click', () => vaiA(indice() + 1));
    riga.addEventListener('scroll', () => requestAnimationFrame(aggiorna), { passive: true });
    addEventListener('resize', aggiorna);
    riga.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); vaiA(indice() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); vaiA(indice() - 1); }
    });

    // trascinamento col mouse (il dito usa lo scorrimento nativo)
    let inizio = null, mosso = false;
    riga.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      inizio = { x: e.clientX, sl: riga.scrollLeft }; mosso = false;
      riga.classList.add('trascina');
    });
    addEventListener('pointermove', (e) => {
      if (!inizio) return;
      const dx = e.clientX - inizio.x;
      if (Math.abs(dx) > 4) mosso = true;
      riga.scrollLeft = inizio.sl - dx;
    });
    addEventListener('pointerup', () => {
      if (!inizio) return;
      inizio = null; riga.classList.remove('trascina');
      if (mosso) vaiA(indice());            // si ferma su una card intera
    });
    // dopo un trascinamento il clic non deve aprire niente
    riga.addEventListener('click', (e) => { if (mosso) { e.preventDefault(); e.stopPropagation(); mosso = false; } }, true);
    riga.addEventListener('dragstart', (e) => e.preventDefault());

    aggiorna();
    // le immagini cambiano dimensione mentre si caricano
    riga.querySelectorAll('img').forEach((img) => img.addEventListener('load', aggiorna));
  };

  document.querySelectorAll('[data-carosello]').forEach(avvia);
})();
