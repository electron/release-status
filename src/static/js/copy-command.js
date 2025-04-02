document.addEventListener('DOMContentLoaded', () => {
  const copyButtons = document.querySelectorAll('.copy-button');

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const command = button.getAttribute('data-command');

      try {
        await navigator.clipboard.writeText(command);

        // Visual feedback
        button.classList.add('copied');

        // Reset the button state after animation
        setTimeout(() => {
          button.classList.remove('copied');
        }, 1500);
      } catch (err) {
        console.error('Failed to copy command:', err);
      }
    });
  });
});
