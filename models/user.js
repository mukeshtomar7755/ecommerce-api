const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["SuperAdmin", "Admin", "Supervisor", "Agent"], default: "Agent" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
