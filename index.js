// Step 1: Setup Express.js Server
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const Redis = require('ioredis');
const { getShortUrl, saveShortUrl, getLongUrl, incrementCount,getAllUrlMappings} = require('./dbOperations');
const sequelize = require('./db'); // Import the Sequelize instance
const cron = require('node-cron');
const { Op } = require('sequelize');
const UrlMapping = require('./models/UrlMapping');

// Step 2: Middleware setup
app.use(bodyParser.json());

// Step 4: Setup Cache (Redis)
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

async function rateLimiter(req, res, next) {
    const clientIp = req.ip;
    const rateLimitKey = `rate_limit:${clientIp}`;
    const windowSizeInSeconds = 60; // 1 minute window
    const maxRequests = 10; // Allow 10 requests per window
  
    try {
      const currentCount = await redis.incr(rateLimitKey);
  
      if (currentCount === 1) {
        // Set expiration time for the key when it's first created
        await redis.expire(rateLimitKey, windowSizeInSeconds);
      }
  
      if (currentCount > maxRequests) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
  
      next();
    } catch (error) {
      console.error('Rate Limiting Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }
  
  // Apply rate limiting middleware globally
  app.use(rateLimiter);

// Step 5: Base62 Encoding
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function encodeBase62(num) {
  let result = '';
  while (num > 0) {
    result = characters[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

// Step 6: Generate Short URL
async function generateShortUrl(longUrl) {
  const hash = crypto.createHash('sha256').update(longUrl).digest('base64');
  const id = parseInt(hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6), 36);
  const shortUrl = encodeBase62(id);
  return shortUrl;
}

// Step 7: API Endpoint for URL Shortening
app.post('/shorten', async (req, res) => {
// const { longUrl } = req.body;

const longUrl = "https://www.youtube.com/watch?v=CdvGPoKJmsQ&ab_channel=cricket.com.au";

  console.log('req.body', req.body);
  console.log('akash', longUrl);
  try {
    // Step 8: Check Cache
    const cachedShortUrl = await redis.get(longUrl);
    
    if (cachedShortUrl) {
      return res.json({ shortUrl: cachedShortUrl });
    }

    // Step 9: Check Database
    const shortUrl = await getShortUrl(longUrl);
    console.log('shortUrl', shortUrl);
    if (shortUrl) {
      await redis.set(longUrl, shortUrl, 'EX', 3600); // Cache it with 1-hour expiration
      return res.json({ shortUrl });
    }

    // Step 10: Generate New Short URL
    const newShortUrl = await generateShortUrl(longUrl);

    console.log('newShortUrl', newShortUrl);

    // Step 11: Save to Database
    await saveShortUrl(newShortUrl, longUrl);

    // Step 12: Cache the Result
    await redis.set(longUrl, newShortUrl, 'EX', 3600); // Cache it with 1-hour expiration

    res.json({ shortUrl: newShortUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Step 13: Redirection Service
app.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  try {
    // Step 14: Check Cache
    const cachedLongUrl = await redis.get(shortUrl);
    if (cachedLongUrl) {
      await incrementCount(shortUrl); // Increment count
      return res.redirect(cachedLongUrl);
    }

    // Step 15: Check Database
    const longUrl = await getLongUrl(shortUrl);
    if (!longUrl) {
      return res.status(404).send('URL Not Found');
    }

    // Step 16: Cache the Result
    await redis.set(shortUrl, longUrl, 'EX', 3600); // Cache it with 1-hour expiration

    await incrementCount(shortUrl); // Increment count

    res.redirect(longUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Step 20: Health Check API
app.get('/health', async (req, res) => {
  console.log('Health check request received.');
  try {
    // Check MySQL connection
    await sequelize.authenticate();

    // Check Redis connection
    await redis.ping();

    res.status(200).json({ status: 'healthy', message: 'Service is running smoothly.' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: 'Service health check failed.' });
  }
});

// Cron job to remove URL mappings that have expired after 30 days
cron.schedule('0 0 * * *', async () => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - 30);

  try {
    await UrlMapping.destroy({
      where: {
        createdAt: {
          [Op.lt]: expirationDate
        }
      }
    });
    console.log('Expired URL mappings removed successfully.');
  } catch (error) {
    console.error('Error removing expired URL mappings:', error);
  }
});

// Start the Server
const PORT = 3000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
