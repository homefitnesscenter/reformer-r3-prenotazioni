/* Configurazione del sito "Reformer R3 · Prenotazioni".
   Tutto quello che si cambia senza toccare il codice sta qui: prezzi, acconti, recapiti,
   come arrivano le richieste, testi di fiducia e interruttori.
   Va caricato PRIMA di js/app.js (vedi index.html). */

window.PRENOTAZIONI = {

  /* ---------- Prezzi e acconti (gli stessi del calcolatore del sito 3D) ---------- */
  anteprima: true,                 // true: striscia "Anteprima" in alto e il modulo NON apre email né WhatsApp
                                    // (per far vedere il sito prima di avere recapiti veri)
  mostraPrezzi: false,                // false: niente prezzi in pagina, il modulo resta (richiesta di informazioni)
  ivaPercento: 22,
  scontoPercento: 0,                 // sconto pre-ordine; se è 0 non si vede
  clienti: {
    privato: { nome: 'Privato', prezzoIvaInclusa: 5490, nota: 'Consegna e montaggio inclusi.', quantitaMax: 3, accontoPercento: 20 },
    studio:  { nome: 'Studio Pilates o palestra', fasce: [{ da: 1, prezzo: 4490 }, { da: 6, prezzo: 3990 }], quantitaMax: 30, accontoPercento: 30 },
    hotel:   { nome: 'Hotel, spa o centro', fasce: [{ da: 1, prezzo: 4490 }], quantitaMax: 30, accontoPercento: 30 },
  },
  leasing: { attivo: true, coefficienteMensile: 0.031, mesi: 36 },
  consegna: 'settembre 2027',      // si legge dopo "a" e "Consegna prevista": es. 'settembre 2027'

  /* ---------- Come arrivano le richieste ---------- */
  // Se `endpoint` è vuoto, il modulo NON invia né salva niente: apre l'email (o WhatsApp) già compilata
  // e chi visita la invia da sé. Per ricevere le richieste direttamente (consigliato per convertire di più)
  // serve un servizio che riceva il modulo, es. un modulo Google, Formspree o una pagina del sito PrestaShop:
  // si mette qui il suo indirizzo e il sito manda i dati in POST (JSON).
  invio: {
    endpoint: '',
  },
  recapiti: {
    email: '[EMAIL_PREORDINI]',
    whatsapp: '[WHATSAPP]',          // con prefisso internazionale, es. 393331234567
    telefono: '[TELEFONO_SHOWROOM]', // mostrato in chiaro in fondo alla pagina
    showroom: 'Showroom Home Fitness Center, Sona (VR)',
  },
  privacyUrl: '[PRIVACY_URL]',       // pagina dell'informativa privacy, linkata accanto alla casella del consenso

  /* ---------- Fiducia ---------- */
  // Mostrare solo dati veri e verificabili. Valore da ricontrollare prima di pubblicare.
  trustpilot: { mostra: true, voto: '4,8/5', testo: 'Home Fitness Center su Trustpilot', url: '' },   // url: link alla pagina Trustpilot di HFC (vuoto = nessun link)

  /* ---------- Primo lotto (lotto fondatori) ---------- */
  // soglia: pre-ordini con acconto che servono per ordinare il container; sotto la soglia gli acconti si restituiscono.
  // prenotazioniRaccolte: lasciare null finché non ci sono prenotazioni vere da mostrare.
  lotto: { soglia: 24, prenotazioniRaccolte: null },
};
