const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
 
  let currentViewMonth;
  let currentViewYear;
  let releasesByDateGlobal;
  let futureMilestonesGlobal = {};
  
  function generateMonth(year, month, getMilestoneInfo) {
    const container = document.createElement('div');
    container.classList.add('month');
    container.setAttribute('data-month', `${year}-${month}`);
  
    const header = document.createElement('div');
    header.classList.add('month_row', 'header');
    container.appendChild(header);
  
    const monthName = document.createElement('h3');
    monthName.innerText = `${months[month - 1]} ${year}`;
    header.appendChild(monthName);
  
    const dayRow = document.createElement('div');
    dayRow.classList.add('month_row', 'day_row');
    container.appendChild(dayRow);
  
    for (let i = 0; i < 7; i++) {
      const day = document.createElement('div');
      day.classList.add('month_day');
      day.innerText = days[i];
      dayRow.appendChild(day);
    }
  
    const today = new Date();
    const firstDay = new Date(year, month - 1, 1);
    const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  
    for (let week = 0; week < 6; week++) {
      const row = document.createElement('div');
      row.classList.add('month_row');
      container.appendChild(row);
  
      for (let day = 0; day < 7; day++) {
        const n = week * 7 + day - offset + 1;
        const currentDay = new Date(year, month - 1, n);
  
        const valid = n > 0 && currentDay.getMonth() === month - 1;
        const future = currentDay.getTime() > today.getTime();
        const isToday = valid && 
          currentDay.getDate() === today.getDate() && 
          currentDay.getMonth() === today.getMonth() && 
          currentDay.getFullYear() === today.getFullYear();
  
        const cell = document.createElement('div');
        cell.classList.add('month_day');
        if (future) {
          cell.classList.add('future');
        }
        if (isToday) {
          cell.classList.add('today');
        }
        cell.innerText = valid ? `${n}` : '';
        
        const formattedMonth = month.toString().padStart(2, '0');
        const formattedDay = n.toString().padStart(2, '0');
        const dateString = valid ? `${year}-${formattedMonth}-${formattedDay}` : '';
        cell.setAttribute('data-date', dateString);
  
        const info = document.createElement('div');
        info.classList.add('info');
        cell.appendChild(info);
  
        if (valid && dateString) {
          const releases = getMilestoneInfo(dateString);
          const futureMilestones = futureMilestonesGlobal[dateString] || [];
          
          if ((releases && releases.length > 0) || (futureMilestones && futureMilestones.length > 0)) {
            cell.classList.add('has-milestone');
            
            const tooltip = document.createElement('div');
            tooltip.classList.add('milestone-tooltip');
            
            const uniqueChannels = new Set();
            
            const versionsByChannel = {
              stable: new Set(),
              beta: new Set(),
              dev: new Set(),
              canary: new Set()
            };
            
            if (releases && releases.length > 0) {
              releases.forEach(release => {
                release.channels.forEach(channel => {
                  const lowerChannel = channel.toLowerCase();
                  
                  if (lowerChannel.includes('extended')) {
                    return;
                  }
                  
                  const normalizedChannel = lowerChannel === 'canary asan' ? 'canary' : lowerChannel;
                  
                  if (['stable', 'beta', 'dev', 'canary'].includes(normalizedChannel)) {
                    uniqueChannels.add(normalizedChannel);
                    
                    if (versionsByChannel[normalizedChannel]) {
                      versionsByChannel[normalizedChannel].add(`${release.version} (M${release.milestone})`);
                    }
                  }
                });
              });
            }
            
            if (futureMilestones && futureMilestones.length > 0) {
              futureMilestones.forEach(milestone => {
                const channel = milestone.channel.toLowerCase();
                
                if (['stable', 'beta'].includes(channel)) {
                  uniqueChannels.add(channel);
                  
                  if (versionsByChannel[channel]) {
                    versionsByChannel[channel].add(`M${milestone.milestone} (Planned)`);
                  }
                }
              });
            }
            
            let tooltipContent = '';
            for (const channel of ['stable', 'beta', 'dev', 'canary']) {
              if (versionsByChannel[channel] && versionsByChannel[channel].size > 0) {
                if (tooltipContent) tooltipContent += '<hr>';
                const versions = [...versionsByChannel[channel]].join(', ');
                tooltipContent += `<b>${channel.charAt(0).toUpperCase() + channel.slice(1)}</b>: ${versions}`;
              }
            }
            
            tooltip.innerHTML = tooltipContent;
            cell.appendChild(tooltip);
            
            const channelOrder = ['stable', 'beta', 'dev', 'canary'];
            const sortedChannels = [...uniqueChannels].sort((a, b) => {
              const orderA = channelOrder.indexOf(a);
              const orderB = channelOrder.indexOf(b);
              return orderA - orderB;
            });
            
            sortedChannels.forEach(channel => {
              const indicator = document.createElement('span');
              indicator.classList.add('channel-dot');
              
              const hasFutureMilestone = futureMilestones.some(m => m.channel.toLowerCase() === channel);
              if (hasFutureMilestone) {
                indicator.classList.add('future-milestone');
              }
              
              indicator.setAttribute('data-channel', channel);
              
              switch(channel) {
                case 'stable':
                  indicator.style.backgroundColor = '#77ADFF'; 
                  break;
                case 'beta':
                  indicator.style.backgroundColor = '#66D99F'; 
                  break;
                case 'dev':
                  indicator.style.backgroundColor = '#FF8A80';
                  break;
                case 'canary':
                  indicator.style.backgroundColor = '#FFD180';
                  break;
              }
              
              info.appendChild(indicator);
            });
          }
        }
  
        row.appendChild(cell);
      }
    }
  
    return container;
  }
  
  function createNavigation() {
    const nav = document.createElement('div');
    nav.classList.add('calendar-navigation');
    
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&larr;';
    prevBtn.classList.add('nav-button', 'prev');
    prevBtn.setAttribute('aria-label', 'Previous months');
    prevBtn.addEventListener('click', navigatePrevious);
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&rarr;';
    nextBtn.classList.add('nav-button', 'next');
    nextBtn.setAttribute('aria-label', 'Next months');
    nextBtn.addEventListener('click', navigateNext);
    
    const currentPeriod = document.createElement('div');
    currentPeriod.classList.add('current-period');
    updateCurrentPeriodText(currentPeriod);
    
    nav.appendChild(prevBtn);
    nav.appendChild(currentPeriod);
    nav.appendChild(nextBtn);
    
    return nav;
  }
  
  function updateCurrentPeriodText(element) {
    if (!element) {
      element = document.querySelector('.current-period');
      if (!element) return;
    }
    
    const nextMonth = currentViewMonth + 1 > 12 ? 1 : currentViewMonth + 1;
    const nextYear = currentViewMonth + 1 > 12 ? currentViewYear + 1 : currentViewYear;
    
    element.textContent = `${months[currentViewMonth-1]} ${currentViewYear} - ${months[nextMonth-1]} ${nextYear}`;
  }
  
  function navigatePrevious() {
    currentViewMonth -= 1;
    if (currentViewMonth < 1) {
      currentViewMonth += 12;
      currentViewYear--;
    }
    renderCalendar();
  }
  
  function navigateNext() {
    currentViewMonth += 1;
    if (currentViewMonth > 12) {
      currentViewMonth -= 12;
      currentViewYear++;
    }
    renderCalendar();
  }
  
  function renderCalendar() {
    const calendarSection = document.querySelector('.chromium-calendar');
    calendarSection.innerHTML = '';
    
    let nextMonth = currentViewMonth + 1;
    let nextYear = currentViewYear;
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear++;
    }
    
    calendarSection.appendChild(
      generateMonth(currentViewYear, currentViewMonth, (dateString) => {
        return releasesByDateGlobal[dateString] || [];
      })
    );
    
    calendarSection.appendChild(
      generateMonth(nextYear, nextMonth, (dateString) => {
        return releasesByDateGlobal[dateString] || [];
      })
    );
    
    updateCurrentPeriodText();
  }
  
  async function fetchFutureMilestones() {
    try {
      const response = await fetch('https://chromiumdash.appspot.com/fetch_milestone_schedule');
      if (!response.ok) {
        throw new Error(`Failed to fetch latest milestone: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.mstones || data.mstones.length === 0) {
        throw new Error('No milestone data received');
      }
      
      const currentMstone = data.mstones[0].mstone;
      console.log(`Current milestone: ${currentMstone}`);
      
      const milestonesObj = {};
      
      processMilestoneData(data.mstones[0], milestonesObj);
      
      const nextMilestones = [];
      for (let i = 1; i <= 10; i++) {
        const nextMstone = currentMstone + i;
        console.log(`Fetching milestone: ${nextMstone}`);
        
        try {
          const nextMilestoneResponse = await fetch(`https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=${nextMstone}`);
          if (nextMilestoneResponse.ok) {
            const nextMilestoneData = await nextMilestoneResponse.json();
            if (nextMilestoneData.mstones && nextMilestoneData.mstones.length > 0) {
              processMilestoneData(nextMilestoneData.mstones[0], milestonesObj);
              nextMilestones.push(nextMilestoneData.mstones[0]);
            }
          }
        } catch (err) {
          console.log(`Error fetching milestone ${nextMstone}:`, err);
        }
      }
      
      console.log(`Fetched ${nextMilestones.length} future milestones`);
      return milestonesObj;
    } catch (error) {
      console.error('Error fetching future milestones:', error);
      return {};
    }
  }
  
  function processMilestoneData(milestone, milestonesObj) {
    if (milestone.earliest_beta) {
      const betaDate = milestone.earliest_beta.split('T')[0]; 
      if (!milestonesObj[betaDate]) {
        milestonesObj[betaDate] = [];
      }
      milestonesObj[betaDate].push({
        milestone: milestone.mstone,
        channel: 'beta',
        version: `M${milestone.mstone}`,
        isFutureMilestone: true
      });
    }
    
    if (milestone.stable_date) {
      const stableDate = milestone.stable_date.split('T')[0]; 
      if (!milestonesObj[stableDate]) {
        milestonesObj[stableDate] = [];
      }
      milestonesObj[stableDate].push({
        milestone: milestone.mstone,
        channel: 'stable',
        version: `M${milestone.mstone}`,
        isFutureMilestone: true
      });
    }
  }
  
  async function main() {
    try {
      const response = await fetch('/chromium/data.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch Chromium releases: ${response.statusText}`);
      }
      
      releasesByDateGlobal = await response.json();
      
      futureMilestonesGlobal = await fetchFutureMilestones();
      
      const calendarContainer = document.querySelector('.chromium-calendar').parentElement;
      
      const navControls = createNavigation();
      calendarContainer.insertBefore(navControls, calendarContainer.firstChild);
      
      const now = new Date();
      currentViewMonth = now.getMonth() + 1;
      currentViewYear = now.getFullYear();
      
      renderCalendar();
      
    } catch (error) {
      console.error('Error loading Chromium releases data:', error);
      document.querySelector('.chromium-calendar').innerHTML = 
        `<div class="error-message">Failed to load Chromium releases data: ${error.message}</div>`;
    }
  }
  
  document.addEventListener('DOMContentLoaded', main);