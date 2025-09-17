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
    const reviewCollection =client.db('reviewDB').collection('reviews');
    const ordersCollection =client.db('orderDB').collection('orders');


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
// ✅ Review Routes
// =========================
// const ObjectId = require('mongodb').ObjectId;

// Get all reviews (optionally by product)
app.get('/reviews', async (req, res) => {
  const { productId } = req.query;

  try {
    const filter = productId ? { productId } : {};
    const reviews = await reviewCollection.find(filter).sort({ createdAt: -1 }).toArray();
    res.send(reviews);
  } catch (err) {
    res.status(500).send({ message: 'Failed to fetch reviews', error: err.message });
  }
});

// Check if user already reviewed a product
app.get('/reviews/check', async (req, res) => {
  const { productId, email } = req.query;

  if (!productId || !email) {
    return res.status(400).send({ message: "ProductId and email are required" });
  }

  try {
    const review = await reviewCollection.findOne({ productId, reviewerEmail: email });
    res.send({ reviewed: !!review });
  } catch (err) {
    res.status(500).send({ message: 'Failed to check review', error: err.message });
  }
});

// Add a new review
app.post('/reviews', async (req, res) => {
  const { productId, reviewerName, reviewerEmail, reviewerImage, rating, comment } = req.body;

  // Validation
  if (!productId || !reviewerName || !reviewerEmail || !rating || !comment) {
    return res.status(400).send({ message: "All fields are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).send({ message: "Rating must be between 1 and 5" });
  }

  try {
    // Check if user already reviewed this product
    const existing = await reviewCollection.findOne({ productId, reviewerEmail });
    if (existing) {
      return res.status(409).send({ message: 'You have already reviewed this product' });
    }

    const review = {
      productId,
      reviewerName,
      reviewerEmail,
      reviewerImage: reviewerImage || '',
      rating,
      comment,
      createdAt: new Date()
    };

    const result = await reviewCollection.insertOne(review);
    res.send({ insertedId: result.insertedId, message: "Review added successfully" });
  } catch (err) {
    res.status(500).send({ message: 'Failed to add review', error: err.message });
  }
});


// =========================
// ✅ Orders Route
// =========================
app.post('/orders', async (req, res) => {
  try {
    const orderData = req.body;

    // Validation
    if (!orderData.userEmail || !orderData.cart || orderData.cart.length === 0) {
      return res.status(400).send({ message: "Invalid order data" });
    }

    // 1️⃣ Save order
    const orderDoc = {
      userEmail: orderData.userEmail,
      cart: orderData.cart,
      subtotal: orderData.subtotal,
      shippingCost: orderData.shippingCost,
      total: orderData.total,
      billingInfo: orderData.billingInfo,
      shippingInfo: orderData.shippingInfo,
      paymentInfo: orderData.paymentInfo,
      createdAt: new Date(),
    };

    const result = await ordersCollection.insertOne(orderDoc);

    // 2️⃣ Update stock for each product
    for (const item of orderData.cart) {
      const productId = new ObjectId(item._id);
      await productCollection.updateOne(
        { _id: productId },
        { $inc: { stock: -(item.quantity || 1) } }
      );
    }

    // 3️⃣ Empty user's cart
    await cartCollection.deleteMany({ email: orderData.userEmail });

    res.status(201).send({
      message: "Order placed successfully",
      orderId: result.insertedId,
    });

  } catch (err) {
    console.error("❌ Error creating order:", err);
    res.status(500).send({ message: "Server error", error: err.message });
  }
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