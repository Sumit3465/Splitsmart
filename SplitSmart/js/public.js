function initPublicPage() {
  const theme = getData(STORAGE_KEYS.THEME, null) || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  document.querySelectorAll('[data-public-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = (document.documentElement.getAttribute('data-theme') || 'light') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      document.body.setAttribute('data-theme', next);
      saveData(STORAGE_KEYS.THEME, next);
    });
  });
}
