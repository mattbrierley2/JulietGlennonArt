// Carousel: keep all slides in a horizontal row and shift the track to left-align the focused slide.
(() => {
  const container = document.querySelector('.slideshow-container');
  const track = document.querySelector('.slides-track');
  const slides = Array.from(document.getElementsByClassName('mySlides'));
  let slideIndex = 0;

  if (!container || !track || slides.length === 0) return;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function updateTrack() {
    // If small screen, don't translate the track (vertical stacked layout)
    if (window.innerWidth <= 500) {
      track.style.transform = 'none';
      slides.forEach((s) => s.classList.remove('active-slide'));
      return;
    }
    const containerWidth = container.clientWidth;
    const trackWidth = track.scrollWidth;

    // compute desired translate so slide left aligns with container left
    const slide = slides[slideIndex];
    // translate should move the track left by the slide's offsetLeft
    let desired = -slide.offsetLeft;

    // clamp so we don't show empty space at ends
    const minTranslate = containerWidth - trackWidth; // negative or zero
    const maxTranslate = 0;
    const translate = clamp(desired, minTranslate, maxTranslate);

    track.style.transform = `translateX(${translate}px)`;
  }

  function goTo(n) {
    // If small screen, don't attempt to center slides (they stack vertically)
    if (window.innerWidth <= 500) {
      slides.forEach((s) => s.classList.remove('active-slide'));
      slideIndex = clamp(n, 0, slides.length - 1);
      slides[slideIndex].classList.add('active-slide');
      return;
    }

    slideIndex = clamp(n, 0, slides.length - 1);
    updateTrack();
    // mark active class for styling if desired
    slides.forEach((s, i) => s.classList.toggle('active-slide', i === slideIndex));
  }

  // Next/previous controls
  window.plusSlides = function(n) {
    // no-op on small screens (stacked layout)
    if (window.innerWidth <= 500) return;
    goTo((slideIndex + n) % slides.length);
  };

  // Direct controls (if you keep dots/thumbnail calls)
  window.currentSlide = function(n) {
    if (window.innerWidth <= 500) return;
    goTo(n - 1);
  };

  // initialize
  goTo(0);

  // center slideshow vertically in the visible viewport (excluding header)
  function centerSlideshow() {
    if (!container) return;
    if (window.innerWidth <= 500) {
      container.style.marginTop = '';
      container.style.marginBottom = '';
      return;
    }
    const header = document.querySelector('.header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const viewportHeight = window.innerHeight;
    const containerHeight = container.getBoundingClientRect().height;
    const available = Math.max(0, viewportHeight - headerHeight);
    const top = Math.max(0, (available - containerHeight) / 2);
    container.style.marginTop = top + 'px';
    container.style.marginBottom = top + 'px';
  }

  // keep centered on resize
  window.addEventListener('resize', () => {
    requestAnimationFrame(() => {
      updateTrack();
      centerSlideshow();
    });
  });

  // center on load
  centerSlideshow();

  // --- Input: wheel and touch swipe navigation (desktop carousel only) ---
  let _lastWheel = 0;
  container.addEventListener('wheel', (e) => {
    if (window.innerWidth <= 500) return; // not in carousel mode
    // allow page scroll when track isn't overflowed
    e.preventDefault();
    const now = Date.now();
    if (now - _lastWheel < 300) return; // simple debounce
    _lastWheel = now;
    if (e.deltaY > 0) {
      plusSlides(1);
    } else if (e.deltaY < 0) {
      plusSlides(-1);
    }
  }, { passive: false });

  let _touchStartX = null;
  let _touchStartTime = 0;
  container.addEventListener('touchstart', (e) => {
    if (window.innerWidth <= 500) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    _touchStartX = t.clientX;
    _touchStartTime = Date.now();
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (window.innerWidth <= 500) return;
    if (_touchStartX === null) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) { _touchStartX = null; return; }
    const dx = t.clientX - _touchStartX;
    const dt = Date.now() - _touchStartTime;
    _touchStartX = null;
    // swipe threshold
    if (Math.abs(dx) > 40 && dt < 800) {
      if (dx < 0) plusSlides(1); // swipe left -> next
      else plusSlides(-1); // swipe right -> prev
    }
  }, { passive: true });

})();

// Mobile menu toggle
(function() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!hamburger || !mobileMenu) return;

  function setOpen(open) {
    document.documentElement.classList.toggle('mobile-open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = document.documentElement.classList.contains('mobile-open');
    setOpen(!isOpen);
  });

  // close when clicking outside
  document.addEventListener('click', (e) => {
    if (!document.documentElement.classList.contains('mobile-open')) return;
    if (e.target.closest('.mobile-menu') || e.target.closest('.hamburger')) return;
    setOpen(false);
  });

  // close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// Image modal (open clicked slide in fullscreen on large screens)
(function() {
  const modal = document.getElementById('image-modal');
  if (!modal) return;
  const modalImg = modal.querySelector('.modal-image');
  const modalTitle = modal.querySelector('.modal-title');
  const modalDesc = modal.querySelector('.modal-desc');
  const modalLongDesc = modal.querySelector('.modal-longdesc');

  function openModal(src, title, desc, alt, longdesc) {
    // clear previous classes and inline styles
    modalImg.classList.remove('landscape', 'portrait');
    modalImg.style.maxWidth = '';
    modalImg.style.maxHeight = '';
    modalImg.style.width = '';
    modalImg.style.height = '';

    modalImg.alt = alt || '';
    if (modalTitle) modalTitle.textContent = title || '';
    if (modalDesc) modalDesc.textContent = desc || '';
    if (modalLongDesc) modalLongDesc.innerHTML = longdesc || '';

    // show modal overlay (use class toggle for smooth transition)
    modal.style.display = 'flex';
    // allow layout to apply then add open class to animate
    requestAnimationFrame(() => modal.classList.add('open'));
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');

    // load image and size it to available viewport space preserving aspect ratio
    modalImg.onload = function() {
      try {
        // measure only the short caption (title + short desc) so long description
        // doesn't reduce image available space
        const titleEl = modal.querySelector('.modal-title');
        const descEl = modal.querySelector('.modal-desc');
        const titleH = titleEl ? titleEl.getBoundingClientRect().height : 0;
        const descH = descEl ? descEl.getBoundingClientRect().height : 0;
        const captionHeight = titleH + descH + 12; // small gap
        const padding = 40; // modal padding left+right accounted earlier
        const verticalPadding = 40; // top+bottom padding and extra spacing (not counting longdesc)
        const availableWidth = Math.max(100, window.innerWidth - padding);
        const availableHeight = Math.max(100, window.innerHeight - verticalPadding - captionHeight);

        const naturalW = modalImg.naturalWidth || modalImg.width;
        const naturalH = modalImg.naturalHeight || modalImg.height;
        const imgRatio = naturalW / naturalH;
        const availRatio = availableWidth / availableHeight;

        if (imgRatio >= availRatio) {
          // image relatively wide -> constrain by width
          modalImg.style.maxWidth = availableWidth + 'px';
          modalImg.style.maxHeight = 'none';
        } else {
          // image relatively tall -> constrain by height
          modalImg.style.maxHeight = availableHeight + 'px';
          modalImg.style.maxWidth = 'none';
        }
      } catch (e) {
        // fallback: ensure it at least fits reasonably
        modalImg.style.maxWidth = 'calc(100% - 40px)';
        modalImg.style.maxHeight = 'calc(100% - 120px)';
      }
      modalImg.onload = null;
    };

    modalImg.src = src;
  }

  function closeModal() {
    // remove open class to start closing transition
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    // after transition ends, hide the overlay and clear image
    const onTransitionEnd = (e) => {
      if (e.target !== modal) return;
      modal.style.display = 'none';
      modal.removeEventListener('transitionend', onTransitionEnd);
      modalImg.onload = null;
      modalImg.src = '';
      modalImg.classList.remove('landscape', 'portrait');
      modalImg.style.maxWidth = '';
      modalImg.style.maxHeight = '';
      modalImg.style.width = '';
      modalImg.style.height = '';
    };
    modal.addEventListener('transitionend', onTransitionEnd);
  }

  // attach click handlers to slide images
  const imgs = Array.from(document.querySelectorAll('.mySlides img'));
  imgs.forEach((img) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
      if (window.innerWidth <= 500) return; // only in carousel view
      const slide = img.closest('.mySlides');
      const title = slide ? (slide.querySelector('.titletext')?.textContent || '') : '';
      const desc = slide ? (slide.querySelector('.descriptiontext')?.textContent || '') : '';
      const longdescEl = slide ? (slide.querySelector('.longdesc') || slide.querySelector('.longdescriptiontext')) : null;
      const longdesc = longdescEl ? longdescEl.innerHTML : (slide ? (slide.dataset.longdesc || '') : '');
      openModal(img.src, title, desc, img.alt || '', longdesc);
    });
  });

  // close on any click inside the modal (overlay, image, captions)
  modal.addEventListener('click', () => closeModal());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ensure modal closes on resize to small screens
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 500 && modal.style.display === 'flex') closeModal();
  });

})();

// Center About page vertically (exclude small screens)
(function() {
  const about = document.querySelector('.about-main');
  if (!about) return;

  function centerAbout() {
    if (window.innerWidth <= 500) {
      about.style.marginTop = '';
      about.style.marginBottom = '';
      return;
    }
    const header = document.querySelector('.header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const viewportHeight = window.innerHeight;
    const containerHeight = about.getBoundingClientRect().height;
    const available = Math.max(0, viewportHeight - headerHeight);
    const top = Math.max(0, (available - containerHeight) / 2);
    about.style.marginTop = top + 'px';
    about.style.marginBottom = top + 'px';
  }

  window.addEventListener('resize', () => requestAnimationFrame(centerAbout));
  // run on load
  requestAnimationFrame(centerAbout);
})();