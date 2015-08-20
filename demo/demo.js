var deck = bespoke.from('.presentation', [
  bespoke.plugins.classes(),
  bespoke.plugins.keys(),
  bespoke.plugins.touch(),
  bespoke.plugins.scale(),
  //bespoke.plugins.scale('transform'),
  bespoke.plugins.overview()
  //bespoke.plugins.overview({cols: 2, margin: 10, counter: true, start: true})
]);

// expose API to other applications
window.deck = deck;
