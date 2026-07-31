import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class TestFirestoreService {
  private firestore = inject(Firestore);

  async createTestDoc() {
    const ref = collection(this.firestore, 'test-connection');
    return addDoc(ref, {
      message: 'Firebase OK',
      createdAt: serverTimestamp(),
    });
  }
}
