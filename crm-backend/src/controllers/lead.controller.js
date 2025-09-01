const Lead = require("../models/lead.model")
const User = require("../models/user.model")
const axios = require("axios")

// Helper function to format lead response with IST timezone
const formatLeadResponse = (lead) => {
  // Convert to IST timezone
  const formatToIST = (date) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  return {
    id: lead._id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    status: lead.status,
    assignedTo: lead.assignedTo ? lead.assignedTo.name : "Not assigned",
    assignedToId: lead.assignedTo ? lead.assignedTo._id : null,
    course: lead.course,
    notes: lead.notes,
    createdDate: new Date(lead.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
    lastContact: formatToIST(lead.lastContact), // Now includes time in IST
    communications: lead.communications
      ? lead.communications.map((comm) => ({
          id: comm._id,
          type: comm.type,
          message: comm.message,
          by: comm.by ? comm.by.name : "Unknown",
          date: formatToIST(comm.timestamp), // Also includes time in IST
        }))
      : [],
    comments: lead.comments
      ? lead.comments.map((comment) => ({
          id: comment._id,
          message: comment.message,
          by: comment.by ? comment.by.name : "Unknown",
          timestamp: formatToIST(comment.timestamp),
        }))
      : [],
  }
}

exports.editLead = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, source, course, notes } = req.body

    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    // Check if user has permission (admin or assigned employee)
    if (req.user.role !== "admin" && (!lead.assignedTo || lead.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized to edit this lead" })
    }

    // Check if email is being changed and if new email already exists
    if (email && email.trim() !== "" && email !== lead.email) {
      const existingLead = await Lead.findOne({ email: email.trim(), _id: { $ne: id } })
      if (existingLead) {
        return res.status(409).json({ message: "Lead with this email already exists" })
      }
    }

    // Update lead fields
    lead.name = name || lead.name
    lead.email = email || lead.email
    lead.phone = phone || lead.phone
    lead.source = source || lead.source
    lead.course = course || lead.course
    lead.notes = notes || lead.notes
    lead.lastContact = new Date()

    await lead.save()

    const updatedLead = await Lead.findById(id)
      .populate("assignedTo", "name email")
      .populate("communications.by", "name")
      .populate("comments.by", "name")

    res.json({
      message: "Lead updated successfully",
      lead: formatLeadResponse(updatedLead),
    })
  } catch (error) {
    console.error("Error updating lead:", error)
    res.status(500).json({ message: "Failed to update lead" })
  }
}

exports.addComment = async (req, res) => {
  try {
    const { id } = req.params
    const { message } = req.body

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Comment message is required" })
    }

    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    // Check if user has permission (admin or assigned employee)
    if (req.user.role !== "admin" && (!lead.assignedTo || lead.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized to comment on this lead" })
    }

    const currentTime = new Date()

    lead.comments.push({
      message: message.trim(),
      by: req.user._id,
      timestamp: currentTime,
    })

    lead.lastContact = currentTime
    await lead.save()

    await lead.populate("comments.by", "name")

    res.json({
      message: "Comment added successfully",
      comment: {
        id: lead.comments[lead.comments.length - 1]._id,
        message: lead.comments[lead.comments.length - 1].message,
        by: lead.comments[lead.comments.length - 1].by.name,
        timestamp: new Date(lead.comments[lead.comments.length - 1].timestamp).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      },
    })
  } catch (error) {
    console.error("Error adding comment:", error)
    res.status(500).json({ message: "Failed to add comment" })
  }
}

exports.getComments = async (req, res) => {
  try {
    const { id } = req.params

    const lead = await Lead.findById(id).populate("comments.by", "name").select("comments assignedTo")

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    // Check if user has permission (admin or assigned employee)
    if (req.user.role !== "admin" && (!lead.assignedTo || lead.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized to view comments for this lead" })
    }

    const comments = lead.comments.map((comment) => ({
      id: comment._id,
      message: comment.message,
      by: comment.by ? comment.by.name : "Unknown",
      timestamp: new Date(comment.timestamp).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    }))

    res.json({ comments })
  } catch (error) {
    console.error("Error fetching comments:", error)
    res.status(500).json({ message: "Failed to fetch comments" })
  }
}

// Create a new lead
exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, source, course, notes } = req.body

    // Check if lead with this email already exists
    if (email && email.trim() !== "") {
      const existingLead = await Lead.findOne({ email: email.trim() })
      if (existingLead) {
        return res.status(409).json({ message: "Lead with this email already exists" })
      }
    }

    // Don't auto-assign, leave assignedTo as null/undefined for now
    const lead = new Lead({
      name,
      email,
      phone,
      source: source || "Manual Entry",
      course,
      notes,
      lastContact: new Date(), // Set current time
      // No assignedTo field - will be assigned manually later
    })

    await lead.save()

    // No WhatsApp notification here since no one is assigned yet
    res.status(201).json({
      message: "Lead created successfully",
      lead: formatLeadResponse(lead),
    })
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(409).json({ message: "Lead with this email already exists" })
    }
    res.status(500).json({ message: err.message })
  }
}

// Bulk import leads from Excel
exports.bulkImportLeads = async (req, res) => {
  try {
    const { leads } = req.body

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: "No leads data provided" })
    }

    const results = {
      successCount: 0,
      errors: [],
      duplicates: [],
    }

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i]
      const rowNumber = i + 2 // Excel rows start from 1, header is row 1

      try {
        // Validate required fields
        if (!leadData.name || !leadData.phone) {
          results.errors.push(`Row ${rowNumber}: Missing required fields (name, phone)`)
          continue
        }

        // Check for duplicate email
        if (leadData.email && leadData.email.trim() !== "") {
          const existingLead = await Lead.findOne({ email: leadData.email.trim() })
          if (existingLead) {
            results.duplicates.push({
              row: rowNumber,
              message: "Lead with this email already exists",
            })
            continue
          }
        }

        // Create new lead without auto-assignment
        const lead = new Lead({
          name: leadData.name.trim(),
          email: leadData.email ? leadData.email.toLowerCase().trim() : "",
          phone: leadData.phone.trim(),
          source: leadData.source || "Excel Import",
          course: leadData.course || "",
          notes: leadData.notes || "",
          status: leadData.status || "new",
          lastContact: new Date(), // Set current time
          // No assignedTo - will be assigned manually
        })

        await lead.save()
        results.successCount++

        // No WhatsApp notification since no one is assigned
      } catch (error) {
        console.error(`Error importing lead at row ${rowNumber}:`, error)
        if (error.code === 11000) {
          results.duplicates.push(`Row ${rowNumber}: Lead with email ${leadData.email} already exists`)
        } else {
          results.errors.push(`Row ${rowNumber}: ${error.message}`)
        }
      }
    }

    // Combine duplicates with errors for response
    const allErrors = [...results.errors, ...results.duplicates]

    res.status(200).json({
      message: `Import completed. ${results.successCount} leads imported successfully.`,
      successCount: results.successCount,
      errorCount: allErrors.length,
      errors: allErrors,
      totalProcessed: leads.length,
    })
  } catch (error) {
    console.error("Bulk import error:", error)
    res.status(500).json({ message: "Failed to import leads", error: error.message })
  }
}

// Get all leads with filters
exports.getLeads = async (req, res) => {
  try {
    const { status, source, searchTerm } = req.query
    const query = {}

    // Apply filters
    if (status && status !== "all") query.status = status
    if (source && source !== "all") query.source = source

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
        { course: { $regex: searchTerm, $options: "i" } },
      ]
    }

    // If employee, only show assigned leads
    if (req.user.role === "employee") {
      query.assignedTo = req.user._id
    }

    const leads = await Lead.find(query)
      .populate("assignedTo", "name")
      .populate("communications.by", "name")
      .populate("comments.by", "name")
      .sort({ createdAt: -1 })

    res.json(leads.map((lead) => formatLeadResponse(lead)))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Update lead status
exports.updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!["new", "follow-up", "enrolled", "not-interested", "contacted"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" })
    }

    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    // Check if user has permission (admin or assigned employee)
    if (req.user.role !== "admin" && (!lead.assignedTo || lead.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized to update this lead" })
    }

    lead.status = status
    lead.lastContact = new Date() // Update with current IST time
    await lead.save()

    const updatedLead = await Lead.findById(id)
      .populate("assignedTo", "name email")
      .populate("communications.by", "name")
      .populate("comments.by", "name")

    res.json({
      message: "Status updated successfully",
      lead: formatLeadResponse(updatedLead),
    })
  } catch (error) {
    console.error("Error updating lead status:", error)
    res.status(500).json({ message: "Failed to update lead status" })
  }
}

// Assign lead to employee
exports.assignLead = async (req, res) => {
  try {
    const { id } = req.params
    const { assignedTo } = req.body

    // Verify the employee exists
    const employee = await User.findById(assignedTo)
    if (!employee || employee.role !== "employee") {
      return res.status(404).json({ message: "Employee not found" })
    }

    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    lead.assignedTo = assignedTo
    lead.lastContact = new Date() // Update assignment time
    await lead.save()

    const updatedLead = await Lead.findById(id)
      .populate("assignedTo", "name email phone")
      .populate("communications.by", "name")
      .populate("comments.by", "name")

    const authKey = process.env.MSG91_AUTH_KEY
    const integratedNumber = process.env.MSG91_WHATSAPP_NUMBER

    if (authKey && integratedNumber && updatedLead.assignedTo && updatedLead.assignedTo.phone) {
      try {
        // Send single WhatsApp notification using template
        const response = await axios.post(
          "/whatsapp/send-template",
          {
            recipient_number: updatedLead.assignedTo.phone,
            template_name: "lead_assign_notification",
            body_values: [updatedLead.name, updatedLead.course || "N/A"],
            integrated_number: integratedNumber,
          },
          {
            headers: {
              "Content-Type": "application/json",
              authkey: authKey,
            },
          },
        )

        console.log(`WhatsApp notification sent to ${updatedLead.assignedTo.name} at ${updatedLead.assignedTo.phone}`)
      } catch (error) {
        console.error(`Failed to send WhatsApp notification:`, error.message)
      }
    }

    res.json({
      message: "Lead assigned successfully",
      lead: formatLeadResponse(updatedLead),
    })
  } catch (error) {
    console.error("Error assigning lead:", error)
    res.status(500).json({ message: "Failed to assign lead" })
  }
}

// Reassign lead (legacy support)
exports.reassignLead = async (req, res) => {
  try {
    const { assignedTo } = req.body
    const employee = await User.findOne({ name: assignedTo })
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" })
    }

    const lead = await Lead.findById(req.params.id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    lead.assignedTo = employee._id
    lead.lastContact = new Date() // Update reassignment time
    await lead.save()

    await lead.populate("assignedTo", "name email phone")

    const authKey = process.env.MSG91_AUTH_KEY
    const integratedNumber = process.env.MSG91_WHATSAPP_NUMBER

    if (authKey && integratedNumber && employee.phone) {
      try {
        // Send single WhatsApp notification using template
        const response = await axios.post(
          "/whatsapp/send-template",
          {
            recipient_number: employee.phone,
            template_name: "lead_assign_notification",
            body_values: [lead.name, lead.course || "N/A"],
            integrated_number: integratedNumber,
          },
          {
            headers: {
              "Content-Type": "application/json",
              authkey: authKey,
            },
          },
        )

        console.log(`WhatsApp notification sent to ${employee.name} at ${employee.phone}`)
      } catch (error) {
        console.error(`Failed to send WhatsApp notification:`, error.message)
      }
    }

    res.json({
      message: "Lead reassigned successfully",
      lead: formatLeadResponse(lead),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Add communication
exports.addCommunication = async (req, res) => {
  try {
    const { type, message } = req.body
    const lead = await Lead.findById(req.params.id)

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    // Check if user has permission (admin or assigned employee)
    if (req.user.role !== "admin" && (!lead.assignedTo || lead.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized to add communication for this lead" })
    }

    // Use current time for both communication timestamp and lastContact
    const currentTime = new Date()

    lead.communications.push({
      type,
      message,
      by: req.user._id,
      timestamp: currentTime,
    })

    lead.lastContact = currentTime
    await lead.save()
    await lead.populate("communications.by", "name")

    res.json({
      message: "Communication added successfully",
      lead: formatLeadResponse(lead),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Get lead details
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name")
      .populate("communications.by", "name")
      .populate("comments.by", "name")

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    // Check if user has permission (admin or assigned employee)
    if (req.user.role !== "admin" && (!lead.assignedTo || lead.assignedTo._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized to view this lead" })
    }

    res.json(formatLeadResponse(lead))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Delete lead
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params

    const lead = await Lead.findById(id)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    await Lead.findByIdAndDelete(id)

    res.json({ message: "Lead deleted successfully" })
  } catch (error) {
    console.error("Error deleting lead:", error)
    res.status(500).json({ message: "Failed to delete lead" })
  }
}

// Added bulk delete leads functionality
exports.bulkDeleteLeads = async (req, res) => {
  try {
    console.log("Request body:", req.body) // Debug log
    const { leadIds } = req.body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "No lead IDs provided" })
    }

    // Verify all leads exist and user has permission
    const leads = await Lead.find({ _id: { $in: leadIds } })

    if (req.user.role === "employee") {
      // Check if employee can delete these leads (only their assigned ones)
      const unauthorizedLeads = leads.filter(
        (lead) => !lead.assignedTo || lead.assignedTo.toString() !== req.user._id.toString(),
      )

      if (unauthorizedLeads.length > 0) {
        return res.status(403).json({
          message: "Not authorized to delete some leads",
          unauthorizedCount: unauthorizedLeads.length,
        })
      }
    }

    // Delete all leads
    const result = await Lead.deleteMany({ _id: { $in: leadIds } })

    res.json({
      message: `Successfully deleted ${result.deletedCount} leads`,
      deletedCount: result.deletedCount,
      requestedCount: leadIds.length,
    })
  } catch (error) {
    console.error("Bulk delete error:", error)
    res.status(500).json({
      message: "Failed to delete leads",
      error: error.message,
    })
  }
}
