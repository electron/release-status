const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
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
      const n = week * 7 + day - offset;
      const currentDay = new Date(year, month - 1, n, 0, 0, 0, 0);

      const valid = n > 0 && currentDay.getMonth() === month - 1;
      const future = currentDay.getTime() > today.getTime();

      const cell = document.createElement('a');
      cell.classList.add('month_day');

      if (valid) {
        cell.innerText = valid ? `${n}` : '';
        cell.setAttribute('data-date', `${year}-${month}-${n}`);
        const date = `${year}-${month}-${n}`;
        cell.href = `/newreleases?date=${date}`;
      }

      const info = document.createElement('div');
      info.classList.add('info');
      cell.appendChild(info);

      const { hasBeta, hasStable, hasNightly, hasManualEntry } = getDateInfo(year, month, n);

      // if (hasBeta) {
      //   const betaTag = document.createElement('i');
      //   betaTag.classList.add('fas');
      //   betaTag.classList.add('fa-tag');
      //   betaTag.style.backgroundColor = '#6554C0';
      //   info.appendChild(betaTag);
      // }

      if (hasManualEntry) {
        const stableTag = document.createElement('i');
        stableTag.classList.add('fas');
        stableTag.classList.add('fa-tags');
        stableTag.style.backgroundColor = 'blue';
        info.appendChild(stableTag);
      }

      if (hasStable) {
        const stableTag = document.createElement('i');
        stableTag.classList.add('fas');
        stableTag.classList.add('fa-tags');
        stableTag.style.backgroundColor = '#00875A';
        info.appendChild(stableTag);
      }

      // if (!hasNightly && day !== 0 && day !== 6) {
      //   cell.classList.add('no-nightly');
      // }

      // if (hasBeta || hasNightly || hasStable) {
      //   cell.classList.add('has-releases');
      //   cell.href = `/history/${year}-${month < 10 ? `0${month}` : month}-${
      //     n < 10 ? `0${n}` : n
      //   }`;
      // }

      row.appendChild(cell);
    }
  }

  return container;
}
console.log('newreleases.js script loaded');
async function main() {
  let response;
  let num = 0;
  let num1;
  let num2;
  const url = window.location.href;
  console.log('value of url', url.includes('date'));
  if (url.includes('date')) {
    const calendarSection = document.querySelector('main > div .calendar');
    // Clear out the loading...
    calendarSection.innerHTML = '';

    const eventDisplay = document.createElement('div');
    const noeventAdded = document.createElement('div');
    noeventAdded.innerHTML = '<p>No events found for this date.</p>';
    // Container for displaying fetched events
    eventDisplay.classList.add('event-list');

    const eventda = url.split('=')?.[1];

    fetch(`/api/events/${eventda}`)
      .then((response) => response.json())
      .then((events) => {
        if (events.length === 0) {
          noeventAdded.style.display = 'block';
        } else {
          console.log('logging the events', events);
          noeventAdded.style.display = 'none';

          eventDisplay.innerHTML = events
            .map(
              (event) =>
                `<div class="event-item" id="event-${event._id}">
              <div class="event-header">
                <h3>${event.title}</h3>
                <p>${event.description}</p>
              </div>
              <div class="event-actions">
                <button class="update" data-id="${event._id}">Update</button>
                <button class="delete" data-id="${event._id}">Delete</button>
              </div>
              <div class="event-update-form" style="display: none;" id="update-${event._id}">
                <label for="eventtitle-${event._id}">Event Title</label>
                <input type="text" data-id="${event._id}" id="eventtitle-${event._id}" class="title" placeholder="Enter new title" />
                <label for="eventdescription-${event._id}">Event Description</label>
                <input type="text" data-id="${event._id}" id="eventdescription-${event._id}" class="description" placeholder="Enter new description" />
                <button class="send" data-id="${event._id}" id="save-${event._id}" style="display: none;">Save</button>
                <button class="close" data-id="${event._id}">Close</button>
              </div>
            </div>`,
            )
            .join('');

          //Add event listeners for input field
          const titleinput = document.querySelectorAll('.title');
          titleinput.forEach((input) => {
            input.addEventListener('input', async (e) => {
              const id = e.target.getAttribute('data-id');
              const savebutton = document.getElementById(`save-${id}`);

              if (input.value.trim() != '') {
                savebutton.style.display = 'block';
              } else {
                savebutton.style.display = 'none';
              }
            });
          });

          // Add event listeners for update buttons
          const updateButtons = document.querySelectorAll('.update');
          updateButtons.forEach((button) => {
            button.addEventListener('click', async (e) => {
              const id = e.target.getAttribute('data-id');
              const updatediv = document.getElementById(`update-${id}`);

              // Use getComputedStyle to check visibility
              const isVisible = window.getComputedStyle(updatediv).display !== 'none';

              if (isVisible) {
                updatediv.style.display = 'none'; // Hide the div
              } else {
                updatediv.style.display = 'block'; // Show the div
              }
            });
          });

          // Add event listeners for close buttons
          const closeButtons = document.querySelectorAll('.close');
          closeButtons.forEach((button) => {
            button.addEventListener('click', async (e) => {
              const id = e.target.getAttribute('data-id');
              const updatediv = document.getElementById(`update-${id}`);

              // Use getComputedStyle to check visibility
              const isVisible = window.getComputedStyle(updatediv).display !== 'none';

              if (isVisible) {
                updatediv.style.display = 'none'; // Hide the div
              } else {
                updatediv.style.display = 'block'; // Show the div
              }
            });
          });

          // Add event listeners for delete buttons
          const deleteButtons = document.querySelectorAll('.delete');
          deleteButtons.forEach((button) => {
            button.addEventListener('click', async (e) => {
              const id = e.target.getAttribute('data-id');
              console.log('logging the id and its type', id, typeof id);

              try {
                const response = await fetch(`/api/events/delete/${id}`, {
                  method: 'DELETE',
                });

                if (response.ok) {
                  alert('Event deleted successfully!');
                  // Remove the event from the UI
                  const eventElement = document.getElementById(`event-${id}`);
                  if (eventElement) {
                    console.log('logging the event element ', eventElement);
                    eventElement.style.display = 'none';
                    eventElement.remove();
                  }

                  // If no events remain, show the "no events" message
                  if (eventDisplay.children.length === 0) {
                    noeventAdded.style.display = 'block';
                  }
                } else {
                  console.error('Error deleting event:', await response.json().error);
                  alert('Failed to delete the event.');
                }
              } catch (error) {
                console.error('Network error:', error);
                alert('An error occurred while deleting the event.');
              }
            });
          });

          // Add event listeners for save buttons
          const saveButtons = document.querySelectorAll('.send');
          saveButtons.forEach((button) => {
            button.addEventListener('click', async (e) => {
              const id = e.target.getAttribute('data-id');
              const titleInput = document.getElementById(`eventtitle-${id}`);
              const descriptionInput = document.getElementById(`eventdescription-${id}`);
              const updatediv = document.getElementById(`update-${id}`);

              const updatedTitle = titleInput.value.trim();
              const updatedDescription = descriptionInput.value.trim();

              if (!updatedTitle || !updatedDescription) {
                alert('Both title and description are required!');
                return;
              }

              try {
                // Send the updated data to the server
                const response = await fetch(`/api/events/update/${id}`, {
                  method: 'PUT', // Use PUT or PATCH depending on your API
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    title: updatedTitle,
                    description: updatedDescription,
                  }),
                });

                if (response.ok) {
                  alert('Event updated successfully!');

                  // Update the UI with the new title and description
                  const eventElement = document.getElementById(`event-${id}`);
                  const titleElement = eventElement.querySelector('h3');
                  const descriptionElement = eventElement.querySelector('p');

                  titleElement.textContent = updatedTitle;
                  descriptionElement.textContent = updatedDescription;

                  // Hide the update div
                  updatediv.style.display = 'none';
                  titleInput.value = '';
                  descriptionInput.value = '';
                  button.style.display = 'none';
                } else {
                  console.error('Error updating event:', await response.json());
                  alert('Failed to update the event.');
                }
              } catch (error) {
                console.error('Network error:', error);
                alert('An error occurred while updating the event.');
              }
            });
          });
        }
      })
      .catch((error) => {
        console.error('Error fetching events:', error);
        eventDisplay.innerHTML = '<p>Failed to load events.</p>';
      });

    const formContainer = document.createElement('div');
    formContainer.classList.add('event-form-container');

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Event Title:';
    titleLabel.setAttribute('for', 'eventTitle');

    // Create input for event title
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'eventTitle';
    titleInput.name = 'eventTitle';
    titleInput.placeholder = 'Enter event title';

    // Create label for event description
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Event Description:';
    descLabel.setAttribute('for', 'eventDescription');

    // Create textarea for event description
    const descInput = document.createElement('textarea');
    descInput.id = 'eventDescription';
    descInput.name = 'eventDescription';
    descInput.placeholder = 'Enter event description';

    const AddEventTypeButton = document.createElement('button');
    AddEventTypeButton.textContent = 'Add Event Type';
    AddEventTypeButton.style.display = 'none'; // Initially hidden

    // // Append elements to the calendar section
    // calendarSection.appendChild(titleLabel);
    // calendarSection.appendChild(titleInput);
    // calendarSection.appendChild(descLabel);
    // calendarSection.appendChild(descInput);
    // calendarSection.appendChild(AddEventTypeButton);
    // calendarSection.appendChild(noeventAdded);
    // calendarSection.appendChild(eventDisplay);

    calendarSection.appendChild(formContainer);
    formContainer.appendChild(titleLabel);
    formContainer.appendChild(titleInput);
    formContainer.appendChild(descLabel);
    formContainer.appendChild(descInput);
    formContainer.appendChild(AddEventTypeButton);
    formContainer.appendChild(noeventAdded);
    formContainer.appendChild(eventDisplay);

    calendarSection.appendChild(formContainer);

    titleInput.addEventListener('input', () => {
      if (titleInput.value.trim() !== '') {
        console.log('showing button');
        AddEventTypeButton.style.display = 'block'; // Show button
      } else {
        console.log('hidding button');
        AddEventTypeButton.style.display = 'none'; // Hide button
      }
    });

    console.log('logging the value', url.split('=')?.[1]);

    AddEventTypeButton.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      const description = descInput.value.trim();
      const eventd = url.split('=')?.[1];
      console.log('logging the value', typeof eventdate); // Replace this with actual selected date

      if (!title) {
        alert('Event title is required!');
        return;
      }

      const event = { title, description, eventd };

      try {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        const data = await response.json();

        if (response.ok) {
          alert('Event added successfully!');
          titleInput.value = '';
          descInput.value = '';
          AddEventTypeButton.style.display = 'none';
          noeventAdded.style.display = 'none';
          const newEventDiv = document.createElement('div');
          newEventDiv.classList.add('event-item');
          newEventDiv.id = `event-${data.id}`;
          newEventDiv.innerHTML = `
        <h3>${title}</h3>
        <p>${description}</p>
                    <div style="display: none;" id="update-${data.id}">
    <label>Event Title</label>
    <input type="text" data-id="${data.id}" id="eventtitle-${data.id}" class="title" />
    <label>Event Description</label>
    <input type="text" data-id="${data.id}" id="eventdescription-${data.id}" class="description" />
    <button style="display: none;" class='send' data-id="${data.id}" id="save-${data.id}">Save</button>
    <button class="close" data-id="${data.id}">Close</button>
  </div>
        <div>
        <button class='delete' data-id="${data.id}">Delete</button>
        <button class='update' data-id="${data.id}">Update</button>
        </div>
      `;

          // Append to the existing eventDisplay
          eventDisplay.appendChild(newEventDiv);

          //Add event listeners for input field
          const titleinput = document.querySelectorAll('.title');
          titleinput.forEach((input) => {
            input.addEventListener('input', async (e) => {
              const id = e.target.getAttribute('data-id');
              const savebutton = document.getElementById(`save-${id}`);

              if (input.value.trim() != '') {
                savebutton.style.display = 'block';
              } else {
                savebutton.style.display = 'none';
              }
            });
          });

          // Add event listener to the save button of the new event
          const saveButton = newEventDiv.querySelector('.send');
          saveButton.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const titleInput = document.getElementById(`eventtitle-${id}`);
            const descriptionInput = document.getElementById(`eventdescription-${id}`);
            const updatediv = document.getElementById(`update-${id}`);

            const updatedTitle = titleInput.value.trim();
            const updatedDescription = descriptionInput.value.trim();

            if (!updatedTitle || !updatedDescription) {
              alert('Both title and description are required!');
              return;
            }

            try {
              // Send the updated data to the server
              const response = await fetch(`/api/events/update/${id}`, {
                method: 'PUT', // Use PUT or PATCH depending on your API
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title: updatedTitle,
                  description: updatedDescription,
                }),
              });

              if (response.ok) {
                alert('Event updated successfully!');

                // Update the UI with the new title and description
                const titleElement = newEventDiv.querySelector('h3');
                const descriptionElement = newEventDiv.querySelector('p');

                titleElement.textContent = updatedTitle;
                descriptionElement.textContent = updatedDescription;

                // Hide the update div
                updatediv.style.display = 'none';
              } else {
                console.error('Error updating event:', await response.json());
                alert('Failed to update the event.');
              }
            } catch (error) {
              console.error('Network error:', error);
              alert('An error occurred while updating the event.');
            }
          });

          // Add event listener to the delete button of the new event
          const deleteButton = newEventDiv.querySelector('.delete');
          deleteButton.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            console.log('Deleting event with ID:', id);

            try {
              const response = await fetch(`/api/events/delete/${id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                alert('Event deleted successfully!');
                // Remove the event from the UI
                newEventDiv.remove();

                // If no events remain, show the "no events" message
                if (eventDisplay.children.length === 0) {
                  noeventAdded.style.display = 'block';
                }
              } else {
                console.error('Error deleting event:', await response.json());
                alert('Failed to delete the event.');
              }
            } catch (error) {
              console.error('Network error:', error);
              alert('An error occurred while deleting the event.');
            }
          });

          // After dynamically adding a new event
          const newUpdateButton = newEventDiv.querySelector('.update');
          newUpdateButton.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const updatediv = document.getElementById(`update-${id}`);

            const isVisible = window.getComputedStyle(updatediv).display !== 'none';

            if (isVisible) {
              updatediv.style.display = 'none';
            } else {
              updatediv.style.display = 'block';
            }
          });

          const newCloseButton = newEventDiv.querySelector('.close');
          newCloseButton.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const updatediv = document.getElementById(`update-${id}`);

            const isVisible = window.getComputedStyle(updatediv).display !== 'none';

            if (isVisible) {
              updatediv.style.display = 'none';
            } else {
              updatediv.style.display = 'block';
            }
          });
        } else {
          console.error('Error adding event:', await response.json());
        }
      } catch (error) {
        console.error('Network error:', error);
      }
    });

    return;
  }

  let eventslist;

  async function fetchEvents() {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');

      const events = await response.json();
      console.log('Fetched events:', events);
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      return []; // Return an empty array to avoid breaking code
    }
  }

  // Call the function
  // fetchEvents().then(events => {
  //   eventslist=events
  //   console.log("Final events list:", eventslist);
  // });

  eventslist = await fetchEvents();

  if (url.split('=')?.[1] != undefined) {
    num = Number(url.split('=')?.[1]);
    response = await fetch(
      `https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=${(num - 1) * 11}&n=${num * 11}`,
    );
  } else {
    response = await fetch(
      'https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=0&n=11',
    );
  }
  //response = await fetch('https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=0&n=11');
  const releases = await response.json();
  const newreleases = releases?.mstones;
  console.log('Fetched releases:', releases);

  const calendarSection = document.querySelector('main > div .calendar');
  // Clear out the loading...
  calendarSection.innerHTML = '';

  const now = new Date();
  if (num > 0) {
    now.setFullYear(now.getFullYear() + (num - 1));
  }
  //now.setFullYear(now.getFullYear() + (num-1));
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    let year = now.getFullYear();
    let month = now.getMonth() + 1 + monthOffset;
    while (month > 12) {
      month -= 12;
      year++;
    }
    calendarSection.appendChild(
      generateMonth(year, month, (y, m, d) => {
        const datestr = `${y}-${m}-${d}`;
        const dateString = `${y}-${m < 10 ? `0${m}` : m}-${d < 10 ? `0${d}` : d}T00:00:00`;
        const onDate = newreleases.filter((r) => r.stable_date === dateString);
        const manualdates = eventslist?.filter((e) => {
          return e.eventd === datestr;
        });
        return {
          hasBeta: false,
          hasStable: onDate.length == 0 ? false : true,
          hasNightly: false,
          hasManualEntry: manualdates.length == 0 ? false : true,
        };
      }),
    );
  }

  num1 = num + 1;
  num2 = num - 1;
  let prevLink = document.createElement('a');
  let nextLink = document.createElement('a');

  const navigationSection = document.querySelector('div.navigate');
  navigationSection.innerHTML = ''; // Clear previous content

  if (num > 1) {
    prevLink.href = `/newreleases?offset=${num2}`;
    prevLink.textContent = 'Prev';
  }

  if (num == 0) {
    nextLink.href = `/newreleases?offset=${num1 + 1}`;
    nextLink.textContent = 'Next';
  } else {
    nextLink.href = `/newreleases?offset=${num1}`;
    nextLink.textContent = 'Next';
  }

  // Append the links to the navigation section

  if (num == 0) {
    console.log('appending next', num);
    navigationSection.appendChild(nextLink);
  } else {
    navigationSection.appendChild(prevLink);
    navigationSection.appendChild(nextLink);
  }

  // for (let i = 0; i < 12; i++) {
  //     let year = now.getFullYear();
  //     let month = now.getMonth() + 1 + i;
  //     while (month > 12) {
  //       month -= 12;
  //       year++;
  //     }
  //     let fMonth = month;
  //     if (fMonth < 10) {
  //       fMonth = `0${month}`;
  //     }

  //     const dayNodes = [
  //       ...document.querySelectorAll(
  //         `[data-month="${year}-${month}"] .month_row:not(.header):not(.day_row) .month_day:not(:empty):not(:first-child):not(:last-child)`,
  //       ),
  //     ].filter((n) => !!n.innerText);
  //     const count = dayNodes.filter((n) => !n.classList.contains('no-nightly')).length;
  //     const total = dayNodes.length;
  //     const pcnt = Math.round((count * 10000) / total) / 100;

  //     document.querySelector(`[data-nightly="${year}-${month}"]`).innerText = `${pcnt}% nightly`;
  //   }
}

main().catch((err) => {
  console.error(err);
});
