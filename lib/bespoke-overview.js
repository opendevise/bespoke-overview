module.exports = function(opts) {
  var css = require('fs').readFileSync(__dirname + '/bespoke-overview.css', 'utf8');
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
        if (property !== undefined) element.style[property] = from;
        element.offsetHeight; // jshint ignore: line
        if (property !== undefined) element.style[property] = to;
      },
      onSlideClick = function() {
        closeOverview(deck.slides.indexOf(this));
      },
      onNavigate = function(offset, slideEvent) {
        if (overviewActive) {
          var targetIndex = (slideEvent || { index: deck.slide() }).index + offset;
          // IMPORTANT must navigate using deck.slide to step over bullets
          if (targetIndex > -1 && targetIndex < deck.slides.length) deck.slide(targetIndex, { preview: true });
          return false;
        }
      },
      onActivate = function(slideEvent) {
        if (!loaded) {
          loaded = true;
          deck.parent.scrollLeft = deck.parent.scrollTop = 0;
          if (!!opts.autostart) setTimeout(openOverview, 100); // slight timeout to allow transitions to prepare
          return;
        }
        if (overviewActive && slideEvent.scrollIntoView !== false) scrollSlideIntoView(slideEvent);
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
          baseZoom,
          numTransitions = 0,
          initial = !overviewActive;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent);
        }
        else if ((baseZoom = getZoomFactor(sampleSlide))) {
          baseScale = baseZoom;
        }
        if (afterTransition !== undefined) removeAfterTransition('from', parentClasses, slides[0], slides[lastSlideIndex]);
        if (!!opts.title) title = getOrCreateTitle(parent);
        if (initial) {
          deck.slide(activeSlideIndex, { preview: true });
          parentClasses.add('bespoke-overview');
          overviewActive = true;
          if (!!opts.numbers) parentClasses.add('bespoke-overview-counter');
          parentClasses.add('bespoke-overview-to');
          numTransitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
              (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0));
          parent.style.overflowY = 'scroll'; // gives us fine-grained control
          parent.style.scrollBehavior = 'smooth'; // not supported by all browsers
        }
        var deckWidth = parent.clientWidth / baseScale,
          deckHeight = parent.clientHeight / baseScale,
          scrollbarWidth = parent.offsetWidth - parent.clientWidth,
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
          scrollbarOffset = ('webkitAppearance' in parent.style ? 0 : (scrollbarWidth / 2) / baseScale),
          row = 0, col = 0;
        if (title) {
          if (opts.scaleTitle !== false) {
            title.style[baseZoom ? 'zoom' : transformName] = (baseZoom ? totalScale : 'scale(' + totalScale + ')');
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
          // NOTE drop exponential notation in near-zero numbers (since it breaks older WebKit engines)
          if (x.toString().indexOf('e-') !== -1) x = 0;
          if (y.toString().indexOf('e-') !== -1) y = 0;
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
            var activeTransitions = numTransitions;
            sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
              if (e.target === this && (activeTransitions -= 1) === 0) {
                removeAfterTransition('to', parentClasses, this);
                if ('webkitAppearance' in parent.style && parent.scrollHeight > parent.offsetHeight) {
                  // NOTE kick scrollbar when it fails to awaken from zombie state
                  forceReflow(parent, 'overflowY', 'auto', 'scroll');
                }
                if (activeSlideIndex >= columns) slides[activeSlideIndex].scrollIntoView(true);
              }
            }), false);
          }
          else {
            slides.forEach(function(slide) { forceReflow(slide); });
            parentClasses.remove('bespoke-overview-to');
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
        if (afterTransition !== undefined) removeAfterTransition('to', parentClasses, slides[0], slides[lastSlideIndex]);
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
        if (!!opts.numbers) parentClasses.remove('bespoke-overview-counter');
        parentClasses.add('bespoke-overview-from');
        var numTransitions = (lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
            (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0));
        slides.forEach(function(slide) { slide.style[transformName] = ''; });
        if (numTransitions > 0) {
          var activeTransitions = numTransitions;
          sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
            if (e.target === this && (activeTransitions -= 1) === 0) removeAfterTransition('from', parentClasses, this);
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
              return onNavigate(-columns);
            case KEYCODE.down:
              return onNavigate(columns);
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
