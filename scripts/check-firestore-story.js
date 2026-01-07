const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkStory() {
  const storyId = process.argv[2] || 'cms-test-1-snowman-squirrel';
  console.log(`Checking story: ${storyId}`);
  
  const doc = await db.collection('stories').doc(storyId).get();
  if (doc.exists) {
    const data = doc.data();
    console.log('\n=== Story Data ===');
    console.log('Story ID:', data.id);
    console.log('Title:', data.title);
    console.log('Cover Image:', data.coverImage);
    console.log('Pages count:', data.pages?.length);
    
    if (data.pages) {
      console.log('\n=== Page Background Images & Interactive Elements ===');
      data.pages.forEach((page, idx) => {
        const interactiveCount = page.interactiveElements?.length || 0;
        console.log(`  Page ${idx} (pageNumber: ${page.pageNumber}): ${page.backgroundImage}`);
        console.log(`    Interactive elements: ${interactiveCount}`);
        if (page.interactiveElements) {
          page.interactiveElements.forEach((el, elIdx) => {
            console.log(`      ${elIdx}: id=${el.id}, type=${el.type}, image=${el.image}`);
            console.log(`         position: x=${el.position?.x}, y=${el.position?.y}`);
            console.log(`         size: width=${el.size?.width}, height=${el.size?.height}`);
          });
        }
      });
    }
  } else {
    console.log('Story not found');
  }
  process.exit(0);
}

checkStory().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

