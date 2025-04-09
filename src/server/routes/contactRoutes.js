import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send contact form email
router.post('/send', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Email options
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_USER, // The same account that sends password resets
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New message from website contact form</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
      replyTo: email
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully' 
    });
  } catch (error) {
    console.error('Error sending contact email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send message. Please try again.' 
    });
  }
});

export default router; 