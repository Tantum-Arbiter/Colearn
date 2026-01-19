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
        text: 'Snuggle Little Wombat\n\nA gentle bedtime story',
        localizedText: {
          en: 'Snuggle Little Wombat\n\nA gentle bedtime story',
          pl: 'Przytulanka Mały Wombat\n\nŁagodna bajka na dobranoc',
          es: 'Acurrúcate Pequeño Wombat\n\nUn cuento suave para dormir',
          de: 'Kuschel Kleiner Wombat\n\nEine sanfte Gutenachtgeschichte',
        },
      },
      {
        id: 'snuggle-little-wombat-1',
        pageNumber: 1,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-1/background.webp'),
        text: 'Wombat yawned, the sky turnt blue, time to rest, the stars peek through.',
        localizedText: {
          en: 'Wombat yawned, the sky turnt blue, time to rest, the stars peek through.',
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

// Interactive Elements Test Story - The Squirrel's Snowman (Nature book)
// DISCLAIMER: This is NOT original content. Used for proof-of-concept only.
const INTERACTIVE_TEST_STORIES: Story[] = [
  {
    id: 'squirrels-snowman',
    title: 'The Squirrel\'s Snowman',
    localizedTitle: {
      en: 'The Squirrel\'s Snowman',
      pl: 'Bałwan Wiewiórki',
      es: 'El Muñeco de Nieve de la Ardilla',
      de: 'Der Schneemann des Eichhörnchens',
      fr: 'Le Bonhomme de Neige de l\'Écureuil',
      it: 'L\'Uomo di Neve dello Scoiattolo',
      pt: 'O Boneco de Neve do Esquilo',
      ja: 'リスの雪だるま',
      ar: 'رجل الثلج الخاص بالسنجاب',
      tr: 'Sincabın Kardan Adamı',
      nl: 'De Sneeuwman van de Eekhoorn',
      da: 'Egernens Snemand',
      la: 'Homo Niveus Sciuri',
      zh: '松鼠的雪人',
    },
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🎄',
    coverImage: require('../assets/stories/squirrels-snowman/cover/cover.webp'),
    isAvailable: true,
    ageRange: '2-5',
    duration: 11,
    description: 'A delightful winter story about a squirrel and a snowman. This is not my own work, it is for proof of concept only.',
    localizedDescription: {
      en: 'A delightful winter story about a squirrel and a snowman.',
      pl: 'Urocza zimowa opowieść o wiewiórce i bałwanie.',
      es: 'Una encantadora historia de invierno sobre una ardilla y un muñeco de nieve.',
      de: 'Eine entzückende Wintergeschichte über ein Eichhörnchen und einen Schneemann.',
      fr: 'Une délicieuse histoire d\'hiver sur un écureuil et un bonhomme de neige.',
      it: 'Un\'affascinante storia invernale su uno scoiattolo e un uomo di neve.',
      pt: 'Uma deliciosa história de inverno sobre um esquilo e um boneco de neve.',
      ja: 'リスと雪だるまについての楽しい冬の物語。',
      ar: 'قصة شتوية رائعة عن سنجاب ورجل ثلج.',
      tr: 'Bir sincap ve kardan adam hakkında keyifli bir kış hikayesi.',
      nl: 'Een heerlijk winterverhaal over een eekhoorn en een sneeuwman.',
      da: 'En herlig vinterhhistorie om en egern og en snemand.',
      la: 'Fabula hiemalis delectabilis de sciuro et homine niveo.',
      zh: '关于松鼠和雪人的令人愉快的冬季故事。',
    },
    tags: ['calming', 'bedtime', 'nature', 'animals', 'friendship'],
    pages: [
      {
        id: 'squirrels-snowman-cover',
        pageNumber: 0,
        type: 'cover',
        backgroundImage: require('../assets/stories/squirrels-snowman/cover/cover.webp'),
        text: 'The Squirrel\'s Snowman',
        localizedText: {
          en: 'The Squirrel\'s Snowman',
          pl: 'Bałwan Wiewiórki',
          es: 'El Muñeco de Nieve de la Ardilla',
          de: 'Der Schneemann des Eichhörnchens',
          fr: 'Le Bonhomme de Neige de l\'Écureuil',
          it: 'L\'Uomo di Neve dello Scoiattolo',
          pt: 'O Boneco de Neve do Esquilo',
          ja: 'リスの雪だるま',
          ar: 'رجل الثلج الخاص بالسنجاب',
          tr: 'Sincabın Kardan Adamı',
          nl: 'De Sneeuwman van de Eekhoorn',
          da: 'Egernens Snemand',
          la: 'Homo Niveus Sciuri',
          zh: '松鼠的雪人',
        },
      },
      {
        id: 'squirrels-snowman-1',
        pageNumber: 1,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-1/background.webp'),
        text: 'Squirrel puts her boots on.\nHer hat is on her head.',
        localizedText: {
          en: 'Squirrel puts her boots on.\nHer hat is on her head.',
          pl: 'Wiewiórka zakłada buty.\nCzapka jest na jej głowie.',
          es: 'Ardilla se pone las botas.\nSu gorro está en su cabeza.',
          de: 'Eichhörnchen zieht ihre Stiefel an.\nIhr Hut ist auf ihrem Kopf.',
          fr: 'L\'écureuil met ses bottes.\nSon chapeau est sur sa tête.',
          it: 'Lo scoiattolo mette gli stivali.\nIl suo cappello è sulla sua testa.',
          pt: 'O esquilo coloca suas botas.\nSeu chapéu está em sua cabeça.',
          ja: 'リスはブーツを履きます。\n彼女の帽子は彼女の頭の上にあります。',
          ar: 'تضع السنجاب حذاءها.\nقبعتها على رأسها.',
          tr: 'Sincap çizmelerini giyiyor.\nŞapkası başında.',
          nl: 'Eekhoorn trekt haar laarzen aan.\nHaar hoed is op haar hoofd.',
          da: 'Egern tager sine støvler på.\nHendes hat er på hendes hoved.',
          la: 'Sciurus calceos suos induit.\nPileus eius in capite eius est.',
          zh: '松鼠穿上靴子。\n她的帽子在她的头上。',
        },
      },
      {
        id: 'squirrels-snowman-2',
        pageNumber: 2,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-2/background.webp'),
        text: 'She wants to make a snowman.\nWhat\'s inside this shed?',
        localizedText: {
          en: 'She wants to make a snowman.\nWhat\'s inside this shed?',
          pl: 'Chce zbudować bałwana.\nCo jest w tej szopie?',
          es: 'Quiere hacer un muñeco de nieve.\n¿Qué hay dentro de este cobertizo?',
          de: 'Sie will einen Schneemann bauen.\nWas ist in diesem Schuppen?',
          fr: 'Elle veut faire un bonhomme de neige.\nQu\'y a-t-il dans ce hangar?',
          it: 'Vuole fare un uomo di neve.\nCosa c\'è dentro questo capannone?',
          pt: 'Ela quer fazer um boneco de neve.\nO que há dentro deste galpão?',
          ja: '彼女は雪だるまを作りたいです。\nこの小屋の中に何がありますか？',
          ar: 'تريد أن تصنع رجل ثلج.\nماذا يوجد داخل هذا الحظيرة؟',
          tr: 'Kardan adam yapmak istiyor.\nBu ahırın içinde ne var?',
          nl: 'Ze wil een sneeuwman maken.\nWat zit er in deze schuur?',
          da: 'Hun vil lave en snemand.\nHvad er der i denne skur?',
          la: 'Vult hominem niveum facere.\nQuid in hac tugurio est?',
          zh: '她想堆一个雪人。\n这个棚子里面有什么？',
        },
        interactiveElements: [
          {
            id: 'door',
            type: 'reveal' as const,
            image: require('../assets/stories/squirrels-snowman/page-2/props/door-open.webp'),
            position: { x: 0.481, y: 0.337 },
            size: { width: 0.273, height: 0.301 }
          }
        ]
      },
      {
        id: 'squirrels-snowman-3',
        pageNumber: 3,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-3/background.webp'),
        text: 'Squirrel\'s snowman has a head.\nNow he needs a nose.',
        localizedText: {
          en: 'Squirrel\'s snowman has a head.\nNow he needs a nose.',
          pl: 'Bałwan Wiewiórki ma głowę.\nTeraz potrzebuje nosa.',
          es: 'El muñeco de nieve de Ardilla tiene cabeza.\nAhora necesita una nariz.',
          de: 'Eichhörnchens Schneemann hat einen Kopf.\nJetzt braucht er eine Nase.',
          fr: 'Le bonhomme de neige de l\'écureuil a une tête.\nMaintenant il a besoin d\'un nez.',
          it: 'L\'uomo di neve dello scoiattolo ha una testa.\nOra ha bisogno di un naso.',
          pt: 'O boneco de neve do esquilo tem uma cabeça.\nAgora ele precisa de um nariz.',
          ja: 'リスの雪だるまは頭を持っています。\n今彼は鼻が必要です。',
          ar: 'رجل الثلج الخاص بالسنجاب له رأس.\nالآن يحتاج إلى أنف.',
          tr: 'Sincabın kardan adamının başı var.\nŞimdi bir burna ihtiyacı var.',
          nl: 'De sneeuwman van de eekhoorn heeft een hoofd.\nNu heeft hij een neus nodig.',
          da: 'Egernens snemand har et hoved.\nNu har han brug for en næse.',
          la: 'Homo niveus sciuri caput habet.\nNunc nasum indiget.',
          zh: '松鼠的雪人有一个头。\n现在他需要一个鼻子。',
        },
      },
      {
        id: 'squirrels-snowman-4',
        pageNumber: 4,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-4/background.webp'),
        text: 'Can Squirrel find a carrot?\nWhat do you suppose?',
        localizedText: {
          en: 'Can Squirrel find a carrot?\nWhat do you suppose?',
          pl: 'Czy Wiewiórka znajdzie marchewkę?\nCo myślisz?',
          es: '¿Puede Ardilla encontrar una zanahoria?\n¿Qué crees tú?',
          de: 'Kann Eichhörnchen eine Karotte finden?\nWas denkst du?',
          fr: 'L\'écureuil peut-il trouver une carotte?\nQu\'en penses-tu?',
          it: 'Lo scoiattolo può trovare una carota?\nCosa ne pensi?',
          pt: 'O esquilo pode encontrar uma cenoura?\nO que você acha?',
          ja: 'リスはニンジンを見つけることができますか？\nあなたはどう思いますか？',
          ar: 'هل يمكن للسنجاب أن يجد جزرة؟\nماذا تعتقد؟',
          tr: 'Sincap havuç bulabilir mi?\nSen ne düşünüyorsun?',
          nl: 'Kan de eekhoorn een wortel vinden?\nWat denk je?',
          da: 'Kan egern finde en gulerod?\nHvad tror du?',
          la: 'Potestne sciurus pastinacam invenire?\nQuid tu putas?',
          zh: '松鼠能找到胡萝卜吗？\n你觉得呢？',
        },
        interactiveElements: [
          {
            id: 'basket',
            type: 'reveal' as const,
            image: require('../assets/stories/squirrels-snowman/page-4/props/basket-open.webp'),
            position: { x: 0.475, y: 0.478 },
            size: { width: 0.183, height: 0.230 }
          }
        ]
      },
      {
        id: 'squirrels-snowman-5',
        pageNumber: 5,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-5/background.webp'),
        text: 'Now the snowman needs some eyes.\nSquirrel visits Mole.',
        localizedText: {
          en: 'Now the snowman needs some eyes.\nSquirrel visits Mole.',
          pl: 'Teraz bałwan potrzebuje oczu.\nWiewiórka odwiedza Kreta.',
          es: 'Ahora el muñeco de nieve necesita ojos.\nArdilla visita a Topo.',
          de: 'Jetzt braucht der Schneemann Augen.\nEichhörnchen besucht Maulwurf.',
          fr: 'Maintenant le bonhomme de neige a besoin d\'yeux.\nL\'écureuil visite la Taupe.',
          it: 'Ora l\'uomo di neve ha bisogno di occhi.\nLo scoiattolo visita la Talpa.',
          pt: 'Agora o boneco de neve precisa de olhos.\nO esquilo visita a Toupeira.',
          ja: '今、雪だるまは目が必要です。\nリスはモグラを訪問します。',
          ar: 'الآن رجل الثلج يحتاج إلى عيون.\nتزور السنجاب الخلد.',
          tr: 'Şimdi kardan adamın gözlere ihtiyacı var.\nSincap Köstebek\'i ziyaret ediyor.',
          nl: 'Nu heeft de sneeuwman ogen nodig.\nEekhoorn bezoekt Mol.',
          da: 'Nu har snemanden brug for øjne.\nEgern besøger Muldvarp.',
          la: 'Nunc homo niveus oculos indiget.\nSciurus Talpam visitat.',
          zh: '现在雪人需要眼睛。\n松鼠拜访鼹鼠。',
        },
      },
      {
        id: 'squirrels-snowman-6',
        pageNumber: 6,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-6/background.webp'),
        text: 'They look inside a great big box\nand find some lumps of coal.',
        localizedText: {
          en: 'They look inside a great big box\nand find some lumps of coal.',
          pl: 'Zaglądają do wielkiego pudła\ni znajdują kawałki węgla.',
          es: 'Miran dentro de una caja grande\ny encuentran trozos de carbón.',
          de: 'Sie schauen in eine große Kiste\nund finden Kohlestücke.',
          fr: 'Ils regardent à l\'intérieur d\'une grande boîte\net trouvent des morceaux de charbon.',
          it: 'Guardano dentro una grande scatola\ne trovano pezzi di carbone.',
          pt: 'Eles olham dentro de uma caixa grande\ne encontram pedaços de carvão.',
          ja: '彼らは大きな箱の中を見ます\nそして石炭の塊を見つけます。',
          ar: 'ينظرون داخل صندوق كبير\nويجدون قطع من الفحم.',
          tr: 'Büyük bir kutunun içine bakıyorlar\nve kömür parçaları buluyorlar.',
          nl: 'Ze kijken in een grote doos\nen vinden stukken kool.',
          da: 'De kigger ind i en stor kasse\nog finder stykker kul.',
          la: 'Intus magnum arcam spectant\net carbonum fragmenta inveniunt.',
          zh: '他们看着一个大盒子里面\n找到了一些煤块。',
        },
        interactiveElements: [
          {
            id: 'crate',
            type: 'reveal' as const,
            image: require('../assets/stories/squirrels-snowman/page-6/props/basket-open.webp'),
            position: { x: 0.348, y: 0.433 },
            size: { width: 0.308, height: 0.280 }
          }
        ]
      },
      {
        id: 'squirrels-snowman-7',
        pageNumber: 7,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-7/background.webp'),
        text: 'A hat, a scarf, and twigs for arms -\nthe snowman is complete!',
        localizedText: {
          en: 'A hat, a scarf, and twigs for arms -\nthe snowman is complete!',
          pl: 'Czapka, szalik i gałązki na ręce -\nbałwan jest gotowy!',
          es: 'Un sombrero, una bufanda y ramitas para brazos -\n¡el muñeco de nieve está completo!',
          de: 'Ein Hut, ein Schal und Zweige für Arme -\nder Schneemann ist fertig!',
          fr: 'Un chapeau, une écharpe et des brindilles pour les bras -\nle bonhomme de neige est complet!',
          it: 'Un cappello, una sciarpa e rametti per le braccia -\nl\'uomo di neve è completo!',
          pt: 'Um chapéu, uma lenço e galhos para os braços -\no boneco de neve está completo!',
          ja: '帽子、スカーフ、腕の小枝-\n雪だるまが完成しました！',
          ar: 'قبعة وشاح وأغصان للذراعين -\nرجل الثلج مكتمل!',
          tr: 'Bir şapka, bir atkı ve kollar için dallar -\nkardan adam tamamlandı!',
          nl: 'Een hoed, een sjaal en takjes voor armen -\nde sneeuwman is klaar!',
          da: 'En hat, et tørklæde og kviste til arme -\nsnemanden er færdig!',
          la: 'Pileus, stola, et ramuli pro brachiis -\nhomo niveus completus est!',
          zh: '一顶帽子、一条围巾和手臂的树枝-\n雪人完成了！',
        },
      },
      {
        id: 'squirrels-snowman-8',
        pageNumber: 8,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-8/background.webp'),
        text: 'Squirrel\'s feeling hungry.\nWhat\'s she going to eat?',
        localizedText: {
          en: 'Squirrel\'s feeling hungry.\nWhat\'s she going to eat?',
          pl: 'Wiewiórka jest głodna.\nCo zje?',
          es: 'Ardilla tiene hambre.\n¿Qué va a comer?',
          de: 'Eichhörnchen hat Hunger.\nWas wird sie essen?',
          fr: 'L\'écureuil a faim.\nQu\'est-ce qu\'elle va manger?',
          it: 'Lo scoiattolo ha fame.\nCosa mangerà?',
          pt: 'O esquilo está com fome.\nO que ela vai comer?',
          ja: 'リスはお腹が空いています。\n彼女は何を食べるつもりですか？',
          ar: 'السنجاب جائع.\nماذا ستأكل؟',
          tr: 'Sincap aç hissediyor.\nNe yiyecek?',
          nl: 'Eekhoorn voelt zich hongerig.\nWat gaat ze eten?',
          da: 'Egern er sulten.\nHvad skal hun spise?',
          la: 'Sciurus esuriens est.\nQuid edet?',
          zh: '松鼠感到饥饿。\n她要吃什么？',
        },
        interactiveElements: [
          {
            id: 'plate-cover',
            type: 'reveal' as const,
            image: require('../assets/stories/squirrels-snowman/page-8/props/food-cover-open.webp'),
            position: { x: 0.254, y: 0.460 },
            size: { width: 0.212, height: 0.158 }
          }
        ]
      },
      {
        id: 'squirrels-snowman-9',
        pageNumber: 9,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-9/background.webp'),
        text: 'Now it\'s Squirrel\'s bedtime.\nShe\'s tucked up nice and tight.',
        localizedText: {
          en: 'Now it\'s Squirrel\'s bedtime.\nShe\'s tucked up nice and tight.',
          pl: 'Teraz czas spać dla Wiewiórki.\nJest ładnie otulona.',
          es: 'Ahora es hora de dormir para Ardilla.\nEstá bien arropada.',
          de: 'Jetzt ist Schlafenszeit für Eichhörnchen.\nSie ist schön zugedeckt.',
          fr: 'Maintenant c\'est l\'heure du coucher pour l\'écureuil.\nElle est bien enveloppée.',
          it: 'Ora è l\'ora di andare a letto per lo scoiattolo.\nÈ ben coperta.',
          pt: 'Agora é hora de dormir para o esquilo.\nEla está bem coberta.',
          ja: '今、リスの就寝時間です。\n彼女はしっかり包まれています。',
          ar: 'الآن حان وقت نوم السنجاب.\nهي ملفوفة بشكل جيد.',
          tr: 'Şimdi sincabın uyku zamanı.\nO güzelce sarılmış.',
          nl: 'Nu is het bedtijd voor de eekhoorn.\nZe is goed ingepakt.',
          da: 'Nu er det sengetid for egern.\nHun er pænt pakket ind.',
          la: 'Nunc tempus somni sciuri est.\nBene involuta est.',
          zh: '现在是松鼠的睡眠时间。\n她被紧紧地包裹着。',
        },
      },
      {
        id: 'squirrels-snowman-10',
        pageNumber: 10,
        type: 'story',
        backgroundImage: require('../assets/stories/squirrels-snowman/page-10/background.webp'),
        text: 'Who\'s outside the window?\nShall we wave goodnight?',
        localizedText: {
          en: 'Who\'s outside the window?\nShall we wave goodnight?',
          pl: 'Kto jest za oknem?\nPomachamy na dobranoc?',
          es: '¿Quién está afuera de la ventana?\n¿Le decimos buenas noches?',
          de: 'Wer ist draußen vor dem Fenster?\nSollen wir gute Nacht winken?',
          fr: 'Qui est dehors à la fenêtre?\nShall we wave goodnight?',
          it: 'Chi è fuori dalla finestra?\nDobbiamo salutare buonanotte?',
          pt: 'Quem está fora da janela?\nDevemos acenar boa noite?',
          ja: '窓の外に誰がいますか？\nおやすみなさいと手を振りましょうか？',
          ar: 'من بالخارج من النافذة؟\nهل نلوح بوداع؟',
          tr: 'Pencere dışında kim var?\nİyi geceler diye el sallayalım mı?',
          nl: 'Wie is buiten het raam?\nZullen we goedenacht zwaaien?',
          da: 'Hvem er uden for vinduet?\nSkal vi vinke godnat?',
          la: 'Quis extra fenestram est?\nNonne vale nocte salutabimus?',
          zh: '窗外有谁？\n我们应该挥手说晚安吗？',
        },
        interactiveElements: [
          {
            id: 'curtains',
            type: 'reveal' as const,
            image: require('../assets/stories/squirrels-snowman/page-10/props/curtains-open.webp'),
            position: { x: 0.279, y: 0.286 },
            size: { width: 0.451, height: 0.291 }
          }
        ]
      }
    ]
  }
];

// Combine all stories (squirrels-snowman comes right after snuggle-little-wombat)
export const ALL_STORIES: Story[] = [
  MOCK_STORIES[0], // snuggle-little-wombat
  ...INTERACTIVE_TEST_STORIES, // squirrels-snowman
  ...MOCK_STORIES.slice(1), // rest of mock stories
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
