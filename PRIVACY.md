# Borç Takip Gizlilik Politikası

Son güncelleme: 4 Kasım 2026

Borç Takip, kullanıcıların borç, taksit, gelir ve ödeme kayıtlarını takip etmesine yardımcı olan, isteğe bağlı Google Drive eşitlemeli bir mobil uygulamadır.

## Toplanan ve kullanılan veriler

Uygulama, kullanıcının girdiği borç, taksit, gelir, ödeme ve uygulama ayarlarını cihazda yerel olarak saklar. Kullanıcı Google ile giriş yapıp eşitlemeyi etkinleştirirse bu kayıtlar kullanıcının kendi Google Drive hesabındaki uygulamaya özel gizli alanda (`appDataFolder`) saklanır.

Uygulama, kullanıcının Google Drive'daki normal dosyalarını, fotoğraflarını veya belgelerini okuyamaz. Başka kullanıcıların kayıtlarına erişemez.

## Google hesabı ve izinler

Google ile giriş isteğe bağlıdır. Uygulama yalnızca eşitleme için gerekli olan `https://www.googleapis.com/auth/drive.appdata` iznini talep eder. Kullanıcı giriş yapmadan uygulamayı yalnızca cihazındaki yerel kayıtlarla kullanabilir.

## Döviz kurları

Kullanıcı TL karşılığı seçeneğini açarsa uygulama Frankfurter üzerinden genel döviz kurlarını alır. Kur isteği borç, gelir veya Google hesabı bilgilerini içermez.

## Veri paylaşımı

Kullanıcı verileri reklam amacıyla satılmaz, kiralanmaz veya üçüncü taraflarla paylaşılmaz. Firebase veya uygulama sahibine ait ortak bir veritabanı kullanılmaz.

## Veri silme

Kullanıcı, Ayarlar’dan telefondaki kayıtları ve Google Drive yedeğini ayrı işlemlerle silebilir. Her iki silme işlemi de otomatik eşitlemeyi duraklatır. Google hesabı bağlantısı ayrıca kaldırılabilir.

## Güvenlik

Veriler Google ile eşitlenirken şifreli HTTPS bağlantısı kullanılır. Google Drive'daki verilerin korunması Google hesabının güvenlik ayarlarına da bağlıdır.

## İletişim

Gizlilikle ilgili sorular için: ahmetbayrak19@gmail.com
