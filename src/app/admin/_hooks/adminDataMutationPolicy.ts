export async function settleAdminRefreshTasks(tasks: Promise<unknown>[]) {
  const results = await Promise.allSettled(tasks);
  return results.every((result) => {
    if (result.status === 'rejected') return false;
    const value = result.value;
    return !(value && typeof value === 'object' && (
      ('isError' in value && value.isError === true) ||
      ('error' in value && value.error != null)
    ));
  });
}

export function lockAdminMutation<Args extends unknown[], Result>(
  lock: { current: boolean },
  action: (...args: Args) => Promise<Result>,
  blockedResult: Result
) {
  return async (...args: Args): Promise<Result> => {
    if (lock.current) return blockedResult;
    lock.current = true;
    try {
      return await action(...args);
    } finally {
      lock.current = false;
    }
  };
}
