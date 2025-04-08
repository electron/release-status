const express = require('express');
const router = express.Router();
const a = require('../utils/a');
const path = require('path');
const fs = require('fs').promises;

const CACHE_FILE = path.join(__dirname, '..', '..', 'cache', 'chromium-releases.json');

async function ensureCacheDir() {
  const cacheDir = path.dirname(CACHE_FILE);
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

async function fetchChromiumReleases() {
  try {
    try {
      const stats = await fs.stat(CACHE_FILE);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      if (cacheAge < 60 * 60 * 1000) {
        const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(cacheData);
      }
    } catch (err) {
      console.log('Cache not available, fetching fresh data');
    }

    const releases = await fetchWithRetry('https://chromiumdash.appspot.com/fetch_releases');
    
    const processedReleases = releases
      .filter(release => 
        release.version && 
        release.channel && 
        release.milestone && 
        release.time
      )
      .map(release => ({
        channel: release.channel,
        version: release.version,
        milestone: release.milestone,
        date: new Date(release.time).toISOString().split('T')[0],
        timestamp: release.time
      }));
    const releasesByDate = {};
    processedReleases.forEach(release => {
      if (!releasesByDate[release.date]) {
        releasesByDate[release.date] = new Map();
      }
      const key = `${release.channel}-${release.version}`;
      if (!releasesByDate[release.date].has(key)) {
        releasesByDate[release.date].set(key, release);
      }
    });

    const finalReleases = {};
    Object.entries(releasesByDate).forEach(([date, releasesMap]) => {
      finalReleases[date] = Array.from(releasesMap.values());
    });

    await ensureCacheDir();
    await fs.writeFile(CACHE_FILE, JSON.stringify(finalReleases, null, 2));
    
    return finalReleases;
  } catch (error) {
    console.error('Error fetching Chromium releases:', error);
    
    try {
      const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
      return JSON.parse(cacheData);
    } catch (err) {
      return {};
    }
  }
}

router.get('/', a(async (req, res) => {
  res.render('chromium', {
    title: 'Chromium Release Calendar',
    css: 'chromium'
  });
}));

router.get('/data.json', a(async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const releasesData = await fetchChromiumReleases();
    
    const formattedData = {};
    
    Object.entries(releasesData).forEach(([date, releases]) => {
      if (!formattedData[date]) {
        formattedData[date] = [];
      }

      const versionMap = new Map();
      
      releases.forEach(release => {
        const versionKey = release.version;
        
        if (!versionMap.has(versionKey)) {
          versionMap.set(versionKey, {
            version: release.version,
            milestone: release.milestone,
            channels: [release.channel],
            date: release.date
          });
        } else {
          const entry = versionMap.get(versionKey);
          if (!entry.channels.includes(release.channel)) {
            entry.channels.push(release.channel);
          }
        }
      });
      
      formattedData[date] = Array.from(versionMap.values());
    });
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error serving releases data:', error);
    res.status(500).json({ error: 'Failed to fetch release data' });
  }
}));

module.exports = router;