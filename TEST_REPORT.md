# Borç Takip — Düzeltme ve regresyon test raporu

Tarih: 6 Kasım 2026. A01–A10 düzeltmelerinin kaynak başlangıcı: 2547750cbe1c7eebd91ac83c678808a5a6043051. Gelir satırı, uygulama içi onaylar ve temiz kurulum düzeltmelerinin başlangıcı: 432be063b3abebafc18c193160e268865dbe78c5.
Önceki incelemede doğrulanan A01–A10 hataları düzeltildi. Formların arkasındaki sayfanın kaymasını önleyen S01 de eklendi.
Testlerde üretilmiş örnek kayıtlar kullanıldı.

## Düzeltmeler

| Kod | Sonuç |
|---|---|
| A01 | Eski ödenmiş taksit kayıtları, mevcut tutar ve tarih değişiklikleri korunarak ödeme modeline uyarlanır. Toplu düzenleme yalnızca açık taksitleri değiştirir. |
| A02 | Geri alma yalnızca seçilen ödeme ve ona bağlı gelir düşümünü kaldırır. Diğer kısmi ödemeler ve eski ödenmiş taksitler korunur. |
| A03 | Yerel koleksiyonlar bağımsız okunup doğrulanır. Bozuk koleksiyon diğerlerini boşaltmaz veya açılışı durdurmaz. Ham kayıt korunur; uyarı gösterilir ve üzerine yazma/eşitleme engellenir. Geçerli yedek içe aktarma veya kullanıcının onayladığı telefon kayıtlarını sıfırlama işlemiyle çıkılabilir. |
| A04 | Kimlikler koleksiyon içinde benzersiz olmalıdır. Ödenen taksit sayısı, taksit anahtarları, tutarlar, tarihler, para birimleri ve ödeme/gelir düşümü bağlantıları doğrulanır. Silinmiş borçlara ait arşiv kayıtları geçerli kalır. |
| A05 | Tek taksit ve toplu değişikliklerde borcun toplamı güncel taksit tutarlarından hesaplanır. Tutar daha önce ödenen kısmi miktarın altına indirilemez. |
| A06 | İlk Google bağlantısı/geri yüklemede yükleme katmanı gösterilir. Ekleme, düzenleme, ödeme, silme ve içe aktarma girişleri engellenir. Gelen kayıtlar ve eşitleme sürümü birlikte kaydedilir. Hata durumunda kilit kalkar, yerel kayıt korunur. Normal yükleme sırasında yapılan değişiklikler sonraki eşitlemede gönderilir. |
| A07 | Açık borçlar vade tarihine göre gruplanarak yerel saat 09.00 için önceden planlanır. Aynı gün tek bildirim kullanılır. Tarih/tutar değişince güncellenir, ödeme/silmede iptal edilir, geri almada yeniden planlanır. Geçmiş günlük bildirimin tekrar açılışta yeniden üretilmesi önlenir. |
| A08 | Borç, gelir, gelir düşümü, ödeme arşivi, isim tercihleri ve eşitleme durumu tek atomik yerel kayıtla yazılır. Başarısız yazmada bellek/eski kayıt korunur; formdaki girişler kalır ve başarı onayı gösterilmez. |
| A09 | İsimler Set ile tekilleştirilir; constructor, __proto__, toString gibi adlar da görünür ve seçilebilir. |
| A10 | Aylar → ayın borçları → ekleme/düzenleme geçişlerinde önceki pencere kapanır. Geri dönüş seçilen ayı ve gezilen yılı korur. Ana ekrandan ekleme ayrı tutulur. |
| S01 | Pencere açıkken arka sayfanın konumu sabitlenir. Dokunma/fare kaydırması arkaya geçmez. Son pencere kapanınca önceki konum geri gelir. Küçük ekran, yatay kullanım veya klavye için formun gerekli iç kaydırması korunur. Android geri düğmesi aynı kapatma yolunu kullanır. |
| U01 | Gelir kartları sabit bir ızgara kullanır. Tek seferlik gelirin uzun tarihi tutarı ve silme düğmesini aşağı itmez; tarih kısa ve dile uygun gösterilir. Dar ekranda bütün gelirler aynı yerleşime geçer. |
| U02 | Sistem confirm pencereleri yerine uygulamanın yuvarlak, mavi/yeşil onay penceresi kullanılır. İptal başlangıç odağıdır; klavye odağı pencere içinde kalır. Geri/Escape iptal eder; onaydan sonra kayıt kilidi tekrar kontrol edilir. Gelir silme yeşil, borç silme mavi kullanır. |
| U03 | Android sistem yedeği ve otomatik cihaz aktarımı kaynak manifest ve tüm depolama alanlarını dışlayan XML kurallarıyla kapatılır. Güncelleme veriyi temizlemez. Temiz kurulum Google'a kendiliğinden bağlanmaz. İlk Google bağlantısı mevcut yedeği yükler; yedek yoksa yeni kayıtların bu hesaba kaydedileceği açıklanır. |

## Kayıt uyumluluğu

- Eski ayrı yerel anahtarlar okunur. İlk başarılı yazma, bütün veriyi borc_takip_state_v5 anahtarına aktarır; eski anahtarlar ancak bu yazma tamamlanınca kaldırılır.
- Başarısız geçişte eski kayıtlar silinmez. Geçerli yeni kayıt bulunduğunda bu kayıt esas alınır.
- Drive üzerinde aynı tek yedek dosyası kullanılır. Dil ayarı cihazda kalır.
- Türkçe, İngilizce, Almanca ve Rusça arayüz; tarih, para, hata ve yükleme açıklamalarında korunur. Kullanıcının yazdığı isimler çevrilmez.

## Test sonuçları

| Kontrol | Sonuç |
|---|---|
| Mevcut mantık testi | Geçti |
| Node mantık/dil/düzeltme testleri | 56/56 geçti |
| A01–A09 hata tekrar kontrolleri | 9/9 geçti; artık npm test içinde zorunlu |
| Android yedek politikası testleri | 4/4 geçti; gerçek Capacitor manifest şablonu, tekrar çalıştırma, bileşenlerin korunması ve eksik kuralların reddi |
| Gerçek Chromium senaryoları | 64/64 geçti |
| Saat dilimleri | UTC ve Europe/Istanbul; tarih, ödeme, eşitleme ve bildirim senaryoları ayrıca America/Los_Angeles |
| Üretim CSS derlemesi | npm run build geçti |
| JavaScript sözdizimi ve boşluk kontrolü | Geçti |

### Denenen önemli sınırlar

- Eski ödenmiş taksitlerin dönüşümü; taksit tutarı değişikliği; yeniden açılış ve geri alma.
- Aynı taksitte birden fazla kısmi ödeme; başka taksitlerdeki ödemeler korunarak tek işlemin geri alınması.
- Bozuk JSON, dizi yerine nesne/null ve bozuk koleksiyon elemanı; sağlam gelir ve diğer kayıtların korunması.
- Tekrarlanan kimlikler, negatif/kesirli/sınır dışı ödeme sayısı, geçersiz taksit anahtarları, aşırı kısmi ödeme ve bozuk arşiv bağlantıları.
- İlk Drive indirmesi beklerken kayıt girişlerinin engellenmesi; hata sonrası kilidin kalkması; depolama doluyken geri yüklemenin eski kayda dokunmaması.
- Normal yükleme sırasında gelir eklenmesi ve bu değişikliğin sonraki eşitlemede gönderilmesi.
- Bulut yüklemesinden sonra yerel eşitleme bilgisinin kaydedilememesi; güvenli bekleme ve başarılı yeniden deneme.
- Gelecek gün/ay/yıl vadeleri için 09.00 bildirimi; aynı gün birden fazla borç; yinelenen planlama, ödeme, geri alma, silme ve izin reddi.
- Depolama hatasında formun korunması; ödeme, geri alma, düzenleme, silme ve veri değiştirme işlemlerinin yarım kalmaması.
- Gerçek tarayıcıda kota hatası üretme, yeniden deneme ve sayfa yenilenince kayıtların korunması.
- Dört dilde ekleme, taksit düzenleme, kısmi ödeme, arşivden geri alma, yeniden açılış ve HTML benzeri isimlerin güvenli gösterimi.
- 320×568, 360×640, 412×915, 768×1024 ve 844×390 boyutlarında dört dilde liste/form yerleşimi.
- Dört dilde 390×844, 320×568 ve 844×390 boyutlarında hem borç hem gelir formunda gerçek fare tekerleği ve Chromium dokunma hareketleri. Arka konumun sabit kalması, kapanışta geri gelmesi ve normal kaydırmanın yeniden çalışması.
- Android geri düğmesinin test eklentisiyle tetiklenmesi; isim seçici → form → ana ekran kapanışlarında kilidin doğru kalması/kalkması.
- Gelir kartlarında tek seferlik ve düzenli kayıtların tutar/silme hizası: dört dilde 320×568, 390×844, 412×915 ve 844×390. Taşma ve beklenmeyen sistem penceresi kontrolü.
- Mavi/yeşil silme onayı, iptal, onay, klavye odak döngüsü, Escape ve açık pencerenin dil değişikliği. İki eşzamanlı silme isteğinin birbirini değiştirmemesi.
- Başka bir cihazın kayıtlarından bağımsız boş başlangıç; açık kullanıcı bağlantısı olmadan Google token isteği yapılmaması. Boş Drive hesabında açıklama ve ilk kaydın otomatik yüklenmesi.

### Önceki APK incelemesi ve yeni derleme kontrolü

GitHub Actions 92 numaralı başarılı çalışmanın 1.2.92 APK'sı açılarak incelendi: başlangıç borç/gelir/ödeme dizileri boştur; web varlıkları içinde kişisel kayıt veritabanı yoktur. Derlenmiş manifestte allowBackup=true ve dışlama kuralları yoktur. Bu ayar, Android'in kaldırma/yeniden kurulumda kullanıcıya ait sistem yedeğini geri getirmesine izin verir; APK'nın kişisel kayıt içerdiği anlamına gelmez.

Yeni iş akışı Android platformu oluşturulduktan sonra politikayı uygular. Derleme sonunda gerçek APK'nın ikili manifestini ve XML kaynaklarını okuyarak allowBackup=false, hem eski hem yeni dışlama kuralları ve boş başlangıç dizileri kontrol edilir. Politika uygulanmazsa iş akışı başarısız olur. Bu kontrol yeni Android derlemesinde çalışacaktır; yerel testler kaynak manifest ve şablonla yapılmıştır.

## Gerçek cihazda kalan doğrulama

Google Drive ve Android eklenti yanıtları testlerde taklit edildi. Gerçek OAuth hesabıyla giriş, fiziksel cihazda yeni sürümü kaldırıp yeniden kurma ve kapalı uygulamada Android bildirimi bu ortamda çalıştırılmadı. Yeni pakette Google'a bağlanmadan boş açılış ve bağlandıktan sonra geri yükleme ayrıca telefonda denenmelidir. Bildirim hedefi 09.00'dır; Android izin/pil/zamanlama davranışı gerçek cihazda kontrol edilmelidir. Capacitor 6 API sözleşmesi ve kurulu eklentinin Android zamanlama kodu incelendi: [Local Notifications](https://capacitorjs.com/docs/v6/apis/local-notifications). Sistem yedekleme davranışı: [Android Auto Backup](https://developer.android.com/identity/data/autobackup).

## Yeniden çalıştırma

~~~sh
npm test
npm run build
TEST_BROWSER_EXECUTABLE=/path/to/chromium npm run test:browser
~~~

Tarayıcı testi için Playwright gereklidir. Ayrı kurulum TEST_NODE_MODULES, belirli Chromium TEST_BROWSER_EXECUTABLE, tek senaryo TEST_CASE_FILTER, isteğe bağlı ekran görüntüleri TEST_SCREENSHOT_DIR ile belirtilebilir. A01–A09 ayrıca npm run test:audit ile çalıştırılabilir; bu kontroller artık başarılı olmalıdır.
