const { nowInConfiguredTimezone, getTimezoneLabel } = require('./timezone');

const UNIVERSAL_MESSAGE_CONTEXT = {
  forwardingScore: 1,
  isForwarded: false,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363424536255731@newsletter',
    newsletterName: 'JAILBREAK HOME',
    serverMessageId: -1
  }
};

const STYLE_BYPASS_PREFIXES = [
  '*╔═══════════════════╗*',
  '╔═══════════════════╗',
  '⧯ *𝙹𝙰𝙸𝙻𝙱𝚁𝙴𝙰𝙺_𝙰𝙸* 𝙱𝚁𝙸𝙽𝙶𝚂 𝚈𝙾𝚄'
];

const decorateText = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  if (STYLE_BYPASS_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return value;
  }

  const now = nowInConfiguredTimezone();

  return `*╔═══════════════════╗*\n` +
    `*║   ₊˚⊹ ᰔ⋆ JAIL BREAK.ai ₊˚ෆ     ║*\n\n` +
    `┌───────────────────┐\n` +
    `  𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙾𝚄𝚃𝙿𝚄𝚃\n` +
    `  ☬ 𝔭𝔦𝔫𝔤   :: \`live\`\n` +
    `  ☬ úṕtíḿé :: \`running\`\n` +
    `  ☬ ̠s̠̠t̠a̠̠t̠̠u̠̠s̠ :: \`Online\`\n` +
    `├───────────────────┤\n` +
    `  𝚃𝙸𝙼𝙸𝙽𝙶 𝙳𝙰𝚃𝙰\n` +
    `  ⧯ 𝒹𝒶𝓉𝑒 :: \`${now.format('DD MMM YYYY')}\`\n` +
    `  ⧯ tเ๓є :: \`${now.format('HH:mm:ss')}\`\n` +
    `  ⧯ ̷z̷̷o̷̷n̷̷e̷: :: \`${getTimezoneLabel()}\`\n` +
    `├───────────────────┤\n` +
    `  𝚁𝙴𝚂𝚄𝙻𝚃\n` +
    `${trimmed.split('\n').map((line) => `  ⨇ ${line}`).join('\n')}\n` +
    `╰────────────────────\n\n` +
    `> ₛYₛₜₑₘ ₒₚₚₑᵣₐₜᵢₒₙₐₗ\n` +
    `╚═══════════════════╝`;
};

const attachUniversalContext = (content = {}) => {
  if (!content || typeof content !== 'object') return content;

  const unsupportedKeys = [
    'react',
    'delete',
    'edit',
    'protocolMessage',
    'contacts',
    'poll',
    'groupInviteMessage'
  ];

  if (unsupportedKeys.some((key) => key in content)) {
    return content;
  }

  const nextContent = {
    ...content,
    contextInfo: {
      ...(content.contextInfo || {}),
      ...UNIVERSAL_MESSAGE_CONTEXT
    }
  };

  if (typeof nextContent.text === 'string') {
    nextContent.text = decorateText(nextContent.text);
  }

  if (typeof nextContent.caption === 'string') {
    nextContent.caption = decorateText(nextContent.caption);
  }

  return nextContent;
};

const wrapSendMessageWithUniversalContext = (sock) => {
  if (!sock || typeof sock.sendMessage !== 'function' || sock.__jbxWrappedSendMessage) {
    return sock;
  }

  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = (jid, content, options = {}) => {
    const { __skipStyle, ...safeOptions } = options || {};
    const payload = __skipStyle ? content : attachUniversalContext(content);
    return originalSendMessage(jid, payload, safeOptions);
  };
  sock.__jbxWrappedSendMessage = true;
  return sock;
};

module.exports = {
  UNIVERSAL_MESSAGE_CONTEXT,
  attachUniversalContext,
  wrapSendMessageWithUniversalContext,
  decorateText
};
