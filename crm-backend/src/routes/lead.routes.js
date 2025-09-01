const express = require("express")
const router = express.Router()
const leadController = require("../controllers/lead.controller")
const { verifyToken, isAdmin } = require("../middlewares/auth.middleware")

// Get all leads (filtered for employees)
router.get("/", verifyToken, leadController.getLeads)

// Create new lead
router.post("/", verifyToken, leadController.createLead)

// Bulk import leads from Excel
router.post("/bulk-import", verifyToken, leadController.bulkImportLeads)

// Bulk delete leads - MUST come before /:id routes
// Change from DELETE to POST
router.post("/bulk-delete", verifyToken, leadController.bulkDeleteLeads)

// Dynamic routes with :id parameter come AFTER static routes
router.get("/:id", verifyToken, leadController.getLeadById)
router.put("/:id", verifyToken, leadController.editLead)
router.put("/:id/status", verifyToken, leadController.updateLeadStatus)
router.put("/:id/assign", verifyToken, isAdmin, leadController.assignLead)
router.post("/:id/communications", verifyToken, leadController.addCommunication)
router.post("/:id/comments", verifyToken, leadController.addComment)
router.get("/:id/comments", verifyToken, leadController.getComments)
router.put("/:id/reassign", verifyToken, isAdmin, leadController.reassignLead)
router.delete("/:id", verifyToken, leadController.deleteLead)

module.exports = router
