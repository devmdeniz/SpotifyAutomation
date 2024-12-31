# Spotify Volume Control for Chrome

A Chrome extension that automatically adjusts Spotify volume when Chrome is playing audio/video content. When you're watching videos or listening to other audio in Chrome, this extension will automatically lower your Spotify volume and restore it when Chrome audio stops.

## Features

- 🔊 Automatic volume adjustment when Chrome plays audio
- 🎚️ Customizable volume reduction level 
- 🔄 Automatic volume restoration when Chrome audio stops
- 🎯 Works with any audio/video content in Chrome
- 🎵 Seamless Spotify integration
- 🔒 Secure authentication with Spotify API

## Installation

### Prerequisites
- Node.js and npm installed
- Python 3.6 or higher
- Spotify Premium account
- Chrome browser

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/spotify-volume-control-extension.git
cd spotify-volume-control-extension
```

### Step 2: Install Dependencies

```bash
npm install
```

### Install Python dependencies
```bash
pip install
```

### Step 3: Configure Spotify API
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add `http://localhost:5000/callback` to Redirect URIs
4. Copy your Client ID and Client Secret
5. Create `.env` file from template:

`bash
cp .env.example .env
`
6. Fill in your Spotify credentials in `.env`:

`bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
`

### Step 4: Start Authentication Server
```bash
python spotify_auth_server.py
```
this step is one time only. When you run this step, you will be redirected to Spotify authorization page. After you authorize the application, you will be redirected to `http://localhost:5000/callback` and you will see your access token and refresh token.
When you see your access token and refresh token, write them to `.env` file.


### Step 5: Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension directory (repo directory)
4. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon in Chrome
2. Click "Login to Spotify" and authorize the application
3. See the status of the connection
4. Use the slider to set your preferred volume level for when Chrome is playing audio
5. Play any audio/video in Chrome - Spotify volume will automatically adjust
6. When Chrome audio stops, Spotify volume will return to 100%

## How It Works

The extension monitors audio activity in Chrome tabs. When audio is detected:

1. Extension checks if Spotify is playing
2. If yes, it reduces Spotify volume to your preset level
3. When Chrome audio stops, Spotify volume is restored
4. All volume changes are smooth and automatic

## Development

To contribute to the development:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
5. Star the repository

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Contact the maintainers

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)