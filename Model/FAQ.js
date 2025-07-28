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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  order: {
    type: Number,
    default: 0
  }
});

// Add text index for searching
FAQSchema.index({ question: 'text', answer: 'text' });

FAQSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const FaqModel = mongoose.model('FAQ', FAQSchema);
