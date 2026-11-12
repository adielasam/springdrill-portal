// Logo mark: a green rounded square with a white check — "tests marked,
// results ready". One component, shared by the landing pages: header,
// preloader, nav overlay and footer. Swap the SVG for a cap/book/"S"
// later if wanted.
export function LogoMark({ variant = 'green', size = 32 }: { variant?: 'green' | 'white'; size?: number }) {
  const square = variant === 'white' ? '#ffffff' : '#007a4d';
  const check = variant === 'white' ? '#007a4d' : '#ffffff';
  return (
    <svg className="sd-logo-mark" width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={square} />
      <path d="M9 16.5 L13.8 21.3 L23.5 10.5" stroke={check} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
