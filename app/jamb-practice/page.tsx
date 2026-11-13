import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { SiteStyles } from "../components/SiteStyles";
import { DoodleBooks, DoodleCloud, DoodleFlask, DoodleLeaf, DoodlePencilFlat, DoodlePlane, DoodleSparkle } from "../components/Doodles";
import { PencilCursor } from "../components/PencilCursor";
import JambPractice from "./JambPractice";

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
  .sd-jp-card { background: #ffffff; border: 1px solid #dce6df; border-radius: 14px; padding: 28px; box-shadow: 0 8px 28px rgba(18, 50, 39, 0.08); }
  .sd-jp-status { font-size: 0.9rem; color: #5a6b63; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sd-jp-dot { width: 10px; height: 10px; border-radius: 50%; background: #007a4d; flex: none; }
  .sd-jp-dot-off { background: #d9930d; }
  .sd-jp-offline-ready { color: #004d34; font-weight: 600; }
  .sd-jp-note { font-size: 0.9rem; line-height: 1.6; color: #5a6b63; margin: 8px 0; }
  .sd-jp-error { font-size: 0.95rem; line-height: 1.6; color: #7a1f1f; background: #fdf2f2; border: 1px solid #f0b6b6; border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
  .sd-jp-field { border: 0; padding: 0; margin: 0 0 20px 0; }
  .sd-jp-field-label { font-weight: 700; color: #123227; margin-bottom: 10px; font-size: 1rem; padding: 0; }
  .sd-jp-choice-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .sd-jp-choice { min-height: 44px; padding: 8px 16px; border-radius: 999px; border: 1px solid #9dc3b1; background: #ffffff; color: #004d34; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
  .sd-jp-choice-active { background: #007a4d !important; border-color: #007a4d !important; color: #ffffff !important; }
  .sd-jp-btn { min-height: 48px; padding: 12px 24px; border-radius: 999px; border: none; background: #007a4d; color: #ffffff; font-weight: 700; font-size: 1rem; cursor: pointer; }
  .sd-jp-btn-secondary { min-height: 48px; padding: 12px 20px; border-radius: 999px; border: 1px solid #9dc3b1; background: #ffffff; color: #004d34; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
  .sd-jp-btn-secondary:disabled { opacity: 0.45; cursor: default; }
  .sd-jp-install { display: block; margin-top: 16px; min-height: 48px; padding: 12px 20px; border-radius: 999px; border: 1px solid #9dc3b1; background: #eef6f1; color: #004d34; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
  .sd-jp-install-note { font-size: 0.9rem; color: #004d34; font-weight: 600; margin: 16px 0 0 0; }
  .sd-jp-history { margin-top: 28px; border-top: 1px solid #e6efe9; padding-top: 20px; }
  .sd-jp-history h3 { font-size: 1.05rem; font-weight: 700; color: #123227; margin: 0 0 10px 0; }
  .sd-jp-history ul { list-style: none; margin: 0; padding: 0; }
  .sd-jp-history-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #eef6f1; font-size: 0.95rem; color: #123227; }
  .sd-jp-history-item:last-child { border-bottom: none; }
  .sd-jp-badge { font-size: 0.8rem; font-weight: 700; color: #004d34; background: #eef6f1; border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
  .sd-jp-run-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-weight: 700; color: #123227; margin-bottom: 12px; flex-wrap: wrap; }
  .sd-jp-timer { font-variant-numeric: tabular-nums; background: #eef6f1; border-radius: 999px; padding: 6px 14px; }
  .sd-jp-timer-low { background: #fdf2f2; color: #7a1f1f; }
  .sd-jp-progress-track { height: 10px; border-radius: 999px; background: #e6efe9; overflow: hidden; margin-bottom: 20px; }
  .sd-jp-progress-fill { height: 100%; background: #007a4d; border-radius: 999px; transition: width 0.3s ease; }
  .sd-jp-q-meta { font-size: 0.85rem; font-weight: 700; color: #007a4d; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 8px 0; }
  .sd-jp-stem { font-size: 1.1rem; line-height: 1.7; color: #123227; margin: 0 0 18px 0; white-space: pre-wrap; overflow-wrap: break-word; }
  .sd-jp-options { display: grid; gap: 10px; }
  .sd-jp-option { display: flex; align-items: flex-start; gap: 12px; text-align: left; min-height: 52px; padding: 14px 16px; border-radius: 12px; border: 1px solid #dce6df; background: #ffffff; color: #123227; font-size: 1rem; line-height: 1.55; cursor: pointer; }
  .sd-jp-option:disabled { cursor: default; }
  .sd-jp-option-letter { flex: none; width: 28px; height: 28px; border-radius: 50%; background: #eef6f1; color: #004d34; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
  .sd-jp-option-picked { border-color: #007a4d; background: #eef6f1; }
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
  .sd-jp-nav { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
  .sd-jp-grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; flex: 1 1 200px; }
  .sd-jp-grid-btn { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #dce6df; background: #ffffff; color: #123227; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
  .sd-jp-grid-current { background: #123227 !important; border-color: #123227 !important; color: #ffffff !important; }
  .sd-jp-grid-answered { background: #eef6f1; border-color: #9dc3b1; }
  .sd-jp-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .sd-jp-score { background: #eef6f1; border: 1px solid #9dc3b1; border-radius: 12px; padding: 22px; margin-bottom: 8px; }
  .sd-jp-score-big { font-size: 1.5rem; font-weight: 800; color: #123227; margin: 0 0 6px 0; }
  .sd-jp-score p { margin: 0 0 6px 0; color: #3c4a44; }
  .sd-jp-score p:last-child { margin-bottom: 0; }
  .sd-jp-review-q { border-top: 1px solid #e6efe9; padding: 22px 0 6px 0; margin-top: 22px; }
  .sd-jp-review-options { list-style: none; margin: 0 0 12px 0; padding: 0; display: grid; gap: 8px; }
  .sd-jp-review-option { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 10px; border: 1px solid #dce6df; font-size: 0.98rem; line-height: 1.55; color: #123227; }
  .sd-jp-review-option .sd-jp-badge { margin-left: auto; }
  @media (max-width: 700px) {
    .sd-jp-card { padding: 20px 16px; }
    .sd-jp-btn, .sd-jp-btn-secondary, .sd-jp-install { width: 100%; text-align: center; }
    .sd-jp-nav { flex-direction: column; }
    .sd-jp-nav .sd-jp-btn-secondary { width: 100%; }
    .sd-jp-stem { font-size: 1.05rem; }
  }
`;

export default function JambPracticePage() {
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
                Quick UTME sets in English, Mathematics and Biology, with answers and explanations.
                No sign-up, and it works offline once loaded.
              </p>
              <JambPractice />
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
      <PencilCursor />
    </>
  );
}
