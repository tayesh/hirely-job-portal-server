const express = require('express');
const app = express();
// const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;

require('dotenv').config();

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://hirely-job-portal:HKMWexa1yBb2yzXZ@cluster0.ej6qyrh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });

        const courseCollection = client.db('hirely-job-portal').collection('courses');


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


        



        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hirely Job Portal is running');
});

app.listen(port, () => {
    console.log(`Hirely Job Portal is running on port ${port}`);
});