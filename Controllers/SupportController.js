// Driver/Customer Support Center
export const getSupportCenter = async (req, res) => {
    try {
      const tickets = await SupportTicket.find({ userId: req.user.id }).sort('-createdAt');
      const faqs = await FAQ.find({ category: req.user.type });
      
      res.render('support/center', {
        tickets,
        faqs,
        userType: req.user.type
      });
    } catch (err) {
      res.status(500).send('Server Error');
    }
  };
  
  export const createTicket = async (req, res) => {
    try {
      const newTicket = new SupportTicket({
        userId: req.user.id,
        userType: req.user.type,
        issue: req.body.issue
      });
  
      await newTicket.save();
      res.redirect('/support');
    } catch (err) {
      res.status(500).send('Server Error');
    }
  };
  
  // Admin FAQ Management
  export const manageFAQs = async (req, res) => {
    try {
      const customerFAQs = await FAQ.find({ category: 'customer' });
      const driverFAQs = await FAQ.find({ category: 'driver' });
      
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
      const newFAQ = new FAQ({
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