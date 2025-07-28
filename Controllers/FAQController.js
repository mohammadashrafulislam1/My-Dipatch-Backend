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

// Create a new FAQ
export const createFAQ = async (req, res) => {
  try {
    const { category, question, answer } = req.body;
    
    if (!category || !question || !answer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const newFAQ = new FaqModel({
      category,
      question,
      answer
    });
    
    await newFAQ.save();
    
    res.status(201).json(newFAQ);
  } catch (err) {
    console.error('Error creating FAQ:', err);
    res.status(500).json({ message: 'Server error creating FAQ' });
  }
};

// Update an FAQ
export const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, question, answer } = req.body;
    
    const updatedFAQ = await FaqModel.findByIdAndUpdate(
      id,
      { category, question, answer, updatedAt: new Date() },
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
    
    res.json({ message: 'FAQ deleted successfully' });
  } catch (err) {
    console.error('Error deleting FAQ:', err);
    res.status(500).json({ message: 'Server error deleting FAQ' });
  }
};

// Search FAQs
export const searchFAQs = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query required' });
    }
    
    const results = await FaqModel.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
    
    res.json(results);
  } catch (err) {
    console.error('Error searching FAQs:', err);
    res.status(500).json({ message: 'Server error searching FAQs' });
  }
};

// Reorder FAQs
export const reorderFAQs = async (req, res) => {
  try {
    const { category, newOrder } = req.body;
    
    if (!category || !Array.isArray(newOrder)) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    
    // Update order for each FAQ
    const bulkOps = newOrder.map((faqId, index) => ({
      updateOne: {
        filter: { _id: faqId, category },
        update: { $set: { order: index } }
      }
    }));
    
    await FaqModel.bulkWrite(bulkOps);
    
    res.json({ message: 'FAQs reordered successfully' });
  } catch (err) {
    console.error('Error reordering FAQs:', err);
    res.status(500).json({ message: 'Server error reordering FAQs' });
  }
};