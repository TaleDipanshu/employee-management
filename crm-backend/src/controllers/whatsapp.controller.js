const WhatsappLog = require('../models/whatsappLog.model');
const axios = require('axios');

// Send a WhatsApp template message
exports.sendTemplateMessage = async (req, res) => {
  try {
    let { recipient_number, template_name, body_values, integrated_number } = req.body;
    
    // Use integrated number from request or environment
    integrated_number = integrated_number || process.env.MSG91_WHATSAPP_NUMBER;
    const authkey = process.env.MSG91_AUTH_KEY;

    console.log('Template message request:', {
      recipient_number,
      template_name,
      body_values,
      integrated_number: integrated_number ? `${integrated_number.substring(0, 4)}****` : 'not set',
      authkey: authkey ? 'set' : 'not set'
    });

    // Validate required parameters
    if (!integrated_number) {
      return res.status(400).json({ 
        error: 'Integrated WhatsApp number is not configured. Please check MSG91_WHATSAPP_NUMBER environment variable.' 
      });
    }

    if (!authkey) {
      return res.status(400).json({ 
        error: 'MSG91 Auth Key is not configured. Please check MSG91_AUTH_KEY environment variable.' 
      });
    }

    if (!recipient_number) {
      return res.status(400).json({ error: 'Recipient number is required' });
    }

    if (!template_name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    if (!Array.isArray(body_values)) {
      return res.status(400).json({ error: 'body_values must be an array' });
    }

    // Format recipient number
    let formattedNumber = recipient_number.toString();
    
    // Remove any non-numeric characters except +
    formattedNumber = formattedNumber.replace(/[^\d+]/g, '');
    
    // Handle country code formatting
    if (!formattedNumber.startsWith('91') && !formattedNumber.startsWith('+91')) {
      // Remove any leading + and add country code
      formattedNumber = formattedNumber.replace(/^\+/, '');
      formattedNumber = `91${formattedNumber}`;
    } else if (formattedNumber.startsWith('+91')) {
      formattedNumber = formattedNumber.substring(1); // Remove + sign
    }

    const payload = {
      integrated_number,
      recipient_number: formattedNumber,
      content_type: 'template',
      template: {
        template_name,
        body_values
      }
    };

    console.log('Sending to MSG91:', {
      ...payload,
      integrated_number: `${integrated_number.substring(0, 4)}****`
    });

    const response = await axios.post(
      'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
      payload,
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authkey
        }
      }
    );

    console.log('MSG91 Response:', response.data);

    // Log the message if successful
    if (response.data && response.status === 200) {
      try {
        const log = new WhatsappLog({
          recipient: formattedNumber,
          template_name,
          body_values,
          status: 'sent',
          response: response.data,
          timestamp: new Date()
        });
        await log.save();
      } catch (logError) {
        console.error('Error logging WhatsApp message:', logError);
        // Don't fail the main request if logging fails
      }
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error sending template message:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        data: error.config.data
      } : 'no config'
    });

    // Return more detailed error information
    const errorResponse = {
      error: error.response?.data?.message || error.message || 'Failed to send WhatsApp message',
      details: error.response?.data || null,
      status: error.response?.status || 500
    };

    res.status(error.response?.status || 500).json(errorResponse);
  }
};

// Keep other existing methods...
exports.logMessage = async (req, res) => {
  try {
    const log = new WhatsappLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getLogsForLead = async (req, res) => {
  try {
    const logs = await WhatsappLog.find({ leadId: req.params.leadId });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendDirectMessage = async (req, res) => {
  try {
    const { recipient_number, content_type, text } = req.body;
    const integrated_number = req.body.integrated_number || process.env.MSG91_WHATSAPP_NUMBER;
    const authkey = process.env.MSG91_AUTH_KEY;

    if (!integrated_number || !recipient_number || !content_type || !text) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const payload = {
      integrated_number,
      recipient_number,
      content_type,
      text
    };

    const response = await axios.post(
      'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
      payload,
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authkey
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
};

exports.sendBulkMessages = async (req, res) => {
  try {
    let messageData = req.body;
    const authkey = process.env.MSG91_AUTH_KEY;

    if (!messageData.integrated_number && process.env.MSG91_WHATSAPP_NUMBER) {
      messageData = {
        ...messageData,
        integrated_number: process.env.MSG91_WHATSAPP_NUMBER
      };
    }

    if (!messageData.integrated_number || !messageData.content_type || !messageData.payload) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await axios.post(
      'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
      messageData,
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authkey
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error sending bulk WhatsApp messages:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    let { number } = req.params;
    if (!number || number === 'default') {
      number = process.env.MSG91_WHATSAPP_NUMBER;
    }

    if (!number) {
      return res.status(400).json({ error: 'WhatsApp number is required' });
    }

    const { template_name, template_status, template_language } = req.query;
    const authkey = process.env.MSG91_AUTH_KEY;

    const response = await axios.get(
      `https://control.msg91.com/api/v5/whatsapp/get-template-client/${number}`,
      {
        params: {
          template_name: template_name || '',
          template_status: template_status || '',
          template_language: template_language || ''
        },
        headers: {
          accept: 'application/json',
          authkey
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching templates:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
};
