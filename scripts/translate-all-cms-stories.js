#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the reference story (cms-test-1) to get all translations
function loadReferenceTranslations() {
  const refPath = path.join(__dirname, 'cms-stories', 'cms-test-1-snowman-squirrel', 'story-data.json');
  const refData = JSON.parse(fs.readFileSync(refPath, 'utf8'));

  const translations = {};
  refData.pages.forEach(page => {
    if (page.text && page.localizedText) {
      translations[page.text] = page.localizedText;
    }
  });

  return translations;
}

// Translation dictionary for all pages
const TRANSLATIONS = {
  "She wants to make a snowman.\nWhat's inside this shed?": {
    "pl": "Chce zbudować bałwana.\nCo jest w tej szopie?",
    "es": "Ella quiere hacer un muñeco de nieve.\n¿Qué hay dentro de este cobertizo?",
    "de": "Sie möchte einen Schneemann bauen.\nWas ist in diesem Schuppen?",
    "fr": "Elle veut faire un bonhomme de neige.\nQu'y a-t-il dans cette cabane?",
    "it": "Vuole fare un pupazzo di neve.\nCosa c'è dentro questo capanno?",
    "pt": "Ela quer fazer um boneco de neve.\nO que há dentro deste galpão?",
    "ja": "彼女は雪だるまを作りたいです。\nこの小屋の中には何がありますか?",
    "ar": "تريد أن تصنع رجل ثلج.\nماذا يوجد داخل هذا الكوخ?",
    "tr": "Kardan adam yapmak istiyor.\nBu kulübede ne var?",
    "nl": "Ze wil een sneeuwpop maken.\nWat zit er in deze schuur?",
    "da": "Hun vil lave en snemand.\nHvad er der i denne hytte?",
    "la": "Vult hominem niveum facere.\nQuid in hac casa est?",
    "zh": "她想堆一个雪人。\n这个棚子里面有什么?"
  },
  "Squirrel's snowman has a head.\nNow he needs a nose.": {
    "pl": "Bałwan wiewiórki ma głowę.\nTeraz potrzebuje nosa.",
    "es": "El muñeco de nieve de la ardilla tiene cabeza.\nAhora necesita una nariz.",
    "de": "Der Schneemann des Eichhörnchens hat einen Kopf.\nJetzt braucht er eine Nase.",
    "fr": "Le bonhomme de neige de l'écureuil a une tête.\nMaintenant il a besoin d'un nez.",
    "it": "Il pupazzo di neve dello scoiattolo ha una testa.\nOra ha bisogno di un naso.",
    "pt": "O boneco de neve do esquilo tem uma cabeça.\nAgora ele precisa de um nariz.",
    "ja": "リスの雪だるまは頭を持っています。\n今、彼は鼻が必要です。",
    "ar": "رجل الثلج الخاص بالسنجاب له رأس.\nالآن يحتاج إلى أنف.",
    "tr": "Sincabın kardan adamının başı var.\nŞimdi bir burna ihtiyacı var.",
    "nl": "De sneeuwpop van de eekhoorn heeft een hoofd.\nNu heeft hij een neus nodig.",
    "da": "Egernets snemand har et hoved.\nNu har han brug for en næse.",
    "la": "Homo niveus sciuri caput habet.\nNunc nasum indiget.",
    "zh": "松鼠的雪人有一个头。\n现在他需要一个鼻子。"
  },
  "Can Squirrel find a carrot?\nWhat do you suppose?": {
    "pl": "Czy wiewiórka może znaleźć marchewkę?\nCo myślisz?",
    "es": "¿Puede la ardilla encontrar una zanahoria?\n¿Qué crees?",
    "de": "Kann das Eichhörnchen eine Karotte finden?\nWas denkst du?",
    "fr": "L'écureuil peut-il trouver une carotte?\nQu'en penses-tu?",
    "it": "Lo scoiattolo può trovare una carota?\nCosa ne pensi?",
    "pt": "O esquilo consegue encontrar uma cenoura?\nO que você acha?",
    "ja": "リスはニンジンを見つけることができますか?\nあなたはどう思いますか?",
    "ar": "هل يمكن للسنجاب أن يجد جزرة?\nماذا تعتقد?",
    "tr": "Sincap bir havuç bulabilir mi?\nSen ne düşünüyorsun?",
    "nl": "Kan de eekhoorn een wortel vinden?\nWat denk je?",
    "da": "Kan egernet finde en gulerod?\nHvad tror du?",
    "la": "Potestne sciurus carrotam invenire?\nQuid putasne?",
    "zh": "松鼠能找到胡萝卜吗?\n你觉得呢?"
  },
  "Now the snowman needs some eyes.\nSquirrel visits Mole.": {
    "pl": "Teraz bałwan potrzebuje oczu.\nWiewiórka odwiedza Kreta.",
    "es": "Ahora el muñeco de nieve necesita ojos.\nLa ardilla visita al Topo.",
    "de": "Jetzt braucht der Schneemann Augen.\nDas Eichhörnchen besucht den Maulwurf.",
    "fr": "Maintenant le bonhomme de neige a besoin d'yeux.\nL'écureuil visite la Taupe.",
    "it": "Ora il pupazzo di neve ha bisogno di occhi.\nLo scoiattolo visita la Talpa.",
    "pt": "Agora o boneco de neve precisa de olhos.\nO esquilo visita a Toupeira.",
    "ja": "今、雪だるまは目が必要です。\nリスはモグラを訪問します。",
    "ar": "الآن رجل الثلج يحتاج إلى عيون.\nالسنجاب يزور الخلد.",
    "tr": "Şimdi kardan adamın gözlere ihtiyacı var.\nSincap Köstebek'i ziyaret ediyor.",
    "nl": "Nu heeft de sneeuwpop ogen nodig.\nDe eekhoorn bezoekt de Mol.",
    "da": "Nu har snemanden brug for øjne.\nEgernet besøger Muldvarpen.",
    "la": "Nunc homo niveus oculos indiget.\nSciurus Talpam visitat.",
    "zh": "现在雪人需要眼睛。\n松鼠拜访鼹鼠。"
  },
  "They look inside a great big box\nand find some lumps of coal.": {
    "pl": "Patrzą do wielkiego pudła\ni znajdują kawałki węgla.",
    "es": "Miran dentro de una caja muy grande\ny encuentran trozos de carbón.",
    "de": "Sie schauen in eine große Kiste\nund finden Kohlestücke.",
    "fr": "Ils regardent dans une très grande boîte\net trouvent des morceaux de charbon.",
    "it": "Guardano dentro una grande scatola\ne trovano pezzi di carbone.",
    "pt": "Eles olham dentro de uma caixa muito grande\ne encontram pedaços de carvão.",
    "ja": "彼らは大きな箱の中を見ます\nそして石炭の塊を見つけます。",
    "ar": "ينظرون داخل صندوق كبير جداً\nويجدون قطع من الفحم.",
    "tr": "Çok büyük bir kutuya bakıyorlar\nve kömür parçaları buluyorlar.",
    "nl": "Ze kijken in een grote doos\nen vinden stukken kool.",
    "da": "De kigger ind i en stor kasse\nog finder kulstykker.",
    "la": "Spectant in magnam arcam\net carbonum fragmenta inveniunt.",
    "zh": "他们看着一个很大的盒子\n找到了一些煤块。"
  },
  "A hat, a scarf, and twigs for arms -\nthe snowman is complete!": {
    "pl": "Kapelusz, szalik i gałęzie na ramiona -\nbałwan jest gotowy!",
    "es": "Un sombrero, una bufanda y ramas para los brazos -\n¡el muñeco de nieve está completo!",
    "de": "Ein Hut, ein Schal und Äste für die Arme -\nder Schneemann ist fertig!",
    "fr": "Un chapeau, une écharpe et des brindilles pour les bras -\nle bonhomme de neige est complet!",
    "it": "Un cappello, una sciarpa e rami per le braccia -\nil pupazzo di neve è completo!",
    "pt": "Um chapéu, um lenço e galhos para os braços -\no boneco de neve está completo!",
    "ja": "帽子、スカーフ、腕の枝 -\n雪だるまが完成しました!",
    "ar": "قبعة وشاح وأغصان للذراعين -\nرجل الثلج مكتمل!",
    "tr": "Bir şapka, bir atkı ve kollar için dallar -\nkardan adam tamamlandı!",
    "nl": "Een hoed, een sjaal en takken voor armen -\nde sneeuwpop is klaar!",
    "da": "En hat, et tørklæde og grene til arme -\nsnemanden er færdig!",
    "la": "Pileus, stola, et rami pro brachiis -\nhomo niveus completus est!",
    "zh": "一顶帽子、一条围巾和树枝做的手臂 -\n雪人完成了!"
  },
  "Squirrel's feeling hungry.\nWhat's she going to eat?": {
    "pl": "Wiewiórka czuje głód.\nCo będzie jeść?",
    "es": "La ardilla tiene hambre.\n¿Qué va a comer?",
    "de": "Das Eichhörnchen hat Hunger.\nWas wird es essen?",
    "fr": "L'écureuil a faim.\nQu'est-ce qu'elle va manger?",
    "it": "Lo scoiattolo ha fame.\nCosa mangerà?",
    "pt": "O esquilo está com fome.\nO que ela vai comer?",
    "ja": "リスはお腹が空いています。\n彼女は何を食べるつもりですか?",
    "ar": "السنجاب جائع.\nماذا ستأكل?",
    "tr": "Sincap aç hissediyor.\nNe yiyecek?",
    "nl": "De eekhoorn heeft honger.\nWat gaat ze eten?",
    "da": "Egernet er sulten.\nHvad skal den spise?",
    "la": "Sciurus esuriens est.\nQuid edet?",
    "zh": "松鼠感到饥饿。\n她要吃什么?"
  },
  "Now it's Squirrel's bedtime.\nShe's tucked up nice and tight.": {
    "pl": "Teraz pora snu dla wiewiórki.\nJest miło zawinięta.",
    "es": "Ahora es la hora de dormir de la ardilla.\nEstá bien arropada.",
    "de": "Jetzt ist Schlafenszeit für das Eichhörnchen.\nEs ist schön eingewickelt.",
    "fr": "C'est maintenant l'heure du coucher de l'écureuil.\nElle est bien enveloppée.",
    "it": "Ora è l'ora di dormire dello scoiattolo.\nÈ ben avvolta.",
    "pt": "Agora é hora de dormir do esquilo.\nEla está bem embrulhada.",
    "ja": "今、リスの就寝時間です。\n彼女はきちんと包まれています。",
    "ar": "الآن حان وقت نوم السنجاب.\nهي ملفوفة بشكل جيد.",
    "tr": "Şimdi sincabın uyku zamanı.\nO güzelce sarılı.",
    "nl": "Nu is het bedtijd voor de eekhoorn.\nZe is goed ingepakt.",
    "da": "Nu er det søvnstid for egernet.\nDet er godt pakket ind.",
    "la": "Nunc tempus somni sciuri est.\nBene involuta est.",
    "zh": "现在是松鼠的睡眠时间。\n她被好好地包裹着。"
  },
  "Who's outside the window?\nShall we wave goodnight?": {
    "pl": "Kto jest za oknem?\nCzy pomachamy na dobranoc?",
    "es": "¿Quién está fuera de la ventana?\n¿Nos despedimos con la mano?",
    "de": "Wer ist außerhalb des Fensters?\nSollen wir Gute Nacht winken?",
    "fr": "Qui est dehors à la fenêtre?\nShall we wave goodnight?",
    "it": "Chi è fuori dalla finestra?\nCi salutiamo con la mano?",
    "pt": "Quem está fora da janela?\nVamos acenar boa noite?",
    "ja": "窓の外に誰がいますか?\nおやすみなさいと手を振りましょうか?",
    "ar": "من خارج النافذة?\nهل نلوح وداعا؟",
    "tr": "Pencere dışında kim var?\nİyi geceler diye el sallayalım mı?",
    "nl": "Wie is buiten het raam?\nZullen we goedenacht zwaaien?",
    "da": "Hvem er uden for vinduet?\nSkal vi vinke godnat?",
    "la": "Quis extra fenestram est?\nNonne vale salutabimus?",
    "zh": "谁在窗外?\n我们挥手说晚安吗?"
  }
};

function updateStoryFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    data.pages.forEach(page => {
      if (page.text) {
        const translation = TRANSLATIONS[page.text];
        if (translation) {
          // Initialize localizedText if it doesn't exist
          if (!page.localizedText) {
            page.localizedText = {};
            modified = true;
          }

          // Update all language translations
          Object.keys(translation).forEach(lang => {
            if (page.localizedText[lang] !== translation[lang]) {
              page.localizedText[lang] = translation[lang];
              modified = true;
            }
          });

          // Ensure English is set
          if (!page.localizedText.en) {
            page.localizedText.en = page.text;
            modified = true;
          }
        }
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

const cmsStoriesDir = path.join(__dirname, 'cms-stories');
const storyDirs = fs.readdirSync(cmsStoriesDir).filter(f => 
  fs.statSync(path.join(cmsStoriesDir, f)).isDirectory()
);

let updated = 0;
storyDirs.forEach(storyDir => {
  const jsonPath = path.join(cmsStoriesDir, storyDir, 'story-data.json');
  if (fs.existsSync(jsonPath)) {
    if (updateStoryFile(jsonPath)) {
      console.log(`✅ Updated: ${storyDir}`);
      updated++;
    }
  }
});

console.log(`\n✨ Translation update complete! ${updated} stories updated.`);

