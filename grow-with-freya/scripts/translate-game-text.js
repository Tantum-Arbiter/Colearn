#!/usr/bin/env node
/**
 * Apply translations for game UI, learning UI, bridge headers, and feelings activities
 * to all non-English locale files.
 *
 * Usage: node scripts/translate-game-text.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');

// ── Translation map: key → { locale: translation } ──────────────────────────
// Keys use the format from the locale file (flat property names within their section)
const translations = {
  // ══════════════════════════════════════════════════════════════════════════
  // GAMES section
  // ══════════════════════════════════════════════════════════════════════════
  'games.wellDone': {
    ar: 'أحسنت!', da: 'Godt klaret!', de: 'Gut gemacht!', es: '¡Muy bien!',
    fr: 'Bien joué !', it: 'Ben fatto!', ja: 'よくできました！', la: 'Bene factum!',
    nl: 'Goed gedaan!', pl: 'Świetnie!', pt: 'Muito bem!', tr: 'Aferin!', zh: '做得好！',
  },
  'games.roundComplete': {
    ar: 'أنهيت الجولة — عمل رائع!', da: 'Du klarede runden — flot arbejde!',
    de: 'Du hast die Runde geschafft — toll gemacht!', es: '¡Terminaste la ronda — buen trabajo!',
    fr: 'Tu as terminé la manche — bravo !', it: 'Hai completato il turno — ottimo lavoro!',
    ja: 'ラウンド完了 — よくがんばりました！', la: 'Circulum confecisti — optime!',
    nl: 'Je hebt de ronde voltooid — goed gedaan!', pl: 'Ukończyłeś rundę — świetna robota!',
    pt: 'Você terminou a rodada — ótimo trabalho!', tr: 'Turu tamamladın — harika iş!',
    zh: '你完成了这一轮 — 太棒了！',
  },
  'games.continue': {
    ar: 'متابعة', da: 'Fortsæt', de: 'Weiter', es: 'Continuar',
    fr: 'Continuer', it: 'Continua', ja: 'つづける', la: 'Perge',
    nl: 'Doorgaan', pl: 'Kontynuuj', pt: 'Continuar', tr: 'Devam', zh: '继续',
  },
  'games.tryAgain': {
    ar: 'جرّب حرفًا آخر!', da: 'Prøv et andet bogstav!', de: 'Versuch einen anderen Buchstaben!',
    es: '¡Prueba otra letra!', fr: 'Essaie une autre lettre !', it: 'Prova un\'altra lettera!',
    ja: '別の文字を選んでね！', la: 'Aliam litteram tempta!',
    nl: 'Probeer een andere letter!', pl: 'Spróbuj innej litery!',
    pt: 'Tente outra letra!', tr: 'Başka bir harf dene!', zh: '试试另一个字母！',
  },
  'games.tryAgainWord': {
    ar: 'جرّب كلمة أخرى!', da: 'Prøv et andet ord!', de: 'Versuch ein anderes Wort!',
    es: '¡Prueba otra palabra!', fr: 'Essaie un autre mot !', it: 'Prova un\'altra parola!',
    ja: '別の言葉を選んでね！', la: 'Aliud verbum tempta!',
    nl: 'Probeer een ander woord!', pl: 'Spróbuj innego słowa!',
    pt: 'Tente outra palavra!', tr: 'Başka bir kelime dene!', zh: '试试另一个词！',
  },
  'games.chooseLetter': {
    ar: 'اختر حرفًا:', da: 'Vælg et bogstav:', de: 'Wähle einen Buchstaben:',
    es: 'Elige una letra:', fr: 'Choisis une lettre :', it: 'Scegli una lettera:',
    ja: '文字をえらんでね：', la: 'Elige litteram:',
    nl: 'Kies een letter:', pl: 'Wybierz literę:', pt: 'Escolha uma letra:',
    tr: 'Bir harf seç:', zh: '选一个字母：',
  },
  'games.chooseWord': {
    ar: 'اختر كلمة:', da: 'Vælg et ord:', de: 'Wähle ein Wort:',
    es: 'Elige una palabra:', fr: 'Choisis un mot :', it: 'Scegli una parola:',
    ja: '言葉をえらんでね：', la: 'Elige verbum:',
    nl: 'Kies een woord:', pl: 'Wybierz słowo:', pt: 'Escolha uma palavra:',
    tr: 'Bir kelime seç:', zh: '选一个词：',
  },
  'games.nextWord': {
    ar: 'الكلمة التالية', da: 'Næste ord', de: 'Nächstes Wort', es: 'Siguiente palabra',
    fr: 'Mot suivant', it: 'Parola successiva', ja: 'つぎのことば', la: 'Verbum proximum',
    nl: 'Volgend woord', pl: 'Następne słowo', pt: 'Próxima palavra',
    tr: 'Sonraki kelime', zh: '下一个词',
  },
  'games.nextPage': {
    ar: 'الصفحة التالية', da: 'Næste side', de: 'Nächste Seite', es: 'Siguiente página',
    fr: 'Page suivante', it: 'Pagina successiva', ja: 'つぎのページ', la: 'Pagina proxima',
    nl: 'Volgende pagina', pl: 'Następna strona', pt: 'Próxima página',
    tr: 'Sonraki sayfa', zh: '下一页',
  },
  'games.showHint': {
    ar: 'أظهر التلميح', da: 'Vis hint', de: 'Hinweis zeigen', es: 'Mostrar pista',
    fr: 'Afficher l\'indice', it: 'Mostra suggerimento', ja: 'ヒントをみる', la: 'Indicium monstra',
    nl: 'Hint tonen', pl: 'Pokaż podpowiedź', pt: 'Mostrar dica',
    tr: 'İpucu göster', zh: '显示提示',
  },
  'games.hideHint': {
    ar: 'إخفاء التلميح', da: 'Skjul hint', de: 'Hinweis ausblenden', es: 'Ocultar pista',
    fr: 'Masquer l\'indice', it: 'Nascondi suggerimento', ja: 'ヒントをかくす', la: 'Indicium cela',
    nl: 'Hint verbergen', pl: 'Ukryj podpowiedź', pt: 'Esconder dica',
    tr: 'İpucu gizle', zh: '隐藏提示',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEARNING section — UI keys
  // ══════════════════════════════════════════════════════════════════════════
  'learning.feelingsTitle': {
    ar: 'المشاعر', da: 'Følelser', de: 'Gefühle', es: 'Sentimientos',
    fr: 'Sentiments', it: 'Emozioni', ja: 'きもち', la: 'Affectus',
    nl: 'Gevoelens', pl: 'Uczucia', pt: 'Sentimentos', tr: 'Duygular', zh: '情感',
  },
  'learning.age12': {
    ar: 'الأعمار ١-٢', da: 'Alder 1-2', de: 'Alter 1-2', es: 'Edades 1-2',
    fr: 'Âges 1-2', it: 'Età 1-2', ja: '1〜2歳', la: 'Aetas 1-2',
    nl: 'Leeftijd 1-2', pl: 'Wiek 1-2', pt: 'Idades 1-2', tr: 'Yaş 1-2', zh: '1-2岁',
  },
  'learning.age24': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },
  'learning.age4plus': {
    ar: 'الأعمار ٤+', da: 'Alder 4+', de: 'Alter 4+', es: 'Edades 4+',
    fr: 'Âges 4+', it: 'Età 4+', ja: '4歳以上', la: 'Aetas 4+',
    nl: 'Leeftijd 4+', pl: 'Wiek 4+', pt: 'Idades 4+', tr: 'Yaş 4+', zh: '4岁以上',
  },
  'learning.storyPicker.choose': {
    ar: 'اختر قصة للعب', da: 'Vælg en historie at spille', de: 'Wähle eine Geschichte zum Spielen',
    es: 'Elige una historia para jugar', fr: 'Choisis une histoire à jouer',
    it: 'Scegli una storia da giocare', ja: 'あそぶおはなしをえらんでね',
    la: 'Elige fabulam ad ludendum', nl: 'Kies een verhaal om te spelen',
    pl: 'Wybierz historię do zagrania', pt: 'Escolha uma história para jogar',
    tr: 'Oynayacağın bir hikâye seç', zh: '选一个故事来玩',
  },
  'learning.storyPicker.pages': {
    ar: '{{count}} صفحات', da: '{{count}} sider', de: '{{count}} Seiten',
    es: '{{count}} páginas', fr: '{{count}} pages', it: '{{count}} pagine',
    ja: '{{count}}ページ', la: '{{count}} paginae', nl: '{{count}} pagina\'s',
    pl: '{{count}} stron', pt: '{{count}} páginas', tr: '{{count}} sayfa', zh: '{{count}}页',
  },
  'learning.activityMode.play': {
    ar: 'ألعب', da: 'Spil', de: 'Spielen', es: 'Jugar',
    fr: 'Jouer', it: 'Gioca', ja: 'あそぶ', la: 'Lude',
    nl: 'Spelen', pl: 'Graj', pt: 'Jogar', tr: 'Oyna', zh: '开始玩',
  },
  'learning.activityMode.preview': {
    ar: 'معاينة', da: 'Forhåndsvisning', de: 'Vorschau', es: 'Vista previa',
    fr: 'Aperçu', it: 'Anteprima', ja: 'プレビュー', la: 'Praevisio',
    nl: 'Voorbeeld', pl: 'Podgląd', pt: 'Pré-visualizar', tr: 'Önizleme', zh: '预览',
  },
  'learning.activityMode.tapToBegin': {
    ar: 'اضغط للبدء', da: 'Tryk for at begynde', de: 'Tippe zum Starten',
    es: 'Toca para empezar', fr: 'Appuie pour commencer', it: 'Tocca per iniziare',
    ja: 'タップではじめよう', la: 'Tange ut incipias', nl: 'Tik om te beginnen',
    pl: 'Dotknij, aby zacząć', pt: 'Toque para começar', tr: 'Başlamak için dokun', zh: '点击开始',
  },
  'learning.activityPreview.ageRange': {
    ar: 'الفئة العمرية', da: 'Aldersgruppe', de: 'Altersbereich', es: 'Rango de edad',
    fr: 'Tranche d\'âge', it: 'Fascia d\'età', ja: 'たいしょうねんれい', la: 'Aetas',
    nl: 'Leeftijdsgroep', pl: 'Przedział wiekowy', pt: 'Faixa etária',
    tr: 'Yaş aralığı', zh: '年龄范围',
  },
  'learning.activityPreview.ages': {
    ar: 'الأعمار {{range}}', da: 'Alder {{range}}', de: 'Alter {{range}}',
    es: 'Edades {{range}}', fr: 'Âges {{range}}', it: 'Età {{range}}',
    ja: '{{range}}歳', la: 'Aetas {{range}}', nl: 'Leeftijd {{range}}',
    pl: 'Wiek {{range}}', pt: 'Idades {{range}}', tr: 'Yaş {{range}}', zh: '{{range}}岁',
  },
  'learning.activityPreview.type': {
    ar: 'النوع', da: 'Type', de: 'Typ', es: 'Tipo',
    fr: 'Type', it: 'Tipo', ja: 'タイプ', la: 'Genus',
    nl: 'Type', pl: 'Typ', pt: 'Tipo', tr: 'Tür', zh: '类型',
  },
  'learning.activityPreview.playActivity': {
    ar: 'ألعب', da: 'Spil', de: 'Spielen', es: 'Jugar',
    fr: 'Jouer', it: 'Gioca', ja: 'あそぶ', la: 'Lude',
    nl: 'Spelen', pl: 'Graj', pt: 'Jogar', tr: 'Oyna', zh: '开始玩',
  },
  'learning.activityPreview.aboutThisActivity': {
    ar: 'عن هذا النشاط', da: 'Om denne aktivitet', de: 'Über diese Aktivität',
    es: 'Sobre esta actividad', fr: 'À propos de cette activité',
    it: 'Informazioni su questa attività', ja: 'このアクティビティについて',
    la: 'De hac actione', nl: 'Over deze activiteit', pl: 'O tej aktywności',
    pt: 'Sobre esta atividade', tr: 'Bu etkinlik hakkında', zh: '关于此活动',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BRIDGE section — headers
  // ══════════════════════════════════════════════════════════════════════════
  'bridge.title': {
    ar: 'تابع في الواقع', da: 'Fortsæt i virkeligheden', de: 'Weiter in der echten Welt',
    es: 'Continúa en la realidad', fr: 'Continue dans la réalité',
    it: 'Continua nella realtà', ja: 'げんじつにもどってつづけよう',
    la: 'Perge in re vera', nl: 'Ga verder in het echt',
    pl: 'Kontynuuj w rzeczywistości', pt: 'Continue na realidade',
    tr: 'Gerçek hayatta devam et', zh: '回到现实中继续',
  },
  'bridge.atHome': {
    ar: 'في المنزل', da: 'Derhjemme', de: 'Zu Hause', es: 'En casa',
    fr: 'À la maison', it: 'A casa', ja: 'おうちで', la: 'Domi',
    nl: 'Thuis', pl: 'W domu', pt: 'Em casa', tr: 'Evde', zh: '在家',
  },
  'bridge.outdoors': {
    ar: 'في الخارج', da: 'Udendørs', de: 'Draußen', es: 'Al aire libre',
    fr: 'En plein air', it: 'All\'aperto', ja: 'そとで', la: 'Foris',
    nl: 'Buiten', pl: 'Na zewnątrz', pt: 'Ao ar livre', tr: 'Dışarıda', zh: '户外',
  },
  'bridge.creative': {
    ar: 'إبداعي', da: 'Kreativ', de: 'Kreativ', es: 'Creativo',
    fr: 'Créatif', it: 'Creativo', ja: 'クリエイティブ', la: 'Creatrix',
    nl: 'Creatief', pl: 'Kreatywnie', pt: 'Criativo', tr: 'Yaratıcı', zh: '创意',
  },
  'bridge.backToActivities': {
    ar: 'العودة إلى الأنشطة', da: 'Tilbage til aktiviteter', de: 'Zurück zu Aktivitäten',
    es: 'Volver a actividades', fr: 'Retour aux activités',
    it: 'Torna alle attività', ja: 'アクティビティにもどる',
    la: 'Redi ad actiones', nl: 'Terug naar activiteiten',
    pl: 'Powrót do aktywności', pt: 'Voltar às atividades',
    tr: 'Etkinliklere dön', zh: '返回活动',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEARNING — Garden activities (untranslated in most locales)
  // ══════════════════════════════════════════════════════════════════════════
  'learning.gardenWords': {
    ar: 'كلمات الحديقة', da: 'Haveord', de: 'Gartenwörter', es: 'Palabras del jardín',
    fr: 'Mots du jardin', it: 'Parole del giardino', ja: 'おにわのことば', la: 'Verba horti',
    nl: 'Tuinwoorden', pl: 'Słowa ogrodu', pt: 'Palavras do jardim', tr: 'Bahçe kelimeleri', zh: '花园词汇',
  },
  'learning.gardenWordsDesc': {
    ar: 'تعلم أسماء الزهور والأشجار ومخلوقات الحديقة!', da: 'Stav navnene på blomster, træer og havens dyr!',
    de: 'Buchstabiere die Namen von Blumen, Bäumen und Gartentieren!',
    es: '¡Deletrea los nombres de flores, árboles y criaturas del jardín!',
    fr: 'Épelle les noms des fleurs, arbres et créatures du jardin !',
    it: 'Scrivi i nomi di fiori, alberi e creature del giardino!',
    ja: 'お花や木、おにわの生き物の名前をつづろう！', la: 'Nomina florum, arborum et creaturarum horti littera!',
    nl: 'Spel de namen van bloemen, bomen en tuinbeestjes!',
    pl: 'Literuj nazwy kwiatów, drzew i stworzeń ogrodowych!',
    pt: 'Soletre os nomes de flores, árvores e criaturas do jardim!',
    tr: 'Çiçeklerin, ağaçların ve bahçe canlılarının adlarını hecelE!', zh: '拼写花朵、树木和花园生物的名称！',
  },
  'learning.gardenWordsAge': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },
  'learning.gardenCounting': {
    ar: 'عد الحديقة', da: 'Havetælling', de: 'Gartenzählen', es: 'Contar en el jardín',
    fr: 'Compter au jardin', it: 'Contare in giardino', ja: 'おにわでかぞえよう', la: 'Numerare in horto',
    nl: 'Tuintellen', pl: 'Liczenie w ogrodzie', pt: 'Contar no jardim', tr: 'Bahçede sayma', zh: '花园计数',
  },
  'learning.gardenCountingDesc': {
    ar: 'عدّ الزهور والحشرات وأصدقاء الحديقة!', da: 'Tæl blomster, insekter og havevenner!',
    de: 'Zähle Blumen, Käfer und Gartenfreunde!', es: '¡Cuenta flores, bichos y amigos del jardín!',
    fr: 'Compte les fleurs, les insectes et les amis du jardin !', it: 'Conta fiori, insetti e amici del giardino!',
    ja: 'お花や虫、おにわの仲間をかぞえよう！', la: 'Numera flores, insecta et amicos horti!',
    nl: 'Tel bloemen, insecten en tuinvriendjes!', pl: 'Policz kwiaty, owady i przyjaciół ogrodu!',
    pt: 'Conte flores, insetos e amigos do jardim!', tr: 'Çiçekleri, böcekleri ve bahçe arkadaşlarını say!',
    zh: '数一数花朵、虫子和花园里的朋友！',
  },
  'learning.gardenCountingAge': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LEARNING — Feelings activities (ages 1-2)
  // ══════════════════════════════════════════════════════════════════════════
  'learning.happyFaces': {
    ar: 'وجوه سعيدة', da: 'Glade ansigter', de: 'Fröhliche Gesichter', es: 'Caras felices',
    fr: 'Visages joyeux', it: 'Facce felici', ja: 'にこにこがお', la: 'Vultus laeti',
    nl: 'Blije gezichten', pl: 'Szczęśliwe buźki', pt: 'Rostos felizes', tr: 'Mutlu yüzler', zh: '快乐的脸',
  },
  'learning.happyFacesDesc': {
    ar: 'استكشف تعبيرات السعادة وتعرّف على الفرح!', da: 'Udforsk glade udtryk og lær om glæde!',
    de: 'Entdecke fröhliche Ausdrücke und lerne Freude kennen!',
    es: '¡Explora expresiones felices y aprende sobre la alegría!',
    fr: 'Explore les expressions joyeuses et découvre la joie !',
    it: 'Esplora le espressioni felici e scopri la gioia!',
    ja: 'うれしいかおをさがして、よろこびについてまなぼう！', la: 'Explora vultus laetos et de gaudio disce!',
    nl: 'Ontdek blije uitdrukkingen en leer over vreugde!',
    pl: 'Odkrywaj radosne wyraz twarzy i ucz się o szczęściu!',
    pt: 'Explore expressões felizes e aprenda sobre a alegria!',
    tr: 'Mutlu ifadeleri keşfet ve neşeyi öğren!', zh: '探索快乐的表情，了解喜悦！',
  },
  'learning.happyFacesAge': {
    ar: 'الأعمار ١-٢', da: 'Alder 1-2', de: 'Alter 1-2', es: 'Edades 1-2',
    fr: 'Âges 1-2', it: 'Età 1-2', ja: '1〜2歳', la: 'Aetas 1-2',
    nl: 'Leeftijd 1-2', pl: 'Wiek 1-2', pt: 'Idades 1-2', tr: 'Yaş 1-2', zh: '1-2岁',
  },
  'learning.feelingColours': {
    ar: 'ألوان المشاعر', da: 'Følelsesfarver', de: 'Gefühlsfarben', es: 'Colores de sentimientos',
    fr: 'Couleurs des émotions', it: 'Colori delle emozioni', ja: 'きもちのいろ', la: 'Colores affectuum',
    nl: 'Gevoelskleuren', pl: 'Kolory uczuć', pt: 'Cores dos sentimentos', tr: 'Duygu renkleri', zh: '情感颜色',
  },
  'learning.feelingColoursDesc': {
    ar: 'طابق الألوان مع المشاعر وكيف تجعلك تشعر!', da: 'Match farver med følelser og hvordan de får dig til at føle!',
    de: 'Ordne Farben Gefühlen zu und wie sie dich fühlen lassen!',
    es: '¡Asocia colores con emociones y cómo te hacen sentir!',
    fr: 'Associe les couleurs aux émotions et comment elles te font sentir !',
    it: 'Abbina i colori alle emozioni e come ti fanno sentire!',
    ja: 'いろとかんじょうをむすびつけよう！', la: 'Colores cum affectibus coniunge!',
    nl: 'Koppel kleuren aan gevoelens en hoe ze je laten voelen!',
    pl: 'Dopasuj kolory do uczuć i tego, jak się czujesz!',
    pt: 'Associe cores a emoções e como elas fazem você se sentir!',
    tr: 'Renkleri duygularla eşleştir!', zh: '将颜色与情感配对！',
  },
  'learning.feelingColoursAge': {
    ar: 'الأعمار ١-٢', da: 'Alder 1-2', de: 'Alter 1-2', es: 'Edades 1-2',
    fr: 'Âges 1-2', it: 'Età 1-2', ja: '1〜2歳', la: 'Aetas 1-2',
    nl: 'Leeftijd 1-2', pl: 'Wiek 1-2', pt: 'Idades 1-2', tr: 'Yaş 1-2', zh: '1-2岁',
  },
  'learning.moodMusic': {
    ar: 'موسيقى المزاج', da: 'Stemningsmusik', de: 'Stimmungsmusik', es: 'Música del ánimo',
    fr: 'Musique d\'humeur', it: 'Musica dell\'umore', ja: 'きぶんのおんがく', la: 'Musica animi',
    nl: 'Stemmingsmuziek', pl: 'Muzyka nastroju', pt: 'Música do humor', tr: 'Ruh hali müziği', zh: '情绪音乐',
  },
  'learning.moodMusicDesc': {
    ar: 'استمع إلى الموسيقى واكتشف كيف تجعلك تشعر!', da: 'Lyt til musik og oplev, hvordan den får dig til at føle!',
    de: 'Höre Musik und entdecke, wie sie dich fühlen lässt!',
    es: '¡Escucha música y descubre cómo te hace sentir!',
    fr: 'Écoute de la musique et découvre comment elle te fait sentir !',
    it: 'Ascolta la musica e scopri come ti fa sentire!',
    ja: 'おんがくをきいて、どんなきもちになるかためそう！', la: 'Musicam ausculta et quomodo te afficiat inveni!',
    nl: 'Luister naar muziek en ontdek hoe het je laat voelen!',
    pl: 'Słuchaj muzyki i odkrywaj, jakie wywołuje uczucia!',
    pt: 'Ouça música e descubra como ela faz você se sentir!',
    tr: 'Müzik dinle ve seni nasıl hissettirdiğini keşfet!', zh: '听音乐，发现它带给你怎样的感受！',
  },
  'learning.moodMusicAge': {
    ar: 'الأعمار ١-٢', da: 'Alder 1-2', de: 'Alter 1-2', es: 'Edades 1-2',
    fr: 'Âges 1-2', it: 'Età 1-2', ja: '1〜2歳', la: 'Aetas 1-2',
    nl: 'Leeftijd 1-2', pl: 'Wiek 1-2', pt: 'Idades 1-2', tr: 'Yaş 1-2', zh: '1-2岁',
  },
  'learning.animalFeelings': {
    ar: 'مشاعر الحيوانات', da: 'Dyrefølelser', de: 'Tiergefühle', es: 'Sentimientos animales',
    fr: 'Sentiments des animaux', it: 'Sentimenti degli animali', ja: 'どうぶつのきもち', la: 'Affectus animalium',
    nl: 'Dierengevoelens', pl: 'Uczucia zwierząt', pt: 'Sentimentos dos animais', tr: 'Hayvan duyguları', zh: '动物的感受',
  },
  'learning.animalFeelingsDesc': {
    ar: 'كيف تشعر الحيوانات؟ تعلم المشاعر مع أصدقاء ذوي فراء!', da: 'Hvordan har dyrene det? Lær følelser med pelskammerater!',
    de: 'Wie fühlen sich die Tiere? Lerne Gefühle mit pelzigen Freunden!',
    es: '¿Cómo se sienten los animales? ¡Aprende emociones con amigos peludos!',
    fr: 'Comment se sentent les animaux ? Apprends les émotions avec des amis à fourrure !',
    it: 'Come si sentono gli animali? Impara le emozioni con amici pelosi!',
    ja: 'どうぶつはどんなきもち？もふもふのともだちといっしょにまなぼう！',
    la: 'Quomodo animalia se sentiunt? Affectus cum amicis pellitis disce!',
    nl: 'Hoe voelen de dieren zich? Leer emoties met harige vriendjes!',
    pl: 'Jak czują się zwierzęta? Ucz się emocji z futrzanymi przyjaciółmi!',
    pt: 'Como os animais se sentem? Aprenda emoções com amigos peludos!',
    tr: 'Hayvanlar ne hissediyor? Tüylü arkadaşlarla duyguları öğren!', zh: '动物有什么感受？和毛茸茸的朋友们一起学习情感！',
  },
  'learning.animalFeelingsAge': {
    ar: 'الأعمار ١-٢', da: 'Alder 1-2', de: 'Alter 1-2', es: 'Edades 1-2',
    fr: 'Âges 1-2', it: 'Età 1-2', ja: '1〜2歳', la: 'Aetas 1-2',
    nl: 'Leeftijd 1-2', pl: 'Wiek 1-2', pt: 'Idades 1-2', tr: 'Yaş 1-2', zh: '1-2岁',
  },
  'learning.myFeelings': {
    ar: 'مشاعري', da: 'Mine følelser', de: 'Meine Gefühle', es: 'Mis sentimientos',
    fr: 'Mes sentiments', it: 'I miei sentimenti', ja: 'わたしのきもち', la: 'Affectus mei',
    nl: 'Mijn gevoelens', pl: 'Moje uczucia', pt: 'Meus sentimentos', tr: 'Duygularım', zh: '我的感受',
  },
  'learning.myFeelingsDesc': {
    ar: 'عبّر عن مشاعرك بصنع وجوه ممتعة!', da: 'Udtryk dine følelser med sjove ansigter!',
    de: 'Drücke deine Gefühle mit lustigen Grimassen aus!',
    es: '¡Expresa tus sentimientos haciendo caras divertidas!',
    fr: 'Exprime tes sentiments en faisant des grimaces amusantes !',
    it: 'Esprimi i tuoi sentimenti facendo facce buffe!',
    ja: 'たのしいかおをつくって、きもちをひょうげんしよう！', la: 'Affectus tuos vultibus ludicris exprime!',
    nl: 'Druk je gevoelens uit met leuke gezichten!',
    pl: 'Wyrażaj swoje uczucia robiąc zabawne miny!',
    pt: 'Expresse seus sentimentos fazendo caras divertidas!',
    tr: 'Eğlenceli yüz ifadeleriyle duygularını ifade et!', zh: '用有趣的表情表达你的感受！',
  },
  'learning.myFeelingsAge': {
    ar: 'الأعمار ١-٢', da: 'Alder 1-2', de: 'Alter 1-2', es: 'Edades 1-2',
    fr: 'Âges 1-2', it: 'Età 1-2', ja: '1〜2歳', la: 'Aetas 1-2',
    nl: 'Leeftijd 1-2', pl: 'Wiek 1-2', pt: 'Idades 1-2', tr: 'Yaş 1-2', zh: '1-2岁',
  },
  // Feelings — ages 2-4
  'learning.emotionFaces': {
    ar: 'وجوه المشاعر', da: 'Følelsesansigter', de: 'Gefühlsgesichter', es: 'Caras de emociones',
    fr: 'Visages d\'émotions', it: 'Facce delle emozioni', ja: 'かんじょうのかお', la: 'Vultus affectuum',
    nl: 'Emotiegezichten', pl: 'Twarze emocji', pt: 'Rostos de emoções', tr: 'Duygu yüzleri', zh: '情感表情',
  },
  'learning.emotionFacesDesc': {
    ar: 'هل تستطيع تخمين ما يشعرون؟ طابق المشاعر!', da: 'Kan du gætte, hvad de føler? Match følelsen!',
    de: 'Kannst du erraten, wie sie sich fühlen? Ordne die Emotion zu!',
    es: '¿Puedes adivinar cómo se sienten? ¡Relaciona la emoción!',
    fr: 'Peux-tu deviner comment ils se sentent ? Associe l\'émotion !',
    it: 'Riesci a indovinare come si sentono? Abbina l\'emozione!',
    ja: 'どんなきもちかわかるかな？かんじょうをあてよう！', la: 'Potesne coniectare quid sentiant? Affectum coniunge!',
    nl: 'Kun je raden hoe ze zich voelen? Match de emotie!',
    pl: 'Czy zgadniesz, co czują? Dopasuj emocję!',
    pt: 'Consegue adivinhar como se sentem? Combine a emoção!',
    tr: 'Ne hissettiklerini tahmin edebilir misin? Duyguyu eşleştir!', zh: '你能猜出他们的感受吗？匹配情感！',
  },
  'learning.emotionFacesAge': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },
  'learning.calmBreathing': {
    ar: 'التنفس الهادئ', da: 'Rolig vejrtrækning', de: 'Ruhiges Atmen', es: 'Respiración tranquila',
    fr: 'Respiration calme', it: 'Respirazione calma', ja: 'おちついたこきゅう', la: 'Respiratio tranquilla',
    nl: 'Rustig ademen', pl: 'Spokojne oddychanie', pt: 'Respiração calma', tr: 'Sakin nefes', zh: '平静呼吸',
  },
  'learning.calmBreathingDesc': {
    ar: 'تنفس شهيقاً وزفيراً مع تمارين إرشادية مهدئة!', da: 'Træk vejret ind og ud med beroligende guidede øvelser!',
    de: 'Atme ein und aus mit beruhigenden geführten Übungen!',
    es: '¡Inhala y exhala con ejercicios guiados relajantes!',
    fr: 'Inspire et expire avec des exercices guidés apaisants !',
    it: 'Inspira ed espira con esercizi guidati rilassanti!',
    ja: 'ガイドにあわせて、ゆっくりこきゅうしよう！', la: 'Inspira et expira cum exercitiis tranquillis!',
    nl: 'Adem in en uit met rustgevende begeleide oefeningen!',
    pl: 'Oddychaj spokojnie z prowadzonymi ćwiczeniami!',
    pt: 'Inspire e expire com exercícios guiados calmantes!',
    tr: 'Sakinleştirici rehberli egzersizlerle nefes al ve ver!', zh: '跟着引导练习平静地呼吸！',
  },
  'learning.calmBreathingAge': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },
  'learning.kindnessQuest': {
    ar: 'مهمة اللطف', da: 'Venligheds-eventyr', de: 'Freundlichkeits-Abenteuer', es: 'Misión de amabilidad',
    fr: 'Quête de gentillesse', it: 'Missione gentilezza', ja: 'やさしさのぼうけん', la: 'Quaestio benignitatis',
    nl: 'Vriendelijkheidsavontuur', pl: 'Misja życzliwości', pt: 'Missão de bondade', tr: 'Nezaket görevi', zh: '善良任务',
  },
  'learning.kindnessQuestDesc': {
    ar: 'انطلق في مهمة لنشر اللطف في كل مكان!', da: 'Tag på eventyr for at sprede venlighed overalt!',
    de: 'Geh auf ein Abenteuer, um überall Freundlichkeit zu verbreiten!',
    es: '¡Emprende una misión para difundir amabilidad por todas partes!',
    fr: 'Pars en quête pour répandre la gentillesse partout !',
    it: 'Parti per una missione per diffondere gentilezza ovunque!',
    ja: 'やさしさをひろめるぼうけんにでよう！', la: 'In quaestionem abi ut benignitatem ubique diffundas!',
    nl: 'Ga op avontuur om overal vriendelijkheid te verspreiden!',
    pl: 'Wyrusz na misję, by szerzyć życzliwość!',
    pt: 'Embarque numa missão para espalhar bondade por toda parte!',
    tr: 'Her yere nezaket yaymak için bir göreve çık!', zh: '踏上传播善良的旅程！',
  },
  'learning.kindnessQuestAge': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },
  'learning.friendshipStories': {
    ar: 'قصص الصداقة', da: 'Venskabshistorier', de: 'Freundschaftsgeschichten', es: 'Historias de amistad',
    fr: 'Histoires d\'amitié', it: 'Storie di amicizia', ja: 'ゆうじょうのおはなし', la: 'Fabulae amicitiae',
    nl: 'Vriendschapsverhalen', pl: 'Opowieści o przyjaźni', pt: 'Histórias de amizade', tr: 'Arkadaşlık hikayeleri', zh: '友谊故事',
  },
  'learning.friendshipStoriesDesc': {
    ar: 'قصص عن تكوين الصداقات والتصرف كصديق جيد!', da: 'Historier om at få venner og være en god ven!',
    de: 'Geschichten übers Freunde finden und ein guter Freund sein!',
    es: '¡Historias sobre hacer amigos y ser un buen amigo!',
    fr: 'Des histoires sur le fait de se faire des amis et d\'être un bon ami !',
    it: 'Storie su come fare amicizia e essere un buon amico!',
    ja: 'ともだちをつくること、よいともだちでいることのおはなし！', la: 'Fabulae de amicis faciendis et bono amico essendo!',
    nl: 'Verhalen over vrienden maken en een goede vriend zijn!',
    pl: 'Opowieści o zawieraniu przyjaźni i byciu dobrym przyjacielem!',
    pt: 'Histórias sobre fazer amigos e ser um bom amigo!',
    tr: 'Arkadaş edinme ve iyi bir arkadaş olma hikayeleri!', zh: '关于交朋友和做好朋友的故事！',
  },
  'learning.friendshipStoriesAge': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },
  'learning.worryMonster': {
    ar: 'وحش القلق', da: 'Bekymringsmonsteret', de: 'Sorgenfresser', es: 'Monstruo de preocupaciones',
    fr: 'Monstre des soucis', it: 'Mostro delle preoccupazioni', ja: 'しんぱいモンスター', la: 'Monstrum sollicitudinis',
    nl: 'Zorgenmonster', pl: 'Potwór zmartwień', pt: 'Monstro das preocupações', tr: 'Endişe canavarı', zh: '烦恼怪兽',
  },
  'learning.worryMonsterDesc': {
    ar: 'أطعم مخاوفك لوحش القلق الودود!', da: 'Giv dine bekymringer til det venlige bekymringsmonster!',
    de: 'Füttere deine Sorgen dem freundlichen Sorgenfresser!',
    es: '¡Dale tus preocupaciones al simpático monstruo de preocupaciones!',
    fr: 'Donne tes soucis au gentil monstre des soucis !',
    it: 'Dai le tue preoccupazioni al simpatico mostro delle preoccupazioni!',
    ja: 'しんぱいをやさしいモンスターにたべてもらおう！', la: 'Sollicitudines tuas monstro amico pasce!',
    nl: 'Geef je zorgen aan het vriendelijke zorgenmonster!',
    pl: 'Nakarm swoje zmartwienia przyjaznemu potworowi!',
    pt: 'Alimente suas preocupações ao simpático monstro!',
    tr: 'Endişelerini dost canlısı endişe canavarına yedir!', zh: '把你的烦恼喂给友好的烦恼怪兽！',
  },
  'learning.worryMonsterAge': {
    ar: 'الأعمار ٢-٤', da: 'Alder 2-4', de: 'Alter 2-4', es: 'Edades 2-4',
    fr: 'Âges 2-4', it: 'Età 2-4', ja: '2〜4歳', la: 'Aetas 2-4',
    nl: 'Leeftijd 2-4', pl: 'Wiek 2-4', pt: 'Idades 2-4', tr: 'Yaş 2-4', zh: '2-4岁',
  },
  // Feelings — ages 4+
  'learning.empathyExplorer': {
    ar: 'مستكشف التعاطف', da: 'Empati-opdageren', de: 'Empathie-Entdecker', es: 'Explorador de empatía',
    fr: 'Explorateur d\'empathie', it: 'Esploratore dell\'empatia', ja: 'おもいやりたんけん', la: 'Explorator empathiae',
    nl: 'Empathie-ontdekker', pl: 'Odkrywca empatii', pt: 'Explorador de empatia', tr: 'Empati kaşifi', zh: '同理心探索者',
  },
  'learning.empathyExplorerDesc': {
    ar: 'ضع نفسك مكان الآخرين وافهم مشاعرهم!', da: 'Sæt dig i en andens sted og forstå, hvordan de har det!',
    de: 'Versetze dich in andere hinein und verstehe ihre Gefühle!',
    es: '¡Ponte en el lugar de otro y comprende cómo se siente!',
    fr: 'Mets-toi à la place de quelqu\'un et comprends ce qu\'il ressent !',
    it: 'Mettiti nei panni di qualcun altro e capisci come si sente!',
    ja: 'ほかのひとのきもちになって、かんがえてみよう！', la: 'In alterius loco sta et quomodo sentiat intellege!',
    nl: 'Verplaats je in iemand anders en begrijp hoe ze zich voelen!',
    pl: 'Wejdź w buty kogoś innego i zrozum, jak się czuje!',
    pt: 'Coloque-se no lugar de outra pessoa e entenda como ela se sente!',
    tr: 'Başkasının yerine geç ve nasıl hissettiğini anla!', zh: '站在别人的角度，理解他们的感受！',
  },
  'learning.empathyExplorerAge': {
    ar: 'الأعمار ٤+', da: 'Alder 4+', de: 'Alter 4+', es: 'Edades 4+',
    fr: 'Âges 4+', it: 'Età 4+', ja: '4歳以上', la: 'Aetas 4+',
    nl: 'Leeftijd 4+', pl: 'Wiek 4+', pt: 'Idades 4+', tr: 'Yaş 4+', zh: '4岁以上',
  },
  'learning.feelingJournal': {
    ar: 'مذكرة المشاعر', da: 'Følelsesdagbog', de: 'Gefühlstagebuch', es: 'Diario de sentimientos',
    fr: 'Journal des émotions', it: 'Diario delle emozioni', ja: 'きもちにっき', la: 'Diarium affectuum',
    nl: 'Gevoelsdagboek', pl: 'Dziennik uczuć', pt: 'Diário de sentimentos', tr: 'Duygu günlüğü', zh: '情感日记',
  },
  'learning.feelingJournalDesc': {
    ar: 'اكتب وارسم عن مشاعرك كل يوم!', da: 'Skriv og tegn om dine følelser hver dag!',
    de: 'Schreibe und male jeden Tag über deine Gefühle!',
    es: '¡Escribe y dibuja sobre tus sentimientos cada día!',
    fr: 'Écris et dessine tes sentiments chaque jour !',
    it: 'Scrivi e disegna i tuoi sentimenti ogni giorno!',
    ja: 'まいにちきもちをかいたりえをかいたりしよう！', la: 'Scribe et depinge de affectibus tuis cotidie!',
    nl: 'Schrijf en teken elke dag over je gevoelens!',
    pl: 'Pisz i rysuj o swoich uczuciach każdego dnia!',
    pt: 'Escreva e desenhe sobre seus sentimentos todos os dias!',
    tr: 'Her gün duygularını yaz ve çiz!', zh: '每天写和画你的感受！',
  },
  'learning.feelingJournalAge': {
    ar: 'الأعمار ٤+', da: 'Alder 4+', de: 'Alter 4+', es: 'Edades 4+',
    fr: 'Âges 4+', it: 'Età 4+', ja: '4歳以上', la: 'Aetas 4+',
    nl: 'Leeftijd 4+', pl: 'Wiek 4+', pt: 'Idades 4+', tr: 'Yaş 4+', zh: '4岁以上',
  },
  'learning.conflictSolver': {
    ar: 'حل النزاعات', da: 'Konfliktløser', de: 'Konfliktlöser', es: 'Solucionador de conflictos',
    fr: 'Résolveur de conflits', it: 'Risolutore di conflitti', ja: 'もんだいかいけつ', la: 'Solver conflictuum',
    nl: 'Conflictoplosser', pl: 'Rozwiązywacz konfliktów', pt: 'Solucionador de conflitos', tr: 'Çatışma çözücü', zh: '冲突解决者',
  },
  'learning.conflictSolverDesc': {
    ar: 'تعلم طرقاً سلمية لحل الخلافات!', da: 'Lær fredelige måder at løse uenigheder på!',
    de: 'Lerne friedliche Wege, Streit zu lösen!',
    es: '¡Aprende formas pacíficas de resolver desacuerdos!',
    fr: 'Apprends des façons pacifiques de résoudre les désaccords !',
    it: 'Impara modi pacifici per risolvere i disaccordi!',
    ja: 'へいわにもんだいをかいけつするほうほうをまなぼう！', la: 'Modos pacificos discordias solvendi disce!',
    nl: 'Leer vreedzame manieren om meningsverschillen op te lossen!',
    pl: 'Naucz się pokojowych sposobów rozwiązywania sporów!',
    pt: 'Aprenda maneiras pacíficas de resolver desentendimentos!',
    tr: 'Anlaşmazlıkları barışçıl yollarla çözmeyi öğren!', zh: '学习和平解决分歧的方法！',
  },
  'learning.conflictSolverAge': {
    ar: 'الأعمار ٤+', da: 'Alder 4+', de: 'Alter 4+', es: 'Edades 4+',
    fr: 'Âges 4+', it: 'Età 4+', ja: '4歳以上', la: 'Aetas 4+',
    nl: 'Leeftijd 4+', pl: 'Wiek 4+', pt: 'Idades 4+', tr: 'Yaş 4+', zh: '4岁以上',
  },
  'learning.gratitudeGarden': {
    ar: 'حديقة الامتنان', da: 'Taknemlighedshaven', de: 'Dankbarkeitsgarten', es: 'Jardín de gratitud',
    fr: 'Jardin de gratitude', it: 'Giardino della gratitudine', ja: 'かんしゃのおにわ', la: 'Hortus gratitudinis',
    nl: 'Dankbaarheidstuin', pl: 'Ogród wdzięczności', pt: 'Jardim da gratidão', tr: 'Şükran bahçesi', zh: '感恩花园',
  },
  'learning.gratitudeGardenDesc': {
    ar: 'ازرع حديقة بمشاركة الأشياء التي تشكرها!', da: 'Dyrk en have ved at dele ting, du er taknemmelig for!',
    de: 'Pflege einen Garten, indem du teilst, wofür du dankbar bist!',
    es: '¡Cultiva un jardín compartiendo cosas por las que estás agradecido!',
    fr: 'Fais pousser un jardin en partageant les choses dont tu es reconnaissant !',
    it: 'Fai crescere un giardino condividendo le cose per cui sei grato!',
    ja: 'かんしゃしていることをわかちあって、おにわをそだてよう！', la: 'Hortum cole res quas gratas habes communicando!',
    nl: 'Laat een tuin groeien door te delen waar je dankbaar voor bent!',
    pl: 'Hoduj ogród dzieląc się rzeczami, za które jesteś wdzięczny!',
    pt: 'Cultive um jardim compartilhando coisas pelas quais você é grato!',
    tr: 'Minnettar olduğun şeyleri paylaşarak bir bahçe yetiştir!', zh: '分享你感恩的事物，种出一座花园！',
  },
  'learning.gratitudeGardenAge': {
    ar: 'الأعمار ٤+', da: 'Alder 4+', de: 'Alter 4+', es: 'Edades 4+',
    fr: 'Âges 4+', it: 'Età 4+', ja: '4歳以上', la: 'Aetas 4+',
    nl: 'Leeftijd 4+', pl: 'Wiek 4+', pt: 'Idades 4+', tr: 'Yaş 4+', zh: '4岁以上',
  },
  'learning.selfEsteemStars': {
    ar: 'نجوم الثقة بالنفس', da: 'Selvværdsstjerner', de: 'Selbstwert-Sterne', es: 'Estrellas de autoestima',
    fr: 'Étoiles de l\'estime de soi', it: 'Stelle dell\'autostima', ja: 'じしんのほし', la: 'Stellae existimationis sui',
    nl: 'Zelfwaardesterren', pl: 'Gwiazdy pewności siebie', pt: 'Estrelas da autoestima', tr: 'Özgüven yıldızları', zh: '自信之星',
  },
  'learning.selfEsteemStarsDesc': {
    ar: 'اكتشف ما يجعلك مميزاً وفريداً!', da: 'Opdag hvad der gør dig speciel og unik!',
    de: 'Entdecke, was dich besonders und einzigartig macht!',
    es: '¡Descubre qué te hace especial y único!',
    fr: 'Découvre ce qui te rend spécial et unique !',
    it: 'Scopri cosa ti rende speciale e unico!',
    ja: 'あなたをとくべつでユニークにしているものをみつけよう！', la: 'Inveni quid te singularem et unicum faciat!',
    nl: 'Ontdek wat jou speciaal en uniek maakt!',
    pl: 'Odkryj, co czyni cię wyjątkowym i niepowtarzalnym!',
    pt: 'Descubra o que torna você especial e único!',
    tr: 'Seni özel ve eşsiz yapan şeyleri keşfet!', zh: '发现是什么让你与众不同！',
  },
  'learning.selfEsteemStarsAge': {
    ar: 'الأعمار ٤+', da: 'Alder 4+', de: 'Alter 4+', es: 'Edades 4+',
    fr: 'Âges 4+', it: 'Età 4+', ja: '4歳以上', la: 'Aetas 4+',
    nl: 'Leeftijd 4+', pl: 'Wiek 4+', pt: 'Idades 4+', tr: 'Yaş 4+', zh: '4岁以上',
  },
};

// ── Apply translations to locale files ────────────────────────────────────────

const locales = ['ar', 'da', 'de', 'es', 'fr', 'it', 'ja', 'la', 'nl', 'pl', 'pt', 'tr', 'zh'];

function escapeForTS(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

let totalReplaced = 0;

for (const locale of locales) {
  const filePath = path.join(LOCALES_DIR, locale, 'index.ts');
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let replacedCount = 0;

  for (const [key, langs] of Object.entries(translations)) {
    const translation = langs[locale];
    if (!translation) continue;

    // Parse section and property from key like "games.wellDone" or "learning.activityMode.play"
    const parts = key.split('.');
    const section = parts[0]; // games, learning, bridge

    // Build the English value to find — get it from the English locale
    const enFilePath = path.join(LOCALES_DIR, 'en', 'index.ts');
    const enContent = fs.readFileSync(enFilePath, 'utf8');

    // Get English value for this key
    const propName = parts[parts.length - 1];

    // Find the English value for this property in its section context
    // We search for the property name and its English value
    const enValueRegex = new RegExp(`${propName}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g');
    let enValue = null;
    let match;
    while ((match = enValueRegex.exec(enContent)) !== null) {
      enValue = match[1];
      // Verify this is in the right section by checking context
      const before = enContent.substring(Math.max(0, match.index - 500), match.index);
      if (before.includes(`${section}:`)) {
        break;
      }
    }

    if (!enValue) continue;

    // Now find and replace in the locale file
    // Look for the property with the English value (placeholder)
    const escapedEnValue = enValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedTranslation = escapeForTS(translation);

    // Replace the English placeholder with the translation
    const searchPattern = new RegExp(
      `(${propName}:\\s*')${escapedEnValue}(')`
    );

    // Only replace if the current value is the English placeholder
    const newContent = content.replace(searchPattern, `$1${escapedTranslation}$2`);
    if (newContent !== content) {
      content = newContent;
      replacedCount++;
    }
  }

  if (replacedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${locale}: translated ${replacedCount} keys`);
    totalReplaced += replacedCount;
  } else {
    console.log(`${locale}: no changes needed`);
  }
}

console.log(`\nDone. Translated ${totalReplaced} keys across ${locales.length} locales.`);
