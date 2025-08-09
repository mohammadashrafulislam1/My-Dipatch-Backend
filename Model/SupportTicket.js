// models/SupportTicket.js
import mongoose from 'mongoose';

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ['driver', 'customer'], required: true },
  issue: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['open', 'received', 'in-progress', 'resolved'], 
    default: 'open'
  },
  createdAt: { type: Date, default: Date.now }
});

export const SupportTicket  = mongoose.model('SupportTicket', SupportTicketSchema);