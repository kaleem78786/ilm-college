'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------------
  // 1. BEAUTIFUL REFRESH POPUP: MADE BY ASAD BHUTTA FROM ILM COLLEGE
  // -----------------------------------------------------------------
  const creatorPopup = document.getElementById('creatorPopup');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const popupExploreBtn = document.getElementById('popupExploreBtn');
  const popupOpenBtn = document.getElementById('popupOpenBtn');
  let popupPreviousFocus;
  let previousOverflow = '';
  const backgroundState = new Map();

  function focusCreatorPopup() {
    if (creatorPopup?.classList.contains('is-active')) popupCloseBtn?.focus({ preventScroll: true });
  }

  function openCreatorPopup() {
    if (!creatorPopup || creatorPopup.classList.contains('is-active')) return;
    popupPreviousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    for (const element of document.body.children) {
      if (element === creatorPopup || element.tagName === 'SCRIPT') continue;
      backgroundState.set(element, element.inert);
      element.inert = true;
    }
    creatorPopup.setAttribute('aria-hidden', 'false');
    creatorPopup.classList.add('is-active');
    creatorPopup.showModal();
    creatorPopup.querySelector('.creator-modal-card')?.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(focusCreatorPopup);
  }

  function closeCreatorPopup() {
    if (!creatorPopup || !creatorPopup.classList.contains('is-active')) return;
    creatorPopup.classList.remove('is-active');
    creatorPopup.setAttribute('aria-hidden', 'true');
    creatorPopup.close();
    document.body.style.overflow = previousOverflow;
    for (const [element, wasInert] of backgroundState) element.inert = wasInert;
    backgroundState.clear();
    const focusTarget = popupPreviousFocus === document.body
      ? document.querySelector('.site-header .brand') : popupPreviousFocus;
    focusTarget?.focus({ preventScroll: true });
  }

  if (popupCloseBtn) popupCloseBtn.addEventListener('click', closeCreatorPopup);
  if (popupExploreBtn) popupExploreBtn.addEventListener('click', closeCreatorPopup);
  if (popupOpenBtn) popupOpenBtn.addEventListener('click', openCreatorPopup);

  if (creatorPopup) {
    creatorPopup.addEventListener('cancel', event => {
      event.preventDefault();
      closeCreatorPopup();
    });
    creatorPopup.addEventListener('click', (event) => {
      if (event.target === creatorPopup) closeCreatorPopup();
    });
  }

  // Open on every refresh as requested
  openCreatorPopup();

  // -----------------------------------------------------------------
  // 2. SCROLL PROGRESS BAR
  // -----------------------------------------------------------------
  const scrollProgressBar = document.getElementById('scrollProgress');
  function updateScrollProgress() {
    if (!scrollProgressBar) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    scrollProgressBar.style.width = `${progress}%`;
  }
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
  updateScrollProgress();

  // -----------------------------------------------------------------
  // 3. ANNOUNCEMENT TOP BAR DISMISS
  // -----------------------------------------------------------------
  const announcementBar = document.getElementById('announcementBar');
  const announcementClose = document.getElementById('announcementClose');
  if (announcementClose && announcementBar) {
    announcementClose.addEventListener('click', () => {
      announcementBar.style.display = 'none';
      updateScrollProgress();
    });
  }

  // -----------------------------------------------------------------
  // 4. DARK / LIGHT THEME TOGGLE
  // -----------------------------------------------------------------
  const themeToggle = document.getElementById('themeToggle');
  // Storage can be disabled in private browsers and embedded previews.
  let savedTheme;
  try { savedTheme = localStorage.getItem('ilm_theme'); } catch { /* Keep the default theme. */ }
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  function updateThemeButton() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle?.setAttribute('aria-pressed', String(isDark));
    themeToggle?.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  updateThemeButton();
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      try { localStorage.setItem('ilm_theme', isDark ? 'light' : 'dark'); } catch { /* Toggling still works. */ }
      updateThemeButton();
    });
  }

  // -----------------------------------------------------------------
  // 5. PROGRAM TABS & LIVE SEARCH FILTER
  // -----------------------------------------------------------------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const programSearch = document.getElementById('programSearch');
  const programCards = document.querySelectorAll('.program-card');
  const programStatus = document.getElementById('programStatus');

  let currentCategory = 'all';

  function filterPrograms() {
    const query = (programSearch ? programSearch.value : '').trim().toLowerCase();
    let visibleCount = 0;

    programCards.forEach(card => {
      const category = card.getAttribute('data-category') || '';
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const title = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';

      const matchesCategory = (currentCategory === 'all' || category === currentCategory);
      const matchesSearch = !query || name.includes(query) || title.includes(query);

      if (matchesCategory && matchesSearch) {
        card.classList.remove('is-hidden');
        visibleCount += 1;
      } else {
        card.classList.add('is-hidden');
      }
    });
    if (programStatus) {
      programStatus.textContent = visibleCount
        ? `${visibleCount} ${visibleCount === 1 ? 'program' : 'programs'} found.`
        : 'No programs match. Try another search or select All Pathways.';
      programStatus.classList.toggle('empty', visibleCount === 0);
    }
    updateScrollProgress();
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentCategory = btn.getAttribute('data-filter') || 'all';
      filterPrograms();
    });
  });

  if (programSearch) {
    programSearch.addEventListener('input', filterPrograms);
  }
  filterPrograms();

  // -----------------------------------------------------------------
  // 6. INTERACTIVE SCHOLARSHIP CALCULATOR
  // -----------------------------------------------------------------
  const marksRange = document.getElementById('marksRange');
  const marksDisplay = document.getElementById('marksDisplay');
  const calcProgram = document.getElementById('calcProgram');
  const scholarshipTag = document.getElementById('scholarshipTag');
  const eligibilityHeading = document.getElementById('eligibilityHeading');
  const eligibilityDetails = document.getElementById('eligibilityDetails');

  function updateCalculator() {
    if (!marksRange) return;
    const marks = parseInt(marksRange.value, 10);
    const prog = calcProgram ? calcProgram.value : 'Intermediate';

    if (marksDisplay) marksDisplay.textContent = `${marks}%`;

    if (marks >= 90) {
      if (scholarshipTag) scholarshipTag.textContent = '🌟 ILLUSTRATIVE 100% BRACKET';
      if (eligibilityHeading) eligibilityHeading.textContent = `100% example for ${prog}`;
    } else if (marks >= 80) {
      if (scholarshipTag) scholarshipTag.textContent = '🏆 ILLUSTRATIVE 50% BRACKET';
      if (eligibilityHeading) eligibilityHeading.textContent = `50% example for ${prog}`;
    } else if (marks >= 70) {
      if (scholarshipTag) scholarshipTag.textContent = '🏅 ILLUSTRATIVE 25% BRACKET';
      if (eligibilityHeading) eligibilityHeading.textContent = `25% example for ${prog}`;
    } else if (marks >= 60) {
      if (scholarshipTag) scholarshipTag.textContent = 'ADMISSION ENQUIRY';
      if (eligibilityHeading) eligibilityHeading.textContent = `Explore ${prog}`;
    } else {
      if (scholarshipTag) scholarshipTag.textContent = 'CAMPUS GUIDANCE';
      if (eligibilityHeading) eligibilityHeading.textContent = `Ask about ${prog}`;
    }
    if (eligibilityDetails) eligibilityDetails.textContent = `At ${marks}%, this demonstration provides an illustrative result only. Your campus must confirm actual admission criteria, scholarship rates, fees and available places for ${prog}.`;
  }

  if (marksRange) marksRange.addEventListener('input', updateCalculator);
  if (calcProgram) calcProgram.addEventListener('change', updateCalculator);
  updateCalculator();

  // -----------------------------------------------------------------
  // 7. MOBILE NAVIGATION & GLOBAL ESC KEY HANDLER
  // -----------------------------------------------------------------
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');

  function setMenu(open) {
    if (!navigation || !toggle) return;
    navigation.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setMenu(!isOpen);
    });
  }

  if (navigation) {
    navigation.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMenu(false));
    });
  }

  document.addEventListener('keydown', event => {
    if (creatorPopup?.classList.contains('is-active')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCreatorPopup();
      } else if (event.key === 'Tab') {
        const focusable = [...creatorPopup.querySelectorAll('button, a[href]')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    if (event.key === 'Escape') {
      if (toggle && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    }
  });

  document.addEventListener('click', event => {
    if (navigation && toggle && !navigation.contains(event.target) && !toggle.contains(event.target)) {
      setMenu(false);
    }
  });

  window.matchMedia('(min-width: 1051px)').addEventListener('change', event => {
    if (event.matches) setMenu(false);
  });

  // -----------------------------------------------------------------
  // 8. DYNAMIC YEAR
  // -----------------------------------------------------------------
  const yearElem = document.querySelector('#year');
  if (yearElem) yearElem.textContent = new Date().getFullYear();
});
