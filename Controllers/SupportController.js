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

export const getSupportAll = async (req, res) => {
  try {
    // ✅ Extra safety: ensure the user is admin
    if (req.user?.type !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // ✅ Admin: see ALL tickets, regardless of user type
    const tickets = await SupportTicket.find()
      .populate("userId", "name email type") // adjust fields to your schema
      .sort("-createdAt");

    // Optional: admin can see all FAQs
    const faqs = await FaqModel.find();

    return res.status(200).json({
      tickets,
      faqs,
      userType: req.user.type, // "admin"
    });
  } catch (err) {
    console.error("Error in getSupportAll:", err);
    res.status(500).json({ message: "Server Error" });
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

export const replyToTicket = async (req, res) => {
  try {
    const { ticketId, reply, status } = req.body;

    if (!ticketId || !reply) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.reply = reply;
    if (status) ticket.status = status;
    ticket.repliedAt = new Date();

    await ticket.save();

    res.status(200).json({ message: "Reply sent successfully", ticket });
  } catch (err) {
    console.error("Reply Ticket Error:", err);
    res.status(500).json({ message: "Server error" });
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