import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { generateToken, getCurrentUser, hash, verify } from "./utils";

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

const port = 4444;

app.get("/", (req, res) => {
  res.send("Starting project");
});

app.get("/books", async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        categories: true,
        cart: { include: { book: true } },
        boughtBooks: true,
      },
    });
    res.send(books);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/books/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const book = await prisma.book.findUnique({ where: { id } });
    if (book) {
      res.send(book);
    } else {
      res.status(400).send({ errors: ["Book not found"] });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { books: true },
    });
    res.send(categories);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/authors", async (req, res) => {
  try {
    const authors = await prisma.author.findMany({ include: { book: true } });
    res.send(authors);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
// app.get("/users", async (req, res) => {
//   const users = await prisma.user.findMany({
//     include: { cart: true, boughtBooks: true },
//   });
//   res.send(users);
// });

app.post("/cartItem", async (req, res) => {
  try {
    let { userId, bookId, quantity } = req.body;
    let errors: string[] = [];
    if (typeof userId !== "number") {
      errors.push("UserId not provided or not a number");
    }
    if (typeof bookId !== "number") {
      errors.push("BookId not provided or not a number");
    }
    if (quantity && typeof quantity !== "number") {
      errors.push("Quantity provided is not a number");
    }
    if (errors.length === 0) {
      const cartItem = await prisma.cartItem.create({
        data: {
          userId,
          bookId,
          quantity,
        },
        include: { book: true },
      });
      // cartItem.book.inStock = Number(cartItem.book.inStock - Number(quantity));
      // console.log(cartItem.book.inStock);
      res.send(cartItem);
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.post("/buy", async (req, res) => {
  // 1. Get the user from the token
  try {
    const token = req.headers.authorization;
    if (token) {
      const user = await getCurrentUser(token);
      if (!user) {
        res.status(400).send({ errors: ["Invalid token"] });
      } else {
        //2. Calculate the total from the cart
        let total = 0;
        for (let item of user.cart) {
          total += item.book.price + item.quantity;
        }

        //3. If the user has enough balance buy every book
        if (total < user.balance) {
          //4. Create a boughtBook and delete the cartItem for each book in the cart
          for (let item of user.cart) {
            await prisma.boughtBook.create({
              data: {
                userId: item.userId,
                bookId: item.bookId,
              },
            });

            await prisma.cartItem.delete({ where: { id: item.id } });
          }

          res.send({ message: "Order successful!" });
        } else {
          res.status(400).send({ errors: ["Uh oh... you broke!"] });
        }
      }
    } else {
      res.status(400).send({ errors: ["You are tired"] });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.post("/sign-up", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const errors: string[] = [];

    if (typeof name !== "string") {
      errors.push("Name missing or not a string");
    }
    if (typeof email !== "string") {
      errors.push("Email missing or not a string");
    }

    if (typeof password !== "string") {
      errors.push("Password missing or not a string");
    }

    if (errors.length > 0) {
      res.status(400).send({ errors });
      return;
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).send({ errors: ["Email already exists."] });
      return;
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash(password),
      },
    });
    const token = generateToken(user.id);
    res.send({ user, token });
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;
    const errors: string[] = [];

    if (typeof email !== "string") {
      errors.push("Email missing or not a string");
    }

    if (typeof password !== "string") {
      errors.push("Password missing or not a string");
    }

    if (errors.length > 0) {
      res.status(400).send({ errors });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { boughtBooks: true, cart: true },
    });
    if (user && verify(password, user.password)) {
      const token = generateToken(user.id);
      res.send({ user, token });
    } else {
      res.status(400).send({ errors: ["Username/password invalid."] });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/validate", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (token) {
      const user = await getCurrentUser(token);
      if (user) {
        const newToken = generateToken(user.id);
        res.send({ user, token: newToken });
      } else {
        res.status(400).send({ errors: ["Token invalid"] });
      }
    } else {
      res.status(400).send({ errors: ["Token not provided"] });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});
