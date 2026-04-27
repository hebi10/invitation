import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import type { Firestore } from 'firebase/firestore';

type FirestoreModule = typeof import('firebase/firestore');

export type ClientFirestoreModules = {
  addDoc: FirestoreModule['addDoc'];
  collection: FirestoreModule['collection'];
  collectionGroup: FirestoreModule['collectionGroup'];
  deleteDoc: FirestoreModule['deleteDoc'];
  deleteField: FirestoreModule['deleteField'];
  doc: FirestoreModule['doc'];
  getDoc: FirestoreModule['getDoc'];
  getDocs: FirestoreModule['getDocs'];
  query: FirestoreModule['query'];
  serverTimestamp: FirestoreModule['serverTimestamp'];
  setDoc: FirestoreModule['setDoc'];
  updateDoc: FirestoreModule['updateDoc'];
  where: FirestoreModule['where'];
};

export type ClientFirestoreState = {
  db: Firestore;
  modules: ClientFirestoreModules;
};

let firestoreModules: ClientFirestoreModules | null = null;

export async function ensureClientFirestoreState(): Promise<ClientFirestoreState | null> {
  if (!USE_FIREBASE) {
    return null;
  }

  const { db } = await ensureFirebaseInit();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  if (!firestoreModules) {
    const firestore = await import('firebase/firestore');
    firestoreModules = {
      addDoc: firestore.addDoc,
      collection: firestore.collection,
      collectionGroup: firestore.collectionGroup,
      deleteDoc: firestore.deleteDoc,
      deleteField: firestore.deleteField,
      doc: firestore.doc,
      getDoc: firestore.getDoc,
      getDocs: firestore.getDocs,
      query: firestore.query,
      serverTimestamp: firestore.serverTimestamp,
      setDoc: firestore.setDoc,
      updateDoc: firestore.updateDoc,
      where: firestore.where,
    };
  }

  return {
    db,
    modules: firestoreModules,
  };
}

export function toClientRepositoryDate(value: unknown, fallback = new Date()) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = value ? new Date(String(value)) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
