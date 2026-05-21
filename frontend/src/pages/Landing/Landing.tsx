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
  useState, useEffect, useRef, useCallback, type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import {
  motion, AnimatePresence, useScroll, useSpring,
  useMotionValue, useTransform, LayoutGroup,
  useInView as useFramerInView,
} from 'framer-motion';

/* ── Smooth Scroll via CSS ───────────────────────────────────── */
// Setzt scroll-behavior: smooth auf <html> — kein externes Paket nötig
function useLenis() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);
}

/* ── Animierter Counter ──────────────────────────────────────── */
// Zählt von 0 auf target wenn start = true, power-curve Easing
function useCounter(target: number, start = false, duration = 50) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let frame = 0;
    const total = 50;
    const id = setInterval(() => {
      frame++;
      // power-curve: frame^0.6 macht den Anfang schnell, Ende sanft
      setVal(Math.round(Math.pow(frame / total, 0.6) * target));
      if (frame >= total) clearInterval(id);
    }, duration);
    return () => clearInterval(id);
  }, [start, target, duration]);
  return val;
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
  /* Globaler Cursor: nativen ausblenden */
  * { cursor: none !important; }

  .grain-layer {
    animation: grain 8s steps(10) infinite;
  }
  .scan-line {
    animation: scan 12s linear infinite;
  }
  .spin-cw-40s  { animation: spinCW  40s linear infinite; }
  .spin-ccw-60s { animation: spinCCW 60s linear infinite; }
  .spin-ccw-50s { animation: spinCCW 50s linear infinite; }
  .float-plus   { animation: floatPlus 6s ease-in-out infinite; }
  .dot-pulse-1  { animation: dotPulse 3s ease-in-out      0.0s infinite; }
  .dot-pulse-2  { animation: dotPulse 3s ease-in-out      0.3s infinite; }
  .dot-pulse-3  { animation: dotPulse 3s ease-in-out      0.6s infinite; }
  .dot-pulse-4  { animation: dotPulse 3s ease-in-out      0.9s infinite; }
  .cursor-blink { animation: blink .9s step-end infinite; }
  /* Shimmer für Nav-CTA-Button */
  @keyframes shimmerBtn {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
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
      {/* grain-layer: verschiebt sich per CSS-Animation */}
      <svg className="grain-layer w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4" aria-hidden="true">
        <filter id="grain-filter">
          {/* feTurbulence erzeugt Rausch-Textur */}
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-filter)" opacity="0.035" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ScrollProgress
   2px spring-animierte Linie am obersten Rand.
   ═══════════════════════════════════════════════════════════════ */
function ScrollProgress() {
  /* useScroll liefert scrollYProgress zwischen 0 und 1 */
  const { scrollYProgress } = useScroll();
  /* useSpring macht es federnd statt starr */
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      style={{ scaleX, transformOrigin: 'left' }}
      className="fixed top-0 left-0 right-0 z-[1000] h-0.5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 pointer-events-none"
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
        style={{ background: 'radial-gradient(ellipse, #ec4899 0%, transparent 70%)', left: '-10%', top: '-5%' }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Blob 2: oben rechts — lila */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.10]"
        style={{ background: 'radial-gradient(ellipse, #a855f7 0%, transparent 70%)', right: '-8%', top: '-10%' }}
        animate={{ x: [0, -50, 20, 0], y: [0, 40, -15, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Blob 3: unten Mitte — indigo */}
      <motion.div
        className="absolute w-[800px] h-[400px] rounded-full blur-[160px] opacity-[0.08]"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)', left: '15%', bottom: '-5%' }}
        animate={{ x: [0, 30, -40, 0], y: [0, -20, 15, 0], scale: [1, 1.05, 0.98, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Dot-Grid ────────────────────────────────────────── */}
      {/* Gleichmäßiges Raster aus 1px-Punkten (36px Abstand) */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* ── Scan-Linie ──────────────────────────────────────── */}
      {/* 1px Horizontallinie fährt von oben nach unten, 12s Loop */}
      <div
        className="scan-line absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,.06), transparent)' }}
      />

      {/* ── Radiales Edge-Fade ──────────────────────────────── */}
      {/* Blendet Ränder aus damit Blobs nicht hart abschneiden */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #050508 100%)' }}
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
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">

      {/* ── Rotierende gestrichelte Ringe (oben rechts) ──────── */}
      <div className="absolute top-[8%] right-[6%]">
        {/* Äußerer Ring — rotiert im Uhrzeigersinn, 40s */}
        <div className="spin-cw-40s absolute"
          style={{ width: 160, height: 160, border: '1px dashed rgba(168,85,247,.12)', borderRadius: '50%', top: -80, left: -80 }} />
        {/* Innerer Ring — rotiert gegen Uhrzeigersinn, 60s */}
        <div className="spin-ccw-60s absolute"
          style={{ width: 100, height: 100, border: '1px dashed rgba(236,72,153,.10)', borderRadius: '50%', top: -50, left: -50 }} />
      </div>

      {/* ── Rotierender Ring (unten links) ───────────────────── */}
      <div className="spin-ccw-50s absolute bottom-[12%] left-[4%]"
        style={{ width: 200, height: 200, border: '1px dashed rgba(99,102,241,.08)', borderRadius: '50%' }} />

      {/* ── Floating "+" (rechts Mitte) ──────────────────────── */}
      <div className="float-plus absolute right-[8%] top-[45%] font-mono text-white text-2xl select-none">
        +
      </div>

      {/* ── Dot-Cluster (links oben ~15%/25%) ────────────────── */}
      {/* 4 Punkte in 2×2-Raster, jeder pulsiert mit Stagger */}
      <div className="absolute left-[15%] top-[25%] grid grid-cols-2 gap-3">
        <div className="dot-pulse-1 w-1.5 h-1.5 rounded-full bg-white" />
        <div className="dot-pulse-2 w-1.5 h-1.5 rounded-full bg-white" />
        <div className="dot-pulse-3 w-1.5 h-1.5 rounded-full bg-white" />
        <div className="dot-pulse-4 w-1.5 h-1.5 rounded-full bg-white" />
      </div>

      {/* ── Vertikale Gradient-Linie (unten rechts) ──────────── */}
      <motion.div
        className="absolute bottom-[15%] right-[18%] w-px"
        style={{ height: 96, background: 'linear-gradient(to bottom, rgba(168,85,247,.4), transparent)' }}
        animate={{ opacity: [0.3, 0.7, 0.3], scaleY: [0.8, 1, 0.8] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Rotierendes Quadrat (links Mitte) ────────────────── */}
      <motion.div
        className="absolute left-[6%] top-[55%]"
        style={{ width: 16, height: 16, border: '1px solid rgba(236,72,153,.18)', borderRadius: 1 }}
        animate={{ rotate: [0, 45, 0], opacity: [0.18, 0.35, 0.18] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
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
  /* MotionValues für Cursor-Position */
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);

  /* Kleiner Cursor: hohe Steifigkeit → folgt sofort */
  const smallX = useSpring(mouseX, { stiffness: 500, damping: 28 });
  const smallY = useSpring(mouseY, { stiffness: 500, damping: 28 });

  /* Großer Glow: niedrige Steifigkeit → träge nachziehen */
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
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, [mouseX, mouseY, visible]);

  return (
    <>
      {/* Kleiner scharfer Kreis — mix-blend-difference invertiert Farben darunter */}
      <motion.div
        style={{
          x: smallX, y: smallY, translateX: '-50%', translateY: '-50%',
          opacity: visible ? 1 : 0,
          mixBlendMode: 'difference',
        }}
        className="fixed top-0 left-0 z-[1001] w-3 h-3 rounded-full bg-white pointer-events-none"
      />
      {/* Großer Glow-Kreis — sanfte warme Ausleuchtung */}
      <motion.div
        style={{
          x: glowX, y: glowY, translateX: '-50%', translateY: '-50%',
          opacity: visible ? 0.06 : 0,
          background: 'radial-gradient(circle, rgba(168,85,247,1) 0%, transparent 70%)',
        }}
        className="fixed top-0 left-0 z-[998] w-[500px] h-[500px] rounded-full pointer-events-none"
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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    /* Balken füllt sich in 1.2s, danach ruft onDone */
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setProgress(Math.round(p * 100));
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        /* 600ms Verzögerung vor dem Ausblenden */
        setTimeout(onDone, 600);
      }
    };
    requestAnimationFrame(tick);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[2000] bg-[#050508] flex flex-col items-center justify-center gap-8"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* "ST" Monogramm */}
      <motion.div
        initial={{ scale: 0.7, filter: 'blur(12px)', opacity: 0 }}
        animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-black text-white tracking-tight"
      >
        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">S</span>T
      </motion.div>

      {/* Fortschrittsbalken */}
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
   ─────────────────────────────────────────────────────────────
   - y:-60 Entrance beim Mount
   - Glaseffekt ab 40px Scroll
   - Shared-layout Pill springt zwischen aktiven Links
   - Hamburger-Menü für Mobile
   ═══════════════════════════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Welcher Link gerade aktiv (hover) für die Pill-Animation */
  const [activeLink, setActiveLink] = useState<string | null>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    { label: 'Funktionen', href: '#funktionen' },
    { label: 'Über uns',   href: '#ueber' },
    { label: 'FAQ',        href: '#faq' },
  ];

  return (
    /* Entrance: gleitet von oben herein */
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/8 shadow-[0_8px_32px_rgba(0,0,0,.4)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">

        {/* ── Logo ───────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.12, rotate: -3 }}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-sm font-black">S</span>
          </motion.div>
          <span className="text-base font-black tracking-tight text-white">StudyTracker</span>
        </Link>

        {/* ── Desktop Nav mit shared-layout Pill ──────────────── */}
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
                {/* Pill springt zwischen Links via layoutId */}
                {activeLink === href && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/8 border border-white/12 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{label}</span>
              </a>
            ))}
          </div>
        </LayoutGroup>

        {/* ── CTA-Buttons + Hamburger ─────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2 rounded-lg">
            Anmelden
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/register"
              className="inline-flex items-center px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg"
              style={{ background: 'linear-gradient(90deg,#f472b6,#c084fc,#818cf8,#c084fc,#f472b6)', backgroundSize: '300% 100%', animation: 'shimmerBtn 4s linear infinite' }}
            >
              Kostenlos starten
            </Link>
          </motion.div>
          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 ml-1 rounded-lg hover:bg-white/8 transition-colors text-white"
            aria-label="Menü"
          >
            <div className="w-5 flex flex-col gap-[5px]">
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
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
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
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
function Typewriter() {
  const roles = ['Mathematik-Ass', 'Lern-Maschine', 'Prüfungssieger', 'Produktivitäts-Pro'];
  const [displayed, setDisplayed] = useState('');
  const [roleIdx, setRoleIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = roles[roleIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < target.length) {
      /* Tippen */
      timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60);
    } else if (!deleting && displayed.length === target.length) {
      /* Pause nach vollem Wort */
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && displayed.length > 0) {
      /* Löschen */
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
    } else if (deleting && displayed.length === 0) {
      /* Nächste Rolle */
      setDeleting(false);
      setRoleIdx((i) => (i + 1) % roles.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, roleIdx, roles]);

  return (
    <span className="inline-flex items-center gap-1 text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text">
      {displayed}
      {/* Blinkender Cursor */}
      <span className="cursor-blink inline-block w-0.5 h-6 bg-pink-400 ml-0.5 align-middle" />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MagneticButton
   Bewegt sich proportional zur Mausposition im Button.
   Federt zurück beim Verlassen.
   ═══════════════════════════════════════════════════════════════ */
function MagneticButton({ children, className = '', to }: {
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
    /* Offset = Distanz zur Mitte × 35% Faktor */
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.35);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.35);
  }, [x, y]);

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div ref={ref} style={{ x: springX, y: springY }}
      onMouseMove={handleMove} onMouseLeave={handleLeave} className="inline-block">
      <Link to={to} className={className}>{children}</Link>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HeroMockupCard — schwebendes App-Preview-Widget
   ═══════════════════════════════════════════════════════════════ */
function HeroMockupCard() {
  return (
    <div className="bg-white/[0.06] backdrop-blur-2xl rounded-3xl p-5 w-full max-w-xs mx-auto border border-white/12 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">StudyTracker</span>
          </div>
          <p className="text-sm font-bold text-white">Diese Woche</p>
        </div>
        {/* Live-Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-full border border-emerald-500/25">
          <span className="relative flex h-1.5 w-1.5">
            <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold text-emerald-400">Live</span>
        </div>
      </div>

      {/* Haupt-Stat */}
      <div className="bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-2xl p-4 mb-3 border border-white/8">
        <p className="text-2xl font-black text-white">12h 34m</p>
        <p className="text-[10px] text-white/45 mt-0.5">Gesamt Lernzeit diese Woche</p>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
            <span>Wochenziel</span>
            <span className="font-bold text-purple-400">83 %</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
              initial={{ width: 0 }} animate={{ width: '83%' }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }} />
          </div>
        </div>
      </div>

      {/* Fach-Liste */}
      <div className="space-y-2 mb-3">
        {[
          { s: 'Mathematik', t: '4h 20m', c: 'bg-pink-500',    p: '65%' },
          { s: 'Englisch',   t: '3h 10m', c: 'bg-purple-500',  p: '48%' },
          { s: 'Physik',     t: '2h 05m', c: 'bg-fuchsia-500', p: '31%' },
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

      {/* Streak */}
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
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  /* Mockup steigt beim Scrollen leicht auf */
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  /* Gesamter Inhalt blendet aus wenn 65% gescrollt */
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[92vh] flex items-center overflow-hidden">
      <motion.div style={{ opacity: contentOpacity }} className="max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Links: Text ─────────────────────────────────── */}
          {/* min-w-0: verhindert dass Grid-Item über seine Spalte hinauswächst */}
          <div className="min-w-0 overflow-hidden">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
            >
              <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="text-white/70 text-xs font-medium">Kostenlos — kein Abo, kein BS</span>
            </motion.div>

            {/* Großer Titel — Clip-Path-Wipe (overflow-hidden + y: 105%→0%) */}
            <div className="mb-2 overflow-hidden">
              <motion.h1
                className="text-[clamp(3rem,9vw,7rem)] font-black text-white leading-none tracking-tighter"
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.3 }}
              >
                STUDY
              </motion.h1>
            </div>
            {/* "TRACKER" als Outline-Text */}
            <div className="mb-6 overflow-hidden">
              <motion.h1
                className="text-[clamp(3rem,9vw,7rem)] font-black leading-none tracking-tighter"
                style={{ WebkitTextStroke: '2px rgba(168,85,247,0.7)', color: 'transparent' }}
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.47 }}
              >
                TRACKER
              </motion.h1>
            </div>

            {/* Animierte Divider-Linie */}
            <motion.div
              className="h-px bg-gradient-to-r from-pink-500/60 via-purple-500/60 to-transparent mb-6"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              style={{ transformOrigin: 'left' }}
              transition={{ duration: 0.9, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Typewriter Untertitel */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-base sm:text-lg text-white/60 mb-8 max-w-md"
            >
              Werde ein besserer <Typewriter />
            </motion.p>

            {/* Magnetic CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="flex flex-wrap gap-4 mb-8"
            >
              <MagneticButton
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-xl shadow-xl text-sm"
              >
                Jetzt loslegen — kostenlos
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>
              <MagneticButton
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-white/20 text-white/70 hover:text-white font-semibold rounded-xl text-sm backdrop-blur-sm hover:bg-white/5 transition-colors"
              >
                Bereits registriert?
              </MagneticButton>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.15 }}
              className="flex flex-wrap gap-5 text-white/35 text-xs"
            >
              {['Keine Kreditkarte', 'In 30 Sekunden ready', 'Daten dir gehören'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                    <path d="M1.5 6l3.5 3.5 5.5-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Rechts: Floating Mockup ─────────────────────── */}
          <motion.div
            style={{ y: cardY }}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex justify-center items-center mt-8 lg:mt-0"
          >
            {/* Glühen hinter der Karte */}
            <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-pink-500/40 to-purple-500/40 rounded-3xl" />
            {/* Float-Animation: hoch + runter */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10"
            >
              <HeroMockupCard />
            </motion.div>

            {/* Floating Stat-Pills */}
            <motion.div
              className="absolute -top-3 -left-3 sm:-left-8 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/10 hidden sm:flex"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-base">🔥</span>
              <div>
                <p className="text-[10px] font-black text-white leading-none">7-Tage-Streak</p>
                <p className="text-[9px] text-white/40">Weiter so!</p>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-3 -right-3 sm:-right-8 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/10 hidden sm:flex"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
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
   ArcRing — SVG-Kreis für Stats
   Arc wächst von 0 auf target% mit spring-Easing (leichter Überschwinger)
   ═══════════════════════════════════════════════════════════════ */
function ArcRing({ percent, color, delay = 0 }: { percent: number; color: string; delay?: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg viewBox="0 0 96 96" className="w-20 h-20">
      {/* Track */}
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      {/* Animierter Arc */}
      <motion.circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ type: 'spring', stiffness: 34, damping: 12, delay }}
        style={{ rotate: -90, transformOrigin: '48px 48px' }}
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
  const inView = useFramerInView(ref, { once: true, amount: 0.3 });

  const users  = useCounter(2000,  inView, 28);
  const hours  = useCounter(50000, inView, 25);
  const streak = useCounter(12,    inView, 55);

  const stats = [
    { value: `${users.toLocaleString('de')}+`, label: 'Aktive Lernende',    arc: 80, color: '#f472b6' },
    { value: `${hours.toLocaleString('de')}+`, label: 'Lernstunden getrackt', arc: 65, color: '#c084fc' },
    { value: `${streak} Tage`,                  label: 'Ø Streak',           arc: 48, color: '#818cf8' },
  ];

  return (
    <div ref={ref} className="relative py-16 border-y border-white/6">
      <div className="max-w-4xl mx-auto px-5 grid grid-cols-3 gap-4 sm:gap-8">
        {stats.map(({ value, label, arc, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.14, duration: 0.5 }}
            /* Spotlight erscheint bei Hover (per Tailwind group + CSS variable) */
            className="relative group text-center p-6 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/16 transition-colors overflow-hidden"
          >
            {/* Radial-gradient Spotlight oben bei Hover */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
              style={{ background: `radial-gradient(ellipse at top, ${color}30, transparent)` }} />

            {/* Arc-Ring */}
            <div className="flex justify-center mb-3">
              <ArcRing percent={arc} color={color} delay={i * 0.15 + 0.3} />
            </div>

            {/* Zahl */}
            <p className="text-2xl sm:text-3xl font-black text-white mb-1">{value}</p>
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
  /* Stichworte × 3 damit nahtloser Loop möglich (33.3% Animation) */
  const words = ['Fokus-Timer', 'Statistiken', 'Lern-Streaks', 'Dark Mode', 'Wochenziele', 'Achievements', 'Kategorien', 'Export', 'Auto-Speicherung', 'Erinnerungen'];
  const track = [...words, ...words, ...words];

  return (
    <div className="relative py-8 overflow-hidden border-b border-white/6">
      {/* Linkes Fade */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #050508, transparent)' }} />
      {/* Rechtes Fade */}
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #050508, transparent)' }} />

      {/* Vorwärts-Lauf */}
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-33.333%'] }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
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
   Hover-Spotlight folgt der genauen Mausposition.
   ═══════════════════════════════════════════════════════════════ */
function FeatureCard({ gradient, icon, title, description, tags, delay = 0 }: {
  gradient: string; icon: ReactNode; title: string; description: string;
  tags: string[]; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFramerInView(ref, { once: true, amount: 0.2 });
  /* Mausposition relativ zur Karte */
  const [spot, setSpot] = useState({ x: 0, y: 0, show: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setSpot({ x: e.clientX - r.left, y: e.clientY - r.top, show: true });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      onMouseMove={handleMove}
      onMouseLeave={() => setSpot(s => ({ ...s, show: false }))}
      className="relative rounded-2xl p-6 border border-white/8 bg-white/[0.03] overflow-hidden group transition-colors hover:border-white/15"
    >
      {/* Spotlight-Glow folgt Maus */}
      {spot.show && (
        <div
          className="absolute pointer-events-none transition-opacity"
          style={{
            left: spot.x,
            top: spot.y,
            width: 280,
            height: 280,
            transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, ${gradient.includes('pink') ? 'rgba(244,114,182,.12)' : 'rgba(168,85,247,.12)'} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Icon */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        className={`w-10 h-10 mb-5 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md`}
      >
        {icon}
      </motion.div>

      {/* Titel */}
      <h3 className="text-base font-black text-white mb-2 group-hover:text-white/90 transition-colors">{title}</h3>

      {/* Beschreibung */}
      <p className="text-white/45 text-sm leading-relaxed mb-4">{description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <motion.span key={tag} whileHover={{ scale: 1.08, y: -2 }}
            className="px-2.5 py-1 bg-white/6 border border-white/10 text-white/50 text-[11px] font-medium rounded-lg">
            {tag}
          </motion.span>
        ))}
      </div>

      {/* Bottom accent line wächst bei Hover */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500 w-0 group-hover:w-full rounded-full" />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FeaturesSection
   ═══════════════════════════════════════════════════════════════ */
function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useFramerInView(headerRef, { once: true, amount: 0.3 });

  const features = [
    {
      gradient: 'from-pink-500 to-rose-500',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2.5" />
          <path d="M7.5 2.5h5" />
        </svg>
      ),
      title: 'Timer der nicht nervt', tags: ['Automatisch', 'Pausieren', 'Kategorien'],
      description: 'Ein Klick — und du läufst. Kein kompliziertes Setup. Einfach loslegen und lernen.',
    },
    {
      gradient: 'from-fuchsia-500 to-purple-500',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M3 14l4-5 4 3 4-6" />
          <path d="M2 17h16" />
        </svg>
      ),
      title: 'Zahlen die motivieren', tags: ['Wöchentlich', 'Vergleich', 'Charts'],
      description: 'Sieh schwarz auf weiß: Diese Woche 4 Stunden mehr als letzte Woche. Das fühlt sich gut an.',
    },
    {
      gradient: 'from-violet-500 to-indigo-500',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="10" cy="10" r="7" />
          <circle cx="10" cy="10" r="3" />
          <path d="M10 3V1M10 19v-2M3 10H1M19 10h-2" />
        </svg>
      ),
      title: 'Ziele die Spaß machen', tags: ['Streaks', 'Achievements', 'Erinnerungen'],
      description: 'Setz Wochenziele und lass StudyTracker mitfiebern. Streaks, Meilensteine — gutes Gefühl garantiert.',
    },
  ];

  return (
    <section id="funktionen" className="relative py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0, y: 16 }} animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-4 uppercase tracking-wide"
          >
            Warum StudyTracker?
          </motion.span>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: '100%' }} animate={headerInView ? { y: '0%' } : {}}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.76, 0, 0.24, 1] }}
              className="text-3xl sm:text-4xl font-black text-white mb-3"
            >
              So einfach, dass du<br />
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                keine Ausrede mehr hast
              </span>
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }} animate={headerInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="text-white/45 max-w-lg mx-auto text-sm sm:text-base"
          >
            Kein Onboarding-Tutorial. Kein Kalender synchronisieren. Einfach loslegen.
          </motion.p>
        </div>

        {/* Karten */}
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
   Checklist links + wachsende Balken rechts (alle Größen sichtbar).
   ═══════════════════════════════════════════════════════════════ */
function AllInOneSection() {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftIn   = useFramerInView(leftRef,  { once: true, amount: 0.2 });
  const rightIn  = useFramerInView(rightRef, { once: true, amount: 0.2 });

  const items = [
    { emoji: '🗂️', title: 'Fach-Kategorien',  desc: 'Eigene Fächer mit Farben und Icons.' },
    { emoji: '🔥', title: 'Tages-Streaks',     desc: 'Täglich lernen, Streak am Leben halten.' },
    { emoji: '🌙', title: 'Dark Mode',          desc: 'Augenschonend für Late-Night-Sessions.' },
    { emoji: '📤', title: 'Export',             desc: 'Deine Daten als CSV oder PDF.' },
  ];

  const bars = [
    { day: 'Mo', h: 65,  hot: false },
    { day: 'Di', h: 40,  hot: false },
    { day: 'Mi', h: 80,  hot: false },
    { day: 'Do', h: 55,  hot: false },
    { day: 'Fr', h: 100, hot: true  },
    { day: 'Sa', h: 35,  hot: false },
    { day: 'So', h: 25,  hot: false },
  ];

  return (
    <section id="ueber" className="relative py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Checklist-Spalte ─────────────────────────────── */}
          <div ref={leftRef}>
            <motion.span
              initial={{ opacity: 0, y: 16 }} animate={leftIn ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-5 uppercase tracking-wide"
            >
              Komplettlösung
            </motion.span>
            <div className="overflow-hidden mb-3">
              <motion.h2
                initial={{ y: '100%' }} animate={leftIn ? { y: '0%' } : {}}
                transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
                className="text-3xl sm:text-4xl font-black text-white leading-tight"
              >
                Alles drin.<br />
                <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Nichts Überflüssiges.
                </span>
              </motion.h2>
            </div>
            <motion.p
              initial={{ opacity: 0 }} animate={leftIn ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
              className="text-white/45 mb-10 text-sm"
            >
              StudyTracker ist kein Feature-Monster. Nur was wirklich hilft.
            </motion.p>

            {/* Checklist */}
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

            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={leftIn ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7 }}
              className="mt-8"
            >
              <MagneticButton to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-xl shadow-xl text-sm">
                Jetzt ausprobieren
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>
            </motion.div>
          </div>

          {/* ── Chart-Panel ─────────────────────────────────── */}
          <motion.div
            ref={rightRef}
            initial={{ opacity: 0, x: 36 }}
            animate={rightIn ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-bold text-sm">Wochenübersicht</p>
                <span className="text-white/35 text-xs">Mai 2026</span>
              </div>
              <p className="text-white/35 text-xs mb-6">Lernstunden pro Tag</p>

              {/* Balkendiagramm — Balken wachsen beim Einblenden */}
              {/* Aufbau: relative Container für absolute Balken + separate Label-Zeile */}
              <div className="mb-3">
                <div className="relative h-28 flex gap-1.5">
                  {bars.map((bar, i) => (
                    <div key={bar.day} className="flex-1 relative">
                      <motion.div
                        className={`absolute bottom-0 left-0 right-0 rounded-t-md ${bar.hot ? 'bg-gradient-to-t from-pink-500 to-purple-400' : 'bg-white/20'}`}
                        /* originY: 1 = Framer-Motion "bottom" — Balken wächst von unten nach oben */
                        style={{ height: `${bar.h}%`, originY: 1 }}
                        initial={{ scaleY: 0 }}
                        animate={rightIn ? { scaleY: 1 } : { scaleY: 0 }}
                        transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    </div>
                  ))}
                </div>
                {/* Tageslabels unterhalb der Balken */}
                <div className="flex gap-1.5 mt-1.5">
                  {bars.map((bar) => (
                    <div key={bar.day} className="flex-1 flex justify-center">
                      <span className={`text-[9px] font-semibold ${bar.hot ? 'text-white' : 'text-white/35'}`}>
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats-Grid */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                {[
                  { l: 'Gesamt', v: '38h' },
                  { l: 'Ø / Tag', v: '5.4h' },
                  { l: 'Streak', v: '7 🔥' },
                ].map(({ l, v }) => (
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
   ═══════════════════════════════════════════════════════════════ */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFramerInView(ref, { once: true, amount: 0.1 });

  const faqs = [
    { q: 'Wirklich kostenlos? Kein Haken?',
      a: 'Kein Haken. StudyTracker ist kostenlos und bleibt es. Keine Kreditkarte, kein Abo. Einfach registrieren.' },
    { q: 'Wie funktioniert der Timer genau?',
      a: 'Fach auswählen → Timer starten → lernen. Fertig. Alles wird automatisch gespeichert.' },
    { q: 'Kann ich eigene Fächer anlegen?',
      a: 'Klar! So viele wie du willst — von Mathe bis Gitarrenüben. Jedes mit Farbe und Icon.' },
    { q: 'Was passiert mit meinen Daten?',
      a: 'Deine Daten gehören dir. Niemals weitergegeben, niemals verkauft. Jederzeit exportierbar oder löschbar.' },
  ];

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="max-w-2xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-10" ref={ref}>
          <motion.span
            initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            className="inline-block px-4 py-1.5 bg-white/8 border border-white/12 text-white/60 text-xs font-bold rounded-full mb-4 uppercase tracking-wide"
          >
            FAQ
          </motion.span>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: '100%' }} animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
              className="text-3xl sm:text-4xl font-black text-white"
            >
              Häufige Fragen
            </motion.h2>
          </div>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-2xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-white/15 transition-colors"
            >
              <button type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                className="w-full flex items-center justify-between px-5 py-4 text-left group"
              >
                <span className="font-semibold text-white/80 text-sm pr-4 group-hover:text-white transition-colors">{q}</span>
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
              <AnimatePresence initial={false}>
                {openIdx === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeInOut' }}
                  >
                    <div className="h-px bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-transparent mx-5" />
                    <p className="px-5 py-4 text-white/45 text-sm leading-relaxed">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55 }}
          className="text-center mt-12"
        >
          <p className="text-white/30 text-sm mb-5">Am besten einfach ausprobieren 👇</p>
          <MagneticButton to="/register"
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
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="relative border-t border-white/6 py-8">
      <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div whileHover={{ scale: 1.1, rotate: -3 }}
            className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-black">S</span>
          </motion.div>
          <span className="text-sm font-black text-white/60">StudyTracker</span>
        </Link>
        <div className="flex items-center gap-6 text-xs text-white/25">
          {[
            { label: 'Datenschutz', to: '/datenschutz' },
            { label: 'AGB',         to: '/agb'         },
            { label: 'Kontakt',     to: '/kontakt'      },
          ].map(({ label, to }) => (
            <Link key={to} to={to}
              className="hover:text-white/60 transition-colors">
              {label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-white/20">© {new Date().getFullYear()} StudyTracker</p>
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
  const [loaded, setLoaded] = useState(false);
  /* Lenis: butterweicher Smooth Scroll */
  useLenis();

  return (
    <>
      {/* Globale CSS-Keyframes */}
      <style>{GLOBAL_CSS}</style>

      {/* PageLoader — AnimatePresence für Fade-out */}
      <AnimatePresence>
        {!loaded && <PageLoader onDone={() => setLoaded(true)} />}
      </AnimatePresence>

      {/* Hintergrund-Layer (fixed, z-index 0) */}
      <GridBackground />
      <FloatingShapes />

      {/* Filmkorn-Overlay (fixed, z-index 999) */}
      <FilmGrain />

      {/* Scroll-Fortschrittsbalken (fixed, z-index 1000) */}
      <ScrollProgress />

      {/* Custom Cursor (fixed) */}
      <CustomCursor />

      {/* Seiteninhalt */}
      <div className="relative z-10 min-h-screen">
        <Navbar />
        <HeroSection />
        <StatsSection />
        <MarqueeStrip />
        <FeaturesSection />
        <AllInOneSection />
        <FAQSection />
        <Footer />
      </div>
    </>
  );
}
