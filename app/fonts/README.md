# Self-hosted fonts for the Spring Drill landing pages

Loaded with `next/font/local` in `app/layout.tsx`. The static portal pages
in `public/` never load the layout, so they keep their own fonts.

## ChunkFive (display headings)

- File: `ChunkFive-Regular.otf` (single weight, 400)
- Author: The League of Moveable Type
- Source: FontSquirrel, https://www.fontsquirrel.com/fonts/chunkfive
  (downloaded 12 Nov 2026 as `chunkfive.zip`; the "Chunk Five Print"
  variant from the same zip is not used)
- Licence: SIL Open Font License, Version 1.1 (licence text shipped in
  the FontSquirrel zip)

## Metropolis (body / UI text)

- Files: `Metropolis-{Regular,Medium,SemiBold,Bold,ExtraBold}.woff2`
  (weights 400/500/600/700/800, upright only — the site uses no italics)
- Author: Chris Simpson (Victory One Media Pty Ltd), version 11.0
- Source: typehaus maintained distribution,
  https://github.com/typehaus/metropolis (`dist/woff2/`, via jsDelivr),
  downloaded 12 Nov 2026. The author's original repository is no longer
  publicly available; typehaus is the maintained mirror.
- Licence: The Unlicense (public-domain dedication) — see `license.md`
  in the typehaus repository.
