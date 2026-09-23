export function createConnectivity(repo, initialMode = 'online') {
  if (!repo.getSetting('connectivity')) {
    repo.setSetting('connectivity', initialMode === 'offline' ? 'offline' : 'online');
  }
  return {
    async isOnline() {
      return repo.getSetting('connectivity') !== 'offline';
    },
    async getMode() {
      return repo.getSetting('connectivity') === 'offline' ? 'offline' : 'online';
    },
    async setMode(mode) {
      const next = mode === 'offline' ? 'offline' : 'online';
      repo.setSetting('connectivity', next);
      return next;
    },
  };
}
