const UrlMapping = require('./models/UrlMapping');

// Function to get short URL from the database
async function getShortUrl(longUrl) {
  const urlMapping = await UrlMapping.findOne({ where: { longUrl } });
  return urlMapping ? urlMapping.shortUrl : null;
}

// Function to save short URL to the database
async function saveShortUrl(shortUrl, longUrl) {
  await UrlMapping.create({ shortUrl, longUrl });
}

// Function to get long URL from the database
async function getLongUrl(shortUrl) {
  const urlMapping = await UrlMapping.findOne({ where: { shortUrl } });
  return urlMapping ? urlMapping.longUrl : null;
}

// Function to increment the count field
async function incrementCount(shortUrl) {
  await UrlMapping.increment('count', { where: { shortUrl } });
}

// Function to get all URL mappings from the database
async function getAllUrlMappings() {
  return await UrlMapping.findAll();
}

module.exports = {
  getShortUrl,
  saveShortUrl,
  getLongUrl,
  incrementCount,
  getAllUrlMappings // Export the new function
};
