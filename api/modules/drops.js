const mongoose = require("mongoose");
const schema = mongoose.Schema;

// A single claimable site-chat drop (spawned automatically when 5+ items get
// taxed, or manually via the owner-only `?forcedrop` chat command). Persisted
// so refreshing the chat history still shows the drop card + correct
// claimed/unclaimed state, and so the claim code can be verified server-side.
const dropschema = new schema({
  inventoryId:    { type: schema.Types.ObjectId, required: true },
  itemid:         { type: Number, required: true },
  itemname:       { type: String, required: true },
  itemvalue:      { type: Number, required: true },
  itemimage:      { type: String, default: "" },
  code:           { type: String, required: true },
  source:         { type: String, enum: ["tax", "force"], default: "tax" },
  claimed:        { type: Boolean, default: false },
  claimedBy:      { type: Number, default: null },
  claimedUsername:{ type: String, default: null },
  createdAt:      { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // auto-delete after 24h
});

module.exports = mongoose.model("drops", dropschema);
