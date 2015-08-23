/*!
 * bespoke-overview v1.0.0
 *
 * Copyright 2015, Dan Allen
 * This content is released under the MIT license
 * 
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self);var n=o;n=n.bespoke||(n.bespoke={}),n=n.plugins||(n.plugins={}),n.overview=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = function(opts) {
  var css = ".bespoke-overview.bespoke-parent{pointer-events:auto}\n.bespoke-overview :not(img){pointer-events:none}\n.bespoke-overview .bespoke-slide{opacity:1;visibility:visible;cursor:pointer;pointer-events:auto}\n.bespoke-overview .bespoke-active{outline:0.4vw solid #cfd8dc;outline-offset:-0.2vw;-moz-outline-radius:0.2vw}\n.bespoke-overview .bespoke-bullet{opacity:1}\n.bespoke-overview-counter{counter-reset:overview-slide}\n.bespoke-overview-counter .bespoke-slide::after{counter-increment:overview-slide;content:counter(overview-slide);position:absolute;right:0.75em;bottom:0.5em;font-size:1.25rem;line-height:1.25}\n.bespoke-title{visibility:hidden;position:absolute;top:0;left:0;width:100vw;padding:10px 0 0 0;line-height:1.2;font-weight:bold;text-align:center}\n.bespoke-overview:not(.bespoke-overview-to) .bespoke-title{visibility:visible;pointer-events:auto}\n/* z-index setting only works when slides are siblings */\n.bespoke-overview-to .bespoke-active,.bespoke-overview-from .bespoke-active{z-index:1}";
  _dereq_('insert-css')(css, { prepend: true });
  return function(deck) {
    opts = (typeof opts === 'object' ? opts : {});
    var KEYCODE = { o: 79, enter: 13, esc: 27 },
    CSV_RE = new RegExp(', *'),
    VENDOR_PREFIX = ['Webkit', 'Moz', 'ms'],
    cols = (typeof opts.cols !== 'undefined' ? parseInt(opts.cols) : 3),
    margin = (typeof opts.margin !== 'undefined' ? parseFloat(opts.margin) : 10),
    afterTransition = null,
    overviewActive = false,
    // TODO memoize results
    getStyleProperty = function(element, name) {
      if (name in element.style) return name;
      var properName = name.charAt(0) + name.substr(1);
      for (var i = 0, len = VENDOR_PREFIX.length; i < len; i++) {
        var vendorName = VENDOR_PREFIX[i] + properName;
        if (vendorName in element.style) return vendorName;
      }
      return name;
    },
    getTransformScaleFactor = function(element) {
      return element.getBoundingClientRect().width / element.offsetWidth;
    },
    getZoomFactor = function(element) {
      if ('zoom' in element.style) {
        var zoom = element.style.zoom;
        if (zoom.length > 0) return parseFloat(zoom);
      }
    },
    getTransitionProperties = function(element) {
      var style = getComputedStyle(element);
      var transitionProperty = style[getStyleProperty(element, 'transitionProperty')];
      if (!transitionProperty || transitionProperty === 'none') return [];
      // NOTE beyond this point, assume style returns compliant values
      transitionProperty = transitionProperty.split(CSV_RE);
      var transitionDuration = style[getStyleProperty(element, 'transitionDuration')].split(CSV_RE);
      var transitionDelay = style[getStyleProperty(element, 'transitionDelay')].split(CSV_RE);
      var result = [];
      for (var i = 0, len = transitionProperty.length; i < len; i++) {
        if (transitionDuration[i] !== '0s' || transitionDelay[i] !== '0s') result.push(transitionProperty[i]);
      }
      return result;
    },
    onSlideClick = function(e) {
      exitOverview(deck.slides.indexOf(this));
    },
    onNavigate = function(offset, slideEvent) {
      if (overviewActive) {
        var targetIndex = slideEvent.index + offset;
        // IMPORTANT must navigate using deck.slide to step over bullets
        if (targetIndex > -1 && targetIndex < deck.slides.length) deck.slide(targetIndex);
        return false;
      }
    },
    // NOTE false return value only prevents event from propagating to *subsequent* plugins
    onActivate = function(slideEvent) {
      if ('stopPropagation' in slideEvent) {
        return !slideEvent.stopPropagation;
      }
      else if (overviewActive) {
        scrollSlideIntoView(slideEvent);
        return false;
      }
    },
    // TODO augment logic to only scroll if any part of slide is outside viewport
    scrollSlideIntoView = function(slideEvent) {
      if (typeof slideEvent === 'undefined') {
        slideEvent = { index: deck.slide(), slide: deck.slides[deck.slide()] };
      }
      if (slideEvent.index < cols) {
        deck.parent.scrollTop = 0;
      }
      else {
        slideEvent.slide.scrollIntoView(true);
      }
    },
    activateOverview = function() {
      var slides = deck.slides,
        parent = deck.parent,
        parentClassList = parent.classList,
        lastSlideIndex = slides.length - 1,
        activeSlideIndex = deck.slide(),
        sampleSlide = (activeSlideIndex > 0 ? slides[0] : slides[lastSlideIndex]),
        scaleParent = parent.querySelector('.bespoke-scale-parent'),
        headerHeight = 0,
        baseScale = 1,
        baseZoom;
      if (scaleParent) {
        baseScale = getTransformScaleFactor(scaleParent);
      }
      else if ((baseZoom = getZoomFactor(sampleSlide))) {
        baseScale = baseZoom;
      }
      if (afterTransition) {
        slides[0].removeEventListener('transitionend', afterTransition, false);
        if (lastSlideIndex > 0) slides[lastSlideIndex].removeEventListener('transitionend', afterTransition, false);
        parentClassList.remove('bespoke-overview-from');
      }
      if (!!opts.title) {
        // TODO extract method
        var firstChild = parent.firstElementChild;
        if (!firstChild.classList.contains('bespoke-title')) {
          var deckHeader = document.createElement('header');
          deckHeader.className = 'bespoke-title';
          deckHeader.appendChild(document.createTextNode(parent.getAttribute('data-title') || document.title));
          parent.insertBefore(deckHeader, firstChild);
          firstChild = deckHeader;
          deckHeader = null;
        }
        headerHeight = firstChild.offsetHeight;
        firstChild = null;
      }
      // IMPORTANT we intentionally reselect active slide to deactivate behavior
      deck.slide(activeSlideIndex, { stopPropagation: true });
      parentClassList.add('bespoke-overview');
      overviewActive = true;
      if (!!opts.counter) parentClassList.add('bespoke-overview-counter');
      parentClassList.add('bespoke-overview-to');
      var transitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide) :
          (getTransitionProperties(sampleSlide).indexOf("transform") !== -1 ? ["transform"] : []));
      var numTransitions = transitions.length;
      if (numTransitions > 0) {
        var activeTransitions = numTransitions;
        sampleSlide.addEventListener('transitionend', (afterTransition = function(e) {
          if (e.target === this && (activeTransitions -= 1) === 0) {
            this.removeEventListener('transitionend', afterTransition, false);
            afterTransition = null;
            parentClassList.remove('bespoke-overview-to');
            if (activeSlideIndex >= cols) {
              slides[activeSlideIndex].scrollIntoView(true);
            }
          }
        }), false);
      }
      else {
        parentClassList.remove('bespoke-overview-to');
      }
      // NOTE we need fine-grained control over scrollbar, so override CSS
      parent.style.overflowY = 'scroll';
      // NOTE supported in Chrome by enabling smooth scrolling in chrome://flags
      parent.style.scrollBehavior = 'smooth';
      var baseMargin = margin / baseScale,
        deckWidth = parent.clientWidth / baseScale,
        deckHeight = parent.clientHeight / baseScale,
        scrollbarWidth = ((parent.offsetWidth / baseScale) - deckWidth) / baseScale,
        // FIXME this calculation doesn't take into account margins on parent
        totalGutter = baseMargin * (cols + 1),
        slideWidth = sampleSlide.offsetWidth,
        slideHeight = sampleSlide.offsetHeight,
        scale = (deckWidth - totalGutter) / cols / slideWidth,
        scrollbarScale = (baseZoom ? 1 : baseScale),
        slideX = (deckWidth - slideWidth) * 0.5 + scrollbarWidth * scrollbarScale,
        slideY = (deckHeight - slideHeight) * 0.5,
        // NOTE recalculate based on transform origin as center of slide
        slideX = slideX + (slideWidth - (slideWidth * scale)) * 0.5,
        slideY = slideY + (slideHeight - (slideHeight * scale)) * 0.5,
        scaledMargin = baseMargin / scale,
        scaledHeaderHeight = headerHeight * baseScale * scale;
        slideBoxWidth = slideWidth + scaledMargin,
        slideBoxHeight = slideHeight + scaledMargin,
        row = 0,
        col = 0;
      slides.forEach(function(slide) {
        // NOTE take scrollbar width into account since we force scrollbar to be visible
        var x = (baseMargin + scrollbarWidth - slideX) + (col * slideBoxWidth * scale),
          y = (baseMargin - slideY) + (row * slideBoxHeight * scale) + scaledHeaderHeight;
        // NOTE drop exponential notation in near-zero numbers (since it breaks older WebKit engines)
        if (x.toString().indexOf('e-') !== -1) x = 0;
        if (y.toString().indexOf('e-') !== -1) y = 0;
        slide.style[getStyleProperty(slide, 'transform')] = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
        // NOTE add margin to last slide to leave gap below last row; doesn't work in Firefox
        // HACK must kick bottom margin using 0%, otherwise Chrome screws up layout (for some reason)
        slide.style.marginBottom = ((row * cols + col) === lastSlideIndex ? scaledMargin + 'px' : '0%');
        slide.addEventListener('click', onSlideClick, false);
        if (col === (cols - 1)) {
          col = 0;
          row += 1;
        }
        else {
          col += 1;
        }
      });
      // TODO add option for scrollIntoView position (top, bottom, disabled)
      if (activeSlideIndex >= cols && numTransitions === 0) slides[activeSlideIndex].scrollIntoView(true);
    },
    // NOTE the order of operations in this method are critical; heavily impact smoothness of transition
    exitOverview = function(selection) {
      // IMPORTANT we intentionally reselect active slide to reactivate behavior
      deck.slide(typeof selection === 'number' ? selection : deck.slide(), { stopPropagation: false });
      var slides = deck.slides,
        parent = deck.parent,
        parentClassList = parent.classList,
        lastSlideIndex = slides.length - 1,
        sampleSlide = (deck.slide() > 0 ? slides[0] : slides[lastSlideIndex]);
      if (afterTransition) {
        slides[0].removeEventListener('transitionend', afterTransition, false);
        if (lastSlideIndex > 0) slides[lastSlideIndex].removeEventListener('transitionend', afterTransition, false);
        parentClassList.remove('bespoke-overview-to');
      }
      // NOTE remove scrollbar & scroll offset before transition; causes slight shift but ensures transition is smooth
      parent.style.scrollBehavior = '';
      parent.style.overflowY = '';
      parent.scrollTop = 0;
      slides.forEach(function(slide) {
        slide.style[getStyleProperty(slide, 'transform')] = '';
        slide.style.marginBottom = '';
        slide.removeEventListener('click', onSlideClick, false);
      });
      parentClassList.add('bespoke-overview-from');
      var transitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide) :
          (getTransitionProperties(sampleSlide).indexOf("transform") !== -1 ? ["transform"] : []));
      var numTransitions = transitions.length;
      if (numTransitions > 0) {
        var activeTransitions = numTransitions;
        sampleSlide.addEventListener('transitionend', (afterTransition = function(e) {
          if (e.target === this && (activeTransitions -= 1) === 0) {
            this.removeEventListener('transitionend', afterTransition, false);
            afterTransition = null;
            parentClassList.remove('bespoke-overview-from');
          }
        }), false);
      }
      else {
        parentClassList.remove('bespoke-overview-from');
      }
      if (!!opts.counter) parentClassList.remove('bespoke-overview-counter');
      parentClassList.remove('bespoke-overview');
      overviewActive = false;
    },
    toggleOverview = function() {
      return overviewActive ? exitOverview() : activateOverview();
    },
    onKeydown = function(e) {
      switch(e.which) {
        case KEYCODE.o:
        case KEYCODE.esc:
          if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) toggleOverview();
          break;
        case KEYCODE.enter:
          if (overviewActive && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) exitOverview();
          break;
      }
    };
    window.addEventListener('load', function resetInitialScroll(e) {
      window.removeEventListener('load', resetInitialScroll, false);
      if (deck.parent.scrollTop !== 0) deck.parent.scrollTop = 0;
    }, false);
    document.addEventListener('keydown', onKeydown, false);
    deck.on('activate', onActivate);
    deck.on('next', onNavigate.bind(null, 1));
    deck.on('prev', onNavigate.bind(null, -1));
    if (!!opts.start) activateOverview();
  };
};

},{"insert-css":2}],2:[function(_dereq_,module,exports){
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

},{}]},{},[1])
(1)
});