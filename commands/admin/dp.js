const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getTempDir, deleteTempFile } = require('../../utils/tempManager');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const getImageMessage = (msg) => {
  const directImage = msg.message?.imageMessage;
  if (directImage) return directImage;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted?.imageMessage) return quoted.imageMessage;

  return null;
};

module.exports = {
  name: 'dp',
  aliases: ['setdp', 'botdp'],
  category: 'admin',
  description: 'Set the bot profile photo from a sent or replied image',
  usage: '.dp (send or reply to an image)',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    const imageMessage = getImageMessage(msg);

    if (!imageMessage) {
      return extra.reply('⫎ Send an image with `.dp` caption or reply to an image with `.dp` 🖼️');
    }

    const tmpDir = getTempDir();
    const imagePath = path.join(tmpDir, `jbx-dp-${Date.now()}.jpg`);

    try {
      await extra.react('⏳');

      const stream = await downloadContentFromMessage(imageMessage, 'image');
      let buffer = Buffer.alloc(0);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (!buffer.length) {
        return extra.reply('⫎ Unable to read image payload. ❌');
      }

      if (buffer.length > MAX_FILE_SIZE) {
        return extra.reply(`❌ File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      fs.writeFileSync(imagePath, buffer);

      const ownJid = `${(sock.user?.id || '').split(':')[0]}@s.whatsapp.net`;
      await sock.updateProfilePicture(ownJid, { url: imagePath });

      await extra.reply('✅ Profile picture updated.');
      await extra.react('✅');
    } catch (error) {
      console.error('DP command error:', error);
      await extra.reply(`⫎ *System Error:* \`${error?.message || 'unknown error'}\``);
      await extra.react('❌');
    } finally {
      deleteTempFile(imagePath);
    }
  }
};
