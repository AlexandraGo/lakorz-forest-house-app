// ===== LANGUAGE TOGGLE =====
let currentLang = 'en';

const langToggle = document.getElementById('lang-toggle');
const langOptions = langToggle.querySelectorAll('.lang-option');

langToggle.addEventListener('click', (e) => {
  const clicked = e.target.closest('.lang-option');
  if (!clicked) return;

  const lang = clicked.dataset.lang;
  if (lang === currentLang) return;

  currentLang = lang;

  // Update active state on toggle
  langOptions.forEach(opt => opt.classList.toggle('active', opt.dataset.lang === lang));

  // Update all translatable elements
  document.querySelectorAll('[data-en][data-pl]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });

  // Update calendar weekdays
  const weekdays = document.getElementById('calendar-weekdays');
  if (lang === 'pl') {
    weekdays.innerHTML = '<span>Pon</span><span>Wt</span><span>Śr</span><span>Czw</span><span>Pt</span><span>Sob</span><span>Ndz</span>';
  } else {
    weekdays.innerHTML = '<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>';
  }

  // Re-render calendar with new language
  renderCalendar();

  // Update HTML lang attribute
  document.documentElement.lang = lang;
});

// ===== NAVIGATION TOGGLE =====
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('active');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close nav when clicking a link
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ===== CALENDAR =====
// Pricing: 450 PLN/night (1-4 nights), 400 PLN/night (5+ nights)
// Minimum stay: 3 nights
// 450 PLN ≈ 105 EUR, 400 PLN ≈ 93 EUR
const PRICE_SHORT_PLN = 450;  // 3-4 nights
const PRICE_LONG_PLN = 400;   // 5+ nights
const PRICE_SHORT_EUR = 100;
const PRICE_LONG_EUR = 90;
const MIN_NIGHTS = 3;

// Google Sheets CSV URL
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSon1bH84yg80yyWDeYOOVETQapMTRZc2JryGpwp-_IgKKGv-yeaHKXI9wb-Cxq6U3ZbMnFGTZWYkns/pub?gid=0&single=true&output=csv';

// Booked dates loaded from Google Sheets
let bookedDates = [];

// Fetch bookings from Google Sheets
async function fetchBookings() {
  try {
    const response = await fetch(SHEET_CSV_URL);
    const csvText = await response.text();
    const rows = csvText.split('\n').slice(1); // skip header row

    bookedDates = rows
      .map(row => {
        const cols = row.split(',');
        const checkin = cols[0] ? cols[0].trim().replace(/"/g, '') : '';
        const checkout = cols[1] ? cols[1].trim().replace(/"/g, '') : '';
        if (checkin && checkout && checkin.match(/^\d{4}-\d{2}-\d{2}$/) && checkout.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return { start: checkin, end: checkout };
        }
        return null;
      })
      .filter(Boolean);

    renderCalendar();
  } catch (error) {
    console.error('Could not load bookings from Google Sheets:', error);
    // Fallback: use hardcoded dates
    bookedDates = [
      { start: '2026-07-25', end: '2026-07-31' },
      { start: '2026-08-01', end: '2026-08-16' },
    ];
    renderCalendar();
  }
}

// Load bookings on page load
fetchBookings();

function isDateBooked(date) {
  const dateStr = formatDate(date);
  return bookedDates.some(range => dateStr >= range.start && dateStr <= range.end);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
  const locale = currentLang === 'pl' ? 'pl-PL' : 'en-US';
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedCheckin = null;
let selectedCheckout = null;

const calendarDays = document.getElementById('calendar-days');
const monthYearLabel = document.getElementById('calendar-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const bookingSummary = document.getElementById('booking-summary');
const checkinDateEl = document.getElementById('checkin-date');
const checkoutDateEl = document.getElementById('checkout-date');
const numNightsEl = document.getElementById('num-nights');
const totalPriceEl = document.getElementById('total-price');

const monthNamesEN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthNamesPL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

function renderCalendar() {
  const monthNames = currentLang === 'pl' ? monthNamesPL : monthNamesEN;
  monthYearLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  calendarDays.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Monday = 0, Sunday = 6
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('calendar-day', 'empty');
    calendarDays.appendChild(emptyCell);
  }

  // Days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(currentYear, currentMonth, day);
    const cell = document.createElement('div');
    cell.classList.add('calendar-day');
    cell.textContent = day;

    if (date < today) {
      cell.classList.add('past');
    } else if (isDateBooked(date)) {
      cell.classList.add('booked');
    } else {
      cell.classList.add('available');

      // Check if selected
      const dateStr = formatDate(date);
      if (selectedCheckin && formatDate(selectedCheckin) === dateStr) {
        cell.classList.add('selected');
      }
      if (selectedCheckout && formatDate(selectedCheckout) === dateStr) {
        cell.classList.add('selected');
      }
      if (selectedCheckin && selectedCheckout) {
        if (date > selectedCheckin && date < selectedCheckout) {
          cell.classList.add('in-range');
        }
      }

      cell.addEventListener('click', () => handleDateClick(date));
    }

    if (formatDate(date) === formatDate(today)) {
      cell.classList.add('today');
    }

    calendarDays.appendChild(cell);
  }
}

function handleDateClick(date) {
  if (!selectedCheckin || (selectedCheckin && selectedCheckout)) {
    // Start new selection
    selectedCheckin = date;
    selectedCheckout = null;
    bookingSummary.hidden = true;
  } else {
    // Set checkout
    if (date <= selectedCheckin) {
      selectedCheckin = date;
      selectedCheckout = null;
    } else {
      // Check minimum nights
      const nights = Math.round((date - selectedCheckin) / (1000 * 60 * 60 * 24));
      if (nights < MIN_NIGHTS) {
        const msg = currentLang === 'pl'
          ? `Minimalny pobyt to ${MIN_NIGHTS} noce.`
          : `Minimum stay is ${MIN_NIGHTS} nights.`;
        alert(msg);
        return;
      }

      // Check if any booked date is in the range
      const hasBookedInRange = hasBookedDateInRange(selectedCheckin, date);
      if (hasBookedInRange) {
        selectedCheckin = date;
        selectedCheckout = null;
      } else {
        selectedCheckout = date;
        updateBookingSummary();
      }
    }
  }
  renderCalendar();
}

function hasBookedDateInRange(start, end) {
  const current = new Date(start);
  current.setDate(current.getDate() + 1);
  while (current < end) {
    if (isDateBooked(current)) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}

function updateBookingSummary() {
  if (!selectedCheckin || !selectedCheckout) return;

  const nights = Math.round((selectedCheckout - selectedCheckin) / (1000 * 60 * 60 * 24));

  // Pricing logic: 5+ nights = discounted rate
  const pricePLN = nights >= 5 ? PRICE_LONG_PLN : PRICE_SHORT_PLN;
  const priceEUR = nights >= 5 ? PRICE_LONG_EUR : PRICE_SHORT_EUR;
  const totalPLN = nights * pricePLN;
  const totalEUR = nights * priceEUR;

  checkinDateEl.textContent = formatDisplayDate(selectedCheckin);
  checkoutDateEl.textContent = formatDisplayDate(selectedCheckout);
  numNightsEl.textContent = nights;

  // Show price in both currencies
  const pricePerNightText = currentLang === 'pl'
    ? `${pricePLN} zł/noc`
    : `${pricePLN} PLN/night (~€${priceEUR})`;

  totalPriceEl.textContent = `${totalPLN} zł (~€${totalEUR})`;

  // Show per-night rate info
  const rateInfo = document.getElementById('rate-info');
  if (rateInfo) {
    if (nights >= 5) {
      rateInfo.textContent = currentLang === 'pl'
        ? `Cena: ${pricePLN} zł/noc (zniżka za 5+ nocy)`
        : `Rate: ${pricePLN} PLN/night (5+ nights discount)`;
    } else {
      rateInfo.textContent = currentLang === 'pl'
        ? `Cena: ${pricePLN} zł/noc`
        : `Rate: ${pricePLN} PLN/night`;
    }
  }

  bookingSummary.hidden = false;

  // Also update the contact form dates
  const checkinInput = document.getElementById('guest-checkin');
  const checkoutInput = document.getElementById('guest-checkout');
  if (checkinInput) checkinInput.value = formatDate(selectedCheckin);
  if (checkoutInput) checkoutInput.value = formatDate(selectedCheckout);
}

prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

// ===== CONTACT FORM — sends via Formspree to lakorzforesthouse@gmail.com =====
const contactForm = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('guest-name').value.trim();
  const email = document.getElementById('guest-email').value.trim();
  const phone = document.getElementById('guest-phone').value.trim();
  const checkin = document.getElementById('guest-checkin').value;
  const checkout = document.getElementById('guest-checkout').value;
  const guests = document.getElementById('guest-guests').value;
  const children = document.getElementById('guest-children').value.trim();
  const message = document.getElementById('guest-message').value.trim();

  if (!name || !email || !phone) {
    const msg = currentLang === 'pl'
      ? 'Proszę podać imię, email i telefon.'
      : 'Please fill in your name, email, and phone.';
    alert(msg);
    return;
  }

  if (!isValidEmail(email)) {
    const msg = currentLang === 'pl'
      ? 'Proszę podać prawidłowy adres email.'
      : 'Please enter a valid email address.';
    alert(msg);
    return;
  }

  // Send via Formspree
  try {
    // Validate minimum 3 nights if dates are provided
    if (checkin && checkout) {
      const nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
      if (nights < MIN_NIGHTS) {
        const msg = currentLang === 'pl'
          ? `Minimalny pobyt to ${MIN_NIGHTS} noce.`
          : `Minimum stay is ${MIN_NIGHTS} nights.`;
        alert(msg);
        return;
      }
    }

    const response = await fetch('https://formspree.io/f/mzdwbwko', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: phone,
        checkin: checkin || 'Not specified',
        checkout: checkout || 'Not specified',
        guests: guests || 'Not specified',
        children: children || 'None',
        message: message || 'No message'
      })
    });

    if (response.ok) {
      contactForm.hidden = true;
      formSuccess.hidden = false;
    } else {
      const msg = currentLang === 'pl'
        ? 'Coś poszło nie tak. Spróbuj ponownie.'
        : 'Something went wrong. Please try again.';
      alert(msg);
    }
  } catch (error) {
    const msg = currentLang === 'pl'
      ? 'Błąd połączenia. Spróbuj ponownie.'
      : 'Connection error. Please try again.';
    alert(msg);
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
