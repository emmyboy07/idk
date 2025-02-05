(function () {
  let currentTorrent = null;

  // Shared functions for both pages
  function showError(message) {
    document.getElementById('errorMessage').textContent = message;
  }

  function clearError() {
    document.getElementById('errorMessage').textContent = '';
  }

  // Index.html functions
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    // Add event listeners
    document.getElementById('searchButton').addEventListener('click', searchMovies);
    document.getElementById('viewDownloadsButton').addEventListener('click', () => {
      window.location.href = 'downloads.html';
    });

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
        showError(error.message);
      } finally {
        showLoading(false);
      }
    }

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
        showError(error.message);
      } finally {
        showLoading(false);
      }
    }

    function setupPlayer(fileName) {
      document.getElementById('playerContainer').classList.remove('hidden');
      const streamUrl = `/stream/${currentTorrent}?file=${encodeURIComponent(fileName)}`;
      document.getElementById('videoSource').src = streamUrl;
      document.getElementById('videoPlayer').load();
    }

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

    function displayResults(results) {
      const container = document.getElementById('results');
      container.innerHTML = results.map(result => `
        <div class="torrent-card">
          <div class="torrent-info">
            <h3>${result.title}</h3>
            <p>Size: ${result.size} | Seeders: ${result.seeders}</p>
          </div>
          <button class="downloadButton" data-magnet="${result.magnet}">
            Download
          </button>
        </div>
      `).join('');

      // Add event listeners to download buttons
      document.querySelectorAll('.downloadButton').forEach(button => {
        button.addEventListener('click', () => {
          startDownload(button.dataset.magnet);
        });
      });
    }

    function showLoading(show) {
      document.getElementById('searchInput').disabled = show;
    }
  }

  // Downloads.html functions
  if (window.location.pathname.endsWith('downloads.html')) {
    async function loadDownloads() {
      try {
        const response = await fetch('/api/downloads');
        const downloads = await response.json();
        
        if (downloads.error) throw new Error(downloads.error);
        displayDownloads(downloads);
        
      } catch (error) {
        showError(error.message);
      }
    }

    function displayDownloads(downloads) {
      const container = document.getElementById('downloadsList');
      container.innerHTML = downloads.map(download => `
        <div class="torrent-card">
          <div class="torrent-info">
            <h3>${download.name}</h3>
            <p>Size: ${download.size}</p>
          </div>
          <button class="playButton" data-file="${download.fileName}">
            Play
          </button>
        </div>
      `).join('');

      // Add event listeners to play buttons
      document.querySelectorAll('.playButton').forEach(button => {
        button.addEventListener('click', () => {
          playDownload(button.dataset.file);
        });
      });
    }

    function playDownload(fileName) {
      document.getElementById('playerContainer').classList.remove('hidden');
      const streamUrl = `/downloads/${encodeURIComponent(fileName)}`;
      document.getElementById('videoSource').src = streamUrl;
      document.getElementById('videoPlayer').load();
    }

    // Load downloads when page loads
    window.onload = loadDownloads;
  }
})();