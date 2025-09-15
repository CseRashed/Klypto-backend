const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.gfesh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const productCollection = client.db('productDB').collection('products');
    const userCollection = client.db('usersDB').collection('users');
    const cartCollection = client.db('cartDb').collection('carts');
    const messageCollection = client.db('chatDB').collection('messages');

    // =========================
    // ✅ Products Routes
    // =========================
    app.get('/products', async (req, res) => {
      const { category, position } = req.query;
      let filter = {};

      if (category) filter.category = category;
      if (position) filter.position = position;

      try {
        const products = await productCollection.find(filter).toArray();
        res.send(products);
      } catch (err) {
        res.status(500).send({ message: "Error fetching products", error: err.message });
      }
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const product = await productCollection.findOne({ _id: new ObjectId(id) });
        if (!product) return res.status(404).send({ message: 'Product not found' });
        res.send(product);
      } catch (err) {
        res.status(500).send({ message: 'Error fetching product', error: err.message });
      }
    });

    app.post('/products', async (req, res) => {
      try {
        const result = await productCollection.insertOne(req.body);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Error adding product", error: err.message });
      }
    });

    app.patch('/products/:id', async (req, res) => {
      const id = req.params.id;
      const updateDoc = { $set: req.body };
      try {
        const result = await productCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: '✅ Product updated successfully!' });
        } else {
          res.status(404).send({ success: false, message: '❌ No matching product found or no changes made.' });
        }
      } catch (err) {
        res.status(500).send({ message: 'Error updating product', error: err.message });
      }
    });

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).send({ message: 'Product not found' });
        res.send({ message: 'Product deleted successfully' });
      } catch (err) {
        res.status(500).send({ message: 'Error deleting product', error: err.message });
      }
    });

    // =========================
    // ✅ Users Routes
    // =========================
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const existing = await userCollection.findOne({ email: user.email });
      if (existing) return res.status(409).send({ message: 'User already exists' });
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      const updateDoc = { $set: req.body };
      try {
        const result = await userCollection.updateOne({ email }, updateDoc);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: 'Error updating user', error: err.message });
      }
    });

    // =========================
    // ✅ Cart Routes
    // =========================
    app.get('/carts', async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    app.get('/carts/:email', async (req, res) => {
      const email = req.params.email;
      const result = await cartCollection.find({ email }).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const { name, email } = req.body;
      const existing = await cartCollection.findOne({ name, email });
      if (existing) return res.status(409).send({ message: 'Product already in cart' });
      const result = await cartCollection.insertOne(req.body);
      res.send(result);
    });

    app.patch('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const { quantity } = req.body;
      const updateDoc = { $set: { quantity: quantity || 1 } };
      const result = await cartCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
      res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // =========================
    // ✅ Message Routes (Optional)
    // =========================
    // Add your message routes here if needed

    // MongoDB test
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Error starting server:", err);
  }
}

run().catch(console.dir);

// Root
app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});