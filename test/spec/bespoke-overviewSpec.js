Function.prototype.bind = Function.prototype.bind || require('function-bind');

var simulant = require('simulant'),
  bespoke = require('bespoke'),
  classes = require('bespoke-classes'),
  scale = require('bespoke-scale'),
  overview = require('../../lib/bespoke-overview.js');

describe('bespoke-overview', function() {
  var KEYCODE = { o: 79, enter: 13, up: 38, down: 40 },
    deck,
    init = false,
    createDeck = function(overviewOptions) {
      if (!init) {
        document.title = 'bespoke-overview tests';
        var style = document.createElement('style');
        style.textContent = '*,::before,::after{-moz-box-sizing:inherit;box-sizing:inherit}\n' +
            'html{-moz-box-sizing:border-box;box-sizing:border-box}\n' +
            'body{margin:0}\n' +
            '.bespoke-parent,.bespoke-scale-parent{position:absolute;top:0;right:0;bottom:0;left:0}\n' +
            '.bespoke-parent{overflow:hidden}\n' +
            '.bespoke-scale-parent,.bespoke-slide{pointer-events:none}\n' +
            '.bespoke-slide{opacity:0;background:#eee;position:absolute;top:50%;left:50%;width:640px;margin-left:-320px;height:360px;margin-top:-180px;font-size:2em;line-height:360px;text-align:center;vertical-align:middle}\n' +
            '.bespoke-active{opacity:1;pointer-events:auto}';
        document.head.appendChild(style);
        init = true;
      }
      var deckParent = document.createElement('article');
      deckParent.className = 'deck';
      for (var i = 0; i < 10; i++) {
        var section = document.createElement('section');
        section.appendChild(document.createTextNode('' + (i + 1)));
        deckParent.appendChild(section);
      }
      document.body.appendChild(deckParent);
      deck = bespoke.from('.deck', [
        classes(),
        scale(),
        overview(overviewOptions)
      ]);
    },
    // NOTE insert-css only inserts CSS once, so we shouldn't remove the inserted <style> element
    destroyDeck = function() {
      deck.fire('destroy');
      document.body.removeChild(deck.parent);
      deck = null;
    },
    pressKey = function(value, element, eventData) {
      if (eventData === undefined) eventData = {};
      eventData.which = KEYCODE[value];
      simulant.fire((element || document), 'keydown', eventData);
    },
    clickElement = function(target) {
      simulant.fire((target || document), 'click');
    },
    getSlideBounds = function(deck) {
      return deck.slides.map(function(slide) { return slide.getBoundingClientRect() }); 
    };

  afterEach(destroyDeck);

  describe('with default options', function() {
    beforeEach(createDeck.bind(null, undefined));

    describe('styles', function() {
      beforeEach(function() {
        deck.slide(0);
      });

      it('inserts CSS before the first child element of <head>', function() {
        var style = document.head.querySelector('style');
        expect(style).toBeDefined();
        expect(style.textContent).toContain('.bespoke-overview');
      });
    });

    describe('toggle', function() {
      beforeEach(function() {
        deck.slide(0);
      });

      it('toggles overview when o key is pressed', function() {
        expect(document.querySelector('.bespoke-overview')).toBeNull();
        pressKey('o');
        var overviewNodes = document.querySelectorAll('.bespoke-overview');
        expect(overviewNodes.length).toEqual(1);
        expect(overviewNodes[0]).toEqual(deck.parent);
        expect(deck.parent.classList).toContain('bespoke-overview');
        pressKey('o');
        expect(document.querySelector('.bespoke-overview')).toBeNull();
      });

      // CAUTION depends on viewport size being set in browser configuration
      it('scrolls to the active slide when overview is opened', function(done) {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slide(deck.slides.length - 1);
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        if (deck.parent.style.scrollBehavior === 'smooth') {
          setTimeout(function() {
            expect(deck.parent.scrollTop).toBeGreaterThan(0);
            pressKey('o');
            expect(deck.parent.classList).not.toContain('bespoke-overview');
            expect(deck.parent.scrollTop).toBe(0);
            done();
          }, 250);
        }
        else {
          expect(deck.parent.scrollTop).toBeGreaterThan(0);
          pressKey('o');
          expect(deck.parent.classList).not.toContain('bespoke-overview');
          expect(deck.parent.scrollTop).toBe(0);
        }
      });

      ['o', 'enter'].forEach(function(key) {
        it('closes overview and selects active slide when ' + key + ' key is pressed', function() {
          expect(deck.parent.classList).not.toContain('bespoke-overview');
          pressKey('o');
          expect(deck.parent.classList).toContain('bespoke-overview');
          deck.slide(1);
          pressKey(key);
          expect(deck.parent.classList).not.toContain('bespoke-overview');
          expect(deck.slide()).toBe(1);
        });
      });

      ['o', 'enter'].forEach(function(key) {
        it('does not close overview when ' + key + ' key is pressed when modifier key is down', function() {
          expect(deck.parent.classList).not.toContain('bespoke-overview');
          pressKey('o');
          expect(deck.parent.classList).toContain('bespoke-overview');
          pressKey(key, document, { shiftKey: true });
          expect(deck.parent.classList).toContain('bespoke-overview');
          pressKey('o');
          expect(deck.parent.classList).not.toContain('bespoke-overview');
        });
      });

      it('closes overview when slide is clicked and activates selected slide', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        expect(getComputedStyle(deck.slides[1]).cursor).toBe('pointer');
        clickElement(deck.slides[1]);
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(1);
      });
    });

    describe('layout and appearance', function() {
      beforeEach(function() {
        deck.slide(0);
      });

      it('makes all slides visible in overview mode', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slides.forEach(function(slide) {
          if (!slide.classList.contains('bespoke-active')) {
            expect(getComputedStyle(slide).opacity).toBe('0');
          }
        });
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        deck.slides.forEach(function(slide) {
          var computedStyle = getComputedStyle(slide);
          expect(computedStyle.opacity).toBe('1');
          expect(computedStyle.visibility).toBe('visible');
        });
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
      });

      it('arranges slides on a grid', function() {
        var slideBounds;
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        slideBounds = getSlideBounds(deck);
        for (var i = 1; i <= 5; i++) {
          expect(slideBounds[i].top).toBe(slideBounds[0].top);
        }
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        slideBounds = getSlideBounds(deck);
        expect(slideBounds[1].top).toBe(slideBounds[0].top);
        expect(slideBounds[2].top).toBe(slideBounds[0].top);
        expect(slideBounds[3].top).not.toBe(slideBounds[0].top);
        expect(slideBounds[4].top).toBe(slideBounds[3].top);
        expect(slideBounds[5].top).toBe(slideBounds[3].top);
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        slideBounds = getSlideBounds(deck);
        for (var i = 1; i <= 5; i++) {
          expect(slideBounds[i].top).toBe(slideBounds[0].top);
        }
      });

      it('adds outline around active slide in overview', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slides.forEach(function(slide) {
          expect(getComputedStyle(slide).outlineStyle).toBe('none');
        });
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        deck.slides.forEach(function(slide) {
          if (slide.classList.contains('bespoke-active')) {
            expect(getComputedStyle(slide).outlineStyle).toBe('solid');
          }
          else {
            expect(getComputedStyle(slide).outlineStyle).toBe('none');
          }
        });
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slides.forEach(function(slide) {
          expect(getComputedStyle(slide).outlineStyle).toBe('none');
        });
      });

      it('enables scrollbar on deck parent when overview is active', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        expect(deck.parent.style.overflowY).toEqual('scroll');
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.parent.style.overflowY).toEqual('');
      });

      ['first', 'last'].forEach(function(position) {
        it('recalculates grid layout on window resize when ' + position + ' slide is selected', function(done) {
          var frame = parent.document.querySelector('iframe'),
            frameWidth = parseFloat(getComputedStyle(frame).width),
            resizeFactor = 2;
          expect(deck.parent.classList).not.toContain('bespoke-overview');
          if (position === 'last') {
            deck.slide(deck.slides.length - 1);
          }
          pressKey('o');
          expect(deck.parent.classList).toContain('bespoke-overview');
          var slideWidth = deck.slides[0].getBoundingClientRect().width;
          frame.style.width = (frameWidth / resizeFactor) + 'px';
          setTimeout(function() {
            expect(deck.parent.classList).toContain('bespoke-overview');
            var resizedSlideWidth = deck.slides[0].getBoundingClientRect().width;
            frame.style.width = '';
            pressKey('o');
            expect(deck.parent.classList).not.toContain('bespoke-overview');
            // NOTE it's not exact, so just check that it changes
            expect(resizedSlideWidth).not.toBe(slideWidth);
            done();
          }, 100);
        });
      });
    });

    describe('navigation', function() {
      beforeEach(function() {
        deck.slide(0);
      });

      it('supports navigation to next slide in overview mode', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        deck.next();
        pressKey('enter');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(1);
      });

      it('supports navigation to previous slide in overview mode', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slide(1);
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        deck.prev();
        pressKey('enter');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(0);
      });

      it('ignores navigation from last slide to next slide in overview mode', function() {
        var lastSlideIndex = deck.slides.length - 1;
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slide(lastSlideIndex);
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        deck.next();
        pressKey('enter');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(lastSlideIndex);
      });

      it('ignores navigation from first slide to previous slide in overview mode', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        deck.prev();
        pressKey('enter');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(0);
      });

      it('supports navigation to arbitrary slide in overview mode', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slide(1);
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        deck.slide(2);
        pressKey('enter');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(2);
      });

      it('supports navigation to next row in overview mode', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        pressKey('down');
        expect(deck.slide()).toBe(3);
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(3);
      });

      it('supports navigation to previous row in overview mode', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        deck.slide(3);
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        pressKey('up');
        expect(deck.slide()).toBe(0);
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(0);
      });

      it('observers do not interfere with navigation if overview is not active', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(0);
        deck.next();
        expect(deck.slide()).toBe(1);
        deck.prev();
        expect(deck.slide()).toBe(0);
        pressKey('enter');
        pressKey('down');
        pressKey('up');
        expect(deck.slide()).toBe(0);
      });
    });
  });

  describe('with custom options', function() {
    describe('columns option', function() {
      beforeEach(createDeck.bind(null, { columns: 4 }));

      it('uses the number of columns specified by the columns option', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        slideBounds = getSlideBounds(deck);
        for (var i = 1; i <= 7; i++) {
          expect(slideBounds[i].top).toBe(slideBounds[0].top);
        }
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        slideBounds = getSlideBounds(deck);
        expect(slideBounds[1].top).toBe(slideBounds[0].top);
        expect(slideBounds[2].top).toBe(slideBounds[0].top);
        expect(slideBounds[3].top).toBe(slideBounds[0].top);
        expect(slideBounds[4].top).not.toBe(slideBounds[0].top);
        expect(slideBounds[5].top).toBe(slideBounds[4].top);
        expect(slideBounds[6].top).toBe(slideBounds[4].top);
        expect(slideBounds[7].top).toBe(slideBounds[4].top);
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        slideBounds = getSlideBounds(deck);
        for (var i = 1; i <= 7; i++) {
          expect(slideBounds[i].top).toBe(slideBounds[0].top);
        }
      });
    });

    describe('autostart option', function() {
      beforeEach(createDeck.bind(null, { autostart: true }));

      it('starts in overview mode when the autostart option is true', function(done) {
        setTimeout(function() {
          expect(deck.parent.classList).toContain('bespoke-overview');
          pressKey('o');
          expect(deck.parent.classList).not.toContain('bespoke-overview');
          done();
        }, 250);
      });
    });

    describe('numbers option', function() {
      beforeEach(createDeck.bind(null, { numbers: true }));

      it('adds bespoke-overview-counter class to parent when numbers option is enabled', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        expect(deck.parent.classList).toContain('bespoke-overview-counter');
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
      });
    });

    describe('title option', function() {
      beforeEach(createDeck.bind(null, { title: true }));

      it('inserts title above overview if title option is enabled', function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
        var title = deck.parent.firstElementChild;
        expect(title.classList).toContain('bespoke-title');
        var h1 = title.firstElementChild;
        expect(h1.tagName).toBe('H1');
        expect(h1.textContent).toBe(document.title);
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(getComputedStyle(title).visibility).toBe('hidden');
        pressKey('o');
        expect(getComputedStyle(title).visibility).toBe('visible');
        pressKey('o');
      });
    });
  });
});
