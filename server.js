const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const {
  CloudinaryStorage
} = require("multer-storage-cloudinary");

// ======================
// EXPRESS
// ======================
const app = express();

// ======================
// HTTP SERVER
// ======================
const server = http.createServer(app);

// ======================
// SOCKET.IO
// ======================
const io = new Server(server, {

  cors: {

    origin: "*",

    methods: [
      "GET",
      "POST"
    ]

  }

});

// ======================
// MIDDLEWARE
// ======================
app.use(cors());

app.use(express.json({

  limit: "50mb"

}));

app.use(express.urlencoded({

  extended: true,

  limit: "50mb"

}));

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
// CLOUDINARY STORAGE
// ======================
const storage =
  new CloudinaryStorage({

    cloudinary,

    params: async () => ({

      folder:
        "phoenix-chat",

      allowed_formats: [

        "jpg",
        "jpeg",
        "png",
        "webp"

      ]

    })

  });

const upload =
  multer({

    storage

  });

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

    // ======================
    // PROFILE IMAGE
    // ======================
    avatar: {

      type: String,

      default: ""

    },

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

    read: {

      type: Boolean,

      default: false

    },

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

          avatar: "",

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
          user.username,

        avatar:
          user.avatar

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
// UPDATE PROFILE IMAGE
// ======================
app.post(

  "/update-avatar/:username",

  upload.single("image"),

  async (req, res) => {

    try {

      const {
        username
      } = req.params;

      const user =
        await User.findOneAndUpdate(

          {

            username

          },

          {

            avatar:
              req.file.path

          },

          {

            new: true

          }

        );

      res.json({

        success: true,

        avatar:
          user.avatar

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "AVATAR UPDATE ERROR"

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
// GET CONVERSATIONS
// ======================
app.get(

  "/conversations/:username",

  async (req, res) => {

    try {

      const {
        username
      } = req.params;

      const messages =
        await PrivateMessage.find({

          $or: [

            {
              from: username
            },

            {
              to: username
            }

          ]

        }).sort({

          createdAt: -1

        });

      const conversations =
        {};

      messages.forEach(

        (msg) => {

          const otherUser =

            msg.from === username
              ? msg.to
              : msg.from;

          if (

            !conversations[
              otherUser
            ]

          ) {

            conversations[
              otherUser
            ] = {

              username:
                otherUser,

              text:
                msg.text,

              image:
                msg.image,

              read:
                msg.read,

              createdAt:
                msg.createdAt

            };

          }

        }

      );

      res.json(

        Object.values(
          conversations
        )

      );

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "CONVERSATIONS ERROR"

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
          "PRIVATE MESSAGE ERROR"

      });

    }

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
// ONLINE USERS
// ======================
const onlineUsers =
  {};

// ======================
// SOCKET.IO
// ======================
io.on(

  "connection",

  (socket) => {

    console.log(
      "USER CONNECTED"
    );

    // ======================
    // USER ONLINE
    // ======================
    socket.on(

      "userOnline",

      (username) => {

        onlineUsers[
          username
        ] = socket.id;

        console.log(

          "ONLINE USERS:",

          Object.keys(
            onlineUsers
          )

        );

        io.emit(

          "onlineUsers",

          Object.keys(
            onlineUsers
          )

        );

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

              read: false,

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

      (data) => {

        io.emit(

          "typing",

          data

        );

      }

    );

    // ======================
    // STOP TYPING
    // ======================
    socket.on(

      "stopTyping",

      (data) => {

        io.emit(

          "stopTyping",

          data

        );

      }

    );

    // ======================
    // READ MESSAGES
    // ======================
    socket.on(

      "readMessages",

      async (data) => {

        try {

          await PrivateMessage.updateMany(

            {

              from:
                data.from,

              to:
                data.to,

              read: false

            },

            {

              $set: {

                read: true

              }

            }

          );

          io.emit(

            "messagesRead",

            data

          );

        } catch (err) {

          console.log(err);

        }

      }

    );

    // ======================
    // DISCONNECT
    // ======================
    socket.on(

      "disconnect",

      () => {

        for (

          const username
          in onlineUsers

        ) {

          if (

            onlineUsers[
              username
            ] === socket.id

          ) {

            delete onlineUsers[
              username
            ];

          }

        }

        console.log(

          "ONLINE USERS:",

          Object.keys(
            onlineUsers
          )

        );

        io.emit(

          "onlineUsers",

          Object.keys(
            onlineUsers
          )

        );

        console.log(
          "USER DISCONNECTED"
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
// START SERVER
// ======================
server.listen(

  PORT,

  "0.0.0.0",

  () => {

    console.log(

      "SERVER RUNNING ON PORT " +
      PORT

    );

  }

);