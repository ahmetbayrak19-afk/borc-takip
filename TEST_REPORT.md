# Borç Takip — Dil desteği ve senaryo test raporu

İnceleme tarihi: 5 Kasım 2026. Kaynak başlangıcı: `05ee661c77e815ae444f624984ac0301f4ff430a`.
Gerçek kullanıcı kayıtları ve gerçek Google hesapları kullanılmadı; bütün örnek kayıtlar test için üretildi.

## Eklenen dil desteği

- Ayarlar → Dil: Türkçe, English, Deutsch, Русский.
- Seçim anında uygulanır ve aynı cihazda uygulama yeniden açıldığında korunur. Varsayılan Türkçedir.
- Ana ekran, formlar, doğrulama mesajları, silme/geri alma onayları, ödeme arşivi, Google Drive açıklamaları ve uygulama içindeki gizlilik bilgileri çevrilir.
- Para ve tarih gösterimi, ay/yıl adları ve ödeme zamanı seçilen dile göre biçimlenir. Para birimi otomatik değiştirilmez.
- Kullanıcının girdiği borç/gelir adları, mevcut kayıtlar, taksit sayısı, para birimi ve ISO tarih verileri değiştirilmez.
- Dil tercihi cihaz ayarıdır; Google yedeğine taşınmaz ve hesap değiştirmekten etkilenmez.
- Açık formdaki yazılar, seçili ay ve bekleyen ödeme işlemi dil değişikliğinde korunur.
- Uzayan Almanca/Rusça metinler için kaydırılabilir form alanları, dar ekranda sarılma ve alt buton yüksekliğine göre hesaplanan liste boşluğu eklendi.
- Android paketleme adımına `i18n.js` ve derlemeden önce `npm test` eklendi.
- Google’ın kendi giriş ekranı, Android’in sistem diyalogları ve bağlantı verilen web politikaları uygulama içi sözlükle çevrilmez.

## Sonuçlar ve kapsam

| Kontrol | Sonuç | Kapsam |
|---|---|---|
| Mevcut mantık testi | Geçti | Yedek tarih doğrulaması ve modern ödenmiş taksitin toplu düzenlemede korunması |
| `npm test` | 31/31 geçti | Dil, kayıtların korunması, para/tarih, ödeme/geri alma, gelir, kur, yedek ve eşitleme mantığı |
| Gerçek Chromium arayüzü | 29/30 geçti; A10 doğrulandı | Dört dilde temel işlemler, ilk açılış açıklamaları, 20 dil/ekran boyutu kombinasyonu ve ek arayüz senaryoları |
| `npm run test:audit` | 9 mevcut hata doğrulandı | A01–A09; aşağıdaki açık bulguların tekrar üretimi |
| Saat dilimi | Geçti | UTC, Europe/Istanbul; tarih/mantık senaryoları ayrıca America/Los_Angeles |
| `npm run build` | Geçti | Tailwind üretimi ve dil dosyasının paketleme yolunun kontrolü |
| JavaScript sözdizimi | Geçti | Uygulama, çeviriler ve test dosyaları |
| Canlı kur servisi | HTTP 200 | 5 Kasım 2026'da TRY tabanı için USD, EUR, GBP, CHF, SAR ve AED oranları pozitif ve sayısaldı |

Ekranlar: 320×568, 360×640, 412×915, 768×1024 ve 844×390. Her boyut dört dilde denendi.

### Başarıyla denenmiş örnekler

- Mevcut ayda yeni borcun bugüne, diğer aylarda ilgili ayın 15'ine açılması.
- 31 Ocak → 28 Şubat, artık yılda 29 Şubat, başlangıç gününü koruyarak Mart'a geçiş ve Aralık → Ocak yıl geçişi.
- TRY/USD/EUR borçlarının ayrı toplanması; örnek kurla yaklaşık TL çevirisi ve eksik kurda ayrı para birimlerine güvenli dönüş.
- Başarılı kur güncellemesinden sonra 12 saat boyunca tekrar istek yapılmaması, çevrimdışıyken istek yapılmaması.
- Maaştan ve ekstra kaynaktan kısmi ödeme, ödeme arşivi, geri alma ve gelir düzeltmesinin geri alınması.
- Önce ilerideki taksitin ödenmesi durumunda önceki açık taksitlerin görünür kalması.
- Sıfır, negatif, boş veya kalan borçtan büyük kısmi ödeme girişleri; gerçek formda sıfır tutarın engellenmesi.
- Tek taksit düzenlemesinde diğer taksitlerin, borç adının ve para biriminin korunması.
- Yeni ödeme veri yapısındaki tamamen ödenmiş taksitlerin toplu değişiklikten etkilenmemesi.
- Tek seferlik gelirin yalnızca kendi ayında, düzenli gelirin başlangıç ayından itibaren görünmesi.
- Seçili dönemde arama; silme iptali; borç silinse de ödeme arşivinin korunması.
- Unicode, Türkçe/Almanca/Rusça ve HTML benzeri borç adlarının aynen saklanması; arayüzde HTML çalıştırmaması.
- Boş cihazda mevcut Drive yedeğinin geri alınması, çevrimdışı değişikliğin beklemesi ve bağlantıdan sonra yüklenmesi.
- Oturum kapalı veya eşitleme duraklatılmışken veri yüklenmemesi; farklı hesap kimliği gelince işlemin engellenmesi.
- Telefonda kayıt silmenin eşitlemeyi duraklatması; Drive yedeğini silmenin telefon kayıtlarını koruması.
- Dört dilde borç ekleme, onay penceresi, sadece bu taksiti düzenleme, kısmi ödeme, arşivden geri alma ve sayfa yenileme.
- Her test boyutunda son borcun alt sabit butonların üstüne kadar kaydırılabilmesi ve yatay taşma olmaması.

Google Drive ve Android bildirim senaryoları sahte bağlantı/eklenti yanıtlarıyla mantık düzeyinde sınandı. Gerçek OAuth girişi, kapalı uygulamada Android bildirimi, üretici pil kısıtları ve imzalı APK/AAB bu ortamda fiziksel cihaz üzerinde çalıştırılmadı.

## Açık bulgular

Bu sürümde dil desteği ve gerekli yerleşim uyarlamaları eklendi. A01–A10 aşağıda açık olarak bırakılmış inceleme bulgularıdır; düzeltilmiş sayılmamalıdır.

### A01 — Eski ödenmiş taksit toplu düzenlemede değişiyor — Yüksek

Eski sürümden kalan `paidInstallments: 1, partials: {}` yapısında ilk taksit ödenmiş sayılır. İkinci taksitten “Kalan tüm taksitler” ile tutar 100'den 200'e çıkarılınca ilk taksite de 200 yazılıyor. Tamamlanma hesabı yalnızca kısmi ödeme tablosuna bakıyor; eski ödenmiş sayısını hesaba katmıyor.

Öneri: Eski ödeme yapısını tek seferlik dönüştürmek ve bütün ödeme/düzenleme işlemlerinde aynı tamamlanma kuralını kullanmak.

### A02 — Geri alma eski ödenmiş taksitleri açabiliyor — Yüksek

Aynı eski yapıdaki borçta ikinci taksit ödenip arşivden geri alınınca `paidInstallments` 1 yerine 0 oluyor. Daha önceden ödenmiş ilk taksit de yeniden açık görünüyor.

Öneri: Ödeme geri alınırken eski ödemeler için dönüşüm veya korunmuş bir başlangıç durumu kullanmak.

### A03 — Bozuk yerel kayıt açılışı durdurabiliyor — Yüksek

Yerel borç anahtarının içeriği JSON dizisi yerine `{}` olduğunda `loadData()` içinde `debts.forEach is not a function` hatası oluşuyor. Bir JSON ayrıştırma hatasında ise dört kayıt koleksiyonu birden bellekte boşaltılıyor; sağlam koleksiyonlar bağımsız yüklenmiyor.

Öneri: Her koleksiyonu ayrı okuyup türünü doğrulamak; bozuk veriyi sessizce silmeden kurtarma/dışa aktarma imkânı sunmak.

### A04 — Yedek doğrulaması eksik — Yüksek

Aynı kimliğe sahip iki borç, `paidInstallments: 999` ve mevcut taksit sayısı dışında `installmentOverrides[999]` kabul edildi. Aynı kimlikli borçlar seçme, ödeme ve silme işlemlerini belirsizleştirir.

Öneri: Koleksiyon içinde benzersiz kimlik, ödeme sayısı sınırı, taksit anahtarı aralığı ve ödeme/borç bağlantılarını doğrulamak.

### A05 — Tek taksit düzenlemesinde yedekteki toplam eski kalıyor — Orta

100+100+100 borcunun ikinci taksiti 200 yapıldığında açık taksitlerin toplamı doğru şekilde 400 hesaplanıyor; ancak kayıttaki/yedekteki `totalAmount` 300 kalıyor. Mevcut özet ekranı taksitlerden hesapladığı için bu örnekte doğru görünüyor.

Öneri: Her taksit değişikliğinde orijinal toplamı taksit tutarlarından yeniden hesaplamak.

### A06 — İlk Drive geri yükleme sırasında yeni kayıt kaybolabiliyor — Kritik

İlk eşitlemede Drive dosyası indirilirken kullanıcı yeni bir yerel borç eklerse, gelen uzak yedek bu yeni kaydın üstüne yazıyor. Denemede `Added during restore` borcu tamamen kayboldu. İşlem sırasında kayıt girişi engellenmiyor veya kullanıcı uyarılmıyor.

Öneri: İlk geri yükleme tamamlanana kadar kayıt girişini kısa süre kilitlemek. Bu, yeni bir çakışma seçimi ekranı gerektirmeden basit kayıt düzenini korur.

### A07 — İleri vadeli bildirim önceden planlanmıyor — Yüksek

Yarın vadeli bir borç eklenip bildirim planlaması çağrıldığında hiçbir bildirim oluşturulmadı. Kod yalnızca uygulamanın o anda açık olduğu günün borçlarını alıp iki saniye sonrasına bildirim koyuyor. Bu nedenle vade günü uygulama açılmazsa hatırlatma için güvence yok.

Öneri: Ödeme gününe ait yerel bildirimi borç kaydedilirken planlamak; ödeme, tarih değişikliği ve silmede güncellemek.

### A08 — Depolama doluluğu kaydetme sırasında yakalanmıyor — Yüksek

`localStorage.setItem` kota hatası verdiğinde kaydetme işlevi `QuotaExceededError` ile kesiliyor. Borç önce bellekteki listeye eklenmiş olduğundan sonraki bir çizimde görünse bile kalıcı kayda geçmemiş olabilir.

Öneri: Kalıcı yazma hatasını kullanıcıya açıklamak ve başarısız kaydı bellekte tamamlanmış gibi bırakmamak.

### A09 — Bazı borç adları kayıtlı isimler listesinde görünmüyor — Düşük

`constructor` ve `__proto__` adları borç olarak kaydedilebildiği hâlde kayıtlı isimler listesine alınmıyor. İsimleri tekilleştiren normal nesnenin kalıtılan anahtarlarıyla çakışıyorlar.

Öneri: İsimleri tekilleştirmek için `Set` kullanmak.

### A10 — Aylar penceresi borç formunun üstünde kalıyor — Yüksek

Gerçek tarayıcıda Ayarlar → Borçlara aylara göre bak → sonraki yıl → Ocak → Bu Aya Borç Ekle akışında tarih doğru şekilde 15 Ocak açıldı. Ancak açık kalan `modal-months`, borç formuyla aynı z-index'te ve HTML'de daha sonra olduğu için formun üzerine geliyor. Formdaki geri düğmesine gerçek tıklama ay listesi tarafından yakalanıyor.

Öneri: Ay listesinden borç formuna geçerken önceki pencereyi kapatmak ve geri dönüş bağlamını tutmak. Aylık listeden düzenleme akışı da aynı şekilde kontrol edilmeli.

## Yeniden çalıştırma

```sh
npm test
npm run build
npm run test:audit
TEST_BROWSER_EXECUTABLE=/path/to/chromium npm run test:browser
```

`test:audit` mevcut açık hatalar bulunduğunda sıfır olmayan çıkış kodu verir. Tarayıcı testi de A10 düzeltilene kadar bir başarısız senaryo bildirir. Paket üretimi öncesinde çalışan `npm test` dil özelliğinin ve normal akışların regresyon testidir.

Tarayıcı testi için Playwright gereklidir. Var olan Chromium yolu `TEST_BROWSER_EXECUTABLE` ile, ayrı bir Playwright kurulumu `TEST_NODE_MODULES` ile belirtilebilir. Yalnızca bir senaryoyu çalıştırmak için `TEST_CASE_FILTER` kullanılabilir.
