# odak.

2027 YKS için tek kullanıcılı, yerel çalışma alanı. Karar yükünü azaltan bir haftalık plan, TYT/AYT kayıtları ve gerçek verilerden gelişim görünümü. Hesap, ücretli servis, Docker veya AI anahtarı gerekmez.

## MacBook kurulumu

Apple Silicon (M1/M2/M3/M4) üzerinde Node.js **24 LTS'nin arm64 sürümü** kurulu olmalı. Terminali Rosetta altında çalıştırma. Kontrol:

```sh
node --version
node -p "process.arch"
```

İlk komut `v24...`, ikincisi `arm64` göstermeli. nvm zaten kuruluysa `nvm install 24` ve `nvm use 24` kullanabilirsin. GitHub'daki private depoya erişebilmek için MacBook'ta kendi hesabınla kimlik doğrula (örneğin GitHub CLI kuruluysa `gh auth login`). Uygulama için GitHub token'ı veya `.env` dosyası gerekmez. Terminalde:

```sh
git clone https://github.com/buraksnn/odak.git
cd odak
npm install
npm run db:migrate
npm run build
npm start
```

Tarayıcıda `http://127.0.0.1:3000` aç. İlk ekranda hazır hedef/müsaitlik profilini düzenle veya hazır profille devam et. Bugün ekranında **Haftalık plan öner** seçeneğini kullan. Başlangıç beyanı gerçek deneme olarak kaydedilmez. Veritabanında örnek sonuç, tamamlanma veya grafik verisi yoktur; konu kataloğu yalnızca boş bir kontrol listesidir.

### Geliştirme modu

```sh
cd odak
npm run dev
```

Dosyaları değiştirdiğinde geliştirme sunucusu arayüzü yeniler. Production ve geliştirme sunucusunu aynı portta eşzamanlı açma. `npm ci`, kilit dosyasındaki sürümlerle bağımlılıkları yeniden kurar; `data/` içindeki verileri silmez. `node_modules` veya `.next` klasörlerini bulut ortamından MacBook'a kopyalama; native bağımlılıkları Mac üzerinde yeniden kur.

Native SQLite paketi için hazır binary bulunmazsa macOS Command Line Tools gerekir:

```sh
xcode-select --install
npm ci
```

İlk komutun açtığı kurulumu bitirdikten sonra `npm ci` çalıştır. Bağımlılık kurulumu veya derleme hata verirse doğrulamaları kapatma; Node sürümünü, `arm64` mimarisini ve Command Line Tools kurulumunu kontrol et.

### Durdurma ve yeniden başlatma

Sunucuyu çalıştırdığın Terminal penceresinde **Ctrl+C** ile durdur. Tarayıcı sekmesini kapatmak sunucuyu durdurmaz. Kayıtlar SQLite dosyasında kalır. Yeniden açmak için:

```sh
cd odak
npm start
```

Kaynak kodu değiştiyse önce `npm run build` çalıştır. Geliştirmeye devam etmek için `npm run dev` kullan. Port doluysa önce açık olan kendi odak sunucunu Ctrl+C ile durdur; başka süreçleri rastgele sonlandırma.

Sunucu varsayılan olarak yalnızca **127.0.0.1** üzerinde dinler. Giriş ekranı yoktur. Portu ağa yönlendirme; iPhone için güvenli dağıtım bu sürüme dahil değildir. iPhone boyutunda arayüz vardır; gerçek iPhone erişimi için ileride kimlik doğrulamalı HTTPS gerekir. Uygulama temel işlevler için internet kullanmaz; ilk paket kurulumu internet gerektirir. Telemetri veya analitik kodu yoktur. Next.js araç telemetrisini kapatmak için komutlara `NEXT_TELEMETRY_DISABLED=1` ekleyebilirsin.

## Kullanım

- **Bugün:** 2–3 görevlik hafif günler, tüm haftayı seçme/düzenleme; tamamla, geri al, kısalt, ertele, atla, bugün müsait değilim. Tamamlama tahmini dakikadır; gerçek süre girişi isteğe bağlıdır. Gelecek görevi tamamlamak engellenir. Sonraki hafta ayrıca önerilebilir.
- **Denemeler:** TYT/AYT doğru–yanlış–boş, soru sayıları, isteğe bağlı sıralama/katılımcı ve not. Bilinmeyen dersin üç alanını da boş bırak; sıfır sonuç için açıkça 0 gir. Deneme adıyla düzenleme/silme, önceki soru biçimini kullanma, CSV indirme.
- **Gelişim:** toplam ve ders netleri, önceki geçerli kayda fark, yeterli veriyle son 3/5 ortalaması ve standart sapma. Aynı gün kayıtları giriş sırasıyla değerlendirilir. Eksik sonuçlar toplam grafiğini bölür. Dört haftanın tahmini plan tamamlama oranı; konu durumu, tekrar işareti, not ve son tekrar tarihi. Gerçek net artışları bir çalışma görevine nedensel olarak bağlanmaz.
- **Ayarlar:** hedef, beyan ve öncelik; haftalık üst sınır; günlük saatler ve yorgunluk kapasitesi; okul/dershane/ulaşım/dinlenme blokları; özel günler, yaklaşan denemeler; soru sayıları ve yedekler. Salı–Perşembe okul/dershane arasındaki mevcut 10 dakikalık çakışma açıklaması korunur. Gelecek görevlerle çakışan ayar değişikliği reddedilir: önce ilgili günü seçip görevleri düzenle veya atla. Planlar sessizce yeniden yazılmaz.

İlk hedef haftada 7–9 saattir. Haftanın ortasında başlandığında kalan günler sınırları kadar planlanır; 8 saatin tamamı birkaç güne sıkıştırılmaz. Kapasiteye sığmayan görev borç yaratmaz. Erteleme sonraki 7 günün uygun aralığını arar; yer yoksa açık hata gösterir. Yük artışı yalnızca sen ayarlardan değiştirince olur. “Bugün müsait değilim” kalan görevleri atlar ve o günü kapatır; tekrar açmak için güne özel kapasiteyi düzenle.

### Plan motoru

`lib/planner.ts` arayüzden bağımsızdır. Tarih ve kimlik üreticisi parametreleriyle test edilir. Öncelik puanları: seçilen ders +6, işaretlenen eksik +5, tekrar işareti +4, 14 gün geçen tekrar +3; son ders netinin soru sayısına oranıyla 0–4 puan, en az 3 sonuçta düşüş varsa +1. Aynı konunun hafta içinde tekrarına −5 uygulanır. Böylece matematik önceliği diğer dersleri tamamen dışlamaz. Ders sonucundan belirli bir konunun yanlış olduğu çıkarılmaz.

Günlük kapasite ve haftalık üst sınır içinde 5 dakika adımlarla süre paylaştırılır. Son 14 günde en az 6 görev ve %50 altında tamamlama varsa günler 45 dakikayla sadeleşir. %85 üzerindeki tamamlanma yük artırımı için yalnızca öneri oluşturur. Son 7 günün denemesi için analiz, yaklaşan denemeden önce tekrar ayrılır. Yeni deneme sonuçları **yeni üretilecek** planın önceliklerini etkiler; var olan onaylı görevler otomatik değiştirilmez. Konu “Tekrar” görevi tamamlanırsa tekrar tarihi güncellenir.

### İsteğe bağlı ChatGPT köprüsü

Gelişim → **Haftamı ChatGPT ile analiz et**. Promptu incele/kopyala; kendi hesabında çalıştır. Uygulama hesap, çerez veya API anahtarı almaz. Son 10 deneme, son 14 günün görevleri, gelecek iki haftanın mevcut planı ve zaman kısıtları JSON olarak prompta girer. ChatGPT'ye veri aktarma tercihi sana aittir.

Yanıtı JSON veya tek `json` kod bloğu içeren okunabilir metin olarak yapıştır. Zod şeması `summary` ve `tasks` alanlarını doğrular. Her görev `date`, `start`, `subject`, `topic`, `kind`, `minutes` içerir. Tarih bugün–13 gün sonrası, süre 10–120 dk, günlük en çok 3 görevdir. Önizlemede çakışma ve kapasiteler kontrol edilir; **onay anında tekrar kontrol** edilir. Onay yoksa plana yazılmaz. Aynı yanıt tekrar uygulanamaz. Analizi planı değiştirmeden arşivleyebilirsin. Öneriler kod/komut olarak yürütülmez. Uygulanan gelecekteki görevler normal görevler gibi düzenlenip atlanabilir.

## Veriler ve yedek

SQLite: `data/odak.sqlite`. Drizzle ORM, WAL, atomik transaction, `schema_migrations` tablosuyla sürümlü migration. Tek kullanıcılı küçük yerel uygulama için Zod ile doğrulanmış sürümlü durum belgesi SQLite içinde tutulur. Doğrulama geçmeden mevcut belge değiştirilmez. Başka dosya konumu için tüm migration/başlatma komutlarında aynı mutlak `ODAK_DB_PATH` ortam değişkenini kullan.

En kolay yedek: Ayarlar → **JSON yedeği indir**. Hedef/müsaitlik, denemeler, görevler, konular ve AI analizlerini içerir. Dosyayı kişisel bir klasörde sakla. Geri yükleme şema, sürüm, benzersiz kimlikler, net girdileri ve gelecekteki plan çakışmalarını kontrol eder; kayıt sayıları önizlenir, açık onayla mevcut verinin **tamamı değiştirilir**. Önce yeni bir yedek al. Geçersiz dosya mevcut veriyi değiştirmez. En fazla 12 MB.

İsteğe bağlı veritabanı yedeği (SQLite CLI ile, çalışırken tutarlı yedek):

```sh
mkdir -p backups
sqlite3 data/odak.sqlite ".backup 'backups/odak.sqlite'"
```

Alternatif olarak sunucuyu tamamen durdurup SQLite dosyalarını yedekle. WAL modundayken yalnızca ana dosyayı canlı kopyalama. Silme işlemleri onay ister. `data/`, SQLite dosyaları, `backups/`, standart yedek/CSV isimleri ve `.env*` Git tarafından dışlanır. Özel isimle kaydettiğin kişisel dosyaları da Git'e ekleme. Veritabanı uygulama tarafından şifrelenmez; cihaz disk şifrelemesi/yedek güvenliği sana aittir.

## Kalite kontrolleri

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E testleri production sunucusunu 3100 portunda açar; kişisel veritabanına dokunmadan `data/e2e.sqlite` kullanır (bu dosya yalnızca test içindir ve testler içinde sıfırlanır). Chromium kurulu bulut ortamında:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

Masaüstü ve iPhone 13 ekran boyutunda Chromium çalıştırılır; bu gerçek Safari/WebKit testi değildir. Motor testleri net, giriş doğrulama, eksik veri, ortalamalar, plan, çakışma, erteleme, yük sınırları, geri yükleme, AI onayı ve SQLite kalıcılığını kapsar. Tarayıcı testleri plan, deneme giriş/düzeltme/silme, CSV, yedek geri yükleme, AI onayı, sunucu doğrulaması ve yatay taşmayı kapsar.

## Sınırlar

- **Gerçek Safari üzerinde test yapılmadı.** macOS Safari, iOS Safari, gerçek Apple Silicon MacBook ve gerçek iPhone donanımı bu bulut ortamında test edilmedi. Mobil testler yalnızca iPhone ekran boyutunda Chromium testleridir; Safari uyumluluğunun kanıtı değildir. Sistem fontları, standart form kontrolleri, responsive CSS ve azaltılmış hareket desteği kullanılır.
- Dönemlik ayrıntılı müfredat, sıra tahmini, otomatik AI, ağ üzerinden erişim ve kullanıcı yönetimi yoktur.
- Kaynak kodu değiştirdikten sonra production sunucusunu yeniden build et. Çalışan süreç yeni bir bulut görevine taşınmaz.

- SQLite bağımlılığı native bir modüldür; Linux'ta geçen testler macOS arm64 kurulumunu doğrulamaz. MacBook üzerinde yukarıdaki temiz kurulum ve temel kullanım kontrolü ayrıca yapılmalıdır.
- Yedekten geri yüklemede 12 MB dosya sınırı vardır. Mevcut veriler açık onayla tamamen değiştirilir; birleştirme yapılmaz. Veritabanı şifreli değildir.
- Tek kullanıcılı durum belgesi tek SQLite kaydında tutulur; çok kullanıcılı veya büyük veri hacimli kullanım için tasarlanmamıştır.
- Yeni denemeler mevcut planı geriye dönük değiştirmez. Yeni üretilecek planları etkiler; konu eksikleri deneme ders netinden otomatik çıkarılmaz.

## GitHub'a güvenli aktarım

Yalnızca kaynak kodu ve bağımlılık kilit dosyası sürümlenir. `data/`, `.env*`, SQLite dosyaları, `backups/`, `exports/`, özel anahtar dosyaları, bağımlılıklar ve test çıktıları Git dışında kalır. Bu kurallar daha önce commit edilmiş bir sırrı temizlemez; bu proje için ilk commit içeriği ayrıca denetlenmiştir. Varsayılan profil ve test girdileri kişisel veritabanı kayıtları değildir.

Hedef adres: `https://github.com/buraksnn/odak`. Kodları göndermeden önce deponun **Private** olduğunu doğrula. Aynı isimli depo zaten varsa silme veya yeniden oluşturma; erişim ve gizlilik durumunu kontrol et. Başka bir proje veya `buraksnn/akademi` üzerinde işlem yapma. Private depo oluşturmak uygulamaya giriş koruması eklemez; sunucu yine yalnızca localhost kullanımı içindir.

Bulut ortamından doğrudan gönderim mümkün olmazsa teslim edilen `odak-source.tar.gz` ve `odak.bundle` aynı kaynak commit'ini içerir; veritabanı ve kişisel dosyalar içermez. `odak.bundle` Git geçmişini de korur. MacBook'a indirdikten sonra:

```sh
git clone -b main ~/Downloads/odak.bundle ~/odak
cd ~/odak
git remote set-url origin https://github.com/buraksnn/odak.git
gh auth login
```

GitHub CLI ile erişimi ve gizliliği kontrol et:

```sh
gh repo view buraksnn/odak --json nameWithOwner,isPrivate
```

Depo yoksa GitHub web arayüzünde `buraksnn` hesabında `odak` adıyla **Private** bir depo oluştur; README, lisans veya gitignore ekleyerek başlatma. Alternatif CLI komutu:

```sh
gh repo create buraksnn/odak --private
```

`gh repo view` çıktısında `isPrivate: true` olduğunu doğruladıktan sonra:

```sh
git push -u origin main
```

Uzak depoda başka commit varsa force-push yapma; önce farkları incele. Sonrasında yukarıdaki MacBook kurulum komutlarında `git clone` yerine mevcut `~/odak` klasöründe `npm install` adımından devam edebilirsin.
