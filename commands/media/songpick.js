const config = require('../../config');

module.exports = {
  name: 'songpick',
  aliases: ['playpick'],
  category: 'media',
  description: 'Deprecated fallback for the simplified song downloader',
  usage: '.song <song name>',

  async execute(sock, msg, _args, extra = {}) {
    await sock.sendMessage(extra.from || msg.key.remoteJid, {
      text: `⧯ ${config.prefix}songpick was removed. Use ${config.prefix}song <song name> instead.`
    }, { quoted: msg });
  }
};
