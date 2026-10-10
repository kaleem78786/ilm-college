'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------------
  // 1. BEAUTIFUL REFRESH POPUP: MADE BY ASAD BHUTTA FROM ILM COLLEGE
  // -----------------------------------------------------------------
  const creatorPopup = document.getElementById('creatorPopup');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const popupExploreBtn = document.getElementById('popupExploreBtn');

  function openCreatorPopup() {
    if (!creatorPopup) return;
    // Slight delay for smooth visual transition after page load
    setTimeout(() => {
      creatorPopup.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }, 250);
  }

  function closeCreatorPopup() {
    if (!creatorPopup) return;
    creatorPopup.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  if (popupCloseBtn) popupCloseBtn.addEventListener('click', closeCreatorPopup);
  if (popupExploreBtn) popupExploreBtn.addEventListener('click', closeCreatorPopup);

  if (creatorPopup) {
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
  window.addEventListener('scroll', () => {
    if (!scrollProgressBar) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    scrollProgressBar.style.width = `${progress}%`;
  }, { passive: true });

  // -----------------------------------------------------------------
  // 3. ANNOUNCEMENT TOP BAR DISMISS
  // -----------------------------------------------------------------
  const announcementBar = document.getElementById('announcementBar');
  const announcementClose = document.getElementById('announcementClose');
  if (announcementClose && announcementBar) {
    announcementClose.addEventListener('click', () => {
      announcementBar.style.display = 'none';
    });
  }

  // -----------------------------------------------------------------
  // 4. DARK / LIGHT THEME TOGGLE
  // -----------------------------------------------------------------
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('ilm_theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('ilm_theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('ilm_theme', 'dark');
      }
    });
  }

  // -----------------------------------------------------------------
  // 5. PROGRAM TABS & LIVE SEARCH FILTER
  // -----------------------------------------------------------------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const programSearch = document.getElementById('programSearch');
  const programCards = document.querySelectorAll('.program-card');

  let currentCategory = 'all';

  function filterPrograms() {
    const query = (programSearch ? programSearch.value : '').trim().toLowerCase();

    programCards.forEach(card => {
      const category = card.getAttribute('data-category') || '';
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const title = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';

      const matchesCategory = (currentCategory === 'all' || category === currentCategory);
      const matchesSearch = !query || name.includes(query) || title.includes(query);

      if (matchesCategory && matchesSearch) {
        card.classList.remove('is-hidden');
      } else {
        card.classList.add('is-hidden');
      }
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-filter') || 'all';
      filterPrograms();
    });
  });

  if (programSearch) {
    programSearch.addEventListener('input', filterPrograms);
  }

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
      if (scholarshipTag) scholarshipTag.textContent = '🌟 100% MERIT SCHOLARSHIP';
      if (eligibilityHeading) eligibilityHeading.textContent = `Full Free-Ship in ${prog}`;
      if (eligibilityDetails) eligibilityDetails.textContent = `Outstanding! With ${marks}%, you qualify for 100% tuition waiver across all ILM campuses nationwide.`;
    } else if (marks >= 80) {
      if (scholarshipTag) scholarshipTag.textContent = '🏆 50% MERIT SCHOLARSHIP';
      if (eligibilityHeading) eligibilityHeading.textContent = `50% Fee Waiver in ${prog}`;
      if (eligibilityDetails) eligibilityDetails.textContent = `Excellent achievement! With ${marks}%, you qualify for a 50% fee concession and priority hostel reservation.`;
    } else if (marks >= 70) {
      if (scholarshipTag) scholarshipTag.textContent = '🏅 25% MERIT SCHOLARSHIP';
      if (eligibilityHeading) eligibilityHeading.textContent = `25% Fee Concession in ${prog}`;
      if (eligibilityDetails) eligibilityDetails.textContent = `Great score! With ${marks}%, you are eligible for 25% scholarship plus sports and talent quota evaluation.`;
    } else if (marks >= 60) {
      if (scholarshipTag) scholarshipTag.textContent = '✓ ELIGIBLE FOR ADMISSION';
      if (eligibilityHeading) eligibilityHeading.textContent = `Standard Admission in ${prog}`;
      if (eligibilityDetails) eligibilityDetails.textContent = `You meet the admission criteria for ${prog}. Kinship and special installments available upon campus visit.`;
    } else {
      if (scholarshipTag) scholarshipTag.textContent = 'ℹ️ PROVISIONAL ADMISSION';
      if (eligibilityHeading) eligibilityHeading.textContent = `Subject to Interview in ${prog}`;
      if (eligibilityDetails) eligibilityDetails.textContent = `Contact your nearest ILM campus for guidance counselling and program seat availability.`;
    }
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
    if (event.key === 'Escape') {
      closeCreatorPopup();
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

  window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
    if (event.matches) setMenu(false);
  });

  // -----------------------------------------------------------------
  // 8. DYNAMIC YEAR
  // -----------------------------------------------------------------
  const yearElem = document.querySelector('#year');
  if (yearElem) yearElem.textContent = new Date().getFullYear();
});
