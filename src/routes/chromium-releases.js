const { Router } = require('express');
const fetch = require('node-fetch');
const Handlebars = require('handlebars');
const a = require('../utils/a');

Handlebars.registerHelper('formatDate', function(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const dayName = dayNames[date.getDay()];
  
  return `${month} ${day}, ${year} (${dayName})`;
});

Handlebars.registerHelper('lookup', function(obj, field) {
  if (!obj) return 'N/A';
  return obj[field] || 'N/A';
});

const router = new Router();
const MS_API_BASE = 'https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=';

const cache = {
  data: null,
  lastFetched: null,
  cacheDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
};

async function fetchMilestoneData() {
  const now = Date.now();
  if (cache.data && cache.lastFetched && (now - cache.lastFetched < cache.cacheDuration)) {
    return cache.data;
  }
  
  const msList = [134, 135, 136, 137];
  const resultData = [];
  
  for (const ms of msList) {
    const response = await fetch(`${MS_API_BASE}${ms}`);
    const jsonData = await response.json();
    if (jsonData.mstones) {
      resultData.push(...jsonData.mstones);
    }
  }
  
  cache.data = resultData;
  cache.lastFetched = now;
  
  return resultData;
}

router.get('/', a(async (req, res) => {
  try {
    const resultData = await fetchMilestoneData();
    
    res.render('chromium-releases', {
      title: 'Chromium Releases',
      data: resultData,
      css: 'chromium-releases'
    });
  } catch (error) {
    console.error('Error fetching Chromium release data:', error);
    res.render('chromium-releases', {
      title: 'Chromium Releases',
      error: 'Failed to fetch release data',
      data: [],
      css: 'chromium-releases'
    });
  }
}));

router.get('/data', a(async (req, res) => {
  try {
    const resultData = await fetchMilestoneData();
    res.json({
      data: resultData,
      lastUpdated: new Date().toLocaleTimeString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}));

module.exports = router;

