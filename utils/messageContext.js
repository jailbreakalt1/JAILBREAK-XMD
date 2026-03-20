const UNIVERSAL_MESSAGE_CONTEXT = {
  forwardingScore: 1,
  isForwarded: false,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363424536255731@newsletter',
    newsletterName: 'JAILBREAK HOME',
    serverMessageId: -1
  }
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

  return {
    ...content,
    contextInfo: {
      ...(content.contextInfo || {}),
      ...UNIVERSAL_MESSAGE_CONTEXT
    }
  };
};

const wrapSendMessageWithUniversalContext = (sock) => {
  if (!sock || typeof sock.sendMessage !== 'function' || sock.__jbxWrappedSendMessage) {
    return sock;
  }

  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = (jid, content, options) => originalSendMessage(jid, attachUniversalContext(content), options);
  sock.__jbxWrappedSendMessage = true;
  return sock;
};

module.exports = {
  UNIVERSAL_MESSAGE_CONTEXT,
  attachUniversalContext,
  wrapSendMessageWithUniversalContext
};
