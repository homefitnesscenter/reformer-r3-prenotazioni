/* Reformer R3 · Prenotazioni — modello 3D da girare con il dito o il mouse.
   Si carica solo quando la sezione sta per entrare nello schermo (la pagina resta veloce);
   con "risparmio dati" attivo parte solo toccando il pulsante.
   Script classico: three.js arriva con import() tramite l'importmap di index.html, così la pagina
   si apre anche con doppio clic (da disco il modello arriva dalle copie .js in modelli/). */

(() => {
  const box = document.getElementById('vista3d');
  const canvas = document.getElementById('tela3d');
  const pulsante = document.getElementById('avvia3d');
  const stato = document.getElementById('stato3d');
  if (!box || !canvas) return;

  const FILE = { chiaro: 'modelli/r3-chiaro.glb', nero: 'modelli/r3-nero.glb' };
  const ESPOSIZIONE = { chiaro: 0.8, nero: 1.0 };
  let avviato = false;

  const avvia = async () => {
    if (avviato) return; avviato = true;
    pulsante.hidden = true;
    stato.textContent = 'Carico il modello 3D…';
    try {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.62;
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e3dc, 0.9));
      const sole = new THREE.DirectionalLight(0xfffaf2, 2.2);
      sole.position.set(1.6, 4.2, 2.8); sole.castShadow = true;
      sole.shadow.mapSize.set(2048, 2048);
      Object.assign(sole.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 10 });
      sole.shadow.bias = -0.0004; sole.shadow.normalBias = 0.02;
      scene.add(sole);
      const pavimento = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ color: 0x2a2230, opacity: 0.22 }));
      pavimento.rotation.x = -Math.PI / 2; pavimento.receiveShadow = true; scene.add(pavimento);

      const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
      camera.position.set(2.6, 1.5, 3.4);
      const controlli = new OrbitControls(camera, canvas);
      controlli.target.set(0, 0.3, 0);
      controlli.enableDamping = true;
      controlli.enablePan = false;
      controlli.minDistance = 1.6; controlli.maxDistance = 6;
      controlli.maxPolarAngle = Math.PI * 0.48;
      controlli.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      controlli.autoRotateSpeed = 0.8;
      controlli.addEventListener('start', () => { controlli.autoRotate = false; });

      const loader = new GLTFLoader();
      const daRete = (f) => new Promise((ok, ko) => loader.load(f, ok, undefined, ko));
      const daBase64 = (f) => new Promise((ok, ko) => {
        const id = f.split('/').pop().replace('.glb', '');
        const usa = () => {
          const bin = atob(window.MODELLI_B64[id]); const u8 = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          loader.parse(u8.buffer, '', ok, ko);
        };
        if (window.MODELLI_B64 && window.MODELLI_B64[id]) return usa();
        const s = document.createElement('script'); s.src = f.replace('.glb', '.js'); s.onload = usa; s.onerror = ko;
        document.head.appendChild(s);
      });
      const carica = (f) => (location.protocol === 'file:' ? daBase64(f) : daRete(f).catch(() => daBase64(f)));

      const cache = {};
      let attuale = null, finAttiva = null;
      const mostra = async (fin) => {
        if (fin === finAttiva) return;
        finAttiva = fin;
        stato.textContent = 'Carico il modello 3D…';
        if (!cache[fin]) {
          const g = await carica(FILE[fin]);
          const m = g.scene;
          const b = new THREE.Box3().setFromObject(m);
          // lato piedi a sinistra, reformer centrato e appoggiato a terra
          m.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
          m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          const gruppo = new THREE.Group(); gruppo.add(m);
          cache[fin] = gruppo;
        }
        if (finAttiva !== fin) return;
        if (attuale) scene.remove(attuale);
        attuale = cache[fin]; scene.add(attuale);
        renderer.toneMappingExposure = ESPOSIZIONE[fin];
        stato.textContent = '';
      };

      const ridimensiona = () => {
        const w = box.clientWidth, h = box.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // su schermi stretti il reformer (2,5 m) ha bisogno di più distanza
        camera.fov = w / h < 1 ? 42 : 30;
        camera.updateProjectionMatrix();
      };
      new ResizeObserver(ridimensiona).observe(box);
      ridimensiona();

      // disegna solo quando la sezione è visibile
      let visibile = true;
      new IntersectionObserver(([e]) => { visibile = e.isIntersecting; }).observe(box);
      const ciclo = () => {
        requestAnimationFrame(ciclo);
        if (!visibile) return;
        controlli.update();
        renderer.render(scene, camera);
      };
      ciclo();

      await mostra(window.R3 ? window.R3.finitura() : 'chiaro');
      document.addEventListener('r3:finitura', (e) => { mostra(e.detail).catch(() => { stato.textContent = 'Il modello non si è caricato.'; }); });
      window.__vista3d = { scene, camera, controlli, get modello() { return attuale; } };
    } catch (err) {
      console.error('3D non disponibile', err);
      stato.textContent = 'Il modello 3D non si è caricato: le immagini sopra mostrano il reformer.';
      avviato = false; pulsante.hidden = false; pulsante.textContent = 'Riprova a caricare il 3D';
    }
  };

  pulsante.addEventListener('click', avvia);
  const risparmio = navigator.connection && navigator.connection.saveData;
  if (!risparmio && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); avvia(); } }, { rootMargin: '300px 0px' });
    io.observe(box);
  }
})();
