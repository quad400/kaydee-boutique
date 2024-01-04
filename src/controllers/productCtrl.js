const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const ProductCategory = require("../models/categoryModel");
const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const validateId = require("../utils/validateId");

const createProduct = asyncHandler(async (req, res) => {
  try {
    const user = req.user;

    if (user.role === "admin") {
      const newProduct = await Product.create(req.body);
      return res.json(newProduct);
    }

    return res.status(400).json({
      status: "fail",
      message: "User must have a brand name to create product",
    });
  } catch (err) {
    throw new Error(err);
  }
});

const getProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    validateId(id);
    const getProduct = await Product.findById(id).populate("category");

    if (!getProduct) {
      throw new Error("Product with this id not found");
    }
    res.json(getProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    validateId(id);

    const user = req.user;
    const findProduct = await Product.findById(id);

    // check if the user is the one that created the product
    if (user.role === "admin") {
      const updateProduct = await Product.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      res.json(updateProduct);
      return;
    }
    throw new Error("User does not have permission to update this product");
  } catch (error) {
    throw new Error(error);
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    validateId(id);
    const user = req.user;
    const findProduct = await Product.findById(id);
    // check if the user is the one that created the product
    if (user.role === "admin") {
      await Product.findByIdAndDelete(id);

      res.json({
        status: "successful",
        message: "Product successfully deleted",
      });
      return;
    } else if (user.role !== "admin") {
      res.status(401).json({
        status: "fail",
        message: "User does not have permission to update this product",
      });
      return;
    }

    return res.status(404).json({
      status: "fail",
      message: "Product does not exist",
    });
  } catch (err) {
    throw new Error(err);
  }
});

const getAllProduct = asyncHandler(async (req, res) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields", "search"];
    excludeFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // Add the search parameter to the query
    const { search } = req.query;
    if (search) {
      query = query.find({ title: { $regex: search, $options: "i" } });
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // Limiting the fields
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // Pagination
    const page = req.query.page;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const productCount = await Product.countDocuments();
      if (skip >= productCount) {
        throw new Error("This Page does not exist");
      }
    }

    const products = await query;
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const addToCart = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity, size, color } = req.body;

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if the user has a cart, create one if not
    let cart = await Cart.findOne({ order_by: userId });

    if (!cart) {
      cart = new Cart({ order_by: userId, products: [] });
    }

    // Check if the product is already in the cart, update quantity if so, add otherwise
    const existingProductIndex = cart.products.findIndex((p) =>
      p.product.equals(productId)
    );

    if (existingProductIndex !== -1) {
      cart.products[existingProductIndex].quantity += quantity;
    } else {
      cart.products.push({ product: productId, quantity, size, color });
    }

    // Update total based on the current prices and quantities
    cart.cartTotal = cart.products.reduce((total, cartItem) => {
      const productPrice = product.price;
      return total + productPrice * cartItem.quantity;
    }, 0);

    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const cart = await Cart.findOne({ order_by: userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    // Remove the product from the cart
    cart.products = cart.products.filter((p) => !p.product.equals(id));

    // Update the total
    cart.total = cart.products.reduce((total, cartItem) => {
      const productPrice = cartItem.product.price;
      return total + productPrice * cartItem.quantity;
    }, 0);

    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateId(_id);

  try {
    const getCart = await Cart.findOne({ order_by: _id }).populate(
      "products.product"
    );
    res.json(getCart);
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  getAllProduct,
  getCart,
  addToCart,
  removeFromCart,
};
