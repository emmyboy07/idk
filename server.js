require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrape1337x } = require('./scraper');
const WebTorrent = require('webtorrent');
const path = require('path');
const fs = require('fs-extra');
const morgan = require('morgan');

const app = express();
const client = new WebTorrent();
const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR || './downloads');

// Ensure download directory exists
fs.ensureDirSync(DOWNLOAD_DIR);

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (update this to your frontend URL in production)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(morgan('dev')); // Logging middleware

// Serve static files (if needed)
app.use('/downloads', express.static(DOWNLOAD_DIR));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`Searching for: ${query}`);
    const results = await scrape1337x(query);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
  try {
    const magnet = req.query.magnet;
    if (!magnet) {
      return res.status(400).json({ error: 'Magnet link is required' });
    }

    console.log(`Starting download: ${magnet.slice(0, 50)}...`);
    const torrent = client.add(magnet, { path: DOWNLOAD_DIR });

    torrent.on('ready', () => {
      const videoFile = torrent.files.find(file => 
        file.name.endsWith('.mp4') || 
        file.name.endsWith('.mkv') ||
        file.name.endsWith('.avi')
      );

      if (!videoFile) {
        return res.status(404).json({ error: 'No video file found in torrent' });
      }

      res.json({
        infoHash: torrent.infoHash,
        fileName: videoFile.name,
        progress: torrent.progress
      });
    });

    torrent.on('error', error => {
      console.error('Torrent error:', error);
      res.status(500).json({ error: error.message });
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Streaming endpoint
app.get('/stream/:infoHash', (req, res) => {
  const torrent = client.get(req.params.infoHash);
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }

  const file = torrent.files.find(f => f.name === req.query.file);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Type', 'video/mp4');
  file.createReadStream().pipe(res);
});

// List downloaded files
app.get('/api/downloads', (req, res) => {
  try {
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const downloads = files.map(file => ({
      name: file,
      size: `${(fs.statSync(path.join(DOWNLOAD_DIR, file)).size / (1024 * 1024)).toFixed(2)} MB`,
      fileName: file
    }));
    res.json(downloads);
  } catch (error) {
    console.error('Error listing downloads:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});