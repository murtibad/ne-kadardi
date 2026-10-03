# Data guide

`data/prices.json` is the only data source of the game. Correctness matters more than coverage.

## Schema

```jsonc
{
  "meta": { "currency": "TRY", "schema_version": 1, "updated": "2026-10" },
  "products": [{
    "id": "benzin",                    // stable kebab-case id
    "name": "Benzin (kurşunsuz 95)",   // shown in the UI (Turkish)
    "unit": "1 litre",                 // default unit, shown in the UI
    "region": "İstanbul (Avrupa)",     // null if national
    "source_hint": "...",              // where to look; not shown in the UI
    "current": { /* entry: today's price */ },
    "prices": [ /* entries */ ]
  }]
}
```

Entry:

```jsonc
{
  "date": "2012-01",          // "YYYY" for fixed yearly values, "YYYY-MM" when price changes often
  "price": 3.85,              // number in TRY, or null when status is "todo"
  "status": "verified",       // "verified" | "todo"; only verified entries are playable
  "label": "iPhone 5",        // optional, shown next to the product name
  "unit": "250 gr",           // optional, overrides the product unit
  "note": "Monthly average of ...",  // optional; required for derived values; "TODO: kaynak gerekli" for todo
  "source": {
    "title": "EPDK Akaryakıt Fiyat Bülteni, Ocak 2012",
    "url": "https://...",
    "archive_url": "https://web.archive.org/...",   // recommended
    "accessed": "2026-10-03"
  }
}
```

`tests/data.test.js` enforces this. Fake fixture data belongs only in tests.

## Rules

- A value is `verified` only if you opened the source and read the number there.
- Prefer primary/official sources (TCMB EVDS, EPDK, Resmî Gazete, official announcements)
  over news. If only news exists, prefer two independent articles agreeing.
- Fast-changing prices (fuel, gold, USD) must be tied to a month (`YYYY-MM`); write in `note`
  whether it is a specific day or a monthly average.
- Prices from 2005 to 2008 were in YTL; 1 YTL = 1 TL today, so no conversion is needed.
  Nothing before 2005.
- `current` is "today's price" and goes stale. Update it with its date; the UI shows the date.

## Candidate products and sources

| id | Unit | Candidate source | Expected reliability |
|---|---|---|---|
| gram-altin | 1 g, 24k | TCMB EVDS gold series | very high |
| dolar | 1 USD | TCMB EVDS exchange rates | very high |
| asgari-ucret | net, AGİ dahil (2022 öncesi) | ÇSGB, Resmî Gazete (bekâr işçi ele geçen tutar) | very high |
| big-mac | 1 sandwich | The Economist big-mac-data (GitHub) | high |
| benzin / motorin | 1 L, İstanbul | EPDK bulletins, distributor price archives | high (date it) |
| iphone | launch price, base storage | Apple TR, news archives | medium-high |
| istanbul-ulasim | 1 full fare ride | İBB UKOME decisions, news | medium-high |
| ekmek | per loaf, İstanbul | bread tariff decisions, news (grams changed) | medium |
| cay | Çaykur Rize Turist 1 kg | Çaykur announcements, news | medium |

Dropped on purpose: simit and "computer" (vary too much by place/model to source reliably).
The start year of the game is whatever the verified data supports; target 2010, 2005 where possible.

## EPDK fuel bulletin (benzin, motorin)

Source: EPDK "Petrol Piyasası Bayi Satış Fiyatı Bülteni"
(https://bildirim.epdk.gov.tr/bildirim-portal/faces/pages/tarife/petrol/yonetim/bultenSorgula.xhtml).

- Enter a report date in the query form; the page returns that day's bulletin. The portal only
  serves dates from 2016-01-01. Earlier prices need another source (still TODO).
- The value is the average of the prices that distributors declared for their İstanbul (Avrupa
  yakası) dealers, taxes included. It is a daily value, not a monthly average.
- Take the standard rows "Kurşunsuz Benzin 95 Oktan" and "Motorin". Older bulletins also list
  "(Diğer)" rows (differentiated fuels); do not use them.
- The URL does not encode the date, so the entry title and `note` carry the bulletin date.

## TCMB exchange rates (dolar)

- File per day: `https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml`. The files are ISO-8859-9 encoded.
- Take USD `ForexSelling` ("döviz satış"). Weekends and holidays have no file, so the entry uses the
  first business day of January and its real date.

## ÇSGB minimum wage

- One PDF per period on https://www.csgb.gov.tr/poco-pages/asgari-ucret/ . Take the net amount of a
  single worker. Up to 2021 the PDF marks it "(**) Net ele geçen asgari ücrete X TL asgari geçim
  indirimi ilave edilmiştir", so the number is net with AGİ. From 2022 no income or stamp tax is
  calculated, so net is simply gross minus SGK and unemployment premiums.
- 2016-2021 PDFs cover the whole year, earlier ones and 2022/2023 cover the first half. July
  changes (2022, 2023, 2025) are not in the data yet.

## Economist Big Mac Index (Türkiye)

- The Turkey series repeats the same price for several consecutive observations (for example
  10.75 from 2017 to 2019). We cannot tell a real unchanged price from a carried-forward value,
  so only January observations that differ from the previous one are used. Existing entries stay.

