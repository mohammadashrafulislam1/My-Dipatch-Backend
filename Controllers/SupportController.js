import { FaqModel } from "../Model/FAQ.js";
import { SupportTicket } from "../Model/SupportTicket.js";

// Driver/Customer Support Center
export const getSupportCenter = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id }).sort('-createdAt');
    const faqs = await FaqModel.find({ category: req.user.type });

    res.status(200).json({
      tickets,
      faqs,
      userType: req.user.type,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

  
  export const createTicket = async (req, res) => {
  try {
    const newTicket = new SupportTicket({
      userId: req.user.id,
      userType: req.user.type,
      issue: req.body.issue,
    });

    await newTicket.save();
    res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

  
  // Admin FAQ Management
  export const manageFAQs = async (req, res) => {
    try {
      const customerFAQs = await FaqModel.find({ category: 'customer' });
      const driverFAQs = await FaqModel.find({ category: 'driver' });
      
      res.render('admin/faqs', {
        customerFAQs,
        driverFAQs
      });
    } catch (err) {
      res.status(500).send('Server Error');
    }
  };
  
  export const createFAQ = async (req, res) => {
    try {
      const newFAQ = new FaqModel({
        category: req.body.category,
        question: req.body.question,
        answer: req.body.answer
      });
  
      await newFAQ.save();
      res.redirect('/admin/faqs');
    } catch (err) {
      res.status(500).send('Server Error');
    }
  };