// Suppress noisy deprecation warning from Vite CJS Node API used internally
const origWarn = console.warn;
console.warn = function (...args) {
  const msg = args && args[0];
  if (typeof msg === 'string' && msg.includes("CJS build of Vite's Node API is deprecated")) {
    return;
  }
  return origWarn.apply(this, args);
};

