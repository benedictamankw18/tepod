const express = require("express");
const ussdService = require("../services/ussd");

const router = express.Router();

/**
 * @openapi
 * /ussd:
 *   post:
 *     tags: [USSD]
 *     summary: Africa's Talking / Hubtel style USSD webhook
 *     description: |
 *       Returns plain text (not JSON). A response starting with `CON` continues the session
 *       with the given menu/options; a response starting with `END` terminates the session.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, phoneNumber]
 *             properties:
 *               sessionId: { type: string }
 *               phoneNumber: { type: string, example: "+233241234567" }
 *               text:
 *                 type: string
 *                 description: Accumulated input, `*`-separated
 *     responses:
 *       200:
 *         description: A CON or END text response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               examples:
 *                 menu:
 *                   value: "CON Welcome to AgriSmart.\n1. Register a profile\n2. List produce\n3. Check price\n"
 *                 end:
 *                   value: "END Thank you for using AgriSmart."
 *       400:
 *         description: Missing sessionId or phoneNumber (returned as text/plain)
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "END sessionId and phoneNumber are required."
 */
// POST /ussd - Africa's Talking / Hubtel style webhook. Returns plain text CON|END.
router.post("/", async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  if (!sessionId || !phoneNumber) {
    return res.status(400).type("text/plain").send("END sessionId and phoneNumber are required.");
  }
  const response = await ussdService.handle({ sessionId, phoneNumber, text });
  res.type("text/plain").send(response);
});

module.exports = router;
