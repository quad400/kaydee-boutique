const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const cloudinary = require("cloudinary").v2;

const userRoute = require("./src/routes/userRoute")
const productRoute = require("./src/routes/productRoute")
const productCategoryRoute = require("./src/routes/productCategoryRoute")
const uploadRoute = require("./src/routes/uploadRoute")


const dbConnect = require("./src/config/db")
const { notFound, errorHandler } = require("./src/middlewares/errorMiddleware")
const { getCart, emptyCart } = require("./src/controllers/productCtrl")
const isAuthenticated = require("./src/middlewares/authMiddleware")
require("dotenv").config()

const app = express()

const port = process.env.PORT

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use("/api/user", userRoute)
app.use("/api/product", productRoute)
app.use("/api/category", productCategoryRoute)
app.use("/api/upload", uploadRoute)
// cart
app.get("/api/cart", isAuthenticated, getCart)
app.delete("/api/cart", isAuthenticated, emptyCart)





app.use(notFound)
app.use(errorHandler)

app.listen(port, ()=>{
    dbConnect()
    console.log(`Server running on port ${port}`)
})

process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
    console.log(err.name, err.message);
    process.exit(1);
  });
  
  process.on("unhandledRejection", (err) => {
    console.log("UNHANDLED REJECTION! 💥 Shutting down...");
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
  