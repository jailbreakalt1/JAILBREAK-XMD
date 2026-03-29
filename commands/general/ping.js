/**
 * Ping Command - Check bot response time
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { nowInConfiguredTimezone, getTimezoneLabel } = require('../../utils/timezone');
const config = require('../../config');

const BOT_IMAGE_PATH = path.join(__dirname, '../../utils/bot image.png');
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

const buildPingCaption = ({ latency, uptime, now, usedMemory, totalMemory }) =>
  `*╔═══════════════════╗*\n` +
  `*║   ₊˚⊹ ᰔ⋆ JAIL BREAK.ai ₊˚ෆ     ║*\n\n` +
  `┌───────────────────┐\n` +
  `  𝚅𝙸𝚃𝙰𝙻 𝚂𝙸𝙶𝙽𝚂\n` +
  `  ☬ 𝔭𝔦𝔫𝔤   :: \`${latency}ms\`\n` +
  `  ☬ úṕtíḿé :: \`${uptime}\`\n` +
  `  ☬ ̠s̠̠t̠a̠̠t̠̠u̠̠s̠ :: \`Online\`\n` +
  `├───────────────────┤\n` +
  `  𝚃𝙸𝙼𝙸𝙽𝙶 𝙳𝙰𝚃𝙰\n` +
  `  ⧯ 𝒹𝒶𝓉𝑒 :: \`${now.format('DD MMM YYYY')}\`\n` +
  `  ⧯ tเ๓є :: \`${now.format('HH:mm:ss')}\`\n` +
  `  ⧯ ̷z̷̷o̷̷n̷̷e̷: :: \`${getTimezoneLabel()}\`\n` +
  `├───────────────────┤\n` +
  `  ʀᴇꜱᴏᴜʀᴄᴇꜱ\n` +
  `  ⨇ 尺卂爪 :: \`${(usedMemory / 1024 / 1024).toFixed(2)}MB / ${(totalMemory / 1024 / 1024).toFixed(0)}MB\`\n` +
  `  ⨇ ʰᵒˢᵗ :: \`${os.hostname()}\`\n` +
  `  ⨇ ͓̽C͓͓̽̽P͓͓̽̽U͓̽ :: \`x${os.cpus().length} Cores\`\n` +
  `╰────────────────────\n\n` +
  `> ₛYₛₜₑₘ ₒₚₚₑᵣₐₜᵢₒₙₐₗ\n` +
  `╚═══════════════════╝`;

const buildContextInfo = () => ({
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
    newsletterName: config.botName || 'JAILBREAK HOME',
    serverMessageId: -1
  }
});

const buildPingPayload = ({ imageBuffer, responseText }) => {
  if (imageBuffer) {
    return {
      image: imageBuffer,
      caption: responseText,
      contextInfo: buildContextInfo()
    };
  }

  return {
    text: responseText,
    contextInfo: buildContextInfo()
  };
};

module.exports = {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Check bot response time with live system stats',
  usage: '.ping',

  async execute(sock, msg, args, extra) {
    try {
      const imageBuffer = fs.existsSync(BOT_IMAGE_PATH) ? fs.readFileSync(BOT_IMAGE_PATH) : null;

      const timestampStart = process.hrtime.bigint();
      const now = nowInConfiguredTimezone();
      const botLatency = Number((process.hrtime.bigint() - timestampStart) / 1000000n);
      const botUptime = formatUptime(process.uptime());
      const totalMemory = os.totalmem();
      const usedMemory = os.totalmem() - os.freemem();

      const responseText = buildPingCaption({
        latency: botLatency,
        uptime: botUptime,
        now,
        usedMemory,
        totalMemory
      });

      await sock.sendMessage(extra.from, buildPingPayload({
        imageBuffer,
        responseText
      }), { quoted: msg, __skipStyle: true });
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};

module.exports.__testables = {
  BOT_IMAGE_PATH,
  formatUptime,
  buildPingCaption,
  buildContextInfo,
  buildPingPayload
};
