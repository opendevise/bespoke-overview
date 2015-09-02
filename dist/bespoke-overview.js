/*!
 * bespoke-overview v1.0.0
 *
 * Copyright 2015, Dan Allen
 * This content is released under the MIT license
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g=(g.bespoke||(g.bespoke = {}));g=(g.plugins||(g.plugins = {}));g.overview = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(opts) {
  var css = ".bespoke-overview.bespoke-parent{pointer-events:auto}\n.bespoke-overview :not(img){pointer-events:none}\n.bespoke-overview .bespoke-slide{opacity:1;visibility:visible;cursor:pointer;pointer-events:auto}\n.bespoke-overview .bespoke-active{outline:6px solid #cfd8dc;outline-offset:-3px;-moz-outline-radius:3px}\n.bespoke-overview .bespoke-bullet{opacity:1}\n.bespoke-overview-counter{counter-reset:overview}\n.bespoke-overview-counter .bespoke-slide::after{counter-increment:overview;content:counter(overview);position:absolute;right:0.75em;bottom:0.5em;font-size:1.25rem;line-height:1.25}\n.bespoke-title{visibility:hidden;position:absolute;top:0;left:0;width:100%}\n.bespoke-title h1{margin:0;font-size:1.6em;line-height:1.2;text-align:center}\n.bespoke-overview:not(.bespoke-overview-to) .bespoke-title{visibility:visible;pointer-events:auto}\n.bespoke-overview:not(.bespoke-overview-to) .bespoke-title *{pointer-events:auto}\n/* z-index only works when slides are siblings */\n.bespoke-overview-to .bespoke-active,.bespoke-overview-from .bespoke-active{z-index:1}";
  require('insert-css')(css, { prepend: true });
  return function(deck) {
    opts = (typeof opts === 'object' ? opts : {});
    var KEYCODE = { o: 79, enter: 13, up: 38, down: 40 },
      RE = { csv: /, */, none: /^none(?:, *none)*$/, transform: /^translate\((-?[\d.]+)px, *(-?[\d.]+)px\) scale\(([\d.]+)\)$/ },
      TRANSITIONEND = (!('transition' in document.body.style) && ('webkitTransition' in document.body.style) ? 'webkitTransitionEnd' : 'transitionend'),
      VENDOR = ['webkit', 'Moz', 'ms'],
      columns = (typeof opts.columns === 'number' ? parseInt(opts.columns) : 3),
      margin = (typeof opts.margin === 'number' ? parseFloat(opts.margin) : 15),
      overviewActive = false,
      afterTransition,
      loaded = false,
      getStyleProperty = function(element, name) {
        if (!(name in element.style)) {
          var properName = name.charAt(0).toUpperCase() + name.substr(1);
          for (var i = 0, len = VENDOR.length; i < len; i++) {
            if (VENDOR[i] + properName in element.style) return VENDOR[i] + properName;
          }
        }
        return name;
      },
      getTransformScaleFactor = function(element) {
        return element.getBoundingClientRect().width / element.offsetWidth;
      },
      getZoomFactor = function(element) {
        if ('zoom' in element.style) return parseFloat(element.style.zoom) || undefined;
      },
      getTransitionProperties = function(element) {
        var result = [],
          style = getComputedStyle(element),
          transitionProperty = style[getStyleProperty(element, 'transitionProperty')];
        if (!transitionProperty || RE.none.test(transitionProperty)) return result;
        // NOTE beyond this point, assume computed style returns compliant values
        transitionProperty = transitionProperty.split(RE.csv);
        var transitionDuration = style[getStyleProperty(element, 'transitionDuration')].split(RE.csv),
          transitionDelay = style[getStyleProperty(element, 'transitionDelay')].split(RE.csv);
        transitionProperty.forEach(function(property, i) {
          if (transitionDuration[i] !== '0s' || transitionDelay[i] !== '0s') result.push(property);
        });
        return result;
      },
      // NOTE forces browser to apply style changes immediately, hence forcing a reflow
      forceReflow = function(element, property, from, to) {
        if (property) element.style[property] = from;
        element.offsetHeight; // jshint ignore: line
        if (property) element.style[property] = to;
      },
      onSlideClick = function() {
        closeOverview(deck.slides.indexOf(this));
      },
      onNavigate = function(offset, e) {
        if (overviewActive) {
          var targetIndex = e.index + offset;
          // IMPORTANT must navigate using deck.slide to step over bullets
          if (targetIndex > -1 && targetIndex < deck.slides.length) deck.slide(targetIndex, { preview: true });
          return false;
        }
      },
      onActivate = function(e) {
        if (!loaded) {
          loaded = true;
          deck.parent.scrollLeft = deck.parent.scrollTop = 0;
          if (!!opts.autostart) setTimeout(openOverview, 100); // slight timeout to allow transitions to prepare
          return;
        }
        if (overviewActive && e.scrollIntoView !== false) scrollSlideIntoView(e.slide, e.index, getZoomFactor(e.slide));
      },
      scrollSlideIntoView = function(slide, index, zoomFactor) {
        deck.parent.scrollTop = (index < columns ? 0 :
            deck.parent.scrollTop + slide.getBoundingClientRect().top * (zoomFactor || 1));
        //if (index < columns) {
        //  deck.parent.scrollTop = 0;
        //}
        //else {
        //  var slideRect = slide.getBoundingClientRect(), overflow;
        //  if ((overflow = slideRect.top * (zoomFactor || 1)) < 0 ||
        //      (overflow = slideRect.bottom * (zoomFactor || 1) - deck.parent.offsetHeight) > 0) {
        //    deck.parent.scrollTop += overflow;
        //  }
        //}
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
        parent.insertBefore(header, first).offsetHeight; // jshint ignore:line
        return header;
      },
      openOverview = function() {
        var slides = deck.slides,
          parent = deck.parent,
          parentClasses = parent.classList,
          lastSlideIndex = slides.length - 1,
          activeSlideIndex = deck.slide(),
          sampleSlide = (activeSlideIndex > 0 ? slides[0] : slides[lastSlideIndex]),
          transformName = getStyleProperty(sampleSlide, 'transform'),
          scaleParent = parent.querySelector('.bespoke-scale-parent'),
          title,
          baseScale = 1,
          zoomFactor,
          numTransitions = 0,
          initial = !overviewActive;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent);
        }
        else if ((zoomFactor = getZoomFactor(sampleSlide))) {
          baseScale = zoomFactor;
        }
        if (afterTransition) removeAfterTransition('from', parentClasses, slides[0], slides[lastSlideIndex]);
        if (!!opts.title) title = getOrCreateTitle(parent);
        if (initial) {
          deck.slide(activeSlideIndex, { preview: true });
          parentClasses.add('bespoke-overview');
          overviewActive = true;
          if (!!opts.counter) parentClasses.add('bespoke-overview-counter');
          parentClasses.add('bespoke-overview-to');
          numTransitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
              (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0));
          parent.style.overflowY = 'scroll'; // gives us fine-grained control
          parent.style.scrollBehavior = 'smooth'; // not supported by all browsers
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
            title.style[zoomFactor ? 'zoom' : transformName] = (zoomFactor ? totalScale : 'scale(' + totalScale + ')');
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
          if (x.toString().indexOf('e-') !== -1) x = 0; // drop scientific notation for numbers ~0 as it confuses WebKit
          if (y.toString().indexOf('e-') !== -1) y = 0; // drop scientific notation for numbers ~0 as it confuses WebKit
          slide.style[transformName] = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
          // NOTE add margin to last slide to leave gap below last row; doesn't work in Firefox
          // HACK setting marginBottom forces Webkit to reflow content and forces scrollbar to recalculate
          slide.style.marginBottom = ((row * columns + col) === lastSlideIndex ? margin + 'px' : '0%');
          slide.addEventListener('click', onSlideClick, false);
          if (col === (columns - 1)) {
            row += 1;
            col = 0;
          }
          else {
            col += 1;
          }
        });
        if (initial) {
          if (numTransitions > 0) {
            sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
              if (e.target === this && (numTransitions -= 1) === 0) {
                removeAfterTransition('to', parentClasses, this);
                if ('webkitAppearance' in parent.style && parent.scrollHeight > parent.clientHeight) {
                  // NOTE kick scrollbar when it fails to awaken from zombie state
                  forceReflow(parent, 'overflowY', 'auto', 'scroll');
                }
                scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
              }
            }), false);
          }
          else {
            slides.forEach(function(slide) { forceReflow(slide); });
            parentClasses.remove('bespoke-overview-to');
            scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
          }
        }
        else {
          scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
        }
      },
      // NOTE the order of operation in this method is critical; heavily impacts behavior & transition smoothness
      closeOverview = function(selection) {
        // IMPORTANT we intentionally reselect active slide to activate behavior
        deck.slide(typeof selection === 'number' ? selection : deck.slide(), { scrollIntoView: false });
        var slides = deck.slides,
          parent = deck.parent,
          parentClasses = parent.classList,
          lastSlideIndex = slides.length - 1,
          sampleSlide = (deck.slide() > 0 ? slides[0] : slides[lastSlideIndex]),
          transformName = getStyleProperty(sampleSlide, 'transform'),
          transitionName = getStyleProperty(sampleSlide, 'transition'),
          scaleParent = parent.querySelector('.bespoke-scale-parent'),
          baseScale;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent);
        }
        else if (!(baseScale = getZoomFactor(sampleSlide))) {
          baseScale = 1;
        }
        if (afterTransition) removeAfterTransition('to', parentClasses, slides[0], slides[lastSlideIndex]);
        var yShift = parent.scrollTop / baseScale;
        // NOTE xShift compensates for horizontal shift that occurs when the scrollbar is removed in Webkit
        var xShift = 'webkitAppearance' in parent.style ? 0 : undefined;
        parent.style.scrollBehavior = '';
        parent.style.overflowY = '';
        slides.forEach(function(slide) {
          // CAUTION getBoundingClientRect() API sometimes gives false 0 delta, so keep looking for non-zero value
          if (xShift === 0) {
            var left = slide.getBoundingClientRect().left;
            // NOTE clearing marginBottom value assigned in openOverview forces reflow in Webkit
            slide.style.marginBottom = ''; 
            xShift = slide.getBoundingClientRect().left - left;
          }
          else {
            slide.style.marginBottom = '';
          }
          slide.removeEventListener('click', onSlideClick, false);
        });
        if (yShift || xShift) {
          slides.forEach(function(slide) {
            var m = slide.style[transformName].match(RE.transform);
            if (!m) return;
            slide.style[transformName] = 'translate(' + (parseFloat(m[1]) - (xShift || 0)) + 'px, ' + (parseFloat(m[2]) - yShift) + 'px) scale(' + m[3] + ')';
            forceReflow(slide, transitionName, 'none', '');
          });
        }
        parent.scrollTop = 0;
        parentClasses.remove('bespoke-overview');
        overviewActive = false;
        if (!!opts.counter) parentClasses.remove('bespoke-overview-counter');
        parentClasses.add('bespoke-overview-from');
        var numTransitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
            (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0));
        slides.forEach(function(slide) { slide.style[transformName] = ''; });
        if (numTransitions > 0) {
          sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
            if (e.target === this && (numTransitions -= 1) === 0) removeAfterTransition('from', parentClasses, this);
          }), false);
        }
        else {
          slides.forEach(function(slide) { forceReflow(slide); });
          parentClasses.remove('bespoke-overview-from');
        }
      },
      toggleOverview = function() {
        overviewActive ? closeOverview() : openOverview(); // jshint ignore:line
      },
      onResize = function() {
        if (overviewActive) openOverview();
      },
      onKeydown = function(e) {
        if (e.which === KEYCODE.o) {
          if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) toggleOverview();
        }
        else if (overviewActive) {
          switch (e.which) {
            case KEYCODE.enter:
              if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) closeOverview();
              break;
            case KEYCODE.up:
              return onNavigate(-columns, { index: deck.slide() });
            case KEYCODE.down:
              return onNavigate(columns, { index: deck.slide() });
          }
        }
      };
    deck.on('activate', onActivate);
    deck.on('next', onNavigate.bind(null, 1));
    deck.on('prev', onNavigate.bind(null, -1));
    deck.on('destroy', function() {
      removeEventListener('resize', onResize, false);
      document.removeEventListener('keydown', onKeydown, false);
    });
    addEventListener('resize', onResize, false);
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