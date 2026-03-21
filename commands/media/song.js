/**
 * Song Downloader - interactive .song/.play flow with compatible buttons
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const { sendButtons } = require('gifted-btns');
const config = require('../../config');
const APIs = require('../../utils/api');
const { toAudio } = require('../../utils/converter');

const CHANNEL_URL = 'https://whatsapp.com/channel/0029VagJIAr3bbVzV70jSU1p';
const BOT_IMAGE_PATH = path.join(__dirname, '../../utils/bot image.png');
const PENDING_SONG_TTL_MS = 9 * 60 * 1000;
const BUTTON_AUDIO = 'song_pick_audio';
const BUTTON_DOCUMENT = 'song_pick_document';
const BUTTON_VIDEO = 'song_pick_video';
const pendingSongRequests = new Map();

const AXIOS_DEFAULTS = {
  timeout: 60000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  }
};

const SONG_CONTEXT = {
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
    newsletterName: 'JAILBREAK HOME',
    serverMessageId: -1
  }
};

const resolveSenderJid = (msg, fallbackSender) => msg?.key?.participant || fallbackSender || msg?.key?.remoteJid || '';
const buildRequestKey = ({ from, senderJid }) => `${from}:${senderJid}`;
const sanitizeFileName = (value, fallback) => (value || fallback || 'media').replace(/[^\w\s-]/g, '').trim() || fallback;

const cleanupTempAudioFiles = () => {
  try {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) return;

    const now = Date.now();
    for (const file of fs.readdirSync(tempDir)) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs <= 10000) continue;
        if (file.endsWith('.mp3') || file.endsWith('.m4a') || file.endsWith('.ogg') || /^\d+\.(mp3|m4a|ogg|wav)$/.test(file)) {
          fs.unlinkSync(filePath);
        }
      } catch (_) {}
    }
  } catch (_) {}
};

const setPendingSongRequest = (key, payload) => {
  const previous = pendingSongRequests.get(key);
  if (previous?.timeoutRef) clearTimeout(previous.timeoutRef);

  const timeoutRef = setTimeout(() => pendingSongRequests.delete(key), PENDING_SONG_TTL_MS);
  pendingSongRequests.set(key, { ...payload, timeoutRef, createdAt: Date.now() });
};

const pullPendingSongRequest = (key) => {
  const pending = pendingSongRequests.get(key);
  if (!pending) return null;
  if (pending.timeoutRef) clearTimeout(pending.timeoutRef);
  pendingSongRequests.delete(key);
  return pending;
};

const getLocalBotImage = () => {
  try {
    return fs.existsSync(BOT_IMAGE_PATH) ? fs.readFileSync(BOT_IMAGE_PATH) : null;
  } catch (_) {
    return null;
  }
};

const fetchBufferFromUrl = async (url) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: {
      ...AXIOS_DEFAULTS.headers,
      Accept: '*/*'
    }
  });

  const buffer = Buffer.from(response.data || []);
  return buffer.length ? buffer : null;
};

const resolvePreviewBuffer = async (thumbnailUrl) => {
  try {
    if (thumbnailUrl) {
      const remoteBuffer = await fetchBufferFromUrl(thumbnailUrl);
      if (remoteBuffer) return remoteBuffer;
    }
  } catch (error) {
    console.warn('[SONG] thumbnail fallback:', error?.message || error);
  }

  return getLocalBotImage();
};

const buildContextInfo = ({ title, body, sourceUrl, thumbnailBuffer }) => ({
  ...SONG_CONTEXT,
  externalAdReply: {
    title,
    body,
    mediaType: 1,
    renderLargerThumbnail: true,
    sourceUrl: sourceUrl || CHANNEL_URL,
    ...(thumbnailBuffer ? { thumbnail: thumbnailBuffer } : {})
  }
});

const buildCaption = ({ info, author, ago, mention, emoji }) => [
  '╭━〔 *JAILBREAK PLAY* 〕━⬣',
  `┃ 🎵 *Title:* ${info.title}`,
  `┃ 👤 *Artist:* ${author}`,
  `┃ ⏱️ *Duration:* ${info.timestamp}`,
  `┃ 📅 *Released:* ${ago}`,
  '┃',
  `┃ @${mention} enjoy ${emoji}`,
  '┃ > Powered by JAILBREAK-XMD',
  '╰━━━━━━━━━━━━━━━━━━⬣'
].join('\n');

const resolveSong = async (query) => {
  let video = null;

  if (query.includes('youtube.com/') || query.includes('youtu.be/')) {
    const search = await yts(query);
    video = search?.videos?.[0] || { url: query };
  } else {
    const search = await yts(query);
    if (!search?.videos?.length) return null;
    video = search.videos[0];
  }

  return {
    url: video.url || query,
    info: {
      title: video.title || 'Unknown Title',
      timestamp: video.timestamp || 'Unknown',
      thumbnail: video.thumbnail || null
    },
    author: video.author?.name || 'Unknown Artist',
    ago: video.ago || 'Recently',
    thumbnail: video.thumbnail || null
  };
};

const resolveAudioDownload = async (url) => {
  const apiMethods = [
    { name: 'EliteProTech', method: () => APIs.getEliteProTechDownloadByUrl(url) },
    { name: 'Yupra', method: () => APIs.getYupraDownloadByUrl(url) },
    { name: 'Okatsu', method: () => APIs.getOkatsuDownloadByUrl(url) },
    { name: 'Izumi', method: () => APIs.getIzumiDownloadByUrl(url) }
  ];

  let lastError;
  for (const apiMethod of apiMethods) {
    try {
      const payload = await apiMethod.method();
      const mediaUrl = payload.download || payload.dl || payload.url || payload.result?.download || payload.result?.url;
      if (mediaUrl) return { payload, mediaUrl };
    } catch (error) {
      lastError = error;
      console.warn(`[SONG][AUDIO] ${apiMethod.name} failed:`, error?.message || error);
    }
  }

  throw lastError || new Error('All audio download sources failed.');
};

const resolveVideoDownload = async (url) => {
  const apiMethods = [
    { name: 'EliteProTech', method: () => APIs.getEliteProTechVideoByUrl(url) },
    { name: 'Yupra', method: () => APIs.getYupraVideoByUrl(url) },
    { name: 'Okatsu', method: () => APIs.getOkatsuVideoByUrl(url) }
  ];

  let lastError;
  for (const apiMethod of apiMethods) {
    try {
      const payload = await apiMethod.method();
      const mediaUrl = payload.download || payload.dl || payload.url || payload.result?.mp4 || payload.result?.download;
      if (mediaUrl) return { payload, mediaUrl };
    } catch (error) {
      lastError = error;
      console.warn(`[SONG][VIDEO] ${apiMethod.name} failed:`, error?.message || error);
    }
  }

  throw lastError || new Error('All video download sources failed.');
};

const downloadBufferWithFallback = async (mediaUrl) => {
  try {
    const arrayBufferResponse = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      timeout: 90000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      decompress: true,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': AXIOS_DEFAULTS.headers['User-Agent'],
        Accept: '*/*',
        'Accept-Encoding': 'identity'
      }
    });

    const buffer = Buffer.from(arrayBufferResponse.data || []);
    if (buffer.length) return buffer;
    throw new Error('Empty buffer in arraybuffer mode');
  } catch (downloadError) {
    const statusCode = downloadError.response?.status || downloadError.status;
    if (statusCode === 451) throw downloadError;

    const streamResponse = await axios.get(mediaUrl, {
      responseType: 'stream',
      timeout: 90000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': AXIOS_DEFAULTS.headers['User-Agent'],
        Accept: '*/*',
        'Accept-Encoding': 'identity'
      }
    });

    const chunks = [];
    await new Promise((resolve, reject) => {
      streamResponse.data.on('data', (chunk) => chunks.push(chunk));
      streamResponse.data.on('end', resolve);
      streamResponse.data.on('error', reject);
    });

    const streamBuffer = Buffer.concat(chunks);
    if (!streamBuffer.length) throw new Error('Empty buffer in stream mode');
    return streamBuffer;
  }
};

const normalizeAudioBuffer = async (audioBuffer) => {
  const firstBytes = audioBuffer.slice(0, 12);
  const hexSignature = firstBytes.toString('hex');
  const asciiSignature = audioBuffer.slice(4, 8).toString('ascii');

  let extension = 'mp3';
  if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
    extension = 'm4a';
  } else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') {
    extension = 'ogg';
  } else if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
    extension = 'wav';
  } else if (
    audioBuffer.toString('ascii', 0, 3) === 'ID3' ||
    (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0)
  ) {
    extension = 'mp3';
  }

  if (extension === 'mp3') {
    return { buffer: audioBuffer, mimetype: 'audio/mpeg', extension: 'mp3' };
  }

  const convertedBuffer = await toAudio(audioBuffer, extension);
  if (!convertedBuffer?.length) throw new Error('Failed to convert audio to MP3');
  return { buffer: convertedBuffer, mimetype: 'audio/mpeg', extension: 'mp3' };
};

const sendPickerButtons = async ({ sock, msg, from, title, duration, prefix }) => {
  const payload = {
    title: 'JAILBREAK PLAY OPTIONS',
    text: `*${title}*\n⏱ Duration: ${duration}\n\nChoose how you want the download delivered.`,
    footer: '> Powered by JAILBREAK-XMD',
    buttons: [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: 'Audio', id: BUTTON_AUDIO })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: 'Document', id: BUTTON_DOCUMENT })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: 'Video', id: BUTTON_VIDEO })
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: 'Join Channel', url: CHANNEL_URL })
      }
    ]
  };

  try {
    await sendButtons(sock, from, payload, { quoted: msg });
  } catch (error) {
    console.warn('[SONG] interactive fallback:', error?.message || error);
    await sock.sendMessage(from, {
      text: `*${title}*\n⏱ Duration: ${duration}\n\nReply with one of:\n• ${prefix}songpick audio\n• ${prefix}songpick document\n• ${prefix}songpick video`
    }, { quoted: msg });
  }
};

const songCommand = {
  name: 'song',
  aliases: ['play', 'music', 'yta'],
  category: 'media',
  description: 'Search a YouTube track and choose audio, document, or video delivery',
  usage: '.song <song name or YouTube link>',

  async execute(sock, msg, args, extra = {}) {
    try {
      const from = extra.from || msg.key.remoteJid;
      const prefix = extra.prefix || config.prefix || '.';
      const query = args.join(' ').trim();

      if (!query) {
        await sock.sendMessage(from, {
          text: '⧯ Provide a song name or YouTube link.\n\nExample: .play Focalistic Ke Star'
        }, { quoted: msg });
        return;
      }

      if (typeof extra.react === 'function') {
        await extra.react('🎧');
      }

      const resolved = await resolveSong(query);
      if (!resolved) {
        await sock.sendMessage(from, { text: '❌ No results found for that query.' }, { quoted: msg });
        return;
      }

      const previewBuffer = await resolvePreviewBuffer(resolved.thumbnail);
      const senderJid = resolveSenderJid(msg, extra.sender);
      const requestKey = buildRequestKey({ from, senderJid });

      setPendingSongRequest(requestKey, {
        ...resolved,
        from,
        senderJid,
        pushName: (extra.pushName || msg.pushName || senderJid.split('@')[0] || 'user').replace(/[^\w]/g, ''),
        previewBuffer
      });

      const contextInfo = buildContextInfo({
        title: resolved.info.title,
        body: `Duration: ${resolved.info.timestamp} • Choose a download mode`,
        sourceUrl: CHANNEL_URL,
        thumbnailBuffer: previewBuffer
      });

      const previewPayload = previewBuffer
        ? {
            image: previewBuffer,
            caption: `🎵 *${resolved.info.title}*\n👤 ${resolved.author}\n⏱ ${resolved.info.timestamp}\n\nSelect a format below.`,
            contextInfo
          }
        : {
            text: `🎵 *${resolved.info.title}*\n👤 ${resolved.author}\n⏱ ${resolved.info.timestamp}\n\nSelect a format below.`,
            contextInfo
          };

      await sock.sendMessage(from, previewPayload, { quoted: msg });
      await sendPickerButtons({
        sock,
        msg,
        from,
        title: resolved.info.title,
        duration: resolved.info.timestamp,
        prefix
      });

      if (typeof extra.react === 'function') {
        await extra.react('✅');
      }
    } catch (error) {
      console.error('[SONG] command error:', error);
      await sock.sendMessage(extra.from || msg.key.remoteJid, {
        text: `❌ Failed to prepare your song request: ${error.message}`
      }, { quoted: msg });

      if (typeof extra.react === 'function') {
        await extra.react('❌');
      }
    }
  },

  async handleSelection(sock, msg, selection, extra = {}) {
    const from = extra.from || msg.key.remoteJid;
    const senderJid = resolveSenderJid(msg, extra.sender);
    const requestKey = buildRequestKey({ from, senderJid });
    const pending = pullPendingSongRequest(requestKey);

    if (!pending) {
      await sock.sendMessage(from, {
        text: `⌛ Your play menu expired. Run ${config.prefix}play <song name> again.`
      }, { quoted: msg });
      return;
    }

    try {
      if (typeof extra.react === 'function') {
        await extra.react('⏳');
      }

      const mentionId = pending.senderJid.split('@')[0];

      if (selection === BUTTON_VIDEO || selection === 'video') {
        const { payload, mediaUrl } = await resolveVideoDownload(pending.url);
        const videoBuffer = await downloadBufferWithFallback(mediaUrl);
        const fileName = `${sanitizeFileName(payload.title || pending.info.title, 'video')}.mp4`;
        const caption = buildCaption({
          info: pending.info,
          author: pending.author,
          ago: pending.ago,
          mention: mentionId,
          emoji: '🎬'
        });

        const contextInfo = buildContextInfo({
          title: pending.info.title,
          body: `Duration: ${pending.info.timestamp} • JAILBREAK VIDEO`,
          sourceUrl: pending.url,
          thumbnailBuffer: pending.previewBuffer
        });

        try {
          await sock.sendMessage(from, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            fileName,
            caption,
            mentions: [pending.senderJid],
            contextInfo
          }, { quoted: msg });
        } catch (videoError) {
          console.warn('[SONG] video preview fallback:', videoError?.message || videoError);
          await sock.sendMessage(from, {
            document: videoBuffer,
            mimetype: 'video/mp4',
            fileName,
            caption: `${caption}\n\n⚠️ Video preview was not supported on this client, so it was sent as a file.`,
            mentions: [pending.senderJid],
            contextInfo
          }, { quoted: msg });
        }
      } else {
        const { payload, mediaUrl } = await resolveAudioDownload(pending.url);
        const rawAudioBuffer = await downloadBufferWithFallback(mediaUrl);
        const normalizedAudio = await normalizeAudioBuffer(rawAudioBuffer);
        const fileName = `${sanitizeFileName(payload.title || pending.info.title, 'song')}.${normalizedAudio.extension}`;
        const caption = buildCaption({
          info: pending.info,
          author: pending.author,
          ago: pending.ago,
          mention: mentionId,
          emoji: '🎧'
        });

        const contextInfo = buildContextInfo({
          title: pending.info.title,
          body: `Duration: ${pending.info.timestamp} • JAILBREAK AUDIO`,
          sourceUrl: pending.url,
          thumbnailBuffer: pending.previewBuffer
        });

        if (selection === BUTTON_DOCUMENT || selection === 'document') {
          await sock.sendMessage(from, {
            document: normalizedAudio.buffer,
            mimetype: normalizedAudio.mimetype,
            fileName,
            caption,
            mentions: [pending.senderJid],
            contextInfo
          }, { quoted: msg });
        } else {
          await sock.sendMessage(from, {
            audio: normalizedAudio.buffer,
            mimetype: normalizedAudio.mimetype,
            fileName,
            ptt: false,
            contextInfo
          }, { quoted: msg });

          await sock.sendMessage(from, {
            text: caption,
            mentions: [pending.senderJid],
            contextInfo
          }, { quoted: msg });
        }
      }

      cleanupTempAudioFiles();

      if (typeof extra.react === 'function') {
        await extra.react('✅');
      }
    } catch (error) {
      console.error('[SONG] selection error:', error);
      await sock.sendMessage(from, {
        text: `❌ Failed to complete download: ${error.response?.data?.error || error.message}`
      }, { quoted: msg });

      if (typeof extra.react === 'function') {
        await extra.react('❌');
      }
    }
  }
};

module.exports = songCommand;
