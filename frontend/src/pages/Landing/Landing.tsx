/*
 * pages/Landing/Landing.tsx
 * ─────────────────────────────────────────────────────────────
 * Öffentliche Landing Page — ultra-modern, vollanimiert.
 *
 * Technologien:
 *  - Framer Motion: spring-Animationen, layoutId, AnimatePresence
 *  - Lenis: butterweicher Smooth Scroll
 *
 * Komponenten (von oben nach unten):
 *  1.  FilmGrain        — animiertes SVG-Korn über allem
 *  2.  ScrollProgress   — spring-animierter Fortschrittsbalken
 *  3.  GridBackground   — Aurora-Blobs + Dot-Grid + Scan-Linie
 *  4.  FloatingShapes   — rotierende Ringe + schwebende Elemente
 *  5.  CustomCursor     — invertierender Kreis + Glow
 *  6.  PageLoader       — "ST"-Loader mit Fade-Out
 *  7.  Navbar           — Glas + Entrance + shared-layout Pill
 *  8.  HeroSection      — Clip-Path-Wipe + Typewriter + Mockup
 *  9.  StatsSection     — SVG-Arc-Ringe + animierte Counter
 *  10. MarqueeStrip     — Feature-Stichworte endlos laufend
 *  11. FeaturesSection  — Spotlight-Hover-Karten
 *  12. AllInOneSection  — Checklist + wachsende Balken
 *  13. FAQSection       — Accordion
 *  14. Footer
 * ─────────────────────────────────────────────────────────────
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useMotionValue,
  useTransform,
  LayoutGroup,
  useInView as useFramerInView,
} from "framer-motion";

/* ── Smooth Scroll via CSS ───────────────────────────────────── */
function useLenis() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);
}

/* ── Animierter Counter ──────────────────────────────────────── */
function useCounter(target: number, start = false, duration = 50) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let frame = 0;
    const total = 50;
    const id = setInterval(() => {
      frame++;
      setVal(Math.round(Math.pow(frame / total, 0.6) * target));
      if (frame >= total) clearInterval(id);
    }, duration);
    return () => clearInterval(id);
  }, [start, target, duration]);
  return val;
}

/* ── CSS Keyframes ───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @keyframes grain {
    0%,100%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}
    20%{transform:translate(3%,1%)}30%{transform:translate(-1%,4%)}
    40%{transform:translate(4%,-2%)}50%{transform:translate(-3%,3%)}
    60%{transform:translate(1%,-4%)}70%{transform:translate(-4%,2%)}
    80%{transform:translate(3%,-1%)}90%{transform:translate(-2%,4%)}
  }
  @keyframes scan {
    0%   { top: -2px; }
    100% { top: 100%; }
  }
  @keyframes spinCW  { to { transform: rotate(360deg);  } }
  @keyframes spinCCW { to { transform: rotate(-360deg); } }
  @keyframes floatPlus {
    0%,100%{transform:translateY(0); opacity:.08;}
    50%{transform:translateY(-18px); opacity:.13;}
  }
  @keyframes dotPulse {
    0%,100%{opacity:.08;} 50%{opacity:.18;}
  }
  @keyframes blink {
    0%,100%{opacity:1;} 50%{opacity:0;}
  }
  * { cursor: none !important; }
  .grain-layer  { animation: grain 8s steps(10) infinite; }
  .scan-line    { animation: scan 12s linear infinite; }
  .spin-cw-40s  { animation: spinCW  40s linear infinite; }
  .spin-ccw-60s { animation: spinCCW 60s linear infinite; }
  .spin-ccw-50s { animation: spinCCW 50s linear infinite; }
  .float-plus   { animation: floatPlus 6s ease-in-out infinite; }
  .dot-pulse-1  { animation: dotPulse 3s ease-in-out 0.0s infinite; }
  .dot-pulse-2  { animation: dotPulse 3s ease-in-out 0.3s infinite; }
  .dot-pulse-3  { animation: dotPulse 3s ease-in-out 0.6s infinite; }
  .dot-pulse-4  { animation: dotPulse 3s ease-in-out 0.9s infinite; }
  .cursor-blink { animation: blink .9s step-end infinite; }
  @keyframes shimmerBtn {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
`;

/* ═══════════════════════════════════════════════════════════════
   FilmGrain
   SEITE: fixiert über der gesamten Seite — liegt über jedem
   anderen Element, scrollt nicht mit. Man sieht es als ganz
   feines Rauschen/Körnung überall auf der Seite (wie alter Film).
   ═══════════════════════════════════════════════════════════════ */
function FilmGrain() {
  return (
    /* SEITE: überlagert alles — z-index 999, pointer-events none damit Klicks durchgehen */
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
      <svg
        className="grain-layer w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4"
        /* 200% Breite damit beim Verschieben keine Kanten sichtbar werden */
        aria-hidden="true"
      >
        <filter id="grain-filter">
          <feTurbulence
            type="fractalNoise"  /* erzeugt mathematisches Rauschen */
            baseFrequency="0.65" /* höher = feineres Korn */
            numOctaves="3"       /* mehr Schichten = detailreicheres Muster */
            stitchTiles="stitch" /* nahtloser Übergang an den Rändern */
          />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter="url(#grain-filter)"
          opacity="0.035" /* nur 3.5% Deckkraft — sehr dezent */
        />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ScrollProgress
   SEITE: ganz oben am Browserrand — ein 2px dünner pink-lila
   Streifen der beim Scrollen von links nach rechts wächst.
   Ist beim ersten Öffnen unsichtbar (Seite noch oben).
   Wird sichtbar sobald man anfängt zu scrollen.
   ═══════════════════════════════════════════════════════════════ */
function ScrollProgress() {
  const { scrollYProgress } = useScroll(); /* 0 = ganz oben, 1 = ganz unten */
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 }); /* federnd */

  return (
    /* SEITE: fixiert ganz oben, über Navbar (z-1000), wächst von links nach rechts */
    <motion.div
      style={{ scaleX, transformOrigin: "left" }}
      className="fixed top-0 left-0 right-0 z-[1000] h-0.5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 pointer-events-none"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   GridBackground
   SEITE: fixierter Hintergrund hinter allem — scrollt nicht mit.
   Enthält drei Leuchtflecken, ein Punktraster und eine Scan-Linie.
   ═══════════════════════════════════════════════════════════════ */
function GridBackground() {
  return (
    /* SEITE: liegt hinter allem (z-0), füllt den gesamten Bildschirm */
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#050508]">

      {/* SEITE: weicher pink Leuchtfleck — oben links, ragt leicht über den Rand */}
      <motion.div
        className="absolute w-[700px] h-[500px] rounded-full blur-[120px] opacity-[0.12]"
        style={{
          background: "radial-gradient(ellipse, #ec4899 0%, transparent 70%)",
          left: "-10%", /* 10% links vom Rand — teilweise unsichtbar */
          top: "-5%",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SEITE: weicher lila Leuchtfleck — oben rechts, ragt leicht über den Rand */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.10]"
        style={{
          background: "radial-gradient(ellipse, #a855f7 0%, transparent 70%)",
          right: "-8%",
          top: "-10%",
        }}
        animate={{ x: [0, -50, 20, 0], y: [0, 40, -15, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SEITE: weicher blauvioletter Leuchtfleck — unten Mitte, sehr schwach */}
      <motion.div
        className="absolute w-[800px] h-[400px] rounded-full blur-[160px] opacity-[0.08]"
        style={{
          background: "radial-gradient(ellipse, #6366f1 0%, transparent 70%)",
          left: "15%",
          bottom: "-5%",
        }}
        animate={{ x: [0, 30, -40, 0], y: [0, -20, 15, 0], scale: [1, 1.05, 0.98, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SEITE: Punktraster — liegt über der gesamten Seite, sehr dezent */}
      {/* Sieht aus wie Millimeterpapier-Punkte, 1px groß, 36px Abstand */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* SEITE: Scan-Linie — eine horizontale 1px Linie fährt von ganz oben */}
      {/* nach ganz unten durch den Hintergrund, alle 12 Sekunden, sehr dezent */}
      <div
        className="scan-line absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(168,85,247,.06), transparent)",
        }}
      />

      {/* SEITE: dunkles Rand-Overlay — blendet die Ecken des Hintergrunds aus */}
      {/* verhindert dass die Leuchtflecken an den Seiten hart abschneiden */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #050508 100%)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FloatingShapes
   SEITE: fixierte dekorative Elemente — liegen hinter dem
   Seiteninhalt aber vor dem Hintergrund. Scrollt nicht mit.
   Alle Elemente sind sehr dezent und dienen nur der Optik.
   ═══════════════════════════════════════════════════════════════ */
function FloatingShapes() {
  return (
    /* SEITE: z-index 1 — hinter allem Inhalt aber vor dem Hintergrund */
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">

      {/* SEITE: zwei ineinanderliegende gestrichelte Ringe — oben rechts im
          Browserfenster, ungefähr da wo in der Navbar "Über uns" steht.
          Der äußere (160px) dreht sich rechtsherum, der innere (100px) linksherum.
          Sehr blass: lila 12%, pink 10% Deckkraft. */}
      <div className="absolute top-[8%] right-[6%]">
        {/* äußerer Ring, 160px — dreht sich im Uhrzeigersinn, 1× pro 40 Sekunden */}
        <div
          className="spin-cw-40s absolute"
          style={{
            width: 160,
            height: 160,
            border: "1px dashed rgba(168,85,247,.12)",
            borderRadius: "50%",
            top: -80,  /* -80 = halbe Breite → Mittelpunkt liegt auf dem Ankerpunkt */
            left: -80,
          }}
        />
        {/* innerer Ring, 100px — dreht sich gegen den Uhrzeigersinn, 1× pro 60 Sekunden */}
        <div
          className="spin-ccw-60s absolute"
          style={{
            width: 100,
            height: 100,
            border: "1px dashed rgba(236,72,153,.10)",
            borderRadius: "50%",
            top: -50,  /* -50 = halbe Breite → gleicher Mittelpunkt wie äußerer Ring */
            left: -50,
          }}
        />
      </div>

      {/* SEITE: einzelner gestrichelter Ring — unten links im Browserfenster.
          Ca. 12% vom unteren Rand und 4% vom linken Rand entfernt.
          200px groß, blauviolett, 8% Deckkraft — fast unsichtbar.
          Dreht sich gegen den Uhrzeigersinn, 1× pro 50 Sekunden. */}
      <div
        className="spin-ccw-50s absolute bottom-[12%] left-[4%]"
        style={{
          width: 200,
          height: 200,
          border: "1px dashed rgba(99,102,241,.08)",
          borderRadius: "50%",
        }}
      />

      {/* SEITE: "+" Zeichen — rechts im Browserfenster, auf halber Höhe (45% von oben).
          8% vom rechten Rand entfernt. Schwebt langsam 18px hoch und runter (6s Loop).
          Weiß, 8–13% Deckkraft. Nicht anklickbar (select-none). */}
      <div className="float-plus absolute right-[8%] top-[45%] font-mono text-white text-2xl select-none">
        +
      </div>

      {/* SEITE: vier kleine weiße Punkte — links im Browserfenster, ca. 25% von oben.
          15% vom linken Rand entfernt. Angeordnet als 2×2 Raster mit 3px Abstand.
          Jeder Punkt pulsiert (heller/dunkler) mit 0.3s Versatz zum nächsten. */}
      <div className="absolute left-[15%] top-[25%] grid grid-cols-2 gap-3">
        <div className="dot-pulse-1 w-1.5 h-1.5 rounded-full bg-white" /> {/* kein Versatz */}
        <div className="dot-pulse-2 w-1.5 h-1.5 rounded-full bg-white" /> {/* 0.3s Versatz */}
        <div className="dot-pulse-3 w-1.5 h-1.5 rounded-full bg-white" /> {/* 0.6s Versatz */}
        <div className="dot-pulse-4 w-1.5 h-1.5 rounded-full bg-white" /> {/* 0.9s Versatz */}
      </div>

      {/* SEITE: vertikale Gradient-Linie — rechts im Browserfenster, ca. 85% von oben.
          18% vom rechten Rand entfernt. 1px breit, 96px hoch, lila nach transparent.
          Pulsiert in Helligkeit (30%–70%) und Höhe (80%–100%), endlos. */}
      <motion.div
        className="absolute bottom-[15%] right-[18%] w-px"
        style={{
          height: 96,
          background: "linear-gradient(to bottom, rgba(168,85,247,.4), transparent)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3], scaleY: [0.8, 1, 0.8] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SEITE: rotierendes kleines Quadrat — links im Browserfenster, ca. 55% von oben.
          6% vom linken Rand entfernt. 16px groß, pink Umrandung.
          Dreht sich 45° hin und zurück (10s), pulsiert dabei in Helligkeit. */}
      <motion.div
        className="absolute left-[6%] top-[55%]"
        style={{
          width: 16,
          height: 16,
          border: "1px solid rgba(236,72,153,.18)",
          borderRadius: 1,
        }}
        animate={{ rotate: [0, 45, 0], opacity: [0.18, 0.35, 0.18] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CustomCursor
   SEITE: folgt der Maus überall auf der Seite.
   Besteht aus zwei Teilen die beide der Maus folgen.
   Erscheint erst nach der ersten Mausbewegung.
   ═══════════════════════════════════════════════════════════════ */
function CustomCursor() {
  const mouseX = useMotionValue(-200); /* startet außerhalb des Bildschirms */
  const mouseY = useMotionValue(-200);

  /* kleiner Kreis folgt sofort (hohe Steifigkeit = wenig Verzögerung) */
  const smallX = useSpring(mouseX, { stiffness: 500, damping: 28 });
  const smallY = useSpring(mouseY, { stiffness: 500, damping: 28 });

  /* Glow folgt träge (niedrige Steifigkeit = zieht nach) */
  const glowX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const glowY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!visible) setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [mouseX, mouseY, visible]);

  return (
    <>
      {/* SEITE: kleiner weißer 12px Kreis — sitzt genau auf der Mausposition.
          z-1001 = über allem. mix-blend-mode:difference invertiert die Farben
          darunter — auf dunklem Hintergrund weiß, auf hellem Text schwarz. */}
      <motion.div
        style={{
          x: smallX,
          y: smallY,
          translateX: "-50%",  /* Mitte des Kreises auf Mauspfeil zentrieren */
          translateY: "-50%",
          opacity: visible ? 1 : 0,
          mixBlendMode: "difference",
        }}
        className="fixed top-0 left-0 z-[1001] w-3 h-3 rounded-full bg-white pointer-events-none"
      />

      {/* SEITE: großer lila Glow-Kreis (500px) — folgt der Maus träge nach.
          z-998 = unter dem kleinen Kreis und dem Filmkorn.
          Nur 6% Deckkraft — beleuchtet den Mausbereich leicht lila. */}
      <motion.div
        style={{
          x: glowX,
          y: glowY,
          translateX: "-50%",
          translateY: "-50%",
          opacity: visible ? 0.06 : 0,
          background: "radial-gradient(circle, rgba(168,85,247,1) 0%, transparent 70%)",
        }}
        className="fixed top-0 left-0 z-[998] w-[500px] h-[500px] rounded-full pointer-events-none"
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PageLoader
   SEITE: erscheint nur beim allerersten Laden der Seite.
   Schwarzes Vollbild-Overlay genau in der Mitte des Bildschirms.
   Nach ca. 1.8 Sekunden blendet es sich aus.
   ═══════════════════════════════════════════════════════════════ */
function PageLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200; /* Balken füllt sich in 1.2 Sekunden */
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setProgress(Math.round(p * 100));
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(onDone, 600); /* 600ms Pause bei 100% bevor Ausblenden */
      }
    };
    requestAnimationFrame(tick);
  }, [onDone]);

  return (
    /* SEITE: schwarzes Vollbild über allem (z-2000), verschwindet nach ~1.8s */
    <motion.div
      className="fixed inset-0 z-[2000] bg-[#050508] flex flex-col items-center justify-center gap-8"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* SEITE: "ST" Schriftzug — exakt in der Mitte des schwarzen Overlays.
          Blendet sich mit scale+blur ein: startet klein+unscharf, endet normal. */}
      <motion.div
        initial={{ scale: 0.7, filter: "blur(12px)", opacity: 0 }}
        animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-black text-white tracking-tight"
      >
        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">S</span>
        T
      </motion.div>

      {/* SEITE: Fortschrittsbalken — direkt unter dem "ST", 128px breit, 2px hoch.
          Füllt sich von links nach rechts in 1.2 Sekunden. */}
      <div className="w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Navbar
   SEITE: ganz oben auf der Seite, bleibt beim Scrollen oben
   (sticky). Beim ersten Laden fährt sie von oben herein.
   Wird transparent wenn man ganz oben ist, bekommt
   Glaseffekt sobald man 40px runterscrollt.
   ═══════════════════════════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeLink, setActiveLink] = useState<string | null>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Funktionen", href: "#funktionen" },
    { label: "Über uns",   href: "#ueber" },
    { label: "FAQ",        href: "#faq" },
  ];

  return (
    /* SEITE: sticky oben — z-50, gleitet beim Laden von -60px auf 0px herein */
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/60 backdrop-blur-xl border-b border-white/8 shadow-[0_8px_32px_rgba(0,0,0,.4)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">

        {/* SEITE: Logo — ganz links in der Navbar.
            Pink-lila "S"-Quadrat + "StudyTracker" Text.
            Bei Hover: dreht sich leicht und wird größer. */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.12, rotate: -3 }}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-sm font-black">S</span>
          </motion.div>
          <span className="text-base font-black tracking-tight text-white">StudyTracker</span>
        </Link>

        {/* SEITE: drei Navigations-Links — Mitte der Navbar, nur auf breiten Bildschirmen.
            "Funktionen", "Über uns", "FAQ". Bei Hover über einen Link springt ein
            weißlicher abgerundeter Kasten (Pill) mit Federanimation dorthin. */}
        <LayoutGroup>
          <div
            className="hidden md:flex items-center gap-1"
            onMouseLeave={() => setActiveLink(null)}
          >
            {links.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="relative px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors rounded-full"
                onMouseEnter={() => setActiveLink(href)}
              >
                {activeLink === href && (
                  <motion.span
                    layoutId="nav-pill" /* springt zwischen Links mit Framer Motion */
                    className="absolute inset-0 bg-white/8 border border-white/12 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{label}</span>
              </a>
            ))}
          </div>
        </LayoutGroup>

        {/* SEITE: Buttons rechts in der Navbar */}
        <div className="flex items-center gap-2">

          {/* SEITE: "Anmelden" — rechts, nur ab mittlerem Bildschirm sichtbar */}
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2 rounded-lg"
          >
            Anmelden
          </Link>

          {/* SEITE: "Kostenlos starten" Button — ganz rechts in der Navbar.
              Hat einen Shimmer-Effekt: ein Glanz wandert von links nach rechts,
              endlos. Bei Hover wird er 5% größer, bei Klick 3% kleiner. */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/register"
              className="inline-flex items-center px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg"
              style={{
                background: "linear-gradient(90deg,#f472b6,#c084fc,#818cf8,#c084fc,#f472b6)",
                backgroundSize: "300% 100%",
                animation: "shimmerBtn 4s linear infinite",
              }}
            >
              Kostenlos starten
            </Link>
          </motion.div>

          {/* SEITE: Hamburger-Icon — ganz rechts, nur auf schmalen Bildschirmen (Handy).
              3 weiße Striche. Bei Klick: oberer Strich dreht 45°, mittlerer
              verschwindet, unterer dreht -45° → zusammen ergibt das ein X. */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 ml-1 rounded-lg hover:bg-white/8 transition-colors text-white"
            aria-label="Menü"
          >
            <div className="w-5 flex flex-col gap-[5px]">
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* SEITE: Mobile-Menü — klappt direkt unter der Navbar auf (nur Handy).
          Zeigt die drei Links + "Anmelden". Glaseffekt Hintergrund.
          Höhe wächst von 0 auf "auto" beim Öffnen. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-white/8 bg-black/80 backdrop-blur-xl"
          >
            <div className="px-5 py-3 space-y-1">
              {links.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  {label}
                </a>
              ))}
              <div className="pt-2 border-t border-white/8">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  Anmelden
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Typewriter
   SEITE: im Hero-Bereich, in der Zeile "Werde ein besserer ___".
   Tippt verschiedene Rollen ein und löscht sie wieder.
   ═══════════════════════════════════════════════════════════════ */
const TYPEWRITER_ROLES = [
  "Mathematik-Ass",
  "Lern-Maschine",
  "Prüfungssieger",
  "Produktivitäts-Pro",
];

function Typewriter() {
  const [displayed, setDisplayed] = useState("");
  const [roleIdx, setRoleIdx]     = useState(0);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    const target = TYPEWRITER_ROLES[roleIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < target.length) {
      timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60);
    } else if (!deleting && displayed.length === target.length) {
      timeout = setTimeout(() => setDeleting(true), 2200); /* 2.2s Pause bei vollem Wort */
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
    } else if (deleting && displayed.length === 0) {
      timeout = setTimeout(() => {
        setDeleting(false);
        setRoleIdx((i) => (i + 1) % TYPEWRITER_ROLES.length);
      }, 0);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, roleIdx]);

  return (
    /* SEITE: direkt nach "Werde ein besserer" im Hero-Text, links */
    <span className="inline-flex items-center gap-1 text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text">
      {displayed}
      {/* SEITE: blinkender Cursor — ein schmaler pink Strich rechts vom Typewriter-Text */}
      <span className="cursor-blink inline-block w-0.5 h-6 bg-pink-400 ml-0.5 align-middle" />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MagneticButton
   SEITE: wird als Wrapper für mehrere Buttons verwendet.
   Der Button bewegt sich leicht in Richtung der Maus.
   ═══════════════════════════════════════════════════════════════ */
function MagneticButton({ children, className = "", to }: {
  children: ReactNode;
  className?: string;
  to: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 280, damping: 20 });
  const springY = useSpring(y, { stiffness: 280, damping: 20 });

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.35);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.35);
  }, [x, y]);

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="inline-block"
    >
      <Link to={to} className={className}>{children}</Link>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HeroMockupCard
   SEITE: rechts im Hero-Bereich (auf Desktop), schwebt hoch
   und runter. Auf dem Handy unter dem Text. Zeigt eine
   gefälschte App-Vorschau mit Beispieldaten.
   ═══════════════════════════════════════════════════════════════ */
function HeroMockupCard() {
  return (
    /* SEITE: Glasmorphismus-Karte — rechts im Hero auf Desktop, unter Text auf Handy */
    <div className="bg-white/[0.06] backdrop-blur-2xl rounded-3xl p-5 w-full max-w-xs mx-auto border border-white/12 shadow-2xl">

      {/* SEITE: Karten-Header — oben in der Karte: Logo-Punkt + "Diese Woche" + Live-Badge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">StudyTracker</span>
          </div>
          <p className="text-sm font-bold text-white">Diese Woche</p>
        </div>

        {/* SEITE: grüner "Live"-Badge — oben rechts in der Karte.
            Der äußere grüne Ring pulsiert (wächst und verschwindet), der innere Kern bleibt. */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-full border border-emerald-500/25">
          <span className="relative flex h-1.5 w-1.5">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold text-emerald-400">Live</span>
        </div>
      </div>

      {/* SEITE: Hauptzahl + Wochenziel-Balken — oberer Bereich der Karte.
          "12h 34m" groß, darunter "Gesamt Lernzeit diese Woche", dann "83%" Balken. */}
      <div className="bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-2xl p-4 mb-3 border border-white/8">
        <p className="text-2xl font-black text-white">12h 34m</p>
        <p className="text-[10px] text-white/45 mt-0.5">Gesamt Lernzeit diese Woche</p>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
            <span>Wochenziel</span>
            <span className="font-bold text-purple-400">83 %</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            {/* Balken füllt sich auf 83% — animiert beim ersten Laden mit Überschwinger */}
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "83%" }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
        </div>
      </div>

      {/* SEITE: Fach-Liste — mittlerer Teil der Karte.
          Drei Zeilen: Mathematik, Englisch, Physik — je mit Farbpunkt + Zeit + Balken. */}
      <div className="space-y-2 mb-3">
        {[
          { s: "Mathematik", t: "4h 20m", c: "bg-pink-500",    p: "65%" },
          { s: "Englisch",   t: "3h 10m", c: "bg-purple-500",  p: "48%" },
          { s: "Physik",     t: "2h 05m", c: "bg-fuchsia-500", p: "31%" },
        ].map(({ s, t, c, p }) => (
          <div key={s} className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c}`} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] text-white/50">{s}</span>
                <span className="text-[10px] font-bold text-white/80">{t}</span>
              </div>
              <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full ${c} rounded-full opacity-50`} style={{ width: p }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEITE: Streak-Zeile — ganz unten in der Karte: "Streak" links, "🔥 7 Tage" rechts */}
      <div className="pt-3 border-t border-white/8 flex items-center justify-between">
        <span className="text-[10px] text-white/40">Streak</span>
        <div className="flex items-center gap-1">
          <span className="text-sm">🔥</span>
          <span className="text-xs font-black text-orange-400">7 Tage</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HeroSection
   SEITE: der erste Bereich der Seite — direkt unter der Navbar.
   Fast so hoch wie das Browserfenster (92vh).
   Links: Titel + Typewriter + Buttons. Rechts: schwebende Karte.
   ═══════════════════════════════════════════════════════════════ */
function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const cardY          = useTransform(scrollYProgress, [0, 1], [0, -60]);   /* Karte steigt beim Scrollen */
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]); /* Inhalt blendet aus */

  return (
    /* SEITE: erster Inhaltsbereich — direkt unter der Navbar, fast Vollbild hoch */
    <section ref={ref} className="relative min-h-[92vh] flex items-center overflow-hidden">
      <motion.div
        style={{ opacity: contentOpacity }} /* blendet aus wenn man 65% runterscrollt */
        className="max-w-6xl mx-auto px-5 py-20 w-full"
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Linke Spalte: gesamter Text-Block ───────────── */}
          <div className="min-w-0 overflow-hidden">

            {/* SEITE: Pill-Badge — ganz oben links im Hero, über dem Titel.
                Grüner Puls-Punkt + "Kostenlos — kein Abo, kein BS".
                Gleitet beim Laden von unten herein (0.2s Verzögerung). */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span className="text-white/70 text-xs font-medium">Kostenlos — kein Abo, kein BS</span>
            </motion.div>

            {/* SEITE: "STUDY" — großer weißer Titel, links im Hero.
                Fährt beim Laden von unten hoch (Clip-Path-Wipe: overflow-hidden
                schneidet ab, h1 startet bei y:105% und animiert auf 0%). */}
            <div className="mb-2 overflow-hidden">
              <motion.h1
                className="text-[clamp(3rem,9vw,7rem)] font-black text-white leading-none tracking-tighter"
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.3 }}
              >
                STUDY
              </motion.h1>
            </div>

            {/* SEITE: "TRACKER" — darunter, nur als lila Umriss (kein Füll).
                Gleicher Wipe-Effekt wie "STUDY", aber 0.17s später. */}
            <div className="mb-6 overflow-hidden">
              <motion.h1
                className="text-[clamp(3rem,9vw,7rem)] font-black leading-none tracking-tighter"
                style={{ WebkitTextStroke: "2px rgba(168,85,247,0.7)", color: "transparent" }}
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.47 }}
              >
                TRACKER
              </motion.h1>
            </div>

            {/* SEITE: dünne Trennlinie — zwischen Titel und Untertitel, links.
                Wächst beim Laden von links nach rechts (0.65s Verzögerung). */}
            <motion.div
              className="h-px bg-gradient-to-r from-pink-500/60 via-purple-500/60 to-transparent mb-6"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              style={{ transformOrigin: "left" }}
              transition={{ duration: 0.9, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* SEITE: Typewriter-Zeile — unter dem Titel links.
                "Werde ein besserer [tippender Text]". Blendet bei 0.8s ein. */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-base sm:text-lg text-white/60 mb-8 max-w-md"
            >
              Werde ein besserer <Typewriter />
            </motion.p>

            {/* SEITE: zwei CTA-Buttons — unter dem Typewriter-Text, links.
                Beide folgen leicht der Maus (MagneticButton).
                Blendet bei 1.0s ein und fährt von unten herein. */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="flex flex-wrap gap-4 mb-8"
            >
              {/* SEITE: weißer primärer Button "Jetzt loslegen — kostenlos" mit Pfeil */}
              <MagneticButton
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-xl shadow-xl text-sm"
              >
                Jetzt loslegen — kostenlos
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>

              {/* SEITE: transparenter sekundärer Button "Bereits registriert?" daneben */}
              <MagneticButton
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-white/20 text-white/70 hover:text-white font-semibold rounded-xl text-sm backdrop-blur-sm hover:bg-white/5 transition-colors"
              >
                Bereits registriert?
              </MagneticButton>
            </motion.div>

            {/* SEITE: drei Häkchen-Zeilen — unter den Buttons links.
                "Keine Kreditkarte", "In 30 Sekunden ready", "Daten dir gehören".
                Jeweils mit kleinem SVG-Häkchen davor. Blendet bei 1.15s ein. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.15 }}
              className="flex flex-wrap gap-5 text-white/35 text-xs"
            >
              {["Keine Kreditkarte", "In 30 Sekunden ready", "Daten dir gehören"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                    <path d="M1.5 6l3.5 3.5 5.5-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Rechte Spalte: schwebende App-Karte ────────────── */}
          <motion.div
            style={{ y: cardY }} /* steigt beim Scrollen leicht auf (Parallax) */
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex justify-center items-center mt-8 lg:mt-0"
          >
            {/* SEITE: lila-pink Glühen hinter der Karte — großer unschärfer Blob */}
            <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-pink-500/40 to-purple-500/40 rounded-3xl" />

            {/* SEITE: die App-Karte selbst — schwebt 14px hoch und runter, 5s Loop */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              <HeroMockupCard />
            </motion.div>

            {/* SEITE: schwarzes Popup "🔥 7-Tage-Streak" — oben links von der Karte.
                Nur auf breiten Bildschirmen sichtbar. Hat eigene Float-Animation (3.5s). */}
            <motion.div
              className="absolute -top-3 -left-3 sm:-left-8 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/10 hidden sm:flex"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-base">🔥</span>
              <div>
                <p className="text-[10px] font-black text-white leading-none">7-Tage-Streak</p>
                <p className="text-[9px] text-white/40">Weiter so!</p>
              </div>
            </motion.div>

            {/* SEITE: schwarzes Popup mit Uhr + "3h heute / Ziel: 4h" — unten rechts
                von der Karte. Nur auf breiten Bildschirmen. Float-Animation 4.2s,
                0.8s Versatz damit nicht synchron mit dem oberen Popup schwebt. */}
            <motion.div
              className="absolute -bottom-3 -right-3 sm:-right-8 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/10 hidden sm:flex"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            >
              <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="white" className="w-3 h-3">
                  <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.5a.75.75 0 0 0-.75.75v3.5c0 .28.154.537.401.671l2.5 1.25a.75.75 0 1 0 .698-1.342L8.75 8.131V5.25A.75.75 0 0 0 8 4.5Z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-white leading-none">3h heute</p>
                <p className="text-[9px] text-white/40">Ziel: 4h</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ArcRing
   SEITE: innerhalb der Stats-Karten — der kreisförmige
   Fortschrittsbalken der sich beim Einblenden füllt.
   ═══════════════════════════════════════════════════════════════ */
function ArcRing({ percent, color, delay = 0 }: { percent: number; color: string; delay?: number }) {
  const r    = 38;
  const circ = 2 * Math.PI * r;           /* Gesamtumfang des Kreises */
  const offset = circ - (percent / 100) * circ; /* Lücke = was nicht gefüllt ist */

  return (
    /* SEITE: SVG-Kreis 80px × 80px — zentriert oben in jeder Stats-Karte */
    <svg viewBox="0 0 96 96" className="w-20 h-20">
      {/* grauer Hintergrunds-Kreis — immer vollständig sichtbar */}
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      {/* farbiger Arc — wächst beim Einblenden von 0 auf percent%, mit Überschwinger */}
      <motion.circle
        cx="48" cy="48" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}   /* startet leer */
        animate={{ strokeDashoffset: offset }} /* füllt sich */
        transition={{ type: "spring", stiffness: 34, damping: 12, delay }}
        style={{ rotate: -90, transformOrigin: "48px 48px" }} /* -90° damit Arc oben anfängt */
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   StatsSection
   SEITE: direkt nach dem Hero — horizontaler Streifen mit
   oberer und unterer Trennlinie. Drei Karten nebeneinander.
   Animiert wenn man hinscrollt (30% sichtbar = Trigger).
   ═══════════════════════════════════════════════════════════════ */
function StatsSection() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useFramerInView(ref, { once: true, amount: 0.3 });

  const users  = useCounter(2000,  inView, 28);
  const hours  = useCounter(50000, inView, 25);
  const streak = useCounter(12,    inView, 55);

  const stats = [
    { value: `${users.toLocaleString("de")}+`,  label: "Aktive Lernende",          arc: 80, color: "#f472b6" },
    { value: `${hours.toLocaleString("de")}+`,  label: "Lernstunden getrackt",      arc: 65, color: "#c084fc" },
    { value: `${streak} Tage`,                  label: "Ø Streak",                  arc: 48, color: "#818cf8" },
  ];

  return (
    /* SEITE: direkt nach dem Hero — Streifen mit drei Karten nebeneinander */
    <div ref={ref} className="relative py-16 border-y border-white/6">
      <div className="max-w-4xl mx-auto px-5 grid grid-cols-3 gap-4 sm:gap-8">
        {stats.map(({ value, label, arc, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.14, duration: 0.5 }} /* Stagger: 0s, 0.14s, 0.28s */
            className="relative group text-center p-6 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/16 transition-colors overflow-hidden"
          >
            {/* SEITE: Leuchtfleck oben in der Karte — erscheint nur bei Hover.
                Radiales Gradient in der Karten-Farbe, oben zentriert. */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
              style={{ background: `radial-gradient(ellipse at top, ${color}30, transparent)` }}
            />

            {/* SEITE: Arc-Ring — oben in der Karte, zentriert */}
            <div className="flex justify-center mb-3">
              <ArcRing percent={arc} color={color} delay={i * 0.15 + 0.3} />
            </div>

            {/* SEITE: große Zahl — unter dem Arc-Ring, zentriert. Zählt beim Einblenden hoch. */}
            <p className="text-2xl sm:text-3xl font-black text-white mb-1">{value}</p>

            {/* SEITE: Label — ganz unten in der Karte, klein, gedimmt */}
            <p className="text-xs text-white/40">{label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MarqueeStrip
   SEITE: direkt nach den Stats — schmaler Streifen in dem
   Feature-Begriffe von rechts nach links laufen, endlos.
   ═══════════════════════════════════════════════════════════════ */
function MarqueeStrip() {
  const words = ["Fokus-Timer","Statistiken","Lern-Streaks","Dark Mode","Wochenziele","Achievements","Kategorien","Export","Auto-Speicherung","Erinnerungen"];
  const track = [...words, ...words, ...words]; /* 3× kopiert für nahtlosen Loop */

  return (
    /* SEITE: schmaler Streifen — nach den Stats, vor dem Features-Bereich */
    <div className="relative py-8 overflow-hidden border-b border-white/6">

      {/* SEITE: weißes Ausblenden links — damit Text am linken Rand verschwindet */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #050508, transparent)" }} />

      {/* SEITE: weißes Ausblenden rechts — damit Text am rechten Rand verschwindet */}
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #050508, transparent)" }} />

      {/* SEITE: der laufende Text — bewegt sich in 28s von 0% auf -33% nach links, dann Wiederholung */}
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-33.333%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {track.map((w, i) => (
          <span key={i} className="text-sm font-semibold tracking-[0.35em] text-white/25 uppercase">
            {w} <span className="text-pink-500/40">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FeatureCard
   SEITE: eine der drei Karten im Features-Bereich.
   Hebt sich beim Hover an, Leuchtfleck folgt der Maus.
   ═══════════════════════════════════════════════════════════════ */
function FeatureCard({ gradient, icon, title, description, tags, delay = 0 }: {
  gradient: string; icon: ReactNode; title: string; description: string; tags: string[]; delay?: number;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useFramerInView(ref, { once: true, amount: 0.2 });
  const [spot, setSpot] = useState({ x: 0, y: 0, show: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setSpot({ x: e.clientX - r.left, y: e.clientY - r.top, show: true });
  };

  return (
    /* SEITE: eine Karte im 3-Spalten-Raster des Features-Bereichs.
       Fährt beim Einblenden von unten herein, hebt sich 5px beim Hover. */
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      onMouseMove={handleMove}
      onMouseLeave={() => setSpot((s) => ({ ...s, show: false }))}
      className="relative rounded-2xl p-6 border border-white/8 bg-white/[0.03] overflow-hidden group transition-colors hover:border-white/15"
    >
      {/* SEITE: Maus-Leuchtfleck — erscheint nur wenn die Maus über der Karte ist.
          Folgt exakt der Mausposition innerhalb der Karte. 280px großes radiales Gradient. */}
      {spot.show && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: spot.x, top: spot.y,
            width: 280, height: 280,
            transform: "translate(-50%,-50%)",
            background: `radial-gradient(circle, ${gradient.includes("pink") ? "rgba(244,114,182,.12)" : "rgba(168,85,247,.12)"} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* SEITE: Icon-Container — oben links in der Karte. 40×40px Gradient-Quadrat.
          Bei Hover wird es 8% größer. Das SVG-Icon ist weiß, 20×20px. */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        className={`w-10 h-10 mb-5 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md`}
      >
        {icon}
      </motion.div>

      {/* SEITE: Karten-Titel — unter dem Icon, fett weiß */}
      <h3 className="text-base font-black text-white mb-2 group-hover:text-white/90 transition-colors">
        {title}
      </h3>

      {/* SEITE: Beschreibungstext — unter dem Titel, grau, kleiner */}
      <p className="text-white/45 text-sm leading-relaxed mb-4">{description}</p>

      {/* SEITE: Tags — kleine abgerundete Chips am unteren Rand der Karte.
          Bei Hover über einem Tag: springt 2px hoch und wird 8% größer. */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <motion.span
            key={tag}
            whileHover={{ scale: 1.08, y: -2 }}
            className="px-2.5 py-1 bg-white/6 border border-white/10 text-white/50 text-[11px] font-medium rounded-lg"
          >
            {tag}
          </motion.span>
        ))}
      </div>

      {/* SEITE: pink-lila Linie am unteren Kartenrand — unsichtbar (Breite 0),
          wächst beim Hover auf volle Kartenbreite (500ms Übergang). */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500 w-0 group-hover:w-full rounded-full" />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FeaturesSection
   SEITE: nach dem Marquee-Streifen — "Warum StudyTracker?"
   Titel oben zentriert, darunter drei Feature-Karten.
   ═══════════════════════════════════════════════════════════════ */
function FeaturesSection() {
  const headerRef    = useRef<HTMLDivElement>(null);
  const headerInView = useFramerInView(headerRef, { once: true, amount: 0.3 });

  const features = [
    {
      gradient: "from-pink-500 to-rose-500",
      /* Uhr-Icon: Kreis + Zeiger von 12 auf 3 Uhr + Markierung oben */
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2.5" />
          <path d="M7.5 2.5h5" />
        </svg>
      ),
      title: "Timer der nicht nervt",
      tags: ["Automatisch", "Pausieren", "Kategorien"],
      description: "Ein Klick — und du läufst. Kein kompliziertes Setup. Einfach loslegen und lernen.",
    },
    {
      gradient: "from-fuchsia-500 to-purple-500",
      /* Liniendiagramm-Icon: Zickzack aufwärts + horizontale Baseline */
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M3 14l4-5 4 3 4-6" />
          <path d="M2 17h16" />
        </svg>
      ),
      title: "Zahlen die motivieren",
      tags: ["Wöchentlich", "Vergleich", "Charts"],
      description: "Sieh schwarz auf weiß: Diese Woche 4 Stunden mehr als letzte Woche. Das fühlt sich gut an.",
    },
    {
      gradient: "from-violet-500 to-indigo-500",
      /* Zielscheibe: äußerer Kreis + innerer Kreis + 4 Achsen-Striche */
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="10" cy="10" r="7" />
          <circle cx="10" cy="10" r="3" />
          <path d="M10 3V1M10 19v-2M3 10H1M19 10h-2" />
        </svg>
      ),
      title: "Ziele die Spaß machen",
      tags: ["Streaks", "Achievements", "Erinnerungen"],
      description: "Setz Wochenziele und lass StudyTracker mitfiebern. Streaks, Meilensteine — gutes Gefühl garantiert.",
    },
  ];

  return (
    /* SEITE: nach dem Marquee-Streifen — Abschnitt "Warum StudyTracker?" */
    <section id="funktionen" className="relative py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5">

        {/* SEITE: Header-Block — oben zentriert im Abschnitt */}
        <div ref={headerRef} className="text-center mb-14">

          {/* SEITE: Pill "WARUM STUDYTRACKER?" — oben zentriert, kleiner abgerundeter Kasten */}
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-4 uppercase tracking-wide"
          >
            Warum StudyTracker?
          </motion.span>

          {/* SEITE: Headline "So einfach, dass du keine Ausrede mehr hast" — zentriert,
              zweizeilig, zweite Zeile in pink-lila Gradient. Clip-Path-Wipe von unten. */}
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%" }}
              animate={headerInView ? { y: "0%" } : {}}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.76, 0, 0.24, 1] }}
              className="text-3xl sm:text-4xl font-black text-white mb-3"
            >
              So einfach, dass du
              <br />
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                keine Ausrede mehr hast
              </span>
            </motion.h2>
          </div>

          {/* SEITE: Untertitel — unter der Headline, zentriert, grau */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={headerInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="text-white/45 max-w-lg mx-auto text-sm sm:text-base"
          >
            Kein Onboarding-Tutorial. Kein Kalender synchronisieren. Einfach loslegen.
          </motion.p>
        </div>

        {/* SEITE: drei Feature-Karten — nebeneinander (Desktop), übereinander (Handy) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AllInOneSection
   SEITE: nach dem Features-Bereich — "Alles drin. Nichts
   Überflüssiges." Links: Checklist. Rechts: Balkendiagramm.
   ═══════════════════════════════════════════════════════════════ */
function AllInOneSection() {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftIn   = useFramerInView(leftRef,  { once: true, amount: 0.2 });
  const rightIn  = useFramerInView(rightRef, { once: true, amount: 0.2 });

  const items = [
    { emoji: "🗂️", title: "Fach-Kategorien", desc: "Eigene Fächer mit Farben und Icons." },
    { emoji: "🔥", title: "Tages-Streaks",   desc: "Täglich lernen, Streak am Leben halten." },
    { emoji: "🌙", title: "Dark Mode",        desc: "Augenschonend für Late-Night-Sessions." },
    { emoji: "📤", title: "Export",           desc: "Deine Daten als CSV oder PDF." },
  ];

  const bars = [
    { day: "Mo", h: 65,  hot: false },
    { day: "Di", h: 40,  hot: false },
    { day: "Mi", h: 80,  hot: false },
    { day: "Do", h: 55,  hot: false },
    { day: "Fr", h: 100, hot: true  }, /* Freitag = höchster Balken, Gradient-Highlight */
    { day: "Sa", h: 35,  hot: false },
    { day: "So", h: 25,  hot: false },
  ];

  return (
    /* SEITE: nach den Feature-Karten — zweispaltiger Abschnitt */
    <section id="ueber" className="relative py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Linke Spalte: Checklist ──────────────────────── */}
          <div ref={leftRef}>

            {/* SEITE: Pill "KOMPLETTLÖSUNG" — oben links im Abschnitt */}
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={leftIn ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-5 uppercase tracking-wide"
            >
              Komplettlösung
            </motion.span>

            {/* SEITE: Headline "Alles drin. Nichts Überflüssiges." — links,
                zweizeilig, zweite Zeile Gradient. Clip-Path-Wipe von unten. */}
            <div className="overflow-hidden mb-3">
              <motion.h2
                initial={{ y: "100%" }}
                animate={leftIn ? { y: "0%" } : {}}
                transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
                className="text-3xl sm:text-4xl font-black text-white leading-tight"
              >
                Alles drin.
                <br />
                <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Nichts Überflüssiges.
                </span>
              </motion.h2>
            </div>

            {/* SEITE: Unterzeile — unter der Headline links, grau klein */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={leftIn ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
              className="text-white/45 mb-10 text-sm"
            >
              StudyTracker ist kein Feature-Monster. Nur was wirklich hilft.
            </motion.p>

            {/* SEITE: vier Checklist-Zeilen — links untereinander.
                Gleiten beim Einblenden von links herein (Stagger 0.1s).
                Bei Hover schiebt sich jede Zeile 4px nach rechts. */}
            <div className="space-y-3">
              {items.map(({ emoji, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -24 }}
                  animate={leftIn ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05] transition-colors group"
                >
                  <span className="text-xl flex-shrink-0">{emoji}</span>
                  <div>
                    <p className="font-bold text-white text-sm group-hover:text-white/90">{title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* SEITE: "Jetzt ausprobieren" Button — unter der Checklist links */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={leftIn ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7 }}
              className="mt-8"
            >
              <MagneticButton
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-xl shadow-xl text-sm"
              >
                Jetzt ausprobieren
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>
            </motion.div>
          </div>

          {/* ── Rechte Spalte: Balkendiagramm ───────────────── */}
          <motion.div
            ref={rightRef}
            initial={{ opacity: 0, x: 36 }} /* gleitet von rechts herein */
            animate={rightIn ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* SEITE: Diagramm-Panel — rechts im Abschnitt, Glaseffekt Hintergrund */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-6 border border-white/10">

              {/* SEITE: Panel-Header — "Wochenübersicht" links, "Mai 2026" rechts */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-bold text-sm">Wochenübersicht</p>
                <span className="text-white/35 text-xs">Mai 2026</span>
              </div>
              {/* SEITE: Untertitel — "Lernstunden pro Tag", grau, klein */}
              <p className="text-white/35 text-xs mb-6">Lernstunden pro Tag</p>

              {/* SEITE: sieben Balken (Mo–So) — wachsen von unten nach oben beim Einblenden.
                  Freitag ist der höchste Balken (100%) mit pink-lila Gradient.
                  Alle anderen sind weiß/20%. Stagger: 80ms zwischen jedem Balken. */}
              <div className="mb-3">
                <div className="relative h-28 flex gap-1.5">
                  {bars.map((bar, i) => (
                    <div key={bar.day} className="flex-1 relative">
                      <motion.div
                        className={`absolute bottom-0 left-0 right-0 rounded-t-md ${bar.hot ? "bg-gradient-to-t from-pink-500 to-purple-400" : "bg-white/20"}`}
                        style={{ height: `${bar.h}%`, originY: 1 }} /* originY:1 = von unten wachsen */
                        initial={{ scaleY: 0 }}
                        animate={rightIn ? { scaleY: 1 } : { scaleY: 0 }}
                        transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    </div>
                  ))}
                </div>

                {/* SEITE: Wochentag-Labels — direkt unter den Balken (Mo, Di, Mi ...) */}
                <div className="flex gap-1.5 mt-1.5">
                  {bars.map((bar) => (
                    <div key={bar.day} className="flex-1 flex justify-center">
                      <span className={`text-[9px] font-semibold ${bar.hot ? "text-white" : "text-white/35"}`}>
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEITE: drei Kennzahlen-Chips — unter dem Diagramm.
                  "38h Gesamt", "5.4h Ø / Tag", "7 🔥 Streak" nebeneinander. */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                {[{ l: "Gesamt", v: "38h" }, { l: "Ø / Tag", v: "5.4h" }, { l: "Streak", v: "7 🔥" }].map(({ l, v }) => (
                  <div key={l} className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
                    <p className="text-white font-black text-sm">{v}</p>
                    <p className="text-white/35 text-[10px] mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAQSection
   SEITE: nach dem AllInOne-Abschnitt — "Häufige Fragen".
   Schmal (max. halbe Seitenbreite), zentriert.
   Vier aufklappbare Fragen, erste ist beim Laden schon offen.
   ═══════════════════════════════════════════════════════════════ */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0); /* 0 = erste Frage offen */
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useFramerInView(ref, { once: true, amount: 0.1 });

  const faqs = [
    { q: "Wirklich kostenlos? Kein Haken?",    a: "Kein Haken. StudyTracker ist kostenlos und bleibt es. Keine Kreditkarte, kein Abo. Einfach registrieren." },
    { q: "Wie funktioniert der Timer genau?",   a: "Fach auswählen → Timer starten → lernen. Fertig. Alles wird automatisch gespeichert." },
    { q: "Kann ich eigene Fächer anlegen?",     a: "Klar! So viele wie du willst — von Mathe bis Gitarrenüben. Jedes mit Farbe und Icon." },
    { q: "Was passiert mit meinen Daten?",      a: "Deine Daten gehören dir. Niemals weitergegeben, niemals verkauft. Jederzeit exportierbar oder löschbar." },
  ];

  return (
    /* SEITE: vierter Hauptabschnitt — schmale zentrierte Spalte */
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="max-w-2xl mx-auto px-5">

        {/* SEITE: Header — oben zentriert im FAQ-Bereich */}
        <div className="text-center mb-10" ref={ref}>

          {/* SEITE: Pill "FAQ" — ganz oben zentriert */}
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-4 uppercase tracking-wide"
          >
            FAQ
          </motion.span>

          {/* SEITE: Headline "Häufige Fragen" — zentriert, Clip-Path-Wipe */}
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%" }}
              animate={inView ? { y: "0%" } : {}}
              transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
              className="text-3xl sm:text-4xl font-black text-white"
            >
              Häufige Fragen
            </motion.h2>
          </div>
        </div>

        {/* SEITE: vier aufklappbare Fragen — untereinander, volle Breite der schmalen Spalte */}
        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-2xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-white/15 transition-colors"
            >
              {/* SEITE: Frage-Zeile — klickbar, Frage links, Plus-Icon rechts.
                  Bei Klick klappt die Antwort auf/zu. Plus dreht sich zu X wenn offen. */}
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                className="w-full flex items-center justify-between px-5 py-4 text-left group"
              >
                <span className="font-semibold text-white/80 text-sm pr-4 group-hover:text-white transition-colors">
                  {q}
                </span>
                {/* SEITE: Plus-Icon — ganz rechts in jeder Frage-Zeile.
                    pink-lila Gradient-Kreis. Dreht sich 45° wenn Antwort offen ist. */}
                <motion.span
                  animate={{ rotate: openIdx === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-sm"
                >
                  <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth={2.5} className="w-2.5 h-2.5">
                    <path d="M6 2v8M2 6h8" strokeLinecap="round" />
                  </svg>
                </motion.span>
              </button>

              {/* SEITE: Antwort-Bereich — klappt direkt unter der Frage auf.
                  Höhe wächst von 0 auf automatisch (AnimatePresence).
                  Trennlinie zwischen Frage und Antwort-Text. */}
              <AnimatePresence initial={false}>
                {openIdx === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                  >
                    {/* SEITE: dünne Trennlinie — zwischen Frage und Antwort, pink→lila→transparent */}
                    <div className="h-px bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-transparent mx-5" />
                    <p className="px-5 py-4 text-white/45 text-sm leading-relaxed">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* SEITE: CTA-Block — unter den FAQ-Fragen, zentriert.
            "Am besten einfach ausprobieren 👇" + Gradient-Button. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55 }}
          className="text-center mt-12"
        >
          <p className="text-white/30 text-sm mb-5">Am besten einfach ausprobieren 👇</p>
          <MagneticButton
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl shadow-xl text-sm hover:opacity-90 transition-opacity"
          >
            Kostenlos registrieren
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Footer
   SEITE: ganz unten auf der Seite — nach dem FAQ-Bereich.
   Dünne Trennlinie oben, drei Bereiche nebeneinander.
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    /* SEITE: ganz unten — dünne Linie oben, dann Logo + Links + Copyright */
    <footer className="relative border-t border-white/6 py-8">
      <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* SEITE: Logo — links im Footer. Kleines "S"-Quadrat + "StudyTracker" gedimmt.
            Bei Hover: dreht sich leicht. */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: -3 }}
            className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"
          >
            <span className="text-white text-[10px] font-black">S</span>
          </motion.div>
          <span className="text-sm font-black text-white/60">StudyTracker</span>
        </Link>

        {/* SEITE: drei Links — Mitte des Footers. "Datenschutz", "AGB", "Kontakt". */}
        <div className="flex items-center gap-6 text-xs text-white/25">
          {[
            { label: "Datenschutz", to: "/datenschutz" },
            { label: "AGB",         to: "/agb" },
            { label: "Kontakt",     to: "/kontakt" },
          ].map(({ label, to }) => (
            <Link key={to} to={to} className="hover:text-white/60 transition-colors">
              {label}
            </Link>
          ))}
        </div>

        {/* SEITE: Copyright — rechts im Footer. Jahr kommt automatisch aus Date. */}
        <p className="text-xs text-white/20">© {new Date().getFullYear()} StudyTracker</p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Landing — Hauptexport
   Setzt alle Komponenten zusammen.
   ═══════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [loaded, setLoaded] = useState(false);
  useLenis();

  return (
    <>
      {/* Globale CSS-Keyframes — unsichtbar, nur Animationsdefinitionen */}
      <style>{GLOBAL_CSS}</style>

      {/* SEITE: PageLoader — schwarzes Vollbild beim allerersten Laden (z-2000).
          Verschwindet nach ~1.8s mit Fade-out. */}
      <AnimatePresence>
        {!loaded && <PageLoader onDone={() => setLoaded(true)} />}
      </AnimatePresence>

      {/* SEITE: GridBackground — fixierter Hintergrund, scrollt nicht mit (z-0) */}
      <GridBackground />

      {/* SEITE: FloatingShapes — fixierte dekorative Ringe/Punkte/+ im Hintergrund (z-1) */}
      <FloatingShapes />

      {/* SEITE: FilmGrain — fixiertes Rauschen-Overlay über allem (z-999) */}
      <FilmGrain />

      {/* SEITE: ScrollProgress — 2px Linie ganz oben am Browserrand (z-1000) */}
      <ScrollProgress />

      {/* SEITE: CustomCursor — folgt der Maus (kleiner Kreis z-1001, Glow z-998) */}
      <CustomCursor />

      {/* SEITE: gesamter scrollbarer Seiteninhalt — z-10, über dem Hintergrund */}
      <div className="relative z-10 min-h-screen">
        <Navbar />          {/* sticky oben */}
        <HeroSection />     {/* erster Bereich, fast Vollbild */}
        <StatsSection />    {/* 3 Karten mit Zahlen */}
        <MarqueeStrip />    {/* laufende Stichworte */}
        <FeaturesSection /> {/* 3 Feature-Karten */}
        <AllInOneSection /> {/* Checklist + Balkendiagramm */}
        <FAQSection />      {/* 4 aufklappbare Fragen */}
        <Footer />          {/* ganz unten */}
      </div>
    </>
  );
}
