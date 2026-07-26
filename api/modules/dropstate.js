const mongoose = require("mongoose");
const schema = mongoose.Schema;

// Singleton document (key: "global") that tracks how many items have been
// taxed to the house account since the last automatic site-chat drop. A
// game controller increments this (inside its transaction) every time it
// taxes items; a post-commit check elsewhere decrements it by 5 and spawns
// a drop whenever it reaches that threshold.
const dropstateschema = new schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: "global",
  },
  taxedSinceDrop: {
    type: Number,
    default: 0,
  },
});

const dropstatemodel = mongoose.model("dropstates", dropstateschema);
module.exports = dropstatemodel;
