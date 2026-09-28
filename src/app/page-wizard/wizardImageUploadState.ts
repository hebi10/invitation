/** Shared by saving and uploads: acquiring synchronously also protects rapid clicks. */
export function createWizardMutationGuard() {
  let owner: symbol | null = null;
  return {
    tryStart(): (() => void) | null {
      if (owner) return null;
      const token = Symbol();
      owner = token;
      return () => { if (owner === token) owner = null; };
    },
  };
}

export type WizardMutationGuard = ReturnType<typeof createWizardMutationGuard>;

/** Commit each success immediately, without discarding it when another file fails. */
export async function uploadImageBatch<T>(
  files: readonly T[],
  upload: (file: T) => Promise<string>,
  apply: (url: string) => void,
) {
  const failed: T[] = [];
  let succeeded = 0;
  for (const file of files) {
    try {
      const url = await upload(file);
      apply(url);
      succeeded += 1;
    } catch {
      failed.push(file);
    }
  }
  return { succeeded, failed };
}
