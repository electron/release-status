const timeSince = (str) => {
  const d = new Date();
  const today = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const parts = str.split('-').map((n) => parseInt(n, 10));
  const releaseDate = new Date(parts[0], parts[1], parts[2]);
  const daysAgo = Math.floor((today.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
};

const minutesSince = (str) => {
  const d = new Date(str);
  const now = new Date();
  const since = now.getTime() - d.getTime();
  let minutes = Math.floor(since / 60000);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  minutes = minutes % 60;
  if (minutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${
    minutes !== 1 ? 's' : ''
  } ago`;
};

module.exports = { timeSince, minutesSince };
