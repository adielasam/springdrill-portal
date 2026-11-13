import type { Metadata } from "next";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteStyles } from "../../components/SiteStyles";
import { DoodleBooks, DoodleCloud, DoodleFlask, DoodleLeaf, DoodlePencilFlat, DoodlePlane, DoodleSparkle } from "../../components/Doodles";
import { PencilCursor } from "../../components/PencilCursor";
import BackgroundRemover from "./BackgroundRemover";

export const metadata: Metadata = {
  title: "Free Background Remover — Remove Photo Backgrounds Online | SpringDrill",
  description:
    "Remove the background from any photo free — no sign-up, no watermark, no upload. Your photo never leaves your device: the background is removed right in your browser. Works on phones and computers.",
  keywords: [
    "background remover",
    "remove background from photo",
    "free background remover",
    "transparent PNG maker",
    "remove image background online",
    "passport photo background remover",
    "SpringDrill",
  ],
  alternates: { canonical: "/tools/remove-background" },
  openGraph: {
    title: "Free Background Remover — SpringDrill",
    description:
      "Remove a photo background free, in your browser. No sign-up, no watermark, nothing uploaded — your photo never leaves your device.",
    url: "/tools/remove-background",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "SpringDrill — free background remover" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Background Remover — SpringDrill",
    description:
      "Remove a photo background free, in your browser. No sign-up, no watermark, nothing uploaded.",
    images: ["/og-image.jpg"],
  },
};

// Free background-removal tool: fully public, no sign-in, no paywall, no
// usage limits. All processing happens in the visitor's browser (see
// removeBackground.ts) — the photo is never uploaded anywhere. The page
// follows the contact page's layout: shared header/menu + footer, the
// Template 1 cartoon scene, ChunkFive headings and Spring Drill green.
// The scene and artwork show at every width (mobile parity: most Spring
// Drill users are on phones).
const TOOL_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SpringDrill Background Remover",
  url: "https://springdrill-portal.vercel.app/tools/remove-background",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any (web browser)",
  description:
    "Free background remover that runs entirely in the browser. No sign-up, no watermark, no upload — photos never leave the device.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
  isAccessibleForFree: true,
};

const TOOL_STYLES = `
  .sd-bg-intro { font-size: 1.05rem; line-height: 1.7; color: #5a6b63; max-width: 720px; margin: 0 0 28px 0; }
  .sd-bg-tool { background: #ffffff; border: 1px solid #dce6df; border-radius: 14px; padding: 28px; box-shadow: 0 8px 28px rgba(18, 50, 39, 0.08); }
  .sd-bg-dropzone { border: 2px dashed #9dc3b1; border-radius: 12px; padding: 36px 24px; text-align: center; background: #f7faf8; }
  .sd-bg-dropzone-active { border-color: #007a4d; background: #eef6f1; }
  .sd-bg-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
  .sd-bg-drop-title { font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); font-size: 1.4rem; color: #123227; margin: 0 0 8px 0; }
  .sd-bg-drop-sub { font-size: 0.95rem; line-height: 1.6; color: #5a6b63; margin: 0 0 18px 0; }
  .sd-bg-choose { min-height: 48px; }
  .sd-bg-drop-note { font-size: 0.85rem; color: #5a6b63; margin: 16px 0 0 0; }
  .sd-bg-ready { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 20px; border-top: 1px solid #e6efe9; padding-top: 20px; }
  .sd-bg-thumb { width: 96px; height: 96px; object-fit: cover; border-radius: 10px; border: 1px solid #dce6df; }
  .sd-bg-ready-text { flex: 1 1 220px; }
  .sd-bg-ready-text p { margin: 0; font-size: 0.95rem; line-height: 1.6; color: #5a6b63; }
  .sd-bg-filename { font-weight: 700; color: #123227 !important; overflow-wrap: anywhere; }
  .sd-bg-remove, .sd-bg-change { min-height: 48px; }
  .sd-bg-working { margin-top: 20px; border-top: 1px solid #e6efe9; padding-top: 20px; }
  .sd-bg-progress-track { height: 12px; border-radius: 999px; background: #e6efe9; overflow: hidden; }
  .sd-bg-progress-fill { height: 100%; background: #007a4d; border-radius: 999px; transition: width 0.3s ease; }
  .sd-bg-progress-busy { width: 40% !important; animation: sd-bg-slide 1.2s ease-in-out infinite alternate; }
  @keyframes sd-bg-slide { from { transform: translateX(-10%); } to { transform: translateX(160%); } }
  .sd-bg-status { font-weight: 700; color: #123227; margin: 14px 0 6px 0; }
  .sd-bg-status-sub { font-size: 0.9rem; line-height: 1.6; color: #5a6b63; margin: 0; }
  .sd-bg-error { margin-top: 20px; border: 1px solid #f0b6b6; background: #fdf2f2; border-radius: 10px; padding: 16px 18px; }
  .sd-bg-error p { margin: 0 0 12px 0; color: #7a1f1f; font-size: 0.95rem; line-height: 1.6; }
  .sd-bg-retry { min-height: 48px; }
  .sd-bg-result { margin-top: 8px; }
  .sd-bg-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sd-bg-panel { margin: 0; }
  .sd-bg-panel figcaption { font-weight: 700; color: #123227; margin-bottom: 10px; font-size: 0.95rem; }
  .sd-bg-panel img { display: block; width: 100%; height: auto; max-height: 480px; object-fit: contain; border-radius: 10px; border: 1px solid #dce6df; background: #f7faf8; }
  .sd-bg-preview { border-radius: 10px; border: 1px solid #dce6df; overflow: hidden; }
  .sd-bg-preview img { border: none; border-radius: 0; background: transparent; }
  .sd-bg-preview-transparent { background-image: linear-gradient(45deg, #c8c8c8 25%, transparent 25%), linear-gradient(-45deg, #c8c8c8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c8c8c8 75%), linear-gradient(-45deg, transparent 75%, #c8c8c8 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0; background-color: #ffffff; }
  .sd-bg-preview-white { background: #ffffff; }
  .sd-bg-preview-green { background: #007a4d; }
  .sd-bg-preview-toggle { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .sd-bg-preview-toggle button { min-height: 44px; padding: 8px 16px; border-radius: 999px; border: 1px solid #9dc3b1; background: #ffffff; color: #004d34; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
  .sd-bg-toggle-active { background: #007a4d !important; border-color: #007a4d !important; color: #ffffff !important; }
  .sd-bg-result-note { font-size: 0.9rem; line-height: 1.6; color: #5a6b63; margin: 16px 0; }
  .sd-bg-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .sd-bg-download, .sd-bg-again { min-height: 48px; }
  .sd-bg-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 28px; }
  .sd-bg-step { border: 1px solid #dce6df; border-radius: 12px; padding: 22px; background: #ffffff; }
  .sd-bg-step h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 8px 0; color: #123227; }
  .sd-bg-step p { font-size: 0.95rem; line-height: 1.65; color: #5a6b63; margin: 0; }
  .sd-bg-note { margin-top: 16px; border: 1px solid #dce6df; border-radius: 12px; padding: 22px; background: #ffffff; font-size: 0.95rem; line-height: 1.7; color: #5a6b63; }
  .sd-bg-note strong { color: #123227; }
  .sd-bg-note p { margin: 0 0 8px 0; }
  .sd-bg-note p:last-child { margin-bottom: 0; }
  @media (max-width: 700px) {
    .sd-bg-tool { padding: 20px 16px; }
    .sd-bg-panels { grid-template-columns: 1fr; }
    .sd-bg-steps { grid-template-columns: 1fr; }
    .sd-bg-download, .sd-bg-again, .sd-bg-remove, .sd-bg-change { width: 100%; text-align: center; }
  }
`;

export default function RemoveBackgroundPage() {
  return (
    <>
      <SiteStyles />
      <style>{TOOL_STYLES}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(TOOL_JSON_LD) }} />
      <div className="sd-page sd-contact-page" id="top">
        <SiteHeader variant="tool" />
        <main>
          <section className="sd-section sd-section-soft">
            {/* Full-colour Template 1 scene, same language as the home and
                contact sections — behind the content at every width. The
                tool card stays opaque and fully clear. */}
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
              <p className="sd-eyebrow">Free tool</p>
              <h1 className="sd-h2">Remove a photo background, free.</h1>
              <p className="sd-bg-intro">
                Drop in a photo and get back a clean cut-out with a transparent background — ready for a passport
                photo, a school flyer, a profile picture or a product listing. No sign-up, no watermark, no limits,
                and your photo never leaves your device.
              </p>
              <BackgroundRemover />
              <div className="sd-bg-steps">
                <div className="sd-bg-step">
                  <h3>1. Choose a photo</h3>
                  <p>Pick a PNG, JPG or WebP photo from your phone or computer, drag it in, or paste it. Portraits, products and single subjects work best.</p>
                </div>
                <div className="sd-bg-step">
                  <h3>2. Remove the background</h3>
                  <p>One tap runs the removal on your own device. The first use downloads the engine (about 20 MB) and saves it, so later photos are much faster.</p>
                </div>
                <div className="sd-bg-step">
                  <h3>3. Download the PNG</h3>
                  <p>Check the result against a transparent, white or green preview, then download the full-resolution transparent PNG — free, with no watermark.</p>
                </div>
              </div>
              <div className="sd-bg-note">
                <p>
                  <strong>Private by design.</strong> This tool has no server and no API: the photo is processed
                  entirely inside your browser and is never uploaded, stored or seen by anyone. Closing the page
                  removes everything.
                </p>
                <p>
                  <strong>Honest limits.</strong> Fine hair, glass and busy backgrounds can leave rough edges — the
                  small, fast model in this first version trades a little quality for speed on phones. A
                  higher-quality option is planned.
                </p>
                <p>
                  Background removal runs on your device using the U²-Net model (Apache License 2.0, © 2020 Xuebin
                  Qin) and ONNX Runtime Web (MIT licence). No account, no credits, no expiry.
                </p>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
      <PencilCursor />
    </>
  );
}
