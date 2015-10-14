/*!
 * Bespoke.js v1.0.0
 *
 * Copyright 2014, Mark Dalgleish
 * This content is released under the MIT license
 * http://mit-license.org/markdalgleish
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.bespoke=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var from = function(selectorOrElement, plugins) {
  var parent = selectorOrElement.nodeType === 1 ? selectorOrElement : document.querySelector(selectorOrElement),
    slides = [].filter.call(parent.children, function(el) { return el.nodeName !== 'SCRIPT'; }),
    activeSlide = slides[0],
    listeners = {},

    activate = function(index, customData) {
      if (!slides[index]) {
        return;
      }

      fire('deactivate', createEventData(activeSlide, customData));
      activeSlide = slides[index];
      fire('activate', createEventData(activeSlide, customData));
    },

    slide = function(index, customData) {
      if (arguments.length) {
        fire('slide', createEventData(slides[index], customData)) && activate(index, customData);
      } else {
        return slides.indexOf(activeSlide);
      }
    },

    step = function(offset, customData) {
      var slideIndex = slides.indexOf(activeSlide) + offset;

      fire(offset > 0 ? 'next' : 'prev', createEventData(activeSlide, customData)) && activate(slideIndex, customData);
    },

    on = function(eventName, callback) {
      (listeners[eventName] || (listeners[eventName] = [])).push(callback);

      return function() {
        listeners[eventName] = listeners[eventName].filter(function(listener) {
          return listener !== callback;
        });
      };
    },

    fire = function(eventName, eventData) {
      return (listeners[eventName] || [])
        .reduce(function(notCancelled, callback) {
          return notCancelled && callback(eventData) !== false;
        }, true);
    },

    createEventData = function(el, eventData) {
      eventData = eventData || {};
      eventData.index = slides.indexOf(el);
      eventData.slide = el;
      return eventData;
    },

    deck = {
      on: on,
      fire: fire,
      slide: slide,
      next: step.bind(null, 1),
      prev: step.bind(null, -1),
      parent: parent,
      slides: slides
    };

  (plugins || []).forEach(function(plugin) {
    plugin(deck);
  });

  activate(0);

  return deck;
};

module.exports = {
  from: from
};

},{}]},{},[1])
(1)
});

/*!
 * bespoke-classes v1.0.0
 *
 * Copyright 2014, Mark Dalgleish
 * This content is released under the MIT license
 * http://mit-license.org/markdalgleish
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self);var o=n;o=o.bespoke||(o.bespoke={}),o=o.plugins||(o.plugins={}),o.classes=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = function() {
  return function(deck) {
    var addClass = function(el, cls) {
        el.classList.add('bespoke-' + cls);
      },

      removeClass = function(el, cls) {
        el.className = el.className
          .replace(new RegExp('bespoke-' + cls +'(\\s|$)', 'g'), ' ')
          .trim();
      },

      deactivate = function(el, index) {
        var activeSlide = deck.slides[deck.slide()],
          offset = index - deck.slide(),
          offsetClass = offset > 0 ? 'after' : 'before';

        ['before(-\\d+)?', 'after(-\\d+)?', 'active', 'inactive'].map(removeClass.bind(null, el));

        if (el !== activeSlide) {
          ['inactive', offsetClass, offsetClass + '-' + Math.abs(offset)].map(addClass.bind(null, el));
        }
      };

    addClass(deck.parent, 'parent');
    deck.slides.map(function(el) { addClass(el, 'slide'); });

    deck.on('activate', function(e) {
      deck.slides.map(deactivate);
      addClass(e.slide, 'active');
      removeClass(e.slide, 'inactive');
    });
  };
};

},{}]},{},[1])
(1)
});
/*!
 * bespoke-nav v1.0.1
 *
 * Copyright 2015, Dan Allen
 * This content is released under the MIT license
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g=(g.bespoke||(g.bespoke = {}));g=(g.plugins||(g.plugins = {}));g.nav = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(opts) {
  opts = opts || {};
  var kbd = require('bespoke-nav-kbd')(opts.kbd);
  var touch = require('bespoke-nav-touch')(opts.touch);
  return function(deck) {
    kbd(deck);
    touch(deck);
  };
};

},{"bespoke-nav-kbd":2,"bespoke-nav-touch":3}],2:[function(require,module,exports){
module.exports = function() {
  return function(deck) {
    var KEY_SB = 32, KEY_PGUP = 33, KEY_PGDN = 34, KEY_END = 35, KEY_HME = 36,
        KEY_LT = 37, KEY_RT = 39, KEY_H = 72, KEY_L = 76,
      isModifierPressed = function(e, keyCode) {
        return e.ctrlKey || (e.shiftKey && keyCode !== KEY_SB) || e.altKey || e.metaKey;
      },
      onKeydown = function(e) {
        if (!isModifierPressed(e, e.which)) {
          switch(e.which) {
            case KEY_SB: return e.shiftKey ? deck.prev() : deck.next();
            case KEY_RT: case KEY_PGDN: case KEY_L: return deck.next();
            case KEY_LT: case KEY_PGUP: case KEY_H: return deck.prev();
            case KEY_HME: return deck.slide(0);
            case KEY_END: return deck.slide(deck.slides.length - 1);
          }
        }
      };
    deck.on('destroy', function() { document.removeEventListener('keydown', onKeydown); });
    document.addEventListener('keydown', onKeydown);
  };
};

},{}],3:[function(require,module,exports){
module.exports = function(opts) {
  return function(deck) {
    opts = opts || {};
    var TOUCHSTART = 'touchstart', TOUCHMOVE = 'touchmove', start = null,
      axis = 'page' + (opts.axis && ['x', 'y'].indexOf(opts.axis) !== -1 ? opts.axis.toUpperCase() : 'X'),
      gap = (typeof opts.threshold === 'number' ? Math.abs(opts.threshold) : Math.ceil(50 / window.devicePixelRatio)),
      onTouchstart = function(e) {
        if (e.touches.length === 1) start = e.touches[0][axis];
      },
      onTouchmove = function(e) {
        if (start === null) return;
        var delta = e.touches[0][axis] - start;
        if (Math.abs(delta) > gap) {
          deck[delta > 0 ? 'prev' : 'next']();
          start = null;
        }
      };
    deck.on('destroy', function() {
      deck.parent.removeEventListener(TOUCHSTART, onTouchstart);
      deck.parent.removeEventListener(TOUCHMOVE, onTouchmove);
    });
    deck.parent.addEventListener(TOUCHSTART, onTouchstart);
    deck.parent.addEventListener(TOUCHMOVE, onTouchmove);
  };
};

},{}]},{},[1])(1)
});
/*!
 * bespoke-scale v1.0.1
 *
 * Copyright 2014, Mark Dalgleish
 * This content is released under the MIT license
 * http://mit-license.org/markdalgleish
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self);var o=n;o=o.bespoke||(o.bespoke={}),o=o.plugins||(o.plugins={}),o.scale=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = function(options) {
  return function(deck) {
    var parent = deck.parent,
      firstSlide = deck.slides[0],
      slideHeight = firstSlide.offsetHeight,
      slideWidth = firstSlide.offsetWidth,
      useZoom = options === 'zoom' || ('zoom' in parent.style && options !== 'transform'),

      wrap = function(element) {
        var wrapper = document.createElement('div');
        wrapper.className = 'bespoke-scale-parent';
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);
        return wrapper;
      },

      elements = useZoom ? deck.slides : deck.slides.map(wrap),

      transformProperty = (function(property) {
        var prefixes = 'Moz Webkit O ms'.split(' ');
        return prefixes.reduce(function(currentProperty, prefix) {
            return prefix + property in parent.style ? prefix + property : currentProperty;
          }, property.toLowerCase());
      }('Transform')),

      scale = useZoom ?
        function(ratio, element) {
          element.style.zoom = ratio;
        } :
        function(ratio, element) {
          element.style[transformProperty] = 'scale(' + ratio + ')';
        },

      scaleAll = function() {
        var xScale = parent.offsetWidth / slideWidth,
          yScale = parent.offsetHeight / slideHeight;

        elements.forEach(scale.bind(null, Math.min(xScale, yScale)));
      };

    window.addEventListener('resize', scaleAll);
    scaleAll();
  };

};

},{}]},{},[1])
(1)
});
/*!
 * bespoke-overview v1.0.4
 *
 * Copyright 2015, Dan Allen
 * This content is released under the MIT license
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g=(g.bespoke||(g.bespoke = {}));g=(g.plugins||(g.plugins = {}));g.overview = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(opts) {
  require('insert-css')('.bespoke-parent.bespoke-overview{pointer-events:auto}' +
    '.bespoke-overview :not(img){pointer-events:none}' +
    '.bespoke-overview .bespoke-slide{opacity:1;visibility:visible;cursor:pointer;pointer-events:auto}' +
    '.bespoke-overview .bespoke-active{outline:6px solid #cfd8dc;outline-offset:-3px;-moz-outline-radius:3px}' +
    '.bespoke-overview .bespoke-bullet{opacity:1;visibility:visible}' +
    '.bespoke-overview-counter{counter-reset:overview}' +
    '.bespoke-overview-counter .bespoke-slide::after{counter-increment:overview;content:counter(overview);position:absolute;right:.75em;bottom:.5em;font-size:1.25rem;line-height:1.25}' +
    '.bespoke-title{visibility:hidden;position:absolute;top:0;left:0;width:100%;pointer-events:auto}' +
    '.bespoke-title h1{margin:0;font-size:1.6em;line-height:1.2;text-align:center}' +
    '.bespoke-overview:not(.bespoke-overview-to) .bespoke-title{visibility:visible}' +
    '.bespoke-overview-to .bespoke-active,.bespoke-overview-from .bespoke-active{z-index:1}', { prepend: true });
  return function(deck) {
    opts = typeof opts === 'object' ? opts : {};
    var KEY_O = 79, KEY_ENT = 13, KEY_UP = 38, KEY_DN = 40,
      RE_CSV = /, */, RE_NONE = /^none(?:, ?none)*$/, RE_TRANS = /^translate\((.+?)px, ?(.+?)px\) scale\((.+?)\)$/, RE_MODE = /(^\?|&)overview(?=$|&)/,
      TRANSITIONEND = !('transition' in document.body.style) && ('webkitTransition' in document.body.style) ? 'webkitTransitionEnd' : 'transitionend',
      VENDOR = ['webkit', 'Moz'],
      columns = typeof opts.columns === 'number' ? parseInt(opts.columns) : 3,
      margin = typeof opts.margin === 'number' ? parseFloat(opts.margin) : 15,
      overviewActive = null,
      afterTransition,
      getStyleProperty = function(element, name) {
        if (!(name in element.style)) {
          var properName = name.charAt(0).toUpperCase() + name.substr(1);
          for (var i = 0, len = VENDOR.length; i < len; i++) {
            if (VENDOR[i] + properName in element.style) return VENDOR[i] + properName;
          }
        }
        return name;
      },
      getTransformScaleFactor = function(element, transformProp) {
        return parseFloat(element.style[transformProp].slice(6, -1));
      },
      getZoomFactor = function(element) {
        if ('zoom' in element.style) return parseFloat(element.style.zoom) || undefined;
      },
      getTransitionProperties = function(element) {
        var result = [],
          style = getComputedStyle(element),
          transitionProperty = style[getStyleProperty(element, 'transitionProperty')];
        if (!transitionProperty || RE_NONE.test(transitionProperty)) return result;
        // NOTE beyond this point, assume computed style returns compliant values
        transitionProperty = transitionProperty.split(RE_CSV);
        var transitionDuration = style[getStyleProperty(element, 'transitionDuration')].split(RE_CSV),
          transitionDelay = style[getStyleProperty(element, 'transitionDelay')].split(RE_CSV);
        transitionProperty.forEach(function(property, i) {
          if (transitionDuration[i] !== '0s' || transitionDelay[i] !== '0s') result.push(property);
        });
        return result;
      },
      flushStyle = function(element, property, from, to) {
        if (property) element.style[property] = from;
        element.offsetHeight; // jshint ignore: line
        if (property) element.style[property] = to;
      },
      onReady = function() {
        deck.on('activate', onReady)(); // unregisters listener
        deck.parent.scrollLeft = deck.parent.scrollTop = 0;
        if (!!opts.autostart || RE_MODE.test(location.search)) setTimeout(openOverview, 100); // timeout allows transitions to prepare
      },
      onSlideClick = function() {
        closeOverview(deck.slides.indexOf(this));
      },
      onNavigate = function(offset, e) {
        var targetIndex = e.index + offset;
        // IMPORTANT must use deck.slide to navigate and return false in order to circumvent bespoke-bullets behavior
        if (targetIndex >= 0 && targetIndex < deck.slides.length) deck.slide(targetIndex, { preview: true });
        return false;
      },
      onActivate = function(e) {
        if (e.scrollIntoView !== false) scrollSlideIntoView(e.slide, e.index, getZoomFactor(e.slide));
      },
      updateLocation = function(state) {
        var s = location.search.replace(RE_MODE, '').replace(/^[^?]/, '?$&');
        if (state) {
          history.replaceState(null, null, location.pathname + (s.length > 0 ? s + '&' : '?') + 'overview' + location.hash);
        }
        else {
          history.replaceState(null, null, location.pathname + s + location.hash);
        }
      },
      scrollSlideIntoView = function(slide, index, zoomFactor) {
        deck.parent.scrollTop = index < columns ? 0 : deck.parent.scrollTop + slide.getBoundingClientRect().top * (zoomFactor || 1);
      },
      removeAfterTransition = function(direction, parentClasses, slide, slideAlt) {
        slide.removeEventListener(TRANSITIONEND, afterTransition, false);
        if (slideAlt && slideAlt !== slide) slideAlt.removeEventListener(TRANSITIONEND, afterTransition, false);
        afterTransition = undefined;
        parentClasses.remove('bespoke-overview-' + direction);
      },
      getOrCreateTitle = function(parent) {
        var first = parent.firstElementChild;
        if (first.classList.contains('bespoke-title')) {
          first.style.width = '';
          return first;
        }
        var header = document.createElement('header');
        header.className = 'bespoke-title';
        header.style[getStyleProperty(header, 'transformOrigin')] = '0 0';
        var h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode(parent.getAttribute('data-title') || document.title));
        header.appendChild(h1);
        flushStyle(parent.insertBefore(header, first));
        return header;
      },
      openOverview = function() {
        var slides = deck.slides,
          parent = deck.parent,
          parentClasses = parent.classList,
          lastSlideIndex = slides.length - 1,
          activeSlideIndex = deck.slide(),
          sampleSlide = activeSlideIndex > 0 ? slides[0] : slides[lastSlideIndex],
          transformProp = getStyleProperty(sampleSlide, 'transform'),
          scaleParent = parent.querySelector('.bespoke-scale-parent'),
          baseScale = 1,
          zoomFactor,
          title,
          numTransitions = 0,
          resize = overviewActive,
          isWebKit = 'webkitAppearance' in parent.style;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent, transformProp);
        }
        else if ((zoomFactor = getZoomFactor(sampleSlide))) {
          baseScale = zoomFactor;
        }
        if (afterTransition) removeAfterTransition('from', parentClasses, slides[0], slides[lastSlideIndex]);
        if (!!opts.title) title = getOrCreateTitle(parent);
        if (!resize) {
          deck.slide(activeSlideIndex, { preview: true });
          parentClasses.add('bespoke-overview');
          addEventListener('resize', openOverview, false);
          overviewActive = [deck.on('activate', onActivate), deck.on('prev', onNavigate.bind(null, -1)), deck.on('next', onNavigate.bind(null, 1))];
          if (!!opts.counter) parentClasses.add('bespoke-overview-counter');
          if (!!opts.location) updateLocation(true);
          parentClasses.add('bespoke-overview-to');
          numTransitions = lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
              (getTransitionProperties(sampleSlide).join(' ').indexOf('transform') < 0 ? 0 : 1);
          parent.style.overflowY = 'scroll'; // gives us fine-grained control
          parent.style.scrollBehavior = 'smooth'; // not supported by all browsers
          if (isWebKit) slides.forEach(function(slide) { flushStyle(slide, 'marginBottom', '0%', ''); });
        }
        var deckWidth = parent.clientWidth / baseScale,
          deckHeight = parent.clientHeight / baseScale,
          scrollbarWidth = (scaleParent || parent).offsetWidth - parent.clientWidth,
          scrollbarOffset = scaleParent ? scrollbarWidth / 2 / baseScale : 0,
          slideWidth = sampleSlide.offsetWidth,
          slideHeight = sampleSlide.offsetHeight,
          scale = deckWidth / (columns * slideWidth + (columns + 1) * margin),
          totalScale = baseScale * scale,
          scaledSlideWidth = slideWidth * scale,
          scaledSlideHeight = slideHeight * scale,
          // NOTE x & y offset calculation based on transform origin at center of slide
          slideX = (deckWidth - scaledSlideWidth) / 2,
          slideY = (deckHeight - scaledSlideHeight) / 2,
          scaledMargin = margin * scale,
          scaledTitleHeight = 0,
          row = 0, col = 0;
        if (title) {
          if (opts.scaleTitle !== false) {
            title.style[zoomFactor ? 'zoom' : transformProp] = zoomFactor ? totalScale : 'scale(' + totalScale + ')';
            title.style.width = (parent.clientWidth / totalScale) + 'px';
            scaledTitleHeight = title.offsetHeight * scale;
          }
          else {
            if (scrollbarWidth > 0) title.style.width = parent.clientWidth + 'px';
            scaledTitleHeight = title.offsetHeight / baseScale;
          }
        }
        slides.forEach(function(slide) {
          var x = col * scaledSlideWidth + (col + 1) * scaledMargin - scrollbarOffset - slideX,
            y = row * scaledSlideHeight + (row + 1) * scaledMargin + scaledTitleHeight - slideY;
          // NOTE drop scientific notation for numbers near 0 as it confuses WebKit
          slide.style[transformProp] = 'translate(' + (x.toString().indexOf('e-') < 0 ? x : 0) + 'px, ' +
              (y.toString().indexOf('e-') < 0 ? y : 0) + 'px) scale(' + scale + ')';
          // NOTE add margin to last slide to leave gap below last row; only honored by WebKit
          if (row * columns + col === lastSlideIndex) slide.style.marginBottom = margin + 'px';
          slide.addEventListener('click', onSlideClick, false);
          if (col === (columns - 1)) {
            row += 1;
            col = 0;
          }
          else {
            col += 1;
          }
        });
        if (resize) {
          scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
        }
        else if (numTransitions > 0) {
          sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
            if (e.target === this && (numTransitions -= 1) === 0) {
              removeAfterTransition('to', parentClasses, this);
              if (isWebKit && parent.scrollHeight > parent.clientHeight) {
                flushStyle(parent, 'overflowY', 'auto', 'scroll'); // awakens scrollbar from zombie state
              }
              scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
            }
          }), false);
        }
        else {
          slides.forEach(function(slide) { flushStyle(slide); }); // bypass transition, if any
          parentClasses.remove('bespoke-overview-to');
          scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
        }
      },
      // NOTE the order of operation in this method is critical; heavily impacts behavior & transition smoothness
      closeOverview = function(selection) {
        // IMPORTANT intentionally reselect active slide to reactivate behavior
        deck.slide(typeof selection === 'number' ? selection : deck.slide(), { scrollIntoView: false });
        var slides = deck.slides,
          parent = deck.parent,
          parentClasses = parent.classList,
          lastSlideIndex = slides.length - 1,
          sampleSlide = deck.slide() > 0 ? slides[0] : slides[lastSlideIndex],
          transformProp = getStyleProperty(sampleSlide, 'transform'),
          transitionProp = getStyleProperty(sampleSlide, 'transition'),
          scaleParent = parent.querySelector('.bespoke-scale-parent'),
          baseScale,
          isWebKit = 'webkitAppearance' in parent.style;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent, transformProp);
        }
        else if (!(baseScale = getZoomFactor(sampleSlide))) {
          baseScale = 1;
        }
        if (afterTransition) removeAfterTransition('to', parentClasses, slides[0], slides[lastSlideIndex]);
        var yShift = parent.scrollTop / baseScale,
          // xShift accounts for horizontal shift when scrollbar is removed
          xShift = (parent.offsetWidth - (scaleParent || parent).clientWidth) / 2 / baseScale;
        parent.style.scrollBehavior = parent.style.overflowY = '';
        slides.forEach(function(slide) {
          if (isWebKit) flushStyle(slide, 'marginBottom', '0%', '');
          slide.removeEventListener('click', onSlideClick, false);
        });
        if (yShift || xShift) {
          slides.forEach(function(slide) {
            var m = slide.style[transformProp].match(RE_TRANS);
            slide.style[transformProp] = 'translate(' + (parseFloat(m[1]) - xShift) + 'px, ' + (parseFloat(m[2]) - yShift) + 'px) scale(' + m[3] + ')';
            flushStyle(slide, transitionProp, 'none', ''); // bypass transition, if any
          });
        }
        parent.scrollTop = 0;
        parentClasses.remove('bespoke-overview');
        removeEventListener('resize', openOverview, false);
        (overviewActive || []).forEach(function(unbindEvent) { unbindEvent(); });
        overviewActive = null;
        if (!!opts.counter) parentClasses.remove('bespoke-overview-counter');
        if (!!opts.location) updateLocation(false);
        parentClasses.add('bespoke-overview-from');
        var numTransitions = lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
            (getTransitionProperties(sampleSlide).join(' ').indexOf('transform') < 0 ? 0 : 1);
        slides.forEach(function(slide) { slide.style[transformProp] = ''; });
        if (numTransitions > 0) {
          sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
            if (e.target === this && (numTransitions -= 1) === 0) removeAfterTransition('from', parentClasses, this);
          }), false);
        }
        else {
          slides.forEach(function(slide) { flushStyle(slide); }); // bypass transition, if any
          parentClasses.remove('bespoke-overview-from');
        }
      },
      toggleOverview = function() {
        overviewActive ? closeOverview() : openOverview(); // jshint ignore:line
      },
      onKeydown = function(e) {
        if (e.which === KEY_O) {
          if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) toggleOverview();
        }
        else if (overviewActive) {
          switch (e.which) {
            case KEY_ENT:
              if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) closeOverview();
              break;
            case KEY_UP:
              return onNavigate(-columns, { index: deck.slide() });
            case KEY_DN:
              return onNavigate(columns, { index: deck.slide() });
          }
        }
      };
    deck.on('activate', onReady);
    deck.on('destroy', function() {
      removeEventListener('resize', openOverview, false);
      document.removeEventListener('keydown', onKeydown, false);
    });
    deck.on('overview', toggleOverview);
    document.addEventListener('keydown', onKeydown, false);
  };
};

},{"insert-css":2}],2:[function(require,module,exports){
var inserted = {};

module.exports = function (css, options) {
    if (inserted[css]) return;
    inserted[css] = true;
    
    var elem = document.createElement('style');
    elem.setAttribute('type', 'text/css');

    if ('textContent' in elem) {
      elem.textContent = css;
    } else {
      elem.styleSheet.cssText = css;
    }
    
    var head = document.getElementsByTagName('head')[0];
    if (options && options.prepend) {
        head.insertBefore(elem, head.childNodes[0]);
    } else {
        head.appendChild(elem);
    }
};

},{}]},{},[1])(1)
});
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
