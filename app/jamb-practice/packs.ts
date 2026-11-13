// Static JAMB question packs: fetched from /jamb-packs/*.json (bundled with
// the site, cached by the service worker so practice works fully offline).
// The packs are the verified CSVs converted losslessly to JSON; see
// public/jamb-packs/. Content fixes land by replacing the JSON bundles.

export type PackSubject = "english" | "mathematics" | "biology" | "digital-technology" | "physics" | "chemistry" | "economics" | "government";

export interface PackQuestion {
  id: string;
  year: string;
  topic: string;
  text: string;
  options: string[];
  answer: number; // index into options (0-3)
  explanation: string;
}

export interface Pack {
  subject: string;
  version: number;
  questions: PackQuestion[];
}

// A question as served in a run: options shuffled, answer index remapped.
// Explanations never reference an option letter, so shuffling is safe.
// subjectSlug/subjectLabel are set for multi-subject runs (sittings and
// weak-topic sets) so the quiz screen and review can show which subject
// each question belongs to; single-subject runs leave them unset and use
// the run's subject instead.
export interface RunQuestion {
  id: string;
  year: string;
  topic: string;
  text: string;
  options: string[];
  answer: number;
  explanation: string;
  subjectSlug?: PackSubject;
  subjectLabel?: string;
}

export const PACK_SUBJECTS: { slug: PackSubject; label: string }[] = [
  { slug: "english", label: "English" },
  { slug: "mathematics", label: "Mathematics" },
  { slug: "biology", label: "Biology" },
  { slug: "digital-technology", label: "Digital Technology" },
  { slug: "physics", label: "Physics" },
  { slug: "chemistry", label: "Chemistry" },
  { slug: "economics", label: "Economics" },
  { slug: "government", label: "Government" },
];

export const PACK_YEARS = ["2020", "2021", "2022", "2023", "2024", "2025"];

const packCache = new Map<PackSubject, Promise<Pack>>();

export function loadPack(subject: PackSubject): Promise<Pack> {
  let pending = packCache.get(subject);
  if (!pending) {
    pending = fetch(`/jamb-packs/${subject}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Pack ${subject} failed to load (${res.status}).`);
        return res.json() as Promise<Pack>;
      })
      .then((pack) => {
        if (!pack || !Array.isArray(pack.questions) || pack.questions.length === 0) {
          throw new Error(`Pack ${subject} is empty.`);
        }
        return pack;
      })
      .catch((err) => {
        // Don't cache failures: a retry after reconnecting must refetch.
        packCache.delete(subject);
        throw err;
      });
    packCache.set(subject, pending);
  }
  return pending;
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Shuffle one question's options and remap its answer index. Shared by
// every run builder so option order is always freshly random.
function toRunQuestion(
  q: PackQuestion,
  subjectSlug?: PackSubject,
  subjectLabel?: string,
): RunQuestion {
  const order = shuffle([0, 1, 2, 3]);
  return {
    id: q.id,
    year: q.year,
    topic: q.topic,
    text: q.text,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
    explanation: q.explanation,
    ...(subjectSlug ? { subjectSlug, subjectLabel } : {}),
  };
}

// Build one run: filter by year ("RANDOM" = all years), shuffle the pool,
// take `size` questions (or fewer when the pool is smaller), shuffle each
// question's options and remap its answer index.
export function buildRun(
  pack: Pack,
  year: string,
  size: number,
): { questions: RunQuestion[]; available: number } {
  const pool = year === "RANDOM" ? pack.questions : pack.questions.filter((q) => q.year === year);
  const picked = shuffle(pool).slice(0, size);
  return { questions: picked.map((q) => toRunQuestion(q)), available: pool.length };
}

// One section of a JAMB-standard sitting: a subject's slice of the run.
export interface SittingSection {
  slug: PackSubject;
  label: string;
  start: number; // index of the section's first question in the run
  count: number;
}

// Build a real UTME sitting: ALL of the English pack (60) plus 40 sampled
// from each of the three picked subjects' 60-question packs, all years.
// Sections keep their order (English first, then the picks in pick order)
// so the quiz screen can tab between subjects and score each /100.
export function buildSitting(
  englishPack: Pack,
  picks: { slug: PackSubject; label: string; pack: Pack }[],
): { questions: RunQuestion[]; sections: SittingSection[] } {
  const questions: RunQuestion[] = [];
  const sections: SittingSection[] = [];
  const english = shuffle(englishPack.questions).map((q) => toRunQuestion(q, "english", "English"));
  sections.push({ slug: "english", label: "English", start: 0, count: english.length });
  questions.push(...english);
  for (const pick of picks) {
    const picked = shuffle(pick.pack.questions)
      .slice(0, 40)
      .map((q) => toRunQuestion(q, pick.slug, pick.label));
    sections.push({ slug: pick.slug, label: pick.label, start: questions.length, count: picked.length });
    questions.push(...picked);
  }
  return { questions, sections };
}

// Build a weak-topic set: pool every question whose (subject, topic) is
// one of the given weak topics, shuffle, take `size` (or fewer when the
// pool is smaller). Topics come only from the student's own stored
// attempt history — see topicStats.ts.
export function buildWeakSet(
  packs: { slug: PackSubject; label: string; pack: Pack }[],
  topics: { subject: PackSubject; topic: string }[],
  size: number,
): { questions: RunQuestion[]; available: number } {
  const wanted = new Set(topics.map((t) => `${t.subject}::${t.topic}`));
  const pool: RunQuestion[] = [];
  for (const { slug, label, pack } of packs) {
    for (const q of pack.questions) {
      if (wanted.has(`${slug}::${q.topic}`)) {
        pool.push(toRunQuestion(q, slug, label));
      }
    }
  }
  const picked = shuffle(pool).slice(0, size);
  return { questions: picked, available: pool.length };
}

// True when all packs are already in a Cache Storage cache (i.e. the
// service worker has saved them for offline use).
export async function packsSavedForOffline(): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    for (const subject of PACK_SUBJECTS) {
      const hit = await caches.match(`/jamb-packs/${subject.slug}.json`, { ignoreSearch: true });
      if (!hit) return false;
    }
    return true;
  } catch {
    return false;
  }
}
