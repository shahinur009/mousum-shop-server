const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ypdnj9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



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
        const addressCollections = client.db('airePro').collection('address')

        // get users from db
        app.get('/users', async (req, res) => {
            const result = await userCollections.find().toArray();
            res.send(result);
        })
        // insert new user by post method BD collection
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user)
            const result = await userCollections.insertOne(user)
            res.send(result)
        })
        // add Product API
        app.post('/add-product', async (req, res) => {
            const product = req.body;
            const result = await productCollections.insertOne(product)
            res.send(result)
        })

        //Get card Data form Database
        app.get('/show-product', async (req, res) => {
            const result = await productCollections.find().toArray()
            res.send(result);
        })

        //for details page
        app.get('/show-product/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid Product ID' });
            }
            try {
                const query = { _id: new ObjectId(id) };
                const result = await productCollections.findOne(query);
                if (!result) {
                    return res.status(404).send({ error: 'Product not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch product data', error });
            }
        });
        // single order get by ID
        app.get('/singleProduct/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid Product ID' });
            }
            try {
                const query = { _id: new ObjectId(id) };
                const result = await productCollections.findOne(query);
                if (!result) {
                    return res.status(404).send({ error: 'Product not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch product data', error });
            }
        });

        // Insert customer address data in Database
        app.post('/payment', async (req, res) => {
            const data = req.body;
            const paymentData = { ...data, createAt: new Date() }

            try {
                const result = await addressCollections.insertOne(paymentData);
                res.send({ success: true, result });
            } catch (error) {
                console.error("Error saving payment data:", error);
                res.status(500).send({ success: false, message: 'Failed to save payment data' });
            }
        });

        // Order Status change API
        app.get('/api/details/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const order = await addressCollections.findOne({ _id: new ObjectId(id) });
                if (!order) {
                    return res.status(404).send('Order not found');
                }

                const { product, ...orderDetails } = order;
                res.json({ ...orderDetails, product: { ...product, _id: undefined } }); // Exclude product ID
            } catch (error) {
                console.error('Error fetching order details:', error);
                res.status(500).send('Server error');
            }
        });

        // Route to update order status from pending to processing
        app.put('/api/orders/:id/status', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await addressCollections.updateOne(
                    { _id: new ObjectId(id) }, // Convert the string ID to ObjectId
                    { $set: { status: 'progress' } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send('Order not found');
                }

                const updatedOrder = await addressCollections.findOne({ _id: new ObjectId(id) });
                res.json(updatedOrder);
            } catch (error) {
                console.error('Error updating order status:', error);
                res.status(500).send('Server error');
            }
        });
        // Route to update order status from processing to Done
        app.put('/api/delivery-done/:id/status', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await addressCollections.updateOne(
                    { _id: new ObjectId(id) }, // Convert the string ID to ObjectId
                    { $set: { status: 'Done' } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send('Order not found');
                }

                const updatedOrder = await addressCollections.findOne({ _id: new ObjectId(id) });
                res.json(updatedOrder);
            } catch (error) {
                console.error('Error updating order status:', error);
                res.status(500).send('Server error');
            }
        });
        // Product delete API here:
        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            try {
                const result = await productCollections.deleteOne(query);
                if (result.deletedCount === 1) {
                    res.status(200).send({ message: 'Product deleted successfully' });
                } else {
                    res.status(404).send({ message: 'Product not found' });
                }
            } catch (error) {
                res.status(500).send({ message: 'Error deleting product', error });
            }
        });

        //Get stock Data form Database
        app.get('/stock', async (req, res) => {
            const { page = 1, limit = 10, category = '' } = req.query;

            const query = category ? { category } : {};

            const totalCount = await productCollections.countDocuments(query); // Get total product count
            const products = await productCollections.find(query)
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .toArray();

            res.json({ products, totalCount });
        });
        //Get order list Data form Database
        app.get('/orderList', async (req, res) => {
            const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
            const limit = parseInt(req.query.limit) || 5; // Default to 5 items per page if not provided
            const skip = (page - 1) * limit;

            try {
                // Get total number of products
                const totalProducts = await addressCollections.countDocuments();

                // Get the products for the current page
                const products = await addressCollections.find().skip(skip).limit(limit).toArray();

                // Send the response with products and total count
                res.json({
                    products,
                    totalCount: totalProducts,
                    totalPages: Math.ceil(totalProducts / limit),
                    currentPage: page
                });
            } catch (error) {
                console.error('Error fetching products:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        // get data for single product details by ID
        app.get('/api/details/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid Product ID' });
            }
            try {
                const query = { _id: new ObjectId(id) };
                const result = await addressCollections.findOne(query);
                if (!result) {
                    return res.status(404).send({ error: 'Product not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch product data', error });
            }
        });


        //Get stock Data to update API form Database
        app.get('/stockUpdate/:id', async (req, res) => {
            const id = req.params.id;
            try {
                const query = { _id: new ObjectId(id) }; // Ensure you are searching by ObjectId
                const product = await productCollections.findOne(query);
                if (product) {
                    res.status(200).json(product);
                } else {
                    res.status(404).json({ message: 'Product not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error fetching product', error });
            }
        });
        // Update product data
        app.put('/updateProduct/:id', async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid Product ID' });
            }

            try {
                const query = { _id: new ObjectId(id) };
                const update = {
                    $set: {
                        ...updateData
                    }
                };

                const result = await productCollections.updateOne(query, update);

                if (!result.matchedCount) {
                    return res.status(404).send({ error: 'Product not found' });
                }

                res.send({ message: 'Product updated successfully' });
            } catch (error) {
                res.status(500).send({ message: 'Failed to update product data', error });
            }
        });



    } finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running on Air-Pro')
})

app.listen(port, () => {
    console.log(`Air-Pro server is running on ${port}`)
})
