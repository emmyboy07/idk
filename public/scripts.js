let currentTorrent = null;

// 🟢 Global Error Handling Functions
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
}

function clearError() {
  document.getElementById('errorMessage').textContent = '';
}

// 🟢 Movie Search Function (Available Globally)
async function searchMovies() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  clearError();
  showLoading(true);

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();

    if (results.error) throw new Error(results.error);
    displayResults(results);
    
  } catch (error) {
    showError(`Search failed: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// 🟢 Display Search Results
function displayResults(results) {
  const container = document.getElementById('results');
  container.innerHTML = results.map(result => `
    <div class="torrent-card">
      <div class="torrent-info">
        <h3>${result.title}</h3>
        <p>Size: ${result.size} | Seeders: ${result.seeders}</p>
      </div>
      <button onclick="startDownload('${result.magnet}')">
        Download
      </button>
    </div>
  `).join('');
}

// 🟢 Start Download
async function startDownload(magnet) {
  clearError();
  showLoading(true);
  
  try {
    const response = await fetch(`/api/download?magnet=${encodeURIComponent(magnet)}`);
    const data = await response.json();

    if (data.error) throw new Error(data.error);
    
    currentTorrent = data.infoHash;
    setupPlayer(data.fileName);
    trackProgress(data.infoHash);

  } catch (error) {
    showError(`Download failed: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// 🟢 Track Download Progress
function trackProgress(infoHash) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/progress/${infoHash}`);
      const data = await response.json();
      
      document.getElementById('progress').textContent = Math.round(data.progress * 100);
      document.getElementById('status').textContent = data.done ? 'Ready' : 'Downloading...';

      if (data.done) clearInterval(interval);
    } catch (error) {
      console.error('Progress check error:', error);
      clearInterval(interval);
    }
  }, 1000);
}

// 🟢 Setup Player for Streaming
function setupPlayer(fileName) {
  document.getElementById('playerContainer').classList.remove('hidden');
  const streamUrl = `/stream/${currentTorrent}?file=${encodeURIComponent(fileName)}`;
  document.getElementById('videoSource').src = streamUrl;
  document.getElementById('videoPlayer').load();
}

// 🟢 Show/Hide Loading State
function showLoading(show) {
  document.getElementById('searchInput').disabled = show;
}

// =============== DOWNLOAD PAGE FUNCTIONS ===================

// 🟢 Load Downloaded Movies
async function loadDownloads() {
  try {
    const response = await fetch('/api/downloads');
    const downloads = await response.json();

    if (downloads.error) throw new Error(downloads.error);
    displayDownloads(downloads);

  } catch (error) {
    showError(`Failed to load downloads: ${error.message}`);
  }
}

// 🟢 Display Downloaded Files
function displayDownloads(downloads) {
  const container = document.getElementById('downloadsList');
  container.innerHTML = downloads.map(download => `
    <div class="torrent-card">
      <div class="torrent-info">
        <h3>${download.name}</h3>
        <p>Size: ${download.size}</p>
      </div>
      <button onclick="playDownload('${download.fileName}')">
        Play
      </button>
    </div>
  `).join('');
}

// 🟢 Play Downloaded Movie
function playDownload(fileName) {
  document.getElementById('playerContainer').classList.remove('hidden');
  const streamUrl = `/downloads/${encodeURIComponent(fileName)}`;
  document.getElementById('videoSource').src = streamUrl;
  document.getElementById('videoPlayer').load();
}

// 🟢 Run Functions on Page Load
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    console.log("Index page loaded");
  } else if (window.location.pathname.endsWith('downloads.html')) {
    loadDownloads();
  }
});
