// Full-colour Template 1 doodles for the section scenes: each renders one
// small inline SVG in the sample's flat cartoon style; callers position
// them with .sd-doodle + inline styles. Shared by the home page sections
// and the contact page so both carry the same artwork language. (The hero
// keeps its own inline copies, unchanged.)
export function DoodleCloud({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 80 48" fill="none" aria-hidden="true"><g fill={fill}><circle cx="26" cy="30" r="12" /><circle cx="42" cy="21" r="14" /><circle cx="58" cy="30" r="10" /><rect x="16" y="30" width="52" height="11" rx="5.5" /></g></svg>
  );
}

export function DoodleSparkle({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill={fill} /></svg>
  );
}

export function DoodleLeaf({ fill, stroke, rotate }: { fill: string; stroke: string; rotate: number }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><g transform={`rotate(${rotate} 16 16)`}><path d="M6 26C6 12 16 4 28 4c0 14-8 22-22 22z" fill={fill} /><path d="M8 24C14 18 20 12 26 6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></g></svg>
  );
}

export function DoodleBooks() {
  return (
    <svg viewBox="0 0 90 60" fill="none" aria-hidden="true"><rect x="6" y="46" width="76" height="14" rx="3" fill="#2E7CC4" /><rect x="12" y="49.5" width="58" height="7" rx="2" fill="#EAF4FB" /><rect x="12" y="31" width="68" height="14" rx="3" fill="#FFFFFF" stroke="#2E7CC4" strokeWidth="2" /><rect x="18" y="34.5" width="50" height="7" rx="2" fill="#DCEBF8" /><rect x="20" y="16" width="56" height="14" rx="3" fill="#7FB3E0" /><rect x="26" y="19.5" width="38" height="7" rx="2" fill="#EAF4FB" /></svg>
  );
}

export function DoodleFlask() {
  return (
    <svg viewBox="0 0 48 64" fill="none" aria-hidden="true"><path d="M20 4h8v10l10 20c2.4 4.8 3.6 8 3.6 11a9.4 9.4 0 0 1-9.4 9.4H15.8A9.4 9.4 0 0 1 6.4 45c0-3 1.2-6.2 3.6-11L20 14V4z" fill="#FFFFFF" stroke="#512A2C" strokeWidth="2" strokeLinejoin="round" /><path d="M13 40h22l3.4 6.8c.8 1.6 1.2 3 1.2 4.4a6.4 6.4 0 0 1-6.4 6.4H14.8a6.4 6.4 0 0 1-6.4-6.4c0-1.4.4-2.8 1.2-4.4L13 40z" fill="#F59645" /><circle cx="20" cy="48" r="2.2" fill="#FDE3C8" /><circle cx="28" cy="52" r="1.6" fill="#FDE3C8" /><circle cx="25" cy="43" r="1.3" fill="#FDE3C8" /><rect x="18" y="2" width="12" height="5" rx="2" fill="#512A2C" /></svg>
  );
}

export function DoodlePencilFlat() {
  return (
    <svg viewBox="0 0 120 20" fill="none" aria-hidden="true" style={{ transform: 'rotate(-4deg)' }}><rect x="26" y="4" width="72" height="12" fill="#4D9F5F" /><rect x="26" y="4" width="72" height="3" fill="#6BBF7B" /><path d="M26 4L6 10l20 6V4z" fill="#F2D8A7" /><path d="M12 7.5L6 10l6 2.5V7.5z" fill="#2B2B2B" /><rect x="98" y="4" width="8" height="12" fill="#C0C7CE" /><rect x="106" y="4" width="10" height="12" rx="2" fill="#F472B6" /></svg>
  );
}

export function DoodlePlane() {
  return (
    <svg viewBox="0 0 140 70" fill="none" aria-hidden="true"><path d="M6 60C44 56 66 40 106 18" stroke="#512A2D" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" /><path d="M102 8L136 16 106 26 111 16Z" fill="#ffffff" /></svg>
  );
}
