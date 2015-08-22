module.exports = function(opts) {
  var css = require('fs').readFileSync(__dirname + '/bespoke-overview.css', 'utf8');
  require('insert-css')(css, { prepend: true });
  return function(deck) {
    opts = typeof opts === 'object' ? opts : {};
    var KEYCODE = { o: 79, enter: 13, esc: 27 },
    CSV_RE = new RegExp(', *'),
    VENDOR_PREFIX = ['Webkit', 'Moz', 'ms'],
    cols = typeof opts.cols !== 'undefined' ? parseInt(opts.cols) : 3,
    margin = typeof opts.margin !== 'undefined' ? parseFloat(opts.margin) : 10,
    afterTransition = null,
    overviewActive = false,
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
      var parent = deck.parent,
        parentClassList = parent.classList,
        lastSlide = deck.slides[deck.slides.length - 1],
        activeSlideIndex = deck.slide(),
        activeSlide = deck.slides[activeSlideIndex],
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
      // NOTE reselect active slide to emulate selection from overview
      deck.slide(activeSlideIndex, { stopPropagation: true });
      parentClassList.add('bespoke-overview');
      overviewActive = true;
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
        slide.addEventListener('click', onSlideClick, false);
      });
      // NOTE add margin to last slide to leave gap below last row; doesn't work in Firefox
      lastSlide.style.marginBottom = scaledMargin + 'px';
      // TODO add option for scrollIntoView position (top, bottom, disabled)
      if (activeSlideIndex >= cols) {
        if (hasTransformTransition(lastSlide)) {
          // QUESTION should we wait until all transitions are complete before scrolling?
          lastSlide.addEventListener('transitionend', function scrollToSlide(e) {
            if (e.target === this && e.propertyName === 'transform') {
              this.removeEventListener('transitionend', scrollToSlide, false);
              activeSlide.scrollIntoView(true);
            }
          }, false);
        }
        else {
          activeSlide.scrollIntoView(true);
        }
      }
    },
    // NOTE the order of operations in this method are critical; heavily impact smoothness of transition
    exitOverview = function(selection) {
      // NOTE activate selected slide or reselect active slide
      deck.slide(typeof selection === 'number' ? selection : deck.slide(), { stopPropagation: false });
      var parent = deck.parent,
        parentClassList = parent.classList,
        lastSlide = deck.slides[deck.slides.length - 1];
      // NOTE remove scrollbar and offset while in overview mode; causes slight jerk at start of transition
      parent.style.scrollBehavior = '';
      parent.style.overflowY = '';
      parent.scrollTop = 0;
      deck.slides.forEach(function(slide) {
        slide.style[getStyleProperty(slide, 'transform')] = '';
        slide.style.marginBottom = '';
        slide.removeEventListener('click', onSlideClick, false);
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
