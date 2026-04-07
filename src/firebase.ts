// Mock Firebase SDK to avoid errors when setup is declined
export const db = {
  firestoreDatabaseId: 'mock-db'
} as any;

export const auth = {
  currentUser: {
    uid: 'guest-user-123',
    email: 'guest@orchestrix.ai',
    displayName: 'Guest Researcher',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
    emailVerified: true,
    isAnonymous: true,
    providerData: []
  }
} as any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Mock Firestore Error [${operationType}] at [${path}]:`, error);
}
