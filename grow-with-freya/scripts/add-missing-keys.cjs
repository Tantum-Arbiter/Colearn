const fs = require('fs');
const path = require('path');

// Missing keys with translations per locale
const translations = {
  'common.openSettings': {
    ar: 'فتح الإعدادات', da: 'Åbn Indstillinger', de: 'Einstellungen öffnen', es: 'Abrir Configuración',
    fr: 'Ouvrir les Paramètres', it: 'Apri Impostazioni', ja: '設定を開く', la: 'Aperi Optiones',
    nl: 'Instellingen openen', pl: 'Otwórz Ustawienia', pt: 'Abrir Configurações', tr: 'Ayarları Aç', zh: '打开设置',
  },
  'screenTime.overLimit': {
    ar: 'تجاوز الحد', da: 'Over Grænse', de: 'Über dem Limit', es: 'Sobre el Límite',
    fr: 'Au-delà de la limite', it: 'Oltre il Limite', ja: '制限超過', la: 'Supra Limitem',
    nl: 'Over de Limiet', pl: 'Ponad Limit', pt: 'Acima do Limite', tr: 'Limit Aşıldı', zh: '超出限制',
  },
  'reminders.permissionRequired.title': {
    ar: 'مطلوب إذن الإشعارات', da: 'Notifikationer Påkrævet', de: 'Benachrichtigungen Erforderlich', es: 'Notificaciones Requeridas',
    fr: 'Notifications Requises', it: 'Notifiche Necessarie', ja: '通知の許可が必要です', la: 'Notificationes Necessariae',
    nl: 'Meldingen Vereist', pl: 'Wymagane Powiadomienia', pt: 'Notificações Necessárias', tr: 'Bildirimler Gerekli', zh: '需要通知权限',
  },
  'reminders.permissionRequired.message': {
    ar: 'لتلقي التذكيرات، يرجى تفعيل الإشعارات لهذا التطبيق في إعدادات جهازك.',
    da: 'For at modtage påmindelser skal du aktivere notifikationer for denne app i din enheds indstillinger.',
    de: 'Um Erinnerungen zu erhalten, aktivieren Sie bitte die Benachrichtigungen für diese App in Ihren Geräteeinstellungen.',
    es: 'Para recibir recordatorios, habilita las notificaciones para esta aplicación en la configuración de tu dispositivo.',
    fr: 'Pour recevoir des rappels, veuillez activer les notifications pour cette application dans les paramètres de votre appareil.',
    it: 'Per ricevere i promemoria, abilita le notifiche per questa app nelle impostazioni del dispositivo.',
    ja: 'リマインダーを受け取るには、デバイスの設定でこのアプリの通知を有効にしてください。',
    la: 'Ad admonitiones accipiendas, notificationes pro hac applicatione in optionibus instrumenti tui permitte.',
    nl: 'Om herinneringen te ontvangen, schakel meldingen in voor deze app in je apparaatinstellingen.',
    pl: 'Aby otrzymywać przypomnienia, włącz powiadomienia dla tej aplikacji w ustawieniach urządzenia.',
    pt: 'Para receber lembretes, ative as notificações para este aplicativo nas configurações do dispositivo.',
    tr: 'Hatırlatıcılar almak için lütfen cihaz ayarlarında bu uygulama için bildirimleri etkinleştirin.',
    zh: '要接收提醒，请在设备设置中启用此应用的通知。',
  },
  'tutorial.mainMenu.instruments.title': {
    ar: 'الآلات الموسيقية', da: 'Instrumenter', de: 'Instrumente', es: 'Instrumentos',
    fr: 'Instruments', it: 'Strumenti', ja: '楽器', la: 'Instrumenta',
    nl: 'Instrumenten', pl: 'Instrumenty', pt: 'Instrumentos', tr: 'Enstrümanlar', zh: '乐器',
  },
  'tutorial.mainMenu.instruments.description': {
    ar: 'تدرب على الأغاني أو اعزف بحرية على آلات مختلفة. ابنِ مهاراتك الموسيقية أثناء الاستمتاع!',
    da: 'Øv sange eller jam frit på forskellige instrumenter. Opbyg musikalske færdigheder mens du har det sjovt!',
    de: 'Übe Lieder oder spiele frei auf verschiedenen Instrumenten. Baue musikalische Fähigkeiten auf und hab Spaß dabei!',
    es: '¡Practica canciones o toca libremente en diferentes instrumentos. Desarrolla habilidades musicales mientras te diviertes!',
    fr: 'Pratiquez des chansons ou jouez librement sur différents instruments. Développez vos compétences musicales en vous amusant !',
    it: 'Esercitati con le canzoni o suona liberamente su diversi strumenti. Sviluppa abilità musicali divertendoti!',
    ja: '曲を練習したり、様々な楽器で自由に演奏しましょう。楽しみながら音楽スキルを身につけよう！',
    la: 'Cantiones exerce vel libere in diversis instrumentis lude. Artes musicas cum gaudio aedifica!',
    nl: 'Oefen liedjes of jam vrij op verschillende instrumenten. Bouw muzikale vaardigheden op terwijl je plezier hebt!',
    pl: 'Ćwicz piosenki lub graj swobodnie na różnych instrumentach. Rozwijaj umiejętności muzyczne, bawiąc się!',
    pt: 'Pratique músicas ou toque livremente em diferentes instrumentos. Desenvolva habilidades musicais enquanto se diverte!',
    tr: 'Şarkıları pratik edin veya farklı enstrümanlarda özgürce çalın. Eğlenirken müzik becerilerinizi geliştirin!',
    zh: '练习歌曲或自由演奏各种乐器。在乐趣中培养音乐技能！',
  },
  'tutorial.mainMenu.learning.title': {
    ar: 'التعلم', da: 'Læring', de: 'Lernen', es: 'Aprendizaje',
    fr: 'Apprentissage', it: 'Apprendimento', ja: '学習', la: 'Doctrina',
    nl: 'Leren', pl: 'Nauka', pt: 'Aprendizado', tr: 'Öğrenme', zh: '学习',
  },
  'tutorial.mainMenu.learning.description': {
    ar: 'أنشطة إملاء وأرقام تفاعلية تساعد في بناء مهارات القراءة والحساب المبكرة.',
    da: 'Interaktive stave- og talaktiviteter der hjælper med at opbygge tidlige læse- og regnefærdigheder.',
    de: 'Interaktive Rechtschreib- und Zahlenaktivitäten, die beim Aufbau früher Lese- und Rechenfähigkeiten helfen.',
    es: 'Actividades interactivas de ortografía y números que ayudan a desarrollar habilidades tempranas de lectoescritura y aritmética.',
    fr: 'Activités interactives d\'orthographe et de calcul qui aident à développer les compétences précoces en lecture et en numératie.',
    it: 'Attività interattive di ortografia e numeri che aiutano a sviluppare le prime competenze di lettura e calcolo.',
    ja: '初期の読み書きと計算スキルを身につける、インタラクティブなスペリングと数字のアクティビティ。',
    la: 'Activitates orthographiae et numerorum interactivae quae artes primae lectionis et numerationis aedificant.',
    nl: 'Interactieve spelling- en rekenactiviteiten die helpen bij het opbouwen van vroege lees- en rekenvaardigheden.',
    pl: 'Interaktywne ćwiczenia ortograficzne i liczbowe, które pomagają rozwijać wczesne umiejętności czytania i liczenia.',
    pt: 'Atividades interativas de ortografia e números que ajudam a desenvolver habilidades iniciais de leitura e matemática.',
    tr: 'Erken okuma yazma ve sayısal becerilerin geliştirilmesine yardımcı olan etkileşimli yazım ve sayı aktiviteleri.',
    zh: '互动拼写和数字活动，帮助培养早期读写和算术技能。',
  },
};

// Subscription keys - same pattern for all
const subKeys = {
  'subscription.errorTitle': {
    ar: 'خطأ في الاشتراك', da: 'Abonnementsfejl', de: 'Abonnementfehler', es: 'Error de Suscripción',
    fr: 'Erreur d\'Abonnement', it: 'Errore Abbonamento', ja: 'サブスクリプションエラー', la: 'Error Subscriptionis',
    nl: 'Abonnementsfout', pl: 'Błąd Subskrypcji', pt: 'Erro de Assinatura', tr: 'Abonelik Hatası', zh: '订阅错误',
  },
  'subscription.errorUnavailable': {
    ar: 'هذه الخطة غير متاحة حالياً. يرجى المحاولة لاحقاً.',
    da: 'Denne plan er ikke tilgængelig lige nu. Prøv igen senere.',
    de: 'Dieser Plan ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.',
    es: 'Este plan no está disponible ahora. Inténtalo más tarde.',
    fr: 'Ce plan n\'est pas disponible actuellement. Veuillez réessayer plus tard.',
    it: 'Questo piano non è disponibile al momento. Riprova più tardi.',
    ja: 'このプランは現在利用できません。後でもう一度お試しください。',
    la: 'Hic ratio nunc non praesto est. Postea iterum tempta.',
    nl: 'Dit abonnement is momenteel niet beschikbaar. Probeer het later opnieuw.',
    pl: 'Ten plan nie jest obecnie dostępny. Spróbuj ponownie później.',
    pt: 'Este plano não está disponível no momento. Tente novamente mais tarde.',
    tr: 'Bu plan şu anda mevcut değil. Lütfen daha sonra tekrar deneyin.',
    zh: '此方案目前不可用。请稍后重试。',
  },
  'subscription.errorGeneric': {
    ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    da: 'Noget gik galt. Prøv igen.',
    de: 'Etwas ist schiefgegangen. Bitte versuchen Sie es erneut.',
    es: 'Algo salió mal. Inténtalo de nuevo.',
    fr: 'Un problème est survenu. Veuillez réessayer.',
    it: 'Qualcosa è andato storto. Riprova.',
    ja: '問題が発生しました。もう一度お試しください。',
    la: 'Aliquid erravit. Iterum tempta.',
    nl: 'Er is iets misgegaan. Probeer het opnieuw.',
    pl: 'Coś poszło nie tak. Spróbuj ponownie.',
    pt: 'Algo deu errado. Tente novamente.',
    tr: 'Bir şeyler ters gitti. Lütfen tekrar deneyin.',
    zh: '出了点问题。请重试。',
  },
};

// Write translations map to file for the insertion script to use
const allTranslations = { ...translations, ...subKeys };

// Write to a JSON file for reference
fs.writeFileSync('/tmp/missing-translations.json', JSON.stringify(allTranslations, null, 2));
console.log('Translations written to /tmp/missing-translations.json');
console.log('Keys to add: ' + Object.keys(allTranslations).length);
