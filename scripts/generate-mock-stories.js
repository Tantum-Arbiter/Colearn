#!/usr/bin/env node

/**
 * Generate 120 mock CMS stories by duplicating the snowman template
 * with varied mock data (different animals, themes, categories).
 * 
 * Usage: node scripts/generate-mock-stories.js
 * 
 * This creates story directories under scripts/cms-stories/ with:
 * - Unique story-data.json with varied metadata
 * - Copied image assets from the cms-test-1 template
 */

const fs = require('fs');
const path = require('path');

const CMS_DIR = path.join(__dirname, 'cms-stories');
const TEMPLATE_DIR = path.join(CMS_DIR, 'cms-test-1-snowman-squirrel');
const TEMPLATE_JSON = path.join(TEMPLATE_DIR, 'story-data.json');

const TOTAL_STORIES = 120;
const START_INDEX = 14; // cms-test-1 through cms-test-13 already exist

// --- Mock data pools ---
const ANIMALS = [
  { name: 'Fox', emoji: '🦊', pl: 'Lis', es: 'Zorro', de: 'Fuchs', fr: 'Renard', it: 'Volpe', pt: 'Raposa', ja: 'キツネ', ar: 'ثعلب', tr: 'Tilki', nl: 'Vos', da: 'Ræv', la: 'Vulpes', zh: '狐狸' },
  { name: 'Bear', emoji: '🐻', pl: 'Niedźwiedź', es: 'Oso', de: 'Bär', fr: 'Ours', it: 'Orso', pt: 'Urso', ja: 'クマ', ar: 'دب', tr: 'Ayı', nl: 'Beer', da: 'Bjørn', la: 'Ursus', zh: '熊' },
  { name: 'Rabbit', emoji: '🐰', pl: 'Królik', es: 'Conejo', de: 'Hase', fr: 'Lapin', it: 'Coniglio', pt: 'Coelho', ja: 'ウサギ', ar: 'أرنب', tr: 'Tavşan', nl: 'Konijn', da: 'Kanin', la: 'Lepus', zh: '兔子' },
  { name: 'Owl', emoji: '🦉', pl: 'Sowa', es: 'Búho', de: 'Eule', fr: 'Hibou', it: 'Gufo', pt: 'Coruja', ja: 'フクロウ', ar: 'بومة', tr: 'Baykuş', nl: 'Uil', da: 'Ugle', la: 'Bubo', zh: '猫头鹰' },
  { name: 'Hedgehog', emoji: '🦔', pl: 'Jeż', es: 'Erizo', de: 'Igel', fr: 'Hérisson', it: 'Riccio', pt: 'Ouriço', ja: 'ハリネズミ', ar: 'قنفذ', tr: 'Kirpi', nl: 'Egel', da: 'Pindsvin', la: 'Erinaceus', zh: '刺猬' },
  { name: 'Deer', emoji: '🦌', pl: 'Jeleń', es: 'Ciervo', de: 'Hirsch', fr: 'Cerf', it: 'Cervo', pt: 'Cervo', ja: 'シカ', ar: 'غزال', tr: 'Geyik', nl: 'Hert', da: 'Hjort', la: 'Cervus', zh: '鹿' },
  { name: 'Otter', emoji: '🦦', pl: 'Wydra', es: 'Nutria', de: 'Otter', fr: 'Loutre', it: 'Lontra', pt: 'Lontra', ja: 'カワウソ', ar: 'قضاعة', tr: 'Su samuru', nl: 'Otter', da: 'Odder', la: 'Lutra', zh: '水獭' },
  { name: 'Penguin', emoji: '🐧', pl: 'Pingwin', es: 'Pingüino', de: 'Pinguin', fr: 'Pingouin', it: 'Pinguino', pt: 'Pinguim', ja: 'ペンギン', ar: 'بطريق', tr: 'Penguen', nl: 'Pinguïn', da: 'Pingvin', la: 'Spheniscus', zh: '企鹅' },
  { name: 'Kitten', emoji: '🐱', pl: 'Kotek', es: 'Gatito', de: 'Kätzchen', fr: 'Chaton', it: 'Gattino', pt: 'Gatinho', ja: '子猫', ar: 'قطة صغيرة', tr: 'Yavru kedi', nl: 'Kitten', da: 'Killing', la: 'Catulus', zh: '小猫' },
  { name: 'Puppy', emoji: '🐶', pl: 'Szczeniak', es: 'Cachorro', de: 'Welpe', fr: 'Chiot', it: 'Cucciolo', pt: 'Cachorrinho', ja: '子犬', ar: 'جرو', tr: 'Yavru köpek', nl: 'Puppy', da: 'Hvalp', la: 'Catellus', zh: '小狗' },
  { name: 'Duckling', emoji: '🐥', pl: 'Kaczątko', es: 'Patito', de: 'Entlein', fr: 'Caneton', it: 'Anatroccolo', pt: 'Patinho', ja: 'アヒルの子', ar: 'بطة صغيرة', tr: 'Ördek yavrusu', nl: 'Eendje', da: 'Ælling', la: 'Anatinus', zh: '小鸭' },
  { name: 'Panda', emoji: '🐼', pl: 'Panda', es: 'Panda', de: 'Panda', fr: 'Panda', it: 'Panda', pt: 'Panda', ja: 'パンダ', ar: 'باندا', tr: 'Panda', nl: 'Panda', da: 'Panda', la: 'Ailuropoda', zh: '熊猫' },
  { name: 'Turtle', emoji: '🐢', pl: 'Żółw', es: 'Tortuga', de: 'Schildkröte', fr: 'Tortue', it: 'Tartaruga', pt: 'Tartaruga', ja: 'カメ', ar: 'سلحفاة', tr: 'Kaplumbağa', nl: 'Schildpad', da: 'Skildpadde', la: 'Testudo', zh: '乌龟' },
  { name: 'Butterfly', emoji: '🦋', pl: 'Motyl', es: 'Mariposa', de: 'Schmetterling', fr: 'Papillon', it: 'Farfalla', pt: 'Borboleta', ja: '蝶', ar: 'فراشة', tr: 'Kelebek', nl: 'Vlinder', da: 'Sommerfugl', la: 'Papilio', zh: '蝴蝶' },
  { name: 'Frog', emoji: '🐸', pl: 'Żaba', es: 'Rana', de: 'Frosch', fr: 'Grenouille', it: 'Rana', pt: 'Sapo', ja: 'カエル', ar: 'ضفدع', tr: 'Kurbağa', nl: 'Kikker', da: 'Frø', la: 'Rana', zh: '青蛙' },
];

const THEMES = [
  { en: 'Starry Night Adventure', verb: 'explores the stars' },
  { en: 'Rainy Day Fun', verb: 'plays in the rain' },
  { en: 'Garden Discovery', verb: 'discovers a magical garden' },
  { en: 'Ocean Splash', verb: 'visits the seaside' },
  { en: 'Mountain Climb', verb: 'climbs a tall mountain' },
  { en: 'Forest Treasure', verb: 'finds hidden treasure' },
  { en: 'Rainbow Chase', verb: 'chases a rainbow' },
  { en: 'Cozy Blanket', verb: 'snuggles under a blanket' },
  { en: 'Birthday Surprise', verb: 'plans a birthday surprise' },
  { en: 'First Snow', verb: 'sees snow for the first time' },
  { en: 'Moonlight Dance', verb: 'dances in the moonlight' },
  { en: 'Autumn Leaves', verb: 'plays in autumn leaves' },
  { en: 'Sunny Picnic', verb: 'goes on a sunny picnic' },
  { en: 'Treehouse Secret', verb: 'builds a secret treehouse' },
  { en: 'Puddle Jumping', verb: 'jumps in puddles' },
  { en: 'Lighthouse Visit', verb: 'visits an old lighthouse' },
  { en: 'Magic Seeds', verb: 'plants magical seeds' },
  { en: 'Cloud Shapes', verb: 'watches cloud shapes' },
  { en: 'Campfire Stories', verb: 'tells stories by the campfire' },
  { en: 'Snowflake Catching', verb: 'catches snowflakes' },
];

const CATEGORIES = ['bedtime', 'adventure', 'nature', 'friendship', 'learning', 'fantasy'];
const AGE_RANGES = ['2-5', '3-6', '2-4', '3-5', '4-7'];
const TAG_SETS = [
  ['calming', 'bedtime'], ['adventure', 'animals'], ['nature', 'animals'],
  ['friendship', 'animals'], ['learning', 'counting'], ['fantasy', 'imagination-games'],
  ['animals', 'nature', 'friendship'], ['bedtime', 'calming', 'animals'],
  ['adventure', 'friendship'], ['silly', 'rhymes', 'animals'],
];

// Page text templates — each story gets unique page text based on animal + theme
const PAGE_TEXTS = [
  (a, v) => `${a} wakes up early.\nToday is a special day!`,
  (a, v) => `${a} puts on a warm coat.\nTime to go outside!`,
  (a, v) => `The path winds through the woods.\n${a} ${v}.`,
  (a, v) => `"How exciting!" says ${a}.\nEverything looks so different!`,
  (a, v) => `${a} meets a friend along the way.\nThey decide to explore together.`,
  (a, v) => `They find something wonderful.\n${a} can hardly believe it!`,
  (a, v) => `Together they share a laugh.\nFriendship makes everything better.`,
  (a, v) => `The sun begins to set.\n${a} feels happy and warm inside.`,
  (a, v) => `It's time to go home now.\n${a} waves goodbye to the day.`,
  (a, v) => `Tucked in bed, ${a} smiles.\nWhat a wonderful adventure!\nThe End.`,
];

function generateStory(index) {
  const animal = ANIMALS[index % ANIMALS.length];
  const theme = THEMES[index % THEMES.length];
  const category = CATEGORIES[index % CATEGORIES.length];
  const ageRange = AGE_RANGES[index % AGE_RANGES.length];
  const tags = TAG_SETS[index % TAG_SETS.length];
  
  const storyId = `story-${String(index).padStart(3, '0')}-${animal.name.toLowerCase()}-${theme.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const title = `${animal.name}'s ${theme.en}`;
  const categoryTag = { bedtime: '🌙 Bedtime', adventure: '🎄 Adventure', nature: '🐢 Nature', friendship: '💛 Friendship', learning: '📚 Learning', fantasy: '✨ Fantasy' };

  // Build story-data.json
  const storyData = {
    id: storyId,
    title: title,
    localizedTitle: {
      en: title,
      pl: `${animal.pl} - Przygoda`, es: `${animal.es} - Aventura`, de: `${animal.de} - Abenteuer`,
      fr: `${animal.fr} - Aventure`, it: `${animal.it} - Avventura`, pt: `${animal.pt} - Aventura`,
      ja: `${animal.ja}の冒険`, ar: `مغامرة ${animal.ar}`, tr: `${animal.tr} Macerası`,
      nl: `${animal.nl} Avontuur`, da: `${animal.da} Eventyr`, la: `${animal.la} Aventura`,
      zh: `${animal.zh}的冒险`
    },
    category,
    tag: categoryTag[category] || '📚 Learning',
    emoji: animal.emoji,
    coverImage: `assets/stories/${storyId}/cover/${storyId}-thumbnail.webp`,
    isAvailable: true,
    ageRange,
    duration: 10 + (index % 5),
    description: `A charming story where ${animal.name} ${theme.verb}. Perfect for little ones!`,
    localizedDescription: {
      en: `A charming story where ${animal.name} ${theme.verb}. Perfect for little ones!`,
      pl: `Urocza historia, w której ${animal.pl} przeżywa przygodę.`,
      es: `Una historia encantadora donde ${animal.es} vive una aventura.`,
      de: `Eine bezaubernde Geschichte, in der ${animal.de} ein Abenteuer erlebt.`,
      fr: `Une histoire charmante où ${animal.fr} vit une aventure.`,
      it: `Una storia incantevole in cui ${animal.it} vive un'avventura.`,
      pt: `Uma história encantadora onde ${animal.pt} vive uma aventura.`,
      ja: `${animal.ja}が冒険を体験する魅力的な物語。`,
      ar: `قصة ساحرة حيث ${animal.ar} يعيش مغامرة.`,
      tr: `${animal.tr}'ın macera yaşadığı büyüleyici bir hikaye.`,
      nl: `Een charmant verhaal waar ${animal.nl} een avontuur beleeft.`,
      da: `En charmerende historie, hvor ${animal.da} oplever et eventyr.`,
      la: `Fabula delectabilis ubi ${animal.la} aventuram experitur.`,
      zh: `${animal.zh}经历冒险的迷人故事。`
    },
    isPremium: true,
    author: 'Freya Stories',
    tags,
    _disclaimer: 'Mock story for catalog testing',
    _usageType: 'test',
    pages: [],
    version: 1,
  };

  // Generate cover page
  storyData.pages.push({
    id: `${storyId}-cover`, pageNumber: 0, type: 'cover',
    backgroundImage: `assets/stories/${storyId}/cover/${storyId}-cover.webp`,
    text: title,
    localizedText: { en: title, pl: storyData.localizedTitle.pl, es: storyData.localizedTitle.es, de: storyData.localizedTitle.de, fr: storyData.localizedTitle.fr, it: storyData.localizedTitle.it, pt: storyData.localizedTitle.pt, ja: storyData.localizedTitle.ja, ar: storyData.localizedTitle.ar, tr: storyData.localizedTitle.tr, nl: storyData.localizedTitle.nl, da: storyData.localizedTitle.da, la: storyData.localizedTitle.la, zh: storyData.localizedTitle.zh }
  });

  // Generate 9 story pages
  for (let p = 1; p <= 9; p++) {
    const pageText = PAGE_TEXTS[(p - 1) % PAGE_TEXTS.length](animal.name, theme.verb);
    const page = {
      id: `${storyId}-page-${p}`, pageNumber: p, type: 'story',
      backgroundImage: `assets/stories/${storyId}/page-${p}/${storyId}-page-${p}.webp`,
      text: pageText,
      localizedText: { en: pageText, pl: `[PL] ${pageText}`, es: `[ES] ${pageText}`, de: `[DE] ${pageText}`, fr: `[FR] ${pageText}`, it: `[IT] ${pageText}`, pt: `[PT] ${pageText}`, ja: `[JA] ${pageText}`, ar: `[AR] ${pageText}`, tr: `[TR] ${pageText}`, nl: `[NL] ${pageText}`, da: `[DA] ${pageText}`, la: `[LA] ${pageText}`, zh: `[ZH] ${pageText}` }
    };
    storyData.pages.push(page);
  }

  // Add final page (page 10)
  const finalText = PAGE_TEXTS[9](animal.name, theme.verb);
  storyData.pages.push({
    id: `${storyId}-page-10`, pageNumber: 10, type: 'story',
    backgroundImage: `assets/stories/${storyId}/page-10/${storyId}-page-10.webp`,
    text: finalText,
    localizedText: { en: finalText, pl: `[PL] ${finalText}`, es: `[ES] ${finalText}`, de: `[DE] ${finalText}`, fr: `[FR] ${finalText}`, it: `[IT] ${finalText}`, pt: `[PT] ${finalText}`, ja: `[JA] ${finalText}`, ar: `[AR] ${finalText}`, tr: `[TR] ${finalText}`, nl: `[NL] ${finalText}`, da: `[DA] ${finalText}`, la: `[LA] ${finalText}`, zh: `[ZH] ${finalText}` }
  });

  return { storyId, storyData };
}

// --- File copying: copy template images with renamed filenames ---

// Map of template files relative to template dir (source → what they are)
const TEMPLATE_ASSETS = {
  'cover/cms-test-1-snowman-squirrel-cover.webp': 'cover',
  'cover/cms-test-1-snowman-squirrel-thumbnail.webp': 'thumbnail',
  'page-1/cms-test-1-snowman-squirrel-page-1.webp': 'page-1',
  'page-2/cms-test-1-snowman-squirrel-page-2.webp': 'page-2',
  'page-3/cms-test-1-snowman-squirrel-page-3.webp': 'page-3',
  'page-4/cms-test-1-snowman-squirrel-page-4.webp': 'page-4',
  'page-5/cms-test-1-snowman-squirrel-page-5.webp': 'page-5',
  'page-6/cms-test-1-snowman-squirrel-page-6.webp': 'page-6',
  'page-7/cms-test-1-snowman-squirrel-page-7.webp': 'page-7',
  'page-8/cms-test-1-snowman-squirrel-page-8.webp': 'page-8',
  'page-9/cms-test-1-snowman-squirrel-page-9.webp': 'page-9',
  'page-10/cms-test-1-snowman-squirrel-page-10.webp': 'page-10',
};

function copyAssetsForStory(storyId) {
  const storyDir = path.join(CMS_DIR, storyId);

  for (const [templateRelPath, assetType] of Object.entries(TEMPLATE_ASSETS)) {
    const srcFile = path.join(TEMPLATE_DIR, templateRelPath);
    if (!fs.existsSync(srcFile)) {
      console.warn(`  ⚠️  Template file missing: ${templateRelPath}`);
      continue;
    }

    let destRelPath;
    if (assetType === 'cover') {
      destRelPath = `cover/${storyId}-cover.webp`;
    } else if (assetType === 'thumbnail') {
      destRelPath = `cover/${storyId}-thumbnail.webp`;
    } else {
      // page-N
      destRelPath = `${assetType}/${storyId}-${assetType}.webp`;
    }

    const destFile = path.join(storyDir, destRelPath);
    const destDir = path.dirname(destFile);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(srcFile, destFile);
  }
}

// --- Main ---

function main() {
  console.log(`\n📚 Generating ${TOTAL_STORIES} mock stories...\n`);

  // Verify template exists
  if (!fs.existsSync(TEMPLATE_JSON)) {
    console.error('❌ Template story not found:', TEMPLATE_JSON);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < TOTAL_STORIES; i++) {
    const index = START_INDEX + i;
    const { storyId, storyData } = generateStory(index);
    const storyDir = path.join(CMS_DIR, storyId);

    // Skip if already exists
    if (fs.existsSync(storyDir)) {
      skipped++;
      continue;
    }

    // Create directory
    fs.mkdirSync(storyDir, { recursive: true });

    // Write story-data.json
    const jsonPath = path.join(storyDir, 'story-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(storyData, null, 2));

    // Copy image assets
    copyAssetsForStory(storyId);

    created++;
    if (created % 10 === 0) {
      console.log(`  ✅ Created ${created} stories...`);
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped (already exist): ${skipped}`);
  console.log(`📁 Total stories in ${CMS_DIR}:`);

  const dirs = fs.readdirSync(CMS_DIR).filter(d => {
    const fullPath = path.join(CMS_DIR, d);
    return fs.statSync(fullPath).isDirectory();
  });
  console.log(`   ${dirs.length} story directories\n`);
}

main();
