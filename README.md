<div align="center">
  <img src="kyraX_logo_2_by_yours1cypher.png" alt="Kyra X Logo" width="160" height="160" style="border-radius: 50%;" />
  <h1>⚡ Kyra X — Next-Generation Discord Bot</h1>
  <p><b>A high-performance, modular, and multi-purpose Discord bot built with Discord.js v14, Kazagumo Lavalink audio, MongoDB, and modern component UI.</b></p>

  <p>
    <a href="https://discord.js.org"><img src="https://img.shields.io/badge/discord.js-v14.25.1-blue.svg?logo=discord" alt="Discord.js" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18%2B-green.svg?logo=node.js" alt="Node.js" /></a>
    <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/Database-MongoDB-brightgreen.svg?logo=mongodb" alt="MongoDB" /></a>
    <a href="https://github.com/gowthambuilds/KyraX/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" /></a>
  </p>
</div>

---

## 🌟 Key Features

- 🎵 **High-Fidelity Music Engine**: Powered by [Kazagumo](https://github.com/Takiyo0/Kazagumo) & [Shoukaku](https://github.com/Deivu/Shoukaku) supporting Lavalink v4, Spotify integration, queues, autoplay, and rich interactive player UI.
- 🛡️ **Advanced Moderation Suite**: Full suite with tempbans, softbans, warnings, timeouts, lock/unlock all channels, hide/unhide, sticky messages, purges, and automated mod logs.
- 🎟️ **Interactive Ticket System**: Clean modal-driven ticket creation with button panels and HTML transcript generation.
- 🤖 **AI Integration**: AI chat channels and smart prompt capabilities powered by OpenRouter API.
- 🔊 **Dynamic TempVC**: Automated on-demand temporary voice channels with user management controls.
- 🎉 **Giveaway Engine**: Fully featured giveaway manager with timers, rerolls, pauses, and resumes.
- 💎 **Premium System & Server Backups**: Full guild structure backup and restore engine with tier-based premium server management.
- ⚙️ **Modern Discord UI**: Utilizes Discord's latest message components, containers, modals, and dual support for both Prefix and Slash commands.

---

## 📋 Prerequisites

Before setting up Kyra X, ensure you have:

1. **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
2. **MongoDB Database**: A free [MongoDB Atlas](https://www.mongodb.com/atlas/database) cluster or a local MongoDB instance.
3. **Discord Bot Token & Client ID**: Created via the [Discord Developer Portal](https://discord.com/developers/applications).
4. **Lavalink Server** *(for Music)*: Lavalink v4 node (default public/free nodes are pre-configured in `src/config/config.js`, or connect your own).
5. **Spotify Credentials** *(Optional, for Spotify music tracks)*: Client ID & Secret from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
6. **OpenRouter API Key** *(Optional, for AI features)*: Free/Paid key from [OpenRouter](https://openrouter.ai/).

---

## ⚙️ Discord Developer Portal Configuration

> [!IMPORTANT]
> You **MUST** enable **Privileged Gateway Intents** in the Discord Developer Portal for the bot to function properly:

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and select your Application.
2. Navigate to the **Bot** tab on the left sidebar.
3. Scroll down to **Privileged Gateway Intents** and enable:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
4. Save your changes.
5. Under **OAuth2 -> URL Generator**, select:
   - **Scopes**: `bot`, `applications.commands`
   - **Bot Permissions**: `Administrator` (or appropriate moderation/voice permissions).
6. Copy the generated URL to invite Kyra X to your server.

---

## 🚀 Complete Installation & Setup Guide

### 1. Clone the Repository

```bash
git clone https://github.com/gowthambuilds/KyraX.git
cd KyraX
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create your `.env` file by copying `.env.example`:

```bash
# On Linux / macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env

# On Windows (CMD)
copy .env.example .env
```

Open `.env` in your text editor and fill in your credentials:

```env
# Discord Bot Credentials
TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here

# Bot Settings
PREFIX=+
OWNER_ID=your_discord_user_id_here
# OWNER_IDS=123456789012345678,987654321098765432

# Database Connection
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/kyrax?retryWrites=true&w=majority

# AI Features (Optional)
OPENROUTER_KEY=your_openrouter_api_key_here

# Spotify API (Optional for music)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 4. Start the Bot

#### Normal Execution:
```bash
npm start
```
or:
```bash
node index.js
```

#### Production (using PM2 Process Manager):
```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start and monitor Kyra X
pm2 start index.js --name "kyra-x"
pm2 save
pm2 logs kyra-x
```

---

## 📂 Project Structure

```text
Kyra X/
├── index.js                     # Main bot entrypoint & client bootstrap
├── package.json                 # Project dependencies & ES Module imports
├── .env.example                 # Template for environment configuration
├── .gitignore                   # Git ignore specifications
├── README.md                    # Project documentation
└── src/
    ├── commands/                # Bot commands grouped by category
    │   ├── admin/               # Autoresponder, autoreact, greet, tickets, ignore
    │   ├── giveaway/            # Giveaway management (start, end, reroll, pause)
    │   ├── moderation/          # Ban, kick, mute, timeout, lock, purge, warn, etc.
    │   ├── music/               # Play, pause, skip, queue, autoplay, volume, etc.
    │   ├── owner/               # Bot maintenance, dbstats, nodestatus, restart
    │   ├── premium/             # Guild backup/restore, custom bot profiles
    │   ├── utility/             # Stats, info, afk, confession, poll, snipe, AI
    │   └── voice/               # Dynamic temporary voice channel (TempVC)
    ├── config/                  # Bot configuration, emojis, and colors
    ├── database/                # MongoDB connection & Mongoose schemas/models
    ├── events/                  # Discord client & Lavalink event listeners
    ├── services/                # External services (AI / OpenRouter API)
    ├── structures/              # Custom client extensions, handlers & classes
    └── utils/                   # Helper functions, formatters, and loggers
```

---

## 🛠️ Command Categories

| Category | Description |
| :--- | :--- |
| **🛡️ Moderation** | `ban`, `softban`, `tempban`, `unban`, `unbanall`, `kick`, `timeout`, `untimeout`, `warn`, `warnings`, `clearwarn`, `delwarn`, `purge`, `lock`, `unlock`, `lockall`, `unlockall`, `hide`, `unhide`, `hideall`, `unhideall`, `slowmode`, `autorole`, `sticky`, `vmute`, `vunmute`, `vdeafen`, `vundeafen` |
| **🎵 Music** | `play`, `pause`, `resume`, `skip`, `stop`, `queue`, `autoplay`, `volume`, `join`, `leave` |
| **🎟️ Admin & Tickets** | `ticket`, `greet`, `quickgreet`, `autoresponder`, `autoreact`, `ignore` |
| **🎉 Giveaways** | `gstart`, `gend`, `greroll`, `gpause`, `gresume` |
| **🔊 Voice** | `tempvc` |
| **💎 Premium** | `premium`, `backup`, `botprofile` |
| **💡 Utility & AI** | `aichannel`, `resetai`, `help`, `ping`, `stats`, `uptime`, `serverinfo`, `userinfo`, `roleinfo`, `avatar`, `banner`, `servericon`, `serverbanner`, `membercount`, `snipe`, `steal`, `afk`, `confession`, `poll`, `embed`, `timer`, `translate` |
| **👑 Owner** | `ownercmds`, `dbstats`, `nodestatus`, `maintenance`, `reload`, `restart`, `serverlist`, `autobuild` |

---

## 🤝 Contributing

Even if you contribute i can't update the code cuz i don't have enough time to do that haha.
