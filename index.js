const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcrypt');
const axios = require('axios');


app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

const uri = "mongodb+srv://hirely-job-portal:HKMWexa1yBb2yzXZ@cluster0.ej6qyrh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        console.log("Connected to MongoDB!");

        const jobCollection = client.db('hirely-job-portal').collection('jobs');
        const courseCollection = client.db('hirely-job-portal').collection('courses');
        const companyCollection = client.db('hirely-job-portal').collection('companies');
        const userCollection = client.db('hirely-job-portal').collection('users');
        const coursecategoryCollection = client.db('hirely-job-portal').collection('course-category');
        const appliedCollection = client.db('hirely-job-portal').collection('applied');
        const savedCollection = client.db('hirely-job-portal').collection('saved');
        const cvCollection = client.db('hirely-job-portal').collection('cv');
        const chatCollection = client.db('hirely-job-portal').collection('chat');
        const paymentCollection = client.db('hirely-job-portal').collection('payments');
        const takenCollection = client.db('hirely-job-portal').collection('taken');

        const multer = require('multer');


        const upload = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'application/pdf') {
                    return cb(new Error('Only PDF files are allowed!'), false);
                }
                cb(null, true);
            }
        });

        app.post('/upload-cv', upload.single('cv'), async (req, res) => {
            try {
                const { email } = req.body;
                const cvFile = req.file;

                if (!email) {
                    return res.status(400).json({ message: 'Email is required!' });
                }
                if (!cvFile) {
                    return res.status(400).json({ message: 'No file uploaded.' });
                }

                const cvData = {
                    email,
                    cvFile: {
                        data: cvFile.buffer,
                        contentType: cvFile.mimetype,
                    },
                    originalName: cvFile.originalname,
                    uploadedAt: new Date(),
                };

                await cvCollection.updateOne(
                    { email },
                    { $set: cvData },
                    { upsert: true }
                );

                res.status(200).json({ message: 'CV uploaded successfully!' });
            } catch (error) {
                console.error('Error uploading CV:', error);
                res.status(500).json({ message: 'Internal server error.' });
            }
        });

        app.get('/get-cv/:email', async (req, res) => {
            try {
                const { email } = req.params;
                if (!email) {
                    return res.status(400).json({ message: 'Email is required!' });
                }

                const cv = await cvCollection.findOne({ email });

                if (!cv || !cv.cvFile) {
                    return res.status(404).json({ message: 'No CV found for this user.' });
                }

                res.setHeader('Content-Type', cv.cvFile.contentType);
                res.setHeader('Content-Disposition', `inline; filename="${cv.originalName}"`);

                res.send(cv.cvFile.data);
            } catch (error) {
                console.error('Error fetching CV:', error);
                res.status(500).json({ message: 'Internal server error.' });
            }
        });



        // Get all jobs
        app.get('/jobs', async (req, res) => {
            try {
                const result = await jobCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // Get all jobs with sponsored jobs prioritized
        app.get('/jobs', async (req, res) => {
            try {
                const jobs = await jobCollection.find().toArray();
                // Sort jobs: sponsored jobs come first
                const sortedJobs = jobs.sort((a, b) => {
                    if (a.sponsored === b.sponsored) return 0;
                    return a.sponsored ? -1 : 1;
                });
                res.send(sortedJobs);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get('/job/:email', async (req, res) => {
            try {
                const email = req.params.email; // Get the email from the URL parameter

                // Ensure the field name matches the one in your database (e.g., 'agencyEmail')
                const result = await jobCollection.find({ email: email }).toArray(); // Use the correct field name

                if (result.length > 0) {
                    res.send(result); // Send the job listings if found
                } else {
                    res.status(404).send("No jobs found for the specified email"); // Send a 404 if no jobs are found
                }
            } catch (error) {
                console.error("Error fetching jobs by email:", error);
                res.status(500).send("Internal Server Error");
            }
        });


        app.put('/job/:id', async (req, res) => {
            try {
                const jobId = req.params.id;
                const updatedJob = req.body;

                // Validate job ID
                if (!ObjectId.isValid(jobId)) {
                    return res.status(400).send("Invalid job ID");
                }

                // Update the job in the database
                const result = await jobCollection.updateOne(
                    { _id: new ObjectId(jobId) }, // Filter by job ID
                    { $set: updatedJob } // Update with the new job details
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send("Job not found");
                }

                res.send({ message: "Job updated successfully", updatedJob });
            } catch (error) {
                console.error("Error updating job:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // Delete a job by ID
        app.delete('/job/:id', async (req, res) => {
            try {
                const jobId = req.params.id;

                // Validate job ID
                if (!ObjectId.isValid(jobId)) {
                    return res.status(400).send("Invalid job ID");
                }

                // Delete the job from the database
                const result = await jobCollection.deleteOne({ _id: new ObjectId(jobId) });

                if (result.deletedCount === 0) {
                    return res.status(404).send("Job not found");
                }

                res.send({ message: "Job deleted successfully" });
            } catch (error) {
                console.error("Error deleting job:", error);
                res.status(500).send("Internal Server Error");
            }
        });


        app.get('/users', async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get('/applied', async (req, res) => {
            try {
                const result = await appliedCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get('/users/:id', async (req, res) => {
            try {
                const userId = req.params.id; // Get the user ID from the request parameters
                const user = await userCollection.findOne({ _id: new ObjectId(userId) }); // Find the user by ID

                if (!user) {
                    return res.status(404).send("User not found");
                }

                // Remove the password field from the user object
                const { password, ...userWithoutPassword } = user;

                res.send(userWithoutPassword); // Send the user data without the password
            } catch (error) {
                console.error("Error fetching user:", error);
                res.status(500).send("Internal Server Error");
            }
        });



        app.post('/followcompany', async (req, res) => {
            const { email, companyId } = req.body; // Extract email and companyId from the request body

            // Validate input
            if (!email || !companyId) {
                return res.status(400).json({ message: 'Email and companyId are required' });
            }

            try {
                // Find the company by companyId
                const company = await companyCollection.findOne({ _id: new ObjectId(companyId) });
                if (!company) {
                    return res.status(404).json({ message: 'Company not found' });
                }

                // Add the user's email to the company's followers array
                await companyCollection.updateOne(
                    { _id: new ObjectId(companyId) },
                    { $addToSet: { followers: email } } // Use $addToSet to avoid duplicates
                );

                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Add the companyId to the user's followedCompanies array
                await userCollection.updateOne(
                    { email },
                    { $addToSet: { followedCompanies: companyId } } // Use $addToSet to avoid duplicates
                );

                res.status(200).json({ message: 'Company followed successfully' });
            } catch (error) {
                console.error('Error following company:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.get('/companyfollowedbyuser/:email', async (req, res) => {
            const email = req.params.email; // Extract email from the route parameter

            // Validate input
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }

            try {
                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Get the followedCompanies array from the user object
                const followedCompanies = user.followedCompanies || [];

                // If the user is not following any companies, return an empty array
                if (followedCompanies.length === 0) {
                    return res.status(200).json([]);
                }

                // Convert company IDs to ObjectId
                const companyIds = followedCompanies.map(id => new ObjectId(id));

                // Find the companies using the company IDs
                const companies = await companyCollection.find({
                    _id: { $in: companyIds }
                }).toArray();

                // Send the list of companies to the frontend
                res.status(200).json(companies);
            } catch (error) {
                console.error('Error fetching followed companies:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.post('/unfollowcompany', async (req, res) => {
            const { email, companyId } = req.body; // Extract email and companyId from the request body

            // Validate input
            if (!email || !companyId) {
                return res.status(400).json({ message: 'Email and companyId are required' });
            }

            try {
                // Find the company by companyId
                const company = await companyCollection.findOne({ _id: new ObjectId(companyId) });
                if (!company) {
                    return res.status(404).json({ message: 'Company not found' });
                }

                // Remove the user's email from the company's followers array
                await companyCollection.updateOne(
                    { _id: new ObjectId(companyId) },
                    { $pull: { followers: email } } // Use $pull to remove the email
                );

                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Remove the companyId from the user's followedCompanies array
                await userCollection.updateOne(
                    { email },
                    { $pull: { followedCompanies: companyId } } // Use $pull to remove the companyId
                );

                res.status(200).json({ message: 'Company unfollowed successfully' });
            } catch (error) {
                console.error('Error unfollowing company:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.post('/update-user-details', async (req, res) => {
            const { email, dataType, data } = req.body; // Extract email, dataType, and data from request body

            // Validate input
            if (!email || !dataType || !data) {
                return res.status(400).json({ message: 'Email, dataType, and data are required' });
            }

            try {
                // Find the user by email
                const user = await userCollection.findOne({ email });

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                let updateQuery = {};

                if (dataType === 'WorkExp' || dataType === 'KeySkills') {
                    // Handle WorkExp and KeySkills differently: Append to the existing array
                    const existingData = user.UserDescription?.[dataType] || []; // Get existing data or initialize as empty array
                    const updatedData = [...existingData, data]; // Append the new data

                    updateQuery[`UserDescription.${dataType}`] = updatedData; // Update the array
                } else {
                    // For other data types, overwrite the existing data
                    updateQuery[`UserDescription.${dataType}`] = data;
                }

                // Update the user document
                const result = await userCollection.updateOne(
                    { email }, // Filter by email
                    { $set: updateQuery } // Update operation
                );

                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: `User ${dataType} updated successfully` });
                } else {
                    res.status(500).json({ message: `Failed to update user ${dataType}` });
                }
            } catch (error) {
                console.error(`Error updating user ${dataType}:`, error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        app.get('/users/:id', async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid ID");
                }
                const query = { _id: new ObjectId(id) };
                const result = await userCollection.findOne(query);
                if (!result) {
                    return res.status(404).send("Candidate not found");
                }
                res.send(result);
            } catch (error) {
                console.error("Error fetching candidate:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get('/users/email/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email };
                const result = await userCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("User not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching user:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.delete('/users/:id', async (req, res) => {
            try {
                const { applyId } = req.params;
                const { email } = req.query; // Pass email as a query parameter
                const query = { applyId, email };
                const result = await userCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });


        app.get('/course-category', async (req, res) => {
            try {
                const result = await coursecategoryCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // Update user password
        app.patch('/users/password', async (req, res) => {
            try {
                const { email, currentPassword, newPassword } = req.body;

                if (!email || !currentPassword || !newPassword) {
                    return res.status(400).json({ error: 'Email, current password, and new password are required' });
                }

                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) {
                    return res.status(400).json({ error: 'Current password is incorrect' });
                }

                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

                await userCollection.updateOne(
                    { email },
                    { $set: { password: hashedPassword } }
                );

                res.status(200).json({ message: 'Password updated successfully' });
            } catch (error) {
                console.error("Error updating password:", error.message);
                res.status(500).json({ error: 'Server error' });
            }
        });

        app.get('/companies', async (req, res) => {
            try {
                const result = await companyCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get('/applied-jobs', async (req, res) => {
            try {
                // Get user email - this should ideally come from authentication middleware
                const userEmail = req.user?.email || req.query.email;

                if (!userEmail) {
                    return res.status(401).json({ error: "Unauthorized - No user identified" });
                }

                // Validate email format
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
                    return res.status(400).json({ error: "Invalid email format" });
                }

                const appliedJobs = await appliedCollection.find({
                    email: userEmail
                }).sort({ appliedDate: -1 }).toArray();

                if (!appliedJobs.length) {
                    return res.status(200).json({
                        message: "No applied jobs found for this user",
                        data: []
                    });
                }

                res.status(200).json({
                    count: appliedJobs.length,
                    data: appliedJobs
                });

            } catch (error) {
                console.error("Error fetching applied jobs:", error);
                res.status(500).json({
                    error: "Internal Server Error",
                    details: error.message
                });
            }
        });



        // Backend: Save a job
        app.post('/saved', async (req, res) => {
            try {
                const savedItem = req.body;
                const result = await savedCollection.insertOne(savedItem);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // Backend: Save a job
        app.post('/jobs', async (req, res) => {
            try {
                const savedItem = req.body;

                // Step 1: Insert the job into the jobCollection
                const jobResult = await jobCollection.insertOne(savedItem);
                const jobId = jobResult.insertedId; // Get the inserted job ID

                // Step 2: Find the company by its name
                const company = await companyCollection.findOne({ Company_Name: savedItem.company });

                let notificationMessage = '';

                if (!company) {
                    // If the company is not found, set a message
                    notificationMessage = 'Company is not found, so notifications will not be sent to any candidates.';
                } else {
                    // Step 3: Get the list of followers
                    const followers = company.followers || [];

                    // Step 4: Add a notification to each follower's user document
                    for (const followerEmail of followers) {
                        const user = await userCollection.findOne({ email: followerEmail });

                        if (user) {
                            // Create a notification object
                            const notification = {
                                companyName: company.Company_Name,
                                jobId: jobId,
                                timestamp: new Date(),
                                notificationread: false
                            };

                            // Add the notification to the user's notification array
                            await userCollection.updateOne(
                                { email: followerEmail },
                                { $push: { notifications: notification } }
                            );
                        }
                    }

                    notificationMessage = 'Notifications sent to followers successfully.';
                }

                // Respond with both messages
                res.send({
                    message: 'Job posted successfully',
                    jobId,
                    notificationMessage,
                });
            } catch (error) {
                console.error('Error posting job:', error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });
        // Backend: Delete a saved job
        app.delete('/saved/:applyId', async (req, res) => {
            try {
                const { applyId } = req.params;
                const { email } = req.query; // Pass email as a query parameter
                const query = { applyId, email };
                const result = await savedCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.post('/applied', async (req, res) => {
            const { applyId, email, userEmail, name, jobTitle, company, salary, deadline, status } = req.body;

            if (!applyId || !email || !userEmail || !name || !jobTitle || !company || !salary || !deadline || !status) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            try {


                // Check if the candidate has already applied for this job
                const existingApplication = await appliedCollection.findOne({
                    applyId: applyId,
                    userEmail: userEmail,
                });

                if (existingApplication) {
                    return res.status(400).json({ message: 'You have already applied for this job' });
                }

                // Insert the applied job data into the applied collection
                const appliedItem = {
                    applyId,
                    email,
                    userEmail,
                    name,
                    jobTitle,
                    company,
                    salary,
                    deadline,
                    status,
                    applyTime: new Date(),
                };

                const appliedResult = await appliedCollection.insertOne(appliedItem);

                // Find the user (agency) with the email
                const agency = await userCollection.findOne({ email });

                if (!agency) {
                    return res.status(404).json({ message: 'Agency not found' });
                }

                // Check if the user role is not ADMIN
                if (agency.userRole !== 'ADMIN') {
                    // Find the candidate with userEmail
                    const candidate = await userCollection.findOne({ email: userEmail });

                    if (!candidate) {
                        return res.status(404).json({ message: 'Candidate not found' });
                    }

                    // Create a notification object
                    const notification = {
                        _id: new ObjectId(), // Generate a unique ID for the notification
                        jobTitle,
                        jobId: applyId,
                        CandidateName: candidate.name,
                        CandidateId: candidate._id,
                        applyTime: new Date(),
                        notificationRead: false,
                    };

                    // Update the agency's notifications array
                    const updateResult = await userCollection.updateOne(
                        { email: agency.email },
                        { $push: { notifications: notification } }
                    );

                    if (updateResult.modifiedCount === 0) {
                        return res.status(500).json({ message: 'Failed to update notifications' });
                    }
                }

                res.status(201).json({ message: 'Job application submitted successfully', appliedId: appliedResult.insertedId });
            } catch (error) {
                console.error('Error submitting job application:', error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });

        // Backend: Check if a job is saved
        app.get('/saved', async (req, res) => {
            try {
                const { email, applyId } = req.query;
                const query = { email };
                // Check if applyId is provided
                if (applyId) {
                    query.applyId = applyId;
                }
                // Query the saved jobs
                const result = await savedCollection.find(query).toArray();  // Ensure you're using toArray if expecting an array
                // Return saved jobs if found, otherwise send a 404 response
                if (result.length > 0) {
                    res.send(result);
                } else {
                    res.status(404).send({ message: 'No saved jobs found.' });
                }
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });




        app.patch("/applied/:id", async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await appliedCollection.updateOne(
                { applyId: id },
                { $set: { status: status } }
            );

            if (result.modifiedCount > 0) {
                res.json({ status });
            } else {
                res.status(400).json({ message: "Update failed" });
            }
        });



        // Get a single job by ID
        app.get('/jobs/:id', async (req, res) => {
            try {
                const id = req.params.id;

                // Validate the ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid job ID");
                }

                const query = { _id: new ObjectId(id) };
                const result = await jobCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("Job not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching job:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get('/companies/:id', async (req, res) => {
            try {
                const id = req.params.id;

                // Validate the ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid job ID");
                }

                const query = { _id: new ObjectId(id) };
                const result = await companyCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("Job not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching job:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get("/courses", async (req, res) => {
            try {
                const { category } = req.query; // Extract the category from query parameters
                let query = {}; // Initialize an empty query object

                // If a category is provided, filter by category
                if (category) {
                    query.category = category.toUpperCase(); // Ensure the category is in uppercase
                }

                // Fetch courses based on the query and sort by learners in descending order
                const result = await courseCollection
                    .find(query)
                    .sort({ learners: -1 }) // Sort by learners in descending order
                    .toArray();

                res.send(result); // Send the response
            } catch (error) {
                console.error("Error fetching courses:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get("/courses/:id", async (req, res) => {
            const id = req.params.id;
            // console.log('cookies : ',req.cookies);
            const query = { _id: new ObjectId(id) };
            const course = await courseCollection.findOne(query);
            res.send(course)
        })

        app.post('/register', async (req, res) => {
            const { name, phoneNumber, email, password, userRoll } = req.body;

            // Validate input data
            if (!name || !phoneNumber || !email || !password) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            // Check if the email or phone number already exists
            const existingUser = await userCollection.findOne({
                $or: [
                    { email: email }, // Check if email exists
                    { phoneNumber: phoneNumber }, // Check if phone number exists
                ],
            });

            if (existingUser) {
                if (existingUser.email === email) {
                    return res.status(400).json({ message: 'Email already exists.' });
                }
                if (existingUser.phoneNumber === phoneNumber) {
                    return res.status(400).json({ message: 'Phone number already exists.' });
                }
            }

            // Generate a 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

            // Create user object
            const user = {
                name,
                phoneNumber,
                email,
                password, // Password is already hashed in the frontend
                userRoll: "CANDIDATE",
                OTPverified: false, // OTP verification status (default: false)
                accountverified: false, // Account verification status (default: false)
                otp, // Store the OTP
                otpExpiry, // Store the OTP expiry time
                createdAt: new Date(),
            };

            // Insert user into the database
            const result = await userCollection.insertOne(user);

            // Create a response object without the password
            const userResponse = {
                _id: result.insertedId, // Include the MongoDB-generated ID
                name: user.name,
                phoneNumber: user.phoneNumber,
                email: user.email,
                userRoll: user.userRoll,
                OTPverified: user.OTPverified,
                accountverified: user.accountverified,
                createdAt: user.createdAt,
            };

            // Send response
            res.status(201).json({
                message: 'User registered successfully! OTP sent for verification.',
                user: userResponse, // Send the user data without the password
            });
        });
        app.post('/resend-otp', async (req, res) => {
            const { email } = req.body;

            // Generate a new 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

            // Update the user's OTP and expiry time
            await userCollection.updateOne(
                { email },
                { $set: { otp, otpExpiry } }
            );

            res.status(200).json({ message: 'New OTP sent successfully!' });
        });
        app.post('/verify-otp', async (req, res) => {
            const { otp, email } = req.body;

            // Find the user by email
            const user = await userCollection.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // Check if OTP matches and is not expired
            if (user.otp === otp && new Date() < new Date(user.otpExpiry)) {
                await userCollection.updateOne(
                    { email },
                    { $set: { OTPverified: true } } // Set OTPverified to true
                );
                return res.status(200).json({ message: 'OTP verified successfully!' });
            } else {
                return res.status(400).json({ message: 'Invalid or expired OTP.' });
            }
        });

        app.post('/register/agency', async (req, res) => {
            const { companyName, ownerName, phoneNumber, email, password } = req.body;

            // Validate input data
            if (!companyName || !ownerName || !phoneNumber || !email || !password) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            // Check if the email or phone number already exists
            const existingUser = await userCollection.findOne({
                $or: [
                    { email: email }, // Check if email exists
                    { phoneNumber: phoneNumber }, // Check if phone number exists
                ],
            });

            if (existingUser) {
                if (existingUser.email === email) {
                    return res.status(400).json({ message: 'Email already exists.' });
                }
                if (existingUser.phoneNumber === phoneNumber) {
                    return res.status(400).json({ message: 'Phone number already exists.' });
                }
            }

            // Generate a 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

            // Create user object for agency
            const agencyUser = {
                name: companyName,
                ownerName,
                phoneNumber,
                email,
                password, // Password is already hashed in the frontend
                userRoll: 'AGENCY',
                OTPverified: false, // OTP verification status (default: false)
                accountverified: false, // Account verification status (default: false)
                otp, // Store the OTP
                otpExpiry, // Store the OTP expiry time
                createdAt: new Date(),
            };

            // Insert agency user into the database
            const result = await userCollection.insertOne(agencyUser);

            // Create a response object without the password
            const userResponse = {
                _id: result.insertedId, // Include the MongoDB-generated ID
                name: agencyUser.name,
                ownerName: agencyUser.ownerName,
                phoneNumber: agencyUser.phoneNumber,
                email: agencyUser.email,
                userRoll: agencyUser.userRoll,
                OTPverified: agencyUser.OTPverified,
                accountverified: agencyUser.accountverified,
                createdAt: agencyUser.createdAt,
            };

            // Send response
            res.status(201).json({
                message: 'Agency registered successfully! OTP sent for verification.',
                user: userResponse, // Send the user data without the password
            });
        });
        app.post('/login', async (req, res) => {
            const { email, phoneNumber, password } = req.body;

            // Validate input data
            if ((!email && !phoneNumber) || !password) {
                return res.status(400).json({ message: 'Email/phone number and password are required.' });
            }

            try {
                // Find the user by email or phone number
                const user = await userCollection.findOne({
                    $or: [{ email }, { phoneNumber }],
                });

                if (!user) {
                    return res.status(404).json({ message: 'User not found.' });
                }

                // Compare the provided password with the stored hashed password
                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'Invalid password.' });
                }

                // Check if OTPverified is true
                if (user.OTPverified === true) {
                    // If OTP is verified, return a success response
                    return res.status(200).json({
                        message: 'Login successful!',
                        user: {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            phoneNumber: user.phoneNumber,
                            userRoll: user.userRoll,
                            OTPverified: true,
                            UserDescription: user.UserDescription,
                            notifications: user.notifications
                        },
                    });
                } else {
                    // If OTPverified is false or missing, generate a new OTP
                    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a 4-digit OTP
                    const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

                    // Update the user's record with the new OTP and expiry time
                    await userCollection.updateOne(
                        { _id: user._id },
                        { $set: { otp, otpExpiry, OTPverified: false } }
                    );

                    // Return a response indicating OTP verification is required
                    return res.status(200).json({
                        message: 'OTP verification required. A new OTP has been sent.',
                        user: {
                            name: user.name,
                            email: user.email,
                            phoneNumber: user.phoneNumber,
                            userRoll: user.userRoll,
                            OTPverified: false, // Indicate that OTP verification is pending
                        },
                    });
                }
            } catch (error) {
                console.error('Error during login:', error);
                res.status(500).json({ message: 'An error occurred during login.' });
            }
        });

        app.post("/google", async (req, res) => {
            const { googleId, name, email, image, userRoll } = req.body;

            if (!googleId || !name || !email || !image || !userRoll) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            try {
                await client.connect();
                const db = client.db("your_database_name");
                const userCollection = db.collection("users");

                // Check if the user already exists in the database
                const user = await userCollection.findOne({ googleId });

                if (user) {
                    // If the user exists, return the existing user data
                    return res.status(200).json({ message: "User already exists", user });
                }

                // If the user doesn't exist, create a new user
                const newUser = { googleId, name, email, image, userRoll };
                const result = await userCollection.insertOne(newUser);

                // Return the newly created user data
                res.status(201).json({ message: "User created successfully", user: newUser });
            } catch (error) {
                console.error("Error saving user data:", error);
                res.status(500).json({ message: "Internal server error", error: error.message });
            }
        });

        // Ensure you import ObjectId

        app.post('/notifications/mark-as-read', async (req, res) => {
            const { userId, jobId } = req.body;

            if (!userId || !jobId) {
                return res.status(400).json({ message: 'userId and jobId are required' });
            }

            try {
                // Find the user by userId
                const user = await userCollection.findOne({ _id: new ObjectId(userId) });

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Convert jobId to ObjectId for comparison
                const jobIdObjectId = new ObjectId(jobId);

                // Find the notification with the matching jobId
                const notificationIndex = user.notifications.findIndex(
                    (notif) => new ObjectId(notif.jobId).equals(jobIdObjectId) // Compare ObjectIds
                );

                if (notificationIndex === -1) {
                    return res.status(404).json({ message: 'Notification not found' });
                }

                // Update the notificationread field to true
                user.notifications[notificationIndex].notificationread = true;

                // Update the user document in the database
                await userCollection.updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { notifications: user.notifications } }
                );

                res.status(200).json({ message: 'Notification marked as read' });
            } catch (error) {
                console.error('Error marking notification as read:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.post('/messages', async (req, res) => {
            const { email, messageText, userRoll } = req.body;

            if (!email || !messageText || !userRoll) {
                return res.status(400).json({ error: 'Missing required fields: email, messageText, or userRoll' });
            }

            try {
                const newMessage = {
                    messageID: new ObjectId(), // Generate a unique ID for the message
                    messageText,
                    sentBy: userRoll, // Indicates who sent the message (admin or user)
                    timestamp: new Date(), // Add a timestamp for when the message was sent
                };

                // If the sender is an admin, find the recipient's (user's) conversation
                if (userRoll === 'admin') {
                    // Find the recipient's conversation (non-admin user)
                    const recipientConversation = await chatCollection.findOne({ email });

                    if (recipientConversation) {
                        // If the recipient's conversation exists, push the new message to their messages array
                        const result = await chatCollection.updateOne(
                            { email },
                            { $push: { messages: newMessage } }
                        );

                        return res.status(201).json({ message: 'Message stored successfully', data: result });
                    } else {
                        // If no conversation exists for the recipient, return an error
                        return res.status(404).json({ error: 'Recipient conversation not found' });
                    }
                }

                // If the sender is not an admin (e.g., a regular user), proceed as before
                const existingDoc = await chatCollection.findOne({ email });

                if (existingDoc) {
                    // If the document exists, push the new message to the messages array
                    const result = await chatCollection.updateOne(
                        { email },
                        { $push: { messages: newMessage } }
                    );

                    return res.status(201).json({ message: 'Message stored successfully', data: result });
                } else {
                    // If the document does not exist, create it with the messages array
                    const result = await chatCollection.insertOne({
                        email,
                        messages: [newMessage],
                    });

                    return res.status(201).json({ message: 'Message stored successfully', data: result });
                }
            } catch (error) {
                console.error('Error storing message:', error.message);
                console.error('Stack Trace:', error.stack);
                res.status(500).json({ error: 'Failed to store message', details: error.message });
            }
        });
        app.get('/messages', async (req, res) => {
            try {
                // Retrieve all documents from the chat collection
                const messages = await chatCollection.find({}).toArray();

                res.status(200).json(messages);
            } catch (error) {
                console.error('Error retrieving messages:', error.message);
                console.error('Stack Trace:', error.stack);
                res.status(500).json({ error: 'Failed to retrieve messages', details: error.message });
            }
        });
        app.get('/messages/:email', async (req, res) => {
            const { email } = req.params;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            try {
                // Retrieve the document for the specified email
                const userMessages = await chatCollection.findOne({ email });

                if (!userMessages) {
                    return res.status(404).json({ message: 'No messages found for this email' });
                }

                res.status(200).json(userMessages.messages);
            } catch (error) {
                console.error('Error retrieving messages:', error.message);
                console.error('Stack Trace:', error.stack);
                res.status(500).json({ error: 'Failed to retrieve messages', details: error.message });
            }
        });

        //Payments
        app.post('/create-payment', async (req, res) => {
            const paymentInfo = req.body;

            const trxId = new ObjectId().toString();

            const initiateData = {
                store_id: "hirel67dd8bcf0efd7",
                store_passwd: "hirel67dd8bcf0efd7@ssl",
                total_amount: paymentInfo.amount,
                currency: "BDT",
                tran_id: trxId,
                success_url: "http://localhost:5000/success-payment",
                fail_url: "http://localhost:5000/fail",
                cancel_url: "http://localhost:5000/cancel",
                cus_name: paymentInfo.name,
                cus_email: paymentInfo.email,
                cus_add1: "Dhaka",
                cus_add2: "Dhaka",
                cus_city: "Dhaka",
                cus_state: "Dhaka",
                cus_postcode: "1000",
                cus_country: "Bangladesh",
                cus_phone: paymentInfo.phoneNumber,
                cus_fax: "01711111111",
                shipping_method: "NO",
                product_name: paymentInfo.course,
                product_category: paymentInfo.category,
                product_profile: "general",
                multi_card_name: ["mastercard", "visacard", "amexcard"],
                value_a: "ref001_A",
                value_b: "ref002_B",
                value_c: "ref003_C",
                value_d: "ref004_D"
            };
            const response = await axios({
                method: "POST",
                url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
                data: initiateData,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
            })

            const saveData = {
                cus_name: paymentInfo.name,
                cus_email: paymentInfo.email,
                cus_phone: paymentInfo.phoneNumber,
                paymentId: initiateData.tran_id,
                product_name: paymentInfo.course,
                product_category: paymentInfo.category,
                paymentId: initiateData.tran_id,
                amount: paymentInfo.amount,
                status: "Pending"
            }

            const save = await paymentCollection.insertOne(saveData);

            if (save) {
                res.send({
                    paymentUrl: response.data.GatewayPageURL
                })
            }

        })

        app.post('/success-payment', async (req, res) => {
            const successData = req.body;
            console.log("Success Data", successData);

            if (successData.status !== "VALID") {
                throw new Error("UnAuthorized Payment, InValid Payment");
            }

            const query = {
                paymentId: successData.tran_id
            };

            const update = {
                $set: {
                    status: "Success",
                },
            };

            const updatedData = await paymentCollection.updateOne(query, update);

            if (updatedData.modifiedCount === 1) {
                const paymentDetails = await paymentCollection.findOne(query);

                if (paymentDetails) {
                    const { cus_email, product_name, product_category, amount, paymentId } = paymentDetails;
                    const course = await courseCollection.findOne({ title: product_name });

                    if (course) {
                        const takenCourseData = {
                            courseTitle: product_name,
                            category: product_category,
                            type: course.type,
                            certification: course.certification,
                            price: amount,
                            paymentId: paymentId,
                            userEmail: cus_email,
                            takenAt: new Date()
                        };

                        const result = await takenCollection.insertOne(takenCourseData);

                        if (result.insertedId) {
                            console.log("Course successfully added to the taken collection.");
                        } else {
                            console.error("Failed to add course to the taken collection.");
                        }
                    } else {
                        console.error("Course not found in the course collection.");
                    }
                } else {
                    console.error("Payment details not found.");
                }
            } else {
                console.error("Failed to update payment status.");
            }

            // Redirect to the job posting page with sponsored flag
            res.redirect(`http://localhost:5173/employeedashboard/newjobpost?sponsored=true`);
        });


        app.post('/fail', async (req, res) => {
            res.redirect("http://localhost:5173/fail")
        })
        app.post('/cancel', async (req, res) => {
            res.redirect("http://localhost:5173/cancel")
        })

        app.get('/taken', async (req, res) => {
            try {
                const userEmail = req.query.userEmail;

                if (!userEmail) {
                    return res.status(400).json({ message: "User email is required" });
                }

                const result = await takenCollection.find({ userEmail }).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching taken courses:", error);
                res.status(500).send("Internal Server Error");
            }
        });


        app.get('/payments', async (req, res) => {
            try {
                // Retrieve all documents from the chat collection
                const messages = await paymentCollection.find({}).toArray();

                res.status(200).json(messages);
            } catch (error) {
                console.error('Error retrieving messages:', error.message);
                console.error('Stack Trace:', error.stack);
                res.status(500).json({ error: 'Failed to retrieve messages', details: error.message });
            }
        });

        app.get('/payments', async (req, res) => {
            try {
                // Extract the user's email from the query parameters
                const userEmail = req.query.email;

                // Define a filter object (empty if no email is provided)
                const filter = userEmail ? { email: userEmail } : {};

                // Retrieve payments from the paymentCollection based on the filter
                const payments = await paymentCollection.find(filter).toArray();

                // Send the payments as a JSON response
                res.status(200).json(payments);
            } catch (error) {
                console.error('Error retrieving payments:', error.message);
                console.error('Stack Trace:', error.stack);

                // Send a structured error response
                res.status(500).json({
                    error: 'Failed to retrieve payments',
                    details: error.message,
                });
            }
        });

        app.put('/companies/:id', async (req, res) => {
            try {
                const companyId = req.params.id;
                const updatedCompany = req.body;

                // Validate the company ID
                if (!ObjectId.isValid(companyId)) {
                    return res.status(400).send("Invalid company ID");
                }

                // Update the company in the database
                const result = await companyCollection.updateOne(
                    { _id: new ObjectId(companyId) },
                    { $set: updatedCompany }
                );

                // Check if the company was found and updated
                if (result.matchedCount === 0) {
                    return res.status(404).send("Company not found");
                }

                // Send success response
                res.send({ message: "Company updated successfully", updatedCompany });
            } catch (error) {
                console.error("Error updating company:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // DELETE /companies/:id - Delete a company
        app.delete('/companies/:id', async (req, res) => {
            try {
                const companyId = req.params.id;

                // Validate the company ID
                if (!ObjectId.isValid(companyId)) {
                    return res.status(400).send("Invalid company ID");
                }

                // Delete the company from the database
                const result = await companyCollection.deleteOne({ _id: new ObjectId(companyId) });

                // Check if the company was found and deleted
                if (result.deletedCount === 0) {
                    return res.status(404).send("Company not found");
                }

                // Send success response
                res.send({ message: "Company deleted successfully" });
            } catch (error) {
                console.error("Error deleting company:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.post('/companies', async (req, res) => {
            try {
                const savedItem = req.body;
                const result = await companyCollection.insertOne(savedItem);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error adding company:', error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hirely Job Portal is running');
});

app.listen(port, () => {
    console.log(`Hirely Job Portal is running on port ${port}`);
});