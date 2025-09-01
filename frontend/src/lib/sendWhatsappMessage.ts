// lib/sendWhatsappMessage.ts
import api from './api';

export const sendWhatsappMessage = async (recipientNumber: string, message: string) => {
  try {
    const response = await api.post('/whatsapp/send', {
      integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER,
      recipient_number: recipientNumber, // must be in international format e.g., "919876543210"
      content_type: 'text',
      text: message
    }, {
      headers: {
        'authkey': import.meta.env.VITE_AUTH_KEY
      }
    });

    console.log('WhatsApp message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    throw error;
  }
};
