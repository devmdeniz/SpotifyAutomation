// Background script for Spotify Automation Extension

let spotifyAccessToken = null;
let refreshToken = null;

// Load credentials from config file
async function loadConfig() {
    try {
        const response = await fetch(chrome.runtime.getURL('config.json'));
        if (!response.ok) {
            throw new Error('Failed to read config file');
        }
        const config = await response.json();
        return config;
    } catch (error) {
        console.error('Config loading error:', error);
        return null;
    }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Spotify Automation Extension installed/updated');
    
    try {
        // Get credentials from config file
        const config = await loadConfig();
        if (!config) {
            throw new Error('Failed to load config data');
        }

        // Save credentials to storage
        await chrome.storage.local.set({
            'SPOTIFY_CLIENT_ID': config.SPOTIFY_CLIENT_ID,
            'SPOTIFY_CLIENT_SECRET': config.SPOTIFY_CLIENT_SECRET,
            'SPOTIFY_REFRESH_TOKEN': config.SPOTIFY_REFRESH_TOKEN
        });
        console.log('Credentials saved successfully');

        // Load existing tokens
        const result = await chrome.storage.local.get(['spotifyAccessToken', 'refreshToken']);
        spotifyAccessToken = result.spotifyAccessToken;
        refreshToken = result.refreshToken;
    } catch (error) {
        console.error('Token loading error:', error);
    }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'getSpotifyToken':
            sendResponse({ token: spotifyAccessToken });
            break;
        case 'updateToken':
            spotifyAccessToken = message.token;
            chrome.storage.local.set({ spotifyAccessToken: message.token });
            break;
        case 'refreshSpotifyToken':
            refreshSpotifyToken();
            break;
        case 'spotifyCommand':
            handleSpotifyCommand(message.command, message.params);
            break;
    }
    return true;
});

// Handle Spotify API commands
async function handleSpotifyCommand(command, params) {
    if (!spotifyAccessToken) {
        console.error('No Spotify access token available');
        return;
    }

    const baseUrl = 'https://api.spotify.com/v1';
    let endpoint = '';
    let method = 'GET';
    let body = null;

    switch (command) {
        case 'play':
            endpoint = '/me/player/play';
            method = 'PUT';
            break;
        case 'pause':
            endpoint = '/me/player/pause';
            method = 'PUT';
            break;
        case 'next':
            endpoint = '/me/player/next';
            method = 'POST';
            break;
        case 'previous':
            endpoint = '/me/player/previous';
            method = 'POST';
            break;
        case 'setVolume':
            endpoint = `/me/player/volume?volume_percent=${params.volume}`;
            method = 'PUT';
            break;
    }

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${spotifyAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: body
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, try to refresh
                await refreshSpotifyToken();
            }
            throw new Error(`Spotify API error: ${response.status}`);
        }
    } catch (error) {
        console.error('Error executing Spotify command:', error);
    }
}

// Refresh Spotify access token
async function refreshSpotifyToken() {
    try {
        // Get credentials from chrome.storage.local
        const envVars = await chrome.storage.local.get([
            'SPOTIFY_REFRESH_TOKEN',
            'SPOTIFY_CLIENT_ID',
            'SPOTIFY_CLIENT_SECRET'
        ]);

        const refreshToken = envVars.SPOTIFY_REFRESH_TOKEN;
        const clientId = envVars.SPOTIFY_CLIENT_ID;
        const clientSecret = envVars.SPOTIFY_CLIENT_SECRET;

        if (!refreshToken || !clientId || !clientSecret) {
            throw new Error('Required credentials not found');
        }

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        spotifyAccessToken = data.access_token;
        chrome.storage.local.set({ spotifyAccessToken: data.access_token });

        // Notify all tabs that token has been refreshed
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'tokenRefreshed',
                    token: spotifyAccessToken
                });
            });
        });
    } catch (error) {
        console.error('Token refresh error:', error);
    }
} 