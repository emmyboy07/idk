const API_BASE_URL = 'https://idk-x38l.onrender.com/'; // Replace with your Render backend URL

(function () {
  let currentTorrent = null;

  // Shared functions for both pages
  function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearError() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  // Index.html functions
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    // Add event listeners
    const searchButton = document.getElementById('searchButton');
    const viewDownloadsButton = document.getElementById('viewDownloadsButton');

    if (searchButton) {
      searchButton.addEventListener('click', searchMovies);
    }
    if (viewDownloadsButton) {
      viewDownloadsButton.addEventListener('click', () => {
        window.location.href = 'downloads.html';
      });
    }

    async function searchMovies() {
      const query = document.getElementById('searchInput').value.trim();
      if (!query) {
        showError('Please enter a movie name');
        return;
      }

      clearError();
      showLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch search results: ${response.statusText}`);
        }

        const results = await response.json();
        if (results.error) {
          throw new Error(results.error);
        }

        displayResults(results);
      } catch (error) {
        showError(error.message);
        console.error('Search error:', error);
      } finally {
        showLoading(false);
      }
    }

    async function startDownload(magnet) {
      clearError();
      showLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/download?magnet=${encodeURIComponent(magnet)}`);
        if (!response.ok) {
          throw new Error(`Failed to start download: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        currentTorrent = data.infoHash;
        setupPlayer(data.fileName);
        trackProgress(data.infoHash);
      } catch (error) {
        showError(error.message);
        console.error('Download error:', error);
      } finally {
        showLoading(false);
      }
    }

    function setupPlayer(fileName) {
      const playerContainer = document.getElementById('playerContainer');
      const videoSource = document.getElementById('videoSource');
      const videoPlayer = document.getElementById('videoPlayer');

      if (playerContainer && videoSource && videoPlayer) {
        playerContainer.classList.remove('hidden');
        const streamUrl = `${API_BASE_URL}/stream/${currentTorrent}?file=${encodeURIComponent(fileName)}`;
        videoSource.src = streamUrl;
        videoPlayer.load();

        videoPlayer.addEventListener('error', (e) => {
          console.error('Video playback error:', videoPlayer.error);
          showError('Failed to play video. Please try again.');
        });

        videoPlayer.addEventListener('canplay', () => {
          console.log('Enough data available to start playback');
          videoPlayer.play().catch(error => {
            console.log('Autoplay prevented:', error);
            document.getElementById('status').textContent = 'Click to start playback';
          });
        });
      }
    }

    function trackProgress(infoHash) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/progress/${infoHash}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch progress: ${response.statusText}`);
          }

          const data = await response.json();
          const progressElement = document.getElementById('progress');
          const statusElement = document.getElementById('status');

          if (progressElement && statusElement) {
            progressElement.textContent = Math.round(data.progress * 100);
            statusElement.textContent = data.done ? 'Ready' : 'Downloading...';
          }

          if (data.done) {
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Progress check error:', error);
          clearInterval(interval);
        }
      }, 1000);
    }

    function displayResults(results) {
      const container = document.getElementById('results');
      if (!container) return;

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
      const searchInput = document.getElementById('searchInput');
      const searchButton = document.getElementById('searchButton');

      if (searchInput && searchButton) {
        searchInput.disabled = show;
        searchButton.disabled = show;
      }
    }
  }

  // Downloads.html functions
  if (window.location.pathname.endsWith('downloads.html')) {
    async function loadDownloads() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/downloads`);
        if (!response.ok) {
          throw new Error(`Failed to fetch downloads: ${response.statusText}`);
        }

        const downloads = await response.json();
        if (downloads.error) {
          throw new Error(downloads.error);
        }

        displayDownloads(downloads);
      } catch (error) {
        showError(error.message);
        console.error('Error loading downloads:', error);
      }
    }

    function displayDownloads(downloads) {
      const container = document.getElementById('downloadsList');
      if (!container) return;

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
      const playerContainer = document.getElementById('playerContainer');
      const videoSource = document.getElementById('videoSource');
      const videoPlayer = document.getElementById('videoPlayer');

      if (playerContainer && videoSource && videoPlayer) {
        playerContainer.classList.remove('hidden');
        const streamUrl = `${API_BASE_URL}/downloads/${encodeURIComponent(fileName)}`;
        videoSource.src = streamUrl;
        videoPlayer.load();

        videoPlayer.addEventListener('error', (e) => {
          console.error('Video playback error:', videoPlayer.error);
          showError('Failed to play video. Please try again.');
        });

        videoPlayer.addEventListener('canplay', () => {
          console.log('Enough data available to start playback');
          videoPlayer.play().catch(error => {
            console.log('Autoplay prevented:', error);
          });
        });
      }
    }

    // Load downloads when page loads
    window.onload = loadDownloads;
  }
})();