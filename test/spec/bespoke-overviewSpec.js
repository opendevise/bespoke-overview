Function.prototype.bind = Function.prototype.bind || require('function-bind');

var simulant = require('simulant'),
  bespoke = require('bespoke'),
  classes = require('bespoke-classes'),
  overview = require('../../lib/bespoke-overview.js');

describe('bespoke-overview', function() {
  var KEYCODE = { o: 79, enter: 13, up: 38, down: 40 },
    deck,
    parent,
    createDeck = function() {
      document.title = 'bespoke-overview tests';
      var style = document.createElement('style');
      style.textContent = '*,::before,::after{-moz-box-sizing:inherit;box-sizing:inherit}\n' +
          'html{-moz-box-sizing:border-box;box-sizing:border-box}\n' +
          'body{margin:0}\n' +
          '.bespoke-parent,.bespoke-scale-parent{position:absolute;top:0;right:0;bottom:0;left:0}\n' +
          '.bespoke-parent{overflow:hidden}\n' +
          '.bespoke-scale-parent,.bespoke-slide{pointer-events:none}\n' +
          '.bespoke-slide{opacity:0;position:absolute;top:50%;left:50%;width:640px;margin-left:-320px;height:360px;margin-top:-180px}\n' +
          '.bespoke-active{opacity:1;pointer-events:auto}';
      document.head.appendChild(style);
      parent = document.createElement('article');
      for (var i = 0; i < 10; i++) {
        var section = document.createElement('section');
        section.appendChild(document.createTextNode('' + (i + 1)));
        parent.appendChild(section);
      }
      document.body.appendChild(parent);
      deck = bespoke.from(parent, [
        classes(),
        overview()
      ]);
    },
    // NOTE insert-css only inserts CSS once, so we shouldn't remove the inserted <style> element
    destroyDeck = function() {
      if (parent != null) {
        parent.parentNode.removeChild(parent);
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

  beforeEach(createDeck);
  afterEach(destroyDeck);

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

    // NOTE doesn't work in PhantomJS; in Firefox we need to account for smooth scrolling
    //it('scrolls to the active slide when overview is opened', function() {
    //  expect(deck.parent.classList).not.toContain('bespoke-overview');
    //  deck.slide(deck.slides.length - 1);
    //  pressKey('o');
    //  expect(deck.parent.classList).toContain('bespoke-overview');
    //  expect(deck.parent.scrollTop).toBeGreaterThan(0);
    //  pressKey('o');
    //  expect(deck.parent.classList).not.toContain('bespoke-overview');
    //});

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
  });

  describe('navigation', function() {
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

    it('does not interfere with navigation if overview is not active', function() {
      expect(deck.parent.classList).not.toContain('bespoke-overview');
      expect(deck.slide()).toBe(0);
      deck.next();
      expect(deck.slide()).toBe(1);
      deck.prev();
      expect(deck.slide()).toBe(0);
    });
  });
});
