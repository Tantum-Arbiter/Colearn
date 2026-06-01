#!/usr/bin/env node
/**
 * Translates remaining untranslated keys across all 13 locales.
 * Covers: bedtimeRoutine story, UI strings, Latin tutorials, proper nouns.
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const LOCALES = ['ar','da','de','es','fr','it','ja','la','nl','pl','pt','tr','zh'];

// ── Translations for simple key:value replacements ──
// Format: { 'dotted.key': { locale: 'translated value', ... } }
const T = {};

// menu.feelings
T['menu.feelings'] = {
  ar: 'المشاعر', da: 'Følelser', de: 'Gefühle', es: 'Sentimientos', fr: 'Émotions',
  it: 'Sentimenti', ja: '気持ち', la: 'Affectus', nl: 'Gevoelens', pl: 'Uczucia',
  pt: 'Sentimentos', tr: 'Duygular', zh: '情感'
};

// learning.activityPreview.ages
T['learning.activityPreview.ages'] = {
  ar: 'الأعمار {{range}}', da: 'Alder {{range}}', de: 'Alter {{range}}', es: 'Edades {{range}}',
  fr: 'Âges {{range}}', it: 'Età {{range}}', ja: '年齢 {{range}}', la: 'Aetates {{range}}',
  nl: 'Leeftijd {{range}}', pl: 'Wiek {{range}}', pt: 'Idades {{range}}', tr: 'Yaşlar {{range}}',
  zh: '年龄 {{range}}'
};

// subscription.detailAllLearning
T['subscription.detailAllLearning'] = {
  ar: 'جميع أنشطة التعلم مفتوحة', da: 'Alle læringsaktiviteter låst op', de: 'Alle Lernaktivitäten freigeschaltet',
  es: 'Todas las actividades de aprendizaje desbloqueadas', fr: 'Toutes les activités d\\\'apprentissage débloquées',
  it: 'Tutte le attività di apprendimento sbloccate', ja: 'すべての学習アクティビティがロック解除',
  la: 'Omnes actiones discendi apertae', nl: 'Alle leeractiviteiten ontgrendeld', pl: 'Wszystkie aktywności edukacyjne odblokowane',
  pt: 'Todas as atividades de aprendizado desbloqueadas', tr: 'Tüm öğrenme etkinlikleri açıldı', zh: '所有学习活动已解锁'
};

// subscription.planPremium — many languages keep "Premium" as a loanword
T['subscription.planPremium'] = {
  da: 'Premie', de: 'Premium', es: 'Prémium', fr: 'Supérieur', it: 'Superiore',
  la: 'Excellens', nl: 'Premie', pl: 'Premium', pt: 'Prémio', tr: 'Üstün', zh: '高级'
};

// common.version — many keep "Version"
T['common.version'] = { da: 'Udgave', fr: 'Version', de: 'Version', la: 'Versio' };

// common.error / reader.error
T['common.error'] = { es: 'Error', la: 'Error' };
T['reader.error'] = { es: 'Error', la: 'Error' };

// storyPreview.tags
T['storyPreview.tags'] = { da: 'Mærker', de: 'Schlagwörter', fr: 'Étiquettes', nl: 'Labels', pt: 'Etiquetas' };

// storyPreview.durationMinutes — template string
T['storyPreview.durationMinutes'] = { es: '{{count}} min', fr: '{{count}} min', it: '{{count}} min', pl: '{{count}} min', pt: '{{count}} min' };

// screenTime.minutes
T['screenTime.minutes'] = { es: '{{count}} min', fr: '{{count}} min', it: '{{count}} min', pl: '{{count}} min', pt: '{{count}} min' };

// screenTime.age18to24m — short label, often kept
T['screenTime.age18to24m'] = { es: '18-24m', fr: '18-24m', it: '18-24m', ja: '18-24ヶ月', pl: '18-24m', pt: '18-24m', zh: '18-24月' };

// reminders.total
T['reminders.total'] = { es: 'Total', fr: 'Total', pt: 'Total' };

// reminders.messageLabel
T['reminders.messageLabel'] = { fr: 'Message' };

// account.legal
T['account.legal'] = { es: 'Legal', pt: 'Legal' };

// account.title
T['account.title'] = { it: 'Account', nl: 'Account' };

// account.notifications / screenTime.notifications
T['account.notifications'] = { fr: 'Notifications' };
T['screenTime.notifications'] = { fr: 'Notifications' };

// emotions.themes.emoji.name — "Emoji" is universal
T['emotions.themes.emoji.name'] = { de: 'Emoji', es: 'Emoji', fr: 'Emoji', it: 'Emoji', pl: 'Emoji', pt: 'Emoji' };

// stories.genres.fantasy / stories.filterTags.fantasy
T['stories.genres.fantasy'] = { da: 'Fantasi', nl: 'Fantasie' };
T['stories.filterTags.fantasy'] = { da: 'Fantasi', nl: 'Fantasie' };

// stories.genres.nature / stories.filterTags.nature
T['stories.genres.nature'] = { fr: 'Nature' };
T['stories.filterTags.nature'] = { fr: 'Nature' };

// music.pause
T['music.pause'] = { da: 'Pause', de: 'Pause', fr: 'Pause' };

// relaxMusic.stopAll
T['relaxMusic.stopAll'] = { da: 'Stop', nl: 'Stop' };

// storyModes.music
T['storyModes.music'] = { es: 'Musical', fr: 'Musical', pt: 'Musical' };

// menu.instruments
T['menu.instruments'] = { fr: 'Instruments' };

// tutorial.mainMenu.instruments.title
T['tutorial.mainMenu.instruments.title'] = { fr: 'Instruments' };

// reader.pageNumber
T['reader.pageNumber'] = { fr: 'Page {{number}}' };

// learning.spellingTitle
T['learning.spellingTitle'] = { nl: 'Spelling' };

// learning.activityPreview.type
T['learning.activityPreview.type'] = { da: 'Type', fr: 'Type', nl: 'Type' };

// storyPreview.removeFromDevice
T['storyPreview.removeFromDevice'] = { la: 'Remove' };

// Music song names — proper nouns, many stay the same
T['music.songs.londonBridge'] = { da: 'London Bridge', de: 'London Bridge' };
T['music.songs.humptyDumpty'] = { da: 'Humpty Dumpty', de: 'Humpty Dumpty', es: 'Humpty Dumpty', fr: 'Humpty Dumpty', it: 'Humpty Dumpty', la: 'Humpty Dumpty', nl: 'Humpty Dumpty', pl: 'Humpty Dumpty', pt: 'Humpty Dumpty', tr: 'Humpty Dumpty' };
T['music.songs.frereJacques'] = { fr: 'Frère Jacques' };
T['music.songs.jingleBells'] = { de: 'Jingle Bells', it: 'Jingle Bells', nl: 'Jingle Bells', pl: 'Jingle Bells', pt: 'Jingle Bells', tr: 'Jingle Bells' };
T['music.songs.hickoryDickory'] = { de: 'Hickory Dickory Dock', es: 'Hickory Dickory Dock', fr: 'Hickory Dickory Dock', it: 'Hickory Dickory Dock', la: 'Hickory Dickory Dock', nl: 'Hickory Dickory Dock', pl: 'Hickory Dickory Dock', pt: 'Hickory Dickory Dock', tr: 'Hickory Dickory Dock' };

// ── bedtimeRoutine story (missed from translate-stories.js) ──
T['spelling.stories.bedtimeRoutine.title'] = {
  ar: 'روتين النوم', da: 'Sengetidsrutine', de: 'Schlafenszeit-Routine', es: 'Rutina de dormir',
  fr: 'Routine du coucher', it: 'Routine della nanna', ja: 'おやすみのじゅんび',
  la: 'Consuetudo somni', nl: 'Bedtijdroutine', pl: 'Wieczorna rutyna',
  pt: 'Rotina de dormir', tr: 'Uyku Rutini', zh: '睡前习惯'
};
T['spelling.stories.bedtimeRoutine.page1'] = {
  ar: 'تثاؤب! حان وقت ارتداء شيء ناعم ودافئ.', da: 'Gab! Tid til at tage noget blødt og varmt på.',
  de: 'Gähn! Zeit, etwas Weiches und Warmes anzuziehen.', es: '¡Bostezo! Es hora de ponerse algo suave y calentito.',
  fr: 'Bâillement ! C\\\'est l\\\'heure d\\\'enfiler quelque chose de doux et chaud.',
  it: 'Sbadiglio! È ora di mettersi qualcosa di morbido e caldo.', ja: 'あくび！やわらかくてあたたかいものをきよう。',
  la: 'Oscitatio! Tempus est aliquid molle et calidum induere.', nl: 'Gaap! Tijd om iets zachts en warms aan te trekken.',
  pl: 'Ziew! Czas założyć coś miękkiego i ciepłego.', pt: 'Bocejo! Hora de vestir algo macio e quentinho.',
  tr: 'Esneee! Yumuşak ve sıcak bir şey giyme zamanı.', zh: '哈欠！是时候穿上柔软温暖的东西了。'
};
T['spelling.stories.bedtimeRoutine.page2'] = {
  ar: '___ يعطيك ___ كبيرة.', da: '___ giver dig en stor ___.', de: '___ gibt dir einen großen ___.',
  es: '___ te da un gran ___.', fr: '___ te fait un gros ___.', it: '___ ti dà un grande ___.',
  ja: '___が大きな___をくれるよ。', la: '___ tibi magnum ___ dat.', nl: '___ geeft je een grote ___.',
  pl: '___ daje ci wielkiego ___.', pt: '___ te dá um grande ___.', tr: '___ sana büyük bir ___ veriyor.',
  zh: '___给你一个大大的___。'
};
T['spelling.stories.bedtimeRoutine.page3'] = {
  ar: 'قبل النوم، مشروب حليب دافئ في وعائك المفضل.',
  da: 'Før søvn, en varm mælkedrik i dit yndlingskrus.',
  de: 'Vor dem Schlafengehen ein warmes Milchgetränk in deinem Lieblingsbecher.',
  es: 'Antes de dormir, una bebida caliente de leche en tu recipiente favorito.',
  fr: 'Avant de dormir, une boisson chaude au lait dans ton récipient préféré.',
  it: 'Prima di dormire, una bevanda calda al latte nel tuo contenitore preferito.',
  ja: 'ねるまえに、おきにいりのコップであたたかいミルク。',
  la: 'Ante somnum, potio lactea calida in vase dilecto tuo.',
  nl: 'Voor het slapen, een warme melkdrank in je favoriete beker.',
  pl: 'Przed snem, ciepły napój mleczny w twoim ulubionym kubku.',
  pt: 'Antes de dormir, uma bebida quente de leite no seu recipiente favorito.',
  tr: 'Uyumadan önce, en sevdiğin bardakta sıcak bir süt.',
  zh: '睡前，用你最喜欢的杯子喝一杯温热的牛奶。'
};
T['spelling.stories.bedtimeRoutine.page4'] = {
  ar: '___ لديه ___ صغير أيضاً.', da: '___ har også en lille ___.', de: '___ hat auch einen kleinen ___.',
  es: '___ también tiene un pequeño ___.', fr: '___ a aussi un petit ___.', it: '___ ha anche un piccolo ___.',
  ja: '___も小さな___がいるよ。', la: '___ quoque parvum ___ habet.', nl: '___ heeft ook een kleine ___.',
  pl: '___ też ma małego ___.', pt: '___ também tem um pequeno ___.', tr: '___ da küçük bir ___ var.',
  zh: '___也有一个小小的___。'
};
T['spelling.stories.bedtimeRoutine.page5'] = {
  ar: 'أغمض عينيك. غداً سيشرق الشيء الكبير الدافئ مجدداً!',
  da: 'Luk øjnene. I morgen stiger det store varme lys igen!',
  de: 'Schließ die Augen. Morgen geht das große warme Ding wieder auf!',
  es: '¡Cierra los ojos. Mañana la cosa grande y cálida volverá a salir!',
  fr: 'Ferme les yeux. Demain la grande chose chaude se lèvera à nouveau !',
  it: 'Chiudi gli occhi. Domani la grande cosa calda sorgerà di nuovo!',
  ja: 'めをとじて。あしたまたあたたかい大きなものがのぼるよ！',
  la: 'Oculos claude. Cras res magna calida iterum orietur!',
  nl: 'Sluit je ogen. Morgen komt het grote warme ding weer op!',
  pl: 'Zamknij oczy. Jutro wielka ciepła rzecz znów wzejdzie!',
  pt: 'Feche os olhos. Amanhã a coisa grande e quente vai nascer de novo!',
  tr: 'Gözlerini kapat. Yarın büyük sıcak şey tekrar doğacak!',
  zh: '闭上眼睛。明天那个又大又温暖的东西会再次升起！'
};

// ── Latin tutorials (36 keys) ──
T['tutorial.spelling.welcome.title'] = { la: 'Actiones Orthographiae' };
T['tutorial.spelling.welcome.description'] = { la: 'Salve ad Orthographiam! Actiones iucundae interactivae ad adiuvandum puerum tuum litteras discere et verba construere.' };
T['tutorial.spelling.ages.title'] = { la: 'Contentum Aetati Aptum' };
T['tutorial.spelling.ages.description'] = { la: 'Actiones per aetatem ordinantur. Carousello utere ut actiones aptas aetati pueri tui invenias.' };
T['tutorial.spelling.together.title'] = { la: 'Simul Disce' };
T['tutorial.spelling.together.description'] = { la: 'Cum puero tuo sede et litteras simul pronuntia. Eos hortare ut ipsi conentur!' };
T['tutorial.spelling.benefit.title'] = { la: 'Litterarum Aedificatio' };
T['tutorial.spelling.benefit.description'] = { la: 'Exercitatio orthographiae prima conscientiam phonemicam, agnitionem litterarum et fiduciam in legendo aedificat.' };
T['tutorial.numbers.welcome.title'] = { la: 'Actiones Numerorum' };
T['tutorial.numbers.welcome.description'] = { la: 'Salve ad Numeros! Actiones captivantes ad adiuvandum puerum tuum numeros, formas et computationem explorare.' };
T['tutorial.numbers.ages.title'] = { la: 'Contentum Aetati Aptum' };
T['tutorial.numbers.ages.description'] = { la: 'Actiones per aetatem ordinantur. Carousello utere ut actiones aptas aetati pueri tui invenias.' };
T['tutorial.numbers.together.title'] = { la: 'Simul Numera' };
T['tutorial.numbers.together.description'] = { la: 'Voce alta simul numera, res monstra et numeros partem vitae cotidianae fac!' };
T['tutorial.numbers.benefit.title'] = { la: 'Numerorum Aedificatio' };
T['tutorial.numbers.benefit.description'] = { la: 'Lusus numerorum primus cogitationem logicam, agnitionem exemplarium et amorem mathematicae evolvit.' };
T['tutorial.feelings.welcome.title'] = { la: 'Actiones Affectuum' };
T['tutorial.feelings.welcome.description'] = { la: 'Salve ad Affectus! Actiones quae puerum tuum adiuvant affectus agnoscere, nominare et intelligere.' };
T['tutorial.feelings.ages.title'] = { la: 'Contentum Aetati Aptum' };
T['tutorial.feelings.ages.description'] = { la: 'Actiones per aetatem ordinantur. Actiones aetati pueri tui aptas elige.' };
T['tutorial.feelings.together.title'] = { la: 'Simul Explora' };
T['tutorial.feelings.together.description'] = { la: 'De affectibus aperte loquere. Roga "Quomodo id te sentire facit?" et proprias experientias communica.' };
T['tutorial.feelings.benefit.title'] = { la: 'Intelligentia Affectuum' };
T['tutorial.feelings.benefit.description'] = { la: 'Intellectus affectuum empathiam, sui moderationem et fortes necessitudines sociales aedificat.' };
T['tutorial.practise.welcome.title'] = { la: 'Modus Exercitandi' };
T['tutorial.practise.welcome.description'] = { la: 'Disce cantus veros in diversis instrumentis canere! Notas sequere et artem tuam perfice.' };
T['tutorial.practise.instrument.title'] = { la: 'Instrumentum Elige' };
T['tutorial.practise.instrument.description'] = { la: 'Per carousellum volve ut instrumentum dilectum eligas. Unumquodque sonum unicum habet!' };
T['tutorial.practise.songs.title'] = { la: 'Cantum Elige' };
T['tutorial.practise.songs.description'] = { la: 'Bibliothecam cantuum perlege et cantum discendum elige. Cantus per difficultatem ordinantur.' };
T['tutorial.practise.benefit.title'] = { la: 'Evolutio Musicalis' };
T['tutorial.practise.benefit.description'] = { la: 'Cantus canere discere rhythmum, coordinationem, memoriam et concentrationem evolvit.' };
T['tutorial.freeplay.welcome.title'] = { la: 'Modus Liberi Lusus' };
T['tutorial.freeplay.welcome.description'] = { la: 'Nullae regulae, solum gaudium! Quodvis instrumentum explora et propriam musicam crea.' };
T['tutorial.freeplay.instrument.title'] = { la: 'Instrumentum Elige' };
T['tutorial.freeplay.instrument.description'] = { la: 'Quodvis instrumentum e carousello elige. Omnia tempta ut novos sonos invenias!' };
T['tutorial.freeplay.play.title'] = { la: 'Libere Cane' };
T['tutorial.freeplay.play.description'] = { la: 'Botones coloratos preme ut musicam facias. Nullae notae malae sunt — omnis sonus est musica!' };
T['tutorial.freeplay.benefit.title'] = { la: 'Expressio Creativa' };
T['tutorial.freeplay.benefit.description'] = { la: 'Lusus musicalis liber creativitatem, fiduciam sui et amorem musicae nutrit.' };


// ── Execution engine ──
function esc(s) {
  return s.replace(/'/g, "\\'");
}

function applyAll() {
  const allKeys = Object.keys(T);
  console.log('Translating ' + allKeys.length + ' remaining keys across locales...\n');
  let totalReplacements = 0;

  for (const loc of LOCALES) {
    const filePath = path.join(LOCALES_DIR, loc, 'index.ts');
    if (!fs.existsSync(filePath)) { console.log('  SKIP ' + loc); continue; }
    let content = fs.readFileSync(filePath, 'utf8');
    let locReplacements = 0;

    for (const dottedKey of allKeys) {
      const val = T[dottedKey][loc];
      if (!val) continue;

      // Get the last part of the key (the field name in the file)
      const parts = dottedKey.split('.');
      const fieldName = parts[parts.length - 1];

      // Build a regex that matches the line with this field in the right context
      // We need to find the English value and replace it
      // Strategy: find the English text for this key, then replace in the locale file
      const enFilePath = path.join(LOCALES_DIR, 'en', 'index.ts');
      const enContent = fs.readFileSync(enFilePath, 'utf8');

      // Find the line pattern in English to know what we're looking for
      // Use the dotted key path to navigate the nested structure
      const lines = content.split('\n');
      let replaced = false;

      // Find the context blocks leading to our key
      if (parts.length >= 2) {
        // Navigate to the correct nesting level
        let searchFrom = 0;
        for (let depth = 0; depth < parts.length - 1; depth++) {
          const blockName = parts[depth];
          const blockRe = new RegExp('^\\s+' + blockName + ':\\s*\\{');
          for (let i = searchFrom; i < lines.length; i++) {
            if (blockRe.test(lines[i])) {
              searchFrom = i + 1;
              break;
            }
          }
        }

        // Now find the field within a reasonable range
        const fieldRe = new RegExp("^(\\s+" + fieldName + ":\\s*')(.*)('\\s*,?)$");
        for (let i = searchFrom; i < Math.min(searchFrom + 30, lines.length); i++) {
          const m = lines[i].match(fieldRe);
          if (m) {
            lines[i] = m[1] + esc(val) + m[3];
            replaced = true;
            locReplacements++;
            break;
          }
        }
      }

      if (replaced) {
        content = lines.join('\n');
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    totalReplacements += locReplacements;
    if (locReplacements > 0) console.log('  ' + loc + ': ' + locReplacements + ' fields updated');
  }

  console.log('\nDone! ' + totalReplacements + ' total updates applied.');
}

applyAll();