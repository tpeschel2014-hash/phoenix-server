const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");

const {
  CloudinaryStorage
} = require("multer-storage-cloudinary");

// ======================
// EXPRESS
// ======================
const app = express();

// ======================
// SERVER
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
// STORAGE
// ======================
const storage =
  new CloudinaryStorage({

    cloudinary,

    params: async () => ({

      folder:
        "phoenix-chat",

      resource_type:
        "auto",

      allowed_formats: [

        "jpg",
        "jpeg",
        "png",
        "webp",
        "mp3",
        "m4a",
        "wav"

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

    avatar: {

      type: String,

      default: ""

    },

    pushToken: {

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

    voice: {

      type: String,

      default: ""

    },

    read: {

      type: Boolean,

      default: false

    },

    deleted: {

      type: Boolean,

      default: false

    },

    // ======================
    // REACTIONS
    // ======================
    reactions: {

      type: Object,

      default: {}

    },

    createdAt: Date

  });

// ======================
// GROUP SCHEMA
// ======================
const groupSchema =
  new mongoose.Schema({

    name: String,

    image: {

      type: String,

      default: ""

    },

    members: [
      String
    ],

    createdAt: Date

  });

// ======================
// GROUP MESSAGE SCHEMA
// ======================
const groupMessageSchema =
  new mongoose.Schema({

    groupId: String,

    from: String,

    text: String,

    image: String,

    voice: {

      type: String,

      default: ""

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

const Group =
  mongoose.model(

    "Group",

    groupSchema

  );

const GroupMessage =
  mongoose.model(

    "GroupMessage",

    groupMessageSchema

  );

// ======================
// ONLINE USERS
// ======================
let onlineUsers = [];

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

        user

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
// USERS
// ======================
app.get(

  "/users",

  async (req, res) => {

    try {

      const users =
        await User.find();

      res.json(users);

    } catch (err) {

      console.log(err);

      res.status(500).json([]);

    }

  }

);

// ======================
// PRIVATE MESSAGES
// ======================
app.get(

  "/private-messages/:me/:user",

  async (req, res) => {

    try {

      const {
        me,
        user
      } = req.params;

      const messages =
        await PrivateMessage.find({

          $or: [

            {

              from: me,

              to: user

            },

            {

              from: user,

              to: me

            }

          ]

        }).sort({

          createdAt: 1

        });

      res.json(messages);

    } catch (err) {

      console.log(err);

      res.status(500).json([]);

    }

  }

);

// ======================
// SAVE PUSH TOKEN
// ======================
app.post(

  "/save-push-token",

  async (req, res) => {

    try {

      const {
        username,
        pushToken
      } = req.body;

      await User.findOneAndUpdate(

        {
          username
        },

        {
          pushToken
        }

      );

      res.json({

        success: true

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          "TOKEN ERROR"

      });

    }

  }

);

// ======================
// UPLOAD
// ======================
app.post(

  "/upload",

  upload.single("image"),

  async (req, res) => {

    try {

      res.json({

        fileUrl:
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
// SOCKET CONNECTION
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

        if (
          !onlineUsers.includes(
            username
          )
        ) {

          onlineUsers.push(
            username
          );

        }

        io.emit(

          "onlineUsers",

          onlineUsers

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

              voice:
                data.voice,

              reactions: {},

              createdAt:
                new Date()

            });

          await message.save();

          io.emit(

            "privateMsg",

            message

          );

          // ======================
          // PUSH
          // ======================
          const targetUser =
            await User.findOne({

              username:
                data.to

            });

          if (
            targetUser &&
            targetUser.pushToken
          ) {

            try {

              await axios.post(

                "https://exp.host/--/api/v2/push/send",

                {

                  to:
                    targetUser.pushToken,

                  sound:
                    "default",

                  title:
                    data.from,

                  body:
                    data.text ||
                    "Neue Nachricht"

                },

                {

                  headers: {

                    Accept:
                      "application/json",

                    "Content-Type":
                      "application/json"

                  }

                }

              );

            } catch (err) {

              console.log(err);

            }

          }

        } catch (err) {

          console.log(err);

        }

      }

    );

    // ======================
    // DELETE MESSAGE
    // ======================
    socket.on(

      "deleteMessage",

      async (messageId) => {

        try {

          await PrivateMessage.findByIdAndUpdate(

            messageId,

            {

              deleted: true,

              text: "",

              image: "",

              voice: ""

            }

          );

          io.emit(

            "messageDeleted",

            messageId

          );

        } catch (err) {

          console.log(err);

        }

      }

    );

    // ======================
    // REACTION
    // ======================
    socket.on(

      "messageReaction",

      async (data) => {

        try {

          const {
            messageId,
            emoji,
            username
          } = data;

          const message =
            await PrivateMessage.findById(
              messageId
            );

          if (!message) {
            return;
          }

          const reactions =
            message.reactions || {};

          reactions[username] = emoji;

          message.reactions =
            reactions;

          await message.save();

          io.emit(

            "messageReaction",

            {

              messageId,

              reactions

            }

          );

        } catch (err) {

          console.log(err);

        }

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

              read: true

            }

          );

          io.emit(

            "messagesRead"

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
    // DISCONNECT
    // ======================
    socket.on(

      "disconnect",

      () => {

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
  process.env.PORT || 10000;

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
