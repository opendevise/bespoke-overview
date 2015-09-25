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
      RE_CSV = /, */, RE_NONE = /^none(?:, ?none)*$/, RE_TRANSFORM = /^translate\((.+?)px, ?(.+?)px\) scale\((.+?)\)$/,
      TRANSITIONEND = !('transition' in document.body.style) && ('webkitTransition' in document.body.style) ? 'webkitTransitionEnd' : 'transitionend',
      VENDOR = ['webkit', 'Moz', 'ms'],
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
        if (!!opts.autostart) setTimeout(openOverview, 100); // slight timeout to allow transitions to prepare
      },
      onSlideClick = function() {
        closeOverview(deck.slides.indexOf(this));
      },
      onNavigate = function(offset, e) {
        var targetIndex = e.index + offset;
        // IMPORTANT must use deck.slide to navigate and return false in order to circumvent bespoke-bullets behavior
        if (targetIndex > -1 && targetIndex < deck.slides.length) deck.slide(targetIndex, { preview: true });
        return false;
      },
      onActivate = function(e) {
        if (e.scrollIntoView !== false) scrollSlideIntoView(e.slide, e.index, getZoomFactor(e.slide));
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
          parentClasses.add('bespoke-overview-to');
          numTransitions = lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
              (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0);
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
          slide.style[transformProp] = 'translate(' + (x.toString().indexOf('e-') >= 0 ? 0 : x) + 'px, ' +
              (y.toString().indexOf('e-') >= 0 ? 0 : y) + 'px) scale(' + scale + ')';
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
            var m = slide.style[transformProp].match(RE_TRANSFORM);
            slide.style[transformProp] = 'translate(' + (parseFloat(m[1]) - xShift) + 'px, ' + (parseFloat(m[2]) - yShift) + 'px) scale(' + m[3] + ')';
            flushStyle(slide, transitionProp, 'none', ''); // bypass transition, if any
          });
        }
        parent.scrollTop = 0;
        parentClasses.remove('bespoke-overview');
        removeEventListener('resize', openOverview, false);
        if (Array.isArray(overviewActive)) overviewActive.forEach(function(unbindEvent) { unbindEvent(); });
        overviewActive = null;
        if (!!opts.counter) parentClasses.remove('bespoke-overview-counter');
        parentClasses.add('bespoke-overview-from');
        var numTransitions = lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
            (getTransitionProperties(sampleSlide).indexOf('transform') >= 0 ? 1 : 0);
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
    deck.on('overview.toggle', toggleOverview);
    document.addEventListener('keydown', onKeydown, false);
  };
};
