/**
 * Global Configuration for WhatsApp MD Bot
 */

module.exports = {
    // Bot Owner Configuration
    ownerNumber: ['263738104222','263717456159'], // Add your number without + or spaces
    ownerName: ['JAILBREAK-XMD', 'Ryan'], // Owner names corresponding to ownerNumber array
    
    // Bot Configuration
    botName: 'JAILBREAK-XMD',
    prefix: '.',
    sessionName: 'session',
    sessionID: process.env.SESSION_ID || '',
    newsletterJid: '120363161513685998@newsletter', // Newsletter JID for menu forwarding
    updateZipUrl: 'https://github.com/jailbreakalt1/JAILBREAK-XMD/archive/refs/heads/main.zip', // URL to latest code zip for .update command
    
    // Sticker Configuration
    packname: 'JAILBREAK-XMD',
    
    // Bot Behavior
    selfMode: true, // Private mode - only owner can use commands
    autoRead: false,
    autoTyping: false,
    autoBio: false,
    autoSticker: false,
    autoReact: false,
    autoReactMode: 'bot', // set bot or all via cmd
    autoDownload: false,
    
    // Group Settings Defaults
    defaultGroupSettings: {
      antilink: false,
      antilinkAction: 'delete', // 'delete', 'kick', 'warn'
      antitag: false,
      antitagAction: 'delete',
      antiall: false, // Owner only - blocks all messages from non-admins
      antiviewonce: true,
      antibot: false,
      anticall: false, // Anti-call feature
      antigroupmention: false, // Anti-group mention feature
      antigroupmentionAction: 'delete', // 'delete', 'kick'
      welcome: false,
      welcomeMessage: '╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @user 👋\n┃Member count: #memberCount\n┃𝚃𝙸𝙼𝙴: time⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@user* Welcome to *@group*! 🎉\n*Group 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\ngroupDesc\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ botName*',
      goodbye: false,
      goodbyeMessage: 'Goodbye @user 👋 We will never miss you!',
      antiSpam: false,
      antidelete: false,
      nsfw: false,
      detect: false,
      chatbot: false,
      autosticker: false // Auto-convert images/videos to stickers
    },
    
    // API Keys (add your own)
    apiKeys: {
      // Add API keys here if needed
      openai: '',
      deepai: '',
      remove_bg: ''
    },
    
    // Message Configuration
    messages: {
      wait: '⫎COMPUTING 🤖⧯',
      success: '◈U WELCOME 🥱⧯',
      error: '⫎ ERROR 💀⧯',
      ownerOnly: '⫎YEAAAA IDKU FAM 😒⧯',
      adminOnly: '⫎YEAAA UR NOT AN ADMIN FAM 🥱⧯',
      groupOnly: '⫎THIS IS MEANT FOR GROUPS GENIUS😒⧯',
      privateOnly: '⫎I DONN LIKE CROWDS 😳 MAYBE DM◈',
      botAdminNeeded: '⫎JAILBREAK MUST BE AN ADMIN 1ST',
      invalidCommand: '❓FAAAAHHHHHHHHHHHHH⫎'
    },
    
    // Timezone
    timezone: 'Africa/Harare',
    
    // Limits
    maxWarnings: 3,
    
    // Social Links (optional)
    social: {
      github: 'https://github.com/jailbreakalt1/JAILBREAK-XMD',
      instagram: 'https://instagram.com/yourusername',
      youtube: 'http://youtube.com/@Ryan'
    }
};
  
