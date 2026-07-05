const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActivityType,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const { bottoken, ownerDiscordId } = require("./config.js");
const users = require("./modules/users.js");
const bots = require("./modules/bots.js");
const withdraws = require("./modules/withdraws.js");
const inventorys = require("./modules/inventorys.js");
const logger = require("./logger.js");
const settings = require("./settings.js");

const OWNER_DISCORD_ID = ownerDiscordId;
const SUPPORT_PANEL_CHANNEL_ID = "1521084432688222208";

const TICKET_CATEGORIES = {
  ticket_site_support:    "🎫 Site Support",
  ticket_scams:           "🚨 Scams & Unfair Trades",
  ticket_discord_support: "💬 Discord Support",
  ticket_claim_gw:        "🎉 Claim DC GWs",
};

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMembers,
];

const client = new Client({ intents });

function isOwner(interaction) {
  if (OWNER_DISCORD_ID && interaction.user.id === OWNER_DISCORD_ID) return true;
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

async function getOrCreateCategory(guild, name) {
  let cat = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (!cat) {
    cat = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });
    console.log(`Created category: ${name}`);
  }
  return cat;
}

async function sendSupportPanel() {
  try {
    const channel = await client.channels.fetch(SUPPORT_PANEL_CHANNEL_ID);
    if (!channel) return console.warn("Support panel channel not found:", SUPPORT_PANEL_CHANNEL_ID);

    const messages = await channel.messages.fetch({ limit: 20 });
    const botMsgs = messages.filter((m) => m.author.id === client.user.id);
    for (const [, msg] of botMsgs) {
      await msg.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🎫 PS99Bet Support Center")
      .setDescription(
        "Welcome to PS99Bet support! Click the appropriate button below to open a ticket.\n\n" +
        "🌐 **Site Support** — Issues with the website, balance, or account\n" +
        "🚨 **Scams / Unfair Trades** — Report a scam or unfair trade\n" +
        "💬 **Discord Support** — Help with roles, verification, or Discord issues\n" +
        "🎉 **Claim DC GWs** — Claim your Discord giveaway winnings"
      )
      .setFooter({ text: "PS99Bet • Support" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_site_support")
        .setLabel("Site Support")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("ticket_scams")
        .setLabel("Scams / Unfair Trades")
        .setEmoji("🚨")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("ticket_discord_support")
        .setLabel("Discord Support")
        .setEmoji("💬")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("ticket_claim_gw")
        .setLabel("Claim DC GWs")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log("Support panel sent to channel", SUPPORT_PANEL_CHANNEL_ID);
  } catch (e) {
    console.error("Failed to send support panel:", e.message);
  }
}

client.once("clientReady", async () => {
  console.log(`PS99Bet bot is online as ${client.user.tag}`);

  try {
    client.user.setPresence({
      activities: [{ name: "PS99Bet", type: ActivityType.Playing }],
      status: "online",
    });
  } catch (e) {
    console.error("Failed to set presence:", e.message);
  }

  logger.init(client);

  let commands;
  try {
    commands = [
      new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Check the site profile of a Discord user")
        .addUserOption((o) =>
          o.setName("user").setDescription("Select a user").setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check your PS99Bet balance and stats"),

      new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the top 10 wagerers on PS99Bet"),

      new SlashCommandBuilder()
        .setName("profit")
        .setDescription("Check your profit on PS99Bet"),

      new SlashCommandBuilder()
        .setName("withdraws")
        .setDescription("See your pending withdrawals on PS99Bet"),

      new SlashCommandBuilder()
        .setName("cancelallwithdraws")
        .setDescription("Cancel all your pending withdrawals on PS99Bet"),

      new SlashCommandBuilder()
        .setName("deposit")
        .setDescription("View active deposit bots and join their games"),

      new SlashCommandBuilder()
        .setName("listalllinked")
        .setDescription("Owner only — list all users with linked Discord accounts")
        .addIntegerOption((o) =>
          o.setName("page").setDescription("Page number (default 1)").setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName("locktipping")
        .setDescription("Owner only — enable or disable tipping for all users")
        .addStringOption((o) =>
          o
            .setName("action")
            .setDescription("enable or disable tipping")
            .setRequired(true)
            .addChoices(
              { name: "enable", value: "enable" },
              { name: "disable", value: "disable" }
            )
        ),

      new SlashCommandBuilder()
        .setName("create")
        .setDescription("Owner only — create a new deposit/withdraw bot")
        .addStringOption((o) =>
          o.setName("name").setDescription("Bot's Roblox username").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("pfp").setDescription("Bot's avatar image URL").setRequired(true)
        )
        .addIntegerOption((o) =>
          o.setName("userid").setDescription("Bot's Roblox user ID").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("game").setDescription("Game (e.g. PS99)").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("link").setDescription("Roblox profile link (optional)")
        ),

      new SlashCommandBuilder()
        .setName("toggle")
        .setDescription("Owner only — manage bots and site settings")
        .addSubcommand((sub) =>
          sub
            .setName("on")
            .setDescription("Enable a bot")
            .addStringOption((o) =>
              o.setName("botid").setDescription("Bot DB ID (or 'all')").setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("off")
            .setDescription("Disable a bot")
            .addStringOption((o) =>
              o.setName("botid").setDescription("Bot DB ID (or 'all')").setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub.setName("list").setDescription("List all registered bots")
        )
        .addSubcommand((sub) =>
          sub
            .setName("delete")
            .setDescription("Delete a bot entry")
            .addStringOption((o) =>
              o.setName("botid").setDescription("Bot DB ID").setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("cancelwithdraws")
            .setDescription("Enable or disable the cancel-withdraws feature site-wide")
            .addStringOption((o) =>
              o
                .setName("action")
                .setDescription("enable or disable")
                .setRequired(true)
                .addChoices(
                  { name: "enable", value: "enable" },
                  { name: "disable", value: "disable" }
                )
            )
        ),
    ].map((c) => c.toJSON());
  } catch (e) {
    console.error("Failed to build slash commands:", e.message);
  }

  if (commands) {
    try {
      await client.application.commands.set(commands);
      console.log("Slash commands registered.");
    } catch (e) {
      console.error("Failed to register slash commands:", e.message);
    }
  }

  await sendSupportPanel();
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const { customId } = interaction;

    if (TICKET_CATEGORIES[customId]) {
      await handleTicketCreate(interaction, customId);
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  await interaction.deferReply({ ephemeral: false });

  // ── /profile ──────────────────────────────────────────────────────────────
  if (commandName === "profile") {
    try {
      const selected = interaction.options.getUser("user");
      const user = await users.findOne({ discordid: selected.id });
      if (!user) {
        return interaction.editReply(`No linked PS99Bet account found for **${selected.username}**.`);
      }
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`${user.username}'s Profile`)
        .setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "Level", value: String(user.level ?? 0), inline: true },
          { name: "Wagered", value: `R$${(user.wager ?? 0).toLocaleString()}`, inline: true },
          { name: "Won", value: `R$${(user.won ?? 0).toLocaleString()}`, inline: true },
          { name: "Lost", value: `R$${(user.lost ?? 0).toLocaleString()}`, inline: true },
          { name: "Profit", value: `R$${((user.won ?? 0) - (user.lost ?? 0)).toLocaleString()}`, inline: true }
        )
        .setFooter({ text: "PS99Bet" });
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong fetching that profile.");
    }

  // ── /balance ──────────────────────────────────────────────────────────────
  } else if (commandName === "balance") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) {
        return interaction.editReply("Link your Discord on PS99Bet first.");
      }
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`${user.username}'s Balance`)
        .setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "💰 Balance", value: `R$${(user.balance ?? 0).toLocaleString()}`, inline: true },
          { name: "📈 Wagered", value: `R$${(user.wager ?? 0).toLocaleString()}`, inline: true },
          { name: "✅ Won", value: `R$${(user.won ?? 0).toLocaleString()}`, inline: true },
          { name: "❌ Lost", value: `R$${(user.lost ?? 0).toLocaleString()}`, inline: true },
          { name: "📊 Profit", value: `R$${((user.won ?? 0) - (user.lost ?? 0)).toLocaleString()}`, inline: true }
        )
        .setFooter({ text: "PS99Bet" });
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /leaderboard ──────────────────────────────────────────────────────────
  } else if (commandName === "leaderboard") {
    try {
      const leaders = await users.find({ wager: { $gt: 0 } }).sort({ wager: -1 }).limit(10);
      if (!leaders.length) {
        return interaction.editReply("No data yet.");
      }
      const medals = ["🥇", "🥈", "🥉"];
      const rows = leaders.map((u, i) =>
        `${medals[i] ?? `**#${i + 1}**`} **${u.username}** — R$${(u.wager ?? 0).toLocaleString()}`
      );
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🏆 PS99Bet Leaderboard (by Wager)")
        .setDescription(rows.join("\n"))
        .setFooter({ text: "PS99Bet" });
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /profit ───────────────────────────────────────────────────────────────
  } else if (commandName === "profit") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) {
        return interaction.editReply("Link your Discord on PS99Bet first.");
      }
      const profit = (user.won ?? 0) - (user.lost ?? 0);
      const color = profit >= 0 ? 0x4ade80 : 0xff6b6b;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${user.username}'s Profit`)
        .setDescription(`**R$${profit.toLocaleString()}**`)
        .setFooter({ text: "PS99Bet" });
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /withdraws ────────────────────────────────────────────────────────────
  } else if (commandName === "withdraws") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) {
        return interaction.editReply("Link your Discord on PS99Bet first.");
      }

      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) {
        return interaction.editReply("✅ You have no pending withdrawals.");
      }

      const counts = {};
      pending.forEach((w) => {
        counts[w.itemname] = (counts[w.itemname] || 0) + 1;
      });

      const rows = Object.entries(counts)
        .map(([item, count]) => `• **${item}** x${count}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`${user.username}'s Pending Withdrawals`)
        .setDescription(rows)
        .addFields({ name: "Total Items", value: String(pending.length), inline: true })
        .setThumbnail(user.thumbnail || null)
        .setFooter({ text: "PS99Bet" });

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /cancelallwithdraws ───────────────────────────────────────────────────
  } else if (commandName === "cancelallwithdraws") {
    try {
      if (!settings.cancelWithdrawsEnabled) {
        return interaction.editReply("❌ Cancel withdrawals is currently **disabled** by the site owner.");
      }

      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) {
        return interaction.editReply("Link your Discord on PS99Bet first.");
      }

      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) {
        return interaction.editReply("You have no pending withdrawals to cancel.");
      }

      const inventoryEntries = pending.map((w) => ({
        itemid: w.itemid,
        owner: user.userid,
        locked: false,
      }));

      await inventorys.insertMany(inventoryEntries);
      await withdraws.deleteMany({ userid: user.userid });

      logger.logEvent({
        type: "🗑️ Withdrawals Cancelled",
        color: 0xff6b6b,
        description: `**${user.username}** cancelled all their pending withdrawals via Discord.`,
        fields: [
          { name: "Items Returned", value: String(pending.length), inline: true },
          { name: "Roblox ID", value: String(user.userid), inline: true },
        ],
        thumbnail: user.thumbnail,
      });

      await interaction.editReply(
        `✅ Cancelled **${pending.length}** pending withdrawal${pending.length !== 1 ? "s" : ""} — items returned to your inventory.`
      );
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /deposit ──────────────────────────────────────────────────────────────
  } else if (commandName === "deposit") {
    try {
      const activeBots = await bots.find({ online: true });

      if (!activeBots.length) {
        const embed = new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle("🤖 Deposit Bots")
          .setDescription("❌ No active deposit bots online right now. Please check back later.")
          .setFooter({ text: "PS99Bet" });
        return interaction.editReply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x4ade80)
        .setTitle("🤖 Active Deposit Bots")
        .setDescription(`**${activeBots.length}** bot${activeBots.length !== 1 ? "s" : ""} currently online. Click **Join** to open their Roblox profile.`)
        .setFooter({ text: "PS99Bet • Make sure to deposit in-game after joining" })
        .setTimestamp();

      activeBots.forEach((bot, i) => {
        embed.addFields({
          name: `${i + 1}. ${bot.name}`,
          value: `🎮 Game: **${bot.game}** | 🟢 Online`,
          inline: true,
        });
      });

      const rows = [];
      for (let i = 0; i < activeBots.length; i += 5) {
        const chunk = activeBots.slice(i, i + 5);
        const row = new ActionRowBuilder().addComponents(
          chunk.map((bot) => {
            const profileUrl =
              bot.link && bot.link.startsWith("http")
                ? bot.link
                : `https://www.roblox.com/users/${bot.userid}/profile`;
            return new ButtonBuilder()
              .setLabel(`Join ${bot.name}`)
              .setEmoji("🎮")
              .setStyle(ButtonStyle.Link)
              .setURL(profileUrl);
          })
        );
        rows.push(row);
        if (rows.length >= 5) break;
      }

      await interaction.editReply({ embeds: [embed], components: rows });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong fetching deposit bots.");
    }

  // ── /create ───────────────────────────────────────────────────────────────
  } else if (commandName === "create") {
    if (!isOwner(interaction)) {
      return interaction.editReply("❌ You don't have permission to use this command.");
    }

    try {
      const name = interaction.options.getString("name");
      const pfp = interaction.options.getString("pfp");
      const userid = interaction.options.getInteger("userid");
      const game = interaction.options.getString("game");
      const link = interaction.options.getString("link") || "";

      const existing = await bots.findOne({ userid });
      if (existing) {
        return interaction.editReply(`❌ A bot with Roblox ID **${userid}** already exists (**${existing.name}**).`);
      }

      const newBot = await bots.create({
        name,
        pfp,
        userid,
        game,
        link,
        online: true,
        showJoin: true,
        showProfile: true,
        showId: false,
      });

      logger.logEvent({
        type: "🤖 Bot Created",
        color: 0x4ade80,
        description: `**${interaction.user.username}** created a new bot.`,
        fields: [
          { name: "Name", value: name, inline: true },
          { name: "Game", value: game, inline: true },
          { name: "Roblox ID", value: String(userid), inline: true },
          { name: "DB ID", value: String(newBot._id), inline: false },
        ],
        thumbnail: pfp,
      });

      const embed = new EmbedBuilder()
        .setColor(0x4ade80)
        .setTitle("✅ Bot Created")
        .setThumbnail(pfp)
        .addFields(
          { name: "Name", value: name, inline: true },
          { name: "Game", value: game, inline: true },
          { name: "Roblox ID", value: String(userid), inline: true },
          { name: "DB ID", value: String(newBot._id), inline: false }
        )
        .setFooter({ text: "PS99Bet" });

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong creating the bot.");
    }

  // ── /toggle ───────────────────────────────────────────────────────────────
  } else if (commandName === "toggle") {
    if (!isOwner(interaction)) {
      return interaction.editReply("❌ You don't have permission to use this command.");
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      try {
        const allBots = await bots.find({});
        if (!allBots.length) {
          return interaction.editReply("No bots registered.");
        }
        const rows = allBots.map(
          (b) =>
            `**${b.name}** (ID: \`${b._id}\`) — ${b.online ? "🟢 Online" : "🔴 Offline"} | Game: ${b.game}`
        );
        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("Registered Bots")
          .setDescription(rows.join("\n"))
          .setFooter({ text: "PS99Bet" });
        await interaction.editReply({ embeds: [embed] });
      } catch (e) {
        console.error(e);
        await interaction.editReply("Something went wrong.");
      }

    } else if (sub === "on" || sub === "off") {
      const online = sub === "on";
      const botId = interaction.options.getString("botid");
      try {
        if (botId.toLowerCase() === "all") {
          await bots.updateMany({}, { $set: { online } });
          await interaction.editReply(`✅ All bots set to **${online ? "Online 🟢" : "Offline 🔴"}**.`);
        } else {
          const bot = await bots.findByIdAndUpdate(botId, { $set: { online } }, { new: true });
          if (!bot) return interaction.editReply("Bot not found with that ID.");
          await interaction.editReply(
            `✅ **${bot.name}** is now **${online ? "Online 🟢" : "Offline 🔴"}**.`
          );
        }
      } catch (e) {
        console.error(e);
        await interaction.editReply("Invalid bot ID or something went wrong.");
      }

    } else if (sub === "delete") {
      const botId = interaction.options.getString("botid");
      try {
        const bot = await bots.findByIdAndDelete(botId);
        if (!bot) return interaction.editReply("Bot not found with that ID.");
        await interaction.editReply(`🗑️ Bot **${bot.name}** deleted.`);
      } catch (e) {
        console.error(e);
        await interaction.editReply("Invalid bot ID or something went wrong.");
      }

    } else if (sub === "cancelwithdraws") {
      const action = interaction.options.getString("action");
      settings.cancelWithdrawsEnabled = action === "enable";
      const state = settings.cancelWithdrawsEnabled ? "✅ Enabled" : "❌ Disabled";

      logger.logEvent({
        type: "⚙️ Setting Changed",
        color: settings.cancelWithdrawsEnabled ? 0x4ade80 : 0xff6b6b,
        description: `**${interaction.user.username}** ${action}d the cancel-withdraws feature.`,
      });

      await interaction.editReply(`Cancel Withdrawals is now **${state}**.`);
    }

  // ── /listalllinked ────────────────────────────────────────────────────────
  } else if (commandName === "listalllinked") {
    if (!OWNER_DISCORD_ID || interaction.user.id !== OWNER_DISCORD_ID) {
      return interaction.editReply({ content: "❌ Only the site owner can use this command.", ephemeral: true });
    }

    try {
      const page = Math.max(1, interaction.options.getInteger("page") || 1);
      const perPage = 15;
      const skip = (page - 1) * perPage;

      const linkedFilter = { discordid: { $exists: true, $nin: [null, ""] } };
      const [linked, total] = await Promise.all([
        users.find(linkedFilter).skip(skip).limit(perPage),
        users.countDocuments(linkedFilter),
      ]);

      if (!linked.length) {
        return interaction.editReply(`No linked accounts found${page > 1 ? ` on page ${page}` : ""}.`);
      }

      const totalPages = Math.ceil(total / perPage);
      const rows = linked.map((u, i) =>
        `**${skip + i + 1}.** ${u.username} ↔ @${u.discordusername || "?"} (\`${u.discordid}\`)`
      );

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`🔗 Linked Discord Accounts (${total} total)`)
        .setDescription(rows.join("\n"))
        .setFooter({ text: `Page ${page} / ${totalPages} • PS99Bet` });

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (e) {
      console.error(e);
      await interaction.editReply({ content: "Something went wrong fetching linked accounts.", ephemeral: true });
    }

  // ── /locktipping ──────────────────────────────────────────────────────────
  } else if (commandName === "locktipping") {
    if (!isOwner(interaction)) {
      return interaction.editReply("❌ You don't have permission to use this command.");
    }

    const action = interaction.options.getString("action");
    settings.tippingLocked = action === "disable";
    const state = settings.tippingLocked ? "🔒 Locked (disabled)" : "🔓 Unlocked (enabled)";

    logger.logEvent({
      type: "⚙️ Tipping Setting Changed",
      color: settings.tippingLocked ? 0xff6b6b : 0x4ade80,
      description: `**${interaction.user.username}** ${settings.tippingLocked ? "locked" : "unlocked"} tipping site-wide.`,
    });

    await interaction.editReply(`Tipping is now **${state}**. Only Owners/Admins can tip while locked.`);
  }
});

async function handleTicketCreate(interaction, customId) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({ content: "This can only be used in a server.", ephemeral: true });
    }

    const categoryName = TICKET_CATEGORIES[customId];
    const category = await getOrCreateCategory(guild, categoryName);

    const existingTicket = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.parentId === category.id &&
        c.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    );

    if (existingTicket) {
      return interaction.editReply({
        content: `❌ You already have an open ticket: ${existingTicket.toString()}`,
        ephemeral: true,
      });
    }

    const ticketChannel = await guild.channels.create({
      name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    });

    const labelMap = {
      ticket_site_support:    "🌐 Site Support",
      ticket_scams:           "🚨 Scams / Unfair Trades",
      ticket_discord_support: "💬 Discord Support",
      ticket_claim_gw:        "🎉 Claim DC GWs",
    };

    const ticketEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`${labelMap[customId]} Ticket`)
      .setDescription(
        `Hello ${interaction.user.toString()}! A staff member will be with you shortly.\n\n` +
        `**Category:** ${categoryName}\n` +
        `Please describe your issue in detail below.`
      )
      .setFooter({ text: "PS99Bet Support • To close this ticket, contact a staff member" })
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: interaction.user.toString(),
      embeds: [ticketEmbed],
      components: [closeRow],
    });

    await interaction.editReply({
      content: `✅ Your ticket has been created: ${ticketChannel.toString()}`,
      ephemeral: true,
    });

  } catch (e) {
    console.error("Ticket creation error:", e.message);
    try {
      await interaction.editReply({ content: "Something went wrong creating your ticket. Please try again.", ephemeral: true });
    } catch {}
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "ticket_close") return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) &&
      interaction.user.id !== OWNER_DISCORD_ID) {
    return interaction.reply({ content: "❌ Only staff can close tickets.", ephemeral: true });
  }

  try {
    await interaction.reply({ content: "🔒 Closing ticket in 5 seconds...", ephemeral: false });
    setTimeout(async () => {
      await interaction.channel.delete().catch(() => {});
    }, 5000);
  } catch (e) {
    console.error("Ticket close error:", e.message);
  }
});

if (bottoken) {
  console.log("Bot: attempting Discord login...");
  const loginTimeout = setTimeout(() => {
    console.error("Bot login timed out after 30s — check DISCORD_BOT_TOKEN.");
  }, 30000);
  client.once("ready", () => clearTimeout(loginTimeout));
  client.login(bottoken).catch((err) => {
    clearTimeout(loginTimeout);
    console.error("Bot login failed:", err.message);
  });
} else {
  console.warn("DISCORD_BOT_TOKEN not set — bot will not start.");
}
