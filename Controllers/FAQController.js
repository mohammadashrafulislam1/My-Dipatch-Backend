import { FaqModel } from "../Model/FAQ.js";


// Get all FAQs grouped by category
export const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FaqModel.find().sort({ category: 1, order: 1 });
    
    // Group by category
    const groupedFAQs = {
      customer: faqs.filter(f => f.category === 'customer'),
      driver: faqs.filter(f => f.category === 'driver')
    };
    
    res.json(groupedFAQs);
  } catch (err) {
    console.error('Error fetching FAQs:', err);
    res.status(500).json({ message: 'Server error fetching FAQs' });
  }
};

// Create a new FAQ with automatic order assignment
export const createFAQ = async (req, res) => {
  try {
    const { category, question, answer } = req.body;
    
    if (!category || !question || !answer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate category
    const validCategories = ['customer', 'driver'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Get highest existing order in category
    const lastFAQ = await FaqModel.findOne({ category })
      .sort({ order: -1 })
      .select('order')
      .lean();
    
    const newOrder = lastFAQ ? lastFAQ.order + 1 : 0;
    
    const newFAQ = new FaqModel({
      category,
      question,
      answer,
      order: newOrder
    });
    
    await newFAQ.save();
    
    res.status(201).json(newFAQ);
  } catch (err) {
    console.error('Error creating FAQ:', err);
    res.status(500).json({ message: 'Server error creating FAQ' });
  }
};

// Update an FAQ (preserve existing order if not provided)
export const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, question, answer, order } = req.body;
    
    // Validate category if provided
    if (category) {
      const validCategories = ['customer', 'driver'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
    }
    
    const updateData = { 
      ...(category && { category }),
      ...(question && { question }),
      ...(answer && { answer }),
      ...(typeof order === 'number' && { order }),
      updatedAt: new Date()
    };
    
    const updatedFAQ = await FaqModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedFAQ) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    res.json(updatedFAQ);
  } catch (err) {
    console.error('Error updating FAQ:', err);
    res.status(500).json({ message: 'Server error updating FAQ' });
  }
};

// Delete an FAQ
export const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedFAQ = await FaqModel.findByIdAndDelete(id);
    
    if (!deletedFAQ) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    // Reorder remaining FAQs in same category
    await FaqModel.updateMany(
      { 
        category: deletedFAQ.category,
        order: { $gt: deletedFAQ.order }
      },
      { $inc: { order: -1 } }
    );
    
    res.json({ message: 'FAQ deleted successfully' });
  } catch (err) {
    console.error('Error deleting FAQ:', err);
    res.status(500).json({ message: 'Server error deleting FAQ' });
  }
};

// Search FAQs with better text handling
export const searchFAQs = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query required' });
    }
    
    // Escape special characters and create regex
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');
    
    const results = await FaqModel.find({
      $or: [
        { question: regex },
        { answer: regex }
      ]
    }).sort({ category: 1, order: 1 });
    
    res.json(results);
  } catch (err) {
    console.error('Error searching FAQs:', err);
    res.status(500).json({ message: 'Server error searching FAQs' });
  }
};

// Reorder FAQs with transaction safety
export const reorderFAQs = async (req, res) => {
  const session = await FaqModel.startSession();
  session.startTransaction();
  
  try {
    const { category, newOrder } = req.body;
    
    if (!category || !Array.isArray(newOrder)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid input' });
    }
    
    // Validate all IDs exist in the category
    const existingFAQs = await FaqModel.find(
      { _id: { $in: newOrder }, category },
      { _id: 1 }
    ).session(session);
    
    if (existingFAQs.length !== newOrder.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Some FAQs not found in the specified category' 
      });
    }
    
    // Prepare bulk operations
    const bulkOps = newOrder.map((faqId, index) => ({
      updateOne: {
        filter: { _id: faqId },
        update: { $set: { order: index } }
      }
    }));
    
    await FaqModel.bulkWrite(bulkOps, { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({ message: 'FAQs reordered successfully' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error reordering FAQs:', err);
    res.status(500).json({ message: 'Server error reordering FAQs' });
  }
};