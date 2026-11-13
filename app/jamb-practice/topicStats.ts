// Per-topic accuracy, recorded locally on this device ONLY — never
// synced. The "Weak topics" preparation mode is built from exactly this
// data: the student's own answered questions, grouped by subject + topic.
// A topic qualifies as weak only once at least MIN_ANSWERED questions in
// it have been answered (picked, not merely shown); unanswered questions
// never feed the stats.
//
// This store is deliberately separate from the synced attempt history in
// sync.ts: sync keeps the exact test_results insert shape, while topic
// stats are device-local analytics. Resetting scores clears both.

import type { PackSubject } from "./packs";

export interface TopicStat {
  subject: PackSubject;
  topic: string;
  answered: number; // questions the student picked an answer for
  correct: number;
}

const TOPIC_STATS_KEY = "sd-jamb-topic-stats-v1";
const TOPIC_STATS_LIMIT = 500;

// Minimum answered questions in a topic before it can rank as weak.
export const MIN_ANSWERS_PER_TOPIC = 3;

// How many of the weakest topics feed one weak-topic set: enough to
// focus the set, few enough to stay targeted.
export const WEAK_TOPICS_PER_SET = 5;

export function loadTopicStats(): TopicStat[] {
  try {
    const raw = window.localStorage.getItem(TOPIC_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is TopicStat =>
        s &&
        typeof s.subject === "string" &&
        typeof s.topic === "string" &&
        typeof s.answered === "number" &&
        typeof s.correct === "number",
    );
  } catch {
    return [];
  }
}

function saveTopicStats(stats: TopicStat[]): void {
  try {
    window.localStorage.setItem(TOPIC_STATS_KEY, JSON.stringify(stats.slice(0, TOPIC_STATS_LIMIT)));
  } catch {
    // Storage full or unavailable: topic stats are a nicety, never fatal.
  }
}

// Merge one run's per-topic outcomes into the stored totals.
export function recordTopicStats(stats: TopicStat[]): void {
  if (stats.length === 0) return;
  const merged = new Map<string, TopicStat>();
  for (const s of loadTopicStats()) {
    merged.set(`${s.subject}::${s.topic}`, { ...s });
  }
  for (const s of stats) {
    const key = `${s.subject}::${s.topic}`;
    const existing = merged.get(key);
    if (existing) {
      existing.answered += s.answered;
      existing.correct += s.correct;
    } else {
      merged.set(key, { ...s });
    }
  }
  saveTopicStats([...merged.values()]);
}

export function clearTopicStats(): void {
  try {
    window.localStorage.removeItem(TOPIC_STATS_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

export function topicAccuracy(stat: TopicStat): number {
  return stat.answered > 0 ? stat.correct / stat.answered : 0;
}

// All qualifying topics, weakest first: lowest accuracy, then most
// answered (more evidence first), then subject/topic for a stable order.
// Topics below the minimum-answered threshold never appear.
export function rankWeakTopics(
  stats: TopicStat[],
  minAnswered: number = MIN_ANSWERS_PER_TOPIC,
): TopicStat[] {
  return stats
    .filter((s) => s.answered >= minAnswered)
    .sort((a, b) => {
      const acc = topicAccuracy(a) - topicAccuracy(b);
      if (acc !== 0) return acc;
      if (a.answered !== b.answered) return b.answered - a.answered;
      if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
      return a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0;
    });
}
