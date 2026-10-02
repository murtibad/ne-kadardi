# Design brief (input for Google Stitch)

## Concept: "Kasa fişi" (shop receipt)

The result screen looks like a thermal-printed shop receipt. It fits the inflation theme and is
instantly recognizable in a screenshot, which makes it worth sharing.

## Principles

- Mobile first (390 px), single column, one action per screen, large numbers.
- Calm and minimal: paper white background, ink black text, **one accent: red** (for the
  "kat fazla/az" verdict and price increase). No gradients, no stock illustrations.
- Typography: monospace for all numbers and the receipt (e.g. JetBrains Mono / IBM Plex Mono),
  a clean sans-serif for UI (e.g. Inter). Turkish characters must render correctly.
- Dark mode: dark background, the receipt stays light like real paper.
- Small touches allowed: torn/zig-zag receipt edge, dashed separators, subtle paper texture.
  Motion only if subtle (receipt "printing" in), and disabled under `prefers-reduced-motion`.

## Screens

1. **Soru** — header: logo "Ne Kadardı?" + year range filter (two small selects).
   Card: date ("Ocak 2012", accent color), product ("Benzin (kurşunsuz 95)"), unit + region
   ("1 litre · İstanbul (Avrupa)"). Big numeric input with "₺" suffix, button "Tahmin et".
2. **Sonuç (fiş)** — receipt header "*** NE KADARDI? ***", title line (date · product),
   unit line, rows: "Tahminin", "Gerçek fiyat"; big verdict "2,7 kat az tahmin ettin";
   rows: "Bugün (Ekim 2026)", "Artış: 11 kat"; "PUAN 64/100"; small source link.
   Below the receipt: session line ("Bu oturum: 5 soru · ortalama 58 puan"),
   buttons "Paylaş" and "Sonraki".
3. **Boş/hata durumu** — short Turkish message on a card.

## Stitch prompt notes

- Numbers in mockups are placeholders. Do not keep them anywhere in the code or data.
- Ask Stitch not to invent extra content: no user counts, testimonials, ads, login, leaderboards.
- Generate 2–3 variants of screens 1 and 2; Murti picks.
