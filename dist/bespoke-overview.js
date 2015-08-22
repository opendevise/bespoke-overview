/*!
 * bespoke-overview v1.0.0
 *
 * Copyright 2015, Dan Allen
 * This content is released under the MIT license
 * 
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self);var n=o;n=n.bespoke||(n.bespoke={}),n=n.plugins||(n.plugins={}),n.overview=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = function(opts) {
  var css = ".bespoke-overview.bespoke-parent{pointer-events:auto}\n.bespoke-overview :not(img){pointer-events:none}\n.bespoke-overview .bespoke-slide{opacity:1;visibility:visible;cursor:pointer;pointer-events:auto}\n.bespoke-overview .bespoke-slide[aria-selected]{outline:0.4vw solid #cfd8dc;outline-offset:-0.2vw;-moz-outline-radius:0.2vw}\n.bespoke-overview .bespoke-bullet {opacity:1}\n.bespoke-overview-counter{counter-reset:overview-slide}\n.bespoke-overview-counter .bespoke-slide::after{counter-increment:overview-slide;content:counter(overview-slide);position:absolute;right:0.75em;bottom:0.5em;font-size:1.25rem;line-height:1.25}\n/* z-index setting only works when slides are siblings */\n.bespoke-overview-to .bespoke-active,.bespoke-overview-from .bespoke-active{z-index:1}";
  _dereq_('insert-css')(css, { prepend: true });
  return function(deck) {
    opts = typeof opts === 'object' ? opts : {};
    var KEYCODE = { o: 79, enter: 13, esc: 27 },
    CSV_RE = new RegExp(', *'),
    VENDOR_PREFIX = ['Webkit', 'Moz', 'ms'],
    focusedSlideIndex = 0,
    overviewActive = false,
    cols = typeof opts.cols !== 'undefined' ? parseInt(opts.cols) : 3,
    margin = typeof opts.margin !== 'undefined' ? parseFloat(opts.margin) : 10,
    afterTransition = null,
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
    hasTransformTransition = function(element) {
      var style = getComputedStyle(element);
      var transitionProperty = style[getStyleProperty(element, 'transitionProperty')];
      if (!transitionProperty || transitionProperty === 'none') return false;
      // NOTE beyond this point, we assume we'll get compliant values from style
      var idx = transitionProperty.split(CSV_RE).indexOf('transform');
      if (idx === -1) return false;
      var transformDuration = style[getStyleProperty(element, 'transitionDuration')].split(CSV_RE)[idx];
      if (transformDuration !== '0s') return true;
      var transformDelay = style[getStyleProperty(element, 'transitionDelay')].split(CSV_RE)[idx];
      return transformDelay !== '0s';
    },
    getNumTransitions = function(element) {
      var style = getComputedStyle(element);
      var transitionProperty = style[getStyleProperty(element, 'transitionProperty')];
      if (!transitionProperty || transitionProperty === 'none') return 0;
      // NOTE beyond this point, we assume we'll get compliant values from style
      transitionProperty = transitionProperty.split(CSV_RE);
      var transitionDuration = style[getStyleProperty(element, 'transitionDuration')].split(CSV_RE);
      var transitionDelay = style[getStyleProperty(element, 'transitionDelay')].split(CSV_RE);
      var num = transitionProperty.length; 
      for (var i = 0, len = num; i < len; i++) {
        if (transitionDuration[i] === '0s' && transitionDelay[i] === '0s') num -= 1;
      }
      return num;
    },
    onOverviewClick = function(e) {
      var selection = deck.slides.indexOf(e.currentTarget);
      if (selection !== -1) exitOverview(selection);
    },
    isOverviewActive = function() {
      return overviewActive;
    },
    navigate = function(step) {
      if (isOverviewActive()) {
        // detect boundary
        if ((step === -1 && focusedSlideIndex === 0) ||
            (step === 1 && focusedSlideIndex + 1 === deck.slides.length)) {
          return false;
        }
        var focusedSlide = deck.slides[focusedSlideIndex];
        focusedSlide.removeAttribute('aria-selected');
        focusedSlide = deck.slides[focusedSlideIndex += step];
        deck.slide(focusedSlideIndex);
        focusedSlide.setAttribute('aria-selected', true);
        // TODO use a smarter scrollTo that only scrolls if necessary
        if (focusedSlideIndex < cols) {
          if (deck.parent.scrollTop > 0) {
            if (deck.parent.scrollTo) {
              deck.parent.scrollTo(0, 0);
            }
            else {
              deck.parent.scrollTop = 0;
            }
          }
        }
        else {
          focusedSlide.scrollIntoView(true);
        }
        return false;
      }
    },
    activateOverview = function() {
      var parent = deck.parent,
        parentClassList = parent.classList,
        lastSlide = deck.slides[deck.slides.length - 1],
        focusedSlide = deck.slides[focusedSlideIndex = deck.slide()],
        scaleParent = parent.querySelector('.bespoke-scale-parent'),
        baseScale,
        zoomed = false;
      if (scaleParent) {
        baseScale = getTransformScaleFactor(scaleParent);
      }
      else if ((baseScale = getZoomFactor(lastSlide))) {
        zoomed = true;
      }
      else {
        baseScale = 1;
      }
      if (afterTransition) {
        lastSlide.removeEventListener('transitionend', afterTransition, false);
        parentClassList.remove('bespoke-overview-from');
      }
      // QUESTION should we add class to html or body element instead?
      parentClassList.add('bespoke-overview');
      if (!!opts.counter) parentClassList.add('bespoke-overview-counter');
      parentClassList.add('bespoke-overview-to');
      var transitions = getNumTransitions(lastSlide);
      if (transitions > 0) {
        lastSlide.addEventListener('transitionend', (afterTransition = function(e) {
          if (e.target === this && (transitions -= 1) === 0) {
            this.removeEventListener('transitionend', afterTransition, false);
            afterTransition = null;
            parentClassList.remove('bespoke-overview-to');
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
        slideWidth = lastSlide.offsetWidth,
        slideHeight = lastSlide.offsetHeight,
        scale = (deckWidth - totalGutter) / cols / slideWidth,
        scrollbarScale = zoomed ? 1 : baseScale,
        slideX = (deckWidth - slideWidth) * 0.5 + scrollbarWidth * scrollbarScale,
        slideY = (deckHeight - slideHeight) * 0.5,
        // adjust for transform origin being center of slide
        slideX = slideX + (slideWidth - (slideWidth * scale)) * 0.5,
        slideY = slideY + (slideHeight - (slideHeight * scale)) * 0.5,
        scaledMargin = baseMargin / scale,
        slideBoxWidth = slideWidth + scaledMargin,
        slideBoxHeight = slideHeight + scaledMargin,
        row = 0,
        col = 0;
      deck.slides.forEach(function(slide) {
        // NOTE we force the scrollbar to be visible in overview mode
        var x = (baseMargin + scrollbarWidth - slideX) + (col * slideBoxWidth * scale),
          y = (baseMargin - slideY) + (row * slideBoxHeight * scale);
        // NOTE drop exponential notation in near-zero numbers (since it breaks older WebKit engines)
        if (x.toString().indexOf('e-') !== -1) x = 0;
        if (y.toString().indexOf('e-') !== -1) y = 0;
        slide.style[getStyleProperty(slide, 'transform')] = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
        // HACK for some reason, must kick bottom margin using 0% or else Chrome screws up layout
        slide.style.marginBottom = '0%';
        if (col === (cols - 1)) {
          col = 0;
          row += 1;
        }
        else {
          col += 1;
        }
      });
      // NOTE add margin to last slide to leave gap below last row; doesn't work in Firefox
      lastSlide.style.marginBottom = scaledMargin + 'px';
      deck.slides.forEach(function(slide) { slide.addEventListener('click', onOverviewClick, false); });
      // TODO add option for scrollIntoView position (top, bottom, disabled)
      if (focusedSlideIndex >= cols) {
        if (hasTransformTransition(lastSlide)) {
          // QUESTION should we wait until all transitions are complete before scrolling?
          lastSlide.addEventListener('transitionend', function scrollToSlide(e) {
            if (e.target === this && e.propertyName === 'transform') {
              this.removeEventListener('transitionend', scrollToSlide, false);
              focusedSlide.scrollIntoView(true);
            }
          }, false);
        }
        else {
          focusedSlide.scrollIntoView(true);
        }
      }
      focusedSlide.setAttribute('aria-selected', true);
      overviewActive = true;
    },
    // NOTE the order of operations in this method are critical; heavily impact smoothness of transition
    exitOverview = function(selection) {
      if (typeof selection === 'number' && selection !== focusedSlideIndex) deck.slide(selection);
      var parent = deck.parent,
        parentClassList = parent.classList,
        lastSlide = deck.slides[deck.slides.length - 1];
      // NOTE remove scroll offset while in overview mode; causes slight jerk at start of transition
      parent.style.scrollBehavior = '';
      parent.style.overflowY = '';
      parent.scrollTop = 0;
      deck.slides.forEach(function(slide) {
        slide.style[getStyleProperty(slide, 'transform')] = '';
        slide.style.marginBottom = '';
        slide.removeEventListener('click', onOverviewClick, false);
      });
      if (afterTransition) {
        lastSlide.removeEventListener('transitionend', afterTransition, false);
        parentClassList.remove('bespoke-overview-to');
      }
      parentClassList.add('bespoke-overview-from');
      var transitions = getNumTransitions(lastSlide);
      if (transitions > 0) {
        lastSlide.addEventListener('transitionend', (afterTransition = function(e) {
          if (e.target === this && (transitions -= 1) === 0) {
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
      deck.slides[focusedSlideIndex].removeAttribute('aria-selected');
      overviewActive = false;
    },
    toggleOverview = function() {
      return isOverviewActive() ? exitOverview() : activateOverview();
    },
    onKeydown = function(e) {
      switch(e.which) {
        case KEYCODE.o:
        case KEYCODE.esc:
          if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) toggleOverview();
          break;
        case KEYCODE.enter:
          if (isOverviewActive() && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) exitOverview();
          break;
      }
    };
    window.addEventListener('load', function resetInitialScroll(e) {
      window.removeEventListener('load', resetInitialScroll, false);
      if (deck.parent.scrollTop !== 0) deck.parent.scrollTop = 0;
    }, false);
    document.addEventListener('keydown', onKeydown, false);
    deck.on('next', navigate.bind(null, 1));
    deck.on('prev', navigate.bind(null, -1));
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