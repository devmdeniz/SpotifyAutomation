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
        
        // Notify active tab about new volume level
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateVolume",
                    volume: volume
                }).catch(err => console.log('Tab message error:', err));
            }
        });
    });

    loginButton.addEventListener('click', async () => {
        console.log('Button clicked');
        statusDiv.textContent = 'Connecting...';
        
        try {
            // Get token from storage
            const { spotify_token, token_expiry } = await chrome.storage.local.get(['spotify_token', 'token_expiry']);
            
            if (!spotify_token || Date.now() > token_expiry) {
                throw new Error('Token is invalid or expired');
            }

            // Send token to content script if valid
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "refreshSpotify",
                        token: spotify_token
                    }).catch(err => console.log('Tab message error:', err));
                }
            });

            statusDiv.textContent = 'Connection successful!';
            volumeControl.classList.add('active'); // Show volume control
        } catch (error) {
            console.error('Operation error:', error);
            statusDiv.textContent = 'Connection error: ' + error.message;
        }
    });

    // Check token status when page loads
    try {
        const { spotify_token, token_expiry } = await chrome.storage.local.get(['spotify_token', 'token_expiry']);
        if (spotify_token && Date.now() < token_expiry) {
            statusDiv.textContent = 'Connection active';
            loginButton.textContent = 'Reconnect';
            volumeControl.classList.add('active'); // Show volume control
        }
    } catch (error) {
        console.error('Token status check error:', error);
    }
}); 