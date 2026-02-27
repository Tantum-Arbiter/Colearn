#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Supported languages
const LANGUAGES = ['en', 'pl', 'es', 'de', 'fr', 'it', 'pt', 'ja', 'ar', 'tr', 'nl', 'da', 'la', 'zh'];

// Translation service (using a simple mapping for now)
// In production, you'd use a real translation API
const translations = {
  "Squirrel's snowman has a head.\nNow he needs a nose.": {
    pl: "Bałwan wiewiórki ma głowę.\nTeraz potrzebuje nosa.",
    es: "El muñeco de nieve de la ardilla tiene cabeza.\nAhora necesita una nariz.",
    de: "Der Schneemann des Eichhörnchens hat einen Kopf.\nJetzt braucht er eine Nase.",
    fr: "Le bonhomme de neige de l'écureuil a une tête.\nMaintenant il a besoin d'un nez.",
    it: "L'uomo di neve dello scoiattolo ha una testa.\nOra ha bisogno di un naso.",
    pt: "O boneco de neve do esquilo tem uma cabeça.\nAgora ele precisa de um nariz.",
    ja: "リスの雪だるまは頭を持っています。\n今、彼は鼻が必要です。",
    ar: "رجل الثلج الخاص بالسنجاب له رأس.\nالآن يحتاج إلى أنف.",
    tr: "Sincabın kardan adamının başı var.\nŞimdi bir burna ihtiyacı var.",
    nl: "De sneeuwpop van de eekhoorn heeft een hoofd.\nNu heeft hij een neus nodig.",
    da: "Snemanden fra egernet har et hoved.\nNu har han brug for en næse.",
    la: "Homo niveus sciuri caput habet.\nNunc nasum indiget.",
    zh: "松鼠的雪人有一个头。\n现在他需要一个鼻子。"
  }
};

function addLocalizedTextToPages(storyPath) {
  try {
    const data = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    
    let modified = false;
    
    data.pages.forEach(page => {
      // Skip pages that already have localizedText
      if (page.localizedText) {
        return;
      }
      
      // Create localizedText object with English as base
      const localizedText = { en: page.text };
      
      // Add other languages (use English as fallback for now)
      LANGUAGES.forEach(lang => {
        if (lang !== 'en') {
          localizedText[lang] = page.text; // Fallback to English
        }
      });
      
      page.localizedText = localizedText;
      modified = true;
    });
    
    if (modified) {
      fs.writeFileSync(storyPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ Updated: ${path.basename(path.dirname(storyPath))}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${storyPath}:`, error.message);
  }
}

// Find all story-data.json files
const cmsStoriesDir = path.join(__dirname, 'cms-stories');
const storyDirs = fs.readdirSync(cmsStoriesDir).filter(f => 
  fs.statSync(path.join(cmsStoriesDir, f)).isDirectory()
);

console.log(`Processing ${storyDirs.length} CMS stories...`);

storyDirs.forEach(dir => {
  const storyPath = path.join(cmsStoriesDir, dir, 'story-data.json');
  if (fs.existsSync(storyPath)) {
    addLocalizedTextToPages(storyPath);
  }
});

console.log('Done!');

