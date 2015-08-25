var deck = bespoke.from('.deck', [
  bespoke.plugins.classes(),
  bespoke.plugins.keys(),
  bespoke.plugins.touch(),
  bespoke.plugins.scale(),
  //bespoke.plugins.scale('transform'),
  bespoke.plugins.overview()
  //bespoke.plugins.overview({ columns: 2, margin: 10, autostart: true, title: true, numbers: true })
]);

// expose API to other applications
window.deck = deck;
