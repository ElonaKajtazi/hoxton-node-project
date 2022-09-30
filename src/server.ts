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
  res.send(`<h1>Book/Author API</h1>
  <h2>Available resources:</h2>
  <ul>
    <li><a href="/books">Books</a></li>
    <li><a href="/authors">Authors</a></li>
    <li><a href="/books/id">Book by id </a></li>
    <li><a href="/authors/id">Author by id </a></li>
    <li><a href="/categories/">Categories</a></li>


  </ul>`);
});

app.get("/books", async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        categories: true,
        cart: { include: { book: { include: { author: true } } } },
        boughtBooks: { include: { book: { include: { author: true } } } },
        author: true,
      },
    });
    res.send(books);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.get("/booksPerCategory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["Category id not provided"] });
      return;
    }
    const category = await prisma.category.findUnique({
      where: { id },
      include: { books: true },
    });
    if (!category) {
      res.status(404).send({ errors: ["Category not found"] });
      return;
    }
    res.send(category.books);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/booksPerAuthor/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).send({ errors: ["Author id not provided"] });
      return;
    }
    const author = await prisma.author.findUnique({
      where: { id },
      include: { book: true },
    });
    if (!author) {
      res.status(404).send({ errors: ["Author not found"] });
      return;
    }
    res.send(author.book);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/books/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const book = await prisma.book.findUnique({
      where: { id },
      include: { author: true, categories: true },
    });
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

app.get("/authors/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const author = await prisma.author.findUnique({
      where: { id },
      include: { book: true },
    });
    if (author) {
      res.send(author);
    } else {
      res.status(400).send({ errors: ["Author not found"] });
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
app.get("/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id },
      include: { books: true },
    });
    if (category) {
      res.send(category);
    } else {
      res.status(400).send({ errors: ["Category not found"] });
    }
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
  const users = await prisma.user.findMany({
    include: { cart: true, boughtBooks: true },
  });
  res.send(users);
});

app.post("/cartItem", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      res.status(401).send({ errors: ["No token provided."] });
      return;
    }
    const user = await getCurrentUser(token);
    if (!user) {
      res.status(401).send({ errors: ["Invalid token provided."] });
      return;
    }
    const data = {
      userId: user.id,
      bookId: req.body.bookId,
      quantity: req.body.quantity,
    };

    let errors: string[] = [];
    const book = await prisma.book.findUnique({
      where: { id: Number(data.bookId) },
    });

    if (!book) {
      res.status(404).send({ errors: ["Book not found"] });
      return
    if (Number(book.inStock) < Number(data.quantity)) {
      errors.push("Not enough books in stock");
    }
    // if (!data.quantity) {
    //   await prisma.book.update({
    //     where: { id: Number(data.bookId) },
    //     data: { inStock: Number(book.inStock) - 1 },
    //   });
    //   data.quantity = 1;
    // } else {
      if (book.inStock <= 0) {
        await prisma.book.update({
          where: { id: data.bookId },
          data: { inStock: 0 },
        });
      }
      await prisma.book.update({
        where: { id: Number(data.bookId) },
        data: { inStock: book.inStock - Number(data.quantity) },
      });
    // }


    if (typeof data.userId !== "number") {
      errors.push("UserId not provided or not a number");
    }
    if (typeof data.bookId !== "number") {
      errors.push("BookId not provided or not a number");
      return;
    }
    if (data.quantity && typeof data.quantity !== "number") {
      errors.push("Quantity provided is not a number");
    }
 
    if (errors.length === 0) {
      const cartItem = await prisma.cartItem.create({
        data: {
          userId: data.userId,
          bookId: data.bookId,
          quantity: data.quantity,
        },
        include: { book: { include: { author: true } } },
      });

      res.send(cartItem);
    } else {
      res.status(400).send({ errors });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.get("/cartItems", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(404).send({ errors: ["Token not found"] });
      return;
    }
    const user = await getCurrentUser(token);
    if (!user) {
      res.status(404).send({ errors: ["Invalid tokwn"] });
      return;
    }
    res.send(user.cart);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});
app.delete("/cartItem/:id", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(404).send({ errors: ["Token not found"] });
      return;
    }
    const user = await getCurrentUser(token);
    if (!user) {
      res.status(404).send({ errors: ["Invalid token provided"] });
      return;
    }
    const id = Number(req.params.id);
    if (!id) {
      res
        .status(400)
        .send({ errors: ["CartItem with this id does not exist"] });
      return;
    }
    const cartItem = await prisma.cartItem.delete({
      where: { id },
      include: { book: true },
    });
    if (!cartItem) {
      res.status(404).send({ errors: ["Cart item not found"] });
      return;
    }
    await prisma.book.update({
      where: { id: cartItem.bookId },
      data: {
        inStock: cartItem.book.inStock + cartItem.quantity,
      },
    });
    res.send(user.cart);
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
          total += item.book.price * item.quantity;
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
          await prisma.user.update({
            where: { id: user.id },
            data: {
              balance: user.balance - total,
            },
          });
          res.send({ message: "Order successful!" });
        } else {
          res.status(400).send({ errors: ["Uh oh... you broke!"] });
        }
      }
    } else {
      res.status(400).send({ errors: ["Token not found"] });
    }
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.post("/sign-up", async (req, res) => {
  // const { name, email, password } = req.body;
  const data = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.email,
  };
  try {
    const errors: string[] = [];

    if (typeof data.name !== "string") {
      errors.push("Name missing or not a string");
    }
    if (typeof data.email !== "string") {
      errors.push("Email missing or not a string");
    }

    if (typeof data.password !== "string") {
      errors.push("Password missing or not a string");
    }

    if (errors.length > 0) {
      ///
      res.status(400).send({ errors });
      return;
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      res.status(400).send({ errors: ["Email already exists."] });
      return;
    }
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hash(data.password),
      },
      include: {
        boughtBooks: { include: { book: { include: { author: true } } } },
        cart: { include: { book: { include: { author: true } } } },
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
      include: {
        boughtBooks: { include: { book: { include: { author: true } } } },
        cart: { include: { book: { include: { author: true } } } },
      },
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
