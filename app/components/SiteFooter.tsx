import { LogoMark } from './LogoMark';
import { PACK_SUBJECTS } from '../jamb-practice/packs';

// Shared site footer for the landing pages, in the grouped-column pattern
// of the Spotify/Udemy footers: a brand block, four link columns, and a
// bottom row with the Dorvas credit and copyright. Every link resolves to
// a real page or home-page anchor — no dead links, no social icons (Spring
// Drill has no verified social pages), no placeholders.
//
// The Practice column is data-driven: subject links come from PACK_SUBJECTS,
// so the footer grows automatically when new subject packs land. Subject
// links use ?subject=<slug> preselection (added by the JAMB practice
// premium redesign); on a build without that support the parameter is
// harmlessly ignored and the page loads with its default subject.
export function SiteFooter() {
  return (
    <footer className="sd-footer">
      <div className="sd-footer-inner">
        <div className="sd-footer-brand-block">
          <h3 className="sd-footer-brand"><LogoMark size={30} />SpringDrill</h3>
          <p>CBT tests, results and report cards for Nigerian schools.</p>
        </div>

        <nav className="sd-footer-col" aria-label="Practice">
          <h3>Practice</h3>
          <ul>
            <li><a href="/jamb-practice">All subjects</a></li>
            {PACK_SUBJECTS.map((subject) => (
              <li key={subject.slug}>
                <a href={`/jamb-practice?subject=${subject.slug}`}>{subject.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="sd-footer-col" aria-label="Free tools">
          <h3>Free tools</h3>
          <ul>
            <li><a href="/tools/remove-background">Background remover</a></li>
            <li><a href="/jamb-practice">JAMB practice</a></li>
          </ul>
        </nav>

        <nav className="sd-footer-col" aria-label="Spring Drill">
          <h3>Spring Drill</h3>
          <ul>
            <li><a href="/#features">Features</a></li>
            <li><a href="/#how">How it works</a></li>
            <li><a href="/#schools">For schools</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>

        <nav className="sd-footer-col" aria-label="Portal">
          <h3>Portal</h3>
          <ul>
            <li><a href="/#signin">Portal sign-in</a></li>
            <li><a href="/#signin">Try a demo account</a></li>
          </ul>
        </nav>
      </div>

      <div className="sd-footer-bottom">
        <p>SpringDrill is built by <a href="https://dorvastechnologies.vercel.app/">Dorvas Technologies</a></p>
        <p>Copyright &copy; 2026 <b>SpringDrill</b> | All Rights Reserved</p>
      </div>
    </footer>
  );
}
