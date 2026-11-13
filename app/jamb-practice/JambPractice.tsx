'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PwaSetup from './PwaSetup';
import { PACK_SUBJECTS, PACK_YEARS, buildRun, loadPack, packsSavedForOffline, type Pack, type PackSubject, type RunQuestion } from './packs';
import { flushQueue, getSessionUserId, loadHistory, recordAttempt, type Attempt } from './sync';

const SECONDS_PER_QUESTION = 60; // Practice mode: 1 minute per question.
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

type Phase = 'setup' | 'running' | 'review';
type Mode = 'practice' | 'study';

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function JambPractice() {
  // Environment state.
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);

  // Setup state.
  const [subject, setSubject] = useState<PackSubject>('english');
  const [year, setYear] = useState('RANDOM');
  const [size, setSize] = useState(10);
  const [mode, setMode] = useState<Mode>('practice');
  const [pack, setPack] = useState<Pack | null>(null);
  const [packError, setPackError] = useState('');

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

  const available = pack
    ? year === 'RANDOM'
      ? pack.questions.length
      : pack.questions.filter((q) => q.year === year).length
    : 0;
  const effectiveSize = Math.min(size, available);

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

  const pickAnswer = (optionIndex: number) => {
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
  };

  const unanswered = answers.filter((a) => a === null).length;

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
          <fieldset className="sd-jp-field">
            <legend className="sd-jp-field-label">Subject</legend>
            <div className="sd-jp-choice-row" role="group" aria-label="Subject">
              {PACK_SUBJECTS.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  className={subject === s.slug ? 'sd-jp-choice sd-jp-choice-active' : 'sd-jp-choice'}
                  aria-pressed={subject === s.slug}
                  onClick={() => setSubject(s.slug)}
                >
                  {s.label}
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

          <fieldset className="sd-jp-field">
            <legend className="sd-jp-field-label">Mode</legend>
            <div className="sd-jp-choice-row" role="group" aria-label="Mode">
              <button
                type="button"
                className={mode === 'practice' ? 'sd-jp-choice sd-jp-choice-active' : 'sd-jp-choice'}
                aria-pressed={mode === 'practice'}
                onClick={() => setMode('practice')}
              >
                Practice — timed, answers at the end
              </button>
              <button
                type="button"
                className={mode === 'study' ? 'sd-jp-choice sd-jp-choice-active' : 'sd-jp-choice'}
                aria-pressed={mode === 'study'}
                onClick={() => setMode('study')}
              >
                Study — untimed, answers as you go
              </button>
            </div>
            {mode === 'study' && (
              <p className="sd-jp-note">In Study mode your answer locks once you pick it, and the correct answer and explanation show straight away.</p>
            )}
          </fieldset>

          {packError && <p className="sd-jp-error" role="alert">{packError}</p>}

          <button type="button" className="sd-jp-btn" onClick={() => { void startRun(); }}>
            Start practice
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
            <span>Question {index + 1} of {questions.length} · {runMeta.subjectLabel}</span>
            {mode === 'practice' ? (
              <span className={secondsLeft <= 60 ? 'sd-jp-timer sd-jp-timer-low' : 'sd-jp-timer'} aria-label="Time remaining">{formatTime(secondsLeft)}</span>
            ) : (
              <span className="sd-jp-timer">Study mode</span>
            )}
          </div>
          <div className="sd-jp-progress-track" aria-hidden="true">
            <div className="sd-jp-progress-fill" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>

          <p className="sd-jp-q-meta">{current.topic} · {current.year}</p>
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

          <div className="sd-jp-nav">
            <button type="button" className="sd-jp-btn-secondary" disabled={index === 0} onClick={() => { setIndex(index - 1); setConfirmSubmit(false); }}>
              Previous
            </button>
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
            <button type="button" className="sd-jp-btn-secondary" disabled={index === questions.length - 1} onClick={() => { setIndex(index + 1); setConfirmSubmit(false); }}>
              Next
            </button>
          </div>

          <div className="sd-jp-actions">
            <button type="button" className="sd-jp-btn" onClick={onSubmitClick}>
              {confirmSubmit ? `Submit anyway (${unanswered} unanswered)?` : 'Submit set'}
            </button>
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
          <div className="sd-jp-score">
            <p className="sd-jp-score-big">{result.correct} of {result.total} correct — {result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0}%</p>
            <p>{runMeta.subjectLabel} · {runMeta.mode === 'practice' ? 'Practice' : 'Study'} set · JAMB-scale score {result.jambScore}/400</p>
            {syncNote && <p className="sd-jp-note">{syncNote}</p>}
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
                <p className="sd-jp-q-meta">Question {i + 1} · {q.topic} · {q.year}</p>
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
