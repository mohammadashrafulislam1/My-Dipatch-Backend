import express from 'express';
import { createFAQ, deleteFAQ, getAllFAQs, reorderFAQs, searchFAQs, updateFAQ } from '../Controllers/FAQController.js';

export const faqRouter = express.Router();

// Get all FAQs grouped by category
faqRouter.get('/', getAllFAQs);

// Create new FAQ
faqRouter.post('/', createFAQ);

// Update FAQ
faqRouter.put('/:id', updateFAQ);

// Delete FAQ
faqRouter.delete('/:id', deleteFAQ);

// Search FAQs
faqRouter.get('/search', searchFAQs);

// Reorder FAQs
faqRouter.post('/reorder', reorderFAQs);
