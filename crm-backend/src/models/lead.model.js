const mongoose = require("mongoose")

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: false, // Made optional for leads
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ["WhatsApp", "Website", "Referral", "Social Media", "Advertisement", "Walkin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "follow-up", "enrolled", "not-interested", "contacted"],
      default: "new",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Changed from true to false to make it optional
    },
    course: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    lastContact: {
      type: Date,
      default: Date.now,
    },
    communications: [
      {
        type: {
          type: String,
          enum: ["whatsapp", "call", "email"],
          required: true,
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    comments: [
      {
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Lead", leadSchema)
