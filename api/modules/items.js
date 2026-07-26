const mongoose = require("mongoose");
const schema = mongoose.Schema;


const itemschema = new schema({
  itemid: {
    type: Number,
    required: true,
    unique: true,
  },
  itemname: {
    type: String,
    required: true,
  },
  itemvalue: {
    type: Number,
    required: true,
  },
  itemimage: {
    type: String,
    required: true
  },
  game: {
    type: String,
    required: true
  }
});

// Index on game for any per-game queries in admin/stats routes.
// Note: itemid is already indexed via unique:true in the field definition.
itemschema.index({ game: 1 });

const itemmodel = mongoose.model("items", itemschema);
module.exports = itemmodel;