// Banter, easter eggs and receipt comments. Pure module, no DOM access.
import { formatNumber } from './format.js';
import { pickFresh } from './cashier.js';

export const OVER_COMMENTS = [
  'O parayla o zaman bakkalı komple alırdın!',
  'Bu paraya o zaman yanında çırak da verirlerdi.',
  'Bakkal bu parayı görse defteri kapatırdı!',
  'Abi, o parayla bütün mahalleye ısmarlardın!',
  'Annen bu kadar verdiğini duysa geri yollardı!',
  'Pazarcı bile bu kadar isteyemezdi, utanırdı.',
]

export const UNDER_COMMENTS = [
  'O paraya ancak poşetini verirlerdi.',
  'Bakkal bu parayı görse \'sonra getirirsin\' derdi.',
  'Bu parayla pazarcı yüzüne bile bakmazdı!',
  'O kadar ucuz olsa annem stok yapardı!',
  'Yeğenim, bu paraya ancak kokusunu alırsın.',
  'Dayım bile bu kadar pazarlık edemezdi!',
]

// Wages, pensions, grants and limits are amounts people get, not prices: "fiyat" and "kasiyer"
// jokes read wrong there.
export const AMOUNT_OVER_COMMENTS = [
  'Keşke o kadar verselerdi, düğünü erken yapardık!',
  'O kadar alan, bakkal borcunu bir haftada kapatırdı.',
  'Valla o kadar olsa herkes erkenden emekli olurdu.',
  'Bu kadar alan, bayramda bütün sülaleye harçlık dağıtırdı!',
]

export const AMOUNT_UNDER_COMMENTS = [
  'O kadarla ay sonu değil, hafta sonu gelmezdi.',
  'Bu kadar az olsa annem bizi dayıya yollardı.',
  'O parayla ev geçinmez, bakkal defteri taşardı.',
  'Az demişsin, o kadar da kötü değildi durum!',
]

export const PRODUCT_POOLS = {
  'plastik-poset': [
    'Poşet ister misin abi, yoksa kucakta mı taşıyacaksın?',
    'Evde poşet dolu poşet var, yine de kasada bir tane alırız.',
    'Annem hâlâ her poşeti katlayıp çekmeceye saklar.',
    'Bez çanta kapının önünde kaldı, yine poşet aldık.',
  ],
  ekmek: [
    'Bozuk yoksa yerine sakız vereyim mi gardaş?',
    'Eve gelene kadar ucunu yemeyen yoktur.',
    'Dönerken ekmek almayı unutma, annen kapıda bekliyor.',
    'Bayatı bile atılmaz, ekmek öpülüp yüksek yere konur.',
  ],
  'sigara-marlboro': [
    'Doktor bırak diyor, cüzdan da artık aynı şeyi diyor.',
    'Bakkal paketi uzatmadan "her zamankinden mi abi?" der.',
    'Bir dal versene diyen arkadaş hiç kendi paketini almaz.',
    'Yeni yıl kararı yine şubata kadar dayandı, hacı.',
  ],
  benzin: [
    'Pompacı "fulle mi abi?" der, sen "şöyle biraz koy" dersin.',
    'Pompacı camı silerken sen göstergeye dua edersin.',
    'Bayramda memlekete giderken depo hesabı baştan yapılır.',
    'Dayım hâlâ "eskiden bununla İstanbul\'a giderdik" der.',
  ],
  motorin: [
    'Mazot kokusu gelince dayının traktörü aklıma gelir.',
    'Kamyoncu abiler mola yerinde çayı bunu konuşarak içer.',
    'Minibüs şoförü bozuk para sayarken bunu düşünür valla.',
    'Depo dolarken cüzdan boşalır, bu da fizik kuralı be.',
  ],
  'big-mac': [
    'Annem "evde köfte var" der, biz yine de buraya geliriz.',
    'Dayım bir ısırdı, "bizim köfteci daha iyi" dedi.',
    'Turşusunu ayıklayan arkadaşın turşusu hep bana kalır.',
    'Patatesi araba yolunda bitirmeyen yoktur.',
  ],
  dolar: [
    'Kahvehanede okey bırakılır, dolar konuşulur.',
    'Dayım sabah çayından önce kuru sorar.',
    'Yastık altındaki dolar, anneannenin en sıkı sırrıdır.',
    'Döviz bürosunun tabelasına bakıp iç çekmeyen kalmadı.',
  ],
  euro: [
    'Gurbetçi dayı gelince çikolatayla beraber euro da çıkar.',
    'Almanya\'daki kuzen her tatilde kuru sorar, biz susarız.',
    'Avrupa tatili planı, kuru görünce Ayvalık\'a döndü.',
    'Bozdururken yüz güler, alırken içimiz cız eder.',
  ],
  'gram-altin': [
    'Altın gününde teyzeler bunu çaydan önce konuşur.',
    'Kuyumcu "hayırlı olsun" der, sen pazarlığa girişirsin.',
    'Annem "altın biriktir, kötü gün için" der, haklıdır.',
    'Kuyumcunun vitrinine burnunu dayayan çok olur, bilader.',
  ],
  'ceyrek-altin': [
    'Düğün davetiyesi gelince ilk iş kuyumcuya uğranır.',
    'Takı töreninde mikrofondaki amca kim ne taktı söyler.',
    'Bayram harçlığı yerine çeyrek veren dede efsanedir.',
    'Yastık altındaki çeyrekler annenin emeklilik planıdır.',
  ],
  iphone: [
    'Kutusunu açarken bile eldiven takasım geliyor.',
    'Düşmesin diye kılıfın üstüne kılıf geçirdik, yeğenim.',
    'Taksit sayısını duyunca kasiyerle göz göze geldik.',
    'Annem yine "bunun neyi farklı ki?" diye sordu.',
  ],
  'asgari-ucret': [
    'Maaş yattı, kira, fatura derken akşam oldu bile.',
    'Ayın başında bol keseden, sonunda simit çayla idare.',
    'Annem "az olsun, helal olsun" der, haklıdır da.',
    'Ay sonunu getirmek ayrı bir ustalık ister gardaş.',
  ],
  kopru: [
    'Boğaz manzarası bedava, gişeden geçmek değil.',
    'Karşıya geçerken trafikte Boğaz\'ı doya doya izleriz.',
    'Arabada biri "balık tutanlara bak" demeden geçilmez.',
    'HGS bakiyesi bitince arkadaki korna senfoniye döner.',
  ],
  'taksi-acilis': [
    'Bindin mi saat başlar, daha kapıyı kapatmadın bile.',
    'Taksici "kısa mesafe mi abi?" deyince içim cız eder.',
    'Yağmur yağınca taksi bulmak piyango çıkmasından zor.',
    'Taksimetreye bakmadan oturan adam görmedim valla.',
  ],
  'trafik-cezasi': [
    'Sarıda "geçerim" dedin, kırmızıda geçtin, hadi bakalım.',
    'Ceza gelince ilk soru: erken ödersem indirim var mı?',
    'Işıkta beklemek bedava, acele etmek pahalı.',
    'Arkadan korna çalan da cezayı ödemiyor zaten.',
  ],
  spotify: [
    'Reklam girmesin diye ödedik, kafa rahat şarkı dinliyoruz.',
    'Çalma listesinde arabesk de var, Tarkan da var.',
    'Düğünde DJ\'den önce kuzen telefondan şarkı açar.',
    'Şarkıyı atlayabilmek için cebimiz biraz incindi.',
  ],
  netflix: [
    'Şifre bizde, kuzende, teyzenin oğlunda; hesap kimin belli değil.',
    'Ne izlesek derken akşam bitti, çay da soğudu.',
    'Dizinin son bölümü bitti, abonelik hâlâ devam ediyor.',
    'Annem dizinin ortasında "bu kim şimdi?" diye sorar.',
  ],
  playstation: [
    'Kola kim geçecek diye kardeşler bayram sabahı kavga eder.',
    'Cihaz yetmez, yedek kol, oyun derken masraf büyür.',
    'Babam "ders çalış" dedi, ben "maç bitince" dedim.',
    'Atari salonunda jeton biriktirdiğimiz günler geldi aklıma.',
  ],
  'pasaport-harci': [
    'Uzun süreliğini alalım da bir daha uğraşmayalım dedik.',
    'Vesikalık fotoğrafta hep aranan şahıs gibi çıkarız.',
    'Pasaport çıktı, gidecek yer daha belli değil.',
    'Nüfus müdürlüğünde sıra beklerken simit de alınır.',
  ],
  'yurtdisi-cikis-harci': [
    'Tatil daha başlamadı ama cüzdan çoktan uçağa bindi.',
    'Uçak kalkmadan cüzdan kalkış yapıyor.',
    'Dönüşte bir şey istemiyorlar, o da bir teselli.',
    'Teyze "bize de bir şey getir" dedi, harcı sorunca sustu.',
  ],
  'basvurma-harci': [
    'Haklı olsan da önce harcı yatırırsın, sonra dertleşirsin.',
    'Avukat "önce harcı yatıralım" dedi, dayım kara kara düşündü.',
    'Komşuyla küsmek bedava, mahkemeye gitmek değil.',
    'Adliye koridorunda bekleyen herkes birbirine dert anlatır.',
  ],
  'schengen-vize': [
    'Evrak listesini görünce tatilden vazgeçesim geldi bilader.',
    'Randevu bulan, piyango çıkmış gibi herkese haber verir.',
    'Banka dökümü, maaş bordrosu, bir de dedemin tapusu kaldı.',
    'Ret gelse de ödediğin geri gelmiyor, o da ayrı dert.',
  ],
  'ispark-otopark': [
    'Park yeri bulunca piyango vurmuş gibi sevinirsin.',
    'Bir çay içip çıkarım dedin, saat çoktan doldu.',
    'Görevli abi el sallayınca "geliyorum, geliyorum" dersin.',
    'Arabayı park edince saat sanki daha hızlı akar.',
  ],
  'yht-bilet': [
    'Bayram öncesi bilet bulana helal olsun valla.',
    'Pencereden bozkırı seyrederken çay da gelirse tadından yenmez.',
    'Yan koltuktaki teyze bütün aile ağacını anlatır.',
    'Otobüsteki muavinin kolonyasını özleyen çok, gardaş.',
  ],
  dgs: [
    'Annem "okuyacaksın, adam olacaksın" der, başvuru yapılır.',
    'Mesai çıkışı test çözen abilere kolay gelsin.',
    'Sınav sabahı kalemin ucu kırılırsa yandın.',
    'Komşu teyze "bizim oğlan da girecek" diye her gün sorar.',
  ],
  yds: [
    'Kelime ezberlerken uyuyakalan çok, ben de dahilim.',
    'Paragraf sorusu bitmez, sınav süresi biter yeğenim.',
    'Dayım "biz İngilizceyi filmlerden öğrendik" der.',
    'Sınav çıkışı herkes "kolaydı" der, kimse inanmaz.',
  ],
  sterlin: [
    'Dolarla euro kavga ederken köşede çayını içen kur.',
    'Cebine girince insan kendini lord gibi hisseder.',
    'Londra\'dan dönen kuzen bozukluklarını hediye diye verir.',
    'Kraliçeli parayı görünce dedem "bu kim?" diye sordu.',
  ],
  'gram-gumus': [
    'Anneannenin vitrinindeki gümüş tepsiler bayramda parlar.',
    'Takı yapsan kararır, annen diş macunuyla parlatır.',
    'Altına el yetmeyince gözler gümüşe kayar, hacı.',
    'Bebeğe nazar boncuğuyla gümüş bileklik takılır.',
  ],
  bitcoin: [
    'Komşunun oğlu her bayram sofrasında bundan bahseder.',
    'Dayıma anlattım, "ele gelmeyen paraya güvenmem" dedi.',
    'Kazanınca dâhi, kaybedince "kısmet değilmiş" dersin.',
    'Kuyumcu tanımaz, kahvehanede herkes uzmandır.',
  ],
  airpods: [
    'Yolda kendi kendine konuşuyor sanılan kanka, kulaklık takmış.',
    'Tekini kanepenin arasında kaybetmeyen yoktur.',
    'Annem seslendi, duymadım, kulaklık suçlu çıktı.',
    'Kablo dolaşması bitti, şarj arama derdi başladı.',
  ],
  'milli-piyango-ceyrek': [
    'Çıkarsa evi alacağız, arabayı alacağız, dayıya da veririz.',
    'Yılbaşı gecesi sofrada herkes bileti elinde bekler.',
    'Amorti çıkınca bile bütün aile bayram eder.',
    'Bileti bayiye uzatırken "bu sefer olacak" dersin.',
  ],
  'sinema-ortalama-bilet': [
    'Mısırı film başlamadan bitiren arkadaş hep vardır.',
    'Reklamlar bitmeden film başlamaz, sabır gardaş.',
    'Arka sırada konuşanlara "şşşt" demek de bilete dahil.',
    'Bizim zamanımızda yazlık sinemada çekirdek çitlerdik.',
  ],
  'ea-fc-oyun': [
    'Gol yiyince suçu kola atmak bu oyunun geleneğidir.',
    'Kuzenle maç yapınca bayram sofrasında küslük çıkar.',
    'Annem "yemek soğudu" dedi, maç uzatmaya gitti.',
    'Her yıl yenisi çıkar, eski oyun rafta küser.',
  ],
  'youtube-premium': [
    'Videonun en heyecanlı yerinde reklam çıkmaz artık.',
    'Yemekte dizi açan baba için huzur garantisi.',
    'Ekran kapansa da türkü çalmaya devam eder, oh be.',
    'Reklamı atla tuşunu aramaktan parmak yoruldu yahu.',
  ],
  'amazon-prime': [
    'Kapı çalınca "benim kargom mu?" diye koşmayan yoktur.',
    'Bir pil alsan bile kapına kadar getirirler.',
    'Kuryeyle artık bayramlaşacak kadar samimiyiz abi.',
    'Kargo için alınır, diziler için kalınır.',
  ],
  'disney-plus': [
    'Çocuklar çizgi film açar, babası da yanında izler.',
    'Aynı çizgi filmi her gün izletiriz, şarkısı dilimizde.',
    'Kumandayı çocuğa kaptırdın mı geri alamazsın.',
    '"Ne izlesek?" derken çay soğur, uyku gelir.',
  ],
  'togg-t10x': [
    'Trafikte görünce herkes dönüp bir daha bakar.',
    'Benzinliğe uğramaz, priz başında muhabbet başlatır.',
    'Kırmızı ışıkta ses çıkmayınca dayım "stop etti" sandı.',
    'Ekranına bakınca araba mı tablet mi karar veremedik.',
  ],
  'fiat-egea-easy': [
    'Taksiden filoya, her sokakta en az bir tane vardır.',
    'Bagajına memleket erzağını sığdıran emektar.',
    'Sanayideki usta parçasını gözü kapalı bulur.',
    'Bayramda köye giderken bagaj, yolcudan önce dolar.',
  ],
  simit: [
    'Simitçi abi "taze" diyorsa sorgulamayacaksın, o kadar.',
    'Çay ocağından bir çay, bir simit; kahvaltı tamam, yürü.',
    'Susamı yere dökülür, güvercinler sabahtan sıraya girer.',
    'Yanına beyaz peynir koydun mu, otel kahvaltısı ne ki?',
  ],
  'alkol-cezasi': [
    'Üfle dediler, üfledik; keyif de gitti cüzdan da.',
    '"İki kadeh bir şey yapmaz" diyen dayıyı dinleme yeğenim.',
    'Taksi parasına kıyamayan, şimdi taksiye özenir.',
    'Rakı sofrası güzel de anahtarı masaya bırakıp kalkacaksın.',
  ],
  fitre: [
    'Annemin bayram arifesinde ilk sorusu: "Fitreyi verdin mi?"',
    'Ver gitsin evladım, Allah bereketini katar, derdi dedem.',
    'Kimin elinden çıktığı bilinmez, bir sofraya sevinç olur.',
    'Bayramdan önce verilince insanın içi bir rahatlar valla.',
  ],
  'bedelli-askerlik': [
    'Davul zurna yok, asker uğurlaması banka şubesinde yapıldı.',
    'Dayı söylendi: "Biz şafak sayardık, siz taksit sayıyorsunuz."',
    'Askerlik anısı sorulunca anlatılacak tek şey: tıraş.',
    'Kınayı yaktılar, kuzu kuzu dekontu yatırmaya gitti.',
  ],
  'ehliyet-harci': [
    'Daha direksiyona dokunmadan vezne sırasında terledik.',
    'Babanın arabasını istemenin resmî ilk adımı bu kâğıt.',
    'Hocam "yarım debriyaj" dedi, ben hâlâ evrak peşindeyim.',
    'Ehliyet daha gelmeden annem "yavaş git oğlum" demeye başladı.',
  ],
  'imei-kayit-harci': [
    'Kuzen Almanya\'dan telefon getirdi, hesabı bize kaldı.',
    '"Orada yarı yarıya" lafının devamını kimse anlatmaz.',
    'Şebeke yok yazısını görünce bilader, keyif de kalmadı.',
    'Telefona pasaport yetmedi, bir de kimlik çıkardık.',
  ],
  'kurban-vekalet-bedeli': [
    'Bayram sabahı gelen "kurbanınız kesildi" mesajı içi ısıtır.',
    'Bizim payımız da uzaktaki bir sofraya sıcak bir aş olur.',
    'Babaannem "Allah kabul etsin" demeden kahvaltıya oturmazdı.',
    'Vekâleti verdin, gönlün rahat; bayramlaşmaya geçelim.',
  ],
  'arac-muayene-ucreti': [
    'Muayeneden önce arabayı gelin gibi yıkayan bir tek dayımız.',
    'Fren testi arabada, sabır testi bekleme salonunda.',
    '"Ağır kusur" lafını duyunca araba değil sahibi titrer.',
    'Usta "geçer bu abi" dedi, ama içimiz rahat etmedi.',
  ],
  'aile-cuzdani': [
    'Nikâh şekeri biter, cüzdan çekmecede ömür boyu kalır.',
    'Evet dedin, cüzdanı aldın; gerisi kayınvalideyle hallolur.',
    'Annem "cüzdanı kaybetme, sonra uğraşırsın" diye tembihledi.',
    'Düğünde takılar konuşulur, cüzdanı kimse sormaz.',
  ],
  'surucu-belgesi-bedeli': [
    'Fotoğraftaki sen ile aynadaki sen pek anlaşamaz.',
    'Polis "ehliyet ruhsat" deyince cüzdanda kazı başlar.',
    'Kâğıt ehliyetin buruşuğuna alışmıştık, bu kart fazla şık.',
    'Kartı aldın gardaş, şimdi babayı arabaya ikna etmek kaldı.',
  ],
  'arac-tescil-belgesi': [
    'Arabanın nüfus cüzdanı, torpidonun baş tacı.',
    'Torpidoda peçete, şeker, fatura; ruhsat en dipte.',
    'Araba senin ama bunu kanıtlayan bu küçük kart.',
    'Galerici "evrak tamam abi" dedi, biz yine de dönüp baktık.',
  ],
  'kimlik-karti': [
    'Fotoğrafçı "gülmeyin" dedi, sonuç ortada.',
    'Eski mavi pembe cüzdan gitti, cebe sığan kart geldi.',
    'Banka, kargo, hastane; herkesin ilk istediği kart bu.',
    'Nüfus müdürlüğünde sıra beklerken bütün mahalleyle tanıştık.',
  ],
  'noter-asgari-ucret': [
    '"Aslı gibidir" damgası yiyen fotokopi bir anda ağırlaşır.',
    'Mühür sesi gelmeden bizim memlekette hiçbir iş bitmez.',
    'Tek imza için geldik, sıra numarası aldık, çay da içtik.',
    'Noterden çıkınca insan kendini avukat gibi hisseder.',
  ],
  mtv: [
    'Araba otoparkta yatsa da vergi takvimi yürür, abi.',
    'Benzin ayrı, sigorta ayrı, bir de bu çıktı başımıza.',
    'Dayım "bu araba bana evlat gibi" diyor, evlat da masraflı.',
    'Ödeme ayı gelince araba bir anda ağırlaşır.',
  ],
  otogaz: [
    'Bagaja tüp girince bavullar arka koltuğa taşındı.',
    'Benzine geçme düğmesine basınca cüzdan bir irkilir.',
    'Taksici abi her fırsatta "gazla gidiyoruz, kafan rahat" der.',
    'Bagajı açan herkes önce tüpe, sonra sana bakar.',
  ],
  'istanbul-ulasim': [
    '"Yetersiz bakiye" sesini duyan bütün otobüs dönüp bakar.',
    'Arkadan "basabilir misin kanka?" diyen hep çıkar.',
    'Şoför "arkaya doğru ilerleyelim" dedi, arkada yer yoktu.',
    'Kartı okutunca jetonlu günleri özleyen dayılar var.',
  ],
  'osmangazi-koprusu': [
    'Körfezi dolaşmaya gerek kalmadı, ama hesap ayrı tabii.',
    'Manzaraya doyamadan kendini öbür yakada buldun.',
    'Feribotta çay simit keyfi gitti, yerine gişe geldi.',
    'Dayım hâlâ "eskiden feribotu beklerdik, ne güzeldi" der.',
  ],
  'avrasya-tuneli': [
    'Denizin altından geçiyorsun, balıklara selam söyle.',
    'Köprü trafiğinden kaçan soluğu burada alır.',
    'Annem tünelde nefesini tutuyor, çıkınca "oh" diyor.',
    'Tünelden çıkınca "Asya mı Avrupa mı?" diye bir an düşünürsün.',
  ],
  'anadolu-otoyolu': [
    'Dinlenme tesisinde çay, gözleme; yol yorgunluğu biter.',
    'Bolu Dağı\'nda mola vermeden geçen yolcu değildir.',
    'Arka koltuktan "daha gelmedik mi baba?" sesi hiç eksilmez.',
    'Gişeden geçince radyo açılır, türküler sırayla gelir.',
  ],
  'mektup-pulu': [
    'Pulu dilinle ıslatmadıysan mektup yazmış sayılmazsın.',
    'Askerdeki oğluna yazan anaların mektubu bu pulla giderdi.',
    'Postacı amca kapıya gelince bütün sokak pencereye çıkardı.',
    'Mektubu yazdın, pulu yapıştırdın; şimdi bekle yeğenim.',
  ],
  'iski-su': [
    'Fatura gelince evdeki bütün musluklar elden geçer.',
    'Banyoda uzun kalanın kapısı dışarıdan çalınır.',
    'Annem bulaşığı yıkarken musluğu açık bırakana kızardı.',
    'Damlayan musluk sesi gece insanın vicdanını yoklar.',
  ],
  'okul-servisi': [
    'Korna sesini duyan çocuk tek ayakkabıyla kapıya fırlar.',
    'Ev okulun dibinde olsa bile o servise binilecek, o kadar.',
    'Arka koltuk kapma yarışı nesilden nesile sürüyor.',
    'Servis ablası "kemerler takılsın" deyince herkes hizaya girer.',
  ],
  'firin-ekmegi': [
    'Eve varana kadar ucu koparılmamış ekmek görülmemiştir.',
    'Annem "ekmeği yere düşürme" derdi, öper başına koyardık.',
    'Fırıncı abi "sıcak geldi" dedi mi, sıra kapıya uzanır.',
    'Akşam "bir ekmek al gel" diye yollanan çocuk hep bizdik.',
  ],
  'ehliyet-esinav': [
    'Akü kutup başlarını ezberlemek ehliyetin ilk kuralı.',
    'İlk yardım sorularında herkes bir anda doktor kesilir.',
    'Kursta "bu soru kesin çıkar" diyen hocaya inanacaksın.',
    'Trafik işaretlerini yolda değil, test kitabında öğrendik.',
  ],
  'tmo-bugday': [
    'Silo önündeki traktör kuyruğunda çay termosu elden ele.',
    'Nem ölçen cihazın başında köylü derin bir nefes alır.',
    'Dedem bir avuç buğdayı koklayıp "bu sene iyi" derdi.',
    'Harmandan sonra kahvede ilk konu hep buğday olur.',
  ],
  'findik-alim': [
    'Fındık zamanı memlekete dönmeyen akrabaya iyi gözle bakılmaz.',
    'Fındığı yola serip başında bekleyen dayının bakışı başka.',
    'Patoz sesi gelince bütün köy harman yerine toplanır.',
    'Dik yamaçta çuval taşımayan, fındığın kıymetini bilmez.',
  ],
  'cig-sut': [
    'Sağım bitmeden süt kamyonu köy meydanında korna çalar.',
    'Konseyin kararı açıklanınca kahvede okey masası dağılır.',
    'Evin hanımının ayırdığı süt yoğurt olup komşuya gider.',
    'Yem parası konuşulurken inekler ahırdan kulak kabartır.',
  ],
  'emekli-en-dusuk-aylik': [
    'Maaş yatar yatmaz torun harçlığı ilk kalem olur.',
    'Ay başında bankamatik önü emeklilerin buluşma yeri.',
    'Dedem maaş gününe "bayram" der, kahvede çayları o ısmarlar.',
    'Emekli olunca dinlenirim diyen amcamız hâlâ hesap yapıyor.',
  ],
  'dogum-yardimi': [
    'Bebek geldi, bez hesabı başladı.',
    'Akrabalar altınla geldi, devlet de yardımla.',
    'Yardım bir kere gelir, mama her gün gider.',
    'Babaanne geldi, kundak, nazar boncuğu, lohusa şerbeti hazır.',
  ],
  'kyk-burs': [
    'Burs yattığı gün yurtta herkes biraz zengin.',
    'Burs yatana kadar menü belli: makarna, yine makarna.',
    'Annesine "yetiyor anne" diyen her öğrenci biraz kahramandır.',
    'Ay sonu yaklaşınca evden gelen koli bayram gibi açılır.',
  ],
  'aclik-siniri': [
    'Annem pazar listesini yazar, siler, yine yazar.',
    'Ev sofrası artık hesap makinesiyle kuruluyor.',
    'Pazar filesi her ay biraz daha hafif geliyor, ah be.',
    'Bakkalın veresiye defteri yine mahallenin dertleşme yeri.',
  ],
  'kyk-yurt-ucreti': [
    'Oda küçük, ranza dar ama hayaller kocaman.',
    'Çamaşır makinesi sırası sınav sırasından uzun.',
    'Annemin yaptığı börek yurda gelince koridor kalabalıklaşır.',
    'Ev özlemi her akşam su ısıtıcısında demlenen çayla geçer.',
  ],
  'emekli-bayram-ikramiyesi': [
    'Bayram harçlığını bu sefer dede değil devlet verdi.',
    'Torunlar bayramda dedenin elini bu sefer çifte öptü.',
    'Bayram şekeri babaanneden, harçlık dededen; hesap tamam.',
    'Bayramlaşma bitmeden ikramiye çoktan dağıtılmış.',
  ],
  'kidem-tavani': [
    '"İstifa edersem yanar mı?" sorusunun cevabı burada.',
    'Patronla vedalaşırken en çok konuşulan madde bu.',
    'Hesap makinesini en çok işten ayrılırken kullanırız.',
    'Babam "tazminatı almadan çıkma oğlum" diye tembihler.',
  ],
  yks: [
    'Sınav sabahı annenin hazırladığı kahvaltı boğazdan geçmez.',
    'Kurşun kalem yedekli, silgi yedekli, kalp çarpıyor.',
    'Komşu teyze ilk sorar: "Hangi bölümü kazandı bizimki?"',
    'Bir ailenin bütün heyecanı tek optik formda.',
  ],
  'kpss-lisans': [
    'Memuriyet hayali bir optik formla başlar.',
    'Kütüphane masası ikinci ev, çay ocağı da mutfak olur.',
    'Genel kültür sorusu geldi mi, genel moral bozulur.',
    'Atanma haberi gelince bütün mahalle duyar, lokum dağıtılır.',
  ],
  'kpss-onlisans': [
    'Teyzem her bayram sorar: "Atandın mı yavrum?"',
    'Test kitapları raftan taşar, umut eksilmez.',
    'Paragraf soruları çay demlemekten uzun sürer.',
    'Sınav yeri uzak çıktıysa sabah ilk minibüse yetişeceksin.',
  ],
  ales: [
    'Sayısal mantık soruları bizi bizden aldı, hocam.',
    'Akademisyenlik hayali basit bir problemle başlar.',
    'Sözelde paragraf, sayısalda saç baş.',
    '"Bir ALES daha mı?" dedirten tanıdık sınav.',
  ],
  msu: [
    'Kısa saç, düzgün yaka, yedek kalem; hazırız komutanım.',
    'Disiplin daha sınav salonunda başlar.',
    'Ailenin gururu olacak çocuk önce optik doldurur.',
    'Dede "bizim oğlan subay olacak" diye kahvede herkese anlattı.',
  ],
};

export const HINT_LINES = [
  'Dur, barkodu bir okutayım…',
  'Rulo bitmiş, yenisini takıyorum…',
  'Yazıcı ısınıyor, sen bir çay koy…',
  'Abi bir saniye, defterden bakıyorum…',
  'Müdüre sesleniyorum, eski listeyi getirsin…',
  'Kâğıt sıkıştı, dur bir çekeyim…',
]

const YEAR_ANCHORS = {
  // Shown for every month of the year, so no sentence may pin a season (Pokémon Go came in July,
  // the lockdown in March).
  2016: "Pokémon Go'nun çıktığı, herkesin telefonla sokakta yaratık kovaladığı yıl.",
  2020: 'Evde ekmek yapıp bidonlarla kolonya stokladığımız karantina yılı.',
  2023: 'Cumhuriyetimizin yüzüncü yaşını gururla kutladığımız tarihi yıl.',
};

function pick(pool, rng = Math.random, recent = []) {
  return pickFresh(pool, recent, rng);
}

/**
 * Return one contextual comment for the receipt result screen or null.
 * Prioritizes product easter eggs (when available, 45% chance), then extreme over/under guesses.
 */
export function contextComment(params, rng = Math.random, recent = []) {
  const { direction, factor, productId, amount = false } = params ?? {};
  if (productId && PRODUCT_POOLS[productId]) {
    if (rng() < 0.45) {
      return pick(PRODUCT_POOLS[productId], rng, recent);
    }
  }

  if (direction === 'over' && factor >= 2.5) {
    return pick(amount ? AMOUNT_OVER_COMMENTS : OVER_COMMENTS, rng, recent);
  }

  if (direction === 'under' && factor >= 2.5) {
    return pick(amount ? AMOUNT_UNDER_COMMENTS : UNDER_COMMENTS, rng, recent);
  }

  return null;
}

/**
 * Return a random cashier comment when the player requests a hint.
 */
export function hintComment(rng = Math.random, recent = []) {
  return pick(HINT_LINES, rng, recent);
}

/**
 * Return a short Turkish time-capsule sentence for verified milestone years, or null.
 */
export function yearAnchor(year) {
  const y = Number(year);
  return YEAR_ANCHORS[y] ?? null;
}

/**
 * Year anchor gated by memory: `shown` maps year -> question counter when it was last shown.
 * A year's anchor returns at most once per `gap` questions. Returns { text, shown } (new memory).
 */
export function gatedYearAnchor(year, shown = {}, counter = 0, gap = 10) {
  const text = yearAnchor(year);
  const last = shown[Number(year)];
  if (!text || (last !== undefined && counter - last < gap)) return { text: null, shown };
  return { text, shown: { ...shown, [Number(year)]: counter } };
}

/**
 * For 2005-2008 only: return old-lira (pre-redenomination) equivalent text, or null.
 */
export function ytlNote(year, price) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2005 || y > 2008) return null;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  const oldLira = Math.round(price * 1_000_000);
  return `Yeni Türk Lirası dönemi: eski parayla ${formatNumber(oldLira)} lira`;
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
  // "TAM İSABET" only for a real bull's-eye: at 90 the verdict still says "biraz az".
  if (clamped >= 98) return 'TAM İSABET';
  if (clamped >= 75) return 'ÇOK YAKIN';
  if (clamped >= 50) return 'FENA DEĞİL';
  if (clamped >= 20) return 'BİRAZ UZAK';
  return 'ÇOK UZAK';
}
