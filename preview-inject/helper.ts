export const formatRoute = (route: string) => {
  // Use __BASE_PATH__ from env config
  const basePath = __BASE_PATH__;
  if (basePath && route.startsWith(basePath)) {
    return route.replaceAll(basePath, "") || "/";
  }

  return route || "/";
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const debounce = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: T) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
