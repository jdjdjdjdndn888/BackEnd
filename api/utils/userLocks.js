const activeLocks = new Map();

function acquireLock(userId, action) {
  const key = `${userId}:${action}`;
  if (activeLocks.get(key)) return false;
  activeLocks.set(key, true);
  return true;
}

function releaseLock(userId, action) {
  const key = `${userId}:${action}`;
  activeLocks.delete(key);
}

module.exports = { acquireLock, releaseLock };
