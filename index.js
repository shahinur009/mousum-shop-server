const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ypdnj9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ypdnj9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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
        const userCollections = client.db('airePro').collection('users')
        const productCollections = client.db('airePro').collection('products')
        const paymentCollections = client.db('airePro').collection('payments')

        // get users from db
        app.get('/users', async (req, res) => {
            const result = await userCollections.find().toArray();
            res.send(result);
        })
        // insert new user by post method BD collection
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user)
            // return
            // const query = { email: user?.email };
            // const existingUser = await userCollections.findOne(query)
            // if (existingUser) {
            //     return res.send({ message: 'user already exist', insertedId: null })
            // }
            const result = await userCollections.insertOne(user)
            res.send(result)
        })
        app.post('/add-product', async(req, res)=>{
            const product = req.body;
        })
    } finally {
        // // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running on Air-Pro')
})

app.listen(port, () => {
    console.log(`Air-Pro server is running on ${port}`)
})
