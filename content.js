let audioPlaying = false;
let spotifyToken = null;
let lastVolumeCheck = 0;
let userSetVolume = 40; // Default value
const VOLUME_CHECK_INTERVAL = 1000; // 1 second

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
        if (audioPlaying) {
            console.log("Audio is playing in Chrome.");
            await adjustSpotifyVolume(userSetVolume); // Use user-defined level
        } else {
            console.log("No audio playing in Chrome.");
            await adjustSpotifyVolume(100); // Set Spotify volume to 100%
        }
    }
}

// Adjust Spotify volume
async function adjustSpotifyVolume(volume) {
    try {
        // Token check
        if (!spotifyToken) {
            const result = await chrome.storage.local.get(['spotify_token']);
            spotifyToken = result.spotify_token;
            if (!spotifyToken) {
                console.log('Spotify token not found');
                return;
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
                spotifyToken = null;
                return;
            }
            throw new Error(`Could not get player status: ${playerResponse.status}`);
        }

        if (playerResponse.status === 204) {
            console.log('No active Spotify player found');
            return;
        }

        const playerData = await playerResponse.json();
        
        // Adjust volume
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

// Message listener
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "refreshSpotify" && message.token) {
        spotifyToken = message.token;
        console.log('Spotify token updated');
        
        // Load saved volume level
        const { spotify_volume } = await chrome.storage.local.get(['spotify_volume']);
        if (spotify_volume) {
            userSetVolume = parseInt(spotify_volume);
            console.log('Saved volume level loaded:', userSetVolume);
        }
    } else if (message.action === "updateVolume") {
        userSetVolume = parseInt(message.volume);
        console.log('New volume level set:', userSetVolume);
        
        // Apply immediately if audio is playing
        if (audioPlaying) {
            await adjustSpotifyVolume(userSetVolume);
        }
    }
});

// Start volume control
setInterval(checkAudio, VOLUME_CHECK_INTERVAL);

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load token
    const result = await chrome.storage.local.get(['spotify_token', 'spotify_volume']);
    spotifyToken = result.spotify_token;
    
    // Load saved volume level
    if (result.spotify_volume) {
        userSetVolume = parseInt(result.spotify_volume);
    }
    
    if (spotifyToken) {
        console.log('Spotify token loaded');
        console.log('Volume setting:', userSetVolume);
    }
});
