// Static JAMB question packs: fetched from /jamb-packs/*.json (bundled with
// the site, cached by the service worker so practice works fully offline).
// The packs are the verified CSVs converted losslessly to JSON; see
// public/jamb-packs/. Content fixes land by replacing the JSON bundles.

export type PackSubject = "english" | "mathematics" | "biology" | "digital-technology";

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
export interface RunQuestion {
  id: string;
  year: string;
  topic: string;
  text: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const PACK_SUBJECTS: { slug: PackSubject; label: string }[] = [
  { slug: "english", label: "English" },
  { slug: "mathematics", label: "Mathematics" },
  { slug: "biology", label: "Biology" },
  { slug: "digital-technology", label: "Digital Technology" },
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
  const questions: RunQuestion[] = picked.map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      id: q.id,
      year: q.year,
      topic: q.topic,
      text: q.text,
      options: order.map((i) => q.options[i]),
      answer: order.indexOf(q.answer),
      explanation: q.explanation,
    };
  });
  return { questions, available: pool.length };
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
