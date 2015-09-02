Function.prototype.bind = Function.prototype.bind || require('function-bind');

var simulant = require('simulant'),
  bespoke = require('bespoke'),
  classes = require('bespoke-classes'),
  scale = require('bespoke-scale'),
  overview = require('../../lib/bespoke-overview.js');

describe('bespoke-overview', function() {
  var KEYCODE = { o: 79, enter: 13, up: 38, down: 40 },
    lastSlideIndex = 9,
    deck,
    setup = function() {
      document.title = 'bespoke-overview tests';
      var style = document.createElement('style');
      style.textContent = '*,::before,::after{-moz-box-sizing:inherit;box-sizing:inherit}\n' +
          'html{-moz-box-sizing:border-box;box-sizing:border-box}\n' +
          'body{margin:0}\n' +
          '.bespoke-parent,.bespoke-scale-parent{position:absolute;top:0;right:0;bottom:0;left:0}\n' +
          '.bespoke-parent{overflow:hidden}\n' +
          '.bespoke-scale-parent,.bespoke-slide{pointer-events:none}\n' +
          '.bespoke-slide{opacity:0;background:#eee;position:absolute;top:50%;left:50%;width:320px;margin-left:-160px;height:180px;margin-top:-90px;font-size:2em;line-height:180px;text-align:center;vertical-align:middle}\n' +
          '.bespoke-active{opacity:1;pointer-events:auto}';
      document.head.appendChild(style);
    },
    createDeck = function(overviewOptions) {
      var deckParent = document.createElement('article');
      deckParent.className = 'deck';
      resizeDeck(deckParent, 640, 360, false);
      for (var i = 0; i <= lastSlideIndex; i++) {
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
    resizeDeck = function(deckParent, width, height, fireEvent) {
      deckParent.style.width = width + 'px';
      deckParent.style.height = height + 'px';
      if (fireEvent !== false) {
        // FIXME this way of creating events is deprecated
        var e = document.createEvent('UIEvents');
        e.initUIEvent('resize', true, false, window, 0);
        window.dispatchEvent(e);
      }
    },
    resetDeck = function() {
      closeOverview();
      deck.slide(0);
    },
    // NOTE insert-css only inserts CSS once, so we shouldn't remove the inserted <style> element
    destroyDeck = function() {
      deck.fire('destroy');
      document.body.removeChild(deck.parent);
      deck = null;
    },
    openOverview = function(assertState) {
      if (assertState === true) {
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).toContain('bespoke-overview');
      }
      else if (!deck.parent.classList.contains('bespoke-overview')) {
        pressKey('o');
      }
    },
    closeOverview = function(assertState) {
      if (assertState === true) {
        expect(deck.parent.classList).toContain('bespoke-overview');
        pressKey('o');
        expect(deck.parent.classList).not.toContain('bespoke-overview');
      }
      else if (deck.parent.classList.contains('bespoke-overview')) {
        pressKey('o');
      }
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

  beforeAll(setup);
  afterEach(destroyDeck);

  describe('with default options', function() {
    beforeEach(function() { createDeck(); });

    describe('styles', function() {
      beforeEach(resetDeck);

      it('inserts CSS before the first child element of <head>', function() {
        var style = document.head.querySelector('style');
        expect(style).toBeDefined();
        expect(style.textContent).toContain('.bespoke-overview');
      });
    });

    describe('toggle', function() {
      beforeEach(resetDeck);

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
        deck.slide(lastSlideIndex);
        openOverview(true);
        if (deck.parent.style.scrollBehavior === 'smooth') {
          setTimeout(function() {
            expect(deck.parent.scrollTop).toBeGreaterThan(0);
            closeOverview(true);
            expect(deck.parent.scrollTop).toBe(0);
            done();
          }, 250);
        }
        else {
          expect(deck.parent.scrollTop).toBeGreaterThan(0);
          closeOverview(true);
          expect(deck.parent.scrollTop).toBe(0);
        }
      });

      ['o', 'enter'].forEach(function(key) {
        it('closes overview and selects active slide when ' + key + ' key is pressed', function() {
          openOverview(true);
          deck.next();
          pressKey(key);
          expect(deck.parent.classList).not.toContain('bespoke-overview');
          expect(deck.slide()).toBe(1);
        });
      });

      ['o', 'enter'].forEach(function(key) {
        it('does not close overview when ' + key + ' key is pressed when modifier key is down', function() {
          openOverview(true);
          pressKey(key, document, { shiftKey: true });
          expect(deck.parent.classList).toContain('bespoke-overview');
        });
      });

      it('closes overview when slide is clicked and activates selected slide', function() {
        openOverview(true);
        expect(getComputedStyle(deck.slides[2]).cursor).toBe('pointer');
        clickElement(deck.slides[2]);
        expect(deck.parent.classList).not.toContain('bespoke-overview');
        expect(deck.slide()).toBe(2);
      });
    });

    describe('layout and appearance', function() {
      beforeEach(resetDeck);

      it('makes all slides visible in overview mode', function() {
        deck.slides.forEach(function(slide) {
          var computedStyle = getComputedStyle(slide);
          expect(computedStyle.opacity).toBe(slide.classList.contains('bespoke-active') ? '1' : '0');
        });
        openOverview(true);
        deck.slides.forEach(function(slide) {
          var computedStyle = getComputedStyle(slide);
          expect(computedStyle.opacity).toBe('1');
          expect(computedStyle.visibility).toBe('visible');
        });
      });

      it('arranges slides on a grid', function() {
        var slideBounds = getSlideBounds(deck);
        for (var i = 1; i <= 5; i++) {
          expect(slideBounds[i].top).toBe(slideBounds[0].top);
        }
        openOverview(true);
        slideBounds = getSlideBounds(deck);
        expect(slideBounds[1].top).toBe(slideBounds[0].top);
        expect(slideBounds[2].top).toBe(slideBounds[0].top);
        expect(slideBounds[3].top).not.toBe(slideBounds[0].top);
        expect(slideBounds[4].top).toBe(slideBounds[3].top);
        expect(slideBounds[5].top).toBe(slideBounds[3].top);
        closeOverview(true);
        slideBounds = getSlideBounds(deck);
        for (var i = 1; i <= 5; i++) {
          expect(slideBounds[i].top).toBe(slideBounds[0].top);
        }
      });

      it('enables scrollbar on deck parent when overview is active', function() {
        openOverview(true);
        expect(deck.parent.style.overflowY).toEqual('scroll');
        closeOverview(true);
        expect(deck.parent.style.overflowY).toEqual('');
      });

      it('accounts for scrollbar width when calculating position of slides in overview', function() {
        resizeDeck(deck.parent, 960, 540);
        openOverview(true);
        var leftMostSlideRect = deck.slides[0].getBoundingClientRect(),
          rightMostSlideRect = deck.slides[2].getBoundingClientRect(),
          deckWidth = deck.parent.clientWidth,
          baseZoom = deck.slides[0].style.zoom;
        resizeDeck(deck.parent, 640, 360);
        if ('webkitAppearance' in deck.parent.style) {
          expect(leftMostSlideRect.left).toBeCloseTo(leftMostSlideRect.top, 4); // within 0.00005
          if (!baseZoom || !(baseZoom = parseFloat(baseZoom))) {
            baseZoom = 1;
          }
          expect(deckWidth / baseZoom - rightMostSlideRect.right).toBeCloseTo(leftMostSlideRect.left, 4); // within 0.00005
        }
        else {
          // NOTE values are much less accurate in Firefox (or so it seems)
          expect(leftMostSlideRect.left).toBeCloseTo(leftMostSlideRect.top, 0); // within 0.5
          expect(deckWidth - rightMostSlideRect.right).toBeCloseTo(leftMostSlideRect.left, 0); // within 0.5
        }
      });

      it('adds outline around active slide in overview', function() {
        deck.slides.forEach(function(slide) {
          expect(getComputedStyle(slide).outlineStyle).toBe('none');
        });
        openOverview(true);
        deck.slides.forEach(function(slide) {
          if (slide.classList.contains('bespoke-active')) {
            expect(getComputedStyle(slide).outlineStyle).toBe('solid');
          }
          else {
            expect(getComputedStyle(slide).outlineStyle).toBe('none');
          }
        });
        closeOverview(true);
        deck.slides.forEach(function(slide) {
          expect(getComputedStyle(slide).outlineStyle).toBe('none');
        });
      });

      ['first', 'last'].forEach(function(position) {
        it('recalculates grid layout on window resize when ' + position + ' slide is selected', function() {
          if (position === 'last') {
            deck.slide(lastSlideIndex);
          }
          openOverview(true);
          var firstSlide = deck.slides[0],
            slideWidth = firstSlide.getBoundingClientRect().width;
          resizeDeck(deck.parent, 320, 180);
          expect(deck.parent.classList).toContain('bespoke-overview');
          var resizedSlideWidth = firstSlide.getBoundingClientRect().width;
          // TODO add deck size to resetDeck
          resizeDeck(deck.parent, 640, 360);
          closeOverview(true);
          if ('webkitAppearance' in firstSlide.style) {
            // NOTE calculation depends on scaling method, so for now just verify it changes
            expect(resizedSlideWidth).not.toBe(slideWidth);
          }
          else {
            expect(slideWidth / resizedSlideWidth).toBeCloseTo(2, 1);
          }
        });
      });
    });

    describe('navigation', function() {
      beforeEach(resetDeck);

      it('supports navigation to next slide in overview mode', function() {
        deck.slide(0);
        openOverview(true);
        deck.next();
        expect(deck.slide()).toBe(1);
        closeOverview(true);
        expect(deck.slide()).toBe(1);
      });

      it('supports navigation to previous slide in overview mode', function() {
        deck.slide(1);
        openOverview(true);
        deck.prev();
        expect(deck.slide()).toBe(0);
        closeOverview(true);
        expect(deck.slide()).toBe(0);
      });

      it('ignores navigation from last slide to next slide in overview mode', function() {
        deck.slide(lastSlideIndex);
        openOverview(true);
        deck.next();
        expect(deck.slide()).toBe(lastSlideIndex);
        closeOverview(true);
        expect(deck.slide()).toBe(lastSlideIndex);
      });

      it('ignores navigation from first slide to previous slide in overview mode', function() {
        deck.slide(0);
        openOverview(true);
        deck.prev();
        expect(deck.slide()).toBe(0);
        closeOverview(true);
        expect(deck.slide()).toBe(0);
      });

      it('supports navigation to arbitrary slide in overview mode', function() {
        deck.slide(1);
        openOverview(true);
        deck.slide(2);
        closeOverview(true);
        expect(deck.slide()).toBe(2);
      });

      it('supports navigation to next row in overview mode', function() {
        deck.slide(0);
        openOverview(true);
        pressKey('down');
        expect(deck.slide()).toBe(3);
        closeOverview(true);
        expect(deck.slide()).toBe(3);
      });

      it('supports navigation to previous row in overview mode', function() {
        deck.slide(3);
        openOverview(true);
        pressKey('up');
        expect(deck.slide()).toBe(0);
        closeOverview(true);
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
        slideBounds = getSlideBounds(deck);
        for (var i = 1; i <= 7; i++) {
          expect(slideBounds[i].top).toBe(slideBounds[0].top);
        }
        openOverview(true);
        slideBounds = getSlideBounds(deck);
        expect(slideBounds[1].top).toBe(slideBounds[0].top);
        expect(slideBounds[2].top).toBe(slideBounds[0].top);
        expect(slideBounds[3].top).toBe(slideBounds[0].top);
        expect(slideBounds[4].top).not.toBe(slideBounds[0].top);
        expect(slideBounds[5].top).toBe(slideBounds[4].top);
        expect(slideBounds[6].top).toBe(slideBounds[4].top);
        expect(slideBounds[7].top).toBe(slideBounds[4].top);
        closeOverview(true);
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
          closeOverview(true);
          done();
        }, 250);
      });
    });

    describe('counter option', function() {
      beforeEach(createDeck.bind(null, { counter: true }));

      it('adds bespoke-overview-counter class to parent when counter option is enabled', function() {
        openOverview(true);
        expect(deck.parent.classList).toContain('bespoke-overview-counter');
        closeOverview(true);
        expect(deck.parent.classList).not.toContain('bespoke-overview-counter');
      });
    });

    describe('title option', function() {
      beforeEach(createDeck.bind(null, { title: true }));

      it('inserts title above overview if title option is enabled', function() {
        openOverview(true);
        var title = deck.parent.firstElementChild,
          h1 = title.firstElementChild;
        expect(title.classList).toContain('bespoke-title');
        expect(h1.tagName).toBe('H1');
        expect(h1.textContent).toBe(document.title);
        closeOverview(true);
        expect(getComputedStyle(title).visibility).toBe('hidden');
        openOverview(true);
        expect(getComputedStyle(title).visibility).toBe('visible');
      });
    });
  });

  describe('transitions', function() {
    beforeAll(function() {
      var style = document.createElement('style');
      style.textContent = '.bespoke-slide{-webkit-transition:opacity 0.5s ease;transition:opacity:0.5s ease}\n' +
          '.bespoke-overview .bespoke-slide{-webkit-transition:none;transition:none}\n' +
          '.bespoke-overview-to .bespoke-slide{-webkit-transition:-webkit-transform 0.1s ease-out 0s,opacity 0.1s ease-in-out 0.05s;transition:transform 0.1s ease-out 0s,opacity 0.1s ease-in-out 0.05s}\n' +
          '.bespoke-overview-from .bespoke-slide{-webkit-transition:-webkit-transform 0.1s ease-in-out 0.05s,opacity 0.1s ease-in-out 0s;transition:transform 0.1s ease-in-out 0.05s,opacity 0.1s ease-in-out 0s}\n' +
          '.no-transition .bespoke-slide{-webkit-transition:none!important;transition:none!important}';
      document.head.appendChild(style);
    });

    beforeEach(function() { createDeck(); });

    it('uses transition defined by bespoke-overview-to class when opening overview', function(done) {
      openOverview(true);
      expect(deck.parent.classList).toContain('bespoke-overview-to');
      setTimeout(function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview-to');
        done();
      }, 200);
    });

    it('uses transition defined by bespoke-overview-from class when closing overview', function(done) {
      deck.parent.classList.add('no-transition');
      openOverview(true);
      deck.parent.classList.remove('no-transition');
      expect(deck.parent.classList).not.toContain('bespoke-overview-to');
      closeOverview(true);
      expect(deck.parent.classList).toContain('bespoke-overview-from');
      setTimeout(function() {
        expect(deck.parent.classList).not.toContain('bespoke-overview-from');
        done();
      }, 200);
    });

    it('uses transition defined by bespoke-overview bespoke-slide class when navigating in overview', function() {
      deck.parent.classList.add('no-transition');
      openOverview(true);
      deck.parent.classList.remove('no-transition');
      expect(deck.parent.classList).not.toContain('bespoke-overview-to');
      expect(deck.slide()).toBe(0); 
      deck.next();
      expect(deck.slide()).toBe(1);
    });

    it('removes stale transition when opening overview', function(done) {
      deck.parent.classList.add('no-transition');
      openOverview(true);
      deck.parent.classList.remove('no-transition');
      closeOverview(true);
      setTimeout(function() {
        openOverview(true);
        expect(deck.parent.classList).not.toContain('bespoke-overview-from');
        setTimeout(function() {
          expect(deck.parent.classList).not.toContain('bespoke-overview-to');
          done();
        }, 200);
      }, 50);
    });

    it('removes stale transition when closing overview', function(done) {
      openOverview(true);
      setTimeout(function() {
        closeOverview(true);
        expect(deck.parent.classList).not.toContain('bespoke-overview-to');
        setTimeout(function() {
          expect(deck.parent.classList).not.toContain('bespoke-overview-from');
          done();
        }, 200);
      }, 50);
    });
  });
});
