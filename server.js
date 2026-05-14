// ======================
// IMPORTS
// ======================
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

// ======================
// APP
// ======================
const app = express();

const server =
  http.createServer(app);

const io =
  new Server(server, {
    cors: {
      origin: "*"
    }
  });

// ======================
// CONFIG
// ======================
const PORT =
  process.env.PORT || 10000;

const MONGO_URI =
  "mongodb+srv://tpeschel2014_db_user:Odin2506@cluster0.sqqvw9n.mongodb.net/phoenix?retryWrites=true&w=majority&appName=Cluster0";

// ======================
// MIDDLEWARE
// ======================
app.use(cors());

app.use(express.json({
  limit: "100mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "100mb"
}));

// ======================
// UPLOADS
// ======================
const uploadPath =
  path.join(
    __dirname,
    "uploads"
  );

if (
  !fs.existsSync(uploadPath)
) {

  fs.mkdirSync(uploadPath);

}

app.use(
  "/uploads",
  express.static(uploadPath)
);

// ======================
// MULTER
// ======================
const storage =
  multer.diskStorage({

    destination:
      function (
        req,
        file,
        cb
      ) {

        cb(
          null,
          uploadPath
        );

      },

    filename:
      function (
        req,
        file,
        cb
      ) {

        cb(

          null,

          Date.now() +
          "-" +
          file.originalname

        );

      }

  });

const upload =
  multer({
    storage
  });

// ======================
// MONGODB
// ======================
mongoose.connect(
  MONGO_URI
)

.then(() => {

  console.log(
    "MONGODB CONNECTED"
  );

})

.catch((err) => {

  console.log(
    "MONGO ERROR",
    err
  );

});

// ======================
// USER SCHEMA
// ======================
const userSchema =
  new mongoose.Schema({

    username: {
      type: String,
      unique: true
    },

    name: String,

    password: String,

    avatar: {
      type: String,
      default: ""
    }

  });

const User =
  mongoose.model(
    "User",
    userSchema
  );

// ======================
// PRIVATE MESSAGE
// ======================
const privateMessageSchema =
  new mongoose.Schema({

    from: String,

    to: String,

    text: String,

    image: String,

    voice: String,

    read: {
      type: Boolean,
      default: false
    },

    deleted: {
      type: Boolean,
      default: false
    },

    reactions: {
      type: Object,
      default: {}
    },

    replyTo: {
      type: Object,
      default: null
    },

    storyReply: {
      type: Object,
      default: null
    },

    createdAt: {
      type: Date,
      default: Date.now
    }

  });

const PrivateMessage =
  mongoose.model(
    "PrivateMessage",
    privateMessageSchema
  );

// ======================
// GROUP SCHEMA
// ======================
const groupSchema =
  new mongoose.Schema({

    name: String,

    members: {
      type: [String],
      default: []
    },

    createdAt: {
      type: Date,
      default: Date.now
    }

  });

const Group =
  mongoose.model(
    "Group",
    groupSchema
  );

// ======================
// GROUP MESSAGE
// ======================
const groupMessageSchema =
  new mongoose.Schema({

    groupId: String,

    from: String,

    text: String,

    image: String,

    voice: String,

    createdAt: {
      type: Date,
      default: Date.now
    }

  });

const GroupMessage =
  mongoose.model(
    "GroupMessage",
    groupMessageSchema
  );

// ======================
// STORY SCHEMA
// ======================
const storySchema =
  new mongoose.Schema({

    username: String,

    avatar: String,

    mediaUrl: String,

    type: String,

    viewers: {

      type: [String],

      default: []

    },

    createdAt: {

      type: Date,

      default: Date.now,

      expires: 86400

    }

  });

const Story =
  mongoose.model(
    "Story",
    storySchema
  );

// ======================
// ROOT
// ======================
app.get(

  "/",

  (req, res) => {

    res.send(
      "PHOENIX SERVER RUNNING"
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

      if (
        !username ||
        !password
      ) {

        return res.json({

          success: false,

          message:
            "Fehlende Daten"

        });

      }

      const exists =
        await User.findOne({

          $or: [

            {
              username
            },

            {
              name:
                username
            }

          ]

        });

      if (exists) {

        return res.json({

          success: false,

          message:
            "Benutzer existiert"

        });

      }

      const user =
        new User({

          username,

          name:
            username,

          password

        });

      await user.save();

      res.json({

        success: true,

        user

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        success: false,

        error:
          "Register Fehler"

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

      console.log(
        "LOGIN:",
        username
      );

      if (
        !username ||
        !password
      ) {

        return res.json({

          success: false,

          message:
            "Fehlende Daten"

        });

      }

      const user =
        await User.findOne({

          $or: [

            {
              username
            },

            {
              name:
                username
            }

          ]

        });

      if (!user) {

        return res.json({

          success: false,

          message:
            "User nicht gefunden"

        });

      }

      if (

        user.password !==
        password

      ) {

        return res.json({

          success: false,

          message:
            "Falsches Passwort"

        });

      }

      res.json({

        success: true,

        user

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        success: false,

        error:
          "Login Fehler"

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

      res.json(
        users
      );

    } catch (err) {

      console.log(err);

      res.status(500).json([]);

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

      if (!req.file) {

        return res.json({

          success: false

        });

      }

      const fileUrl =

        req.protocol +
        "://" +
        req.get("host") +
        "/uploads/" +
        req.file.filename;

      res.json({

        success: true,

        fileUrl

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        success: false

      });

    }

  }

);

// ======================
// START
// ======================
server.listen(

  PORT,

  () => {

    console.log(

      "SERVER RUNNING ON PORT",

      PORT

    );

  }

);