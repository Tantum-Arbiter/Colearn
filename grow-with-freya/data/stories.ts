import { Story, StoryPage } from '@/types/story';

// Sample story pages for "The Sleepy Forest"
const sleepyForestPages: StoryPage[] = [
  {
    id: 'sf-page-1',
    pageNumber: 1,
    text: 'In a peaceful forest, the sun was setting behind the tall trees.'
  },
  {
    id: 'sf-page-2',
    pageNumber: 2,
    text: 'The wise old owl hooted softly from his tree, "It\'s time to rest, my forest friends."'
  },
  {
    id: 'sf-page-3',
    pageNumber: 3,
    text: 'The little rabbits hopped to their cozy burrow, yawning as they snuggled together.'
  },
  {
    id: 'sf-page-4',
    pageNumber: 4,
    text: 'The squirrels gathered their acorns and curled up in their warm nest high in the oak tree.'
  },
  {
    id: 'sf-page-5',
    pageNumber: 5,
    text: 'The deer family found a soft patch of moss and lay down together under the stars.'
  },
  {
    id: 'sf-page-6',
    pageNumber: 6,
    text: 'The wise owl spread his wings wide and settled into his favorite branch.'
  },
  {
    id: 'sf-page-7',
    pageNumber: 7,
    text: 'A gentle breeze rustled through the leaves, singing a lullaby to all the forest creatures.'
  },
  {
    id: 'sf-page-8',
    pageNumber: 8,
    text: 'And all the woodland creatures drifted off to sleep, dreaming sweet dreams until morning. The End.'
  }
];

export const MOCK_STORIES: Story[] = [
  // Add snuggle-little-wombat story first - Adventure story
  {
    id: 'snuggle-little-wombat',
    title: 'Snuggle Little Wombat',
    localizedTitle: {
      en: 'Snuggle Little Wombat',
      pl: 'Przytulanka Mały Wombat',
      es: 'Acurrúcate Pequeño Wombat',
      de: 'Kuschel Kleiner Wombat',
      fr: 'Câlin Petit Wombat',
      it: 'Abbraccia Piccolo Wombat',
      pt: 'Abraço Pequeno Wombat',
      ja: 'ウォンバットを抱きしめる',
      ar: 'احتضن الومبت الصغير',
      tr: 'Küçük Wombat\'ı Sarıl',
      nl: 'Knuffel Kleine Wombat',
      da: 'Knus Lille Wombat',
      la: 'Amplexus Parvus Wombatus',
      zh: '拥抱小袋熊',
    },
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🐨',
    coverImage: require('../assets/stories/snuggle-little-wombat/cover/cover-large.webp'),
    isAvailable: true,
    ageRange: '2-5',
    duration: 9,
    description: 'A gentle bedtime story about a little wombat getting ready for sleep with cozy snuggles and sweet dreams.',
    localizedDescription: {
      en: 'A gentle bedtime story about a little wombat getting ready for sleep with cozy snuggles and sweet dreams.',
      pl: 'Łagodna bajka na dobranoc o małym wombacie przygotowującym się do snu z przytulnymi uściskami i słodkimi snami.',
      es: 'Un cuento suave para dormir sobre un pequeño wombat preparándose para dormir con abrazos acogedores y dulces sueños.',
      de: 'Eine sanfte Gutenachtgeschichte über einen kleinen Wombat, der sich mit gemütlichen Kuscheleinheiten und süßen Träumen auf den Schlaf vorbereitet.',
      fr: 'Une douce histoire de coucher sur un petit wombat se préparant à dormir avec des câlins confortables et des rêves doux.',
      it: 'Una dolce storia della buonanotte su un piccolo wombat che si prepara a dormire con abbracci accoglienti e dolci sogni.',
      pt: 'Uma história suave de dormir sobre um pequeno wombat se preparando para dormir com abraços aconchegantes e doces sonhos.',
      ja: '小さなウォンバットが快適な抱擁と甘い夢で眠りに備える優しい就寝時の物語。',
      ar: 'قصة نوم لطيفة عن وومبت صغير يستعد للنوم مع احتضانات مريحة وأحلام حلوة.',
      tr: 'Küçük bir wombatın rahat kucaklamalar ve tatlı rüyalarla uyku için hazırlandığı nazik bir uyku saati hikayesi.',
      nl: 'Een zacht slaapverhaal over een kleine wombat die zich voorbereidt op slaap met gezellige knuffels en zoete dromen.',
      da: 'En blid søvnhistorie om en lille wombat, der forbereder sig på søvn med hyggelige knus og søde drømme.',
      la: 'Fabula soporis mitis de parvo wombato qui se praeparat ad somnum cum amplexibus iucundis et somniis dulcibus.',
      zh: '关于一只小袋熊准备睡眠的温柔睡前故事，伴随着舒适的拥抱和甜蜜的梦。',
    },
    tags: ['adventure', 'bedtime', 'calming', 'animals'],
    pages: [
      {
        id: 'snuggle-little-wombat-cover',
        pageNumber: 0,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/cover/cover-large.webp'),
        text: 'Snuggle Little Wombat',
        localizedText: {
          en: 'Snuggle Little Wombat',
          pl: 'Przytul Małego Wombata',
          es: 'Acurruca al Pequeño Wombat',
          de: 'Kuschel Kleiner Wombat',
          fr: 'Câlin Petit Wombat',
          it: 'Coccola Piccolo Wombat',
          pt: 'Abraço Pequeno Wombat',
          ja: 'かわいいウォンバットを抱きしめる',
          ar: 'احتضن الومبت الصغير',
          tr: 'Sevimli Küçük Wombat\'ı Sarıl',
          nl: 'Knuffel Kleine Wombat',
          da: 'Knus Lille Wombat',
          la: 'Amplexus Parvus Wombatus',
          zh: '拥抱小袋熊',
        },
      },
      {
        id: 'snuggle-little-wombat-1',
        pageNumber: 1,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-1/background.webp'),
        text: 'Wombat yawned, the sky turned blue, time to rest, the stars peek through.',
        localizedText: {
          en: 'Wombat yawned, the sky turned blue, time to rest, the stars peek through.',
          pl: 'Wombat ziewnął, niebo zrobiło się niebieskie, czas na odpoczynek, gwiazdy zaczęły błyszczeć.',
          es: 'Wombat bostezó, el cielo se volvió azul, hora de descansar, las estrellas asoman.',
          de: 'Wombat gähnte, der Himmel wurde blau, Zeit zum Ausruhen, die Sterne schauen durch.',
          fr: 'Wombat bâilla, le ciel devint bleu, temps de se reposer, les étoiles apparaissent.',
          it: 'Wombat sbadigliò, il cielo divenne blu, tempo di riposare, le stelle spuntano.',
          pt: 'Wombat bocejou, o céu ficou azul, hora de descansar, as estrelas aparecem.',
          ja: 'ウォンバットはあくびをしました、空は青くなりました、休む時間です、星が覗きます。',
          ar: 'تثاؤب الومبت، أصبح السماء زرقاء، حان وقت الراحة، تطل النجوم.',
          tr: 'Wombat esneyen, gökyüzü mavi oldu, dinlenme zamanı, yıldızlar göz atıyor.',
          nl: 'Wombat gaapte, de lucht werd blauw, tijd om uit te rusten, de sterren gluren door.',
          da: 'Wombat gæbede, himlen blev blå, tid til at hvile, stjernerne kigger gennem.',
          la: 'Wombatus oscitavit, caelum caeruleum factum est, tempus quiescendi, stellae prospiciunt.',
          zh: '袋熊打了个哈欠，天空变蓝了，是休息的时候了，星星从中窥视。',
        },
      },
      {
        id: 'snuggle-little-wombat-2',
        pageNumber: 2,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-2/background.webp'),
        text: 'Wombat stared, the night felt new, time to dream, like we must do.',
        localizedText: {
          en: 'Wombat stared, the night felt new, time to dream, like we must do.',
          pl: 'Wombat patrzył, noc wydawała się nowa, czas na marzenia, tak jak my musimy.',
          es: 'Wombat miró, la noche se sentía nueva, hora de soñar, como debemos hacer.',
          de: 'Wombat starrte, die Nacht fühlte sich neu an, Zeit zu träumen, wie wir es tun müssen.',
          fr: 'Wombat regardait, la nuit se sentait nouvelle, temps de rêver, comme nous devons le faire.',
          it: 'Wombat fissava, la notte si sentiva nuova, tempo di sognare, come dobbiamo fare.',
          pt: 'Wombat olhou, a noite se sentia nova, hora de sonhar, como devemos fazer.',
          ja: 'ウォンバットは見つめました、夜は新しく感じました、夢を見る時間です、私たちがしなければならないように。',
          ar: 'حدق الومبت، شعرت الليلة بأنها جديدة، حان وقت الحلم، كما يجب أن نفعل.',
          tr: 'Wombat baktı, gece yeni hissetti, rüya görme zamanı, yapması gerektiğimiz gibi.',
          nl: 'Wombat staarde, de nacht voelde nieuw, tijd om te dromen, zoals we moeten doen.',
          da: 'Wombat stirrede, natten føltes ny, tid til at drømme, som vi skal gøre.',
          la: 'Wombatus intuitus est, nox nova sensit, tempus somniandi, sicut facere debemus.',
          zh: '袋熊凝视着，夜晚感觉很新，是梦想的时候了，就像我们必须做的那样。',
        },
        interactionType: 'music_challenge',
        musicChallenge: {
          enabled: true,
          instrumentId: 'flute',
          promptText: 'Play a gentle lullaby to help Wombat drift off to sleep!',
          mode: 'guided',
          requiredSequence: ['C', 'D', 'E', 'D', 'C'],
          successSongId: 'wombat_lullaby_v1',
          successStateId: 'wombat_dreaming',
          autoPlaySuccessSong: true,
          allowSkip: true,
          micRequired: true,
          fallbackAllowed: true,
          hintLevel: 'standard',
        },
      },
      {
        id: 'snuggle-little-wombat-3',
        pageNumber: 3,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-3/background.webp'),
        text: 'Wombat walked, the stars shined through, looking for a nest, that\'s warm and new.',
        localizedText: {
          en: 'Wombat walked, the stars shined through, looking for a nest, that\'s warm and new.',
          pl: 'Wombat szedł, gwiazdy świeciły, szukając gniazda, ciepłego i nowego.',
          es: 'Wombat caminó, las estrellas brillaban, buscando un nido, cálido y nuevo.',
          de: 'Wombat ging, die Sterne leuchteten durch, auf der Suche nach einem Nest, warm und neu.',
          fr: 'Wombat marchait, les étoiles brillaient, cherchant un nid, qui est chaud et nouveau.',
          it: 'Wombat camminava, le stelle brillavano, cercando un nido, che è caldo e nuovo.',
          pt: 'Wombat caminhou, as estrelas brilhavam, procurando um ninho, que é quente e novo.',
          ja: 'ウォンバットは歩きました、星は輝きました、温かく新しいネストを探しています。',
          ar: 'مشى الومبت، أشرقت النجوم، يبحث عن عش، دافئ وجديد.',
          tr: 'Wombat yürüdü, yıldızlar parlıyor, sıcak ve yeni bir yuva arıyor.',
          nl: 'Wombat liep, de sterren schenen, op zoek naar een nest, dat warm en nieuw is.',
          da: 'Wombat gik, stjernerne skinnede, ledte efter et rede, der er varmt og nyt.',
          la: 'Wombatus ambulavit, stellae lucebant, nidum quaerens, qui calidus et novus est.',
          zh: '袋熊走着，星星闪闪发光，寻找一个温暖而新的巢穴。',
        },
      },
      {
        id: 'snuggle-little-wombat-4',
        pageNumber: 4,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-4/background.webp'),
        text: 'Wombat smiled, a burrow in view, time to rest, and dream things new.',
        localizedText: {
          en: 'Wombat smiled, a burrow in view, time to rest, and dream things new.',
          pl: 'Wombat uśmiechnął się, nora w zasięgu wzroku, czas na odpoczynek i nowe marzenia.',
          es: 'Wombat sonrió, una madriguera a la vista, hora de descansar y soñar cosas nuevas.',
          de: 'Wombat lächelte, ein Bau in Sicht, Zeit zum Ausruhen und neue Dinge zu träumen.',
          fr: 'Wombat sourit, un terrier en vue, temps de se reposer et de rêver de choses nouvelles.',
          it: 'Wombat sorrise, una tana in vista, tempo di riposare e sognare cose nuove.',
          pt: 'Wombat sorriu, uma toca à vista, hora de descansar e sonhar coisas novas.',
          ja: 'ウォンバットは笑いました、穴が見えます、休む時間です、新しいことを夢見てください。',
          ar: 'ابتسم الومبت، جحر في الأفق، حان وقت الراحة وحلم أشياء جديدة.',
          tr: 'Wombat gülümsedi, bir delik görünüyor, dinlenme zamanı ve yeni şeyler hayal etme.',
          nl: 'Wombat glimlachte, een hol in zicht, tijd om uit te rusten en nieuwe dingen te dromen.',
          da: 'Wombat smilede, et hul i sigte, tid til at hvile og drømme om nye ting.',
          la: 'Wombatus risit, fovea in conspectu, tempus quiescendi et somniandi rerum novarum.',
          zh: '袋熊微笑了，一个洞穴在视野中，是休息和梦想新事物的时候了。',
        },
        interactionType: 'music_challenge',
        musicChallenge: {
          enabled: true,
          instrumentId: 'flute',
          promptText: 'Play a cozy tune to help Wombat snuggle into the burrow!',
          mode: 'guided',
          requiredSequence: ['E', 'D', 'C', 'D', 'E', 'E', 'E'],
          successSongId: 'wombat_burrow_v1',
          successStateId: 'wombat_snuggled',
          autoPlaySuccessSong: true,
          allowSkip: true,
          micRequired: true,
          fallbackAllowed: true,
          hintLevel: 'standard',
        },
      },
      {
        id: 'snuggle-little-wombat-5',
        pageNumber: 5,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-5/background.webp'),
        text: 'Wombat stopped, where soft roots grew, inside the burrow, the quietness grew.',
        localizedText: {
          en: 'Wombat stopped, where soft roots grew, inside the burrow, the quietness grew.',
          pl: 'Wombat zatrzymał się, gdzie rosły miękkie korzenie, wewnątrz nory cisza rosła.',
          es: 'Wombat se detuvo, donde crecían raíces suaves, dentro de la madriguera, la quietud crecía.',
          de: 'Wombat hielt an, wo weiche Wurzeln wuchsen, im Bau wuchs die Stille.',
          fr: 'Wombat s\'arrêta, où poussaient des racines douces, à l\'intérieur du terrier, le silence grandit.',
          it: 'Wombat si fermò, dove crescevano radici morbide, dentro la tana, il silenzio crebbe.',
          pt: 'Wombat parou, onde raízes macias cresciam, dentro da toca, o silêncio crescia.',
          ja: 'ウォンバットは止まりました、柔らかい根が育つ場所で、穴の中で、静寂が育ちました。',
          ar: 'توقف الومبت، حيث نمت الجذور الناعمة، داخل الجحر، نما الهدوء.',
          tr: 'Wombat durdu, yumuşak köklerin büyüdüğü yerde, deliğin içinde, sessizlik büyüdü.',
          nl: 'Wombat stopte, waar zachte wortels groeiden, in het hol, de stilte groeide.',
          da: 'Wombat stoppede, hvor bløde rødder voksede, inde i hullet, stilheden voksede.',
          la: 'Wombatus stetit, ubi radices molles creverunt, in fovea, silentium crevit.',
          zh: '袋熊停了下来，柔软的根生长的地方，在洞穴里，寂静增长了。',
        },
      },
      {
        id: 'snuggle-little-wombat-6',
        pageNumber: 6,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-6/background.webp'),
        text: 'Wombat nests, the night time grew, sleeping in a bed, where dreams come true.',
        localizedText: {
          en: 'Wombat nests, the night time grew, sleeping in a bed, where dreams come true.',
          pl: 'Wombat zagnieździł się, noc nadeszła, śpiąc w łóżeczku, gdzie marzenia się spełniają.',
          es: 'Wombat anida, la noche creció, durmiendo en una cama, donde los sueños se hacen realidad.',
          de: 'Wombat nistet, die Nachtzeit wuchs, schlafend in einem Bett, wo Träume wahr werden.',
          fr: 'Wombat niche, la nuit grandit, dormant dans un lit, où les rêves deviennent réalité.',
          it: 'Wombat nidifica, la notte crebbe, dormendo in un letto, dove i sogni diventano realtà.',
          pt: 'Wombat aninha, a noite cresceu, dormindo em uma cama, onde os sonhos se tornam realidade.',
          ja: 'ウォンバットは巣を作ります、夜が成長しました、ベッドで寝ています、夢が叶う場所。',
          ar: 'يعشش الومبت، نمت الليلة، ينام في سرير، حيث تتحقق الأحلام.',
          tr: 'Wombat yuva yapar, gece büyüdü, bir yatakta uyuyor, rüyaların gerçek olduğu yer.',
          nl: 'Wombat nestelt, de nacht groeide, slapend in een bed, waar dromen uitkomen.',
          da: 'Wombat bygger rede, natten voksede, sover i en seng, hvor drømme bliver virkelighed.',
          la: 'Wombatus nidificat, nox crevit, in lecto dormiens, ubi somnia vera fiunt.',
          zh: '袋熊筑巢，夜晚增长，在床上睡觉，梦想成真的地方。',
        },
      },
      {
        id: 'snuggle-little-wombat-7',
        pageNumber: 7,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-7/background.webp'),
        text: 'Wombat dreamt, with gentle cheer, hugging berries he held so dear.',
        localizedText: {
          en: 'Wombat dreamt, with gentle cheer, hugging berries he held so dear.',
          pl: 'Wombat śnił, z łagodną radością, przytulając jagody, które tak kochał.',
          es: 'Wombat soñó, con suave alegría, abrazando bayas que tanto quería.',
          de: 'Wombat träumte, mit sanfter Freude, Beeren umarmend, die er so lieb hatte.',
          fr: 'Wombat rêvait, avec une douce joie, embrassant les baies qu\'il chérissait.',
          it: 'Wombat sognava, con dolce gioia, abbracciando le bacche che amava tanto.',
          pt: 'Wombat sonhou, com alegria suave, abraçando as bagas que tanto amava.',
          ja: 'ウォンバットは夢を見ました、優しい喜びで、彼が大切にしていたベリーを抱きしめました。',
          ar: 'حلم الومبت، بفرح لطيف، يحتضن التوت الذي كان يحبه كثيراً.',
          tr: 'Wombat rüya gördü, nazik sevinçle, çok sevdiği meyveleri kucaklayarak.',
          nl: 'Wombat droomde, met zachte vreugde, bessen omarmend die hij zo dierbaar vond.',
          da: 'Wombat drømte, med blid glæde, omfavnende bær han holdt så dyrt.',
          la: 'Wombatus somniavit, cum gaudio miti, bacas amplexans quas tam carus tenuit.',
          zh: '袋熊梦想，带着温柔的欢乐，拥抱他珍视的浆果。',
        },
      },
      {
        id: 'snuggle-little-wombat-8',
        pageNumber: 8,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-8/background.webp'),
        text: 'Wombat sleeps, in quiet delight, your turn - turn off the light... goodnight!',
        localizedText: {
          en: 'Wombat sleeps, in quiet delight, your turn - turn off the light... goodnight!',
          pl: 'Wombat śpi, w cichej radości, twoja kolej - zgaś światło... dobranoc!',
          es: 'Wombat duerme, en tranquila alegría, tu turno - apaga la luz... ¡buenas noches!',
          de: 'Wombat schläft, in stiller Freude, du bist dran - mach das Licht aus... gute Nacht!',
          fr: 'Wombat dort, dans une joie tranquille, à toi - éteins la lumière... bonne nuit!',
          it: 'Wombat dorme, in tranquilla gioia, il tuo turno - spegni la luce... buonanotte!',
          pt: 'Wombat dorme, em alegria tranquila, sua vez - apague a luz... boa noite!',
          ja: 'ウォンバットは眠ります、静かな喜びで、あなたの番です-ライトを消してください...おやすみなさい！',
          ar: 'ينام الومبت، في فرح هادئ، دورك - أطفئ الضوء... تصبح على خير!',
          tr: 'Wombat uyuyor, sessiz sevinçle, senin sıran - ışığı kapat... iyi geceler!',
          nl: 'Wombat slaapt, in stille vreugde, jouw beurt - zet het licht uit... goedenacht!',
          da: 'Wombat sover, i stille glæde, din tur - sluk lyset... godnat!',
          la: 'Wombatus dormit, in gaudio tranquillo, tuus est modus - lucernam exstingue... bene nocte!',
          zh: '袋熊睡觉，在安静的喜悦中，轮到你了-关掉灯...晚安！',
        },
      }
    ]
  } as Story,
  {
    id: '1',
    title: 'The Sleepy Forest',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '2-5',
    duration: 8,
    description: 'A gentle tale about woodland creatures getting ready for sleep.',
    tags: ['bedtime', 'calming', 'nature', 'animals'],
    pages: sleepyForestPages
  },
  {
    id: '2',
    title: 'Pirate Adventure',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🗺️',
    coverImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 12,
    description: 'Join Captain Freya on a treasure hunt across the seven seas!',
    tags: ['adventure', 'imagination-games'],
    pages: [
      {
        id: 'pa-page-1',
        pageNumber: 1,
        text: 'Captain Freya stood on the deck of her ship, looking at an old treasure map.'
      },
      {
        id: 'pa-page-2',
        pageNumber: 2,
        text: '"Ahoy, crew!" she called. "We\'re going on the greatest treasure hunt ever!"'
      },
      {
        id: 'pa-page-3',
        pageNumber: 3,
        text: 'They sailed across the sparkling blue ocean, following the map\'s mysterious clues.'
      },
      {
        id: 'pa-page-4',
        pageNumber: 4,
        text: 'On a tropical island, they found a cave hidden behind a waterfall.'
      },
      {
        id: 'pa-page-5',
        pageNumber: 5,
        text: 'Inside the cave, golden coins and precious gems sparkled in the torchlight.'
      },
      {
        id: 'pa-page-6',
        pageNumber: 6,
        text: '"We did it!" cheered Captain Freya. "The greatest treasure of all is our friendship!"'
      },
      {
        id: 'pa-page-7',
        pageNumber: 7,
        text: 'They shared the treasure with everyone in their village, making everyone happy.'
      },
      {
        id: 'pa-page-8',
        pageNumber: 8,
        text: 'And Captain Freya\'s crew sailed home under the sunset, ready for their next adventure. The End.'
      }
    ]
  },
  {
    id: '3',
    title: 'The Magical Garden',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🌸',
    coverImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '2-4',
    duration: 6,
    description: 'Discover the wonders of nature in a magical garden.',
    pages: [
      {
        id: 'mg-page-1',
        pageNumber: 1,
        text: 'In a secret garden, flowers danced in the gentle breeze.'
      },
      {
        id: 'mg-page-2',
        pageNumber: 2,
        text: 'Butterflies painted rainbows as they fluttered from bloom to bloom.'
      },
      {
        id: 'mg-page-3',
        pageNumber: 3,
        text: 'A wise old tree whispered stories of seasons past.'
      },
      {
        id: 'mg-page-4',
        pageNumber: 4,
        text: 'Little seeds dreamed of growing tall and strong.'
      },
      {
        id: 'mg-page-5',
        pageNumber: 5,
        text: 'The garden taught everyone that with love and care, beautiful things grow.'
      }
    ]
  },
  {
    id: '4',
    title: 'Best Friends Forever',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🤝',
    coverImage: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-5',
    duration: 9,
    description: 'A heartwarming story about making new friends.',
    tags: ['calming', 'family-exercises', 'friendship', 'emotions'],
    pages: [
      {
        id: 'bff-page-1',
        pageNumber: 1,
        text: 'Maya was nervous about her first day at the new playground.'
      },
      {
        id: 'bff-page-2',
        pageNumber: 2,
        text: 'She sat on a bench, watching other children play together happily.'
      },
      {
        id: 'bff-page-3',
        pageNumber: 3,
        text: 'A friendly boy named Sam noticed Maya sitting alone.'
      },
      {
        id: 'bff-page-4',
        pageNumber: 4,
        text: '"Would you like to play with us?" Sam asked with a warm smile.'
      },
      {
        id: 'bff-page-5',
        pageNumber: 5,
        text: 'Maya smiled back and joined the group, feeling happy and included.'
      }
    ]
  },
  {
    id: '5',
    title: 'Counting with Dragons',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '🐉',
    coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 7,
    description: 'Learn to count with friendly dragons!',
    tags: ['learning', 'imagination-games', 'counting', 'fantasy'],
    pages: [
      {
        id: 'cd-page-1',
        pageNumber: 1,
        text: 'One little dragon loved to count everything he saw.'
      },
      {
        id: 'cd-page-2',
        pageNumber: 2,
        text: 'Two butterflies danced around his head.'
      },
      {
        id: 'cd-page-3',
        pageNumber: 3,
        text: 'Three birds sang beautiful songs in the trees.'
      },
      {
        id: 'cd-page-4',
        pageNumber: 4,
        text: 'Four flowers bloomed in the meadow.'
      },
      {
        id: 'cd-page-5',
        pageNumber: 5,
        text: 'Five friends came to play, and they all counted together!'
      }
    ]
  },
  {
    id: '6',
    title: 'The Unicorn\'s Dream',
    category: 'fantasy',
    tag: 'Fantasy',
    emoji: '🦄',
    coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '4-7',
    duration: 10,
    description: 'A magical adventure in a land of dreams and wonder.',
    tags: ['imagination-games', 'bedtime', 'fantasy', 'calming'],
    pages: [
      {
        id: 'ud-page-1',
        pageNumber: 1,
        text: 'In a land where dreams come true, lived a gentle unicorn named Luna.'
      },
      {
        id: 'ud-page-2',
        pageNumber: 2,
        text: 'Luna\'s horn sparkled with stardust and her mane shimmered like moonbeams.'
      },
      {
        id: 'ud-page-3',
        pageNumber: 3,
        text: 'Every night, she would grant wishes to children who believed in magic.'
      },
      {
        id: 'ud-page-4',
        pageNumber: 4,
        text: 'One special night, Luna decided to visit the dream world herself.'
      },
      {
        id: 'ud-page-5',
        pageNumber: 5,
        text: 'She discovered that the most magical dreams are the ones we share with others.'
      }
    ]
  }
];

// Additional stories for better genre representation
const ADDITIONAL_STORIES: Story[] = [
  {
    id: '7',
    title: 'Ocean Adventure',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🌊',
    coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 8,
    description: 'Dive deep into the ocean and meet amazing sea creatures.',
    pages: []
  },
  {
    id: '8',
    title: 'Forest Friends',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🦌',
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '2-4',
    duration: 6,
    description: 'Meet the friendly animals that live in the forest.',
    pages: []
  },
  {
    id: '9',
    title: 'Sharing is Caring',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🎁',
    coverImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-5',
    duration: 7,
    description: 'Learn about the joy of sharing with friends.',
    pages: []
  },
  {
    id: '10',
    title: 'ABC Safari',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '🦁',
    coverImage: 'https://images.unsplash.com/photo-1549366021-9f761d040a94?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 10,
    description: 'Learn the alphabet with amazing animals from around the world.',
    pages: []
  },
  {
    id: '11',
    title: 'The Magic Castle',
    category: 'fantasy',
    tag: 'Fantasy',
    emoji: '🏰',
    coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '4-7',
    duration: 12,
    description: 'Explore a magical castle filled with wonder and surprises.',
    pages: []
  },
  {
    id: '12',
    title: 'Goodnight Moon',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '1-4',
    duration: 5,
    description: 'A peaceful bedtime story to help you drift off to sleep.',
    pages: []
  }
];

// Create placeholder stories for empty slots
export const PLACEHOLDER_STORIES: Story[] = Array.from({ length: 4 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  title: 'Coming Soon',
  category: 'adventure',
  tag: '🗺️ Adventure',
  emoji: '📚',
  coverImage: '',
  isAvailable: false,
  ageRange: '2-5',
  duration: 8,
  description: 'A new story is coming soon!',
  pages: []
}));

// Learn Music placeholder stories
export const MUSIC_PLACEHOLDER_STORIES: Story[] = [
  {
    id: 'music-placeholder-1',
    title: 'Musical Adventures',
    category: 'music',
    tag: '🎵 Learn Music',
    emoji: '🎹',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Learn about musical instruments and sounds!',
    pages: []
  },
  {
    id: 'music-placeholder-2',
    title: 'Rhythm & Rhyme',
    category: 'music',
    tag: '🎵 Learn Music',
    emoji: '🥁',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Discover the joy of rhythm and rhyme!',
    pages: []
  },
  {
    id: 'music-placeholder-3',
    title: 'Singing Stars',
    category: 'music',
    tag: '🎵 Learn Music',
    emoji: '🎤',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Sing along with your favorite songs!',
    pages: []
  }
];

// Spontaneous Activities placeholder stories
export const ACTIVITIES_PLACEHOLDER_STORIES: Story[] = [
  {
    id: 'activities-placeholder-1',
    title: 'Fun & Games',
    category: 'activities',
    tag: '🎲 Activities',
    emoji: '🎯',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Exciting games and activities to try!',
    pages: []
  },
  {
    id: 'activities-placeholder-2',
    title: 'Creative Play',
    category: 'activities',
    tag: '🎲 Activities',
    emoji: '🎨',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Let your imagination run wild!',
    pages: []
  },
  {
    id: 'activities-placeholder-3',
    title: 'Move & Groove',
    category: 'activities',
    tag: '🎲 Activities',
    emoji: '🏃',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Active games to get you moving!',
    pages: []
  }
];

// Growing Together placeholder stories
export const GROWING_PLACEHOLDER_STORIES: Story[] = [
  {
    id: 'growing-placeholder-1',
    title: 'Family Moments',
    category: 'growing',
    tag: '🌱 Growing',
    emoji: '👨‍👩‍👧',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Special moments with family!',
    pages: []
  },
  {
    id: 'growing-placeholder-2',
    title: 'Learning Together',
    category: 'growing',
    tag: '🌱 Growing',
    emoji: '🤗',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Grow and learn with your loved ones!',
    pages: []
  },
  {
    id: 'growing-placeholder-3',
    title: 'Sharing & Caring',
    category: 'growing',
    tag: '🌱 Growing',
    emoji: '💝',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Learn about kindness and sharing!',
    pages: []
  }
];

// Your Story placeholder stories (personalized)
export const PERSONALIZED_PLACEHOLDER_STORIES: Story[] = [
  {
    id: 'personalized-placeholder-1',
    title: 'Your Adventure',
    category: 'personalized',
    tag: '🎭 Your Story',
    emoji: '⭐',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'Create your own personalized story!',
    pages: [],
    tags: ['personalized']
  },
  {
    id: 'personalized-placeholder-2',
    title: 'Your Journey',
    category: 'personalized',
    tag: '🎭 Your Story',
    emoji: '🌟',
    coverImage: '',
    isAvailable: false,
    ageRange: '2-5',
    duration: 8,
    description: 'A story starring you!',
    pages: [],
    tags: ['personalized']
  }
];

// Combine all stories
export const ALL_STORIES: Story[] = [
  ...MOCK_STORIES,
  ...ADDITIONAL_STORIES,
  ...PLACEHOLDER_STORIES,
  ...PERSONALIZED_PLACEHOLDER_STORIES, // Your Story section
  ...MUSIC_PLACEHOLDER_STORIES,
  ...ACTIVITIES_PLACEHOLDER_STORIES,
  ...GROWING_PLACEHOLDER_STORIES
];

// Helper functions
export function getAvailableStories(): Story[] {
  return ALL_STORIES.filter(story => story.isAvailable);
}

export function getRandomStory(): Story {
  const availableStories = getAvailableStories();
  const randomIndex = Math.floor(Math.random() * availableStories.length);
  return availableStories[randomIndex];
}

export function getStoriesByGenre(): Record<string, Story[]> {
  const genreMap: Record<string, Story[]> = {};

  ALL_STORIES.forEach(story => {
    if (!genreMap[story.category]) {
      genreMap[story.category] = [];
    }
    genreMap[story.category].push(story);
  });

  return genreMap;
}

export function getGenresWithStories(): string[] {
  const genreMap = getStoriesByGenre();
  return Object.keys(genreMap).filter(genre => genreMap[genre].length > 0);
}
