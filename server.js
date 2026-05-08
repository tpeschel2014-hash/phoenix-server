//
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