/**
 * ViewOnce Command - Reveal view-once messages
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const config = require('../../config');

const resolveFirstOwnerJid = () => {
  const ownerNumbers = Array.isArray(config.ownerNumber)
    ? config.ownerNumber
    : String(config.ownerNumber || '').split(',');

  const first = ownerNumbers
    .map((value) => String(value || '').trim().replace(/\D/g, ''))
    .filter(Boolean)[0];

  return first ? `${first}@s.whatsapp.net` : null;
};

const buildOwnerHeader = (msg, mediaType) => {
  const origin = msg?.key?.remoteJid || 'unknown';
  const sender = (msg?.key?.participant || msg?.key?.remoteJid || 'unknown').split('@')[0];

  return `╔════════════════════╗\n   ╼ VIEW ONCE REVEAL ╾\n╚════════════════════╝\n⎛\n  ⧯ 𝙸𝙽𝚃𝙴𝚁𝙲𝙴𝙿𝚃𝙴𝙳\n  ◈ From: @${sender}\n  ◈ Origin Chat: ${origin}\n  ◈ Type: \`${mediaType}\`\n⎝\n> ☬ *JAILBREAK SIGHT* ☬`;
};

const safeDeleteTrigger = async (sock, chatId, msgKey) => {
  try {
    await sock.sendMessage(chatId, { delete: msgKey });
  } catch (_) {
    // Best effort only
  }
};

module.exports = {
  name: 'viewonce',
  aliases: ['readvo', 'read', 'vv', 'readviewonce'],
  category: 'general',
  description: 'Reveal view-once messages (images/videos/audio)',
  usage: '.viewonce (reply to view-once message)',

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;

    try {
      const ownerJid = resolveFirstOwnerJid();
      if (!ownerJid) {
        await safeDeleteTrigger(sock, chatId, msg.key);
        return;
      }

      const ctx = msg.message?.extendedTextMessage?.contextInfo
        || msg.message?.imageMessage?.contextInfo
        || msg.message?.videoMessage?.contextInfo
        || msg.message?.buttonsResponseMessage?.contextInfo
        || msg.message?.listResponseMessage?.contextInfo;

      if (!ctx?.quotedMessage || !ctx?.stanzaId) {
        await safeDeleteTrigger(sock, chatId, msg.key);
        return;
      }

      const quotedMsg = ctx.quotedMessage;

      const hasViewOnce =
        !!quotedMsg.viewOnceMessageV2Extension ||
        !!quotedMsg.viewOnceMessageV2 ||
        !!quotedMsg.viewOnceMessage ||
        !!quotedMsg.viewOnce ||
        !!quotedMsg?.imageMessage?.viewOnce ||
        !!quotedMsg?.videoMessage?.viewOnce ||
        !!quotedMsg?.audioMessage?.viewOnce;

      if (!hasViewOnce) {
        await safeDeleteTrigger(sock, chatId, msg.key);
        return;
      }

      let actualMsg = null;
      let mtype = null;

      if (quotedMsg.viewOnceMessageV2Extension?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2Extension.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.viewOnceMessageV2?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.viewOnceMessage?.message) {
        actualMsg = quotedMsg.viewOnceMessage.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.imageMessage?.viewOnce) {
        actualMsg = { imageMessage: quotedMsg.imageMessage };
        mtype = 'imageMessage';
      } else if (quotedMsg.videoMessage?.viewOnce) {
        actualMsg = { videoMessage: quotedMsg.videoMessage };
        mtype = 'videoMessage';
      } else if (quotedMsg.audioMessage?.viewOnce) {
        actualMsg = { audioMessage: quotedMsg.audioMessage };
        mtype = 'audioMessage';
      }

      if (!actualMsg || !mtype) {
        await safeDeleteTrigger(sock, chatId, msg.key);
        return;
      }

      const downloadType = mtype === 'imageMessage'
        ? 'image'
        : mtype === 'videoMessage'
          ? 'video'
          : 'audio';

      const mediaStream = await downloadContentFromMessage(actualMsg[mtype], downloadType);
      let buffer = Buffer.from([]);

      for await (const chunk of mediaStream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (!buffer.length) {
        await safeDeleteTrigger(sock, chatId, msg.key);
        return;
      }

      const caption = actualMsg[mtype]?.caption || '';
      const revealHeader = buildOwnerHeader(msg, mtype);
      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
          newsletterName: config.botName || 'JAILBREAK-XMD',
          serverMessageId: -1
        }
      };

      if (/video/.test(mtype)) {
        await sock.sendMessage(ownerJid, {
          video: buffer,
          caption: `${revealHeader}${caption ? `\n\n📝 ${caption}` : ''}`,
          mimetype: 'video/mp4',
          contextInfo
        });
      } else if (/image/.test(mtype)) {
        await sock.sendMessage(ownerJid, {
          image: buffer,
          caption: `${revealHeader}${caption ? `\n\n📝 ${caption}` : ''}`,
          mimetype: 'image/jpeg',
          contextInfo
        });
      } else if (/audio/.test(mtype)) {
        await sock.sendMessage(ownerJid, { text: revealHeader, contextInfo });
        await sock.sendMessage(ownerJid, {
          audio: buffer,
          ptt: true,
          mimetype: 'audio/ogg; codecs=opus',
          contextInfo
        });
      }

      // Leave no trail in origin chat.
      await safeDeleteTrigger(sock, chatId, msg.key);
    } catch (error) {
      console.error('Error in viewonce command:', error);
      await safeDeleteTrigger(sock, chatId, msg.key);
    }
  }
};
