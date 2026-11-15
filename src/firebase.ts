import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Always bind to the provisioned applet Firestore database so config updates (like OAuth setup)
// never silently fall back to an empty '(default)' database.
const PROVISIONED_DB_FALLBACK = 'ai-studio-178bc3d9-39ab-4dff-9ba5-5071f98b0ccf';
const rawConfig = firebaseConfig as Record<string, any>;
const databaseId =
  rawConfig.firestoreDatabaseId && rawConfig.firestoreDatabaseId !== '(default)'
    ? rawConfig.firestoreDatabaseId
    : rawConfig.projectId === 'gen-lang-client-0484197142'
    ? PROVISIONED_DB_FALLBACK
    : '(default)';

export const db = initializeFirestore(app, {}, databaseId);

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export default app;
