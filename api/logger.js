const { EmbedBuilder } = require("discord.js");

const LOG_CHANNEL_ID = "1515602211319713853";
let _channel = null;

exports.init = function (client) {
  client.channels
    .fetch(LOG_CHANNEL_ID)
    .then((ch) => {
      _channel = ch;
      console.log(`Log channel ready: #${ch.name}`);
    })
    .catch(() => console.warn("Could not fetch log channel:", LOG_CHANNEL_ID));
};

exports.logEvent = async function ({ type, color, description, fields = [], thumbnail = null }) {
  if (!_channel) return;
  try {
    const embed = new EmbedBuilder()
      .setColor(color || 0x8b5cf6)
      .setTitle(type)
      .setDescription(description || "")
      .setTimestamp()
      .setFooter({ text: "GemTide Logs" });

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (fields.length) embed.addFields(fields);

    await _channel.send({ embeds: [embed] });
  } catch (e) {
    console.error("[Logger] Failed to send log:", e.message);
  }
};
