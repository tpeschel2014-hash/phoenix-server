const express =
  require("express");

const http =
  require("http");

const {
  Server
} = require("socket.io");

const cors =
  require("cors");

const mongoose =
  require("mongoose");

const bcrypt =
  require("bcryptjs");

const multer =
  require("multer");

const cloudinary =
  require("cloudinary").v2;

const {
  CloudinaryStorage
} = require(
  "multer-storage-cloudinary"
);

// ======================
// CLOUDINARY
// ======================
cloudinary.config({

  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET

});

// ======================
// STORAGE
// ======================
const storage =
  new CloudinaryStorage({

    cloudinary,

    params: async () => ({

      folder:
        "phoenix-chat",

      allowed_formats: [

        "jpg",
        "png",
        "jpeg",
        "webp"

      ]

    })

  });

const upload =
  multer({

    storage

  });

// ======================
// APP
// ======================
const app =
  express();

app.use(cors({

  origin: "*"

}));

app.use(express.json({

  limit: "50mb"

}));

app.use(express.urlencoded({

  extended: true,

  limit: "50mb"

}));

// ======================
// HTTP SERVER
// ======================
const server =
  http.createServer(app);

// ======================
// SOCKET SERVER
// ======================
const io =
  new Server(server, {

    cors: {

      origin: "*",

      methods: [
        "GET",
        "POST"
      ]

    }

  });

// ======================
// ONLINE USERS
// ======================
let onlineUsers = 0;

// ======================
// MONGODB
// ======================
mongoose.connect(

  process.env.MONGO_URI

);

mongoose.connection.once(

  "open",

  () => {

    console.log(
      "MONGODB CONNECTED"
    );

  }

);

mongoose.connection.on(

  "error",

  (err) => {

    console.log(err);

  }

);

// ======================
// USER SCHEMA
// ======================
const userSchema =
  new mongoose.Schema({

    username: {

      type: String,

      unique: true

    },

    password: String,

    createdAt: Date

  });

// ======================
// MESSAGE SCHEMA
// ======================
const messageSchema =
  new mongoose.Schema({

    text: String,

    image: String,

    username: String,

    avatar: String,

    createdAt: Date

  });

// ======================
// PRIVATE MESSAGE SCHEMA
// ======================
const privateMessageSchema =
  new mongoose.Schema({

    from: String,

    to: String,

    text: String,

    image: String,

    avatar: String,

    createdAt: Date

  });

// ======================
// MODELS
// ======================
const User =
  mongoose.model(

    "User",

    userSchema

  );

const Message =
  mongoose.model(

    "Message",

    messageSchema

  );

const PrivateMessage =
  mongoose.model(

    "PrivateMessage",

    privateMessageSchema

  );

// ======================
// ROOT
// ======================
app.get(

  "/",

  (req, res) => {

    res.send(
      "PHOENIX SERVER ONLINE"
    );

  }

);

// ======================
// IMAGE UPLOAD
// ======================
app.post(

  "/upload",

  upload.single("image"),

  async (req, res) => {

    try {

      res.json({

        success: true,

        imageUrl:
          req.file.path

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "UPLOAD ERROR"

      });

    }

  }

);

// ======================
// REGISTER
// ======================
app.post(

  "/register",

  async (req, res) => {

    try {

      const {
        username,
        password
      } = req.body;

      const existingUser =
        await User.findOne({

          username

        });

      if (existingUser) {

        return res.status(400).json({

          error:
            "USER EXISTS"

        });

      }

      const hashedPassword =
        await bcrypt.hash(

          password,

          10

        );

      const user =
        new User({

          username,

          password:
            hashedPassword,

          createdAt:
            new Date()

        });

      await user.save();

      res.json({

        success: true

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "REGISTER ERROR"

      });

    }

  }

);

// ======================
// LOGIN
// ======================
app.post(

  "/login",

  async (req, res) => {

    try {

      const {
        username,
        password
      } = req.body;

      const user =
        await User.findOne({

          username

        });

      if (!user) {

        return res.status(400).json({

          error:
            "USER NOT FOUND"

        });

      }

      const validPassword =
        await bcrypt.compare(

          password,

          user.password

        );

      if (!validPassword) {

        return res.status(400).json({

          error:
            "WRONG PASSWORD"

        });

      }

      res.json({

        success: true,

        username:
          user.username

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "LOGIN ERROR"

      });

    }

  }

);

// ======================
// GET USERS
// ======================
app.get(

  "/users",

  async (req, res) => {

    try {

      const users =
        await User.find(

          {},

          {

            password: 0

          }

        );

      res.json(users);

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "USERS ERROR"

      });

    }

  }

);

// ======================
// GET GLOBAL MESSAGES
// ======================
app.get(

  "/messages",

  async (req, res) => {

    try {

      const messages =
        await Message.find()
        .sort({

          createdAt: 1

        });

      res.json(messages);

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "MESSAGES ERROR"

      });

    }

  }

);

// ======================
// GET PRIVATE MESSAGES
// ======================
app.get(

  "/private-messages/:user1/:user2",

  async (req, res) => {

    try {

      const {

        user1,
        user2

      } = req.params;

      const messages =
        await PrivateMessage.find({

          $or: [

            {

              from: user1,

              to: user2

            },

            {

              from: user2,

              to: user1

            }

          ]

        }).sort({

          createdAt: 1

        });

      res.json(messages);

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "PRIVATE MESSAGES ERROR"

      });

    }

  }

);

// ======================
// SOCKET
// ======================
io.on(

  "connection",

  (socket) => {

    console.log(
      "USER CONNECTED"
    );

    onlineUsers++;

    io.emit(
      "onlineUsers",
      onlineUsers
    );

    // ======================
    // GLOBAL MESSAGE
    // ======================
    socket.on(

      "msg",

      async (data) => {

        try {

          const message =
            new Message({

              text:
                data.text,

              image:
                data.image,

              username:
                data.username,

              avatar:
                data.avatar,

              createdAt:
                new Date()

            });

          await message.save();

          io.emit(
            "msg",
            message
          );

        } catch (err) {

          console.log(err);

        }

      }

    );

    // ======================
    // PRIVATE MESSAGE
    // ======================
    socket.on(

      "privateMsg",

      async (data) => {

        try {

          const message =
            new PrivateMessage({

              from:
                data.from,

              to:
                data.to,

              text:
                data.text,

              image:
                data.image,

              avatar:
                data.avatar,

              createdAt:
                new Date()

            });

          await message.save();

          io.emit(
            "privateMsg",
            message
          );

        } catch (err) {

          console.log(err);

        }

      }

    );

    // ======================
    // TYPING
    // ======================
    socket.on(

      "typing",

      (username) => {

        socket.broadcast.emit(

          "typing",

          username

        );

      }

    );

    // ======================
    // STOP TYPING
    // ======================
    socket.on(

      "stopTyping",

      () => {

        socket.broadcast.emit(
          "stopTyping"
        );

      }

    );

    // ======================
    // DISCONNECT
    // ======================
    socket.on(

      "disconnect",

      () => {

        onlineUsers--;

        if (
          onlineUsers < 0
        ) {

          onlineUsers = 0;

        }

        io.emit(
          "onlineUsers",
          onlineUsers
        );

      }

    );

  }

);

// ======================
// PORT
// ======================
const PORT =
  process.env.PORT || 3000;

// ======================
// START
// ======================
server.listen(

  PORT,

  "0.0.0.0",

  () => {

    console.log(
      "SERVER RUNNING ON PORT " + PORT
    );

  }

);