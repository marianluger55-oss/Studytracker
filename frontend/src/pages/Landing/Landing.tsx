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
  useState /* lokaler State: Zähler, Flags, Positionen */,
  useEffect /* Side-Effects: Event-Listener, Timer, DOM-Änderungen */,
  useRef /* Referenz auf DOM-Element (für BoundingRect, Scroll-Target) */,
  useCallback /* Memoized Callback — verhindert Neu-Render bei Props-Vergleich */,
  type ReactNode /* TypeScript-Typ für JSX-Children (kein Runtime-Import nötig) */,
} from "react";
import { Link } from "react-router-dom"; /* Client-seitiger Router-Link (kein Page-Reload) */
import {
  motion /* Animiertes HTML-Element (motion.div, motion.h1 usw.) */,
  AnimatePresence /* Mount/Unmount-Animationen (exit-Prop wird ausgeführt) */,
  useScroll /* Liefert scrollYProgress als MotionValue (0–1) */,
  useSpring /* Macht eine MotionValue federnd (stiffness/damping) */,
  useMotionValue /* Mutable MotionValue ohne Re-Render bei Änderung */,
  useTransform /* Mapped eine MotionValue auf eine andere (z.B. 0–1 → 0px–60px) */,
  LayoutGroup /* Ermöglicht shared-layout Animationen zwischen Geschwistern */,
  useInView as useFramerInView /* true wenn Element im Viewport — für Scroll-Trigger-Animationen */,
} from "framer-motion";

/* ── Smooth Scroll via CSS ───────────────────────────────────── */
/* Setzt scroll-behavior: smooth auf <html> — kein externes Paket nötig */
function useLenis() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior =
      "smooth"; /* Alle Anchor-Links scrollen sanft */
    return () => {
      document.documentElement.style.scrollBehavior =
        ""; /* Cleanup: Standardverhalten wiederherstellen */
    };
  }, []); /* Leeres Array = nur beim Mount/Unmount ausführen */
}

/* ── Animierter Counter ──────────────────────────────────────── */
/* Zählt von 0 auf target wenn start = true, power-curve Easing */
function useCounter(target: number, start = false, duration = 50) {
  const [val, setVal] = useState(0); /* Aktueller Anzeigewert (startet bei 0) */
  useEffect(() => {
    if (!start) return; /* Noch nicht im Viewport — nichts tun */
    let frame = 0; /* Aktueller Animations-Frame (0–50) */
    const total = 50; /* Gesamtanzahl Frames für die Animation */
    const id = setInterval(() => {
      frame++; /* Nächsten Frame berechnen */
      /* power-curve: frame^0.6 macht den Anfang schnell, Ende sanft */
      setVal(Math.round(Math.pow(frame / total, 0.6) * target));
      if (frame >= total) clearInterval(id); /* Fertig: Interval stoppen */
    }, duration); /* duration ms pro Frame (z.B. 28ms × 50 = 1.4s Animation) */
    return () => clearInterval(id); /* Cleanup falls Komponente unmountet */
  }, [start, target, duration]); /* Neu starten wenn start true wird */
  return val; /* Aktueller Anzeigewert für das JSX */
}

/* ── CSS Keyframes (nicht über Tailwind abbildbar) ───────────── */
const GLOBAL_CSS = `
  /* Filmkorn verschiebt sich in 10 Schritten */
  @keyframes grain {
    0%,100%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}
    20%{transform:translate(3%,1%)}30%{transform:translate(-1%,4%)}
    40%{transform:translate(4%,-2%)}50%{transform:translate(-3%,3%)}
    60%{transform:translate(1%,-4%)}70%{transform:translate(-4%,2%)}
    80%{transform:translate(3%,-1%)}90%{transform:translate(-2%,4%)}
  }
  /* Scan-Linie von oben nach unten */
  @keyframes scan {
    0%   { top: -2px; }
    100% { top: 100%; }
  }
  /* Rotierende Ringe */
  @keyframes spinCW  { to { transform: rotate(360deg);  } }
  @keyframes spinCCW { to { transform: rotate(-360deg); } }
  /* Floating + Zeichen */
  @keyframes floatPlus {
    0%,100%{transform:translateY(0); opacity:.08;}
    50%{transform:translateY(-18px); opacity:.13;}
  }
  /* Dot-Cluster Puls */
  @keyframes dotPulse {
    0%,100%{opacity:.08;} 50%{opacity:.18;}
  }
  /* Typewriter-Cursor blinkt */
  @keyframes blink {
    0%,100%{opacity:1;} 50%{opacity:0;}
  }
  /* Nativen Cursor nur auf Geräten mit präzisem Zeiger (Mouse/Trackpad) ausblenden.
     Touch-Screens und Hybrid-Geräte ohne Fine-Pointer behalten ihren Cursor. */
  @media (hover: hover) and (pointer: fine) {
    * { cursor: none !important; }
  }

  .grain-layer {
    animation: grain 8s steps(10) infinite; /* 8s-Loop in 10 diskreten Schritten */
  }
  .scan-line {
    animation: scan 12s linear infinite; /* Scan-Linie fährt in 12s von oben nach unten */
  }
  .spin-cw-40s  { animation: spinCW  40s linear infinite; } /* Uhrzeigersinn, 40s pro Umdrehung */
  .spin-ccw-60s { animation: spinCCW 60s linear infinite; } /* Gegen Uhrzeigersinn, 60s */
  .spin-ccw-50s { animation: spinCCW 50s linear infinite; } /* Gegen Uhrzeigersinn, 50s */
  .float-plus   { animation: floatPlus 6s ease-in-out infinite; } /* Schwebendes + */
  .dot-pulse-1  { animation: dotPulse 3s ease-in-out      0.0s infinite; } /* Punkt 1: kein Versatz */
  .dot-pulse-2  { animation: dotPulse 3s ease-in-out      0.3s infinite; } /* Punkt 2: 0.3s Versatz */
  .dot-pulse-3  { animation: dotPulse 3s ease-in-out      0.6s infinite; } /* Punkt 3: 0.6s Versatz */
  .dot-pulse-4  { animation: dotPulse 3s ease-in-out      0.9s infinite; } /* Punkt 4: 0.9s Versatz */
  .cursor-blink { animation: blink .9s step-end infinite; } /* Typewriter-Cursor blinkt */
  /* Shimmer für Nav-CTA-Button */
  @keyframes shimmerBtn {
    0%   { background-position: -200% center; } /* Glanz links außen */
    100% { background-position:  200% center; } /* Glanz rechts außen */
  }
`;

/* ═══════════════════════════════════════════════════════════════
   FilmGrain
   Animiertes SVG-Korn als fixiertes Overlay (z-index 999).
   ═══════════════════════════════════════════════════════════════ */
function FilmGrain() {
  return (
    /* fixed: immer über dem Inhalt, pointer-events none damit Klicks durchgehen */
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
      {/* grain-layer: verschiebt sich per CSS-Animation (zufälliges Rauschen-Muster) */}
      <svg
        className="grain-layer w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4"
        /* 200% Breite + Versatz verhindert sichtbare Kanten beim Verschieben */
        aria-hidden="true" /* Screen Reader ignoriert dekoratives SVG */
      >
        <filter id="grain-filter">
          {/* feTurbulence erzeugt Rausch-Textur (fractalNoise = natürlicheres Korn) */}
          <feTurbulence
            type="fractalNoise" /* fractalNoise statt turbulence = weicheres Korn */
            baseFrequency="0.65" /* Frequenz: höher = feineres Korn */
            numOctaves="3" /* Schichten: mehr = detaillierteres Muster */
            stitchTiles="stitch" /* Nahtloser Übergang an Kachel-Grenzen */
          />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter="url(#grain-filter)" /* Filter oben anwenden */
          opacity="0.035" /* Sehr dezent: nur 3.5% sichtbar */
        />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ScrollProgress
   2px spring-animierte Linie am obersten Rand.
   ═══════════════════════════════════════════════════════════════ */
function ScrollProgress() {
  /* useScroll liefert scrollYProgress zwischen 0 (oben) und 1 (unten) */
  const { scrollYProgress } = useScroll();
  /* useSpring macht es federnd statt starr — stiffness/damping steuern Sprungkraft */
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      style={{
        scaleX,
        transformOrigin: "left",
      }} /* scaleX: 0 = kein Balken, 1 = voller Balken */
      className="fixed top-0 left-0 right-0 z-[1000] h-0.5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 pointer-events-none"
      /* z-[1000] über allem außer Cursor (1001) und Loader (2000) */
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   GridBackground
   Fixierter Hintergrund hinter allem:
    - Aurora-Blobs (3 weiche Ellipsen die sich bewegen)
    - Dot-Grid (statisches Raster)
    - Scan-Linie
    - Radiales Edge-Fade
   ═══════════════════════════════════════════════════════════════ */
function GridBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#050508]">
      {/* ── Aurora-Blobs ────────────────────────────────────── */}

      {/* Blob 1: oben links — pink */}
      <motion.div
        className="absolute w-[700px] h-[500px] rounded-full blur-[120px] opacity-[0.12]"
        /* blur-[120px]: extrem weich → wirkt wie Umgebungslicht, nicht wie Form */
        style={{
          background:
            "radial-gradient(ellipse, #ec4899 0%, transparent 70%)" /* Pink nach transparent */,
          left: "-10%" /* Leicht links vom Rand damit Blob nicht abgeschnitten wirkt */,
          top: "-5%",
        }}
        animate={{
          x: [0, 40, -20, 0] /* Driftet 40px rechts, dann 20px links, zurück */,
          y: [0, 30, -10, 0] /* Driftet 30px runter, dann 10px hoch, zurück */,
          scale: [1, 1.1, 0.95, 1] /* Pulsiert leicht in der Größe */,
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }} /* 18s-Schleife */
      />

      {/* Blob 2: oben rechts — lila */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.10]"
        style={{
          background:
            "radial-gradient(ellipse, #a855f7 0%, transparent 70%)" /* Lila */,
          right: "-8%",
          top: "-10%",
        }}
        animate={{
          x: [0, -50, 20, 0] /* Gegenläufig zu Blob 1 */,
          y: [0, 40, -15, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }} /* 22s — anderer Rhythmus */
      />

      {/* Blob 3: unten Mitte — indigo */}
      <motion.div
        className="absolute w-[800px] h-[400px] rounded-full blur-[160px] opacity-[0.08]"
        /* opacity[0.08]: schwächster Blob — liegt im Hintergrund */
        style={{
          background:
            "radial-gradient(ellipse, #6366f1 0%, transparent 70%)" /* Indigo */,
          left: "15%",
          bottom: "-5%",
        }}
        animate={{
          x: [0, 30, -40, 0],
          y: [0, -20, 15, 0],
          scale: [1, 1.05, 0.98, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }} /* 15s — schnellster */
      />

      {/* ── Dot-Grid ────────────────────────────────────────── */}
      {/* Gleichmäßiges Raster aus 1px-Punkten (36px Abstand) */}
      <div
        className="absolute inset-0 opacity-[0.18]" /* 18% Deckkraft: sichtbar aber dezent */
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
          /* 1px weißer Punkt, Rest transparent */
          backgroundSize:
            "36px 36px" /* Gittergröße: 36px horizontal + vertikal */,
        }}
      />

      {/* ── Scan-Linie ──────────────────────────────────────── */}
      {/* 1px Horizontallinie fährt von oben nach unten, 12s Loop */}
      <div
        className="scan-line absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(168,85,247,.06), transparent)",
          /* Linie ist in der Mitte leicht lila, an den Seiten transparent */
        }}
      />

      {/* ── Radiales Edge-Fade ──────────────────────────────── */}
      {/* Blendet Ränder aus damit Blobs nicht hart abschneiden */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #050508 100%)",
          /* Mitte transparent (Inhalte sichtbar), Rand Hintergrundfarbe (Blobs ausblenden) */
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FloatingShapes
   Dekorative fixierte Elemente:
    - 2 rotierende gestrichelte Ringe (oben rechts)
    - 1 rotierender Ring (unten links)
    - Floating "+" (rechts Mitte)
    - Dot-Cluster (links oben)
    - Vertikale Linie (unten rechts)
    - Rotierendes Quadrat (links Mitte)
   ═══════════════════════════════════════════════════════════════ */
function FloatingShapes() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden hidden md:block">
      {/* ── Rotierende gestrichelte Ringe (oben rechts) ──────── */}
      <div className="absolute top-[8%] right-[6%]">
        {" "}
        {/* Ankerpunkt für beide Ringe */}
        {/* Äußerer Ring — rotiert im Uhrzeigersinn, 40s pro Umdrehung */}
        <div
          className="spin-cw-40s absolute"
          style={{
            width: 160,
            height: 160,
            border:
              "1px dashed rgba(168,85,247,.12)" /* Gestrichelt, lila, sehr dezent */,
            borderRadius: "50%" /* Rund */,
            top: -80 /* Zentriert relativ zum Ankerpunkt (160/2 = 80) */,
            left: -80,
          }}
        />
        {/* Innerer Ring — rotiert gegen Uhrzeigersinn, 60s */}
        <div
          className="spin-ccw-60s absolute"
          style={{
            width: 100,
            height: 100,
            border: "1px dashed rgba(236,72,153,.10)" /* Pink, noch dezenter */,
            borderRadius: "50%",
            top: -50 /* Zentriert (100/2 = 50) */,
            left: -50,
          }}
        />
      </div>

      {/* ── Rotierender Ring (unten links) ───────────────────── */}
      <div
        className="spin-ccw-50s absolute bottom-[12%] left-[4%]"
        style={{
          width: 200,
          height: 200,
          border:
            "1px dashed rgba(99,102,241,.08)" /* Indigo, fast unsichtbar */,
          borderRadius: "50%",
        }}
      />

      {/* ── Floating "+" (rechts Mitte) ──────────────────────── */}
      {/* float-plus: schwebt hoch und runter per CSS-Animation */}
      <div className="float-plus absolute right-[8%] top-[45%] font-mono text-white text-2xl select-none">
        + {/* select-none: nicht markierbar — rein dekorativ */}
      </div>

      {/* ── Dot-Cluster (links oben ~15%/25%) ────────────────── */}
      {/* 4 Punkte in 2×2-Raster, jeder pulsiert mit Stagger (0, 0.3, 0.6, 0.9s) */}
      <div className="absolute left-[15%] top-[25%] grid grid-cols-2 gap-3">
        <div className="dot-pulse-1 w-1.5 h-1.5 rounded-full bg-white" />{" "}
        {/* Kein Versatz */}
        <div className="dot-pulse-2 w-1.5 h-1.5 rounded-full bg-white" />{" "}
        {/* 0.3s Versatz */}
        <div className="dot-pulse-3 w-1.5 h-1.5 rounded-full bg-white" />{" "}
        {/* 0.6s Versatz */}
        <div className="dot-pulse-4 w-1.5 h-1.5 rounded-full bg-white" />{" "}
        {/* 0.9s Versatz */}
      </div>

      {/* ── Vertikale Gradient-Linie (unten rechts) ──────────── */}
      <motion.div
        className="absolute bottom-[15%] right-[18%] w-px" /* 1px breit */
        style={{
          height: 96,
          background:
            "linear-gradient(to bottom, rgba(168,85,247,.4), transparent)" /* Lila → unsichtbar */,
        }}
        animate={{
          opacity: [0.3, 0.7, 0.3],
          scaleY: [0.8, 1, 0.8],
        }} /* Pulsiert in Helligkeit + Höhe */
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Rotierendes Quadrat (links Mitte) ────────────────── */}
      <motion.div
        className="absolute left-[6%] top-[55%]"
        style={{
          width: 16,
          height: 16,
          border: "1px solid rgba(236,72,153,.18)" /* Pink, 18% Deckkraft */,
          borderRadius: 1 /* Leicht abgerundete Ecken */,
        }}
        animate={{
          rotate: [0, 45, 0],
          opacity: [0.18, 0.35, 0.18],
        }} /* Dreht sich 45° hin und zurück */
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CustomCursor
   Zwei Ebenen:
    - Kleiner scharfer 12px Kreis (mix-blend-difference, hohe Steifigkeit)
    - Großer 500px Glow (niedrige Steifigkeit, träge)
   Erscheint erst nach erster Mausbewegung.
   ═══════════════════════════════════════════════════════════════ */
function CustomCursor() {
  /* MotionValues für Cursor-Position — keine Re-Renders bei Mausbewegung */
  const mouseX = useMotionValue(-200); /* Startet außerhalb des Viewports */
  const mouseY = useMotionValue(-200);

  /* Kleiner Cursor: hohe Steifigkeit → folgt sofort, kaum Nachlauf */
  const smallX = useSpring(mouseX, { stiffness: 500, damping: 28 });
  const smallY = useSpring(mouseY, { stiffness: 500, damping: 28 });

  /* Großer Glow: niedrige Steifigkeit → träge nachziehen (Schweif-Effekt) */
  const glowX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const glowY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  const [visible, setVisible] =
    useState(false); /* false bis erste Mausbewegung */

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX); /* Rohe Viewport-Koordinaten direkt schreiben */
      mouseY.set(e.clientY);
      if (!visible) setVisible(true); /* Beim ersten Move einblenden */
    };
    const onLeave = () => setVisible(false); /* Maus verlässt Fenster */
    const onEnter = () => setVisible(true); /* Maus betritt Fenster */

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener(
        "mousemove",
        onMove,
      ); /* Cleanup: kein Speicherleck */
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [
    mouseX,
    mouseY,
    visible,
  ]); /* visible in Deps damit setVisible korrekt referenziert */

  return (
    <>
      {/* Kleiner scharfer Kreis — mix-blend-difference invertiert Farben darunter */}
      <motion.div
        style={{
          x: smallX /* Framer-Motion x/y statt left/top → GPU-optimiert */,
          y: smallY,
          translateX: "-50%" /* Kreis-Mittelpunkt auf Mauszeiger zentrieren */,
          translateY: "-50%",
          opacity: visible ? 1 : 0 /* Erst nach erster Mausbewegung sichtbar */,
          mixBlendMode:
            "difference" /* Invertiert Pixel darunter → Kreis ist immer sichtbar */,
        }}
        className="fixed top-0 left-0 z-[1001] w-3 h-3 rounded-full bg-white pointer-events-none"
        /* z-[1001]: über allem (höchster z-index in der gesamten Seite) */
      />
      {/* Großer Glow-Kreis — sanfte warme Ausleuchtung */}
      <motion.div
        style={{
          x: glowX,
          y: glowY,
          translateX: "-50%",
          translateY: "-50%",
          opacity: visible ? 0.06 : 0 /* Nur 6% — sehr subtil */,
          background:
            "radial-gradient(circle, rgba(168,85,247,1) 0%, transparent 70%)" /* Lila Glow */,
        }}
        className="fixed top-0 left-0 z-[998] w-[500px] h-[500px] rounded-full pointer-events-none"
        /* z-[998]: unter Cursor (1001) und Film-Grain (999), über allem anderen */
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PageLoader
   Vollflächiges Overlay beim ersten Laden.
   Zeigt "ST" mit scale+blur-Einblendung + Fortschrittsbalken.
   Nach 1.8s: AnimatePresence fade-out.
   ═══════════════════════════════════════════════════════════════ */
function PageLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0); /* Balken-Füllstand 0–100 */

  useEffect(() => {
    /* Balken füllt sich in 1.2s via requestAnimationFrame (smooth, kein Flackern) */
    const start = performance.now(); /* Startzeit für relativen Fortschritt */
    const duration = 1200; /* 1.2 Sekunden bis 100% */
    const tick = (now: number) => {
      const p = Math.min(
        (now - start) / duration,
        1,
      ); /* Fortschritt 0–1, nie > 1 */
      setProgress(Math.round(p * 100)); /* In Prozent umrechnen */
      if (p < 1) {
        requestAnimationFrame(tick); /* Nächsten Frame anfordern */
      } else {
        /* 600ms Verzögerung vor dem Ausblenden — kurze Pause bei 100% */
        setTimeout(onDone, 600);
      }
    };
    requestAnimationFrame(tick); /* Ersten Frame starten */
  }, [
    onDone,
  ]); /* onDone als Dep — ändert sich nicht, aber ESLint erwartet es */

  return (
    <motion.div
      className="fixed inset-0 z-[2000] bg-[#050508] flex flex-col items-center justify-center gap-8"
      /* z-[2000]: höchster z-index — überlagert alles */
      exit={{
        opacity: 0,
      }} /* AnimatePresence führt diesen exit aus wenn !loaded */
      transition={{ duration: 0.6 }} /* 0.6s Fade-out */
    >
      {/* "ST" Monogramm — blendet mit scale+blur ein */}
      <motion.div
        initial={{
          scale: 0.7,
          filter: "blur(12px)",
          opacity: 0,
        }} /* Startzustand: klein, unscharf */
        animate={{
          scale: 1,
          filter: "blur(0px)",
          opacity: 1,
        }} /* Endzustand: normal */
        transition={{ duration: 0.5 }} /* 0.5s Einblendung */
        className="text-4xl font-black text-white tracking-tight"
      >
        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          S {/* "S" in Gradient-Farbe */}
        </span>
        T {/* "T" in normalem Weiß */}
      </motion.div>

      {/* Fortschrittsbalken */}
      <div className="w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
        {" "}
        {/* Grauer Track */}
        <motion.div
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
          animate={{ width: `${progress}%` }} /* Breite folgt progress-State */
          transition={{
            duration: 0.05,
          }} /* Fast sofort — Balken folgt rAF-Timer */
        />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Navbar
   ─────────────────────────────────────────────────────────────
   - y:-60 Entrance beim Mount
   - Glaseffekt ab 40px Scroll
   - Shared-layout Pill springt zwischen aktiven Links
   - Hamburger-Menü für Mobile
   ═══════════════════════════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] =
    useState(false); /* true wenn >40px gescrollt */
  const [mobileOpen, setMobileOpen] =
    useState(false); /* Hamburger-Menü offen? */
  /* Welcher Link gerade aktiv (hover) für die Pill-Animation */
  const [activeLink, setActiveLink] = useState<string | null>(null);

  useEffect(() => {
    const fn = () =>
      setScrolled(window.scrollY > 40); /* 40px Schwellenwert für Glaseffekt */
    window.addEventListener("scroll", fn, {
      passive: true,
    }); /* passive: scrollt nicht blockieren */
    return () => window.removeEventListener("scroll", fn); /* Cleanup */
  }, []); /* Nur einmal registrieren */

  /* Nav-Links: Label → Anchor-ID */
  const links = [
    {
      label: "Funktionen",
      href: "#funktionen",
    } /* Scrollt zu FeaturesSection */,
    { label: "Über uns", href: "#ueber" } /* Scrollt zu AllInOneSection */,
    { label: "FAQ", href: "#faq" } /* Scrollt zu FAQSection */,
  ];

  return (
    /* Entrance: gleitet von oben herein (y: -60 → 0) */
    <motion.nav
      initial={{ y: -60, opacity: 0 }} /* Startet 60px oberhalb, unsichtbar */
      animate={{ y: 0, opacity: 1 }} /* Fährt in Position */
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }} /* Expo-Out Kurve */
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/60 backdrop-blur-xl border-b border-white/8 shadow-[0_8px_32px_rgba(0,0,0,.4)]"
          : /* Glas-Effekt: halbtransparentes Schwarz + Blur + Border + Schatten */
            "bg-transparent" /* Transparent wenn oben */
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* ── Logo ───────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{
              scale: 1.12,
              rotate: -3,
            }} /* Mini-Animation bei Hover */
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-sm font-black">S</span>{" "}
            {/* "S" für StudyTracker */}
          </motion.div>
          <span className="text-base font-black tracking-tight text-white">
            StudyTracker
          </span>
        </Link>

        {/* ── Desktop Nav mit shared-layout Pill ──────────────── */}
        <LayoutGroup>
          {" "}
          {/* LayoutGroup: erlaubt layoutId-Pill zwischen verschiedenen Links zu springen */}
          <div
            className="hidden md:flex items-center gap-1" /* hidden on mobile, flex on md+ */
            onMouseLeave={() =>
              setActiveLink(null)
            } /* Pill verschwindet wenn Maus den Container verlässt */
          >
            {links.map(({ label, href }) => (
              <a
                key={href}
                href={href} /* Anchor-Link → smooth scroll via CSS */
                className="relative px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors rounded-full"
                onMouseEnter={() =>
                  setActiveLink(href)
                } /* Aktiven Link für Pill merken */
              >
                {/* Pill springt zwischen Links via layoutId — Framer-Motion animiert automatisch */}
                {activeLink === href && (
                  <motion.span
                    layoutId="nav-pill" /* Gleiche layoutId → Spring-Animation beim Wechsel */
                    className="absolute inset-0 bg-white/8 border border-white/12 rounded-full"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }} /* Federnd */
                  />
                )}
                <span className="relative">{label}</span>{" "}
                {/* relative: über der Pill */}
              </a>
            ))}
          </div>
        </LayoutGroup>

        {/* ── CTA-Buttons + Hamburger ─────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2 rounded-lg"
            /* hidden on xs, sichtbar ab sm */
          >
            Anmelden
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/register"
              className="inline-flex items-center px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg"
              style={{
                background:
                  "linear-gradient(90deg,#f472b6,#c084fc,#818cf8,#c084fc,#f472b6)",
                /* Gradient mit 300% Breite → shimmerBtn-Animation lässt ihn wandern */
                backgroundSize: "300% 100%",
                animation: "shimmerBtn 4s linear infinite" /* Endlos-Shimmer */,
              }}
            >
              Kostenlos starten
            </Link>
          </motion.div>

          {/* Hamburger — nur auf Mobile (md:hidden) */}
          <button
            type="button"
            onClick={() =>
              setMobileOpen((v) => !v)
            } /* Toggle: offen ↔ geschlossen */
            className="md:hidden p-2 ml-1 rounded-lg hover:bg-white/8 transition-colors text-white"
            aria-label="Menü" /* Accessibility: Screen-Reader-Text */
          >
            <div className="w-5 flex flex-col gap-[5px]">
              {" "}
              {/* 3 Streifen mit 5px Abstand */}
              {/* Oberer Streifen: dreht sich bei geöffnetem Menü zu "\"-Teil des X */}
              <span
                className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""}`}
              />
              {/* Mittlerer Streifen: verschwindet wenn offen */}
              <span
                className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`}
              />
              {/* Unterer Streifen: dreht sich zu "/"-Teil des X */}
              <span
                className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen /* AnimatePresence führt exit-Animation aus wenn false */ && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} /* Eingeklappt */
            animate={{ height: "auto", opacity: 1 }} /* Ausgeklappt */
            exit={{ height: 0, opacity: 0 }} /* Wieder einklappen */
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-white/8 bg-black/80 backdrop-blur-xl"
            /* overflow-hidden: clip beim height-Übergang */
          >
            <div className="px-5 py-3 space-y-1">
              {links.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)} /* Klick schließt Menü */
                  className="block px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  {label}
                </a>
              ))}
              {/* Trennlinie vor "Anmelden" */}
              <div className="pt-2 border-t border-white/8">
                <Link
                  to="/login"
                  onClick={() =>
                    setMobileOpen(false)
                  } /* Schließt auch beim Anmelden-Klick */
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
   Tippt abwechselnd 4 Rollen aus.
   60ms/Buchstabe schreiben, 2.2s Pause, 30ms/Buchstabe löschen.
   ═══════════════════════════════════════════════════════════════ */
/* Außerhalb der Komponente: konstantes Array, ändert sich nie → kein Dep-Problem */
const TYPEWRITER_ROLES = [
  "Mathematik-Ass",
  "Lern-Maschine",
  "Prüfungssieger",
  "Produktivitäts-Pro",
];

function Typewriter() {
  const [displayed, setDisplayed] = useState(""); /* Aktuell sichtbarer Text */
  const [roleIdx, setRoleIdx] = useState(0); /* Welcher Text gerade dran ist */
  const [deleting, setDeleting] =
    useState(false); /* true = Löschen, false = Tippen */

  useEffect(() => {
    const target = TYPEWRITER_ROLES[roleIdx]; /* Aktueller Zieltext */
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < target.length) {
      /* Noch nicht fertig getippt → nächsten Buchstaben anhängen */
      timeout = setTimeout(
        () => setDisplayed(target.slice(0, displayed.length + 1)),
        60 /* 60ms pro Buchstabe beim Tippen */,
      );
    } else if (!deleting && displayed.length === target.length) {
      /* Fertig getippt → 2.2s Pause bevor Löschen beginnt */
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && displayed.length > 0) {
      /* Löschen: letzten Buchstaben abschneiden */
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
      /* 30ms pro Buchstabe beim Löschen — schneller als Tippen */
    } else if (deleting && displayed.length === 0) {
      /* Komplett gelöscht → nächste Rolle; in setTimeout damit kein sync setState in Effect */
      timeout = setTimeout(() => {
        setDeleting(false);
        setRoleIdx(
          (i) => (i + 1) % TYPEWRITER_ROLES.length,
        ); /* Modulo: nach letzter wieder erste */
      }, 0);
    }
    return () =>
      clearTimeout(
        timeout,
      ); /* Cleanup: verhindert mehrere parallele Timeouts */
  }, [
    displayed,
    deleting,
    roleIdx,
  ]); /* roles ist Konstante außerhalb — kein Dep nötig */

  return (
    <span className="inline-flex items-center gap-1 text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text">
      {displayed} {/* Aktuell getippter Text */}
      {/* Blinkender Cursor — CSS-Animation .cursor-blink */}
      <span className="cursor-blink inline-block w-0.5 h-6 bg-pink-400 ml-0.5 align-middle" />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MagneticButton
   Bewegt sich proportional zur Mausposition im Button.
   Federt zurück beim Verlassen.
   ═══════════════════════════════════════════════════════════════ */
function MagneticButton({
  children,
  className = "",
  to,
}: {
  children: ReactNode; /* Beliebiger JSX-Inhalt als Button-Label */
  className?: string; /* Tailwind-Klassen für den Link */
  to: string; /* Ziel-Route (React Router) */
}) {
  const ref =
    useRef<HTMLDivElement>(
      null,
    ); /* Referenz auf den Container für BoundingRect */
  const x = useMotionValue(0); /* Rohe x-Verschiebung (0 = zentriert) */
  const y = useMotionValue(0); /* Rohe y-Verschiebung */
  const springX = useSpring(x, {
    stiffness: 280,
    damping: 20,
  }); /* Federnde x-Verschiebung */
  const springY = useSpring(y, {
    stiffness: 280,
    damping: 20,
  }); /* Federnde y-Verschiebung */

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect =
        ref.current.getBoundingClientRect(); /* Position des Elements im Viewport */
      /* Offset = Distanz zur Mitte × 35% Faktor (volle Distanz wäre zu stark) */
      x.set((e.clientX - (rect.left + rect.width / 2)) * 0.35);
      y.set((e.clientY - (rect.top + rect.height / 2)) * 0.35);
    },
    [x, y] /* useCallback: neue Funktion nur wenn x oder y sich ändern */,
  );

  const handleLeave = useCallback(() => {
    x.set(0); /* Zurück zur Mitte (Feder übernimmt) */
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }} /* Federnde Verschiebung anwenden */
      onMouseMove={handleMove} /* Mausbewegung → x/y aktualisieren */
      onMouseLeave={handleLeave} /* Maus weg → zurückfedern */
      className="inline-block" /* inline-block damit width sich dem Inhalt anpasst */
    >
      <Link to={to} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HeroMockupCard — schwebendes App-Preview-Widget
   ═══════════════════════════════════════════════════════════════ */
function HeroMockupCard() {
  return (
    /* Glasmorphismus-Karte: halbtransparentes Weiß + Blur */
    <div className="bg-white/[0.06] backdrop-blur-2xl rounded-3xl p-5 w-full max-w-xs mx-auto border border-white/12 shadow-2xl">
      {/* Header: Titel + Live-Badge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {/* Logo-Dot + App-Name */}
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              StudyTracker
            </span>
          </div>
          <p className="text-sm font-bold text-white">Diese Woche</p>
        </div>
        {/* Live-Badge mit pulsierendem grünen Punkt */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-full border border-emerald-500/25">
          <span className="relative flex h-1.5 w-1.5">
            {/* Äußerer Puls-Ring: scale 1→2.2→1, opacity 0.7→0→0.7 */}
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />{" "}
            {/* Innerer Kern */}
          </span>
          <span className="text-[10px] font-bold text-emerald-400">Live</span>
        </div>
      </div>

      {/* Haupt-Stat: Gesamt-Lernzeit + Wochenziel-Balken */}
      <div className="bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-2xl p-4 mb-3 border border-white/8">
        <p className="text-2xl font-black text-white">12h 34m</p>{" "}
        {/* Beispielwert */}
        <p className="text-[10px] text-white/45 mt-0.5">
          Gesamt Lernzeit diese Woche
        </p>
        <div className="mt-3">
          {/* Prozentangabe + Label */}
          <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
            <span>Wochenziel</span>
            <span className="font-bold text-purple-400">83 %</span>
          </div>
          {/* Fortschrittsbalken: 83% Breite, animiert beim Mount */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
              initial={{ width: 0 }} /* Startet leer */
              animate={{ width: "83%" }} /* Füllt sich auf 83% */
              transition={{
                duration: 1.2,
                delay: 0.8 /* 0.8s Verzögerung: erst nach Card-Einblendung */,
                ease: [
                  0.34, 1.56, 0.64, 1,
                ] /* Leichter Überschwinger (spring-like) */,
              }}
            />
          </div>
        </div>
      </div>

      {/* Fach-Liste: 3 Fächer mit Fortschrittsbalken */}
      <div className="space-y-2 mb-3">
        {[
          {
            s: "Mathematik",
            t: "4h 20m",
            c: "bg-pink-500",
            p: "65%",
          } /* Fach, Zeit, Farbe, Prozent */,
          { s: "Englisch", t: "3h 10m", c: "bg-purple-500", p: "48%" },
          { s: "Physik", t: "2h 05m", c: "bg-fuchsia-500", p: "31%" },
        ].map(({ s, t, c, p }) => (
          <div key={s} className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c}`} />{" "}
            {/* Farbpunkt */}
            <div className="flex-1 min-w-0">
              {" "}
              {/* min-w-0: kein Overflow in Flex-Container */}
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] text-white/50">{s}</span>{" "}
                {/* Fachname */}
                <span className="text-[10px] font-bold text-white/80">
                  {t}
                </span>{" "}
                {/* Lernzeit */}
              </div>
              <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
                {" "}
                {/* Track */}
                <div
                  className={`h-full ${c} rounded-full opacity-50`} /* Balken in Fachfarbe */
                  style={{ width: p }} /* Breite = Fortschritt */
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Streak-Anzeige */}
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
   ─────────────────────────────────────────────────────────────
   - "STUDY" / "TRACKER" mit Clip-Path-Wipe (y: 105% → 0%)
   - Typewriter-Untertitel
   - Magnetic CTA-Buttons
   - Floating Mockup mit Parallax auf Scroll
   ═══════════════════════════════════════════════════════════════ */
function HeroSection() {
  const ref = useRef<HTMLElement>(null); /* Scroll-Target für useScroll */
  const { scrollYProgress } = useScroll({
    target: ref /* Fortschritt relativ zu diesem Element */,
    offset: [
      "start start",
      "end start",
    ] /* 0 = oben sichtbar, 1 = Element-Ende oben */,
  });
  /* Mockup steigt beim Scrollen leicht auf (Parallax: 0→-60px) */
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  /* Gesamter Inhalt blendet aus wenn 65% gescrollt */
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[92vh] flex items-center overflow-hidden"
      /* min-h-[92vh]: fast Vollbild, gibt ScrollProgress Raum */
    >
      <motion.div
        style={{
          opacity: contentOpacity,
        }} /* Blendet aus wenn man runterscrollt */
        className="max-w-6xl mx-auto px-5 py-20 w-full"
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* ── Links: Text ─────────────────────────────────── */}
          {/* min-w-0: verhindert dass Grid-Item über seine Spalte hinauswächst */}
          <div className="min-w-0 overflow-hidden">
            {/* Badge: "Kostenlos — kein Abo, kein BS" */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }} /* Startet unsichtbar, 20px tiefer */
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
            >
              {/* Grüner Puls-Punkt */}
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span className="text-white/70 text-xs font-medium">
                Kostenlos — kein Abo, kein BS
              </span>
            </motion.div>

            {/* Großer Titel — Clip-Path-Wipe Technik:
                overflow-hidden auf dem Container schneidet h1 ab,
                h1 startet bei y: 105% (unterhalb), animiert auf 0% (sichtbar) */}
            <div className="mb-2 overflow-hidden">
              <motion.h1
                className="text-[clamp(3rem,9vw,7rem)] font-black text-white leading-none tracking-tighter"
                /* clamp(min, preferred, max): responsive Schriftgröße ohne Breakpoints */
                initial={{
                  y: "105%",
                }} /* 105% statt 100% wegen Descender-Platz */
                animate={{ y: "0%" }}
                transition={{
                  duration: 0.9,
                  ease: [
                    0.76, 0, 0.24, 1,
                  ] /* Cubic-Bezier: starke Expo-Out-Kurve */,
                  delay: 0.3,
                }}
              >
                STUDY
              </motion.h1>
            </div>
            {/* "TRACKER" als Outline-Text (nur Umrandung, kein Füll) */}
            <div className="mb-6 overflow-hidden">
              <motion.h1
                className="text-[clamp(3rem,9vw,7rem)] font-black leading-none tracking-tighter"
                style={{
                  WebkitTextStroke:
                    "2px rgba(168,85,247,0.7)" /* 2px lila Kontur */,
                  color: "transparent" /* Füllfarbe weg */,
                }}
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{
                  duration: 0.9,
                  ease: [0.76, 0, 0.24, 1],
                  delay: 0.47 /* Leicht nach "STUDY" damit Wipe-Effekt versetzt */,
                }}
              >
                TRACKER
              </motion.h1>
            </div>

            {/* Animierte Divider-Linie: wächst von links nach rechts */}
            <motion.div
              className="h-px bg-gradient-to-r from-pink-500/60 via-purple-500/60 to-transparent mb-6"
              initial={{ scaleX: 0 }} /* Startet zusammengezogen */
              animate={{ scaleX: 1 }} /* Wächst auf volle Breite */
              style={{ transformOrigin: "left" }} /* Wachstum startet links */
              transition={{
                duration: 0.9,
                delay: 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            {/* Typewriter Untertitel */}
            <motion.p
              initial={{
                opacity: 0,
              }} /* Erst einblenden nachdem Titel fertig ist */
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-base sm:text-lg text-white/60 mb-8 max-w-md"
            >
              Werde ein besserer <Typewriter />{" "}
              {/* Typewriter-Komponente tippt Rollen ein */}
            </motion.p>

            {/* Magnetic CTAs — zwei Buttons die der Maus folgen */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="flex flex-wrap gap-4 mb-8"
            >
              {/* Primär-Button: weiß mit Pfeil-Icon */}
              <MagneticButton
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-xl shadow-xl text-sm"
              >
                Jetzt loslegen — kostenlos
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="w-3.5 h-3.5"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4" /* Pfeil: langer Strich + Pfeilspitze */
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </MagneticButton>
              {/* Sekundär-Button: transparent mit Border */}
              <MagneticButton
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-white/20 text-white/70 hover:text-white font-semibold rounded-xl text-sm backdrop-blur-sm hover:bg-white/5 transition-colors"
              >
                Bereits registriert?
              </MagneticButton>
            </motion.div>

            {/* Social Proof: 3 Häkchen-Zeilen */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.15 }}
              className="flex flex-wrap gap-5 text-white/35 text-xs"
            >
              {[
                "Keine Kreditkarte",
                "In 30 Sekunden ready",
                "Deine Daten gehören dir",
              ].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  {/* Mini-Häkchen SVG */}
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-3 h-3"
                  >
                    <path
                      d="M1.5 6l3.5 3.5 5.5-7" /* Häkchen-Pfad */
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t} {/* Benefit-Text */}
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Rechts: Floating Mockup ─────────────────────── */}
          <motion.div
            style={{ y: cardY }} /* Parallax: steigt beim Scrollen leicht auf */
            initial={{
              opacity: 0,
              y: 40,
              scale: 0.96,
            }} /* Startet leicht unten, klein */
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex justify-center items-center mt-8 lg:mt-0"
          >
            {/* Glühen hinter der Karte — großer Blur-Blob */}
            <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-pink-500/40 to-purple-500/40 rounded-3xl" />
            {/* Float-Animation: hoch + runter, unabhängig vom Parallax */}
            <motion.div
              animate={{ y: [0, -14, 0] }} /* Schwebt 14px hoch und runter */
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              <HeroMockupCard />
            </motion.div>

            {/* Floating Stat-Pill oben links: "7-Tage-Streak" */}
            <motion.div
              className="absolute -top-3 -left-3 sm:-left-8 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/10 hidden sm:flex"
              /* hidden sm:flex: nur ab sm-Breakpoint sichtbar */
              animate={{ y: [0, -7, 0] }} /* Eigene Float-Animation */
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="text-base">🔥</span>
              <div>
                <p className="text-[10px] font-black text-white leading-none">
                  7-Tage-Streak
                </p>
                <p className="text-[9px] text-white/40">Weiter so!</p>
              </div>
            </motion.div>

            {/* Floating Stat-Pill unten rechts: "3h heute" */}
            <motion.div
              className="absolute -bottom-3 -right-3 sm:-right-8 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/10 hidden sm:flex"
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 4.2 /* Anderer Rhythmus als obere Pill */,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.8 /* Versetzt damit beide nicht synchron schweben */,
              }}
            >
              {/* Uhr-Icon in Gradient-Kreis */}
              <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="white" className="w-3 h-3">
                  <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.5a.75.75 0 0 0-.75.75v3.5c0 .28.154.537.401.671l2.5 1.25a.75.75 0 1 0 .698-1.342L8.75 8.131V5.25A.75.75 0 0 0 8 4.5Z" />
                  {/* Uhr-Silhouette mit Zeiger */}
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-white leading-none">
                  3h heute
                </p>
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
   ArcRing — SVG-Kreis für Stats
   Arc wächst von 0 auf target% mit spring-Easing (leichter Überschwinger)
   ═══════════════════════════════════════════════════════════════ */
function ArcRing({
  percent /* Wie viel des Kreises gefüllt ist (0–100) */,
  color /* Stroke-Farbe (HEX oder rgba) */,
  delay = 0 /* Animationsverzögerung für Stagger */,
}: {
  percent: number;
  color: string;
  delay?: number;
}) {
  const r = 38; /* Radius des Kreises in SVG-Units */
  const circ = 2 * Math.PI * r; /* Gesamtumfang (2πr) */
  const offset =
    circ -
    (percent / 100) * circ; /* Lücke im Arc (0 = komplett, circ = leer) */

  return (
    <svg viewBox="0 0 96 96" className="w-14 h-14 sm:w-20 sm:h-20">
      {/* Track: grauer Hintergrunds-Kreis (immer vollständig) */}
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)" /* Sehr dezentes Weiß */
        strokeWidth="4"
      />
      {/* Animierter Arc: wächst von leer auf percent% */}
      <motion.circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke={color} /* Farbe per Prop */
        strokeWidth="4"
        strokeLinecap="round" /* Abgerundete Enden des Arcs */
        strokeDasharray={circ} /* Gesamtumfang als Strichlänge */
        initial={{ strokeDashoffset: circ }} /* Startet komplett verborgen */
        animate={{ strokeDashoffset: offset }} /* Blendet Arc ein */
        transition={{ type: "spring", stiffness: 34, damping: 12, delay }}
        /* spring: stiffness 34 = weich, damping 12 = leichter Überschwinger */
        style={{ rotate: -90, transformOrigin: "48px 48px" }}
        /* rotate -90°: SVG-Kreis startet rechts, wir wollen oben starten */
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   StatsSection
   3 Karten mit SVG-Arc-Ringen + animierten Countern.
   Stat-Spotlight erscheint bei Hover.
   ═══════════════════════════════════════════════════════════════ */
function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  /* once: true → Animation nur einmal abspielen wenn Abschnitt ins Bild kommt */
  const inView = useFramerInView(ref, { once: true, amount: 0.3 });
  /* amount: 0.3 → 30% des Elements muss sichtbar sein bevor inView = true */

  /* Zähler starten erst wenn inView = true */
  const users = useCounter(
    2000,
    inView,
    28,
  ); /* Zählt auf 2.000 in ~1.4s (28ms × 50) */
  const hours = useCounter(50000, inView, 25); /* Zählt auf 50.000 in ~1.25s */
  const streak = useCounter(12, inView, 55); /* Zählt auf 12 in ~2.75s */

  /* Stats-Daten: Wert, Label, Arc-Füllstand, Farbe */
  const stats = [
    {
      value: `${users.toLocaleString("de")}+` /* "2.000+" mit deutschem Tausend-Punkt */,
      label: "Aktive Lernende",
      arc: 80 /* 80% des Kreises gefüllt */,
      color: "#f472b6" /* Pink */,
    },
    {
      value: `${hours.toLocaleString("de")}+` /* "50.000+" */,
      label: "Lernstunden getrackt",
      arc: 65,
      color: "#c084fc" /* Lila */,
    },
    {
      value: `${streak} Tage`,
      label: "Ø Streak",
      arc: 48,
      color: "#818cf8",
    } /* Indigo */,
  ];

  return (
    <div ref={ref} className="relative py-16 border-y border-white/6">
      <div className="max-w-4xl mx-auto px-5 grid grid-cols-3 gap-2 sm:gap-8">
        {stats.map(({ value, label, arc, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 24 }}
            animate={
              inView ? { opacity: 1, y: 0 } : {}
            } /* Nur animieren wenn sichtbar */
            transition={{
              delay: i * 0.14,
              duration: 0.5,
            }} /* Stagger: 0, 0.14, 0.28s */
            /* Spotlight erscheint bei Hover via group-hover in Child-Div */
            className="relative group text-center p-3 sm:p-6 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/16 transition-colors overflow-hidden"
          >
            {/* Radial-gradient Spotlight oben bei Hover */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
              /* opacity-0 → group-hover:opacity-100 : erscheint wenn Elternelement ge-hoverd wird */
              style={{
                background: `radial-gradient(ellipse at top, ${color}30, transparent)`,
                /* ${color}30: Hex-Farbe + 30 = 19% Alpha (Hex 0x30 = 48 / 255 ≈ 19%) */
              }}
            />

            {/* Arc-Ring: Stagger delay = Index × 0.15 + 0.3s Basis-Verzögerung */}
            <div className="flex justify-center mb-3">
              <ArcRing percent={arc} color={color} delay={i * 0.15 + 0.3} />
            </div>

            {/* Zahl — animierter Counter */}
            <p className="text-base sm:text-2xl md:text-3xl font-black text-white mb-1 leading-tight">
              {value}
            </p>
            <p className="text-xs text-white/40">{label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MarqueeStrip
   Feature-Stichworte laufen endlos in beide Richtungen.
   Fade-Masken links und rechts.
   ═══════════════════════════════════════════════════════════════ */
function MarqueeStrip() {
  /* Stichworte × 3 damit nahtloser Loop möglich (Animation endet bei -33.3%) */
  const words = [
    "Fokus-Timer",
    "Statistiken",
    "Lern-Streaks",
    "Dark Mode",
    "Wochenziele",
    "Achievements",
    "Kategorien",
    "Export",
    "Auto-Speicherung",
    "Erinnerungen",
  ];
  const track = [
    ...words,
    ...words,
    ...words,
  ]; /* 3× = 30 Einträge für seamless loop */

  return (
    <div className="relative py-8 overflow-hidden border-b border-white/6">
      {/* Linkes Fade: Hintergrundfarbe → transparent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to right, #050508, transparent)",
          /* Blendet den Rand aus damit kein harter Abschnitt sichtbar ist */
        }}
      />
      {/* Rechtes Fade: transparent → Hintergrundfarbe */}
      <div
        className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #050508, transparent)" }}
      />

      {/* Vorwärts-Lauf: x von 0% auf -33.333% (ein Drittel der Gesamtbreite) */}
      <motion.div
        className="flex gap-8 whitespace-nowrap" /* whitespace-nowrap: kein Umbruch */
        animate={{
          x: ["0%", "-33.333%"],
        }} /* Schiebt um ein Drittel nach links */
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        /* Wenn Animation endet, sieht es identisch aus → nahtloser Loop */
      >
        {track.map((w, i) => (
          <span
            key={i}
            className="text-sm font-semibold tracking-[0.35em] text-white/25 uppercase"
            /* tracking-[0.35em]: großer Buchstabenabstand für eleganten Look */
          >
            {w} <span className="text-pink-500/40">✦</span>{" "}
            {/* Trenn-Diamant */}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FeatureCard
   Hover-Spotlight folgt der genauen Mausposition.
   ═══════════════════════════════════════════════════════════════ */
function FeatureCard({
  gradient /* Tailwind-Klassen für Icon-Hintergrund (z.B. "from-pink-500 to-rose-500") */,
  icon /* SVG-Icon als ReactNode */,
  title /* Karten-Überschrift */,
  description /* Kurzbeschreibung */,
  tags /* Array von Tag-Labels unten */,
  delay = 0 /* Animations-Stagger-Delay in Sekunden */,
}: {
  gradient: string;
  icon: ReactNode;
  title: string;
  description: string;
  tags: string[];
  delay?: number;
}) {
  const ref =
    useRef<HTMLDivElement>(null); /* Ref für Viewport-Check + BoundingRect */
  /* once: true = Einblendanimation nur beim ersten Viewport-Eintritt */
  const inView = useFramerInView(ref, { once: true, amount: 0.2 });
  /* Spotlight-Position (x, y relativ zur Karte) + ob sichtbar */
  const [spot, setSpot] = useState({ x: 0, y: 0, show: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r =
      ref.current.getBoundingClientRect(); /* Kartenposition im Viewport */
    /* e.clientX - r.left = Mausposition relativ zur Karte (nicht zum Viewport) */
    setSpot({ x: e.clientX - r.left, y: e.clientY - r.top, show: true });
  };

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        y: 32,
        scale: 0.96,
      }} /* Startet etwas tiefer und kleiner */
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }} /* Hebt sich 5px beim Hover an */
      onMouseMove={handleMove}
      onMouseLeave={() =>
        setSpot((s) => ({ ...s, show: false }))
      } /* Spotlight ausblenden */
      className="relative rounded-2xl p-6 border border-white/8 bg-white/[0.03] overflow-hidden group transition-colors hover:border-white/15"
      /* group: ermöglicht group-hover auf Children (Bottom-Line) */
    >
      {/* Spotlight-Glow folgt Maus — radiales Gradient zentriert auf Mausposition */}
      {spot.show && (
        <div
          className="absolute pointer-events-none transition-opacity"
          style={{
            left: spot.x,
            top: spot.y,
            width: 280,
            height: 280,
            transform:
              "translate(-50%,-50%)" /* Gradient-Zentrum auf Mauszeiger */,
            background: `radial-gradient(circle, ${
              gradient.includes("pink")
                ? "rgba(244,114,182,.12)" /* Pink-Karte → rosa Glow */
                : "rgba(168,85,247,.12)" /* Andere Karten → lila Glow */
            } 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Icon-Container: kleines Gradient-Quadrat */}
      <motion.div
        whileHover={{ scale: 1.08 }} /* Icon springt leicht bei Hover */
        className={`w-10 h-10 mb-5 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md`}
      >
        {icon} {/* SVG-Icon (weiß, w-5 h-5) */}
      </motion.div>

      {/* Titel */}
      <h3 className="text-base font-black text-white mb-2 group-hover:text-white/90 transition-colors">
        {title}
      </h3>

      {/* Beschreibung */}
      <p className="text-white/45 text-sm leading-relaxed mb-4">
        {description}
      </p>

      {/* Tags — kleine Chips mit Hover-Animation */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <motion.span
            key={tag}
            whileHover={{
              scale: 1.08,
              y: -2,
            }} /* Springt leicht hoch bei Hover */
            className="px-2.5 py-1 bg-white/6 border border-white/10 text-white/50 text-[11px] font-medium rounded-lg"
          >
            {tag}
          </motion.span>
        ))}
      </div>

      {/* Bottom accent line: wächst von 0 auf volle Breite bei Hover */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500 w-0 group-hover:w-full rounded-full" />
      {/* w-0 → group-hover:w-full: Linie wächst wenn Karte ge-hoverd wird */}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FeaturesSection
   ═══════════════════════════════════════════════════════════════ */
function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  /* Scroll-Trigger für Header-Animationen (Clip-Path-Wipe) */
  const headerInView = useFramerInView(headerRef, { once: true, amount: 0.3 });

  /* Feature-Daten: jede Karte hat gradient, SVG-icon, title, tags, description */
  const features = [
    {
      gradient: "from-pink-500 to-rose-500",
      /* Uhr-Icon: Kreis + Zeiger + Markierung oben */
      icon: (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="white"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="10" cy="10" r="7" /> {/* Zifferblatt */}
          <path d="M10 6v4l2.5 2.5" /> {/* Zeiger: 12 Uhr → 3 Uhr */}
          <path d="M7.5 2.5h5" /> {/* Markierung oben am Gehäuse */}
        </svg>
      ),
      title: "Timer der nicht nervt",
      tags: ["Automatisch", "Pausieren", "Kategorien"],
      description:
        "Ein Klick — und du läufst. Kein kompliziertes Setup. Einfach loslegen und lernen.",
    },
    {
      gradient: "from-fuchsia-500 to-purple-500",
      /* Liniendiagramm-Icon: aufsteigende Linie + Baseline */
      icon: (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="white"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M3 14l4-5 4 3 4-6" /> {/* Zickzack-Linie (aufwärts-Trend) */}
          <path d="M2 17h16" /> {/* X-Achse Baseline */}
        </svg>
      ),
      title: "Zahlen die motivieren",
      tags: ["Wöchentlich", "Vergleich", "Charts"],
      description:
        "Sieh schwarz auf weiß: Diese Woche 4 Stunden mehr als letzte Woche. Das fühlt sich gut an.",
    },
    {
      gradient: "from-violet-500 to-indigo-500",
      /* Zielscheibe (Bullseye): äußerer Kreis + innerer Kreis + 4 Achsen-Linien */
      icon: (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="white"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="10" cy="10" r="7" /> {/* Äußerer Ring */}
          <circle cx="10" cy="10" r="3" /> {/* Innerer Ring */}
          <path d="M10 3V1M10 19v-2M3 10H1M19 10h-2" />{" "}
          {/* Kreuz-Achsen (N/S/W/O) */}
        </svg>
      ),
      title: "Ziele die Spaß machen",
      tags: ["Streaks", "Achievements", "Erinnerungen"],
      description:
        "Setz Wochenziele und lass StudyTracker mitfiebern. Streaks, Meilensteine — gutes Gefühl garantiert.",
    },
  ];

  return (
    <section id="funktionen" className="relative py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-14">
          {/* Pill-Badge oben */}
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-4 uppercase tracking-wide"
          >
            Warum StudyTracker?
          </motion.span>
          {/* Headline — Clip-Path-Wipe (overflow-hidden + y 100% → 0%) */}
          <div className="overflow-hidden">
            <motion.h2
              initial={{
                y: "100%",
              }} /* Startet unterhalb des overflow-hidden Containers */
              animate={headerInView ? { y: "0%" } : {}}
              transition={{
                duration: 0.7,
                delay: 0.1,
                ease: [0.76, 0, 0.24, 1],
              }}
              className="text-3xl sm:text-4xl font-black text-white mb-3"
            >
              So einfach, dass du
              <br />
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                keine Ausrede mehr hast {/* Gradient-Text */}
              </span>
            </motion.h2>
          </div>
          {/* Untertitel */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={headerInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="text-white/45 max-w-lg mx-auto text-sm sm:text-base"
          >
            Kein Onboarding-Tutorial. Kein Kalender synchronisieren. Einfach
            loslegen.
          </motion.p>
        </div>

        {/* Karten: 1 Spalte → 2 Spalten (sm) → 3 Spalten (lg) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            /* delay: i × 0.1 = Stagger 0s, 0.1s, 0.2s */
            <FeatureCard key={f.title} {...f} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AllInOneSection
   Checklist links + wachsende Balken rechts (alle Größen sichtbar).
   ═══════════════════════════════════════════════════════════════ */
function AllInOneSection() {
  const leftRef =
    useRef<HTMLDivElement>(null); /* Scroll-Trigger linke Spalte */
  const rightRef =
    useRef<HTMLDivElement>(null); /* Scroll-Trigger rechte Spalte */
  /* Jede Spalte hat eigenen inView-State — separate Animations-Trigger */
  const leftIn = useFramerInView(leftRef, { once: true, amount: 0.2 });
  const rightIn = useFramerInView(rightRef, { once: true, amount: 0.2 });

  /* Checklist-Einträge: emoji, Titel, Kurzbeschreibung */
  const items = [
    {
      emoji: "🗂️",
      title: "Fach-Kategorien",
      desc: "Eigene Fächer mit Farben und Icons.",
    },
    {
      emoji: "🔥",
      title: "Tages-Streaks",
      desc: "Täglich lernen, Streak am Leben halten.",
    },
    {
      emoji: "🌙",
      title: "Dark Mode",
      desc: "Augenschonend für Late-Night-Sessions.",
    },
    { emoji: "📤", title: "Export", desc: "Deine Daten als CSV oder PDF." },
  ];

  /* Wochenübersicht-Balken: Wochentag, Höhe (%), Highlight */
  const bars = [
    { day: "Mo", h: 65, hot: false },
    { day: "Di", h: 40, hot: false },
    { day: "Mi", h: 80, hot: false },
    { day: "Do", h: 55, hot: false },
    {
      day: "Fr",
      h: 100,
      hot: true,
    } /* Freitag ist der "beste" Tag — Gradient-Highlight */,
    { day: "Sa", h: 35, hot: false },
    { day: "So", h: 25, hot: false },
  ];

  return (
    <section id="ueber" className="relative py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* ── Checklist-Spalte ─────────────────────────────── */}
          <div ref={leftRef}>
            {/* Pill-Badge */}
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={leftIn ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-5 uppercase tracking-wide"
            >
              Komplettlösung
            </motion.span>
            {/* Headline — Clip-Path-Wipe */}
            <div className="overflow-hidden mb-3">
              <motion.h2
                initial={{ y: "100%" }}
                animate={leftIn ? { y: "0%" } : {}}
                transition={{
                  duration: 0.7,
                  ease: [0.76, 0, 0.24, 1],
                  delay: 0.1,
                }}
                className="text-3xl sm:text-4xl font-black text-white leading-tight"
              >
                Alles drin.
                <br />
                <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Nichts Überflüssiges.
                </span>
              </motion.h2>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={leftIn ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
              className="text-white/45 mb-10 text-sm"
            >
              StudyTracker ist kein Feature-Monster. Nur was wirklich hilft.
            </motion.p>

            {/* Checklist: 4 Einträge mit Stagger + slide-from-left */}
            <div className="space-y-3">
              {items.map(({ emoji, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -24 }} /* Startet 24px links */
                  animate={leftIn ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    delay: 0.2 + i * 0.1,
                    duration: 0.4,
                  }} /* Stagger 0.1s */
                  whileHover={{ x: 4 }} /* Schiebt sich 4px rechts bei Hover */
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05] transition-colors group"
                >
                  <span className="text-xl flex-shrink-0">{emoji}</span>{" "}
                  {/* flex-shrink-0: Emoji schrumpft nicht */}
                  <div>
                    <p className="font-bold text-white text-sm group-hover:text-white/90">
                      {title}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA-Button mit Magnetic-Effekt */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={leftIn ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7 }} /* Nach allen Checklist-Einträgen */
              className="mt-8"
            >
              <MagneticButton
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-xl shadow-xl text-sm"
              >
                Jetzt ausprobieren
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="w-3.5 h-3.5"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </MagneticButton>
            </motion.div>
          </div>

          {/* ── Chart-Panel — Wochenübersicht mit Balkendiagramm ── */}
          <motion.div
            ref={rightRef}
            initial={{ opacity: 0, x: 36 }} /* Gleitet von rechts herein */
            animate={rightIn ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              {/* Chart-Header */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-bold text-sm">Wochenübersicht</p>
                <span className="text-white/35 text-xs">Mai 2026</span>
              </div>
              <p className="text-white/35 text-xs mb-6">Lernstunden pro Tag</p>

              {/* Balkendiagramm */}
              {/* Aufbau: relative Container für absolute Balken + separate Label-Zeile darunter */}
              <div className="mb-3">
                <div className="relative h-28 flex gap-1.5">
                  {bars.map((bar, i) => (
                    <div key={bar.day} className="flex-1 relative">
                      {" "}
                      {/* flex-1: alle Balken gleich breit */}
                      <motion.div
                        className={`absolute bottom-0 left-0 right-0 rounded-t-md ${
                          bar.hot
                            ? "bg-gradient-to-t from-pink-500 to-purple-400" /* Highlight-Balken */
                            : "bg-white/20" /* Normale Balken */
                        }`}
                        /* originY: 1 = Framer-Motion "bottom" — Balken wächst von unten nach oben */
                        style={{ height: `${bar.h}%`, originY: 1 }}
                        initial={{ scaleY: 0 }} /* Startet flach */
                        animate={
                          rightIn ? { scaleY: 1 } : { scaleY: 0 }
                        } /* Wächst wenn sichtbar */
                        transition={{
                          delay:
                            i * 0.08 +
                            0.2 /* Stagger: jeder Balken 80ms nach dem vorherigen */,
                          duration: 0.6,
                          ease: [
                            0.34, 1.56, 0.64, 1,
                          ] /* Leichter Überschwinger oben */,
                        }}
                      />
                    </div>
                  ))}
                </div>
                {/* Tageslabels unterhalb der Balken — getrennte Zeile damit Labels nicht in Balken liegen */}
                <div className="flex gap-1.5 mt-1.5">
                  {bars.map((bar) => (
                    <div key={bar.day} className="flex-1 flex justify-center">
                      <span
                        className={`text-[9px] font-semibold ${
                          bar.hot
                            ? "text-white"
                            : "text-white/35" /* Highlight-Tag heller */
                        }`}
                      >
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats-Grid: 3 Kennzahlen unter dem Diagramm */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                {[
                  { l: "Gesamt", v: "38h" },
                  { l: "Ø / Tag", v: "5.4h" },
                  { l: "Streak", v: "7 🔥" },
                ].map(({ l, v }) => (
                  <div
                    key={l}
                    className="bg-white/5 rounded-xl p-3 text-center border border-white/8"
                  >
                    <p className="text-white font-black text-sm">{v}</p>{" "}
                    {/* Wert */}
                    <p className="text-white/35 text-[10px] mt-0.5">{l}</p>{" "}
                    {/* Label */}
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
   ═══════════════════════════════════════════════════════════════ */
function FAQSection() {
  /* openIdx: welche Frage gerade aufgeklappt ist (null = alle geschlossen) */
  const [openIdx, setOpenIdx] = useState<number | null>(
    0,
  ); /* Erste Frage standardmäßig offen */
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFramerInView(ref, { once: true, amount: 0.1 });
  /* amount: 0.1 → bereits bei 10% Sichtbarkeit triggern (FAQ ist lang) */

  /* FAQ-Daten: Frage + Antwort */
  const faqs = [
    {
      q: "Wirklich kostenlos? Kein Haken?",
      a: "Kein Haken. StudyTracker ist kostenlos und bleibt es. Keine Kreditkarte, kein Abo. Einfach registrieren.",
    },
    {
      q: "Wie funktioniert der Timer genau?",
      a: "Fach auswählen → Timer starten → lernen. Fertig. Alles wird automatisch gespeichert.",
    },
    {
      q: "Kann ich eigene Fächer anlegen?",
      a: "Klar! So viele wie du willst — von Mathe bis Gitarrenüben. Jedes mit Farbe und Icon.",
    },
    {
      q: "Was passiert mit meinen Daten?",
      a: "Deine Daten gehören dir. Niemals weitergegeben, niemals verkauft. Jederzeit exportierbar oder löschbar.",
    },
  ];

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="max-w-2xl mx-auto px-5">
        {" "}
        {/* max-w-2xl: schmale Spalte für lesbare FAQs */}
        {/* Header */}
        <div className="text-center mb-10" ref={ref}>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-4 uppercase tracking-wide"
          >
            FAQ
          </motion.span>
          {/* Headline — Clip-Path-Wipe */}
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%" }}
              animate={inView ? { y: "0%" } : {}}
              transition={{
                duration: 0.7,
                ease: [0.76, 0, 0.24, 1],
                delay: 0.1,
              }}
              className="text-3xl sm:text-4xl font-black text-white"
            >
              Häufige Fragen
            </motion.h2>
          </div>
        </div>
        {/* Accordion: jede Frage ist ein aufklappbares Element */}
        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08 }} /* Stagger 80ms */
              className="rounded-2xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-white/15 transition-colors"
            >
              {/* Frage-Button: öffnet/schließt die Antwort */}
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                /* openIdx === i ? null : i — klappt zu wenn schon offen, auf sonst */
                aria-expanded={
                  openIdx === i
                } /* Accessibility: Screen-Reader Status */
                className="w-full flex items-center justify-between px-5 py-4 text-left group"
              >
                <span className="font-semibold text-white/80 text-sm pr-4 group-hover:text-white transition-colors">
                  {q}
                </span>
                {/* Plus-Icon dreht sich zu X wenn offen (45° Rotation) */}
                <motion.span
                  animate={{ rotate: openIdx === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-sm"
                >
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="white"
                    strokeWidth={2.5}
                    className="w-2.5 h-2.5"
                  >
                    <path d="M6 2v8M2 6h8" strokeLinecap="round" />{" "}
                    {/* + Kreuz */}
                  </svg>
                </motion.span>
              </button>
              {/* Antwort: AnimatePresence für height 0 → auto Übergang */}
              <AnimatePresence initial={false}>
                {" "}
                {/* initial: false = kein Animate beim ersten Render */}
                {openIdx === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }} /* Eingeklappt */
                    animate={{ height: "auto", opacity: 1 }} /* Aufgeklappt */
                    exit={{ height: 0, opacity: 0 }} /* Beim Zuklappen */
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                  >
                    {/* Trennlinie zwischen Frage und Antwort */}
                    <div className="h-px bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-transparent mx-5" />
                    <p className="px-5 py-4 text-white/45 text-sm leading-relaxed">
                      {a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        {/* CTA am Ende der FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55 }} /* Nach allen FAQ-Einträgen */
          className="text-center mt-12"
        >
          <p className="text-white/30 text-sm mb-5">
            Am besten einfach ausprobieren 👇
          </p>
          <MagneticButton
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl shadow-xl text-sm hover:opacity-90 transition-opacity"
          >
            Kostenlos registrieren
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="w-3.5 h-3.5"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Footer
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="relative border-t border-white/6 py-8">
      <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo links */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{
              scale: 1.1,
              rotate: -3,
            }} /* Mini-Animation wie Navbar-Logo */
            className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"
          >
            <span className="text-white text-[10px] font-black">S</span>
          </motion.div>
          <span className="text-sm font-black text-white/60">StudyTracker</span>
        </Link>

        {/* Footer-Links: Datenschutz, AGB, Kontakt */}
        <div className="flex items-center gap-6 text-xs text-white/25">
          {[
            { label: "Datenschutz", to: "/datenschutz" },
            { label: "AGB", to: "/agb" },
            { label: "Kontakt", to: "/kontakt" },
          ].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="hover:text-white/60 transition-colors" /* Heller bei Hover */
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Copyright — Jahr automatisch aus Date */}
        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} StudyTracker
        </p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Landing — Hauptexport
   ─────────────────────────────────────────────────────────────
   Wrapper der alle Komponenten zusammenstellt.
   PageLoader verschwindet nach AnimatePresence.
   ═══════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [loaded, setLoaded] =
    useState(false); /* false = Loader sichtbar, true = Seite sichtbar */
  /* Lenis: setzt scroll-behavior: smooth auf <html> */
  useLenis();

  return (
    <>
      {/* Globale CSS-Keyframes inline einbetten (kein externes Stylesheet nötig) */}
      <style>{GLOBAL_CSS}</style>
      {/* PageLoader — AnimatePresence führt exit-Animation aus wenn loaded = true */}
      <AnimatePresence>
        {!loaded && <PageLoader onDone={() => setLoaded(true)} />}
        {/* onDone: wird nach 1.8s aufgerufen → setLoaded(true) → AnimatePresence fährt Loader raus */}
      </AnimatePresence>
      {/* Hintergrund-Layer (fixed, z-index 0 und 1) — bleiben beim Scrollen stehen */}
      <GridBackground /> {/* z-0: Aurora-Blobs + Dot-Grid + Scan-Linie */}
      <FloatingShapes /> {/* z-1: Ringe + Punkte + Quadrat */}
      {/* Filmkorn-Overlay (fixed, z-index 999) — über allem außer Cursor + Loader */}
      <FilmGrain />
      {/* Scroll-Fortschrittsbalken (fixed, z-index 1000) */}
      <ScrollProgress />
      {/* Custom Cursor (fixed, z-index 1001 für Kreis, 998 für Glow) */}
      <CustomCursor />
      {/* Seiteninhalt — relative z-10 damit er über GridBackground liegt */}
      <div className="relative z-10 min-h-screen">
        <Navbar /> {/* Sticky Navigationsleiste */}
        <HeroSection /> {/* Fullscreen Einstieg mit Titel + Mockup */}
        <StatsSection /> {/* 3 Kennzahlen mit Arc-Ringen */}
        <MarqueeStrip /> {/* Endlos laufende Feature-Stichworte */}
        <FeaturesSection /> {/* 3 Feature-Karten mit Spotlight */}
        <AllInOneSection /> {/* Checklist + Balkendiagramm */}
        <FAQSection /> {/* Accordion mit 4 häufigen Fragen */}
        <Footer /> {/* Links + Copyright */}
      </div>
    </>
  );
}
