// Model/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userRole'
  },
  userRole: {
    type: String,
    required: true,
    enum: ['customer', 'driver', 'admin']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['ride_request', 'ride_accepted', 'driver_location', 'system', 'alert'],
    default: 'system'
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

export const Notification = mongoose.model('Notification', notificationSchema);