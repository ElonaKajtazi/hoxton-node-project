import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

const port = 3456;

app.get("/", (req, res) => {
  res.send("Starting project");
});

app.get("/books", async (req, res) => {
  try {
    const books = await prisma.book.findMany({ include: { owner: true } });
    res.send(books);
  } catch (error) {
    //@ts-ignore
    res.status(400).send({ errors: [error.message] });
  }
});

app.listen(port, () => {
  console.log(`App running: http://localhost:${port}`);
});
