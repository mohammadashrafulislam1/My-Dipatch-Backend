// models/FAQ.js
import mongoose from 'mongoose';

const FAQSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['customer', 'driver'],
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('FAQ', FAQSchema);