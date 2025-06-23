function disableAnnotations() {
  var annotations = document.getElementsByClassName('side-right')
  if (document.getElementById('annotations-toggle').textContent === 'Show lyrics only') {
      for (var i=0; i < annotations.length; i++) {
          annotations[i].classList.add('d-none')
      }
      document.getElementById('annotations-toggle').textContent = 'Show explanation'
  } else {
      for (var j=0; j < annotations.length; j++) {
          annotations[j].classList.remove('d-none')
      }
      document.getElementById('annotations-toggle').textContent = 'Show lyrics only'
  }
}

function formatUnixTimestamp(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000); // Convert to milliseconds
  let hours = date.getHours();
  let minutes = date.getMinutes();

  // convert to format "3:05 pm"
  const formattedHours = (hours % 12 === 0) ? 12 : hours % 12;
  const formattedMinutes = (minutes < 10) ? `0${minutes}` : minutes;
  const ampm = (hours >= 12) ? 'pm' : 'am';

  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function convertToLocalTime() {
  // if URL ends in /stream or /stream/
  if (window.location.href.endsWith('/stream') || window.location.href.endsWith('/stream/')) {
      // get all divs with the class stream-card and iterate through them
      // for each div get the unix-timestamp attribute and convert it to local time using formatUnixTimestamp
      // then replace the innerText of the div with class stream-timestamp-time inside the parent div with class stream-timestamp
      document.querySelectorAll('.stream-card').forEach(function (streamCard) {
          const unixTimestamp = streamCard.getAttribute('unix-timestamp');
          const localTime = formatUnixTimestamp(unixTimestamp);
          streamCard.querySelector('.stream-timestamp-time').innerText = localTime;
      }
  )}
}

function copyThoughtLinkToClipboard(element) {
  // get current url
  const currentUrl = window.location.href;
  // remove # from url
  const currentUrlWithoutHash = currentUrl.split('#')[0];
  // copy the element's href link to clipboard
  const link = currentUrlWithoutHash + element.getAttribute('href');
  // clear the clipboard
  navigator.clipboard.writeText('');
  navigator.clipboard.writeText(link);
  console.log("Link copied: ", link);

  // change element inner text to "Copied!", then change it back to "Copy link"
  element.innerText = "Copied!";
  // set box shadow to none by adding no-box-shadow class
  element.classList.add('no-box-shadow');
  setTimeout(function() {
      element.innerText = "Copy link";
      // reset box shadow
      element.classList.remove('no-box-shadow');
  }, 2000);
}

window.onload = function () {
  convertToLocalTime();
}

// Handling Popovers/Tooltips

// Add the 'onclick' attribute to all elements with the 'popover' class
// and assign them a unique ID
const popoverTooltips = document.querySelectorAll('.popover-tooltip');
popoverTooltips.forEach(popover => {
popover.setAttribute('onclick', 'toggleTooltip(this)');
popover.id = 'popover-tooltip-' + Math.floor(Math.random() * 1000000);
});

// Initiate an array to store the self-destruct timers for each tooltip
const tooltipTimers = [];

// The function that toggles the tooltip
function toggleTooltip(el, action) {
// If the tooltip is already visible, remove it
if (el.classList.contains('tooltip-visible') || action === 'remove') {
  const tooltip = document.body.querySelector('#tooltip-' + el.id);
  if (tooltip) { tooltip.remove(); }
  el.classList.remove('tooltip-visible');
} else {
  // If the tooltip is not visible, create it
  const tooltipText = el.getAttribute('tooltip-title');
  const tooltip = document.createElement('div');
  tooltip.innerText = tooltipText;
  tooltip.classList.add('tooltip');
  tooltip.classList.add('show');
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('id', 'tooltip-' + el.id);
  document.body.appendChild(tooltip);
  
  // Call popper with the tooltip and the element that triggered it
  Popper.createPopper(el, tooltip, {
    placement: el.getAttribute('tooltip-position') || 'top',
  });
  // Add the 'tooltip-visible' class to the element that triggered the tooltip
  // so we can track it and remove the tooltip when the user clicks it again
  el.classList.add('tooltip-visible');
  
  // Set a timer to remove the tooltip after 4 seconds
  const removeTooltipTimer = setTimeout(() => {
    toggleTooltip(el, 'remove');
  }, el.getAttribute('tooltip-time') || 4000);

  // Store the timer in the tooltipTimers array
  tooltipTimers.push(removeTooltipTimer);
}
}

// Number of thotes in stream
const streamThoughtsCountEl = document.getElementById('stream-thoughts-count');
if (streamThoughtsCountEl) {
  streamThoughtsCountEl.innerText = document.getElementsByClassName('stream-timestamp').length;
}
