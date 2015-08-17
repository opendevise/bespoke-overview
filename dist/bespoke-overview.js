/*!
 * bespoke-overview v1.0.0
 *
 * Copyright 2015, Dan Allen
 * This content is released under the MIT license
 * 
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self);var n=o;n=n.bespoke||(n.bespoke={}),n=n.plugins||(n.plugins={}),n.overview=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = function(opts) {
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
    activateOverview = function() {
      var parent = deck.parent,
        lastSlide = deck.slides[0],
        focusedSlide = deck.slides[focusedSlideIndex = deck.slide()],
        baseScale,
        isZoomed = false;
      // FIXME search ancestors in case it's not direct parent
      if (lastSlide.parentNode.classList.contains('bespoke-scale-parent')) {
        baseScale = getTransformScaleFactor(lastSlide.parentNode);
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
        slideX = (deckWidth - slideWidth) / 2 + scrollbarWidth * (isZoomed ? 1 : baseScale),
        slideY = (deckHeight - slideHeight) / 2,
        scale = (deckWidth - totalGutter) / cols / slideWidth,
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
          // TODO extract method (using bind to pass argument)
          var scrollToSlide = function() {
            focusedSlide.scrollIntoView(true);
            this.removeEventListener('transitionend', scrollToSlide, false);  
          };
          lastSlide.addEventListener('transitionend', scrollToSlide, false);
        }
        else {
          focusedSlide.scrollIntoView(true);
        }
      }
      focusedSlide.setAttribute('aria-selected', true);
      overviewActive = true;
    },
    exitOverview = function(selectedSlideIndex) {
      var selection = typeof selectedSlideIndex === 'number' ? selectedSlideIndex : focusedSlideIndex;
      if (selection !== deck.slide()) deck.slide(selection);

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

},{}]},{},[1])
(1)
});