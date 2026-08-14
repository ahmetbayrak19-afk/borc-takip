# Borç Takip 💰

Modern, mobil uyumlu bir **borç ve gelir takip uygulaması**.

Taksitli borçlarınızı yönetin, maaş/gelir bilgilerinizi girin ve **aylık olarak artıda mı yoksa ekside mi** olduğunuzu anında görün.

![Demo](https://img.shields.io/badge/Status-Haz%C4%B1r-brightgreen) ![Vanilla JS](https://img.shields.io/badge/Stack-HTML%20%2B%20Tailwind%20%2B%20JS-blue) ![APK](https://img.shields.io/badge/Android-APK-green)

## ✨ Özellikler

### Borç Yönetimi
- **Taksitli borç ekleme**: Toplam tutar + taksit sayısı girin, uygulama otomatik taksit tutarını hesaplar
- **Ödeme durumu**: Her taksit için `(2/5)` gibi ilerleme gösterir
- **Ödendi işaretleme**: Tek tıkla bir sonraki taksite geçersiniz
- **Kategoriler**: Kredi Kartı, Banka Kredisi, Kişisel, Fatura veya özel kategori
- **Tekrar eden borçlar**: Sabit aylık ödemeler için "Her ay tekrar et" seçeneği
- **Filtreleme**: Bu Ay / Gecikmiş / Yaklaşan / Tümü

### Gelir & Bakiye
- Maaş ve diğer gelirleri ekleyin
- **Aylık durum banner'ı**:
  - 🟢 **Artıdasınız** → Gelir > Bu ayki borçlar
  - 🔴 **Eksidesiniz** → Borçlar geliri aşıyor
- Anlık hesaplama

### Özet Kartları
| Kart | Açıklama |
|------|----------|
| Gecikmiş | Vadesi geçmiş taksitler |
| Bugün | Bugün ödenmesi gerekenler |
| Bu ay | Bu ay kalan ödemeler |
| Gelecek Ay | Gelecek ayki taksitler |
| Sonraki Aylar | Daha ileri tarihler |
| Genel | Toplam kalan borç |

### Diğer
- 📱 Mobil öncelikli tasarım
- 💾 Tüm veriler cihazında saklanır (localStorage)
- 📤 JSON dışa/içe aktarma
- 🗑️ Tek tıkla tüm verileri temizleme

## 📥 Android APK İndirme

Her `main` branch push'unda otomatik olarak **Debug APK** oluşturulur.

### Nasıl indirilir?

1. Repo'ya git: [https://github.com/ahmetbayrak19-afk/borc-takip](https://github.com/ahmetbayrak19-afk/borc-takip)
2. Üst menüden **Actions** sekmesine tıkla
3. Sol taraftan **Build Android APK** workflow'unu seç
4. En üstteki başarılı çalışmayı aç
5. Sayfanın en altında **Artifacts** bölümünde **borc-takip-apk** dosyasını indir
6. Zip'’i aç → `borc-takip.apk` dosyasını telefonuna yükle

> **Not:** Debug APK olduğu için Android "Bilinmeyen kaynaklardan yükleme" izni ister. Ayarlardan izin verip "Yine de yükle" diyebilirsin.

Manuel olarak da çalıştırabilirsin: **Actions** → **Build Android APK** → **Run workflow**

## 🚀 Kullanım (Web)

### Canlı Demo (GitHub Pages)
Repo → **Settings** → **Pages** → Source: `main` branch → Save

### Yerel Çalıştırma
```bash
npx serve .
# veya
python -m http.server 8080
```

## 📁 Dosya Yapısı

```
borc-takip/
├── index.html
├── app.js
├── package.json
├── capacitor.config.json
├── .github/workflows/build-apk.yml
└── README.md
```

## 🛠️ Teknik

- Vanilla HTML + Tailwind CSS + JavaScript
- Capacitor ile Android APK üretimi
- Veriler sadece cihazında tutulur

## 🔒 Gizlilik

Tüm verileriniz **sadece sizin cihazınızda** tutulur.

## 📄 Lisans

MIT
