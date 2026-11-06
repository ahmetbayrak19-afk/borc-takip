# Borç Takip — Yayını tamamlama

## 1. Gizlilik ve kullanım sayfaları

Hazır yayın klasörü: docs. Buradaki politika metinleri uygulamanın kök dizinindeki privacy.html ve terms.html ile aynıdır.

1. https://github.com/ahmetbayrak19-afk/borc-takip/settings/pages adresini açın.
2. Build and deployment → Source: Deploy from a branch.
3. Branch: main; Folder: /docs; Save.
4. Yayın tamamlanınca bu adreslerin giriş istemeden açıldığını kontrol edin:
   - https://ahmetbayrak19-afk.github.io/borc-takip/privacy.html
   - https://ahmetbayrak19-afk.github.io/borc-takip/terms.html
5. Gizlilik adresini Play Console'daki ilgili alana, gerekiyorsa Google Auth Platform → Branding alanına girin.

Metin değişikliklerinde kök dizin ve docs kopyalarını birlikte güncelleyin.

## 2. Güncel Android paketi

Ana dala gönderim Build Android APK iş akışını tetikler. Çalışmanın kaynak commit'inin son yayın hazırlığı commit'i olduğunu kontrol edin.

Derleme başlamazsa:
1. https://github.com/ahmetbayrak19-afk/borc-takip/actions/workflows/build-apk.yml adresini açın.
2. Run workflow → Branch: main → Run workflow.
3. Başarılı çalışmanın Artifacts → borc-takip-yayin-paketi paketini indirin.

borc-takip.apk telefonda denemek; borc-takip-play.aab Play Console'a yüklemek içindir.

## 3. Telefonda iki kritik test

- Temiz kurulum ve Google geri yükleme: Denemeden önce mevcut kayıtlarınızı dışa aktarın. Yeni APK'yı güncelleme olarak kurmak mevcut kayıtları korur. Örnek borç/gelir ekleyin, Google eşitlemesinin tamamlandığını görün. Bu yeni sürümü kaldırıp yeniden kurun; Google'a bağlanmadan boş açıldığını, aynı Google hesabıyla bağlanınca borç, gelir, kısmi ödeme ve arşiv kayıtlarının geri geldiğini doğrulayın. Yedeği olmayan bir hesaba bağlanınca yeni kayıtların o hesaba kaydedileceği açıklanmalıdır. Google'a bağlanmadan yalnızca telefonda tutulan kayıtlar kaldırma işleminde silinir; dışa aktarma seçeneğiyle saklanabilir.
- Bildirim: İzin verin ve yarına vadeli örnek borç ekleyin. Uygulama açık değilken ve ayrıca telefon yeniden başlatıldıktan sonra vade bildirimini kontrol edin. Hedef saat yerel 09.00'dır.

Android sistem yedeği ve cihazdan cihaza otomatik aktarım kapalıdır; uygulama içindeki isteğe bağlı Google Drive eşitlemesi ayrıdır. Derlemede hem kaynak manifest hem üretilen APK'nın boş başlangıç ve yedekleme kuralları kontrol edilir. APK kişisel kayıt dosyalarını içermez.

## 4. Play Console

Uygulama içeriğindeki Veri güvenliği, finansal özellikler, reklam, hedef kitle ve içerik derecelendirmesini uygulamanın gerçek davranışına göre tamamlayın. Hesap ve uygulama özelindeki açık görevler Console üzerinden kontrol edilmelidir.

Geliştirici profili görselleri ile uygulama mağaza görselleri ayrı alanlardır. İç testte Google Play'den kurulan paketle Google girişini ve geri yüklemeyi de kontrol edin.

Kaynak: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
