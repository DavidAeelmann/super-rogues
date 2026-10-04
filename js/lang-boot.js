// Loads the dictionary of the chosen language (see js/i18n.js). It runs while the page is being read, before the game scripts, so the dictionary
// is there when the first screen is drawn. English needs nothing. To add a language: add its id here, in js/i18n.js (LANGS) and write js/lang-<id>.js.
(function () {
  var l = 'en';
  try { l = localStorage.getItem('balance.lang') || 'en'; } catch (e) {}
  if (l === 'pt' || l === 'de') document.write('<script src="js/lang-' + l + '.js" defer><\/script>');
})();
