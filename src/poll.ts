export async function poll<T>(
  fn: () => Promise<T>,
  condition: (res: T) => boolean,
  timeout = 2000,
  interval = 5000
) {
  const endTime = Number(new Date()) + timeout;

  const checkCondition = async () => {
    const res = await fn();

    if (condition(res)) {
      return res;
    }
    // If the condition isn't met but the timeout hasn't elapsed, go again
    else if (Number(new Date()) < endTime) {
      setTimeout(() => checkCondition(), interval);
    }
    // Didn't match and too much time, reject!
    else {
      throw new Error("timed out for " + fn + ": " + arguments);
    }
  };

  return checkCondition();
}
