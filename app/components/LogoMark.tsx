// Logo mark: the owner's actual SpringDrill emblem — the green circle
// with a graduation cap and a hand holding a pen, cropped from the lockup
// with a transparent background. The white disc inside the ring stays
// opaque, so the mark sits cleanly on white headers AND the dark-green
// footer/nav overlay with no white box. The adjacent wordmark text
// carries the name, so the image is decorative (alt=""). The full
// lockup lives at /springdrill-logo.png (its dark-green "Spring"
// wordmark is a white-surface design); the preloader splits it into the
// spinning emblem + a steady wordmark crop (/springdrill-wordmark.png).
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img className="sd-logo-mark" src="/springdrill-emblem.png" alt="" width={size} height={size} draggable={false} />
  );
}
