// Banter, easter eggs and receipt comments. Pure module, no DOM access.

export const OVER_COMMENTS = [
  'Gelecekten mi geliyorsun, o fiyata henüz gelmedik!',
  'Dur bakalım, fiyatlar henüz o kadar yükselmedi.',
  'Zamlar aklını biraz karıştırmış sanki.',
  'Dur yahu, o seviyelere gelmemize biraz daha zaman var.',
  'Gelecek günlerin zamlarını şimdiden yüklemişsin.',
  'Hangi yılın faturası bu, birkaç sene ilerdesin.',
];

export const UNDER_COMMENTS = [
  'O paraya bugün sadece boş kutusunu verirler.',
  'En son ne zaman alışverişe çıktın, her şey çok değişti.',
  'Eski güzel günlerin hayaline fazla dalmışsın.',
  'Bu parayı uzatsan kasiyer ne diyeceğini bilemezdi.',
  'O fiyata ancak vitrindeki fotoğrafına bakabilirsin.',
  'Rüya gibi bir fiyat ama gerçekler maalesef çok başka.',
];

export const PRODUCT_POOLS = {
  'plastik-poset': [
    'Poşet ister misiniz, yoksa kucağınızda mı taşırsınız?',
    'Çift kat yapayım mı abi, yırtılırsa karışmam.',
    'Eskiden marketler tomar tomar dağıtırdı, hey gidi.',
    'Poşete para vereceğimiz aklına gelir miydi hiç?',
  ],
  'ekmek': [
    'Bozuk yoksa yerine sakız vereyim mi abi?',
    'Fırından yeni çıktı, sıcacık ama fiyatı yakmasın.',
    'Köşedeki bakkal veresiye defterini çoktan kapattı.',
    'Askıda ekmek var ama askıda fiyat maalesef yok.',
  ],
  'sigara-marlboro': [
    'Sağlığa zararlı olduğu kadar cebe de zararlı.',
    'Paketin üstündeki uyarılar fiyattan daha az korkutucu.',
    'Tiryakiye dert, bakkala hesap, cebe hüzün.',
    'Ateşi olan var mı bilmem ama dumanı pahalıya patlıyor.',
  ],
  'benzin': [
    'Depoyu doldurmak mı, yoksa biraz koyup idare etmek mi?',
    'Fişi muhasebeye verirsin de cebindeki sızıyı kime?',
    'Pompacı bile fiyatı söylerken gözlerini kaçırıyor.',
    'Kontak çevirmeden önce derin bir nefes al bence.',
  ],
  'motorin': [
    'Vergisi yakıtından daha ağır çeken bir efsane.',
    'Depo dolarken cüzdan boşalır, bu bir fizik kuralı.',
    'Mazot kokusu nostaljik ama faturası gayet güncel.',
    'Pompada sayaç, su sayacı gibi dönüyor.',
  ],
  'big-mac': [
    'İçindeki turşu dilimi bile daha değerliydi sanki.',
    'Menüyü büyük boy yaparken iki kez düşündüren dönemler.',
    'Köftesi ince ama yarattığı ekonomik etki devasa.',
    'Büyük boy içecek alsak bütçe tamamen çökerdi.',
  ],
  'dolar': [
    'Tabelaya her baktığımızda tansiyonumuz yükselirdi.',
    'Yeşilin en sevilen ama en çok üzen tonu.',
    'Yastık altı sakinleri bu tahmine bıyık altından güler.',
    'Döviz bürosunun önündeki kuyruklar film şeridi gibi.',
  ],
  'euro': [
    'Avrupa hayalleri kurarken cüzdandan gelen acı ses.',
    'Bozdururken yüz güldürür, alırken can yakar.',
    'Kuru takip etmekten hepimiz ekonomist kesildik.',
    'Gurbetçi akrabaların havasından geçilmeyen yıllar.',
  ],
  'gram-altin': [
    'Düğünde takmaya kalksan akrabalık bağları sınanır.',
    'Kuyumcunun vitrinine uzaktan bakma devri.',
    'Gramı bile ağır, cüzdanda taşıması ayrı dert.',
    'Altın günü yapan teyzeler bu fiyata bayılırdı.',
  ],
  'ceyrek-altin': [
    'Yastık altı yatırımlarının göz bebeği.',
    'Düğün davetiyesi gelince içi cız edenler kulübü.',
    'Kurdele takacak yer bulamadığımız o görkemli günler.',
    'Eskiden çeyrek takana zengin gözüyle bakılmazdı.',
  ],
  'iphone': [
    'Kutusunu açarken bile eldiven takasım geliyor.',
    'Her yeni modelde fiyatı duyan bir kez daha şaşırıyor.',
    'Taksit sayısı azaldıkça düşünme süresi uzadı.',
    'Kılıf ve ekran koruyucu için ayrı bütçe lazım.',
  ],
  'asgari-ucret': [
    'Girdiği gibi çıkan o kutsal ama mahzun bütçe.',
    'Ayın ilk haftası zengin, son üç haftası derviş.',
    'Hesaba yattığı an market poşetinde buharlaşan tutar.',
    'Simit çay hesabını bile zorlayan hayat standartları.',
  ],
  'kopru': [
    'Karşıya geçmek mi pahalı, geri dönmek mi bilemedik.',
    'Manzara harika ama gişeler göz yaşartıyor.',
    'Boğazı izlemenin de bir bedeli vardı elbet.',
    'Hızlı geçiş sisteminden çok hızlı para çekiş sistemi.',
  ],
  'taksi-acilis': [
    'Kısa mesafe gideceksen taksiciyle baştan anlaş abi.',
    'Kapıyı açtığın an başlayan o tatlı gerilim.',
    'Taksimetre değil sanki zamana karşı yarış pisti.',
    'Yağmur yağınca taksi bulmak fiyattan daha zor.',
  ],
  'trafik-cezasi': [
    'Hata yapma lüksünün olmadığı o pahalı kavşaklar.',
    'Erken ödersen indirim var tesellisiyle geçen ömür.',
    'Işıkta durmak bedava, dalgınlık ateş pahası.',
    'Flaş patlayınca fotoğraf çekildik sanmıştık.',
  ],
  'spotify': [
    'Müzik ruhun gıdasıydı, faturası da cüzdanın cezası.',
    'Reklamsız dinlemenin bedeli hafiften ağır gelmeye başladı.',
    'Şarkıyı atlama hakkı için verilen küçük fedakarlık.',
    'Çalma listesi yaparken abonelik ücretini düşünmek.',
  ],
  'netflix': [
    'Şifreyi ortak kullanan akrabalar tedirgin.',
    'İzleyecek bir şey bulamadan uyuyakaldığın üyelik.',
    'Dizi bitti ama aylık ödemesi bir türlü bitmiyor.',
    'Aynı anda kaç ekran açabiliyoruz diye hesaplayanlar.',
  ],
  'playstation': [
    'Cihaz yetmiyor; kumandası, oyunu derken masraf büyüyor.',
    'Kardeş payı yapalım desek kol fiyatı can yakıyor.',
    'Gençliğimiz ekrana bakarak, bütçemiz eriyerek geçti.',
    'Grafikler gerçeğe yakın, etiket gerçeklerden de sert.',
  ],
  'pasaport-harci': [
    'Vize başvurusu yapmadan önce deftere servet dökmek.',
    'On yıllık alalım da kafamız rahat etsin dedirten harç.',
    'Sayfaları boş kalsa da damgası çok kıymetli.',
    'Yurt dışı hayali pasaport kuyruğunda başlar.',
  ],
  'yurtdisi-cikis-harci': [
    'Tatil henüz başlamadı ama kasa çoktan açıldı.',
    'Havalimanında ilk bilet değil, ilk harç gelir.',
    'Uçak kalkmadan cüzdan kalkış yapıyor.',
    'Gidiş pulu ucuz değil, dönüşü bedava sanma.',
  ],
  'basvurma-harci': [
    'Dava açmadan önce mahkeme kapısında ilk duran şey bu harç.',
    'Haklı olsan da önce pul yapıştırırsın, sonra dilekçe okunur.',
    'Dosya kapağı ucuz, kapıdan girmek ise kasayı yoklar.',
    'Adalet arayanın ilk durağı gişe, ikincisi bekleme salonu.',
  ],
  'schengen-vize': [
    'Başvuru reddedilse bile parayı peşin alan konsolosluk.',
    'Evrak toplama stresi fiyattan daha çok yoruyor.',
    'Seyahat planı yapmadan önce bütçeyi eriten başvuru.',
    'Randevu bulabilenler kendini şanslı sayıyordu.',
  ],
};

export const HINT_LINES = [
  'Dur abi, barkodu okutayım hemen…',
  'Reyonda etiketi düşmüş, depoya sorup geliyorum…',
  'Müdüre sesleniyorum, eski listeyi çıkarsın…',
  'Sistem biraz yavaş, eski fiyatı bulmaya çalışıyorum…',
  'Kasada sıra oluştu ama senin için arşive bakıyorum…',
  'Katalog biraz tozlanmış, sayfaları çeviriyorum…',
];

const YEAR_ANCHORS = {
  2016: 'Bütün yaz sokaklarda herkesin harıl harıl Pokémon peşinde koştuğu o meşhur dönem.',
  2020: 'Evlerde ekmek yapıp bidonlarla kolonya stokladığımız karantina günleri.',
  2023: 'Cumhuriyetimizin yüzüncü yaşını gururla kutladığımız tarihi yıl.',
};

function pick(pool, rng = Math.random) {
  const index = Math.floor(rng() * pool.length);
  return pool[Math.max(0, Math.min(index, pool.length - 1))];
}

/**
 * Return one contextual comment for the receipt result screen or null.
 * Prioritizes product easter eggs (when available, 45% chance), then extreme over/under guesses.
 */
export function contextComment(params, rng = Math.random) {
  const { direction, factor, productId } = params ?? {};
  if (productId && PRODUCT_POOLS[productId]) {
    if (rng() < 0.45) {
      return pick(PRODUCT_POOLS[productId], rng);
    }
  }

  if (direction === 'over' && factor >= 2.5) {
    return pick(OVER_COMMENTS, rng);
  }

  if (direction === 'under' && factor >= 2.5) {
    return pick(UNDER_COMMENTS, rng);
  }

  return null;
}

/**
 * Return a random cashier comment when the player requests a hint.
 */
export function hintComment(rng = Math.random) {
  return pick(HINT_LINES, rng);
}

/**
 * Return a short Turkish time-capsule sentence for verified milestone years, or null.
 */
export function yearAnchor(year) {
  const y = Number(year);
  return YEAR_ANCHORS[y] ?? null;
}

/**
 * For 2005-2008 only: return old-lira (pre-redenomination) equivalent text, or null.
 */
export function ytlNote(year, price) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2005 || y > 2008) return null;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  const oldLira = Math.round(price * 1_000_000);
  return `Yeni Türk Lirası dönemi: eski parayla ${oldLira.toLocaleString('tr-TR')} lira`;
}

/**
 * Return the title on the shared score stamp based on average score.
 */
export function stampTitle(averageScore) {
  if (typeof averageScore !== 'number' || !Number.isFinite(averageScore)) {
    return null;
  }
  const clamped = Math.max(0, Math.min(100, averageScore));
  // Plain words a grandparent reads at a glance; the old jokes ("TÜİK BAŞKANI…") repeated and confused.
  if (clamped >= 90) return 'TAM İSABET';
  if (clamped >= 75) return 'ÇOK YAKIN';
  if (clamped >= 50) return 'FENA DEĞİL';
  if (clamped >= 20) return 'BİRAZ UZAK';
  return 'ÇOK UZAK';
}
