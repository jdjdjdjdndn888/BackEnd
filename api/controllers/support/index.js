const asyncHandler = require("express-async-handler");
const Ticket        = require("../../modules/tickets");
const TicketMessage = require("../../modules/ticketmessages");
const users         = require("../../modules/users");
const { ANY_STAFF_TIER, ADMIN_PANEL_TIER, OWNER_TIER } = require("../../utils/rankTiers");
const userSockets   = require("../../socket/usersockets");

// ── helpers ──────────────────────────────────────────────────────────────────
function emitToUser(io, userId, event, data) {
  const sids = userSockets.get(Number(userId)) || [];
  for (const sid of sids) io.to(sid).emit(event, data);
}

// ── Create ticket ─────────────────────────────────────────────────────────────
exports.createTicket = asyncHandler(async (req, res) => {
  const { subject, category = "general", message } = req.body;
  if (!subject?.trim())  return res.status(400).json({ message: "Subject is required" });
  if (!message?.trim())  return res.status(400).json({ message: "Opening message is required" });
  if (subject.trim().length > 120) return res.status(400).json({ message: "Subject too long (max 120 chars)" });

  const user = await users.findOne({ userid: req.user.id });
  if (!user) return res.status(404).json({ message: "User not found" });

  // Limit open tickets per user
  const openCount = await Ticket.countDocuments({ userId: Number(req.user.id), status: "open" });
  if (openCount >= 3) return res.status(429).json({ message: "You already have 3 open tickets. Please wait for them to be resolved." });

  const ticket = await Ticket.create({
    userId:    Number(req.user.id),
    username:  user.username,
    thumbnail: user.thumbnail || "",
    subject:   subject.trim(),
    category,
  });

  await TicketMessage.create({
    ticketId:  ticket._id.toString(),
    userId:    Number(req.user.id),
    username:  user.username,
    thumbnail: user.thumbnail || "",
    rank:      user.rank || "USER",
    message:   message.trim(),
  });

  req.app.get("io").emit("TICKET_UPDATE", { type: "new", ticket });

  return res.status(201).json({ message: "Ticket created successfully", ticket });
});

// ── List tickets ──────────────────────────────────────────────────────────────
// Staff sees all tickets; regular users see only their own.
exports.getTickets = asyncHandler(async (req, res) => {
  const user = await users.findOne({ userid: req.user.id });
  if (!user) return res.status(404).json({ message: "User not found" });

  const isStaff = ANY_STAFF_TIER.includes(user.rank);
  const query   = isStaff ? {} : { userId: Number(req.user.id) };

  const { status } = req.query;
  if (status && ["open", "closed"].includes(status)) query.status = status;

  const tickets = await Ticket.find(query).sort({ createdAt: -1 }).limit(200);
  return res.json({ tickets, isStaff });
});

// ── Get single ticket + messages ──────────────────────────────────────────────
exports.getTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await users.findOne({ userid: req.user.id });
  if (!user) return res.status(404).json({ message: "User not found" });

  const ticket = await Ticket.findById(id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  const isStaff = ANY_STAFF_TIER.includes(user.rank);
  const isOwner = ticket.userId === Number(req.user.id);
  if (!isStaff && !isOwner) return res.status(403).json({ message: "Access denied" });

  const messages = await TicketMessage.find({ ticketId: id }).sort({ createdAt: 1 });
  return res.json({ ticket, messages, isStaff, canClose: ADMIN_PANEL_TIER.includes(user.rank) });
});

// ── Send message ──────────────────────────────────────────────────────────────
exports.sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message?.trim())           return res.status(400).json({ message: "Message is required" });
  if (message.trim().length > 2000) return res.status(400).json({ message: "Message too long (max 2000 chars)" });

  const user = await users.findOne({ userid: req.user.id });
  if (!user) return res.status(404).json({ message: "User not found" });

  const ticket = await Ticket.findById(id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.status === "closed") return res.status(400).json({ message: "This ticket is closed" });

  const isStaff = ANY_STAFF_TIER.includes(user.rank);
  const isOwner = ticket.userId === Number(req.user.id);
  if (!isStaff && !isOwner) return res.status(403).json({ message: "Access denied" });

  const io = req.app.get("io");

  // ── /getowner command (staff only) ────────────────────────────────────────
  if (message.trim().toLowerCase() === "/getowner" && isStaff) {
    const ownerUsers = await users.find({ rank: { $in: OWNER_TIER } });
    for (const owner of ownerUsers) {
      emitToUser(io, owner.userid, "NOTIFICATION", {
        target:   owner.userid,
        type:     "ticket_escalated",
        title:    "🎟️ Ticket Needs Attention",
        message:  `Staff escalated ticket: "${ticket.subject}" — your help is needed.`,
        ticketId: id,
        timestamp: Date.now(),
      });
    }

    await Ticket.findByIdAndUpdate(id, { ownerPinged: true });

    const sysMsg = await TicketMessage.create({
      ticketId:  id,
      userId:    Number(req.user.id),
      username:  "System",
      thumbnail: "",
      rank:      "SYSTEM",
      message:   `⚠️ ${user.username} escalated this ticket — owner has been notified.`,
      isSystem:  true,
    });

    io.emit(`TICKET_MSG_${id}`, sysMsg);
    return res.json({ message: "Owner notified", msg: sysMsg });
  }

  const msg = await TicketMessage.create({
    ticketId:  id,
    userId:    Number(req.user.id),
    username:  user.username,
    thumbnail: user.thumbnail || "",
    rank:      user.rank || "USER",
    message:   message.trim(),
  });

  io.emit(`TICKET_MSG_${id}`, msg);

  // Notify ticket owner when staff replies
  if (isStaff && ticket.userId !== Number(req.user.id)) {
    emitToUser(io, ticket.userId, "NOTIFICATION", {
      target:    ticket.userId,
      type:      "ticket_reply",
      title:     "🎟️ Support Reply",
      message:   `Staff replied to your ticket: "${ticket.subject}"`,
      ticketId:  id,
      timestamp: Date.now(),
    });
  }

  return res.json({ message: "Message sent", msg });
});

// ── Close ticket (admin+ only) ────────────────────────────────────────────────
exports.closeTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await users.findOne({ userid: req.user.id });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!ADMIN_PANEL_TIER.includes(user.rank)) return res.status(403).json({ message: "Only admins and above can close tickets" });

  const ticket = await Ticket.findById(id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.status === "closed") return res.status(400).json({ message: "Ticket is already closed" });

  const updated = await Ticket.findByIdAndUpdate(id, {
    status:   "closed",
    closedBy: user.username,
    closedAt: new Date(),
  }, { new: true });

  const sysMsg = await TicketMessage.create({
    ticketId:  id,
    userId:    Number(req.user.id),
    username:  "System",
    thumbnail: "",
    rank:      "SYSTEM",
    message:   `🔒 Ticket closed by ${user.username}.`,
    isSystem:  true,
  });

  const io = req.app.get("io");
  io.emit(`TICKET_MSG_${id}`, sysMsg);
  io.emit("TICKET_UPDATE", { type: "closed", ticketId: id, ticket: updated });

  emitToUser(io, ticket.userId, "NOTIFICATION", {
    target:    ticket.userId,
    type:      "ticket_closed",
    title:     "🎟️ Ticket Closed",
    message:   `Your ticket "${ticket.subject}" has been closed by ${user.username}.`,
    ticketId:  id,
    timestamp: Date.now(),
  });

  return res.json({ message: "Ticket closed", ticket: updated });
});
