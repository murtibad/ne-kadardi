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
    "image": { "src": "img/benzin.svg", "alt": "Benzin pompası", "credit": "Original illustration, CC0" }, // optional
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

## Source kind

`source.kind` is optional and tells players what type of source backs a price. The UI shows a short
Turkish label next to the source; a missing or unknown value shows nothing.

| `kind` | Label | Use when |
|---|---|---|
| `official` | resmî kayıt | A public institution published it: Resmî Gazete, ministries, EPDK, TCMB, ÇSGB, KGM, İBB. |
| `dataset` | yayımlanmış veri | A published third-party dataset, e.g. the Economist Big Mac Index. |
| `news` | haber kaynaklı | News articles, only when no official source exists; use two independent outlets that agree. |
| `derived` | türetilmiş değer | Computed from sourced inputs; the method and inputs go in `note`. |

## Product images

The `image` field in a product is optional. When present, it shows an icon on the question card.
- Icons are original, brand-free SVG files stored in `img/`. No logos, no text elements.
- Each SVG must be `viewBox="0 0 96 96"`, under 3 KB, with no scripts or external references.

## Candidate products and sources

| id | Unit | Candidate source | Expected reliability |
|---|---|---|---|
| gram-altin | 1 g, 24k | World Bank gold price x TCMB rate (derived, see below) | high (market value) |
| dolar | 1 USD | TCMB EVDS exchange rates | very high |
| asgari-ucret | net, AGİ dahil (2022 öncesi) | ÇSGB, Resmî Gazete (bekâr işçi ele geçen tutar) | very high |
| big-mac | 1 sandwich | The Economist big-mac-data (GitHub) | high |
| benzin / motorin | 1 L, İstanbul | EPDK bulletins, distributor price archives | high (date it) |
| iphone | launch price, base storage | Apple TR, news archives | medium-high |
| istanbul-ulasim | 1 full fare ride | İBB UKOME decisions, news | medium-high |
| ekmek | Halk Ekmek (İBB) 250 gr, İstanbul | İBB Halk Ekmek price-rise news (AA, Dünya, Sözcü ...) | high from 2019 |
| kopru | Bosphorus bridge car toll | KGM announcements via news | high; direction rule changed 2022 |
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

## Gram altın (derived value)

There is no free, primary daily source for the Turkish gram gold price (TCMB EVDS needs a personal
API key, Kapalıçarşı and jeweller prices are only in news). So the value is derived, as the data
policy allows when the method and both sources are documented:

`gram altın (TL) = ons altın ($/troy ons) / 31.1034768 x TCMB döviz satış kurunun aylık ortalaması`

- Gold: World Bank Commodity Price Data ("Pink Sheet"), sheet "Monthly Prices", column Gold, in $/troy
  oz. The workbook describes it as the average of daily rates (London afternoon fixing, 99.5% fine,
  until May 2025; spot average from June 2025). Whole dollars. Download page:
  https://www.worldbank.org/en/research/commodity-markets
- Exchange rate: average of the TCMB USD "ForexSelling" over every business day of the same month,
  from the daily XML files (see the TCMB section above); the entry note lists the number of days.
- It is a market value, not a jeweller's selling price (which adds a spread). With ratio-based
  scoring this difference does not matter for the game, and the product unit says "piyasa değeri".
- The XLSX link in the entries is versioned by the World Bank and may change; the download page above
  stays valid.

## Tax estimate (derived value)

For products with compound indirect taxes (currently `iphone`), the result screen computes an estimated tax breakdown matching what a shopper pays at shelf price.

```
shelf = base * (1 + kultur + trt) * (1 + otv) * (1 + kdv)
base = shelf / ((1 + kultur + trt) * (1 + otv) * (1 + kdv))
kulturTL = base * kultur
trtTL = base * trt
otvTL = base * (1 + kultur + trt) * otv
kdvTL = base * (1 + kultur + trt) * (1 + otv) * kdv
totalTax = shelf - base
share = totalTax / shelf
```

- **Order of taxation**: 1% culture share (Kültür Bakanlığı payı) and TRT bandrol are computed directly on the tax-free base price. Special consumption tax (ÖTV) is levied on the base plus culture share and TRT bandrol. Value-added tax (KDV) is levied on the subtotal of everything (base + culture + TRT + ÖTV).
- **Caveats (Estimate, "yaklaşık")**: Retail margins (distributor and store markup) are not separated from the taxable base; the entire shelf price is treated as the taxable amount, making this an estimate ("yaklaşık"). IMEI registration fees are not included.
- **Top tax bracket**: Mobile phones face a tiered ÖTV schedule based on tax base thresholds (matrah). Every iPhone base model listed in the data has a pre-tax value substantially exceeding the highest bracket ceiling, placing it squarely in the 50% ÖTV bracket.
- **Worked example**: iPhone 15 Pro Max at 92,999 TL shelf price in October 2023 (Kültür %1, TRT %12, ÖTV %50, KDV %20) yields: tax-free base 45,722 TL, total tax 47,277 TL = 50.8% tax share.
- **Periods**: Applied only from May 2019 onwards, where verified rates are available:
  - `2019-05` to `2020-02`: KDV 18%, ÖTV 50%, TRT 10%, Kültür 0%
  - `2020-03` to `2022-04`: KDV 18%, ÖTV 50%, TRT 10%, Kültür 1%
  - `2022-05` to `2023-06`: KDV 18%, ÖTV 50%, TRT 12%, Kültür 1%
  - `2023-07` to present: KDV 20%, ÖTV 50%, TRT 12%, Kültür 1%
- Dates outside these periods (e.g. 2014–2018 iPhones) do not show a tax estimate line or breakdown.
- **Display**: The main sentence rounds the share to the nearest whole percent and amounts to the nearest 100 TL via the price formatter. A tap-to-open breakdown details table displays individual amounts rounded to whole TL along with caveat and sourced links.


