const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const ping = require('../commands/general/ping');

test('ping sends an image payload without external ad reply metadata when the bot image exists', async () => {
  const originalExistsSync = fs.existsSync;
  const originalReadFileSync = fs.readFileSync;
  const calls = [];
  const fakeImage = Buffer.from('image');

  fs.existsSync = (filePath) => filePath === ping.__testables.BOT_IMAGE_PATH;
  fs.readFileSync = (filePath) => {
    if (filePath === ping.__testables.BOT_IMAGE_PATH) {
      return fakeImage;
    }

    return originalReadFileSync(filePath);
  };

  try {
    await ping.execute({
      sendMessage: async (jid, content, options) => {
        calls.push({ jid, content, options });
      }
    }, { key: { remoteJid: 'chat@s.whatsapp.net' } }, [], {
      from: 'chat@s.whatsapp.net',
      reply: async (text) => calls.push({ reply: text })
    });
  } finally {
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].jid, 'chat@s.whatsapp.net');
  assert.deepEqual(calls[0].content.image, fakeImage);
  assert.match(calls[0].content.caption, /JAIL BREAK\.ai/);
  assert.match(calls[0].content.caption, /KWEKWE \(CAT\)/);
  assert.ok(calls[0].content.contextInfo.forwardedNewsletterMessageInfo);
  assert.equal(calls[0].content.contextInfo.externalAdReply, undefined);
});

test('ping falls back to a text payload when the bot image is unavailable', async () => {
  const originalExistsSync = fs.existsSync;
  const calls = [];

  fs.existsSync = () => false;

  try {
    await ping.execute({
      sendMessage: async (jid, content, options) => {
        calls.push({ jid, content, options });
      }
    }, { key: { remoteJid: 'chat@s.whatsapp.net' } }, [], {
      from: 'chat@s.whatsapp.net',
      reply: async (text) => calls.push({ reply: text })
    });
  } finally {
    fs.existsSync = originalExistsSync;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].jid, 'chat@s.whatsapp.net');
  assert.match(calls[0].content.text, /JAIL BREAK\.ai/);
  assert.match(calls[0].content.text, /ₛYₛₜₑₘ ₒₚₚₑᵣₐₜᵢₒₙₐₗ/);
  assert.equal(calls[0].content.image, undefined);
  assert.equal(calls[0].content.contextInfo.externalAdReply, undefined);
});
