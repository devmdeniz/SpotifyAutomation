# Spotify Authentication Server
# This server handles the OAuth 2.0 authentication flow for Spotify API
# Required configuration should be set in config.json file

import json
from flask import Flask, request, redirect, jsonify
import requests
import os
from flask_cors import CORS  # Add CORS support

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load config from config.json
def load_config():
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
        return None

config = load_config()

# Get configuration
CLIENT_ID = config.get('SPOTIFY_CLIENT_ID') if config else None
CLIENT_SECRET = config.get('SPOTIFY_CLIENT_SECRET') if config else None
REDIRECT_URI = config.get('REDIRECT_URI', 'http://localhost:5000/callback')

# Authentication endpoints
AUTH_URL = 'https://accounts.spotify.com/authorize'
TOKEN_URL = 'https://accounts.spotify.com/api/token'

# Scopes define the access permissions requested from the user
# Add or remove scopes based on your application's needs
SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-modify-playback-state',  # Add this scope for volume control
    'user-read-playback-state'     # Add this scope for reading player state
]

@app.route('/')
def index():
    # Generate the Spotify authorization URL with state parameter
    auth_query = {
        'client_id': CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': REDIRECT_URI,
        'scope': ' '.join(SCOPES),
        'show_dialog': 'true',  # Force showing the auth dialog
        'access_type': 'offline'  # Request offline access for refresh token
    }
    
    # Redirect user to Spotify authorization page
    auth_url = f"{AUTH_URL}?{requests.compat.urlencode(auth_query)}"
    return redirect(auth_url)

@app.route('/callback')
def callback():
    # Handle the callback from Spotify
    if 'error' in request.args:
        return jsonify({"error": request.args['error']})
    
    if 'code' not in request.args:
        return jsonify({"error": "No code provided"})
    
    # Exchange the authorization code for an access token
    auth_token = request.args['code']
    
    auth_header = requests.auth.HTTPBasicAuth(CLIENT_ID, CLIENT_SECRET)
    auth_data = {
        'grant_type': 'authorization_code',
        'code': auth_token,
        'redirect_uri': REDIRECT_URI
    }
    
    try:
        # Make the token request
        response = requests.post(TOKEN_URL, auth=auth_header, data=auth_data)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Get token information
        token_info = response.json()
        
        # Create a more user-friendly response
        return jsonify({
            "message": "Authorization successful! Please add the following refresh_token to your config.json file:",
            "refresh_token": token_info.get('refresh_token'),
            "note": "This refresh token will not expire unless you explicitly revoke access. Keep it secure!",
            "full_response": token_info  # Include full response for reference
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Failed to get token",
            "details": str(e)
        })

if __name__ == '__main__':
    # Make sure the redirect URI matches exactly
    print(f"Redirect URI configured as: {REDIRECT_URI}")
    print(f"Client ID: {CLIENT_ID}")
    
    # Start the Flask development server
    app.run(host='localhost', port=5000, debug=True) 