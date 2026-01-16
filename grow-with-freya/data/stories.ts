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
    },
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🐨',
    coverImage: require('../assets/stories/snuggle-little-wombat/cover/thumbnail.webp'),
    isAvailable: true,
    ageRange: '2-5',
    duration: 9,
    description: 'A gentle bedtime story about a little wombat getting ready for sleep with cozy snuggles and sweet dreams.',
    localizedDescription: {
      en: 'A gentle bedtime story about a little wombat getting ready for sleep with cozy snuggles and sweet dreams.',
      pl: 'Łagodna bajka na dobranoc o małym wombacie przygotowującym się do snu z przytulnymi uściskami i słodkimi snami.',
      es: 'Un cuento suave para dormir sobre un pequeño wombat preparándose para dormir con abrazos acogedores y dulces sueños.',
      de: 'Eine sanfte Gutenachtgeschichte über einen kleinen Wombat, der sich mit gemütlichen Kuscheleinheiten und süßen Träumen auf den Schlaf vorbereitet.',
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
    },
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🎄',
    coverImage: require('../assets/stories/squirrels-snowman/cover/thumbnail.webp'),
    isAvailable: true,
    ageRange: '2-5',
    duration: 11,
    description: 'A delightful winter story about a squirrel and a snowman. This is not my own work, it is for proof of concept only.',
    localizedDescription: {
      en: 'A delightful winter story about a squirrel and a snowman.',
      pl: 'Urocza zimowa opowieść o wiewiórce i bałwanie.',
      es: 'Una encantadora historia de invierno sobre una ardilla y un muñeco de nieve.',
      de: 'Eine entzückende Wintergeschichte über ein Eichhörnchen und einen Schneemann.',
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
