const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateMonth(year, month, getDateInfo) {
  const container = document.createElement('div');
  container.classList.add('month');
  container.setAttribute('data-month', `${year}-${month}`);

  const header = document.createElement('div');
  header.classList.add('month_row');
  header.classList.add('header');
  container.appendChild(header);

  const monthName = document.createElement('h3');
  monthName.innerText = `${months[month - 1]} ${year}`;
  header.appendChild(monthName);

  const nightlySuccess = document.createElement('p');
  nightlySuccess.setAttribute('data-nightly', `${year}-${month}`);
  nightlySuccess.innerText = '';
  header.appendChild(nightlySuccess);

  const dayRow = document.createElement('div');
  dayRow.classList.add('month_row');
  dayRow.classList.add('day_row');
  container.appendChild(dayRow);

  for (let i = 0; i < 7; i++) {
    const day = document.createElement('div');
    day.classList.add('month_day');
    day.innerText = days[i][0];
    dayRow.appendChild(day);
  }

  const today = new Date();
  const firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const offset = firstDay.getDay() - 1;

  for (let week = 0; week < 6; week++) {
    const row = document.createElement('div');
    row.classList.add('month_row');
    container.appendChild(row);

    for (let day = 0; day < 7; day++) {
      const n = (week * 7) + day - offset;
      const currentDay = new Date(year, month - 1, n, 0, 0, 0, 0);

      const valid = n > 0 && currentDay.getMonth() === month - 1;
      const future = currentDay.getTime() > today.getTime();

      const cell = document.createElement('div');
      cell.classList.add('month_day');
      if (future) {
        cell.classList.add('future');
      }
      cell.innerText = valid ? `${n}` : '';
      cell.setAttribute('data-date', `${year}-${month}-${n}`);

      const info = document.createElement('div');
      info.classList.add('info');
      cell.appendChild(info);

      if (valid && !future) {
        const { hasBeta, hasStable, hasNightly } = getDateInfo(year, month, n);

        if (hasBeta) {
          const betaTag = document.createElement('i');
          betaTag.classList.add('fas');
          betaTag.classList.add('fa-tag');
          betaTag.style.backgroundColor = '#6554C0';
          info.appendChild(betaTag);
        }

        if (hasStable) {
          const stableTag = document.createElement('i');
          stableTag.classList.add('fas');
          stableTag.classList.add('fa-tags');
          stableTag.style.backgroundColor = '#00875A';
          info.appendChild(stableTag);
        }

        if (!hasNightly && day !== 0 && day !== 6) {
          cell.classList.add('no-nightly');
        }

        if (hasBeta || hasNightly || hasStable) {
          cell.classList.add('has-releases');
        }
      }

      row.appendChild(cell);
    }
  }

  return container;
}

async function main() {
  const response = await fetch('/releases.json');
  const releases = await response.json();

  const calendarSection = document.querySelector('main > div');
  // Clear out the loading...
  calendarSection.innerHTML = '';

  const now = new Date();
  for (let monthOffset = 0; monthOffset > -12; monthOffset--) {
    let year = now.getFullYear();
    let month = now.getMonth() + 1 + monthOffset;
    while (month < 1) {
      month += 12;
      year--;
    }
    calendarSection.appendChild(generateMonth(year, month, (y, m, d) => {
      const dateString = `${y}-${m < 10 ? `0${m}` : m}-${d < 10 ? `0${d}` : d}`;
      const onDate = releases.filter(r => r.date === dateString);

      return {
        hasBeta: onDate.some(r => r.version.includes('-beta.')),
        hasStable: onDate.some(r => !r.version.includes('-beta.') && !r.version.includes('-nightly.')),
        hasNightly: onDate.some(r => r.version.includes('-nightly.')),
      }
    }));
  }

  for (let i = 0; i < 12; i++) {
    let year = now.getFullYear();
    let month = now.getMonth() + 1 - i;
    while (month < 1) {
      month += 12;
      year--;
    }
    let fMonth = month;
    if (fMonth < 10) {
      fMonth = `0${month}`;
    }

    const dayNodes = [...document.querySelectorAll(`[data-month="${year}-${month}"] .month_row:not(.header):not(.day_row) .month_day:not(:empty):not(:first-child):not(:last-child)`)].filter(n => !!n.innerText);
    const count = dayNodes.filter(n => !n.classList.contains('no-nightly')).length;
    const total = dayNodes.length;
    const pcnt = Math.round(count * 10000 / total) / 100;

    document.querySelector(`[data-nightly="${year}-${month}"]`).innerText = `${pcnt}% nightly`;
  }
}

main().catch((err) => {
  console.error(err);
});
