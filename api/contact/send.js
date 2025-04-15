// api/contact/send.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

// Create a transporter object
// Ensure EMAIL_USER and EMAIL_PASSWORD (App Password for Gmail) are set in Vercel Env Vars
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // Default to Gmail if not specified
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export default async function handler(req, res) {
    // Only allow POST method
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { name, email, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields (name, email, subject, message) are required'
            });
        }

        console.log(`Received contact form submission from ${email}`);

        // Email options
        const mailOptions = {
            from: { // Use object format for better compatibility
                name: name,
                address: process.env.EMAIL_USER // Send from your verified address
            },
            to: process.env.EMAIL_USER, // Send to yourself
            replyTo: email, // Set the sender's email as the reply-to address
            subject: `Contact Form: ${subject}`,
            html: `
                <h3>New message via website contact form</h3>
                <hr>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
                <hr>
            `,
            // Optional: Add a text version for email clients that don't support HTML
            // text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log(`Contact form email sent successfully to ${process.env.EMAIL_USER}`);

        return res.status(200).json({
            success: true,
            message: 'Message sent successfully!'
        });

    } catch (error) {
        console.error('Error sending contact email:', error);
        // Check for specific nodemailer errors if needed
        return res.status(500).json({
            success: false,
            message: 'Failed to send message due to a server error. Please try again later.'
        });
    }
} 