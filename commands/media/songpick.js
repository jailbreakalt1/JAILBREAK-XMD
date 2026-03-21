/**
 * Song pick fallback command for clients that cannot use interactive buttons
 */

const config = require('../../config');
const songCommand = require('./song');

module.exports = {
  name: 'songpick',
  aliases: ['playpick'],
  category: 'media',
  description: 'Fallback selector for .song/.play interactive downloads',
  usage: '.songpick <audio|document|video>',

  async execute(sock, msg, args, extra = {}) {
    const selection = (args[0] || '').toLowerCase();
    const validSelections = new Map([
      ['audio', 'song_pick_audio'],
      ['document', 'song_pick_document'],
      ['video', 'song_pick_video']
    ]);

    if (!validSelections.has(selection)) {
      await sock.sendMessage(extra.from || msg.key.remoteJid, {
        text: `Usage: ${config.prefix}songpick <audio|document|video>`
      }, { quoted: msg });
      return;
    }

    await songCommand.handleSelection(sock, msg, validSelections.get(selection), extra);
  }
};
