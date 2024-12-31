document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    
    const loginButton = document.getElementById('loginButton');
    const statusDiv = document.getElementById('status');
    const volumeControl = document.getElementById('volumeControl');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    if (!loginButton) {
        console.error('Login button not found!');
        return;
    }

    // Load saved volume level
    const { spotify_volume } = await chrome.storage.local.get(['spotify_volume']);
    if (spotify_volume) {
        volumeSlider.value = spotify_volume;
        volumeValue.textContent = `${spotify_volume}%`;
    }

    // When volume level changes
    volumeSlider.addEventListener('input', async (e) => {
        const volume = e.target.value;
        volumeValue.textContent = `${volume}%`;
        await chrome.storage.local.set({ spotify_volume: volume });
        
        // Send volume command to background script
        chrome.runtime.sendMessage({
            action: 'spotifyCommand',
            command: 'setVolume',
            params: { volume: volume }
        });
    });

    loginButton.addEventListener('click', async () => {
        try {
            // Get token from background script
            const response = await chrome.runtime.sendMessage({ action: 'getSpotifyToken' });
            
            if (!response || !response.token) {
                // If no token, try to refresh using stored refresh token
                chrome.runtime.sendMessage({ action: 'refreshSpotifyToken' });
                statusDiv.textContent = 'Attempting to refresh token...';
                return;
            }

            // Test token validity with a simple Spotify API call
            const testResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${response.token}`
                }
            });

            if (!testResponse.ok) {
                // Token might be expired, try refreshing
                chrome.runtime.sendMessage({ action: 'refreshSpotifyToken' });
                throw new Error('Token needs refresh');
            }

            statusDiv.textContent = 'Connection successful!';
            volumeControl.classList.add('active'); // Show volume control
            loginButton.textContent = 'Reconnect';
        } catch (error) {
            console.error('Error:', error);
            statusDiv.textContent = 'Connection failed. Please try again.';
            loginButton.textContent = 'Retry Connection';
        }
    });

    // Check connection status when popup opens
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getSpotifyToken' });
        if (response && response.token) {
            const testResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${response.token}`
                }
            });

            if (testResponse.ok) {
                statusDiv.textContent = 'Connection active';
                loginButton.textContent = 'Reconnect';
                volumeControl.classList.add('active');
            } else {
                // Token might be expired, try refreshing
                chrome.runtime.sendMessage({ action: 'refreshSpotifyToken' });
                statusDiv.textContent = 'Please login again';
                loginButton.textContent = 'Login';
            }
        }
    } catch (error) {
        console.error('Token status check error:', error);
        statusDiv.textContent = 'Please login to connect';
        loginButton.textContent = 'Login';
    }
}); 