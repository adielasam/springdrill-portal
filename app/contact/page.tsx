import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { SiteStyles } from "../components/SiteStyles";
import { DoodleBooks, DoodleCloud, DoodleFlask, DoodleLeaf, DoodlePencilFlat, DoodlePlane, DoodleSparkle } from "../components/Doodles";
import { PencilCursor } from "../components/PencilCursor";

export const metadata: Metadata = {
  title: "Contact — SpringDrill",
  description: "Talk to us about your school. Call, email or visit SpringDrill — CBT tests, results and report cards for Nigerian schools.",
};

// Contact page: contact info only, with the site menu at the top in case
// visitors wish to sign in. No sign-in form lives on this page — Portal
// sign-in in the menu takes visitors to the sign-in section on the home
// page. The content is the same four contact blocks that used to sit at
// the bottom of the home page, including the email wrap fix (the address
// breaks only after the @, via <wbr> plus overflow-wrap: normal).
export default function ContactPage() {
  return (
    <>
      <SiteStyles />
      <div className="sd-page sd-contact-page" id="top">
        <SiteHeader variant="contact" />
        <main>
          <section className="sd-section sd-section-soft">
            {/* Full-colour Template 1 scene, same language as the home
                sections: mint blob, hills, clouds, paper plane, leaves,
                sparkles, books, pencil and flask — behind the content at
                every width. The cards stay opaque and fully clear. */}
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
              <p className="sd-eyebrow">Contact us</p>
              <h1 className="sd-h2">Talk to us about your school.</h1>
              <div className="sd-contact-grid">
                <div className="sd-contact-block">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg></span>
                  <h3>Call us</h3>
                  <p><a href="tel:+2348162337303">08162337303</a></p>
                  <p><a href="https://wa.me/2348162337303">Chat on WhatsApp</a></p>
                </div>
                <div className="sd-contact-block">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg></span>
                  <h3>Email us</h3>
                  <p><a href="mailto:adielasam2015@gmail.com">adielasam2015@<wbr />gmail.com</a></p>
                </div>
                <div className="sd-contact-block">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg></span>
                  <h3>Visit us</h3>
                  <p>Suite 58 Georgewill/Clifford Plaza, Choba Junction, Port Harcourt, Rivers State, Nigeria.</p>
                </div>
                <div className="sd-contact-block">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
                  <h3>Working hours</h3>
                  <p>Monday – Friday, 8:00 AM – 6:00 PM</p>
                  <p>Closed Saturday &amp; Sunday</p>
                </div>
              </div>
              <div className="sd-contact-cta">
                <a className="sd-btn" href="mailto:adielasam2015@gmail.com">Send us an email</a>
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
