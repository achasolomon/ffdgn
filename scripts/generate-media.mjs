/**
 * Generates the FFDGN institutional artwork set (SVG) into public/media/.
 * Dignified, on-brand placeholders the Secretariat replaces with real
 * photography via the media library — every file has a matching MediaAsset
 * record (see prisma/seed.ts) with title, credit and alt text.
 * Run: `node scripts/generate-media.mjs`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "media");
mkdirSync(join(root, "portraits"), { recursive: true });
mkdirSync(join(root, "events"), { recursive: true });
mkdirSync(join(root, "news"), { recursive: true });
mkdirSync(join(root, "site"), { recursive: true });

const GREEN = "#0B2E1B";
const GREEN2 = "#10482A";
const PRIMARY = "#026E34";
const GOLD = "#E2BF59";
const CREAM = "#F8F7F2";

const pattern = (id) => `
  <defs>
    <pattern id="${id}" width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
      <line x1="0" y1="0" x2="0" y2="72" stroke="${GOLD}" stroke-opacity="0.10" stroke-width="1.5"/>
      <line x1="36" y1="0" x2="36" y2="72" stroke="${GOLD}" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN2}"/>
    </linearGradient>
  </defs>`;

const flag = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-3" y="0" width="6" height="150" fill="#5a4a28"/>
    <rect x="3" y="6" width="30" height="60" fill="#008751"/>
    <rect x="33" y="6" width="30" height="60" fill="#ffffff"/>
    <rect x="63" y="6" width="30" height="60" fill="#008751"/>
  </g>`;

const seal = (cx, cy, r) => `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 10}" fill="none" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="1.5"/>
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Georgia, serif" font-size="${r * 0.34}" font-weight="bold" fill="${GOLD}">FF</text>
    <text x="${cx}" y="${cy + r * 0.26}" text-anchor="middle" font-family="Georgia, serif" font-size="${r * 0.34}" font-weight="bold" fill="${GOLD}">DGN</text>
  </g>`;

function portrait(initials, name, state) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img">
  ${pattern("p")}
  <rect width="800" height="800" fill="url(#p-bg)"/>
  <rect width="800" height="800" fill="url(#p)"/>
  <circle cx="400" cy="330" r="190" fill="none" stroke="${GOLD}" stroke-width="4"/>
  <circle cx="400" cy="330" r="172" fill="#0E3B22"/>
  <text x="400" y="392" text-anchor="middle" font-family="Georgia, serif" font-size="150" font-weight="bold" fill="${GOLD}">${initials}</text>
  <text x="400" y="620" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="${CREAM}">${name}</text>
  <text x="400" y="664" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" letter-spacing="6" fill="${GOLD}">${state.toUpperCase()}</text>
  <rect x="330" y="690" width="140" height="3" fill="${GOLD}"/>
</svg>`;
}

function hall(title, subtitle, variant) {
  const rows = variant === "roundtable"
    ? `<ellipse cx="640" cy="430" rx="330" ry="120" fill="none" stroke="${GOLD}" stroke-width="5"/>
       <ellipse cx="640" cy="430" rx="250" ry="88" fill="#0E3B22" stroke="${GOLD}" stroke-opacity="0.6" stroke-width="2"/>
       ${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return `<circle cx="${640 + 330 * Math.cos(a)}" cy="${430 + 120 * Math.sin(a)}" r="16" fill="${PRIMARY}" stroke="${GOLD}" stroke-width="2"/>`; }).join("")}`
    : `${[0, 1, 2, 3].map((r) => `<path d="M ${180 + r * 40} ${560 - r * 8} Q 640 ${500 - r * 26} ${1100 - r * 40} ${560 - r * 8}" fill="none" stroke="${GOLD}" stroke-opacity="${0.7 - r * 0.13}" stroke-width="4"/>`).join("")}
       ${Array.from({ length: 24 }, (_, i) => { const x = 250 + i * 46; const y = 505 + Math.abs(x - 640) * 0.06; return `<rect x="${x}" y="${y}" width="26" height="40" rx="4" fill="${PRIMARY}" stroke="${GOLD}" stroke-opacity="0.55"/>`; }).join("")}
       <rect x="480" y="180" width="320" height="150" rx="6" fill="#0E3B22" stroke="${GOLD}" stroke-width="3"/>
       <text x="640" y="245" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="${GOLD}">FFDGN</text>
       <text x="640" y="285" text-anchor="middle" font-family="Verdana, sans-serif" font-size="16" letter-spacing="4" fill="${CREAM}">PLENARY HALL · ABUJA</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img">
  ${pattern("h")}
  <rect width="1280" height="720" fill="url(#h-bg)"/>
  <rect width="1280" height="720" fill="url(#h)"/>
  ${flag(150, 120)}${flag(1130, 120)}
  ${rows}
  ${seal(640, 620, 44)}
  <text x="80" y="80" font-family="Verdana, sans-serif" font-size="22" letter-spacing="8" fill="${GOLD}">${title}</text>
  <text x="80" y="112" font-family="Verdana, sans-serif" font-size="15" letter-spacing="3" fill="${CREAM}" opacity="0.75">${subtitle}</text>
</svg>`;
}

function skyline() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img">
  ${pattern("s")}
  <rect width="1280" height="720" fill="url(#s-bg)"/>
  <circle cx="1020" cy="150" r="70" fill="${GOLD}" opacity="0.85"/>
  <rect x="0" y="560" width="1280" height="160" fill="#071f12"/>
  <g fill="#0E3B22" stroke="${GOLD}" stroke-opacity="0.5">
    <rect x="120" y="380" width="120" height="180"/><rect x="270" y="430" width="90" height="130"/>
    <rect x="880" y="400" width="110" height="160"/><rect x="1020" y="450" width="140" height="110"/>
  </g>
  <g>
    <rect x="470" y="300" width="340" height="260" fill="#0E3B22" stroke="${GOLD}" stroke-width="3"/>
    <path d="M 640 170 A 130 130 0 0 1 770 300 L 510 300 A 130 130 0 0 1 640 170" fill="${PRIMARY}" stroke="${GOLD}" stroke-width="3"/>
    <rect x="632" y="120" width="16" height="60" fill="${GOLD}"/>
    <rect x="470" y="380" width="340" height="10" fill="${GOLD}" opacity="0.6"/>
    <rect x="470" y="430" width="340" height="10" fill="${GOLD}" opacity="0.35"/>
    <rect x="470" y="480" width="340" height="10" fill="${GOLD}" opacity="0.2"/>
  </g>
  ${flag(400, 380, 0.9)}${flag(880, 380, 0.9)}
  <text x="80" y="100" font-family="Verdana, sans-serif" font-size="22" letter-spacing="8" fill="${GOLD}">ABUJA · NIGERIA</text>
  <text x="80" y="132" font-family="Georgia, serif" font-size="34" fill="${CREAM}">Seat of the Forum</text>
</svg>`;
}

function heroAssembly() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img">
  ${pattern("a")}
  <rect width="1600" height="900" fill="url(#a-bg)"/>
  <rect width="1600" height="900" fill="url(#a)"/>
  <g opacity="0.9">
    ${[0, 1, 2, 3, 4].map((r) => `<path d="M ${120 + r * 60} 720 Q 800 ${560 - r * 40} ${1480 - r * 60} 720" fill="none" stroke="${GOLD}" stroke-opacity="${0.55 - r * 0.08}" stroke-width="5"/>`).join("")}
    ${Array.from({ length: 30 }, (_, i) => { const x = 200 + i * 46; return `<circle cx="${x}" cy="${648 - Math.abs(x - 800) * 0.05}" r="13" fill="${PRIMARY}" stroke="${GOLD}" stroke-width="2"/>`; }).join("")}
  </g>
  <rect x="620" y="180" width="360" height="170" rx="8" fill="#0E3B22" stroke="${GOLD}" stroke-width="4"/>
  <text x="800" y="258" text-anchor="middle" font-family="Georgia, serif" font-size="52" fill="${GOLD}">FFDGN</text>
  <text x="800" y="300" text-anchor="middle" font-family="Verdana, sans-serif" font-size="17" letter-spacing="5" fill="${CREAM}">EXPERIENCE · DIALOGUE · ACTION</text>
  ${flag(420, 200, 1.2)}${flag(1180, 200, 1.2)}
  ${seal(800, 720, 60)}
</svg>`;
}

function mapNg(caption) {
  const dots = Array.from({ length: 36 }, (_, i) => {
    const x = 420 + (i % 6) * 80 + ((i * 37) % 23);
    const y = 210 + Math.floor(i / 6) * 62 + ((i * 53) % 17);
    return `<circle cx="${x}" cy="${y}" r="7" fill="${GOLD}" opacity="0.9"><title>State ${i + 1}</title></circle>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img">
  ${pattern("m")}
  <rect width="1280" height="720" fill="url(#m-bg)"/>
  <rect width="1280" height="720" fill="url(#m)"/>
  <path d="M 380 180 L 880 160 L 940 300 L 860 520 L 560 560 L 400 440 Z" fill="#0E3B22" stroke="${GOLD}" stroke-width="4"/>
  ${dots}
  <text x="80" y="100" font-family="Verdana, sans-serif" font-size="22" letter-spacing="8" fill="${GOLD}">36 STATES · ONE FORUM</text>
  <text x="80" y="140" font-family="Georgia, serif" font-size="32" fill="${CREAM}">${caption}</text>
</svg>`;
}

function newsArt(kind, title) {
  const motif = {
    handshake: `<g stroke="${GOLD}" stroke-width="6" fill="none"><path d="M 440 400 Q 640 300 840 400"/><path d="M 440 400 Q 640 360 840 400"/><circle cx="440" cy="400" r="34" fill="${PRIMARY}" stroke="${GOLD}" stroke-width="4"/><circle cx="840" cy="400" r="34" fill="${PRIMARY}" stroke="${GOLD}" stroke-width="4"/></g>`,
    document: `<g><rect x="500" y="180" width="280" height="360" rx="8" fill="${CREAM}"/><rect x="530" y="230" width="220" height="14" fill="${PRIMARY}"/><rect x="530" y="270" width="220" height="10" fill="#888"/><rect x="530" y="300" width="220" height="10" fill="#888"/><rect x="530" y="330" width="150" height="10" fill="#888"/><circle cx="750" cy="470" r="52" fill="none" stroke="${GOLD}" stroke-width="8"/><text x="750" y="488" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="${GOLD}">✓</text></g>`,
    meeting: `<ellipse cx="640" cy="420" rx="300" ry="110" fill="none" stroke="${GOLD}" stroke-width="5"/>${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<circle cx="${640 + 300 * Math.cos(a)}" cy="${420 + 110 * Math.sin(a)}" r="18" fill="${PRIMARY}" stroke="${GOLD}" stroke-width="2"/>`; }).join("")}`,
    flags: `${flag(480, 220, 1.6)}${flag(760, 220, 1.6)}${seal(640, 560, 52)}`,
  }[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img">
  ${pattern("n")}
  <rect width="1280" height="720" fill="url(#n-bg)"/>
  <rect width="1280" height="720" fill="url(#n)"/>
  ${motif}
  <text x="80" y="80" font-family="Verdana, sans-serif" font-size="22" letter-spacing="8" fill="${GOLD}">FFDGN · NEWS & MEDIA</text>
  <text x="80" y="660" font-family="Georgia, serif" font-size="30" fill="${CREAM}">${title}</text>
</svg>`;
}

const files = {
  "portraits/atim-tyonongu.svg": portrait("AT", "H.E. Atim Tyonongu", "Benue"),
  "portraits/hafsat-balewa.svg": portrait("HB", "H.E. Hafsat Balewa", "Kaduna"),
  "portraits/eze-okonkwo.svg": portrait("EO", "Prof. Eze Okonkwo", "Enugu"),
  "portraits/funke-ajayi.svg": portrait("FA", "H.E. Funke Ajayi", "Ondo"),
  "portraits/sule-lamido-jnr.svg": portrait("SL", "Rt. Hon. Sule Lamido Jnr", "Jigawa"),
  "portraits/grand-patron.svg": portrait("GP", "Grand Patron", "FFDGN"),
  "portraits/ngozi-eze.svg": portrait("NE", "H.E. Ngozi Eze", "Abia"),
  "portraits/ibrahim-dambo.svg": portrait("ID", "H.E. Ibrahim Dambo", "Borno"),
  "events/conference-2026.svg": hall("ANNUAL CONFERENCE 2026", "BUILDING STRONGER INSTITUTIONS", "plenary"),
  "events/conference-2025.svg": hall("LEADERSHIP ROUNDTABLE 2025", "STRENGTHENING INSTITUTIONS · BUILDING TRUST", "roundtable"),
  "events/conference-2024.svg": hall("NATIONAL CONFERENCE 2024", "RENEWED HOPE · SUSTAINABLE DEVELOPMENT", "plenary"),
  "events/dialogue-session.svg": hall("POLICY DIALOGUE SERIES", "EXPERIENCE IN SERVICE", "roundtable"),
  "site/abuja-seat.svg": skyline(),
  "site/hero-assembly.svg": heroAssembly(),
  "site/map-states.svg": mapNg("Represented in every state"),
  "news/collaboration.svg": newsArt("handshake", "State–Federal Collaboration"),
  "news/partnership.svg": newsArt("flags", "Strategic Partnerships"),
  "news/meeting.svg": newsArt("meeting", "Strategic Meeting on Development"),
  "news/communique.svg": newsArt("document", "Official Communiqué Published"),
};

for (const [rel, svg] of Object.entries(files)) {
  writeFileSync(join(root, rel), svg);
  console.log("wrote", rel, `(${(svg.length / 1024).toFixed(1)} KB)`);
}
console.log(`Done: ${Object.keys(files).length} assets.`);
