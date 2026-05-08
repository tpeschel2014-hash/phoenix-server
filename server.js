//
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

          // ONLY LATEST
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