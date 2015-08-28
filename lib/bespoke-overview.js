module.exports = function(opts) {
  var css = require('fs').readFileSync(__dirname + '/bespoke-overview.css', 'utf8');
  require('insert-css')(css, { prepend: true });
  return function(deck) {
    opts = (typeof opts === 'object' ? opts : {});
    var KEYCODE = { o: 79, enter: 13, up: 38, down: 40 },
      CSV_RE = /, */,
      TRANSFORM_RE = /^translate\((-?[\d.]+)px, *(-?[\d.]+)px\) scale\(([\d.]+)\)$/,
      VENDOR_PREFIX = ['webkit', 'Moz', 'ms'],
      columns = (typeof opts.columns === 'number' ? parseInt(opts.columns) : 3),
      margin = (typeof opts.margin === 'number' ? parseFloat(opts.margin) : 10),
      overviewActive = false,
      afterTransition,
      getStyleProperty = function(element, name) {
        if (name in element.style) return name;
        var properName = name.charAt(0).toUpperCase() + name.substr(1);
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
        var result = [],
          style = getComputedStyle(element),
          transitionProperty = style[getStyleProperty(element, 'transitionProperty')];
        if (!transitionProperty || transitionProperty === 'none') return result;
        // NOTE beyond this point, assume style returns compliant values
        transitionProperty = transitionProperty.split(CSV_RE);
        var transitionDuration = style[getStyleProperty(element, 'transitionDuration')].split(CSV_RE),
          transitionDelay = style[getStyleProperty(element, 'transitionDelay')].split(CSV_RE);
        for (var i = 0, len = transitionProperty.length; i < len; i++) {
          if (transitionDuration[i] !== '0s' || transitionDelay[i] !== '0s') result.push(transitionProperty[i]);
        }
        return result;
      },
      // NOTE force browser to apply style changes immediately, hence forcing a reflow
      forceReflow = function(element) {
        element.offsetHeight; // jshint ignore: line
      },
      forceReflowWithModulation = function(element, property, from, to) {
        element.style[property] = from;
        element.offsetHeight; // jshint ignore: line
        element.style[property] = to;
      },
      onSlideClick = function() {
        closeOverview(deck.slides.indexOf(this));
      },
      onNavigate = function(offset, slideEvent) {
        if (overviewActive) {
          var targetIndex = (slideEvent || { index: deck.slide() }).index + offset;
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
      scrollSlideIntoView = function(slideEvent) {
        if (slideEvent === undefined) slideEvent = { index: deck.slide(), slide: deck.slides[deck.slide()] };
        if (slideEvent.index < columns) {
          deck.parent.scrollTop = 0;
        }
        else {
          slideEvent.slide.scrollIntoView(true);
        }
      },
      getOrCreateTitle = function(parent) {
        var first = parent.firstElementChild;
        if (first.classList.contains('bespoke-title')) return { node: first, height: first.offsetHeight };
        var title = document.createElement('header');
        title.className = 'bespoke-title';
        title.appendChild(document.createTextNode(parent.getAttribute('data-title') || document.title));
        return { node: parent.insertBefore(title, first), height: title.offsetHeight };
      },
      openOverview = function() {
        var slides = deck.slides,
          parent = deck.parent,
          parentClassList = parent.classList,
          lastSlideIndex = slides.length - 1,
          activeSlideIndex = deck.slide(),
          sampleSlide = (activeSlideIndex > 0 ? slides[0] : slides[lastSlideIndex]),
          transformName = getStyleProperty(sampleSlide, 'transform'),
          scaleParent = parent.querySelector('.bespoke-scale-parent'),
          title,
          baseScale = 1,
          baseZoom,
          numTransitions = 0,
          initial = !overviewActive;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent);
        }
        else if ((baseZoom = getZoomFactor(sampleSlide))) {
          baseScale = baseZoom;
        }
        if (afterTransition !== undefined) {
          slides[0].removeEventListener('transitionend', afterTransition, false);
          if (lastSlideIndex > 0) slides[lastSlideIndex].removeEventListener('transitionend', afterTransition, false);
          parentClassList.remove('bespoke-overview-from');
        }
        if (!!opts.title) title = getOrCreateTitle(parent);
        if (initial) {
          // IMPORTANT we intentionally reselect active slide to deactivate behavior
          deck.slide(activeSlideIndex, { stopPropagation: true });
          parentClassList.add('bespoke-overview');
          overviewActive = true;
          if (!!opts.numbers) parentClassList.add('bespoke-overview-counter');
          parentClassList.add('bespoke-overview-to');
          numTransitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
              (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0));
          // NOTE we need fine-grained control of scrollbar, so override CSS; must account for width in calculations
          parent.style.overflowY = 'scroll';
          parent.style.scrollBehavior = 'smooth';
        }
        if (title) title.node.style.width = parent.clientWidth + 'px';
        var baseMargin = margin / baseScale,
          deckWidth = parent.clientWidth / baseScale,
          deckHeight = parent.clientHeight / baseScale,
          scrollbarWidth = parent.offsetWidth - parent.clientWidth,
          // FIXME this calculation doesn't take into account margins on parent
          totalGutter = baseMargin * (columns + 1),
          slideWidth = sampleSlide.offsetWidth,
          slideHeight = sampleSlide.offsetHeight,
          slideX = (deckWidth - slideWidth) / 2,
          slideY = (deckHeight - slideHeight) / 2,
          scale = (deckWidth - totalGutter) / columns / slideWidth,
          scaledMargin = baseMargin / scale,
          slideBoxWidth = slideWidth + scaledMargin,
          slideBoxHeight = slideHeight + scaledMargin,
          scaledTitleHeight = (title ? title.height / baseScale : 0),
          scrollbarShift = (baseZoom ? 0 : scrollbarWidth * scale),
          row = 0,
          col = 0;
        // NOTE recalculate x & y offset based on transform origin at center of slide
        slideX += (slideWidth - (slideWidth * scale)) / 2;
        slideY += (slideHeight - (slideHeight * scale)) / 2;
        slides.forEach(function(slide) {
          var x = (baseMargin - slideX - scrollbarShift) + (col * slideBoxWidth * scale),
            y = (baseMargin - slideY) + (row * slideBoxHeight * scale) + scaledTitleHeight;
          // NOTE drop exponential notation in near-zero numbers (since it breaks older WebKit engines)
          if (x.toString().indexOf('e-') !== -1) x = 0;
          if (y.toString().indexOf('e-') !== -1) y = 0;
          slide.style[transformName] = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
          // NOTE add margin to last slide to leave gap below last row; doesn't work in Firefox
          // HACK setting marginBottom forces Webkit to reflow content; also forces scrollbar to recalculate
          slide.style.marginBottom = ((row * columns + col) === lastSlideIndex ? scaledMargin + 'px' : '0%');
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
            var activeTransitions = numTransitions;
            sampleSlide.addEventListener('transitionend', (afterTransition = function(e) {
              if (e.target === this && (activeTransitions -= 1) === 0) {
                this.removeEventListener('transitionend', afterTransition, false);
                afterTransition = undefined;
                parentClassList.remove('bespoke-overview-to');
                if ('webkitAppearance' in parent.style && parent.scrollHeight > parent.offsetHeight) {
                  // NOTE kick scrollbar when it fails to awaken from zombie state
                  forceReflowWithModulation(parent, 'overflowY', 'auto', 'scroll');
                }
                if (activeSlideIndex >= columns) slides[activeSlideIndex].scrollIntoView(true);
              }
            }), false);
          }
          else {
            slides.forEach(forceReflow);
            parentClassList.remove('bespoke-overview-to');
            if (activeSlideIndex >= columns) slides[activeSlideIndex].scrollIntoView(true);
          }
        }
        else {
          if (activeSlideIndex >= columns) slides[activeSlideIndex].scrollIntoView(true);
        }
      },
      // NOTE the order of operation in this method is critical; heavily impacts behavior & transition smoothness
      closeOverview = function(selection) {
        // IMPORTANT we intentionally reselect active slide to activate behavior
        deck.slide(typeof selection === 'number' ? selection : deck.slide(), { stopPropagation: false });
        var slides = deck.slides,
          parent = deck.parent,
          parentClassList = parent.classList,
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
        if (afterTransition !== undefined) {
          slides[0].removeEventListener('transitionend', afterTransition, false);
          if (lastSlideIndex > 0) slides[lastSlideIndex].removeEventListener('transitionend', afterTransition, false);
          parentClassList.remove('bespoke-overview-to');
        }
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
            var m = slide.style[transformName].match(TRANSFORM_RE);
            if (m) {
              slide.style[transformName] = 'translate(' + (parseFloat(m[1]) - (xShift || 0)) + 'px, ' + (parseFloat(m[2]) - yShift) + 'px) scale(' + m[3] + ')';
              forceReflowWithModulation(slide, transitionName, 'none', '');
            }
          });
        }
        if (parent.scrollTop > 0) parent.scrollTop = 0;
        parentClassList.remove('bespoke-overview');
        overviewActive = false;
        if (!!opts.numbers) parentClassList.remove('bespoke-overview-counter');
        parentClassList.add('bespoke-overview-from');
        var numTransitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
            (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0));
        slides.forEach(function(slide) { slide.style[transformName] = ''; });
        if (numTransitions > 0) {
          var activeTransitions = numTransitions;
          sampleSlide.addEventListener('transitionend', (afterTransition = function(e) {
            if (e.target === this && (activeTransitions -= 1) === 0) {
              this.removeEventListener('transitionend', afterTransition, false);
              afterTransition = undefined;
              parentClassList.remove('bespoke-overview-from');
            }
          }), false);
        }
        else {
          slides.forEach(forceReflow);
          parentClassList.remove('bespoke-overview-from');
        }
      },
      toggleOverview = function() {
        overviewActive ? closeOverview() : openOverview(); // jshint ignore:line
      },
      onResize = function() {
        if (overviewActive) openOverview();
      },
      onKeydown = function(e) {
        switch(e.which) {
          case KEYCODE.o:
            if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) toggleOverview();
            break;
          case KEYCODE.enter:
            if (overviewActive && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) closeOverview();
            break;
          case KEYCODE.up:
            if (overviewActive) return onNavigate(-columns);
            break;
          case KEYCODE.down:
            if (overviewActive) return onNavigate(columns);
            break;
        }
      };
    window.addEventListener('load', function resetInitialScroll() {
      window.removeEventListener('load', resetInitialScroll, false);
      if (deck.parent.scrollTop > 0) deck.parent.scrollTop = 0;
      if (!!opts.autostart) setTimeout(openOverview, 0);
    }, false);
    window.addEventListener('resize', onResize, false);
    document.addEventListener('keydown', onKeydown, false);
    deck.on('activate', onActivate);
    deck.on('next', onNavigate.bind(null, 1));
    deck.on('prev', onNavigate.bind(null, -1));
  };
};
