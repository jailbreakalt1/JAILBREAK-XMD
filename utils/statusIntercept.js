/**
 * Auto Status Intercept - forwards viewed WhatsApp statuses to owner.
 */

const config = require('../config');

const STATUS_REACTIONS = ['👍', '👀', '🔥', '🤐', '😮', '🍿', '💯', '😂', '👏', '🥂', '🤔', '🫡', '⚡', '🛸'];
const FALLBACK_PFP = 'https://placehold.co/150x150/1e293b/ffffff?text=JB';

const sanitizeNumberDigits = (value = '') => String(value).replace(/\D/g, '');

const detectMessageType = (message = {}) => {
  const order = ['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage'];
  return order.find((key) => message?.[key]) || Object.keys(message || {})[0] || null;
};

const formatTimestamp = (timestampSeconds = 0) => {
  const date = new Date(Number(timestampSeconds || 0) * 1000);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: config.timezone || 'Africa/Harare',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour12: false
  }).format(date).replace(',', ' •');
};

const isOwnStatus = (sock, posterJid) => {
  const botIds = [
    sock?.user?.id,
    sock?.user?.id?.split(':')[0] ? `${sock.user.id.split(':')[0]}@s.whatsapp.net` : null
  ].filter(Boolean);
  return botIds.includes(posterJid);
};

const resolveOwnerJid = (sock) => {
  const ownerNumber = (Array.isArray(config.ownerNumber) ? config.ownerNumber : [])
    .map((num) => sanitizeNumberDigits(num))
    .find(Boolean);
  if (ownerNumber) return `${ownerNumber}@s.whatsapp.net`;
  return `${sock.user.id.split(':')[0]}@s.whatsapp.net`;
};

async function handleAutoStatusIntercept(sock, msg, { downloadMediaMessage } = {}) {
  try {
    const from = msg?.key?.remoteJid;
    if (from !== 'status@broadcast') return false;

    const posterJid = msg.key?.participant || msg.participant;
    if (!posterJid || posterJid === 'status@broadcast' || isOwnStatus(sock, posterJid)) {
      return true;
    }

    const posterNumber = sanitizeNumberDigits(posterJid.split('@')[0] || '');
    const randomEmoji = STATUS_REACTIONS[Math.floor(Math.random() * STATUS_REACTIONS.length)];
    const targetJid = resolveOwnerJid(sock);

    try {
      await sock.readMessages([msg.key]);
      await sock.sendMessage(
        'status@broadcast',
        { react: { text: randomEmoji, key: msg.key } },
        { statusJidList: [posterJid] }
      );
    } catch (error) {
      console.error('⚠️ [STATUS] Auto view/react failed:', error.message || error);
    }

    const messageData = msg.message?.ephemeralMessage?.message || msg.message || {};
    const messageType = detectMessageType(messageData);
    const body = (
      messageType === 'conversation'
        ? messageData.conversation
        : messageData[messageType]?.caption || messageData[messageType]?.text || ''
    ).trim();

    let profilePicUrl = FALLBACK_PFP;
    try {
      profilePicUrl = await sock.profilePictureUrl(posterJid, 'image');
    } catch (_) {
      profilePicUrl = FALLBACK_PFP;
    }

    const displayName = (msg.pushName || posterNumber || 'Unknown').trim();
    const postedTime = formatTimestamp(msg.messageTimestamp);

    const jbContext = {
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
        newsletterName: 'JAILBREAK HOME',
        serverMessageId: -1
      },
      externalAdReply: {
        title: `STATUS: ${displayName.toUpperCase()}`,
        body: `Captured by ${config.botName} [${randomEmoji}]`,
        thumbnailUrl: profilePicUrl,
        mediaType: 1,
        renderLargerThumbnail: true,
        sourceUrl: `https://github.com/jailbreakalt1/JAILBREAK-XMD`
      }
    };

    let caption = `⚡ *JAILBREAK STATUS INTERCEPT*\n\n`;
    caption += `👤 *Poster:* ${displayName}\n`;
    caption += `📱 *Number:* ${posterNumber}\n`;
    caption += `🕒 *Captured:* ${postedTime}\n`;
    caption += `🎭 *Reaction:* ${randomEmoji}`;
    if (body) caption += `\n\n📝 *Caption:*\n${body}`;

    let messageToSend = {
      text: caption,
      ai: true,
      contextInfo: jbContext
    };

    if (['imageMessage', 'videoMessage', 'audioMessage'].includes(messageType) && downloadMediaMessage) {
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        if (buffer) {
          if (messageType === 'imageMessage') {
            messageToSend = { image: buffer, caption, ai: true, contextInfo: jbContext };
          } else if (messageType === 'videoMessage') {
            messageToSend = { video: buffer, caption, mimetype: 'video/mp4', ai: true, contextInfo: jbContext };
          } else {
            messageToSend = { audio: buffer, mimetype: 'audio/mp4', ptt: true, ai: true, contextInfo: jbContext };
          }
        }
      } catch (error) {
        console.error('❌ [STATUS] Media download failed:', error.message || error);
        messageToSend.text = `${caption}\n\n⚠️ *Media Intercept Failed*`;
      }
    }

    await sock.sendMessage(targetJid, messageToSend);
    console.log(`✅ [STATUS] Intercept logged: ${posterNumber}`);
    return true;
  } catch (error) {
    console.error('❌ [STATUS] Intercept error:', error.message || error);
    return true;
  }
}

module.exports = { handleAutoStatusIntercept };
