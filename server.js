const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 3000;

// Endpoint to get playlists
app.get('/playlists', async (req, res) => {
  try {
    const response = await axios.get('https://www.thesufi.com/music'); // Replace with actual page containing playlists
    const html = response.data;
    const $ = cheerio.load(html);

    const playlists = [];

    // Example: scrape all playlist links (adjust selector according to site structure)
    $('.playlist-card a').each((i, el) => {
      const name = $(el).text().trim();
      const url = $(el).attr('href');
      if(name && url) {
        playlists.push({ name, url });
      }
    });

    res.json(playlists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
