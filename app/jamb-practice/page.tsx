import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { SiteStyles } from "../components/SiteStyles";
import { DoodleBooks, DoodleCloud, DoodleFlask, DoodleLeaf, DoodlePencilFlat, DoodlePlane, DoodleSparkle } from "../components/Doodles";
import JambPractice from "./JambPractice";
import { PACK_SUBJECTS } from "./packs";

export const metadata: Metadata = {
  title: "Free JAMB Practice — UTME CBT Questions With Answers | SpringDrill",
  description:
    "Practise JAMB UTME questions free — English, Mathematics and Biology, with answers and explanations. No sign-up, works offline, and installs on your phone or Windows computer.",
  keywords: [
    "JAMB practice",
    "UTME practice questions",
    "JAMB CBT practice",
    "JAMB questions and answers",
    "free JAMB practice",
    "JAMB practice offline",
    "UTME English practice",
    "UTME Mathematics practice",
    "UTME Biology practice",
    "SpringDrill",
  ],
  alternates: { canonical: "/jamb-practice" },
  openGraph: {
    title: "Free JAMB Practice — SpringDrill",
    description:
      "Free UTME practice sets with answers and explanations. No sign-up, works offline, installs on your device.",
    url: "/jamb-practice",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "SpringDrill — free JAMB practice" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free JAMB Practice — SpringDrill",
    description:
      "Free UTME practice sets with answers and explanations. No sign-up, works offline.",
    images: ["/og-image.jpg"],
  },
};

// Public JAMB practice: free quick sets, no sign-in, no paywall. Questions
// come from static JSON packs (public/jamb-packs/) cached by the service
// worker, so a set works fully offline once the page has loaded once.
// Signed-in students get their scores synced to My Results; guests keep
// history on their own device only. Follows the tool-page layout: shared
// header/menu + footer, Template 1 cartoon scene, ChunkFive headings and
// Spring Drill green. The scene shows at every width (mobile parity).
const PRACTICE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SpringDrill JAMB Practice",
  url: "https://springdrill-portal.vercel.app/jamb-practice",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any (web browser)",
  description:
    "Free JAMB UTME practice sets for English, Mathematics and Biology, with answers and explanations. No sign-up; works offline once loaded.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
  isAccessibleForFree: true,
};

const PRACTICE_STYLES = `
  .sd-jp-intro { font-size: 1.05rem; line-height: 1.7; color: #5a6b63; max-width: 720px; margin: 0 0 28px 0; }
  .sd-jp-card { background: #ffffff; border: 1px solid #dce6df; border-radius: 16px; padding: 28px; box-shadow: 0 10px 32px rgba(18, 50, 39, 0.10); }
  .sd-jp-status { font-size: 0.9rem; color: #5a6b63; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sd-jp-dot { width: 10px; height: 10px; border-radius: 50%; background: #007a4d; flex: none; }
  .sd-jp-dot-off { background: #d9930d; }
  .sd-jp-offline-ready { color: #004d34; font-weight: 600; }
  .sd-jp-note { font-size: 0.9rem; line-height: 1.6; color: #5a6b63; margin: 8px 0; }
  .sd-jp-error { font-size: 0.95rem; line-height: 1.6; color: #7a1f1f; background: #fdf2f2; border: 1px solid #f0b6b6; border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
  .sd-jp-card button:focus-visible { outline: 3px solid #fec60d; outline-offset: 2px; }

  /* Progress dashboard: honest stats from local history only. */
  .sd-jp-dash { background: #123227; border-radius: 14px; padding: 22px 22px 18px; margin: 18px 0 24px 0; color: #ffffff; }
  .sd-jp-dash-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .sd-jp-dash-title { font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); font-size: 1.3rem; font-weight: 400; margin: 0; color: #ffffff; }
  .sd-jp-dash-sub { font-size: 0.85rem; color: #b9d8c9; }
  .sd-jp-dash-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .sd-jp-stat { background: #ffffff; border-radius: 12px; padding: 16px; color: #123227; }
  .sd-jp-stat-num { display: block; font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); font-size: 1.9rem; line-height: 1.1; color: #007a4d; }
  .sd-jp-stat-label { display: block; font-weight: 800; font-size: 0.95rem; margin-top: 4px; }
  .sd-jp-stat-sub { display: block; font-size: 0.8rem; color: #5a6b63; margin-top: 2px; line-height: 1.4; }
  .sd-jp-dash-empty { font-size: 0.9rem; color: #d7ece1; margin: 14px 0 0 0; line-height: 1.6; }
  .sd-jp-reset { margin-top: 16px; background: transparent; border: 1px solid #5b8570; color: #d7ece1; border-radius: 999px; min-height: 40px; padding: 8px 18px; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: border-color 0.15s ease, color 0.15s ease; }
  .sd-jp-reset:hover { border-color: #d7ece1; color: #ffffff; }
  .sd-jp-reset-confirm { margin-top: 16px; background: rgba(255, 255, 255, 0.08); border: 1px solid #5b8570; border-radius: 12px; padding: 14px 16px; }
  .sd-jp-reset-confirm p { margin: 0 0 12px 0; font-size: 0.9rem; line-height: 1.6; color: #ffffff; }
  .sd-jp-reset-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .sd-jp-reset-yes { background: #b3372f; color: #ffffff; border: none; border-radius: 999px; min-height: 42px; padding: 8px 18px; font-weight: 700; cursor: pointer; }
  .sd-jp-reset-no { background: transparent; border: 1px solid #b9d8c9; color: #ffffff; border-radius: 999px; min-height: 42px; padding: 8px 18px; font-weight: 700; cursor: pointer; }

  /* Feature chips: real features only, one line each. */
  .sd-jp-features { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px 0; padding: 0; }
  .sd-jp-features li { font-size: 0.85rem; font-weight: 700; color: #004d34; background: #eef6f1; border-radius: 999px; padding: 7px 13px; }

  /* Mode cards. */
  .sd-jp-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 0 0 24px 0; }
  .sd-jp-mode-card { text-align: left; background: #ffffff; border: 2px solid #dce6df; border-radius: 14px; padding: 20px; cursor: pointer; color: #123227; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
  .sd-jp-mode-card:hover { border-color: #9dc3b1; box-shadow: 0 6px 18px rgba(18, 50, 39, 0.08); transform: translateY(-1px); }
  .sd-jp-mode-card-active { border-color: #007a4d; background: #f2faf5; box-shadow: 0 8px 22px rgba(0, 122, 77, 0.16); }
  .sd-jp-mode-icon { width: 48px; height: 48px; border-radius: 12px; background: #123227; color: #fec60d; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .sd-jp-mode-card-active .sd-jp-mode-icon { background: #007a4d; color: #ffffff; }
  .sd-jp-mode-name { display: block; font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); font-size: 1.25rem; font-weight: 400; margin-bottom: 4px; }
  .sd-jp-mode-desc { display: block; font-size: 0.9rem; line-height: 1.55; color: #5a6b63; }
  .sd-jp-mode-tag { display: inline-block; margin-top: 10px; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #004d34; background: #eef6f1; border-radius: 999px; padding: 4px 10px; }
  .sd-jp-mode-card-active .sd-jp-mode-tag { background: #007a4d; color: #ffffff; }

  /* Subject cards: a responsive grid, so a growing subject list lays out
     gracefully instead of assuming a fixed number of subjects. */
  .sd-jp-subjects { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0 0 4px 0; }
  .sd-jp-subject-card { display: flex; align-items: center; gap: 14px; text-align: left; width: 100%; background: #ffffff; border: 2px solid #dce6df; border-radius: 12px; padding: 14px 16px; cursor: pointer; color: #123227; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
  .sd-jp-subject-card:hover { border-color: #9dc3b1; box-shadow: 0 6px 16px rgba(18, 50, 39, 0.08); transform: translateY(-1px); }
  .sd-jp-subject-card-active { border-color: #007a4d; background: #f2faf5; }
  .sd-jp-subject-mono { flex: none; width: 44px; height: 44px; border-radius: 50%; background: #eef6f1; color: #007a4d; font-weight: 800; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; }
  .sd-jp-subject-card-active .sd-jp-subject-mono { background: #007a4d; color: #ffffff; }
  .sd-jp-subject-text { flex: 1; min-width: 0; }
  .sd-jp-subject-name { display: block; font-weight: 800; font-size: 1.02rem; }
  .sd-jp-subject-meta { display: block; font-size: 0.85rem; color: #5a6b63; margin-top: 2px; }
  .sd-jp-subject-check { margin-left: auto; flex: none; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #dce6df; display: flex; align-items: center; justify-content: center; color: transparent; font-weight: 800; }
  .sd-jp-subject-card-active .sd-jp-subject-check { background: #007a4d; border-color: #007a4d; color: #ffffff; }

  .sd-jp-field { border: 0; padding: 0; margin: 0 0 20px 0; }
  .sd-jp-field-label { font-weight: 800; color: #123227; margin-bottom: 10px; font-size: 1rem; padding: 0; }
  .sd-jp-choice-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .sd-jp-choice { min-height: 44px; padding: 8px 16px; border-radius: 999px; border: 1px solid #9dc3b1; background: #ffffff; color: #004d34; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
  .sd-jp-choice:hover { border-color: #007a4d; }
  .sd-jp-choice-active { background: #007a4d !important; border-color: #007a4d !important; color: #ffffff !important; }
  .sd-jp-btn { min-height: 50px; padding: 13px 26px; border-radius: 999px; border: none; background: #007a4d; color: #ffffff; font-weight: 800; font-size: 1.02rem; cursor: pointer; transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; }
  .sd-jp-btn:hover { background: #00603d; box-shadow: 0 6px 16px rgba(0, 122, 77, 0.25); }
  .sd-jp-btn-start { width: 100%; font-size: 1.1rem; min-height: 54px; }
  .sd-jp-btn-secondary { min-height: 48px; padding: 12px 20px; border-radius: 999px; border: 1px solid #9dc3b1; background: #ffffff; color: #004d34; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: border-color 0.15s ease; }
  .sd-jp-btn-secondary:hover:not(:disabled) { border-color: #007a4d; }
  .sd-jp-btn-secondary:disabled { opacity: 0.45; cursor: default; }
  .sd-jp-install { display: block; margin-top: 16px; min-height: 48px; padding: 12px 20px; border-radius: 999px; border: 1px solid #9dc3b1; background: #eef6f1; color: #004d34; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
  .sd-jp-install-note { font-size: 0.9rem; color: #004d34; font-weight: 600; margin: 16px 0 0 0; }
  .sd-jp-history { margin-top: 28px; border-top: 1px solid #e6efe9; padding-top: 20px; }
  .sd-jp-history h3 { font-size: 1.05rem; font-weight: 800; color: #123227; margin: 0 0 10px 0; }
  .sd-jp-history ul { list-style: none; margin: 0; padding: 0; }
  .sd-jp-history-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #eef6f1; font-size: 0.95rem; color: #123227; }
  .sd-jp-history-item:last-child { border-bottom: none; }
  .sd-jp-badge { font-size: 0.8rem; font-weight: 700; color: #004d34; background: #eef6f1; border-radius: 999px; padding: 4px 10px; white-space: nowrap; }

  /* Quiz screen. The run header sticks under the sticky site header
     (64px) so the timer and Submit stay visible on long questions. */
  .sd-jp-run-head { position: sticky; top: 72px; z-index: 50; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; background: #ffffff; border-radius: 12px; padding: 10px 12px; box-shadow: 0 6px 18px rgba(18, 50, 39, 0.10); }
  .sd-jp-run-title { font-weight: 800; color: #123227; font-size: 1.05rem; }
  .sd-jp-run-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sd-jp-timer { font-variant-numeric: tabular-nums; font-weight: 800; font-size: 1.05rem; background: #123227; color: #ffffff; border-radius: 999px; padding: 9px 16px; }
  .sd-jp-timer-low { background: #b3372f; }
  .sd-jp-btn-submit { min-height: 44px; padding: 10px 20px; font-size: 0.95rem; }
  .sd-jp-progress-row { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
  .sd-jp-progress-track { flex: 1; height: 10px; border-radius: 999px; background: #e6efe9; overflow: hidden; }
  .sd-jp-progress-fill { height: 100%; background: #007a4d; border-radius: 999px; transition: width 0.3s ease; }
  .sd-jp-progress-pct { font-variant-numeric: tabular-nums; font-weight: 800; color: #004d34; font-size: 0.9rem; min-width: 38px; text-align: right; }
  /* The question block scrolls into view on set start and question
     change: this margin holds it clear of the sticky site header (64px)
     + the sticky run header (~64px) + breathing room, so the stem and
     top options can never slide under the sticky bar. The mobile value
     is taller because the run header wraps to two rows there (and a
     long subject name can wrap its title line). */
  .sd-jp-question { scroll-margin-top: 148px; }
  .sd-jp-q-meta { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 10px 0; }
  .sd-jp-chip { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #004d34; background: #eef6f1; border-radius: 999px; padding: 5px 11px; }
  .sd-jp-stem { font-size: 1.2rem; line-height: 1.65; font-weight: 700; color: #123227; margin: 0 0 20px 0; white-space: pre-wrap; overflow-wrap: break-word; }
  .sd-jp-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .sd-jp-option { display: flex; align-items: flex-start; gap: 12px; text-align: left; min-height: 56px; padding: 16px; border-radius: 12px; border: 2px solid #dce6df; background: #ffffff; color: #123227; font-size: 1rem; line-height: 1.55; cursor: pointer; font-family: inherit; transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
  .sd-jp-option:hover:not(:disabled) { border-color: #9dc3b1; box-shadow: 0 4px 14px rgba(18, 50, 39, 0.08); transform: translateY(-1px); }
  .sd-jp-option:disabled { cursor: default; }
  .sd-jp-option-letter { flex: none; width: 30px; height: 30px; border-radius: 8px; background: #eef6f1; color: #004d34; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
  .sd-jp-option-picked { border-color: #007a4d; background: #e6f5ec; box-shadow: 0 4px 14px rgba(0, 122, 77, 0.14); }
  .sd-jp-option-picked .sd-jp-option-letter { background: #007a4d; color: #ffffff; }
  .sd-jp-option-correct { border-color: #007a4d !important; background: #e6f5ec !important; }
  .sd-jp-option-correct .sd-jp-option-letter { background: #007a4d; color: #ffffff; }
  .sd-jp-option-wrong { border-color: #d96a6a !important; background: #fdf2f2 !important; }
  .sd-jp-option-wrong .sd-jp-option-letter { background: #d96a6a; color: #ffffff; }
  .sd-jp-feedback { margin-top: 16px; border-radius: 12px; padding: 16px 18px; font-size: 0.95rem; line-height: 1.65; }
  .sd-jp-feedback p { margin: 0 0 6px 0; }
  .sd-jp-feedback p:last-child { margin-bottom: 0; }
  .sd-jp-feedback-good { background: #e6f5ec; border: 1px solid #9dc3b1; color: #123227; }
  .sd-jp-feedback-bad { background: #fdf2f2; border: 1px solid #f0b6b6; color: #123227; }
  .sd-jp-expl { color: #3c4a44; }
  .sd-jp-nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 26px; }
  .sd-jp-answered { font-weight: 800; color: #123227; font-size: 0.95rem; font-variant-numeric: tabular-nums; text-align: center; }
  .sd-jp-grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 18px; }
  .sd-jp-grid-btn { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #dce6df; background: #ffffff; color: #123227; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
  .sd-jp-grid-btn:hover { border-color: #007a4d; }
  .sd-jp-grid-current { background: #007a4d !important; border-color: #007a4d !important; color: #ffffff !important; }
  .sd-jp-grid-answered { background: #e6f5ec; border-color: #007a4d; color: #004d34; }
  .sd-jp-kbd-hint { font-size: 0.85rem; color: #5a6b63; text-align: center; margin: 14px 0 0 0; }
  .sd-jp-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }

  /* Review screen. */
  .sd-jp-score { background: linear-gradient(135deg, #123227 0%, #004d34 100%); border-radius: 14px; padding: 28px 26px; margin-bottom: 8px; color: #ffffff; text-align: center; scroll-margin-top: 80px; }
  .sd-jp-score-pct { font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); font-size: 3rem; line-height: 1; color: #fec60d; margin: 0 0 8px 0; }
  .sd-jp-score-big { font-size: 1.3rem; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; }
  .sd-jp-score-meta { margin: 0; color: #d7ece1; font-size: 0.95rem; }
  .sd-jp-score-note { margin: 10px 0 0 0; color: #b9d8c9; font-size: 0.88rem; }
  .sd-jp-review-q { border: 1px solid #dce6df; border-radius: 14px; padding: 22px; margin-top: 18px; background: #ffffff; }
  .sd-jp-review-options { list-style: none; margin: 0 0 12px 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sd-jp-review-option { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 10px; border: 1px solid #dce6df; font-size: 0.98rem; line-height: 1.55; color: #123227; }
  .sd-jp-review-option .sd-jp-badge { margin-left: auto; }

  @media (max-width: 700px) {
    .sd-jp-card { padding: 20px 16px; }
    .sd-jp-modes { grid-template-columns: 1fr; }
    .sd-jp-subjects { grid-template-columns: 1fr; }
    .sd-jp-options { grid-template-columns: 1fr; }
    .sd-jp-review-options { grid-template-columns: 1fr; }
    .sd-jp-dash-grid { gap: 8px; }
    .sd-jp-stat { padding: 12px 10px; }
    .sd-jp-stat-num { font-size: 1.5rem; }
    .sd-jp-btn, .sd-jp-btn-secondary, .sd-jp-install { width: 100%; text-align: center; }
    .sd-jp-run-tools { width: 100%; }
    .sd-jp-run-tools .sd-jp-btn { width: auto; flex: 1; }
    .sd-jp-question { scroll-margin-top: 208px; }
    .sd-jp-stem { font-size: 1.1rem; }
    .sd-jp-nav .sd-jp-btn-secondary { width: auto; flex: 1; }
    .sd-jp-kbd-hint { display: none; }
  }
`;

export default async function JambPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ?subject=<slug> preselects a subject on the setup screen (used by
  // footer links). Validated against the pack list — unknown values fall
  // back to the default subject, never trusted blindly.
  const rawSubject = (await searchParams).subject;
  const subjectParam = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject;
  const initialSubject = PACK_SUBJECTS.find((s) => s.slug === subjectParam)?.slug;

  return (
    <>
      <SiteStyles />
      <style>{PRACTICE_STYLES}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PRACTICE_JSON_LD) }} />
      <div className="sd-page sd-contact-page" id="top">
        <SiteHeader variant="tool" />
        <main>
          <section className="sd-section sd-section-soft">
            {/* Full-colour Template 1 scene, same language as the home and
                tool pages — behind the content at every width. The
                practice card stays opaque and fully clear. */}
            <div className="sd-scene" aria-hidden="true">
              <svg className="sd-scene-svg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 660 0 C 580 120, 500 250, 450 380 C 420 460, 405 530, 400 600 L 1200 600 L 1200 0 Z" fill="#C7EFEE" />
                <path d="M 620 600 C 640 500, 740 450, 840 470 C 940 490, 1020 440, 1100 470 C 1150 488, 1180 520, 1200 540 L 1200 600 Z" fill="#4D9F5F" />
                <path d="M 760 600 C 780 530, 880 500, 980 520 C 1060 536, 1130 520, 1200 540 L 1200 600 Z" fill="#3E8A4E" />
              </svg>
              <span className="sd-doodle sd-doodle-float" style={{ top: '4%', left: '4%', width: 64, animationDuration: '7s', animationDelay: '-1s' }}><DoodleCloud fill="#DDEDE8" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '6%', left: '22%', width: 18, animationDuration: '6s', animationDelay: '-1s' }}><DoodleSparkle fill="#FEC60D" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '3%', right: '6%', width: 130, animationDuration: '8s', animationDelay: '-1.5s' }}><DoodlePlane /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '12%', right: '16%', width: 48, opacity: 0.9, animationDuration: '8s', animationDelay: '-2s' }}><DoodleCloud fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '20%', right: '30%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '34%', left: '2%', width: 26, animationDuration: '7s', animationDelay: '-2.5s' }}><DoodleLeaf fill="#2F7A3E" stroke="#1E5A2A" rotate={25} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '55%', right: '1.8%', width: 24, animationDuration: '6.5s', animationDelay: '-0.5s' }}><DoodleLeaf fill="#7CB85C" stroke="#2F7A3E" rotate={-15} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '30%', left: '3%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#8FD4CB" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '5%', left: '3.5%', width: 42, animationDuration: '8s', animationDelay: '-2s' }}><DoodleFlask /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '5%', right: '2.5%', width: 78, animationDuration: '7s', animationDelay: '-1s' }}><DoodleBooks /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '14%', right: '12%', width: 20, animationDuration: '7.5s', animationDelay: '-3s' }}><DoodleSparkle fill="#FEC60D" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '6%', left: '46%', width: 88, animationDuration: '7s', animationDelay: '-1.5s' }}><DoodlePencilFlat /></span>
            </div>
            <div className="sd-wrap">
              <p className="sd-eyebrow">Free JAMB practice</p>
              <h1 className="sd-h2">Practise JAMB questions, free.</h1>
              <p className="sd-jp-intro">
                Quick UTME sets with answers and explanations.
                No sign-up, and it works offline once loaded.
              </p>
              <JambPractice initialSubject={initialSubject} />
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
      {/* No PencilCursor on this tool page: the follower covered live quiz
          text and buttons in preview (options, Next/Previous, the Start
          button, Study-card and reset copy). The custom cursor must never
          cover interactive text on tool pages, so this page keeps the
          native cursor. The pencil itself is untouched and stays on the
          home and contact pages. */}
    </>
  );
}
