'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PwaSetup from './PwaSetup';
import { PACK_SUBJECTS, PACK_YEARS, buildRun, loadPack, packsSavedForOffline, type Pack, type PackSubject, type RunQuestion } from './packs';
import { flushQueue, getSessionUserId, loadHistory, recordAttempt, type Attempt } from './sync';

const SECONDS_PER_QUESTION = 60; // Practice mode: 1 minute per question.
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// Local-history storage key. Must match HISTORY_KEY in sync.ts — that
// module owns the queue, and this page only clears the device copy when
// the student asks to reset scores.
const HISTORY_STORAGE_KEY = 'sd-jamb-history-v1';

type Phase = 'setup' | 'running' | 'review';
type Mode = 'practice' | 'study';

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

export default function JambPractice({ initialSubject }: { initialSubject?: PackSubject }) {
  // Environment state.
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

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
  const [runMeta, setRunMeta] = useState({ subjectLabel: '', year: '', mode: 'practice' as Mode });
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
    setSyncNote('');
    setSecondsLeft(runQuestions.length * SECONDS_PER_QUESTION);
    setRunMeta({
      subjectLabel: PACK_SUBJECTS.find((s) => s.slug === subject)?.label ?? subject,
      year,
      mode,
    });
    setPhase('running');
    setOfflineReady(await packsSavedForOffline());
  }, [subject, year, size, mode]);

  const finishRun = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const correct = questions.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0);
    const total = questions.length;
    const jambScore = total > 0 ? Math.round((correct / total) * 400) : 0;
    setResult({ correct, total, jambScore });
    setPhase('review');
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
  }, [questions, answers, runMeta, signedIn]);

  // Practice-mode countdown. Study mode has no timer.
  useEffect(() => {
    if (phase !== 'running' || mode !== 'practice') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, mode]);

  useEffect(() => {
    if (phase === 'running' && mode === 'practice' && secondsLeft === 0 && questions.length > 0) {
      void finishRun();
    }
  }, [secondsLeft, phase, mode, questions.length, finishRun]);

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
    if (mode === 'study' && locked[index]) return; // Study answers lock once picked.
    setAnswers((prev) => {
      const next = prev.slice();
      next[index] = optionIndex;
      return next;
    });
    if (mode === 'study') {
      setLocked((prev) => {
        const next = prev.slice();
        next[index] = true;
        return next;
      });
    }
    setConfirmSubmit(false);
  }, [phase, mode, index, locked]);

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
  };

  const current = questions[index];

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

          <fieldset className="sd-jp-field">
            <legend className="sd-jp-field-label">How do you want to practise?</legend>
            <div className="sd-jp-modes" role="group" aria-label="Mode">
              <button
                type="button"
                className={mode === 'practice' ? 'sd-jp-mode-card sd-jp-mode-card-active' : 'sd-jp-mode-card'}
                aria-pressed={mode === 'practice'}
                onClick={() => setMode('practice')}
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
                onClick={() => setMode('study')}
              >
                <span className="sd-jp-mode-icon"><BookIcon /></span>
                <span className="sd-jp-mode-name">Study</span>
                <span className="sd-jp-mode-desc">No timer. Your answer locks when picked, and the explanation shows straight away.</span>
                <span className="sd-jp-mode-tag">Untimed · Answers as you go</span>
              </button>
            </div>
          </fieldset>

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
            <span className="sd-jp-run-title">Question {index + 1} of {questions.length} · {runMeta.subjectLabel}</span>
            <span className="sd-jp-run-tools">
              {mode === 'practice' ? (
                <span className={secondsLeft <= 60 ? 'sd-jp-timer sd-jp-timer-low' : 'sd-jp-timer'} aria-label="Time remaining">{formatTime(secondsLeft)}</span>
              ) : (
                <span className="sd-jp-timer">Study mode</span>
              )}
              <button type="button" className="sd-jp-btn sd-jp-btn-submit" onClick={onSubmitClick}>
                {confirmSubmit ? `Submit anyway (${unanswered} unanswered)?` : 'Submit set'}
              </button>
            </span>
          </div>
          <div className="sd-jp-progress-row">
            <div className="sd-jp-progress-track" aria-hidden="true">
              <div className="sd-jp-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="sd-jp-progress-pct">{progressPct}%</span>
          </div>

          <div ref={questionRef} className="sd-jp-question">
          <p className="sd-jp-q-meta">
            <span className="sd-jp-chip">{current.topic}</span>
            <span className="sd-jp-chip">{current.year}</span>
          </p>
          <p className="sd-jp-stem">{current.text}</p>

          <div className="sd-jp-options" role="group" aria-label="Answer options">
            {current.options.map((option, i) => {
              const picked = answers[index] === i;
              const showFeedback = mode === 'study' && locked[index];
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
                  disabled={mode === 'study' && locked[index]}
                  onClick={() => pickAnswer(i)}
                >
                  <span className="sd-jp-option-letter">{OPTION_LETTERS[i]}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {mode === 'study' && locked[index] && (
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

          <div className="sd-jp-grid" role="group" aria-label="Jump to question">
            {questions.map((q, i) => {
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
            <p className="sd-jp-score-meta">{runMeta.subjectLabel} · {runMeta.mode === 'practice' ? 'Practice' : 'Study'} set · JAMB-scale score {result.jambScore}/400</p>
            {syncNote && <p className="sd-jp-score-note">{syncNote}</p>}
          </div>

          <div className="sd-jp-actions">
            <button type="button" className="sd-jp-btn" onClick={() => { void startRun(); }}>
              Practise again — same setup
            </button>
            <button type="button" className="sd-jp-btn-secondary" onClick={backToSetup}>
              Change setup
            </button>
          </div>

          {questions.map((q, i) => {
            const mine = answers[i];
            return (
              <article key={q.id} className="sd-jp-review-q">
                <p className="sd-jp-q-meta">
                  <span className="sd-jp-chip">Question {i + 1}</span>
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
          })}

          <div className="sd-jp-actions">
            <button type="button" className="sd-jp-btn" onClick={() => { void startRun(); }}>
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
