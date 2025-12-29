# Discord Bot Setup Guide

This guide covers the **non-code setup steps** required to get your Magic Hour Discord Meme Bot working properly.

## Prerequisites Checklist

Before running the bot, ensure you have completed all of these steps:

### ✅ Step 1: Discord Developer Portal - Bot Permissions

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Navigate to the **"Bot"** section (left sidebar)
4. Scroll down to **"Privileged Gateway Intents"**
5. Enable these intents:
   - ✅ **MESSAGE CONTENT INTENT** (required to read message content)
   - ✅ **GUILD MESSAGES** (required to receive messages)
6. Click **"Save Changes"** if you modified anything

**Why this matters**: Without these intents, your bot cannot read message content and won't respond to mentions.

---

### ✅ Step 2: Bot Invite Link with Correct Permissions

Your bot needs specific permissions to function. Use this invite link format:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=274878024768&scope=bot%20applications.commands
```

**How to get your Client ID:**
1. Go to Discord Developer Portal → Your Application
2. Go to **"General Information"** section
3. Copy the **"Application ID"** (this is your Client ID)

**Required Permissions Breakdown:**
- Read Messages/View Channels
- Send Messages
- Attach Files (to send meme images)
- Read Message History
- Use Slash Commands

**Permissions Value**: `274878024768` (includes all required permissions)

**Steps:**
1. Replace `YOUR_BOT_CLIENT_ID` in the URL above with your actual Client ID
2. Open the complete URL in your browser
3. Select the Discord server where you want to add the bot
4. Authorize the bot with the required permissions
5. The bot will be added to your server

---

### ✅ Step 3: Server Configuration (For Server Admins)

After the bot is invited to your server, admins must configure which channels the bot can work in:

1. **Go to any channel** where you want the bot to work
2. **Type the slash command**: `/setmemechannel`
3. **Select the channel** from the dropdown (or type the channel name)
4. The bot will confirm: `✅ Added #channel-name for auto memes!`
5. **Repeat for additional channels** if you want the bot in multiple channels

**Important Notes:**
- Only users with **Administrator** permissions can use this command
- The bot will **ONLY respond to mentions** in configured channels
- If no channels are configured, the bot will ignore all mentions
- You can add multiple channels per server

---

### ✅ Step 4: Environment Variables

Ensure your `.env` file in the project root contains all required variables:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
MH_API_KEY=your_magic_hour_api_key_here
PORT=3000
```

**How to get these values:**

1. **DISCORD_TOKEN**:
   - Discord Developer Portal → Your Application → Bot section
   - Click **"Reset Token"** or **"Copy"** to get your bot token
   - ⚠️ **Never share this token publicly!**

2. **CLIENT_ID**:
   - Discord Developer Portal → Your Application → General Information
   - Copy the **"Application ID"**

3. **MH_API_KEY**:
   - Your Magic Hour API key from your Magic Hour account
   - Get it from your Magic Hour dashboard/account settings

4. **PORT** (optional):
   - Defaults to 3000 if not specified
   - Only needed if you want to change the health check API port

---

## Verification Steps

After completing all setup steps, verify everything works:

1. **Start the bot**:
   ```bash
   node index.js
   ```

2. **Check console output**:
   - Should see: `✅ Logged in as YourBotName#1234`
   - Should see: `✅ Slash commands registered globally.`
   - Should see: `🌐 Health check API running on port 3000`

3. **Test in Discord**:
   - Go to a configured channel (use `/setmemechannel` first)
   - Mention the bot: `@YourBotName create a funny meme about coding`
   - Bot should respond with a meme

4. **Test channel restriction**:
   - Go to a channel that is NOT configured
   - Mention the bot
   - Bot should silently ignore (no response)

5. **Test @everyone filter**:
   - In any channel, type: `@everyone test message`
   - Bot should NOT respond (even if it's mentioned)

---

## Troubleshooting

### Bot doesn't respond to mentions
- ✅ Check that MESSAGE CONTENT INTENT is enabled in Developer Portal
- ✅ Verify the channel is configured using `/setmemechannel`
- ✅ Check that bot has "Send Messages" permission in that channel
- ✅ Verify DISCORD_TOKEN is correct in `.env`

### Slash command doesn't appear
- ✅ Wait 1-2 minutes for commands to sync globally
- ✅ Try restarting the bot
- ✅ Verify bot has "Use Slash Commands" permission
- ✅ Check that CLIENT_ID is correct in `.env`

### Bot responds in all channels (shouldn't)
- ✅ This should be fixed with the new code
- ✅ Verify you're using the updated `index.js` file
- ✅ Make sure channel restriction code is present (lines 197-200)

### Bot responds to @everyone (shouldn't)
- ✅ This should be fixed with the new code
- ✅ Verify @everyone filter is present (line 192)

---

## Summary

**Code Changes**: ✅ Complete (already implemented)
**Bot Permissions**: ⚠️ You need to verify in Developer Portal
**Bot Invite**: ⚠️ You need to create invite link with correct permissions
**Server Setup**: ⚠️ Admins need to run `/setmemechannel` in desired channels
**Environment Variables**: ⚠️ Verify `.env` file has all required values

Once all checkboxes above are complete, your bot will work exactly as expected:
- ✅ Ignores @everyone and @here mentions
- ✅ No automatic 24-hour meme posting
- ✅ Only works in admin-configured channels
- ✅ Responds to direct mentions with meme generation

