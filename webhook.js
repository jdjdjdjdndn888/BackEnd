const WEBHOOK_URL =
  "";

async function sendAnnouncement() {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: "@everyone",
      allowed_mentions: {
        parse: ["everyone"],
      },
      embeds: [
        {
          title: "🌊 GemTide.win",
          description:
            "**GemTide is live!**\n\n🎮 Play now: https://gemtide.win\n💬 Join our Discord: https://discord.gg/ZfgdEnSYD4",
          color: 0x8b5cf6,
          footer: {
            text: "GemTide.win",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Webhook failed: ${response.status} ${await response.text()}`
    );
  }

  console.log("Announcement sent successfully.");
}

sendAnnouncement().catch(console.error);
