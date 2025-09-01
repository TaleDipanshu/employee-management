import api from './api';

export const whatsappApi = {
  sendLeadAssignTemplate: async (phone: string) => {
    try {
      console.log('=== Frontend WhatsApp Call ===');
      console.log('Phone:', phone);
      console.log('Employee Name:', employeeName);
      console.log('Lead Title:', leadTitle);

      // Clean phone number
      let formattedPhone = phone.replace(/[^\d+]/g, '');
      if (!formattedPhone.startsWith('91') && !formattedPhone.startsWith('+91')) {
        formattedPhone = formattedPhone.replace(/^\+/, '');
        formattedPhone = `91${formattedPhone}`;
      } else if (formattedPhone.startsWith('+91')) {
        formattedPhone = formattedPhone.substring(1);
      }

      const payload = {
        recipient_number: formattedPhone,
        template_name: 'lead_assign_notification',
        body_values: [employeeName, leadTitle],
        integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER
      };

      console.log('Sending payload:', payload);

      const response = await api.post('/whatsapp/send-template', payload);
      console.log('WhatsApp response:', response.data);
      return response;
    } catch (error) {
      console.error('=== Frontend WhatsApp Error ===');
      console.error('Error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }
};