/*!
 * bespoke-overview v1.0.0
 *
 * Copyright 2015, Dan Allen
 * This content is released under the MIT license
 * 
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self);var n=o;n=n.bespoke||(n.bespoke={}),n=n.plugins||(n.plugins={}),n.overview=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

var insertCss = _dereq_('insert-css');

module.exports = function(opts) {
  var css = ".bespoke-overview.bespoke-parent{pointer-events:auto}\n.bespoke-overview *:not(img){pointer-events:none}\n.bespoke-overview .bespoke-slide{opacity:1;cursor:pointer;pointer-events:auto}\n.bespoke-overview .bespoke-slide[aria-selected]{outline:0.4vw solid #cfd8dc;outline-offset:-0.2vw}\n.bespoke-overview .bespoke-bullet {opacity:1}\n.bespoke-active{z-index:1}\n";
  insertCss(css, { prepend: true });

  return function(deck) {
    var KEYCODE = { o: 79, enter: 13, esc: 27 },
    overviewClassName = 'bespoke-overview',
    focusedSlideIndex = 0,
    overviewActive = false,
    cols = typeof opts !== 'undefined' && typeof opts.cols !== 'undefined' ? parseInt(opts.cols) : 3,
    margin = typeof opts !== 'undefined' && typeof opts.margin !== 'undefined' ? parseFloat(opts.margin) : 10,
    getTransformScaleFactor = function(element) {
      return element.getBoundingClientRect().width / element.offsetWidth;
    },
    getZoomFactor = function(element) {
      if ('zoom' in element.style) {
        var zoom = element.style.zoom;
        if (zoom.length > 0) return parseFloat(zoom);
      }
    },
    hasTransition = function(element) {
      // TODO use CSS prefixes for -webkit and maybe -ms
      return getComputedStyle(element).transitionDuration !== '0s';
    },
    onOverviewClicked = function(e) {
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
      else {
        return true;
      }
    },
    scrollToSlide = function(e) {
      if (e.propertyName === 'transform') {
        deck.slides[focusedSlideIndex].scrollIntoView(true);
        this.removeEventListener('transitionend', scrollToSlide, false);
      }
    },
    activateOverview = function() {
      var parent = deck.parent,
        lastSlide = deck.slides[deck.slides.length - 1],
        focusedSlide = deck.slides[focusedSlideIndex = deck.slide()],
        scaleParent = parent.querySelector('.bespoke-scale-parent'),
        baseScale,
        isZoomed = false;
      if (scaleParent) {
        baseScale = getTransformScaleFactor(scaleParent);
      }
      else if ((baseScale = getZoomFactor(lastSlide))) {
        isZoomed = true;
      }
      else {
        baseScale = 1;
      }

      // NOTE force the scrollbar to become visible using overflow content to work around issue in Chrome
      // FIXME only necessary when transform scale is used in Chrome; though maybe we should always add it?
      if ('zoom' in parent.style) {
        var overflow = document.createElement('div');
        overflow.className = overviewClassName;
        overflow.style.cssText = 'position:absolute; top:100vh; left:0; height:1px; width:100vw; pointer-events:none';
        parent.appendChild(overflow);
      }

      // QUESTION should we add class to html or body element instead?
      parent.classList.add(overviewClassName);
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
        scrollbarScale = isZoomed ? 1 : baseScale,
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
        // TODO use CSS prefixes for -webkit and maybe -ms
        slide.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
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

      deck.slides.forEach(function(slide) {
        slide.addEventListener('click', onOverviewClicked, false);
      });

      // TODO add option for scrollIntoView position (top, bottom, disabled)
      if (focusedSlideIndex >= cols) {
        if (hasTransition(lastSlide)) {
          // QUESTION should use use scrollToSlide.bind(focusedSlide) instead?
          lastSlide.addEventListener('transitionend', scrollToSlide, false);
        }
        else {
          focusedSlide.scrollIntoView(true);
        }
      }
      focusedSlide.setAttribute('aria-selected', true);
      overviewActive = true;
    },
    exitOverview = function(selection) {
      if (typeof selection === 'number' && selection !== focusedSlideIndex) deck.slide(selection);

      // NOTE the order of operations are critical, heavily impact smoothness of transition
      var parent = deck.parent,
        overflow = parent.querySelector('.bespoke-overflow');
      if (overflow) parent.removeChild(overflow);
      // NOTE remove scroll offset while in overview mode; causes slight jerk at start of transition
      parent.style.scrollBehavior = '';
      parent.style.overflowY = '';
      parent.scrollTop = 0;
      deck.slides.forEach(function(slide) {
        slide.style.transform = '';
        slide.style.marginBottom = '';
        slide.removeEventListener('click', onOverviewClicked, false);
      });
      parent.classList.remove(overviewClassName);
      deck.slides[focusedSlideIndex].removeAttribute('aria-selected');
      overviewActive = false;
    },
    toggleOverview = function() {
      return isOverviewActive() ? exitOverview() : activateOverview();
    },
    keydownHandler = function(e) {
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

    document.addEventListener('keydown', keydownHandler, false);
    deck.on('next', navigate.bind(null, 1));
    deck.on('prev', navigate.bind(null, -1));
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