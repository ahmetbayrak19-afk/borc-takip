// UI text only: user-entered names, saved records, IDs and currency codes are never translated.
(function(root) {
  'use strict';
  const languages = {
    tr: { locale: 'tr-TR', name: 'Türkçe' },
    en: { locale: 'en-US', name: 'English' },
    de: { locale: 'de-DE', name: 'Deutsch' },
    ru: { locale: 'ru-RU', name: 'Русский' }
  };
  // Each row is [Turkish source, English, German, Russian]. Keep placeholders identical.
  const phrases = [
    ['Borç Takip', 'Debt Tracker', 'Schuldenübersicht', 'Учёт долгов'],
    ['BORÇ TAKİP', 'DEBT TRACKER', 'SCHULDENÜBERSICHT', 'УЧЁТ ДОЛГОВ'],
    ['Borç ve gelir yönetimi', 'Debt and income management', 'Schulden und Einnahmen verwalten', 'Управление долгами и доходами'],
    ['Genel Bakış', 'Overview', 'Übersicht', 'Обзор'],
    ['Ayarlar', 'Settings', 'Einstellungen', 'Настройки'],
    ['Dil', 'Language', 'Sprache', 'Язык'],
    ['Dil değişikliği hemen uygulanır ve bu cihazda saklanır.', 'Language changes apply immediately and are saved on this device.', 'Die Sprache wird sofort geändert und auf diesem Gerät gespeichert.', 'Язык меняется сразу и сохраняется на этом устройстве.'],
    ['Dil tercihi kaydedilemedi', 'Could not save the language preference', 'Die Spracheinstellung konnte nicht gespeichert werden', 'Не удалось сохранить выбранный язык'],
    ['Kayıtların yükleniyor…', 'Loading your records…', 'Ihre Daten werden geladen…', 'Загрузка ваших записей…'],
    ['Bazı kayıtlar okunamadı. Mevcut veriler korundu. Yedekten geri yükleyin.', 'Some records could not be read. Existing data has been preserved. Restore a backup.', 'Einige Daten konnten nicht gelesen werden. Vorhandene Daten wurden bewahrt. Stellen Sie eine Sicherung wieder her.', 'Не удалось прочитать часть записей. Исходные данные сохранены. Восстановите резервную копию.'],
    ['Kayıt alanı dolu veya kullanılamıyor. Kaydedilemedi.', 'Storage is full or unavailable. Your changes were not saved.', 'Der Speicher ist voll oder nicht verfügbar. Ihre Änderungen wurden nicht gespeichert.', 'Хранилище заполнено или недоступно. Изменения не сохранены.'],
    ['Eşitleme bilgisi kaydedilemedi. Şimdi eşitle ile yeniden deneyin.', 'Sync information could not be saved. Try again with Sync now.', 'Synchronisierungsdaten konnten nicht gespeichert werden. Versuchen Sie es mit Jetzt synchronisieren erneut.', 'Не удалось сохранить сведения о синхронизации. Нажмите «Синхронизировать», чтобы повторить попытку.'],
    ['Tutar, ödenmiş tutardan az olamaz.', 'The amount cannot be less than the amount already paid.', 'Der Betrag darf nicht kleiner als der bereits bezahlte Betrag sein.', 'Сумма не может быть меньше уже оплаченной.'],
    ['Bildirimler planlanamadı. Bildirim iznini kontrol edin.', 'Could not schedule reminders. Check notification permission.', 'Erinnerungen konnten nicht geplant werden. Prüfen Sie die Benachrichtigungsberechtigung.', 'Не удалось запланировать напоминания. Проверьте разрешение на уведомления.'],
    ['Aylık Durum', 'Monthly balance', 'Monatsbilanz', 'Баланс за месяц'],
    ['Borç Özetiniz', 'Debt summary', 'Schuldenübersicht', 'Сводка долгов'],
    ['Gecikmiş', 'Overdue', 'Überfällig', 'Просрочено'],
    ['Bugün', 'Today', 'Heute', 'Сегодня'],
    ['Bu ay', 'This month', 'Dieser Monat', 'Этот месяц'],
    ['Bu Ay', 'This month', 'Dieser Monat', 'Этот месяц'],
    ['Genel', 'Overall', 'Gesamt', 'Всего'],
    ['Tümü', 'All', 'Alle', 'Все'],
    ['Gelirlerim', 'Income', 'Einnahmen', 'Доходы'],
    ['Henüz gelir eklenmedi.', 'No income added yet.', 'Noch keine Einnahmen erfasst.', 'Доходы пока не добавлены.'],
    ['Borç Bilgileriniz', 'Your debts', 'Ihre Schulden', 'Ваши долги'],
    ['Bu ayın borçlarında ara', 'Search debts in this period', 'Schulden in diesem Zeitraum suchen', 'Поиск долгов за выбранный период'],
    ['Borç ara', 'Search debts', 'Schulden suchen', 'Поиск долгов'],
    ['Bu ayda borç ara…', 'Search debts in this period…', 'Schulden in diesem Zeitraum suchen…', 'Поиск долгов за период…'],
    ['Bu ay aradığın borç bulunamadı.', 'No matching debts in this period.', 'Keine passenden Schulden in diesem Zeitraum.', 'За этот период подходящих долгов нет.'],
    ['Bu dönemde borç bulunmuyor.', 'No debts in this period.', 'Keine Schulden in diesem Zeitraum.', 'За этот период долгов нет.'],
    ['Borç Ekle', 'Add debt', 'Schuld hinzufügen', 'Добавить долг'],
    ['Gelir Ekle', 'Add income', 'Einnahme hinzufügen', 'Добавить доход'],
    ['Borç eklendi', 'Debt added', 'Schuld hinzugefügt', 'Долг добавлен'],
    ['Borç adı', 'Debt name', 'Bezeichnung', 'Название долга'],
    ['Ödeme tarihi', 'Due date', 'Fälligkeitsdatum', 'Дата платежа'],
    ['Ödeme Tarihi', 'Due date', 'Fälligkeitsdatum', 'Дата платежа'],
    ['Tutar', 'Amount', 'Betrag', 'Сумма'],
    ['Taksit bilgisi', 'Installment details', 'Ratenangaben', 'Сведения о рассрочке'],
    ['Düzenle', 'Edit', 'Bearbeiten', 'Изменить'],
    ['Tamam', 'OK', 'OK', 'ОК'],
    ['Yeni Borç Ekle', 'Add new debt', 'Neue Schuld hinzufügen', 'Добавить новый долг'],
    ['Borcu Düzenle', 'Edit debt', 'Schuld bearbeiten', 'Изменить долг'],
    ['Taksiti Düzenle', 'Edit installment', 'Rate bearbeiten', 'Изменить платёж'],
    ['Borç Adı / Kurum', 'Debt name / provider', 'Bezeichnung / Anbieter', 'Название долга / организация'],
    ['Örn: Axess, Troy...', 'E.g. credit card, loan…', 'Z. B. Kreditkarte, Darlehen…', 'Например: карта, кредит…'],
    ['— her taksit', '— per installment', '— je Rate', '— за каждый платёж'],
    ['Para Birimi', 'Currency', 'Währung', 'Валюта'],
    ['Borcu tekrarla (taksitli)', 'Pay in installments', 'In Raten zahlen', 'Платить в рассрочку'],
    ['Kaç taksit?', 'Number of installments', 'Anzahl der Raten', 'Количество платежей'],
    ['Kaydet', 'Save', 'Speichern', 'Сохранить'],
    ['Gelir Adı', 'Income name', 'Bezeichnung der Einnahme', 'Название дохода'],
    ['Örn: Maaş...', 'E.g. salary…', 'Z. B. Gehalt…', 'Например: зарплата…'],
    ['Gelir türü', 'Income type', 'Art der Einnahme', 'Тип дохода'],
    ['Düzenli', 'Recurring', 'Regelmäßig', 'Регулярный'],
    ['Tek seferlik', 'One-time', 'Einmalig', 'Разовый'],
    ['Maaş, kira gibi. Girdiğin aydan itibaren her aya yansır.', 'For salary, rent, etc. Applies every month starting this month.', 'Für Gehalt, Miete usw. Wird ab diesem Monat monatlich berücksichtigt.', 'Для зарплаты, аренды и т. п. Учитывается ежемесячно начиная с текущего месяца.'],
    ['Sadece seçtiğin ayda görünür, diğer aylara yansımaz.', 'Appears only in the selected month.', 'Wird nur im ausgewählten Monat berücksichtigt.', 'Учитывается только в выбранном месяце.'],
    ['Tarih', 'Date', 'Datum', 'Дата'],
    ['Sadece seçtiğin ayın gelirine ve üstteki toplama eklenir.', 'Added only to income and totals for the selected month.', 'Wird nur zu Einnahmen und Summen des ausgewählten Monats addiert.', 'Добавляется только к доходам и итогам выбранного месяца.'],
    ['Aylık Tutar', 'Monthly amount', 'Monatlicher Betrag', 'Сумма в месяц'],
    ['0,00', '0.00', '0,00', '0,00'],
    ['Kısmi Ödeme', 'Partial payment', 'Teilzahlung', 'Частичная оплата'],
    ['Ödenecek tutar', 'Payment amount', 'Zahlungsbetrag', 'Сумма платежа'],
    ['Devam', 'Continue', 'Weiter', 'Продолжить'],
    ['İptal', 'Cancel', 'Abbrechen', 'Отмена'],
    ['Ödeme kaynağı', 'Payment source', 'Zahlungsquelle', 'Источник платежа'],
    ['Maaştan / kayıtlardan ödedim', 'Paid from recorded income', 'Aus erfassten Einnahmen bezahlt', 'Оплачено из учтённых доходов'],
    ['Aylık durum aynı kalır (gelirden düşülür)', 'Monthly balance stays the same (deducted from income)', 'Monatsbilanz bleibt gleich (Abzug von Einnahmen)', 'Баланс месяца не меняется (вычитается из доходов)'],
    ['Ekstra para ile ödedim', 'Paid with extra funds', 'Mit zusätzlichem Geld bezahlt', 'Оплачено дополнительными средствами'],
    ['Kayıtlı gelire dokunulmaz, durum iyileşir', 'Recorded income is unchanged; the balance improves', 'Erfasste Einnahmen bleiben gleich; die Bilanz verbessert sich', 'Учтённые доходы не меняются; баланс улучшается'],
    ['Google Drive eşitleme', 'Google Drive sync', 'Google-Drive-Synchronisierung', 'Синхронизация с Google Диском'],
    ['Giriş yapılmadı · Kayıtlar bu telefonda', 'Not signed in · Records are on this phone', 'Nicht angemeldet · Daten auf diesem Gerät', 'Вход не выполнен · Данные на этом телефоне'],
    ['Google ile giriş', 'Sign in with Google', 'Mit Google anmelden', 'Войти через Google'],
    ['Şimdi eşitle', 'Sync now', 'Jetzt synchronisieren', 'Синхронизировать'],
    ['Eşitlemeyi başlat', 'Start syncing', 'Synchronisierung starten', 'Начать синхронизацию'],
    ['Çıkış', 'Sign out', 'Abmelden', 'Выйти'],
    ['İsteğe bağlıdır. Giriş yapmazsan uygulamayı normal şekilde kullanmaya devam edebilirsin.', 'Optional. You can keep using the app without signing in.', 'Optional. Sie können die App auch ohne Anmeldung nutzen.', 'Необязательно. Приложением можно пользоваться без входа.'],
    ['Özetleri kura göre TL’ye çevir', 'Convert summaries to TRY at exchange rates', 'Übersichten zum Wechselkurs in TRY umrechnen', 'Пересчитывать итоги в TRY по курсу'],
    ['Kur kaynağı Frankfurter (frankfurter.dev). TL karşılıkları yaklaşıktır. Kur değişebilir ve bankanın kuru farklı olabilir.', 'Rates: Frankfurter (frankfurter.dev). TRY values are approximate. Rates may change and differ from your bank’s rates.', 'Kursquelle: Frankfurter (frankfurter.dev). TRY-Werte sind ungefähr. Kurse können sich ändern und vom Bankkurs abweichen.', 'Источник курсов: Frankfurter (frankfurter.dev). Суммы в TRY приблизительны. Курсы меняются и могут отличаться от банковских.'],
    ['Borçlara aylara göre bak', 'View debts by month', 'Schulden nach Monat anzeigen', 'Долги по месяцам'],
    ['Ödeme arşivi', 'Payment history', 'Zahlungsarchiv', 'Архив платежей'],
    ['Bildirim izni', 'Notification permission', 'Benachrichtigungen erlauben', 'Разрешение уведомлений'],
    ['Bugün ödenecek borçlar', 'Debts due today', 'Heute fällige Schulden', 'Долги к оплате сегодня'],
    ['Verileri Dışa Aktar', 'Export data', 'Daten exportieren', 'Экспорт данных'],
    ['Verileri İçe Aktar', 'Import data', 'Daten importieren', 'Импорт данных'],
    ['Gizlilik ve kullanım bilgileri', 'Privacy and usage information', 'Datenschutz und Nutzungshinweise', 'Конфиденциальность и использование'],
    ['Telefondaki kayıtları sil', 'Delete records on this phone', 'Daten auf diesem Gerät löschen', 'Удалить данные с телефона'],
    ['Google Drive yedeğini sil', 'Delete Google Drive backup', 'Google-Drive-Sicherung löschen', 'Удалить резервную копию с Google Диска'],
    ['Kapat', 'Close', 'Schließen', 'Закрыть'],
    ['Borçların kaybolmasın', 'Keep your records safe', 'Bewahren Sie Ihre Daten sicher auf', 'Сохраните свои записи'],
    ['Kayıtlarını kendi Google Drive hesabında güvenle saklayabilir ve başka telefonda geri getirebilirsin. Değişiklikler internet olduğunda otomatik eşitlenir.', 'Store your records in your own Google Drive account and restore them on another phone. Changes sync automatically when online.', 'Speichern Sie Ihre Daten in Ihrem eigenen Google Drive und stellen Sie sie auf einem anderen Gerät wieder her. Änderungen werden bei Internetverbindung automatisch synchronisiert.', 'Храните записи в своём Google Диске и восстанавливайте их на другом телефоне. Изменения синхронизируются автоматически при наличии интернета.'],
    ['Google Drive ile eşitle', 'Sync with Google Drive', 'Mit Google Drive synchronisieren', 'Синхронизировать с Google Диском'],
    ['Şimdilik kullanma', 'Not now', 'Jetzt nicht', 'Не сейчас'],
    ['İsteğe bağlıdır. Daha sonra Ayarlar’dan açabilirsin.', 'Optional. You can enable this later in Settings.', 'Optional. Später in den Einstellungen aktivierbar.', 'Необязательно. Можно включить позже в настройках.'],
    ['Bir kutuyu işaretlemen gerekiyor', 'Select the Drive permission', 'Drive-Berechtigung auswählen', 'Выберите разрешение Google Диска'],
    ['Bir sonraki Google ekranında', 'On the next Google screen, select', 'Wählen Sie auf dem nächsten Google-Bildschirm', 'На следующем экране Google выберите'],
    ['“Google Drive’ınızda kendi yapılandırma verilerini görme, oluşturma ve silme”', '“See, create, and delete its own configuration data in your Google Drive”', '„Eigene Konfigurationsdaten in Ihrem Google Drive ansehen, erstellen und löschen“', '«Просмотр, создание и удаление собственных данных конфигурации на вашем Google Диске»'],
    ['izninin yanındaki kutuyu işaretle. Bu kutu işaretlenmezse eşitleme çalışmaz.', 'by checking its permission box. Sync requires this permission.', 'durch Ankreuzen der Berechtigung aus. Sie ist für die Synchronisierung erforderlich.', 'разрешение, отметив соответствующий флажок. Без него синхронизация не работает.'],
    ['Anladım, Google’a devam et', 'Continue to Google', 'Weiter zu Google', 'Продолжить в Google'],
    ['Aylara Göre Borçlar', 'Debts by month', 'Schulden nach Monat', 'Долги по месяцам'],
    ['Ödeme Arşivi', 'Payment history', 'Zahlungsarchiv', 'Архив платежей'],
    ['Henüz kaydedilmiş ödeme yok.', 'No payments recorded yet.', 'Noch keine Zahlungen erfasst.', 'Сохранённых платежей пока нет.'],
    ['Gizlilik ve Kullanım', 'Privacy and usage', 'Datenschutz und Nutzung', 'Конфиденциальность и использование'],
    ['Kayıtlar Google Drive eşitlemesi açılmadıkça yalnızca bu cihazda tutulur. Google ile giriş yapıldığında uygulama, hesabındaki kendine ayrılmış gizli uygulama klasöründe tek bir yedek dosyası kullanır.', 'Records stay on this device unless Google Drive sync is enabled. When signed in, the app uses one backup file in its private application folder in your account.', 'Daten bleiben auf diesem Gerät, solange die Google-Drive-Synchronisierung deaktiviert ist. Nach der Anmeldung nutzt die App eine Sicherungsdatei in ihrem privaten App-Ordner Ihres Kontos.', 'Записи хранятся только на устройстве, пока синхронизация с Google Диском выключена. После входа приложение использует один файл резервной копии в своей скрытой папке вашего аккаунта.'],
    ['“Öde” ve “Kısmi” işlemleri gerçek bir banka ödemesi yapmaz; yalnızca senin girdiğin ödeme bilgisini uygulamada kaydeder.', '“Pay” and “Partial” do not make bank payments; they only record the payment information you enter.', '„Bezahlen“ und „Teilzahlung“ führen keine Bankzahlung aus. Sie erfassen nur Ihre eingegebenen Zahlungsinformationen.', 'Действия «Оплатить» и «Частично» не переводят деньги через банк, а только сохраняют введённые сведения об оплате.'],
    ['Kurla TL’ye çevirme açılırsa yalnızca güncel kur bilgisi Frankfurter hizmetinden alınır. Borç ve gelir kayıtların bu hizmete gönderilmez.', 'If TRY conversion is enabled, only exchange rates are requested from Frankfurter. Your debt and income records are not sent to this service.', 'Bei aktivierter TRY-Umrechnung werden nur Wechselkurse von Frankfurter abgerufen. Ihre Schulden- und Einnahmedaten werden nicht an diesen Dienst gesendet.', 'При пересчёте в TRY у Frankfurter запрашиваются только курсы валют. Записи о долгах и доходах этому сервису не передаются.'],
    ['Uygulama finansal danışmanlık vermez. Kayıtların doğruluğu ve yedekleme tercihi kullanıcıya aittir.', 'The app does not provide financial advice. You are responsible for record accuracy and your backup choice.', 'Die App bietet keine Finanzberatung. Für die Richtigkeit der Daten und die Sicherungswahl sind Sie verantwortlich.', 'Приложение не предоставляет финансовых консультаций. Пользователь отвечает за точность записей и выбор резервного копирования.'],
    ['Gizlilik politikasını aç', 'Open privacy policy', 'Datenschutzerklärung öffnen', 'Открыть политику конфиденциальности'],
    ['Kullanım şartlarını aç', 'Open terms of use', 'Nutzungsbedingungen öffnen', 'Открыть условия использования'],
    ['Ay', 'Month', 'Monat', 'Месяц'],
    ['Bu ayda borç yok.', 'No debts this month.', 'Keine Schulden in diesem Monat.', 'В этом месяце долгов нет.'],
    ['Bu Aya Borç Ekle', 'Add debt to this month', 'Schuld für diesen Monat hinzufügen', 'Добавить долг на этот месяц'],
    ['Değişiklik hangi taksitlere uygulansın?', 'Which installments should change?', 'Welche Raten sollen geändert werden?', 'Какие платежи изменить?'],
    ['Sadece bu taksit', 'Only this installment', 'Nur diese Rate', 'Только этот платёж'],
    ['Yalnızca seçtiğin ayın tutarı ve tarihi değişir.', 'Only this installment’s amount and date change.', 'Nur Betrag und Datum dieser Rate werden geändert.', 'Изменятся только сумма и дата выбранного платежа.'],
    ['Kalan tüm taksitler', 'All unpaid installments', 'Alle offenen Raten', 'Все неоплаченные платежи'],
    ['Yeni tutar yalnızca açık taksitlere uygulanır; ödenenler değişmez. Tarih yalnızca seçtiğin taksitte değişir.', 'The new amount applies to unpaid installments only; paid installments stay unchanged. Only the selected installment’s date changes.', 'Der neue Betrag gilt nur für offene Raten; bezahlte Raten bleiben unverändert. Nur das Datum der ausgewählten Rate ändert sich.', 'Новая сумма применяется только к неоплаченным платежам. Оплаченные не меняются. Дата изменится только у выбранного платежа.'],
    ['Kayıtlı İsimler', 'Saved names', 'Gespeicherte Namen', 'Сохранённые названия'],
    ['Henüz kayıtlı isim yok.', 'No saved names yet.', 'Noch keine Namen gespeichert.', 'Сохранённых названий пока нет.'],
    ['Geri', 'Back', 'Zurück', 'Назад'],
    ['Önceki yıl', 'Previous year', 'Vorheriges Jahr', 'Предыдущий год'],
    ['Sonraki yıl', 'Next year', 'Nächstes Jahr', 'Следующий год'],
    ['Bu yıla dön', 'Return to this year', 'Zum aktuellen Jahr', 'Вернуться к текущему году'],
    ['Kayıtlı borç adlarını aç', 'Open saved debt names', 'Gespeicherte Bezeichnungen öffnen', 'Открыть сохранённые названия долгов'],
    ['Borcu düzenle', 'Edit debt', 'Schuld bearbeiten', 'Изменить долг'],
    ['Borcu sil', 'Delete debt', 'Schuld löschen', 'Удалить долг'],
    ['Sil', 'Delete', 'Löschen', 'Удалить'],
    ['Kaldır', 'Remove', 'Entfernen', 'Убрать'],
    ['Öde', 'Pay', 'Bezahlen', 'Оплатить'],
    ['Kısmi', 'Partial', 'Teilzahlung', 'Частично'],
    ['Geri al', 'Undo', 'Rückgängig', 'Отменить'],
    ['Silinmiş borç', 'Deleted debt', 'Gelöschte Schuld', 'Удалённый долг'],
    ['Borç silinmiş', 'Debt deleted', 'Schuld gelöscht', 'Долг удалён'],
    ['Maaştan', 'From income', 'Aus Einnahmen', 'Из доходов'],
    ['Ekstra', 'Extra funds', 'Zusätzliche Mittel', 'Дополнительные средства'],
    ['{amount} artı', '{amount} surplus', '{amount} Überschuss', '{amount} профицит'],
    ['{amount} eksi', '{amount} deficit', '{amount} Fehlbetrag', '{amount} дефицит'],
    ['{income} gelir / {debt} borç', '{income} income / {debt} debt', '{income} Einnahmen / {debt} Schulden', '{income} доход / {debt} долг'],
    ['Tek seferlik · {date}', 'One-time · {date}', 'Einmalig · {date}', 'Разовый · {date}'],
    ['Düzenli · her ay · {currency}', 'Recurring · monthly · {currency}', 'Regelmäßig · monatlich · {currency}', 'Регулярный · ежемесячно · {currency}'],
    [' (kısmi ödendi: {amount})', ' (partially paid: {amount})', ' (teilweise bezahlt: {amount})', ' (частично оплачено: {amount})'],
    ['{name} — kalan: {amount}', '{name} — remaining: {amount}', '{name} — offen: {amount}', '{name} — остаток: {amount}'],
    ['Geçerli tutar girin', 'Enter a valid amount', 'Gültigen Betrag eingeben', 'Введите корректную сумму'],
    ['Kalan tutardan fazla olamaz', 'Cannot exceed the remaining amount', 'Darf den offenen Betrag nicht übersteigen', 'Сумма не может превышать остаток'],
    ['Maaştan ödeme: {name}', 'Payment from income: {name}', 'Zahlung aus Einnahmen: {name}', 'Платёж из доходов: {name}'],
    ['Maaştan ödendi', 'Paid from income', 'Aus Einnahmen bezahlt', 'Оплачено из доходов'],
    ['Ekstra ile ödendi', 'Paid with extra funds', 'Mit zusätzlichen Mitteln bezahlt', 'Оплачено дополнительными средствами'],
    ['Borç silindiği için ödeme geri alınamaz', 'Cannot undo payment because the debt was deleted', 'Die Zahlung kann nicht rückgängig gemacht werden, da die Schuld gelöscht wurde', 'Нельзя отменить оплату: долг удалён'],
    ['{amount} tutarındaki ödeme geri alınsın mı?', 'Undo the payment of {amount}?', 'Zahlung über {amount} rückgängig machen?', 'Отменить платёж на сумму {amount}?'],
    ['Ödeme geri alındı', 'Payment undone', 'Zahlung rückgängig gemacht', 'Оплата отменена'],
    ['{count} taksit × {amount} = {total}', '{count} installments × {amount} = {total}', '{count} Raten × {amount} = {total}', '{count} платежей × {amount} = {total}'],
    ['Eksik bilgi', 'Complete the required fields', 'Pflichtfelder ausfüllen', 'Заполните обязательные поля'],
    ['{label} taksit · {amount} · {date}', 'Installment {label} · {amount} · {date}', 'Rate {label} · {amount} · {date}', 'Платёж {label} · {amount} · {date}'],
    [' · {count} taksit', ' · {count} installments', ' · {count} Raten', ' · {count} платежей'],
    ['{detail} olarak güncellendi', 'Updated: {detail}', 'Aktualisiert: {detail}', 'Обновлено: {detail}'],
    ['{count} taksit · Her taksit {amount}', '{count} installments · {amount} each', '{count} Raten · je {amount}', '{count} платежей · по {amount}'],
    ['“{name}” borcu ve kalan taksitleri silinsin mi? Ödeme arşivi korunur.', 'Delete “{name}” and its remaining installments? Payment history is kept.', '„{name}“ und die offenen Raten löschen? Das Zahlungsarchiv bleibt erhalten.', 'Удалить долг «{name}» и оставшиеся платежи? Архив платежей сохранится.'],
    ['Borç silindi', 'Debt deleted', 'Schuld gelöscht', 'Долг удалён'],
    ['Tarih seçin', 'Select a date', 'Datum auswählen', 'Выберите дату'],
    ['Tek seferlik gelir eklendi', 'One-time income added', 'Einmalige Einnahme hinzugefügt', 'Разовый доход добавлен'],
    ['Düzenli gelir eklendi', 'Recurring income added', 'Regelmäßige Einnahme hinzugefügt', 'Регулярный доход добавлен'],
    ['“{name}” geliri silinsin mi?', 'Delete income “{name}”?', 'Einnahme „{name}“ löschen?', 'Удалить доход «{name}»?'],
    ['Gelir silindi', 'Income deleted', 'Einnahme gelöscht', 'Доход удалён'],
    ['Toplam: {total}', 'Total: {total}', 'Gesamt: {total}', 'Всего: {total}'],
    ['Harici depolama', 'External storage', 'Externer Speicher', 'Внешнее хранилище'],
    ['Uygulama klasörü', 'App folder', 'App-Ordner', 'Папка приложения'],
    ['Geçici uygulama klasörü', 'Temporary app folder', 'Temporärer App-Ordner', 'Временная папка приложения'],
    ['Kaydedildi: {path}', 'Saved: {path}', 'Gespeichert: {path}', 'Сохранено: {path}'],
    ['Borç Takip yedek', 'Debt Tracker backup', 'Sicherung der Schuldenübersicht', 'Резервная копия учёта долгов'],
    ['Dosyayı kaydet veya paylaş', 'Save or share file', 'Datei speichern oder teilen', 'Сохранить файл или поделиться'],
    ['İndirildi: {file}', 'Downloaded: {file}', 'Heruntergeladen: {file}', 'Скачано: {file}'],
    ['Geçersiz borç kayıtları', 'Invalid debt records', 'Ungültige Schuldendaten', 'Некорректные записи о долгах'],
    ['Geçersiz yedek kayıtları', 'Invalid backup records', 'Ungültige Sicherungsdaten', 'Некорректные данные резервной копии'],
    ['Dosyadaki {debts} borç ve {incomes} gelir kaydı telefondaki mevcut kayıtların yerini alacak. Devam edilsin mi?', 'The file’s {debts} debts and {incomes} income records will replace the records on this phone. Continue?', 'Die {debts} Schulden und {incomes} Einnahmen aus der Datei ersetzen die Daten auf diesem Gerät. Fortfahren?', 'Данные на телефоне будут заменены: {debts} долгов и {incomes} доходов из файла. Продолжить?'],
    ['Veriler yüklendi', 'Data imported', 'Daten importiert', 'Данные загружены'],
    ['Geçersiz dosya', 'Invalid file', 'Ungültige Datei', 'Некорректный файл'],
    ['Eşitlemenin bitmesini bekle', 'Wait for syncing to finish', 'Warten Sie auf das Ende der Synchronisierung', 'Дождитесь завершения синхронизации'],
    ['Telefondaki kayıtlar silinecek, Drive yedeği korunacak. Otomatik eşitleme duraklatılacak. Devam edilsin mi?', 'Records on this phone will be deleted. The Drive backup is kept and automatic sync will pause. Continue?', 'Daten auf diesem Gerät werden gelöscht. Die Drive-Sicherung bleibt erhalten und die automatische Synchronisierung wird pausiert. Fortfahren?', 'Данные на телефоне будут удалены. Копия на Диске сохранится, автосинхронизация будет приостановлена. Продолжить?'],
    ['Telefon kayıtları silindi', 'Records deleted from this phone', 'Daten auf diesem Gerät gelöscht', 'Данные с телефона удалены'],
    ['Bildirim izni verildi', 'Notifications allowed', 'Benachrichtigungen erlaubt', 'Уведомления разрешены'],
    ['İzin reddedildi', 'Permission denied', 'Berechtigung verweigert', 'Разрешение отклонено'],
    ['Bildirim desteklenmiyor', 'Notifications are not supported', 'Benachrichtigungen werden nicht unterstützt', 'Уведомления не поддерживаются'],
    ["Sadece Android APK'da çalışır", 'Available in the Android app only', 'Nur in der Android-App verfügbar', 'Доступно только в приложении Android'],
    ['Bugün ödenecek borçlar', 'Debts due today', 'Heute fällige Schulden', 'Долги к оплате сегодня'],
    ['Otomatik eşitleme duraklatıldı', 'Automatic sync paused', 'Automatische Synchronisierung pausiert', 'Автосинхронизация приостановлена'],
    ['Eşitleme başarısız · Yeniden dene', 'Sync failed · Try again', 'Synchronisierung fehlgeschlagen · Erneut versuchen', 'Ошибка синхронизации · Повторите попытку'],
    ['Eşitleme bekliyor', 'Sync pending', 'Synchronisierung ausstehend', 'Ожидание синхронизации'],
    ['Eşitlendi · {date}', 'Synced · {date}', 'Synchronisiert · {date}', 'Синхронизировано · {date}'],
    ['Google Drive bağlı', 'Google Drive connected', 'Google Drive verbunden', 'Google Диск подключён'],
    ['Google girişi şu anda kullanılamıyor', 'Google sign-in is currently unavailable', 'Google-Anmeldung ist derzeit nicht verfügbar', 'Вход через Google сейчас недоступен'],
    ['Google hesabı açılıyor…', 'Opening Google sign-in…', 'Google-Anmeldung wird geöffnet…', 'Открывается вход через Google…'],
    ['Google girişi tamamlanamadı', 'Google sign-in could not be completed', 'Google-Anmeldung konnte nicht abgeschlossen werden', 'Не удалось выполнить вход через Google'],
    ['Google hesabından çıkış yapıldı', 'Signed out of Google', 'Von Google abgemeldet', 'Вы вышли из Google'],
    ['Google hesabından çıkış yapılamadı', 'Could not sign out of Google', 'Abmeldung von Google fehlgeschlagen', 'Не удалось выйти из Google'],
    ['Eşitlemek için internet bağlantısı gerekiyor', 'An internet connection is needed to sync', 'Für die Synchronisierung ist Internet erforderlich', 'Для синхронизации нужен интернет'],
    ['Drive yedeği geri yüklendi', 'Drive backup restored', 'Drive-Sicherung wiederhergestellt', 'Резервная копия с Диска восстановлена'],
    ['Google Drive ile eşitlendi', 'Synced with Google Drive', 'Mit Google Drive synchronisiert', 'Синхронизировано с Google Диском'],
    ['Eşitleme yapılamadı · Bağlantıyı ve Drive iznini kontrol et', 'Could not sync · Check your connection and Drive permission', 'Synchronisierung fehlgeschlagen · Verbindung und Drive-Berechtigung prüfen', 'Не удалось синхронизировать · Проверьте интернет и разрешение Google Диска'],
    ['Drive yedeğini silmek için internete bağlan', 'Connect to the internet to delete the Drive backup', 'Zum Löschen der Drive-Sicherung mit dem Internet verbinden', 'Подключитесь к интернету, чтобы удалить копию с Диска'],
    ['Bağlı Google hesabındaki Borç Takip yedeği kalıcı olarak silinecek. Telefonda bulunan kayıtlar korunacak ve otomatik eşitleme duraklatılacak. Devam edilsin mi?', 'The Debt Tracker backup in the connected Google account will be permanently deleted. Records on this phone are kept and automatic sync will pause. Continue?', 'Die Sicherung im verbundenen Google-Konto wird endgültig gelöscht. Daten auf diesem Gerät bleiben erhalten und die automatische Synchronisierung wird pausiert. Fortfahren?', 'Резервная копия в подключённом аккаунте Google будет удалена навсегда. Данные на телефоне сохранятся, автосинхронизация приостановится. Продолжить?'],
    ['Drive yedeği silindi', 'Drive backup deleted', 'Drive-Sicherung gelöscht', 'Резервная копия с Диска удалена'],
    ['Drive yedeği bulunamadı', 'No Drive backup found', 'Keine Drive-Sicherung gefunden', 'Резервная копия на Диске не найдена'],
    ['Drive yedeğinin silindiği doğrulanamadı', 'Could not confirm deletion of the Drive backup', 'Löschung der Drive-Sicherung konnte nicht bestätigt werden', 'Не удалось подтвердить удаление копии с Диска'],
    ['İsim listeden kaldırıldı', 'Name removed from the list', 'Name aus der Liste entfernt', 'Название убрано из списка'],
    ['“{name}” ismini listeden kaldırmak istiyor musunuz?', 'Remove “{name}” from the list?', '„{name}“ aus der Liste entfernen?', 'Убрать название «{name}» из списка?']
  ];
  const dictionaries = Object.create(null);
  phrases.forEach(function(row) {
    dictionaries[row[0]] = { tr: row[0], en: row[1], de: row[2], ru: row[3] };
  });
  let language = 'tr';
  try {
    const saved = root.localStorage.getItem('borc_takip_language');
    if (Object.prototype.hasOwnProperty.call(languages, saved)) language = saved;
  } catch (error) { /* A blocked preference store must not prevent startup. */ }
  const staticNodes = [];
  const staticAttributes = [];
  let initialized = false;
  function t(source, values) {
    const entry = dictionaries[source];
    const translated = entry ? entry[language] : source;
    return translated.replace(/\{([a-zA-Z]+)\}/g, function(match, key) {
      return values && Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match;
    });
  }
  function apply() {
    const doc = root.document;
    if (!doc) return;
    doc.documentElement.lang = language;
    doc.title = t('Borç Takip');
    staticNodes.forEach(function(item) {
      if (item.node.isConnected) item.node.nodeValue = item.before + t(item.source) + item.after;
    });
    staticAttributes.forEach(function(item) {
      if (item.element.isConnected) item.element.setAttribute(item.attribute, t(item.source));
    });
    const select = doc.getElementById('app-language');
    if (select) select.value = language;
  }
  function init() {
    const doc = root.document;
    if (!doc || initialized) { apply(); return; }
    initialized = true;
    // Capture only the initial, trusted UI. Never rescan rendered debt/income names.
    const walker = doc.createTreeWalker(doc.body, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('script, style, [data-i18n-ignore]')) continue;
      const source = node.nodeValue.trim();
      if (!dictionaries[source]) continue;
      const offset = node.nodeValue.indexOf(source);
      staticNodes.push({ node: node, source: source, before: node.nodeValue.slice(0, offset), after: node.nodeValue.slice(offset + source.length) });
    }
    ['placeholder', 'title', 'aria-label', 'alt'].forEach(function(attribute) {
      doc.querySelectorAll('[' + attribute + ']').forEach(function(element) {
        const source = element.getAttribute(attribute);
        if (dictionaries[source]) staticAttributes.push({ element: element, attribute: attribute, source: source });
      });
    });
    apply();
  }
  function setLanguage(next) {
    if (!Object.prototype.hasOwnProperty.call(languages, next)) return false;
    try { root.localStorage.setItem('borc_takip_language', next); }
    catch (error) { return false; }
    language = next;
    apply();
    return true;
  }
  root.BorcI18n = {
    t: t, init: init, apply: apply, setLanguage: setLanguage,
    getLanguage: function() { return language; },
    getLocale: function() { return languages[language].locale; },
    languages: languages, dictionaries: dictionaries
  };
})(globalThis);
