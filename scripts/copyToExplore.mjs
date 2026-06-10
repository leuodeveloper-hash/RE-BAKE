import {initializeApp} from 'firebase/app';
import {getFirestore, collectionGroup, getDocs, collection, doc, setDoc, query, where} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBxV2M2GYMqhg6_3RFW3-vrB0PkQn9XQaU",
  authDomain: "bakecycle-b82b5.firebaseapp.com",
  projectId: "bakecycle-b82b5",
  storageBucket: "bakecycle-b82b5.firebasestorage.app",
  messagingSenderId: "420587944388",
  appId: "1:420587944388:web:615a0faa8bdde6ff9fcc91",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('Searching for "스폰지케이크" in user recipes...');

  // collectionGroup으로 모든 유저의 recipes 서브컬렉션 검색
  const recipesGroup = collectionGroup(db, 'recipes');
  const snapshot = await getDocs(recipesGroup);

  const matches = [];
  snapshot.forEach(d => {
    const data = d.data();
    if (data.title && data.title.includes('스폰지')) {
      matches.push({id: d.id, ...data});
    }
  });

  if (matches.length === 0) {
    console.log('No matching recipes found.');
    process.exit(1);
  }

  console.log(`Found ${matches.length} match(es):`);
  matches.forEach((r, i) => console.log(`  [${i}] ${r.title} (id: ${r.id})`));

  // 첫 번째 매칭 레시피를 explore_recipes에 복사
  const recipe = matches[0];
  const {id, ...data} = recipe;
  const exploreId = id; // 같은 ID 사용

  console.log(`\nCopying "${recipe.title}" to explore_recipes/${exploreId}...`);
  await setDoc(doc(db, 'explore_recipes', exploreId), data);
  console.log('Done! Recipe copied to explore_recipes.');

  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
