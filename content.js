let audioPlaying = false;
let spotifyToken = null;
let lastVolumeCheck = 0;
let userSetVolume = null; // Initialize as null
const VOLUME_CHECK_INTERVAL = 1000; // 1 second

// Get token from background script
async function getSpotifyToken() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getSpotifyToken' });
        if (response && response.token) {
            spotifyToken = response.token;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error getting token:', error);
        return false;
    }
}

// Check audio status
async function checkAudio() {
    const audioElements = document.querySelectorAll('audio, video');
    let isPlaying = false;

    audioElements.forEach((element) => {
        if (!element.paused && element.volume > 0) {
            isPlaying = true;
        }
    });

    if (isPlaying !== audioPlaying) {
        audioPlaying = isPlaying;
        // Always check token and refresh if needed
        if (!(await getSpotifyToken())) {
            console.log('Getting token...');
            await chrome.runtime.sendMessage({ action: 'refreshSpotifyToken' });
            await getSpotifyToken();
        }

        if (audioPlaying) {
            console.log("Audio is playing in Chrome");
            await adjustSpotifyVolume(userSetVolume);
        } else {
            console.log("No audio playing in Chrome");
            await adjustSpotifyVolume(100);
        }
    }
}

// Adjust Spotify volume
async function adjustSpotifyVolume(volume) {
    try {
        // Volume level check
        if (volume === null || isNaN(volume)) {
            console.log('Invalid volume level, using default value');
            volume = 40; // Default value
        }

        if (!spotifyToken) {
            if (!(await getSpotifyToken())) {
                throw new Error('Spotify token not found');
            }
        }

        // Check current player status first
        const playerResponse = await fetch('https://api.spotify.com/v1/me/player', {
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });

        if (!playerResponse.ok) {
            if (playerResponse.status === 401) {
                // Token invalid, needs refresh
                await chrome.runtime.sendMessage({ action: 'refreshSpotifyToken' });
                await getSpotifyToken();
                return await adjustSpotifyVolume(volume); // Try again
            }
            throw new Error(`Failed to get player status: ${playerResponse.status}`);
        }

        if (playerResponse.status === 204) {
            console.log('No active Spotify player found');
            return;
        }

        const playerData = await playerResponse.json();
        
        // Adjust volume level
        const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Volume adjustment failed: ${response.status}`);
        }

        console.log(`Spotify volume set to ${volume}%`);
    } catch (error) {
        console.error('Spotify volume adjustment error:', error);
        if (error.message.includes('401')) {
            spotifyToken = null;
        }
    }
}

// Load saved volume level
async function loadSavedVolume() {
    try {
        const result = await chrome.storage.local.get(['spotify_volume']);
        const savedVolume = parseInt(result.spotify_volume);
        
        if (!isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 100) {
            userSetVolume = savedVolume;
            console.log('Loaded saved volume level:', userSetVolume);
        } else {
            userSetVolume = 40; // Default value
            console.log('Set default volume level:', userSetVolume);
            // Save default value
            await chrome.storage.local.set({ spotify_volume: userSetVolume });
        }
    } catch (error) {
        console.error('Error loading volume level:', error);
        userSetVolume = 40; // Default value for error case
        // Save default value
        await chrome.storage.local.set({ spotify_volume: userSetVolume });
    }
}

// Message listener
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "tokenRefreshed" && message.token) {
        spotifyToken = message.token;
        console.log('Spotify token updated');
    } else if (message.action === "updateVolume") {
        userSetVolume = parseInt(message.volume);
        console.log('New volume level set:', userSetVolume);
        
        // Apply immediately if audio is playing
        if (audioPlaying) {
            await adjustSpotifyVolume(userSetVolume);
        }
    }
});

// Start audio monitoring
setInterval(checkAudio, VOLUME_CHECK_INTERVAL);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved volume level
    await loadSavedVolume();
    
    // Get token
    await getSpotifyToken();
    
    console.log('Content script initialized');
    console.log('Current volume setting:', userSetVolume);
});
