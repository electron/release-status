const apiUrl = 'https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=-1&n=4';
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Custom events - Add your events here
const electronEvents = [
  { date: '2025-03-20', title: 'Test Stable', type: 'electron', icon: 'fas fa-users' }, // Upcoming electron Relases Can Be Provided Here Or Any Other Events
];

async function loadCalendar() {
  const calendarDiv = document.getElementById('calendar');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');

  try {
    // Get the current date to determine which months to display
    const currentDate = new Date();
    const monthsToShow = 3; // Number of months to display

    // Fetch API data
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch release data');
    const data = await response.json();

    // Process API events and merge with custom events
    const events = processEvents(data.mstones);

    // Add custom events to the events object
    electronEvents.forEach((event) => {
      if (!events[event.date]) events[event.date] = [];
      events[event.date].push(event);
    });

    // Generate month configurations dynamically based on current date
    const monthsConfig = generateMonthsConfig(currentDate, monthsToShow);

    // Add slight delay for animation effect
    setTimeout(() => {
      renderCalendar(monthsConfig, events);
      loadingDiv.style.display = 'none';
      errorDiv.style.display = 'none';
    }, 500);
  } catch (error) {
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error: ' + error.message;
  }
}

function generateMonthsConfig(startDate, numMonths) {
  const months = [];

  for (let i = 0; i < numMonths; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);

    const year = date.getFullYear();
    const month = date.getMonth();

    // Get month name
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

    // Calculate days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Calculate start day (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(year, month, 1).getDay();

    months.push({
      name: `${monthName} ${year}`,
      days: daysInMonth,
      startDay: firstDay,
      year: year,
      month: month + 1, // JavaScript months are 0-indexed, but we need 1-indexed for formatting
    });
  }

  return months;
}

function processEvents(mstones) {
  const events = {};
  mstones.forEach((m) => {
    const milestone = `${m.mstone}`;
    addEvent(events, m.earliest_beta, `M${milestone} Early Beta`, 'beta', 'fas fa-flask');
    addEvent(events, m.final_beta, `M${milestone} Final Beta`, 'beta', 'fas fa-vial');
    addEvent(events, m.stable_date, `M${milestone} Stable`, 'stable', 'fas fa-rocket');
  });
  return events;
}

function addEvent(events, dateStr, title, type, icon) {
  if (!dateStr) return;
  const date = new Date(dateStr).toISOString().split('T')[0];
  if (!events[date]) events[date] = [];
  events[date].push({ title, type, icon });
}

function renderCalendar(monthsConfig, events) {
  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = ''; // Clear loading/error

  // Get today's date for highlighting
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  // Create controls for filtering
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'calendar-controls';

  const filterHeading = document.createElement('h3');
  filterHeading.className = 'filter-heading';
  filterHeading.innerHTML = '<i class="fa fa-filter" aria-hidden="true"></i>Filter';
  controlsDiv.appendChild(filterHeading);

  const eventTypes = ['beta', 'stable', 'electron'];
  const eventColors = {
    beta: 'var(--beta-color)',
    stable: 'var(--stable-color)',
    electron: 'var(--electron-color)',
  };

  eventTypes.forEach((type) => {
    const filterOption = document.createElement('div');
    filterOption.className = 'filter-option active'; // Start as active
    filterOption.dataset.eventType = type;

    const colorSwatch = document.createElement('span');
    colorSwatch.className = 'color-swatch';
    colorSwatch.style.backgroundColor = eventColors[type];

    const labelText = document.createElement('span');
    labelText.textContent = type.charAt(0).toUpperCase() + type.slice(1);

    filterOption.appendChild(colorSwatch);
    filterOption.appendChild(labelText);

    // Toggle active class and filter events on click
    filterOption.addEventListener('click', () => {
      filterOption.classList.toggle('active');
      filterEvents();
    });

    controlsDiv.appendChild(filterOption);
  });

  // Modify the filterEvents function to check for active class
  function filterEvents() {
    const activeFilters = Array.from(document.querySelectorAll('.filter-option.active')).map(
      (el) => el.dataset.eventType,
    );

    document.querySelectorAll('.event').forEach((event) => {
      const eventType = event.classList.contains('beta')
        ? 'beta'
        : event.classList.contains('stable')
          ? 'stable'
          : 'electron';

      if (activeFilters.includes(eventType)) {
        event.style.display = '';
      } else {
        event.style.display = 'none';
      }
    });
  }

  calendarDiv.appendChild(controlsDiv);

  monthsConfig.forEach((month, monthIndex) => {
    const monthDiv = document.createElement('div');
    monthDiv.className = 'month';
    monthDiv.style.animationDelay = monthIndex * 0.2 + 's';
    monthDiv.innerHTML = `<h2>${month.name}</h2>`;

    const daysDiv = document.createElement('div');
    daysDiv.className = 'days';

    // Weekday headers
    weekdays.forEach((day) => {
      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = day;
      daysDiv.appendChild(header);
    });

    // Empty days before the 1st
    for (let i = 0; i < month.startDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'day empty';
      daysDiv.appendChild(emptyDay);
    }

    // Days of the month
    for (let day = 1; day <= month.days; day++) {
      const monthNum = month.month.toString().padStart(2, '0');
      const date = `${month.year}-${monthNum}-${day.toString().padStart(2, '0')}`;

      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      dayDiv.dataset.date = date;

      // Check if this is today
      if (date === todayString) {
        dayDiv.classList.add('today');
      }

      const numberSpan = document.createElement('span');
      numberSpan.className = 'number';
      numberSpan.textContent = day;
      dayDiv.appendChild(numberSpan);

      const dayEvents = events[date] || [];
      dayEvents.forEach((event, idx) => {
        const eventDiv = document.createElement('div');
        eventDiv.className = `event ${event.type}`;
        eventDiv.dataset.eventType = event.type;
        eventDiv.style.animationDelay = idx * 0.1 + 's';

        eventDiv.innerHTML = `
          <i class="${event.icon}" aria-hidden="true"></i>
          <span class="event-title">${event.title}</span>
        `;

        // Add click event for interaction
        eventDiv.addEventListener('click', () => {
          showEventDetails(event, date);
        });

        dayDiv.appendChild(eventDiv);
      });

      daysDiv.appendChild(dayDiv);
    }

    monthDiv.appendChild(daysDiv);
    calendarDiv.appendChild(monthDiv);
  });
}

function showEventDetails(event, date) {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const modalContent = `
    <div class="event-modal-content">
      <h3><i class="${event.icon}"></i> ${event.title}</h3>
      <p>Date: ${formattedDate}</p>
      <p>Type: ${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</p>
      ${event.description ? `<p>${event.description}</p>` : ''}
    </div>
  `;

  // Create a simple modal
  const modal = document.createElement('div');
  modal.className = 'event-modal';
  modal.innerHTML = `
    <div class="event-modal-overlay"></div>
    <div class="event-modal-container">
      <div class="event-modal-header">
        <button class="modal-close-btn">&times;</button>
      </div>
      ${modalContent}
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal when clicking close button or overlay
  modal.querySelector('.modal-close-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.querySelector('.event-modal-overlay').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

function filterEvents() {
  const checkboxes = document.querySelectorAll('.filter-option input');
  const visibleTypes = Array.from(checkboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.dataset.eventType);

  const events = document.querySelectorAll('.event');
  events.forEach((event) => {
    if (visibleTypes.includes(event.dataset.eventType)) {
      event.style.display = 'flex';
    } else {
      event.style.display = 'none';
    }
  });
}

// Add tooltip functionality
function addTooltips() {
  const events = document.querySelectorAll('.event');
  events.forEach((event) => {
    const title = event.querySelector('.event-title').textContent;
    event.setAttribute('title', title);
  });
}

// Add animation when scrolling
function addScrollAnimation() {
  const months = document.querySelectorAll('.month');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
        }
      });
    },
    { threshold: 0.1 },
  );

  months.forEach((month) => {
    month.style.animationPlayState = 'paused';
    observer.observe(month);
  });
}

// Start loading the calendar
loadCalendar().then(() => {
  addTooltips();
  addScrollAnimation();
});
