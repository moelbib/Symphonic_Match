const axios = require('axios');

const getPlaylists = async (access_token) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching playlists:', error);
        throw error;
    }
};

const getFavoriteTracks = async (access_token) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching favorite tracks:', error);
        throw error;
    }
};

module.exports = {
    getPlaylists,
    getFavoriteTracks
};
