const mongoose = require("mongoose");
const schema = mongoose.Schema;


const inventoryschema = new schema({
  itemid: {
    type: Number,
    required: true,
  },
  owner: {
    type: Number,
    required: true,
  },
  locked: {
    type: Boolean,
    required: true,
  }
});

// Index on owner so per-user inventory lookups are O(log n) instead of
// a full collection scan. Critical for inventory load speed.
inventoryschema.index({ owner: 1 });
// Compound index for join/cancel item-validation queries:
// { _id, owner, locked } — _id is already indexed but owner narrows it fast.
inventoryschema.index({ owner: 1, locked: 1 });

const inventorymodel = mongoose.model("inventorys", inventoryschema);
module.exports = inventorymodel;