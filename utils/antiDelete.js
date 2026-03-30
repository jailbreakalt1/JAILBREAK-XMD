const fs = require('fs');
const path = require('path');
const config = require('../config');

const STORAGE_LIMIT_HOURS = 6;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const TEMP_DIR = path.join(__dirname, '..', 'temp', 'anti-delete');

const ownerNumbers = Array.isArray(config.ownerNumber)
  ? config.ownerNumber
  : String(config.ownerNumber || '').split(',');

const OWNER_NUMBER = ownerNumbers
  .map((n) => String(n || '').trim().replace(/\D/g, ''))
  .filter(Boolean)[0];

const OWNER_JID = OWNER_NUMBER ? `${OWNER_NUMBER}@s.whatsapp.net` : null;

const jbContext = {
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
    newsletterName: config.botName || 'JAILBREAK-XMD',
    serverMessageId: -1
  }
};

const messageStore = new Map();

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const makeStoreKey = (remoteJid = '', msgId = '') => `${remoteJid}:${msgId}`;

const isInboxJid = (jid = '') =>
  jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid') || jid.endsWith('@hosted');

const getTextContent = (content = {}) => {
  if (content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;
  if (content.imageMessage?.caption) return content.imageMessage.caption;
  if (content.videoMessage?.caption) return content.videoMessage.caption;
  return '';
};

const getMessageContent = (msg) => {
  if (!msg?.message) return null;
  let m = msg.message;
  if (m.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  return m;
};

setInterval(() => {
  const now = Date.now();
  messageStore.forEach((val, key) => {
    if (now - val.timestamp > STORAGE_LIMIT_HOURS * 60 * 60 * 1000) {
      if (val.mediaPath && fs.existsSync(val.mediaPath)) {
        fs.unlinkSync(val.mediaPath);
      }
      messageStore.delete(key);
    }
  });
}, CLEANUP_INTERVAL_MS);

const saveMediaToTemp = (msgId, mtype, buffer) => {
  const extMap = {
    imageMessage: 'jpg',
    videoMessage: 'mp4',
    audioMessage: 'ogg',
    stickerMessage: 'webp',
    documentMessage: 'bin'
  };

  const ext = extMap[mtype] || 'bin';
  const filePath = path.join(TEMP_DIR, `${Date.now()}-${msgId}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

async function storeInboxMessage(sock, msg, options = {}) {
  try {
    if (!msg?.message || msg.key?.fromMe) return;

    const from = msg.key?.remoteJid;
    if (!from || !isInboxJid(from)) return;

    const content = getMessageContent(msg);
    if (!content) return;

    const msgId = msg.key?.id;
    if (!msgId) return;

    const messageType = Object.keys(content)[0];
    if (!messageType || messageType === 'protocolMessage') return;

    const entry = {
      timestamp: Date.now(),
      type: messageType,
      senderJid: msg.key?.participant || from,
      chatJid: from,
      text: getTextContent(content),
      mediaPath: null
    };

    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
    if (mediaTypes.includes(messageType)) {
      const downloader = options.downloadMediaMessage;
      if (typeof downloader === 'function') {
        const mediaBuffer = await downloader(msg, 'buffer', {}, { logger: console });
        if (mediaBuffer && mediaBuffer.length) {
          entry.mediaPath = saveMediaToTemp(msgId, messageType, mediaBuffer);
        }
      }
    }

    messageStore.set(makeStoreKey(from, msgId), entry);
  } catch (error) {
    console.error('AntiDelete store error:', error.message || error);
  }
}

async function recoverDeletedInboxMessage(sock, msg) {
  try {
    if (!OWNER_JID) return;
    if (!msg?.message?.protocolMessage || msg.message.protocolMessage.type !== 0) return;

    const chatJid = msg.key?.remoteJid;
    if (!chatJid || !isInboxJid(chatJid)) return;

    const deletedKey = msg.message.protocolMessage.key || {};
    const deletedId = deletedKey.id;
    const deletedRemoteJid = deletedKey.remoteJid || chatJid;
    if (!deletedId || !deletedRemoteJid) return;

    const data = messageStore.get(makeStoreKey(deletedRemoteJid, deletedId));
    if (!data) return;

    const senderNumber = (data.senderJid || '').split('@')[0] || 'unknown';
    const header = `╔════════════════════╗\n   ╼ RECOVERY ACTIVE ╾\n╚════════════════════╝\n⎛\n  ⧯ 𝙳𝙴𝙻𝙴𝚃𝙴𝙳 𝙸𝙽𝙱𝙾𝚇\n  ◈ Sender: @${senderNumber}\n  ◈ Chat: ${data.chatJid}\n  ◈ Type: \`${data.type}\`\n⎝\n> ☬ *JAILBREAK ANTI-DELETE* ☬`;
    const sendOptions = {
      quoted: msg,
      mentions: [data.senderJid],
      contextInfo: jbContext
    };

    if (data.mediaPath && fs.existsSync(data.mediaPath)) {
      const media = fs.readFileSync(data.mediaPath);
      if (data.type === 'imageMessage') {
        await sock.sendMessage(OWNER_JID, { image: media, caption: header }, sendOptions);
      } else if (data.type === 'videoMessage') {
        await sock.sendMessage(OWNER_JID, { video: media, caption: header }, sendOptions);
      } else if (data.type === 'audioMessage') {
        await sock.sendMessage(OWNER_JID, { text: header }, sendOptions);
        await sock.sendMessage(OWNER_JID, { audio: media, mimetype: 'audio/ogg; codecs=opus', ptt: true }, sendOptions);
      } else if (data.type === 'stickerMessage') {
        await sock.sendMessage(OWNER_JID, { text: header }, sendOptions);
        await sock.sendMessage(OWNER_JID, { sticker: media }, sendOptions);
      } else if (data.type === 'documentMessage') {
        await sock.sendMessage(
          OWNER_JID,
          { document: media, fileName: 'deleted-inbox-file', mimetype: 'application/octet-stream', caption: header },
          sendOptions
        );
      }
    } else if (data.text) {
      await sock.sendMessage(OWNER_JID, { text: `${header}\n\n📝 *Content:* \`${data.text}\`` }, sendOptions);
    }
  } catch (error) {
    console.error('AntiDelete recover error:', error.message || error);
  }
}

async function handleAntiDelete(sock, msg, options = {}) {
  await storeInboxMessage(sock, msg, options);
  await recoverDeletedInboxMessage(sock, msg);
}

module.exports = {
  handleAntiDelete
};
