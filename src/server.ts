import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { generateToken, getCurrentUser, hash, verify } from "./utils";

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

const port = 4000;

app.get("/", (req, res) => {
  res.send("Starting project");
});

app.get("/books", async (req, res) => {
  try {
    const books = await prisma.book.findMany({ include: { categories: true } });
    res.send(books);
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
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({ include: { cart: true } });
  res.send(users);
});
app.get("/carts", async (req, res) => {
  const carts = await prisma.cart.findMany({ include: { books: true } });
  res.send(carts);
});

// app.post("/bookInCart", async (req, res) => {
// const book = await prisma.book.findUnique({where:{id}})
// });
app.post("/buy", async (req, res) => {
  // 1. Get the user from the token
  //2. Calculate the total from the cart
  //3. If the user has enough balance buy every book
  //4. Create a boughtBook and delete the cartItem for each book in the cart
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
