var isWebKit = 'webkitAppearance' in document.documentElement.style;
var deck = bespoke.from('.deck', [
  bespoke.plugins.classes(),
  bespoke.plugins.nav(),
  bespoke.plugins.scale(isWebKit ? 'zoom' : 'transform'),
  //bespoke.plugins.scale('transform'),
  bespoke.plugins.overview()
  //bespoke.plugins.overview({ columns: 2, margin: 10, autostart: true, location: true, counter: true, title: true })
]);

// expose API to other applications
window.deck = deck;
