/**
 * Google Image Search - Search and deliver image results
 */

const axios = require('axios');

const IMG_BACKEND_URL = process.env.IMG_BACKEND_URL || 'https://jailbreak-img-backend.onrender.com';
const MAX_IMG_RESULTS = Number(process.env.MAX_IMG_RESULTS || 5);

const normalizeUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch (error) {
    return null;
  }
  return null;
};

module.exports = {
  name: 'img',
  aliases: ['image', 'gimg'],
  category: 'media',
  description: 'Search and download images from Google',
  usage: '.img <query>',

  async execute(sock, msg, args, extra) {
    try {
      const query = args.join(' ').trim();

      if (!query) {
        return await extra.reply('⧯ `What image should I search for?` 🖼️');
      }

      await sock.sendMessage(extra.from, {
        react: { text: '⏳', key: msg.key }
      });

      await extra.reply('⎆ `Querying Visual Database...` 🌐');

      const response = await axios.post(
        `${IMG_BACKEND_URL}/img_search`,
        { query },
        { timeout: 20000 }
      );

      const images = response?.data?.images;
      if (!Array.isArray(images) || images.length === 0) {
        await sock.sendMessage(extra.from, {
          react: { text: '❌', key: msg.key }
        });
        return await extra.reply('⫎ `Error: No valid results found.` ❌');
      }

      const validImages = images
        .map(normalizeUrl)
        .filter(Boolean)
        .slice(0, MAX_IMG_RESULTS);

      if (!validImages.length) {
        await sock.sendMessage(extra.from, {
          react: { text: '❌', key: msg.key }
        });
        return await extra.reply('⫎ `Error: No valid image URLs were returned.` ❌');
      }

      await extra.reply(`🖼️ *Found ${validImages.length} result(s) for:* ${query}`);

      for (let index = 0; index < validImages.length; index += 1) {
        const imageUrl = validImages[index];
        await sock.sendMessage(extra.from, {
          image: { url: imageUrl },
          caption:
            `*JAILBREAK IMAGE SEARCH*\n` +
            `Query: ${query}\n` +
            `Result: ${index + 1} of ${validImages.length}\n` +
            `Source: ${imageUrl}`
        }, { quoted: msg });
      }

      await sock.sendMessage(extra.from, {
        react: { text: '✅', key: msg.key }
      });
    } catch (error) {
      console.error('IMG ERROR:', error);
      const errMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      await extra.reply(`⫎ *Error:* \`${errMsg}\`\n\n> ◈ URL: ${IMG_BACKEND_URL}`);
      await sock.sendMessage(extra.from, {
        react: { text: '❌', key: msg.key }
      });
    }
  },
};
