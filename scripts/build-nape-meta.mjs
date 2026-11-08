/**
 * Editorial metadata layered over the supplied NAPE document. NOTHING here
 * changes a question's wording or answer except the five revisions the event
 * owner approved (see REVISIONS). Topics, flags and images are our additions.
 *
 *   topic     assigned by us (the document jumbles topics on purpose)
 *   flags     things a host/reviewer should know before publishing
 *   visual    the picture shown with the question (bundled under public/)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const G = "Geology", D = "Drilling & Production", H = "Health & Safety", B = "Industry & Business";
const TOPICS = [
  D, G, B, D, H, D, H, D, G, G, D, B, G, H, B, H, D, H, B, G,
  B, B, H, D, H, B, H, B, H, G, B, H, B, D, H, G, H, G, B, H,
  D, B, H, D, H, B, H, G, D, H, D, G, B, D, G, D, B, H, B, D,
  H, D, B, G, H, D, D, B, D, H, D, D, G, D, H, G, H, D, G, D,
];

/**
 * The five approved technical wording improvements (final text supplied by the
 * event owner). Only stem, the listed option labels and the fun fact change;
 * the document's own text is always kept in each record's `nape.original`.
 */
const REVISIONS = {
  12: {
    prompt: "Which country was the world's largest producer of crude oil and lease condensate in 2025?",
    funFact: "The United States has been the world's leading crude oil producer since 2018, with shale production playing a major role in its growth.",
  },
  29: {
    prompt: "Which of these is an essential safety check before entering a confined space?",
    optionLabels: { C: "Test the atmosphere for hazardous conditions" },
    funFact: "Confined spaces can contain oxygen-deficient, toxic or flammable atmospheres. Atmospheric testing is an essential control alongside authorization, isolation and other entry precautions.",
  },
  61: {
    prompt: "Which of these extinguishers is generally suitable for use on energized electrical equipment?",
    optionLabels: { C: "Standard foam extinguisher" },
    funFact: "CO₂ extinguishers are non-conductive and leave no residue. Other appropriately rated extinguishers may also be suitable. Always follow site emergency procedures and equipment ratings.",
  },
  65: {
    prompt: "Which combination of measures helps prevent heat stress during work in hot conditions?",
    optionLabels: {
      A: "Remove your PPE and continue working",
      D: "Drink water regularly and take scheduled rest breaks in shaded or cooled areas",
    },
    funFact: "Heat-stress prevention also includes acclimatization, appropriate work-rest schedules, monitoring and controls suited to the working conditions.",
  },
  77: {
    prompt: "At approximately what 8-hour time-weighted average noise exposure level do many occupational hearing conservation programmes require protective measures?",
    funFact: "Prolonged exposure to excessive noise can cause permanent hearing damage. Hearing conservation action levels, exposure limits and mandatory hearing protection requirements vary by regulation and company standard.",
  },
};

const SAFETY = [5, 14, 16, 18, 25, 27, 29, 32, 37, 40, 43, 47, 50, 58, 61, 65, 70, 75, 77];
const NOTES = {
  12: "Final wording applied (stem and fun fact). VERIFIED against EIA: Today in Energy, 'U.S. crude oil production…' (International Energy Statistics, July 2026, eia.gov/todayinenergy/detail.php?id=67844) says the US remained the world's largest crude oil producer in 2025, 'extending a streak that began in 2018 when the United States overtook Russia'; EIA (id=63824, Nov 2024) says the US 'became the world's top crude oil producer in 2018, a position it has maintained each year since'. US crude + lease condensate averaged a record ~13.6 million b/d in 2025, ~40% above Russia and Saudi Arabia. The fun fact's 'since 2018' is confirmed; wording unchanged. Time-sensitive: re-check before future events.",
  15: "Time-sensitive: the stated 650,000 b/d is design capacity; actual throughput may differ.",
  29: "Final wording applied (stem, answer text, fun fact).",
  59: "Technical verification CLEARED (owner approval). Original wording and answer kept (True). Supporting source: OPEC Annual Statistical Bulletin 2026, Table 9.1 (proven natural gas reserves, bn standard m³) — Nigeria 6,111 (≈216 tcf) vs Algeria 4,504 (≈159 tcf) in 2025; Nigeria is the largest in Africa in every year 2021–2025 (Mozambique 2,840, Egypt 2,209). Corroborated by EIA (citing OPEC): Nigeria 211.1 tcf for 2024, and NUPRC: 210.54 tcf at 1 Jan 2025. The fun fact ('over 200 trillion cubic feet') is consistent.",
  61: "Final wording applied (stem, option C, fun fact).",
  63: "Fun fact arithmetic: 1971 minus 1960 = 11 years, consistent with the answer.",
  65: "Final wording applied (stem, options A and D, fun fact).",
  68: "Fun fact says the Act 'took almost 20 years to pass' — broadly accurate (reform proposals date from the early 2000s) but imprecise.",
  77: "Final wording applied (stem, fun fact). Thresholds vary by regulator.",
};

/**
 * Pictures. `kind`: photo = AI-generated professional image, diagram = our own
 * SVG. `zoom` adds the staged Zoom Out (cards appear after the third zoom).
 * Images carry no text, labels or ticks, so none can give the answer away.
 */
const P = (file, alt, zoom = false, focus) => ({ src: `/media/puzzles/nape/${file}`, kind: "photo", alt, zoom, ...(focus ? { focus } : {}) });
const S = (file, alt) => ({ src: `/media/puzzles/nape/diagrams/${file}`, kind: "diagram", alt, zoom: false });
const VISUALS = {
  1: S("bop.svg", "A stack of ram and annular blowout preventers with choke and kill lines on a wellhead"),
  2: S("well-log.svg", "A set of well-log curves plotted against depth"),
  4: S("pigging.svg", "A cutaway of a pipeline with a cylindrical tool travelling through it"),
  6: P("q06-fpso.webp", "A ship-shaped floating production vessel at sea", true),
  7: P("q07-ppe.webp", "A worker wearing a hard hat, glasses, gloves, coveralls and safety boots"),
  8: S("casing.svg", "A cross-section of a wellbore with steel pipe cemented in place"),
  9: S("petroleum-system.svg", "Rock layers with arrows showing oil moving upward"),
  11: S("christmas-tree.svg", "A stack of valves with side flowlines on top of a producing wellhead"),
  13: P("q13-microfossils.webp", "Microscopic fossil shells seen under a microscope", true),
  15: P("q15-refinery.webp", "A large oil refinery with towers and pipework at dusk"),
  16: P("q16-gas-detector.webp", "A worker holding a portable gas detector on an industrial site"),
  17: S("fracking.svg", "A cross-section showing fluid cracking rock around a horizontal well"),
  18: P("q18-ladder.webp", "A worker climbing a fixed steel ladder on an offshore platform"),
  24: P("q24-flare-stack.webp", "A tall flare stack burning at night", true),
  29: P("q29-confined-space.webp", "A worker at the entrance of a tank manway with a gas tester"),
  30: S("porosity.svg", "A magnified rock with grains and empty pore spaces"),
  36: P("q36-sedimentary-rock.webp", "Layered sedimentary rock in a cliff face", true),
  43: P("q43-lockout.webp", "A padlock and tag fitted to an industrial valve", true),
  48: S("anticline.svg", "A cross-section of rock layers folded into an arch"),
  52: S("petroleum-system.svg", "Rock layers with arrows showing oil moving upward"),
  54: S("distillation.svg", "A tall column with trays and pipes at several heights"),
  56: P("q56-derrick.webp", "A tall steel drilling derrick against the sky", true),
  61: P("q61-extinguishers.webp", "A row of fire extinguishers mounted on a wall"),
  62: S("waterflood.svg", "A cross-section with one well injecting and another producing"),
  72: S("directional.svg", "Several wells fanning out from one platform to different underground targets"),
  73: S("anticline.svg", "A cross-section of rock layers folded into an arch"),
  74: P("q74-drill-bit.webp", "A close-up of a steel drill bit with cutting teeth", true),
  76: P("q76-niger-delta.webp", "An aerial view of creeks and mangroves in a river delta"),
  77: P("q77-ear-defenders.webp", "Ear defenders worn by a worker on an industrial site"),
  78: P("q78-lng-tanker.webp", "A large LNG carrier ship moored at a terminal"),
  79: S("seismic.svg", "A ship towing cables that send sound waves into the seabed"),
  80: S("separator.svg", "A cutaway of a horizontal vessel with gas above, oil in the middle and water below"),
};

// A picture is only attached when its file is actually bundled, so a question
// can never point at a missing image. Photos not yet generated are listed.
const pending = [];
for (const [n, v] of Object.entries(VISUALS)) {
  if (!existsSync(join(ROOT, "public", v.src))) {
    pending.push(`Q${n} ${v.src.split("/").pop()}`);
    delete VISUALS[n];
  }
}

const meta = {};
for (let n = 1; n <= 80; n++) {
  const flags = [];
  if (SAFETY.includes(n)) flags.push("safety-sensitive");
  if ([12, 15].includes(n)) flags.push("time-sensitive");
  if (REVISIONS[n]) flags.push("wording-revised");
  meta[n] = {
    topic: TOPICS[n - 1],
    flags,
    ...(NOTES[n] ? { note: NOTES[n] } : {}),
    ...(REVISIONS[n] ? { revision: REVISIONS[n] } : {}),
    ...(VISUALS[n] ? { visual: VISUALS[n] } : {}),
  };
}
writeFileSync(join(ROOT, "data", "nape2026.meta.json"), JSON.stringify(meta, null, 2) + "\n");
// Fill the media manifest's alt text for the NAPE pictures (run media:manifest first).
{
  const mp = join(ROOT, "data", "media-manifest.json");
  const manifest = JSON.parse(readFileSync(mp, "utf8"));
  const alts = new Map(Object.values(VISUALS).map((v) => [v.src, v.alt]));
  for (const img of manifest.images) {
    if (alts.has(img.path)) {
      img.alt = alts.get(img.path);
      if (!img.tags.includes("nape")) img.tags = [...img.tags, "nape", "oil-gas"];
    }
  }
  writeFileSync(mp, JSON.stringify(manifest, null, 2) + "\n");
}
if (pending.length) console.log(`pending images (${pending.length}): ${pending.join(", ")}`);
const imgs = Object.keys(VISUALS).length;
console.log(`meta: 80 questions, ${imgs} with visuals (${Object.values(VISUALS).filter((v) => v.zoom).length} zoom), ${80 - imgs} text-only`);
