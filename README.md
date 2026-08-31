# Borç Takip 💰

Modern, mobil uyumlu bir **borç ve gelir takip uygulaması**.

Taksitli borçlarınızı yönetin, maaş/gelir bilgilerinizi girin ve **aylık olarak artıda mı yoksa ekside mi** olduğunuzu anında görün.

![Demo](https://img.shields.io/badge/Status-Hazır-brightgreen) ![Vanilla JS](https://img.shields.io/badge/Stack-HTML%20%2B%20Tailwind%20%2B%20JS-blue)

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
- 📱 Mobil öncelikli tasarım (telefon ekranına uyumlu)
- 💾 Tüm veriler tarayıcıda `localStorage`'da saklanır (sunucu yok)
- 📤 JSON dışa/içe aktarma (yedekleme)
- 🗑️ Tek tıkla tüm verileri temizleme

## 🚀 Kullanım

### Canlı Demo (GitHub Pages)
Repoyu fork'layıp GitHub Pages'i aktif edin veya dosyaları herhangi bir static host'a atın.

### Yerel Çalıştırma
```bash
# Sadece index.html'i bir tarayıcıda açın
# veya basit bir sunucu ile:
npx serve .
# veya
python -m http.server 8080
```

Ardından `http://localhost:8080` adresine gidin.

## 📁 Dosya Yapısı

```
borc-takip/
├── index.html      # Ana arayüz + Tailwind
├── app.js          # Tüm mantık (localStorage, hesaplamalar, UI)
└── README.md
```

## 🛠️ Teknik Detaylar

- **Frontend only** — backend / database yok
- Tailwind CSS (CDN)
- Font Awesome ikonlar
- Vanilla JavaScript (framework yok)
- Responsive, PWA'ya dönüştürülebilir

## 📱 Ekran Görüntüleri (Beklenen)

Uygulama, paylaştığınız mobil arayüze benzer şekilde tasarlandı:
- Üstte borç özet kartları
- Gelir listesi
- Bu aya ait borç listesi (tarih + taksit + tutar + Ödendi/Düzenle/Sil)
- Alttan açılan "Yeni Borç Ekle" formu

## 🔒 Gizlilik

Tüm verileriniz **sadece sizin tarayıcınızda** tutulur. Hiçbir yere gönderilmez.

## 📄 Lisans

MIT — İstediğiniz gibi kullanın, değiştirin, paylaşın.

---

**Geliştirici notu:** Bu uygulama Grok tarafından `ahmetbayrak19-afk/borc-takip` reposu için oluşturulmuştur.
