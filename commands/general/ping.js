/**
 * Ping Command - Check bot response time
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require('moment-timezone');
const config = require('../../config');

const BOT_IMAGE_PATH = path.join(__dirname, '../../utils/bot image.png');
const NEWSLETTER_SOURCE_URL = 'https://whatsapp.com/channel/0029VagJIAr3bbVzV70jSU1p';

const formatUptime = (uptimeInSeconds) => {
  const totalSeconds = Math.floor(uptimeInSeconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    `${seconds}s`
  ].filter(Boolean).join(' ');
};

const buildPingCaption = ({ latency, uptime, now, usedMemoryMb, totalMemoryMb }) => [
  '╭━〔 *JAILBREAK SYSTEM : PING* 〕━⬣',
  '┃',
  `┃ ⚡ *Latency:* ${latency}ms`,
  `┃ 🕒 *Uptime:* ${uptime}`,
  '┃ 🟢 *Status:* Online',
  '┃',
  `┃ 📅 *Date:* ${now.format('DD MMM YYYY')}`,
  `┃ ⏰ *Time:* ${now.format('HH:mm:ss')}`,
  `┃ 🌍 *Zone:* ${now.format('z')} (${config.timezone})`,
  '┃',
  `┃ 💾 *RAM:* ${usedMemoryMb}MB / ${totalMemoryMb}MB`,
  `┃ 🖥️ *Host:* ${os.hostname()}`,
  `┃ 🧠 *CPU:* x${os.cpus().length} Cores`,
  '┃',
  '┃ > System operational.',
  '╰━━━━━━━━━━━━━━━━━━━━⬣'
].join('\n');

module.exports = {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Check bot response time with live system stats',
  usage: '.ping',

  async execute(sock, msg, args, extra) {
    try {
      const imageBuffer = fs.existsSync(BOT_IMAGE_PATH) ? fs.readFileSync(BOT_IMAGE_PATH) : null;

      const timestampStart = Date.now();
      const now = moment().tz(config.timezone || 'Africa/Harare');
      const botLatency = Date.now() - timestampStart;
      const botUptime = formatUptime(process.uptime());
      const totalMemoryMb = (os.totalmem() / 1024 / 1024).toFixed(0);
      const usedMemoryMb = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2);

      const responseText = buildPingCaption({
        latency: botLatency,
        uptime: botUptime,
        now,
        usedMemoryMb,
        totalMemoryMb
      });

      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
          newsletterName: 'JAILBREAK HOME',
          serverMessageId: -1
        },
        externalAdReply: {
          title: 'JAILBREAK SYSTEM: PING',
          body: 'Checking Core Latency...',
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: NEWSLETTER_SOURCE_URL,
          ...(imageBuffer ? { thumbnail: imageBuffer } : {})
        }
      };

      if (imageBuffer) {
        await sock.sendMessage(extra.from, {
          image: imageBuffer,
          caption: responseText,
          contextInfo
        }, { quoted: msg });
        return;
      }

      await sock.sendMessage(extra.from, {
        text: responseText,
        contextInfo
      }, { quoted: msg });
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
