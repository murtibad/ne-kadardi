// Names stay <= 13 chars so "Kaynak: <name> (yıl) · haberlerden" fits one row at 360 px.
// Short publisher-style name for a source link, derived from its URL (pure, no DOM).
// The full title stays in the link's title/aria-label; this keeps the receipt line on one row.

// Keyed by hostname without "www."; subdomains match through their parent (see lookup).
const NAMES = {
  'tcmb.gov.tr': 'TCMB',
  'epdk.gov.tr': 'EPDK',
  'csgb.gov.tr': 'ÇSGB',
  'resmigazete.gov.tr': 'Resmî Gazete',
  'osym.gov.tr': 'ÖSYM',
  'meb.gov.tr': 'MEB',
  'btk.gov.tr': 'BTK',
  'kgm.gov.tr': 'KGM',
  'aile.gov.tr': 'Aile Bak.',
  'adalet.gov.tr': 'Adalet Bak.',
  'csb.gov.tr': 'ÇŞB',
  'ptt.gov.tr': 'PTT',
  'iski.gov.tr': 'İSKİ',
  'iski.istanbul': 'İSKİ',
  'ibb.gov.tr': 'İBB',
  'worldbank.org': 'Dünya Bankası',
  'haberturk.com': 'Habertürk',
  'alomaliye.com': 'Alomaliye',
  'bitstamp.net': 'Bitstamp',
  'github.com': 'GitHub',
  'ntv.com.tr': 'NTV',
  'milliyet.com.tr': 'Milliyet',
  'sozcu.com.tr': 'Sözcü',
  'webrazzi.com': 'Webrazzi',
  'takvim.com.tr': 'Takvim',
  'bloomberght.com': 'Bloomberg HT',
  'tgrthaber.com': 'TGRT Haber',
  'hurriyet.com.tr': 'Hürriyet',
  'cnnturk.com': 'CNN Türk',
  'hukukihaber.net': 'Hukuki Haber',
  'medyascope.tv': 'Medyascope',
  'aa.com.tr': 'AA',
  'avrasyatuneli.com': 'Avrasya',
  'donanimhaber.com': 'DonanımHaber',
  'boxofficeturkiye.com': 'Box Office',
  'teknoblog.com': 'Teknoblog',
  'cumhuriyet.com.tr': 'Cumhuriyet',
  'ensonhaber.com': 'Ensonhaber',
  'log.com.tr': 'LOG',
  'dunya.com': 'Dünya',
  'timeturk.com': 'TimeTürk',
  'yeniakit.com.tr': 'Yeni Akit',
  'gzt.com': 'Gazete',
  'karar.com': 'Karar',
  'posta.com.tr': 'Posta',
  'ekonomist.com.tr': 'Ekonomist',
  'milligazete.com.tr': 'Milli Gazete',
  'cnbce.com': 'CNBC-e',
  'webtekno.com': 'Webtekno',
  'evrensel.net': 'Evrensel',
  'diken.com.tr': 'Diken',
  'mynet.com': 'Mynet',
  'ekonomim.com': 'Ekonomim',
  'internethaber.com': 'İnternethaber',
  'trthaber.com': 'TRT Haber',
  'turkis.org.tr': 'Türk-İş',
  'shiftdelete.net': 'ShiftDelete',
  'apple.com': 'Apple',
  'bianet.org': 'Bianet',
  'turkiyegazetesi.com.tr': 'Türkiye Gzt.',
  'birgun.net': 'BirGün',
  'capital.com.tr': 'Capital',
  'lexpera.com.tr': 'Lexpera',
  'ahaber.com.tr': 'A Haber',
  'yenisafak.com': 'Yeni Şafak',
  'sabah.com.tr': 'Sabah',
  'fanatik.com.tr': 'Fanatik',
  'euronews.com': 'Euronews',
  'turmob.org.tr': 'TÜRMOB',
  'dha.com.tr': 'DHA',
  'haber7.com': 'Haber7',
  'memurlar.net': 'Memurlar',
  'aspor.com.tr': 'A Spor',
  'gazetevatan.com': 'Gazete Vatan',
  'habergazetesi.com.tr': 'Haber Gzt.',
  'sanayigazetesi.com.tr': 'Sanayi Gzt.',
  'ekonomigazetesi.com': 'Ekonomi Gzt.',
  'kadimhukuk.com.tr': 'Kadim Hukuk',
  'harbiyehukuk.com': 'Harbiye Hukuk',
  'borsaningundemi.com': 'Borsa Gündemi',
  'yeniankara.com.tr': 'Yeni Ankara',
  'gazetebirlik.com': 'Gazete Birlik',
  'gazetevan.com': 'Gazete Van',
  'haberhurriyeti.com': 'Hürriyeti',
  'egitimsistem.com': 'Eğitim Sistem',
  'muhasebenews.com': 'Muhasebe News',
  'kpmgvergi.com': 'KPMG Vergi',
  'hdisigorta.com.tr': 'HDI Sigorta',
  'benguturk.com': 'Bengütürk',
  'turkgun.com': 'Türkgün',
  'sifiraracal.com': 'Sıfır Araç Al',
  'yenimodelarabalar.com': 'Yeni Model',
  'sol.org.tr': 'soL'
};

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

// A web.archive.org link points at some other site; name that one.
function effectiveHost(url) {
  const host = hostOf(url);
  if (host === 'web.archive.org') {
    const inner = String(url).match(/\/web\/\d+[a-z_]*\/(https?:\/\/.+)$/i);
    if (inner) return hostOf(inner[1]) || host;
  }
  return host;
}

const TWO_PART_TLDS = new Set(['com.tr', 'gov.tr', 'org.tr', 'net.tr', 'edu.tr']);

function fallbackName(host) {
  const parts = host.replace(/^www\./, '').split('.');
  if (parts.length < 2) return '';
  const tail = parts.slice(-2).join('.');
  const label = TWO_PART_TLDS.has(tail) && parts.length >= 3 ? parts[parts.length - 3] : parts[parts.length - 2];
  return label ? label.charAt(0).toLocaleUpperCase('tr') + label.slice(1) : '';
}

// Returns '' when the URL has no usable host, so callers can fall back to the title.
export function sourceName(url) {
  const host = effectiveHost(url).replace(/^www\./, '');
  if (!host) return '';
  const parts = host.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const hit = NAMES[parts.slice(i).join('.')];
    if (hit) return hit;
  }
  return fallbackName(host);
}

// "Bianet (2022)": publisher plus the year of the price; year is skipped when unknown.
export function sourceLinkText(source, date) {
  const name = sourceName(source?.url);
  if (!name) return '';
  const year = /^\d{4}/.exec(String(date || ''));
  return year ? `${name} (${year[0]})` : name;
}
