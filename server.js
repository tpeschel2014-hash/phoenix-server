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

// ======================
// APP
// ======================
const app =
  express();

app.use(cors({

  origin: "*"

}));

app.use(express.json());

app.use(express.urlencoded({

  extended: true

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

  "mongodb+srv://tpeschel2014_db_user:Odin2506@cluster0.sqqvw9n.mongodb.net/phoenixchat?retryWrites=true&w=majority&appName=Cluster0"

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

    console.log(
      "MONGODB ERROR:"
    );

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

      unique: true,

      required: true

    },

    password: {

      type: String,

      required: true

    },

    createdAt: Date

  });

// ======================
// MESSAGE SCHEMA
// ======================
const messageSchema =
  new mongoose.Schema({

    text: String,

    username: String,

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

      console.log(
        "REGISTER REQUEST:"
      );

      console.log(
        req.body
      );

      const {
        username,
        password
      } = req.body;

      // ======================
      // VALIDATION
      // ======================
      if (
        !username ||
        !password
      ) {

        return res.status(400).json({

          error:
            "MISSING DATA"

        });

      }

      // ======================
      // USER EXISTS
      // ======================
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

      // ======================
      // HASH PASSWORD
      // ======================
      const hashedPassword =
        await bcrypt.hash(

          password,

          10

        );

      // ======================
      // CREATE USER
      // ======================
      const user =
        new User({

          username,

          password:
            hashedPassword,

          createdAt:
            new Date()

        });

      await user.save();

      console.log(
        "USER CREATED"
      );

      res.json({

        success: true

      });

    } catch (err) {

      console.log(
        "REGISTER ERROR:"
      );

      console.log(err);

      res.status(500).json({

        error:
          "REGISTER SERVER ERROR"

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

      console.log(
        "LOGIN REQUEST:"
      );

      console.log(
        req.body
      );

      const {
        username,
        password
      } = req.body;

      // ======================
      // FIND USER
      // ======================
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

      // ======================
      // CHECK PASSWORD
      // ======================
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

      console.log(
        "LOGIN SUCCESS"
      );

      res.json({

        success: true,

        username:
          user.username

      });

    } catch (err) {

      console.log(
        "LOGIN ERROR:"
      );

      console.log(err);

      res.status(500).json({

        error:
          "LOGIN SERVER ERROR"

      });

    }

  }

);

// ======================
// GET MESSAGES
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

      console.log(
        "MESSAGES ERROR:"
      );

      console.log(err);

      res.status(500).json({

        error:
          "MESSAGES SERVER ERROR"

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
    // ONLINE USERS
    // ======================
    onlineUsers++;

    io.emit(

      "onlineUsers",

      onlineUsers

    );

    // ======================
    // SEND MESSAGE
    // ======================
    socket.on(

      "msg",

      async (data) => {

        try {

          const message =
            new Message({

              text:
                data.text,

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

          console.log(
            "MESSAGE ERROR:"
          );

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

        console.log(
          "USER DISCONNECTED"
        );

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
// START SERVER
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