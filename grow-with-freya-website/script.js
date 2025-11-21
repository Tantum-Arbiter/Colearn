// ========================================
// 🌙 Grow with Freya — Website Scripts
// ========================================

console.log('🌙 Grow with Freya script loaded!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Content Loaded');

  // Set current year in footer
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Smooth scrolling for all scroll targets
  const scrollTargets = document.querySelectorAll('[data-scroll-target]');
  console.log(`🔗 Found ${scrollTargets.length} scroll target elements`);

  scrollTargets.forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      const id = el.getAttribute('data-scroll-target');
      console.log(`🎯 Scrolling to section: ${id}`);

      const target = document.getElementById(id);
      if (target) {
        const header = document.querySelector('.site-header');
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = targetPosition - headerHeight - 20;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        console.log(`✅ Scrolled to ${id}`);
      } else {
        console.error(`❌ Target element not found: ${id}`);
      }
    });
  });

  // Story filtering
  const searchInput = document.getElementById('searchInput');
  const ageFilter = document.getElementById('ageFilter');
  const themeFilter = document.getElementById('themeFilter');
  const lengthFilter = document.getElementById('lengthFilter');
  const storyCards = document.querySelectorAll('.story-card');

  function filterStories() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedAge = ageFilter.value;
    const selectedTheme = themeFilter.value;
    const selectedLength = lengthFilter.value;

    storyCards.forEach((card) => {
      const title = card.querySelector('h3').textContent.toLowerCase();
      const description = card.querySelector('.story-description').textContent.toLowerCase();
      const age = card.getAttribute('data-age');
      const theme = card.getAttribute('data-theme');
      const length = card.getAttribute('data-length');

      const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
      const matchesAge = !selectedAge || age === selectedAge;
      const matchesTheme = !selectedTheme || theme === selectedTheme;
      const matchesLength = !selectedLength || length === selectedLength;

      if (matchesSearch && matchesAge && matchesTheme && matchesLength) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterStories);
  if (ageFilter) ageFilter.addEventListener('change', filterStories);
  if (themeFilter) themeFilter.addEventListener('change', filterStories);
  if (lengthFilter) lengthFilter.addEventListener('change', filterStories);

  // Contact form submission (placeholder)
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Thank you for your message! We'll be in touch soon.');
      contactForm.reset();
    });
  }
});

