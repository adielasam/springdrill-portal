import { LogoMark } from './LogoMark';

// Shared site footer for the landing pages.
export function SiteFooter() {
  return (
    <footer className="sd-footer">
      <div className="sd-footer-inner">
        <div>
          <h3 className="sd-footer-brand"><LogoMark size={26} />SpringDrill</h3>
          <p>CBT tests, results and report cards for Nigerian schools.</p>
        </div>
        <div className="sd-footer-credit">
          <p>SpringDrill is built by <a href="https://dorvastechnologies.vercel.app/">Dorvas Technologies</a></p>
        </div>
      </div>
      <div className="sd-footer-copy">
        Copyright &copy; 2026 <b>SpringDrill</b> | All Rights Reserved
      </div>
    </footer>
  );
}
