# Spotify Authentication Server
# This server handles the OAuth 2.0 authentication flow for Spotify API
# Required environment variables should be set in .env file

from flask import Flask, request, redirect
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Get environment variables
CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
REDIRECT_URI = os.getenv('REDIRECT_URI')

# Authentication endpoints
AUTH_URL = 'https://accounts.spotify.com/authorize'
TOKEN_URL = 'https://accounts.spotify.com/api/token'

# Scopes define the access permissions requested from the user
# Add or remove scopes based on your application's needs
SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-library-read',
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private'
]

@app.route('/')
def index():
    # Generate the Spotify authorization URL
    auth_query = {
        'client_id': CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': REDIRECT_URI,
        'scope': ' '.join(SCOPES)
    }
    
    # Redirect user to Spotify authorization page
    return redirect(f"{AUTH_URL}?{requests.compat.urlencode(auth_query)}")

@app.route('/callback')
def callback():
    # Handle the callback from Spotify
    if 'error' in request.args:
        return f"Error: {request.args['error']}"
    
    if 'code' not in request.args:
        return "Error: No code provided"
    
    # Exchange the authorization code for an access token
    auth_token = request.args['code']
    
    auth_header = requests.auth.HTTPBasicAuth(CLIENT_ID, CLIENT_SECRET)
    auth_data = {
        'grant_type': 'authorization_code',
        'code': auth_token,
        'redirect_uri': REDIRECT_URI
    }
    
    # Make the token request
    response = requests.post(TOKEN_URL, auth=auth_header, data=auth_data)
    
    if response.status_code != 200:
        return f"Error: Failed to get token - {response.reason}"
    
    # Return the access token and other credentials
    token_info = response.json()
    return token_info

if __name__ == '__main__':
    # Start the Flask development server
    # Warning: Use a production server for deployment
    app.run(host='0.0.0.0', port=5000, debug=True) 