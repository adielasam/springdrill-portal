'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PwaSetup from './PwaSetup';
import { PACK_SUBJECTS, PACK_YEARS, buildRun, buildSitting, buildWeakSet, loadPack, packsSavedForOffline, type Pack, type PackSubject, type RunQuestion, type SittingSection } from './packs';
import { flushQueue, getSessionUserId, loadHistory, recordAttempt, type Attempt } from './sync';
import { MIN_ANSWERS_PER_TOPIC, WEAK_TOPICS_PER_SET, clearTopicStats, loadTopicStats, rankWeakTopics, recordTopicStats, topicAccuracy, type TopicStat } from './topicStats';

const SECONDS_PER_QUESTION = 60; // Practice mode: 1 minute per question.
const SITTING_SECONDS = 120 * 60; // JAMB standard: the real 2-hour sitting.
const SITTING_PICK_COUNT = 3; // English + any 3 of the other subjects.
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// Local-history storage key. Must match HISTORY_KEY in sync.ts — that
// module owns the queue, and this page only clears the device copy when
// the student asks to reset scores.
const HISTORY_STORAGE_KEY = 'sd-jamb-history-v1';

type Phase = 'setup' | 'running' | 'review';
type Mode = 'practice' | 'study';
// Preparation mode: the first step of setup. 'single' is the existing
// one-subject flow; 'sitting' is the full UTME sitting; 'weak' builds a
// set from the student's own weakest topics. Null shows the chooser.
type PrepMode = 'single' | 'sitting' | 'weak';
// What kind of run is in progress: drives the timer, section tabs,
// scoring and review. Stored in runMeta at start time.
type RunKind = 'single' | 'sitting' | 'weak';

interface SectionScore {
  label: string;
  correct: number;
  total: number;
  score100: number;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ClockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10 4.8 7.2 4.2 4 4.2v13.6c3.2 0 6 .6 8 2.3 2-1.7 4.8-2.3 8-2.3V4.2c-3.2 0-6 .6-8 2.3z" />
      <path d="M12 6.5v13.6" />
    </svg>
  );
}

function CapIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4L2.5 8.5 12 13l9.5-4.5L12 4z" />
      <path d="M6.5 11v4.2c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8V11" />
      <path d="M21.5 8.5V14" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Practice/Study toggle cards, shared by the single-subject and
// weak-topic setups so the choice looks and behaves the same in both.
function PracticeStudyCards({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <fieldset className="sd-jp-field">
      <legend className="sd-jp-field-label">How do you want to practise?</legend>
      <div className="sd-jp-modes" role="group" aria-label="Mode">
        <button
          type="button"
          className={mode === 'practice' ? 'sd-jp-mode-card sd-jp-mode-card-active' : 'sd-jp-mode-card'}
          aria-pressed={mode === 'practice'}
          onClick={() => onChange('practice')}
        >
          <span className="sd-jp-mode-icon"><ClockIcon /></span>
          <span className="sd-jp-mode-name">Practice</span>
          <span className="sd-jp-mode-desc">Timed set, like the real exam. Answers and explanations at the end.</span>
          <span className="sd-jp-mode-tag">Timed · 1 min per question</span>
        </button>
        <button
          type="button"
          className={mode === 'study' ? 'sd-jp-mode-card sd-jp-mode-card-active' : 'sd-jp-mode-card'}
          aria-pressed={mode === 'study'}
          onClick={() => onChange('study')}
        >
          <span className="sd-jp-mode-icon"><BookIcon /></span>
          <span className="sd-jp-mode-name">Study</span>
          <span className="sd-jp-mode-desc">No timer. Your answer locks when picked, and the explanation shows straight away.</span>
          <span className="sd-jp-mode-tag">Untimed · Answers as you go</span>
        </button>
      </div>
    </fieldset>
  );
}

export default function JambPractice({ initialSubject }: { initialSubject?: PackSubject }) {
  // Environment state.
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  // Preparation mode: the first setup step. A ?subject= arrival (footer
  // links) lands straight on the single-subject setup, as before; every
  // other arrival picks a preparation mode first.
  const [prepMode, setPrepMode] = useState<PrepMode | null>(initialSubject ? 'single' : null);

  // Setup state.
  const [subject, setSubject] = useState<PackSubject>(initialSubject ?? 'english');
  const [year, setYear] = useState('RANDOM');
  const [size, setSize] = useState(10);
  const [mode, setMode] = useState<Mode>('practice');
  const [pack, setPack] = useState<Pack | null>(null);
  const [packError, setPackError] = useState('');
  // Per-subject question counts, loaded from the JSON bundles: the picker
  // never assumes a fixed number of subjects or questions per pack.
  const [packCounts, setPackCounts] = useState<Partial<Record<PackSubject, number>>>({});
  // Sitting setup: the 3 non-English subjects picked, in pick order.
  const [sittingPicks, setSittingPicks] = useState<PackSubject[]>([]);
  // Per-topic accuracy from this device only (see topicStats.ts). Loaded
  // on mount and refreshed after every finished run.
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  // Questions available across the weakest topics (null until counted).
  const [weakPoolSize, setWeakPoolSize] = useState<number | null>(null);

  // Run state.
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<RunQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState<{ correct: number; total: number; jambScore: number } | null>(null);
  const [syncNote, setSyncNote] = useState('');
  // Sitting sections (subject slices of the run) and per-section scores.
  // Empty for single-subject and weak-topic runs.
  const [sections, setSections] = useState<SittingSection[]>([]);
  const [sectionScores, setSectionScores] = useState<SectionScore[] | null>(null);
  const [runMeta, setRunMeta] = useState<{ subjectLabel: string; subjectSlug?: PackSubject; year: string; mode: Mode; kind: RunKind }>({ subjectLabel: '', year: '', mode: 'practice', kind: 'single' });
  const finishedRef = useRef(false);
  // Scroll anchors: the question block and the review score hero. Their
  // scroll-margin-top (PRACTICE_STYLES) holds them clear of the sticky
  // bars — see the scroll effects below.
  const questionRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

  // Online/offline + offline-ready + session + history, on mount and
  // whenever connectivity returns.
  const refreshEnvironment = useCallback(async () => {
    setOnline(navigator.onLine);
    setOfflineReady(await packsSavedForOffline());
    setHistory(loadHistory());
    const userId = await getSessionUserId();
    setSignedIn(userId !== null);
    if (navigator.onLine) {
      await flushQueue();
      setHistory(loadHistory());
    }
  }, []);

  useEffect(() => {
    void refreshEnvironment();
    const onOnline = () => { void refreshEnvironment(); };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshEnvironment]);

  // Preload the selected subject's pack: warms the offline cache and gives
  // the setup screen its question counts.
  useEffect(() => {
    let cancelled = false;
    setPackError('');
    loadPack(subject)
      .then((loaded) => { if (!cancelled) setPack(loaded); })
      .catch(() => {
        if (!cancelled) {
          setPack(null);
          setPackError('Could not load the question pack. Check your connection and try again.');
        }
      });
    return () => { cancelled = true; };
  }, [subject]);

  // Load every pack's count once: the subject cards show real counts from
  // the bundles, and every pack is warmed into the offline cache. New
  // packs appear automatically when added to PACK_SUBJECTS.
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      PACK_SUBJECTS.map((s) =>
        loadPack(s.slug).then(
          (loaded) => [s.slug, loaded.questions.length] as const,
          () => [s.slug, 0] as const,
        ),
      ),
    ).then((entries) => {
      if (!cancelled) setPackCounts(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, []);

  // Per-topic accuracy for the weak-topics mode: loaded once on mount,
  // refreshed after every finished run and when returning to setup.
  useEffect(() => {
    setTopicStats(loadTopicStats());
  }, []);

  // Weak topics, weakest first (only topics with enough answered
  // questions qualify). The set itself uses the weakest few.
  const rankedWeakTopics = useMemo(() => rankWeakTopics(topicStats), [topicStats]);
  const weakSetTopics = useMemo(
    () => rankedWeakTopics.slice(0, WEAK_TOPICS_PER_SET),
    [rankedWeakTopics],
  );

  // Count the weak-topic pool while the weak setup is showing, so the
  // setup states the real pool size honestly. Packs are memoized, so
  // this only fetches what is not already loaded.
  useEffect(() => {
    if (prepMode !== 'weak' || weakSetTopics.length === 0) {
      setWeakPoolSize(null);
      return;
    }
    let cancelled = false;
    const wanted = new Set(weakSetTopics.map((t) => `${t.subject}::${t.topic}`));
    const slugs = [...new Set(weakSetTopics.map((t) => t.subject))];
    void Promise.all(slugs.map((slug) => loadPack(slug).catch(() => null))).then((packs) => {
      if (cancelled) return;
      let count = 0;
      packs.forEach((loaded, i) => {
        if (!loaded) return;
        count += loaded.questions.filter((q) => wanted.has(`${slugs[i]}::${q.topic}`)).length;
      });
      setWeakPoolSize(count);
    });
    return () => { cancelled = true; };
  }, [prepMode, weakSetTopics]);

  const available = pack
    ? year === 'RANDOM'
      ? pack.questions.length
      : pack.questions.filter((q) => q.year === year).length
    : 0;
  const effectiveSize = Math.min(size, available);

  // Progress dashboard stats — computed ONLY from the local history on
  // this device. Empty history shows 0% / 0 XP honestly, never an error.
  const setsDone = history.length;
  const readiness = setsDone === 0
    ? 0
    : Math.round((history.reduce((sum, a) => sum + (a.total > 0 ? a.correct / a.total : 0), 0) / setsDone) * 100);
  const xp = history.reduce((sum, a) => sum + a.correct, 0);
  const pendingSync = history.filter((a) => !a.synced).length;

  const resetScores = () => {
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Storage unavailable: the in-memory list is still cleared below.
    }
    // Topic stats are scores too: clearing scores clears them as well,
    // so weak topics rebuild honestly from fresh attempts.
    clearTopicStats();
    setTopicStats([]);
    setHistory([]);
    setConfirmReset(false);
  };

  const startRun = useCallback(async () => {
    setPackError('');
    let activePack: Pack;
    try {
      // Memoized: returns the preloaded pack when available, fetches otherwise.
      activePack = await loadPack(subject);
      setPack(activePack);
    } catch {
      setPackError('Could not load the question pack. Check your connection and try again.');
      return;
    }
    const { questions: runQuestions } = buildRun(activePack, year, size);
    if (runQuestions.length === 0) {
      setPackError('No questions found for that subject and year.');
      return;
    }
    finishedRef.current = false;
    setQuestions(runQuestions);
    setAnswers(new Array(runQuestions.length).fill(null));
    setLocked(new Array(runQuestions.length).fill(false));
    setIndex(0);
    setConfirmSubmit(false);
    setResult(null);
    setSectionScores(null);
    setSections([]);
    setSyncNote('');
    setSecondsLeft(runQuestions.length * SECONDS_PER_QUESTION);
    setRunMeta({
      subjectLabel: PACK_SUBJECTS.find((s) => s.slug === subject)?.label ?? subject,
      subjectSlug: subject,
      year,
      mode,
      kind: 'single',
    });
    setPhase('running');
    setOfflineReady(await packsSavedForOffline());
  }, [subject, year, size, mode]);

  // Shared run reset: every start function funnels through the same
  // state shape so the quiz screen and review never see a half-set run.
  const beginRun = useCallback(async (
    runQuestions: RunQuestion[],
    runSections: SittingSection[],
    meta: { subjectLabel: string; subjectSlug?: PackSubject; year: string; mode: Mode; kind: RunKind },
    totalSeconds: number,
  ) => {
    finishedRef.current = false;
    setQuestions(runQuestions);
    setAnswers(new Array(runQuestions.length).fill(null));
    setLocked(new Array(runQuestions.length).fill(false));
    setIndex(0);
    setConfirmSubmit(false);
    setResult(null);
    setSectionScores(null);
    setSections(runSections);
    setSyncNote('');
    setSecondsLeft(totalSeconds);
    setRunMeta(meta);
    setPhase('running');
    setOfflineReady(await packsSavedForOffline());
  }, []);

  const startSitting = useCallback(async () => {
    setPackError('');
    if (sittingPicks.length !== SITTING_PICK_COUNT) {
      setPackError(`Pick exactly ${SITTING_PICK_COUNT} subjects to go with English.`);
      return;
    }
    let englishPack: Pack;
    let pickedPacks: Pack[];
    try {
      [englishPack, ...pickedPacks] = await Promise.all([
        loadPack('english'),
        ...sittingPicks.map((slug) => loadPack(slug)),
      ]);
    } catch {
      setPackError('Could not load the question packs. Check your connection and try again.');
      return;
    }
    const picks = sittingPicks.map((slug, i) => ({
      slug,
      label: PACK_SUBJECTS.find((s) => s.slug === slug)?.label ?? slug,
      pack: pickedPacks[i],
    }));
    const { questions: runQuestions, sections: runSections } = buildSitting(englishPack, picks);
    if (runQuestions.length === 0) {
      setPackError('No questions found for that sitting.');
      return;
    }
    await beginRun(
      runQuestions,
      runSections,
      { subjectLabel: 'JAMB standard', year: 'RANDOM', mode: 'practice', kind: 'sitting' },
      SITTING_SECONDS,
    );
  }, [sittingPicks, beginRun]);

  const startWeak = useCallback(async () => {
    setPackError('');
    const topics = weakSetTopics;
    if (topics.length === 0) {
      setPackError('No weak topics yet — finish a few sets first and they will appear here.');
      return;
    }
    const slugs = [...new Set(topics.map((t) => t.subject))];
    let loaded: (Pack | null)[];
    try {
      loaded = await Promise.all(slugs.map((slug) => loadPack(slug)));
    } catch {
      setPackError('Could not load the question packs. Check your connection and try again.');
      return;
    }
    const packs = slugs.map((slug, i) => ({
      slug,
      label: PACK_SUBJECTS.find((s) => s.slug === slug)?.label ?? slug,
      pack: loaded[i] as Pack,
    }));
    const { questions: runQuestions } = buildWeakSet(packs, topics, size);
    if (runQuestions.length === 0) {
      setPackError('No questions found for those topics.');
      return;
    }
    await beginRun(
      runQuestions,
      [],
      { subjectLabel: 'Weak topics', year: 'RANDOM', mode, kind: 'weak' },
      runQuestions.length * SECONDS_PER_QUESTION,
    );
  }, [weakSetTopics, size, mode, beginRun]);

  const finishRun = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const correct = questions.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0);
    const total = questions.length;
    // Sittings score each subject /100 and total the four, exactly like
    // the real UTME. Single-subject and weak-topic sets scale the set
    // score to /400, as before.
    let jambScore: number;
    let scores: SectionScore[] | null = null;
    if (runMeta.kind === 'sitting' && sections.length > 0) {
      scores = sections.map((sec) => {
        let sectionCorrect = 0;
        for (let k = 0; k < sec.count; k++) {
          if (answers[sec.start + k] === questions[sec.start + k].answer) sectionCorrect++;
        }
        return {
          label: sec.label,
          correct: sectionCorrect,
          total: sec.count,
          score100: sec.count > 0 ? Math.round((sectionCorrect / sec.count) * 100) : 0,
        };
      });
      jambScore = scores.reduce((sum, s) => sum + s.score100, 0);
    } else {
      jambScore = total > 0 ? Math.round((correct / total) * 400) : 0;
    }
    setSectionScores(scores);
    setResult({ correct, total, jambScore });
    setPhase('review');
    // Feed the weak-topics store: only questions the student actually
    // picked an answer for count toward a topic's accuracy. Unanswered
    // questions never feed the stats.
    const perTopic = new Map<string, TopicStat>();
    questions.forEach((q, i) => {
      const picked = answers[i];
      if (picked === null) return;
      const slug = q.subjectSlug ?? runMeta.subjectSlug;
      if (!slug) return;
      const key = `${slug}::${q.topic}`;
      const stat = perTopic.get(key) ?? { subject: slug, topic: q.topic, answered: 0, correct: 0 };
      stat.answered += 1;
      if (picked === q.answer) stat.correct += 1;
      perTopic.set(key, stat);
    });
    if (perTopic.size > 0) {
      recordTopicStats([...perTopic.values()]);
      setTopicStats(loadTopicStats());
    }
    try {
      await recordAttempt({
        subject: runMeta.subjectLabel,
        year: runMeta.year,
        size: total,
        mode: runMeta.mode,
        correct,
        total,
        jambScore,
      });
      const flushed = await flushQueue();
      setHistory(loadHistory());
      if (signedIn) {
        setSyncNote(flushed === 'synced' ? 'Synced to your My Results.' : 'Saved on this device — will sync to My Results when you are online.');
      } else {
        setSyncNote('Kept on this device only — sign in to the portal to sync scores to My Results.');
      }
    } catch {
      setSyncNote('Saved on this device.');
      setHistory(loadHistory());
    }
  }, [questions, answers, runMeta, signedIn, sections]);

  // "Practise again" rebuilds the same kind of run: sittings reuse the
  // picked subjects, weak sets recompute from the latest topic stats.
  const restartRun = useCallback(() => {
    if (runMeta.kind === 'sitting') {
      void startSitting();
    } else if (runMeta.kind === 'weak') {
      void startWeak();
    } else {
      void startRun();
    }
  }, [runMeta.kind, startSitting, startWeak, startRun]);

  // Practice-mode countdown. Study mode has no timer. Sittings always
  // run timed (their runMeta.mode is 'practice'), whatever the setup
  // toggle said last — the run's own mode decides, never the toggle.
  useEffect(() => {
    if (phase !== 'running' || runMeta.mode !== 'practice') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, runMeta.mode]);

  useEffect(() => {
    if (phase === 'running' && runMeta.mode === 'practice' && secondsLeft === 0 && questions.length > 0) {
      void finishRun();
    }
  }, [secondsLeft, phase, runMeta.mode, questions.length, finishRun]);

  // Keep the current question fully below the sticky bars. On starting a
  // set and on every question change, scroll the question block into view;
  // its scroll-margin-top (PRACTICE_STYLES) clears the sticky site header
  // plus the sticky run header. Without this, browser scroll anchoring on
  // the phase change could leave the stem half-hidden under the sticky bar.
  useEffect(() => {
    if (phase !== 'running') return;
    questionRef.current?.scrollIntoView({ block: 'start' });
  }, [phase, index]);

  // Same for the review score hero: the run header is unmounted in review,
  // so only the site header needs clearing (see .sd-jp-score).
  useEffect(() => {
    if (phase !== 'review') return;
    scoreRef.current?.scrollIntoView({ block: 'start' });
  }, [phase]);

  const pickAnswer = useCallback((optionIndex: number) => {
    if (phase !== 'running') return;
    if (runMeta.mode === 'study' && locked[index]) return; // Study answers lock once picked.
    setAnswers((prev) => {
      const next = prev.slice();
      next[index] = optionIndex;
      return next;
    });
    if (runMeta.mode === 'study') {
      setLocked((prev) => {
        const next = prev.slice();
        next[index] = true;
        return next;
      });
    }
    setConfirmSubmit(false);
  }, [phase, runMeta.mode, index, locked]);

  // Keyboard shortcuts (desktop CBT feel): A–D / 1–4 answer, arrows move.
  useEffect(() => {
    if (phase !== 'running') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const key = e.key.toLowerCase();
      const letterIndex = ['a', 'b', 'c', 'd'].indexOf(key);
      const digitIndex = ['1', '2', '3', '4'].indexOf(key);
      if (letterIndex >= 0 || digitIndex >= 0) {
        e.preventDefault();
        pickAnswer(letterIndex >= 0 ? letterIndex : digitIndex);
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        setIndex(index - 1);
        setConfirmSubmit(false);
      } else if (e.key === 'ArrowRight' && index < questions.length - 1) {
        e.preventDefault();
        setIndex(index + 1);
        setConfirmSubmit(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, index, questions.length, pickAnswer]);

  const unanswered = answers.filter((a) => a === null).length;
  const answeredCount = questions.length - unanswered;
  const progressPct = questions.length > 0 ? Math.round(((index + 1) / questions.length) * 100) : 0;

  const onSubmitClick = () => {
    if (unanswered > 0 && !confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }
    void finishRun();
  };

  const backToSetup = () => {
    setPhase('setup');
    setConfirmSubmit(false);
    setConfirmReset(false);
    setHistory(loadHistory());
    setTopicStats(loadTopicStats());
  };

  const current = questions[index];

  // Sitting section helpers: which section the current question sits in,
  // and jumping to a section's first unanswered question (else its start).
  const currentSectionIndex =
    runMeta.kind === 'sitting' && sections.length > 0
      ? sections.findIndex(
          (sec, i) => index >= sec.start && (i === sections.length - 1 || index < sections[i + 1].start),
        )
      : -1;
  const currentSection = currentSectionIndex >= 0 ? sections[currentSectionIndex] : null;

  const jumpToSection = (sectionIndex: number) => {
    const sec = sections[sectionIndex];
    if (!sec) return;
    let target = sec.start;
    for (let k = 0; k < sec.count; k++) {
      if (answers[sec.start + k] === null) {
        target = sec.start + k;
        break;
      }
    }
    setIndex(target);
    setConfirmSubmit(false);
  };

  const sectionAnswered = (sec: SittingSection) =>
    answers.slice(sec.start, sec.start + sec.count).filter((a) => a !== null).length;

  // Sitting subject picking: toggle, capped at exactly 3. Tapping a
  // fourth subject does nothing — the counter says to remove one first.
  const toggleSittingPick = (slug: PackSubject) => {
    setPackError('');
    setSittingPicks((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= SITTING_PICK_COUNT) return prev;
      return [...prev, slug];
    });
  };

  // One review entry, shared by the flat list (single-subject and
  // weak-topic runs) and the section-grouped list (sittings).
  // Multi-subject runs show the subject chip so each question's subject
  // is always visible.
  const reviewArticle = (q: RunQuestion, i: number) => {
    const mine = answers[i];
    return (
      <article key={q.id} className="sd-jp-review-q">
        <p className="sd-jp-q-meta">
          <span className="sd-jp-chip">Question {i + 1}</span>
          {q.subjectLabel && <span className="sd-jp-chip">{q.subjectLabel}</span>}
          <span className="sd-jp-chip">{q.topic}</span>
          <span className="sd-jp-chip">{q.year}</span>
        </p>
        <p className="sd-jp-stem">{q.text}</p>
        <ul className="sd-jp-review-options">
          {q.options.map((option, oi) => {
            let className = 'sd-jp-review-option';
            if (oi === q.answer) className += ' sd-jp-option-correct';
            else if (oi === mine) className += ' sd-jp-option-wrong';
            return (
              <li key={oi} className={className}>
                <span className="sd-jp-option-letter">{OPTION_LETTERS[oi]}</span>
                <span>{option}</span>
                {oi === q.answer && <span className="sd-jp-badge">Correct answer</span>}
                {oi === mine && oi !== q.answer && <span className="sd-jp-badge">Your answer</span>}
              </li>
            );
          })}
        </ul>
        {mine === null && <p className="sd-jp-note">You did not answer this question.</p>}
        <p className="sd-jp-expl"><strong>Explanation:</strong> {q.explanation}</p>
      </article>
    );
  };

  return (
    <div className="sd-jp-card">
      {/* Connection + offline status: always honest about what works. */}
      <p className="sd-jp-status" role="status">
        <span className={online ? 'sd-jp-dot' : 'sd-jp-dot sd-jp-dot-off'} aria-hidden="true" />
        {online ? 'Online' : 'Offline — practice still works.'}
        {offlineReady && <span className="sd-jp-offline-ready"> Packs saved on this device for offline use.</span>}
        {!offlineReady && online && <span> Packs save to this device automatically on first use.</span>}
      </p>

      {signedIn === null ? (
        <p className="sd-jp-note">Checking sign-in…</p>
      ) : signedIn ? (
        <p className="sd-jp-note">Signed in — completed scores sync to your My Results when you are online.</p>
      ) : (
        <p className="sd-jp-note">Practising as a guest — scores stay on this device only. Sign in to the portal to sync them to My Results.</p>
      )}

      {phase === 'setup' && (
        <>
          {/* Progress dashboard: Readiness + XP from local history only. */}
          <section className="sd-jp-dash" aria-label="Your progress on this device">
            <div className="sd-jp-dash-head">
              <h3 className="sd-jp-dash-title">Your progress</h3>
              <span className="sd-jp-dash-sub">On this device only</span>
            </div>
            <div className="sd-jp-dash-grid">
              <div className="sd-jp-stat">
                <span className="sd-jp-stat-num">{readiness}%</span>
                <span className="sd-jp-stat-label">Readiness</span>
                <span className="sd-jp-stat-sub">{setsDone === 0 ? 'Average score across your sets' : `Average across ${setsDone} set${setsDone === 1 ? '' : 's'}`}</span>
              </div>
              <div className="sd-jp-stat">
                <span className="sd-jp-stat-num">{xp}</span>
                <span className="sd-jp-stat-label">XP</span>
                <span className="sd-jp-stat-sub">Total correct answers</span>
              </div>
              <div className="sd-jp-stat">
                <span className="sd-jp-stat-num">{setsDone}</span>
                <span className="sd-jp-stat-label">Sets done</span>
                <span className="sd-jp-stat-sub">Practice + Study</span>
              </div>
            </div>
            {setsDone === 0 && (
              <p className="sd-jp-dash-empty">No practice yet on this device — your first set starts your progress.</p>
            )}
            {setsDone > 0 && !confirmReset && (
              <button type="button" className="sd-jp-reset" onClick={() => setConfirmReset(true)}>
                Reset scores
              </button>
            )}
            {setsDone > 0 && confirmReset && (
              <div className="sd-jp-reset-confirm">
                <p>
                  Clear all scores on this device? Scores already synced to My Results stay there.
                  {signedIn && pendingSync > 0 && ` ${pendingSync} score${pendingSync === 1 ? '' : 's'} waiting to sync will also be cleared.`}
                </p>
                <div className="sd-jp-reset-actions">
                  <button type="button" className="sd-jp-reset-yes" onClick={resetScores}>Clear scores</button>
                  <button type="button" className="sd-jp-reset-no" onClick={() => setConfirmReset(false)}>Keep them</button>
                </div>
              </div>
            )}
          </section>

          {/* Real features only — short chips, no long copy. */}
          <ul className="sd-jp-features" aria-label="What you get">
            <li>✓ Answers + explanations</li>
            <li>✓ Timed practice</li>
            <li>✓ Progress on this device</li>
            <li>✓ Works offline</li>
            <li>✓ No sign-up</li>
          </ul>

          {prepMode === null && (
            <fieldset className="sd-jp-field">
              <legend className="sd-jp-field-label">Choose your preparation mode</legend>
              <div className="sd-jp-prep-grid" role="group" aria-label="Preparation mode">
                <button
                  type="button"
                  className="sd-jp-mode-card"
                  onClick={() => setPrepMode('single')}
                >
                  <span className="sd-jp-mode-icon"><BookIcon /></span>
                  <span className="sd-jp-mode-name">Single subject</span>
                  <span className="sd-jp-mode-desc">One subject, your choice of year and set size. Timed Practice or untimed Study.</span>
                  <span className="sd-jp-mode-tag">8 subjects · 60 questions each</span>
                </button>
                <button
                  type="button"
                  className="sd-jp-mode-card"
                  onClick={() => setPrepMode('sitting')}
                >
                  <span className="sd-jp-mode-icon"><CapIcon /></span>
                  <span className="sd-jp-mode-name">JAMB standard</span>
                  <span className="sd-jp-mode-desc">The real UTME sitting: English plus any 3 subjects, 180 questions, 2 hours, scored /400.</span>
                  <span className="sd-jp-mode-tag">180 questions · 120 minutes</span>
                </button>
                <button
                  type="button"
                  className="sd-jp-mode-card"
                  onClick={() => setPrepMode('weak')}
                >
                  <span className="sd-jp-mode-icon"><TargetIcon /></span>
                  <span className="sd-jp-mode-name">Weak topics</span>
                  <span className="sd-jp-mode-desc">Your lowest-accuracy topics, from your own past sets on this device. No guesses, no predictions.</span>
                  <span className="sd-jp-mode-tag">Built from your history</span>
                </button>
              </div>
            </fieldset>
          )}

          {prepMode !== null && (
            <button type="button" className="sd-jp-back" onClick={() => { setPrepMode(null); setPackError(''); }}>
              ← Choose a different preparation mode
            </button>
          )}

          {prepMode === 'single' && (
            <>
              <PracticeStudyCards mode={mode} onChange={setMode} />

          <fieldset className="sd-jp-field">
            <legend className="sd-jp-field-label">Subject</legend>
            <div className="sd-jp-subjects" role="group" aria-label="Subject">
              {PACK_SUBJECTS.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  className={subject === s.slug ? 'sd-jp-subject-card sd-jp-subject-card-active' : 'sd-jp-subject-card'}
                  aria-pressed={subject === s.slug}
                  onClick={() => setSubject(s.slug)}
                >
                  <span className="sd-jp-subject-mono">{s.label.charAt(0)}</span>
                  <span className="sd-jp-subject-text">
                    <span className="sd-jp-subject-name">{s.label}</span>
                    <span className="sd-jp-subject-meta">{packCounts[s.slug] ? `${packCounts[s.slug]} questions · ` : ''}{PACK_YEARS[0]}–{PACK_YEARS[PACK_YEARS.length - 1]}</span>
                  </span>
                  <span className="sd-jp-subject-check" aria-hidden="true">✓</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="sd-jp-field">
            <legend className="sd-jp-field-label">Year</legend>
            <div className="sd-jp-choice-row" role="group" aria-label="Year">
              <button
                type="button"
                className={year === 'RANDOM' ? 'sd-jp-choice sd-jp-choice-active' : 'sd-jp-choice'}
                aria-pressed={year === 'RANDOM'}
                onClick={() => setYear('RANDOM')}
              >
                All years
              </button>
              {PACK_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={year === y ? 'sd-jp-choice sd-jp-choice-active' : 'sd-jp-choice'}
                  aria-pressed={year === y}
                  onClick={() => setYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="sd-jp-field">
            <legend className="sd-jp-field-label">Set size</legend>
            <div className="sd-jp-choice-row" role="group" aria-label="Set size">
              {[10, 20, 40].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={size === n ? 'sd-jp-choice sd-jp-choice-active' : 'sd-jp-choice'}
                  aria-pressed={size === n}
                  onClick={() => setSize(n)}
                >
                  {n} questions
                </button>
              ))}
            </div>
            {pack && available > 0 && effectiveSize < size && (
              <p className="sd-jp-note">Only {available} questions available for this choice — your set will have {available}.</p>
            )}
            {pack && available > 0 && (
              <p className="sd-jp-note">{available} questions available.</p>
            )}
          </fieldset>

          {packError && <p className="sd-jp-error" role="alert">{packError}</p>}

          <button type="button" className="sd-jp-btn sd-jp-btn-start" onClick={() => { void startRun(); }}>
            {mode === 'practice' ? 'Start practice set' : 'Start study set'}
          </button>
            </>
          )}

          {prepMode === 'sitting' && (
            <>
              <p className="sd-jp-note">The real UTME sitting: English is compulsory, plus any 3 subjects you pick. 180 questions in 2 hours — 60 English and 40 per other subject — drawn from all years 2020–2025, each subject scored /100, total /400.</p>

              <fieldset className="sd-jp-field">
                <legend className="sd-jp-field-label">Your 4 subjects</legend>
                <div className="sd-jp-subjects" role="group" aria-label="Sitting subjects">
                  <button
                    type="button"
                    className="sd-jp-subject-card sd-jp-subject-card-active"
                    disabled
                    aria-disabled="true"
                  >
                    <span className="sd-jp-subject-mono">E</span>
                    <span className="sd-jp-subject-text">
                      <span className="sd-jp-subject-name">English</span>
                      <span className="sd-jp-subject-meta">60 questions · Compulsory — always included</span>
                    </span>
                    <span className="sd-jp-subject-check" aria-hidden="true">✓</span>
                  </button>
                  {PACK_SUBJECTS.filter((s) => s.slug !== 'english').map((s) => {
                    const picked = sittingPicks.includes(s.slug);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        className={picked ? 'sd-jp-subject-card sd-jp-subject-card-active' : 'sd-jp-subject-card'}
                        aria-pressed={picked}
                        onClick={() => toggleSittingPick(s.slug)}
                      >
                        <span className="sd-jp-subject-mono">{s.label.charAt(0)}</span>
                        <span className="sd-jp-subject-text">
                          <span className="sd-jp-subject-name">{s.label}</span>
                          <span className="sd-jp-subject-meta">{packCounts[s.slug] ? `40 sampled from ${packCounts[s.slug]} questions · ` : ''}{PACK_YEARS[0]}–{PACK_YEARS[PACK_YEARS.length - 1]}</span>
                        </span>
                        <span className="sd-jp-subject-check" aria-hidden="true">✓</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <p className="sd-jp-note" role="status">
                {sittingPicks.length < SITTING_PICK_COUNT
                  ? `${sittingPicks.length} of ${SITTING_PICK_COUNT} picked — pick ${SITTING_PICK_COUNT - sittingPicks.length} more to start.`
                  : `${SITTING_PICK_COUNT} of ${SITTING_PICK_COUNT} picked. Tap a picked subject to remove it.`}
              </p>
              <p className="sd-jp-note">Timed only — 120 minutes for the whole sitting, like the real exam. Unanswered questions count as wrong when the timer ends.</p>

              {packError && <p className="sd-jp-error" role="alert">{packError}</p>}

              <button type="button" className="sd-jp-btn sd-jp-btn-start" disabled={sittingPicks.length !== SITTING_PICK_COUNT} onClick={() => { void startSitting(); }}>
                Start JAMB standard sitting
              </button>
            </>
          )}

          {prepMode === 'weak' && (
            <>
              <p className="sd-jp-note">Built only from your own past sets on this device: your lowest-accuracy topics, with at least {MIN_ANSWERS_PER_TOPIC} questions answered each. Nothing is predicted or guessed.</p>

              {rankedWeakTopics.length === 0 && (
                <div className="sd-jp-empty">
                  <p><strong>Not enough history yet.</strong></p>
                  <p>
                    Weak topics appear once you have answered at least {MIN_ANSWERS_PER_TOPIC} questions in a topic.
                    {topicStats.length > 0
                      ? ` So far you have answered ${topicStats.reduce((sum, s) => sum + s.answered, 0)} questions across ${topicStats.length} topic${topicStats.length === 1 ? '' : 's'} — finish a few more sets and your weakest topics will show here.`
                      : ' Finish your first set and your weakest topics will start building here.'}
                  </p>
                  <button type="button" className="sd-jp-btn" onClick={() => setPrepMode('single')}>
                    Start a single-subject set
                  </button>
                </div>
              )}

              {rankedWeakTopics.length > 0 && (
                <>
                  <fieldset className="sd-jp-field">
                    <legend className="sd-jp-field-label">Your weakest topics</legend>
                    <ul className="sd-jp-weak-list">
                      {rankedWeakTopics.slice(0, 8).map((t, i) => {
                        const label = PACK_SUBJECTS.find((s) => s.slug === t.subject)?.label ?? t.subject;
                        const inSet = i < WEAK_TOPICS_PER_SET;
                        return (
                          <li key={`${t.subject}::${t.topic}`} className="sd-jp-weak-item">
                            <span className="sd-jp-weak-topic">{t.topic} <span className="sd-jp-weak-subject">· {label}</span></span>
                            <span className="sd-jp-weak-stat">{t.correct}/{t.answered} correct ({Math.round(topicAccuracy(t) * 100)}%)</span>
                            {inSet && <span className="sd-jp-badge">In your next set</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {rankedWeakTopics.length > 8 && (
                      <p className="sd-jp-note">And {rankedWeakTopics.length - 8} more weak topic{rankedWeakTopics.length - 8 === 1 ? '' : 's'} — your next set targets the weakest {WEAK_TOPICS_PER_SET}.</p>
                    )}
                  </fieldset>

                  <PracticeStudyCards mode={mode} onChange={setMode} />

                  <fieldset className="sd-jp-field">
                    <legend className="sd-jp-field-label">Set size</legend>
                    <div className="sd-jp-choice-row" role="group" aria-label="Set size">
                      {[10, 20, 40].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={size === n ? 'sd-jp-choice sd-jp-choice-active' : 'sd-jp-choice'}
                          aria-pressed={size === n}
                          onClick={() => setSize(n)}
                        >
                          {n} questions
                        </button>
                      ))}
                    </div>
                    {weakPoolSize !== null && weakPoolSize > 0 && (
                      <p className="sd-jp-note">{weakPoolSize} questions available across your {weakSetTopics.length} weakest topic{weakSetTopics.length === 1 ? '' : 's'}{weakPoolSize < size ? ` — your set will have ${weakPoolSize}.` : '.'}</p>
                    )}
                  </fieldset>

                  {packError && <p className="sd-jp-error" role="alert">{packError}</p>}

                  <button type="button" className="sd-jp-btn sd-jp-btn-start" onClick={() => { void startWeak(); }}>
                    {mode === 'practice' ? 'Start weak-topics set' : 'Start weak-topics study set'}
                  </button>
                </>
              )}
            </>
          )}

          <PwaSetup />

          {history.length > 0 && (
            <div className="sd-jp-history">
              <h3>Recent practice on this device</h3>
              <ul>
                {history.slice(0, 5).map((a) => (
                  <li key={a.id} className="sd-jp-history-item">
                    <span>{a.subject} · {a.mode === 'practice' ? 'Practice' : 'Study'} · {a.correct}/{a.total} ({a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0}%)</span>
                    <span className="sd-jp-badge">{a.synced ? 'Synced' : signedIn ? 'Waiting to sync' : 'On this device'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {phase === 'running' && current && (
        <>
          <div className="sd-jp-run-head">
            <span className="sd-jp-run-title">Question {index + 1} of {questions.length} · {runMeta.kind === 'sitting' && currentSection ? currentSection.label : runMeta.subjectLabel}</span>
            <span className="sd-jp-run-tools">
              {runMeta.mode === 'practice' ? (
                <span className={secondsLeft <= (runMeta.kind === 'sitting' ? 300 : 60) ? 'sd-jp-timer sd-jp-timer-low' : 'sd-jp-timer'} aria-label="Time remaining">{formatTime(secondsLeft)}</span>
              ) : (
                <span className="sd-jp-timer">Study mode</span>
              )}
              <button type="button" className="sd-jp-btn sd-jp-btn-submit" onClick={onSubmitClick}>
                {confirmSubmit ? `Submit anyway (${unanswered} unanswered)?` : 'Submit set'}
              </button>
            </span>
          </div>
          {runMeta.kind === 'sitting' && sections.length > 0 && (
            <div className="sd-jp-section-tabs" role="group" aria-label="Sitting subjects">
              {sections.map((sec, i) => (
                <button
                  key={sec.slug}
                  type="button"
                  className={i === currentSectionIndex ? 'sd-jp-section-tab sd-jp-section-tab-active' : 'sd-jp-section-tab'}
                  aria-pressed={i === currentSectionIndex}
                  onClick={() => jumpToSection(i)}
                >
                  {sec.label} · {sectionAnswered(sec)}/{sec.count}
                </button>
              ))}
            </div>
          )}
          <div className="sd-jp-progress-row">
            <div className="sd-jp-progress-track" aria-hidden="true">
              <div className="sd-jp-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="sd-jp-progress-pct">{progressPct}%</span>
          </div>

          <div ref={questionRef} className="sd-jp-question">
          <p className="sd-jp-q-meta">
            {current.subjectLabel && <span className="sd-jp-chip">{current.subjectLabel}</span>}
            <span className="sd-jp-chip">{current.topic}</span>
            <span className="sd-jp-chip">{current.year}</span>
          </p>
          <p className="sd-jp-stem">{current.text}</p>

          <div className="sd-jp-options" role="group" aria-label="Answer options">
            {current.options.map((option, i) => {
              const picked = answers[index] === i;
              const showFeedback = runMeta.mode === 'study' && locked[index];
              let className = 'sd-jp-option';
              if (showFeedback && i === current.answer) className += ' sd-jp-option-correct';
              else if (showFeedback && picked && i !== current.answer) className += ' sd-jp-option-wrong';
              else if (picked) className += ' sd-jp-option-picked';
              return (
                <button
                  key={i}
                  type="button"
                  className={className}
                  aria-pressed={picked}
                  disabled={runMeta.mode === 'study' && locked[index]}
                  onClick={() => pickAnswer(i)}
                >
                  <span className="sd-jp-option-letter">{OPTION_LETTERS[i]}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {runMeta.mode === 'study' && locked[index] && (
            <div className={answers[index] === current.answer ? 'sd-jp-feedback sd-jp-feedback-good' : 'sd-jp-feedback sd-jp-feedback-bad'} role="status">
              <p><strong>{answers[index] === current.answer ? 'Correct.' : `Not quite — the answer is ${OPTION_LETTERS[current.answer]}.`}</strong></p>
              <p className="sd-jp-expl">{current.explanation}</p>
            </div>
          )}
          </div>

          <div className="sd-jp-nav">
            <button type="button" className="sd-jp-btn-secondary" disabled={index === 0} onClick={() => { setIndex(index - 1); setConfirmSubmit(false); }}>
              Previous
            </button>
            <span className="sd-jp-answered">Answered: {answeredCount} / {questions.length}</span>
            <button type="button" className="sd-jp-btn-secondary" disabled={index === questions.length - 1} onClick={() => { setIndex(index + 1); setConfirmSubmit(false); }}>
              Next
            </button>
          </div>

          {runMeta.kind === 'sitting' && currentSection && (
            <p className="sd-jp-grid-label">{currentSection.label} — questions {currentSection.start + 1}–{currentSection.start + currentSection.count} of {questions.length}. Use the subject tabs above to switch sections.</p>
          )}
          <div className="sd-jp-grid" role="group" aria-label="Jump to question">
            {questions.map((q, i) => {
              // Sittings show only the current section's numbers: 180
              // buttons at once would bury the page. Other runs show all.
              if (runMeta.kind === 'sitting' && currentSection && (i < currentSection.start || i >= currentSection.start + currentSection.count)) return null;
              let className = 'sd-jp-grid-btn';
              if (i === index) className += ' sd-jp-grid-current';
              else if (answers[i] !== null) className += ' sd-jp-grid-answered';
              return (
                <button key={q.id} type="button" className={className} aria-label={`Question ${i + 1}${answers[i] !== null ? ', answered' : ''}`} onClick={() => { setIndex(i); setConfirmSubmit(false); }}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <p className="sd-jp-kbd-hint">Tip: press A–D or 1–4 to answer, ← → to move between questions.</p>

          <div className="sd-jp-actions">
            <button type="button" className="sd-jp-btn-secondary" onClick={backToSetup}>
              Leave this set
            </button>
          </div>
          {unanswered > 0 && !confirmSubmit && (
            <p className="sd-jp-note">{unanswered} question{unanswered === 1 ? '' : 's'} unanswered — unanswered questions count as wrong.</p>
          )}
        </>
      )}

      {phase === 'review' && result && (
        <>
          <div ref={scoreRef} className="sd-jp-score">
            <p className="sd-jp-score-pct">{result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0}%</p>
            <p className="sd-jp-score-big">{result.correct} of {result.total} correct</p>
            {runMeta.kind === 'sitting' ? (
              <p className="sd-jp-score-meta">JAMB standard sitting · Timed · Total score {result.jambScore}/400</p>
            ) : (
              <p className="sd-jp-score-meta">{runMeta.subjectLabel} · {runMeta.mode === 'practice' ? 'Practice' : 'Study'} set · JAMB-scale score {result.jambScore}/400</p>
            )}
            {sectionScores && sectionScores.length > 0 && (
              <div className="sd-jp-score-grid">
                {sectionScores.map((s) => (
                  <div key={s.label} className="sd-jp-score-cell">
                    <span className="sd-jp-score-cell-num">{s.score100}<span className="sd-jp-score-cell-of">/100</span></span>
                    <span className="sd-jp-score-cell-label">{s.label}</span>
                    <span className="sd-jp-score-cell-sub">{s.correct} of {s.total} correct</span>
                  </div>
                ))}
              </div>
            )}
            {syncNote && <p className="sd-jp-score-note">{syncNote}</p>}
          </div>

          <div className="sd-jp-actions">
            <button type="button" className="sd-jp-btn" onClick={() => { restartRun(); }}>
              Practise again — same setup
            </button>
            <button type="button" className="sd-jp-btn-secondary" onClick={backToSetup}>
              Change setup
            </button>
          </div>

          {runMeta.kind === 'sitting' && sections.length > 0 ? (
            sections.map((sec, si) => {
              const score = sectionScores?.[si];
              return (
                <div key={sec.slug}>
                  <h3 className="sd-jp-review-section">
                    {sec.label}
                    {score && (
                      <span className="sd-jp-review-section-score"> {score.correct} of {score.total} correct · {score.score100}/100</span>
                    )}
                  </h3>
                  {questions.slice(sec.start, sec.start + sec.count).map((q, k) => reviewArticle(q, sec.start + k))}
                </div>
              );
            })
          ) : (
            questions.map((q, i) => reviewArticle(q, i))
          )}

          <div className="sd-jp-actions">
            <button type="button" className="sd-jp-btn" onClick={() => { restartRun(); }}>
              Practise again — same setup
            </button>
            <button type="button" className="sd-jp-btn-secondary" onClick={backToSetup}>
              Change setup
            </button>
          </div>
        </>
      )}
    </div>
  );
}
