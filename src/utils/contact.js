// Utility for WhatsApp integration
export const openWhatsApp = (message, phoneNumber = "+254710806049") => {
  // Format the phone number correctly (remove any spaces, dashes, etc.)
  const formattedPhoneNumber = phoneNumber.replace(/\D/g, "");
  
  // Get user info from localStorage if available
  const userJson = localStorage.getItem('user');
  let userInfo = '';
  
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      userInfo = `\n\nUser: ${user.email}`;
      
      // Add message prefix
      message = `${message}${userInfo}`;
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  
  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Create the WhatsApp URL
  const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
  
  // Open WhatsApp in a new tab
  window.open(whatsappUrl, "_blank");
};
