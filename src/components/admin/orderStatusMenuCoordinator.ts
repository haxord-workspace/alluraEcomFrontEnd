// Ensures only one OrderQuickStatusMenu (chevron or status-badge trigger) is open
// at a time across the orders table. Each open menu registers its own closer and
// the previous one is closed automatically.

let activeCloser: (() => void) | null = null;

export const openExclusiveMenu = (closer: () => void) => {
  if (activeCloser && activeCloser !== closer) activeCloser();
  activeCloser = closer;
};

export const closeExclusiveMenu = (closer: () => void) => {
  if (activeCloser === closer) activeCloser = null;
};
