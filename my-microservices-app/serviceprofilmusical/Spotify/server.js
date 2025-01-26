const express = require('express');
const axios = require('axios');
const querystring = require('querystring');

const app = express();
const port = 3000;

const client_id = 'client_id'; // Client ID de Spotify à remplacer
const client_secret = 'client_secret'; //Client Secret de Spotify à remplacer
const redirect_uri = 'http://localhost:3000/callback';

app.get('/login', (req, res) => {
    const scope = 'user-read-private user-read-email playlist-read-private user-library-read';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri
        }));
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
    };

    try {
        const response = await axios.post(authOptions.url, querystring.stringify(authOptions.form), { headers: authOptions.headers });
        const access_token = response.data.access_token;
        const refresh_token = response.data.refresh_token;

        res.send({
            'access_token': access_token,
            'refresh_token': refresh_token
        });
    } catch (error) {
        res.send(error);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
