module.exports = (fn, ttl, getKey = null) => {
  const lastFetch = {
    __default__: 0,
  };
  const data = {
    __default__: null,
  }
  const currentlyRunning = {
    __default__: null,
  };

  return async (...args) => {
    const key = getKey ? getKey(...args) : '__default__';

    const inner = async () => {
      if (Date.now() - (lastFetch[key] || 0) > ttl) {
        console.log('fetching:', key);
        data[key] = await fn(...args);
        lastFetch[key] = Date.now();
      }
      return data[key];
    };
    if (!currentlyRunning[key]) {
      currentlyRunning[key] = inner().then((result) => {
        currentlyRunning[key] = null;
        return result;
      });
    }
    return await currentlyRunning[key];
  };
};
