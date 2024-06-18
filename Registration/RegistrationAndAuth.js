const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/subhika');

// Get the default connection
const db = mongoose.connection;

// Event listener for successful connection
db.on('connected', () => {
    console.log('Connected to MongoDB');
});

// Define a schema for registration data
const registrationSchema = new mongoose.Schema({
    companyName: String,
    clientID: String,
    clientSecret: String,
    ownerName: String,
    ownerEmail: String,
    rollNo: String,
});

// Create a model based on the schema
const Registration = mongoose.model('Registration', registrationSchema);

// POST endpoint for obtaining Authorization Token
app.post('/test/auth', async (req, res) => {
    // Extract registration data from request body
    const { companyName, clientID, clientSecret, ownerName, ownerEmail, rollNo } = req.body;

    try {
        // Check if the provided clientID and clientSecret match the stored data
        const registration = await Registration.findOne({ companyName, clientID, clientSecret });

        // If registration data is found, generate JWT token
        if (registration) {
            const token = jwt.sign(
                {
                    companyName: registration.companyName,
                    ownerName: registration.ownerName,
                    ownerEmail: registration.ownerEmail,
                    rollNo: registration.rollNo,
                },
                'your_secret_key', // Change this to your actual secret key
                { expiresIn: '7d' } // Token expiration time (7 days)
            );

            // Respond with the generated token
            res.status(200).json({
                token_type: 'Bearer',
                access_token: token,
                expires_in: Math.floor(Date.now() / 1000) + 604800, // Current timestamp + 7 days (in seconds)
            });
        } else {
            // If registration data doesn't match, return error
            res.status(401).json({ error: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Error generating authorization token:', error);
        res.status(500).json({ error: 'Failed to generate authorization token' });
    }
});

// POST endpoint for registration
app.post('/test/register', async (req, res) => {
    // Extract registration data from request body
    const { companyName, ownerName, rollNo, ownerEmail, accessCode } = req.body;

    // Generate clientID (UUID)
    const clientID = uuidv4();

    // Generate clientSecret (Random string)
    const clientSecret = generateRandomString();

    // Save registration data to MongoDB
    try {
        const registration = new Registration({
            companyName,
            clientID,
            clientSecret,
            ownerName,
            ownerEmail,
            rollNo,
        });
        await registration.save();
        // Respond with registration details
        res.json({
            companyName,
            clientID,
            clientSecret,
            ownerName,
            ownerEmail,
            rollNo,
        });
    } catch (error) {
        console.error('Error saving registration:', error);
        res.status(500).json({ error: 'Failed to register company' });
    }
});

// GET endpoint to fetch all registration data
app.get('/test/register', async (req, res) => {
    try {
        const registrations = await Registration.find();
        res.json(registrations);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// Function to generate random string for clientSecret
function generateRandomString() {
    return crypto.randomBytes(16).toString('hex');
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
