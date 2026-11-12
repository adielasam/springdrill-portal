import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { SiteStyles } from "../components/SiteStyles";

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
            <div className="sd-corner-doodles" aria-hidden="true">
              <span className="sd-corner-doodle" style={{ bottom: 30, left: 44, width: 24 }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="currentColor" /></svg>
              </span>
              <span className="sd-corner-doodle" style={{ bottom: 34, right: 52, width: 44 }}>
                <svg viewBox="0 0 80 48" fill="none" aria-hidden="true"><g fill="currentColor"><circle cx="26" cy="30" r="12" /><circle cx="42" cy="21" r="14" /><circle cx="58" cy="30" r="10" /><rect x="16" y="30" width="52" height="11" rx="5.5" /></g></svg>
              </span>
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
    </>
  );
}
