export function stampForPublish<T extends Record<string, unknown>>(draft: T, updatedAt: string): T {
  return { ...draft, updatedAt };
}

export type FirestoreWrite = {
  update: {
    name: string;
    fields: {
      json: { stringValue: string };
      updatedAt: { stringValue: string };
    };
  };
  updateMask: { fieldPaths: string[] };
};

export function documentName(projectId: string, docId: string): string {
  return `projects/${projectId}/databases/(default)/documents/cms/${docId}`;
}

/** One commit body updates every document together. Firestore applies a commit atomically. */
export function buildFirestoreCommit(
  projectId: string,
  documents: { id: string; json: string; updatedAt: string }[],
): { writes: FirestoreWrite[] } {
  return {
    writes: documents.map((doc) => ({
      update: {
        name: documentName(projectId, doc.id),
        fields: {
          json: { stringValue: doc.json },
          updatedAt: { stringValue: doc.updatedAt },
        },
      },
      updateMask: { fieldPaths: ["json", "updatedAt"] },
    })),
  };
}

export function publishDocumentPair(
  projectId: string,
  publishedId: string,
  draftId: string,
  json: string,
  updatedAt: string,
): { writes: FirestoreWrite[] } {
  return buildFirestoreCommit(projectId, [
    { id: publishedId, json, updatedAt },
    { id: draftId, json, updatedAt },
  ]);
}
