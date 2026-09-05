const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },

    content: {
      type: String,
      default: ""
    },

    language: {
      type: String,
      default: "javascript"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    version: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

documentSchema.index({
  room: 1,
  name: 1
});

module.exports = mongoose.model("Document", documentSchema);