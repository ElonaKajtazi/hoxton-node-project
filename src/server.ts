import express from "express"
import cors from "cors"
import { PrismaClient } from "@prisma/client"

const app =  express()
app.use(cors())
app.use(express.json())

const prisma = new PrismaClient()

const port = 3333

app.get("/", (req, res) => {
res.send("Starting project")
})

app.listen(port, () => {
    console.log(`App running: http://localhost:${port}`)
})