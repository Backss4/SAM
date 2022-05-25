import { PrismaClient } from '@prisma/client'
import express from 'express'
import expressjwt from 'express-jwt';
import createError from 'http-errors';
import { config } from 'dotenv'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'
import cors from 'cors'
config({path: './'})
// var path = require('path');
// var logger = require('morgan');
const prisma = new PrismaClient()
const app = express()

const port = 3001

const basicUserStatus = Boolean(Number(process.env.BASIC_USER_STATUS))
const secret = process.env.SECRET

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

function generateAccessToken(id, username, role) {
  return jwt.sign({id, username, role}, secret, { expiresIn: '7d' })
}


app.post('/login', async (req, res) => {
  const {username, password} = req.body
  if(!username || !password) {
    res.status(400).json()
  } else {
    const user = await prisma.user.findFirst({where: {username: username}})
    const validPassword = await bcrypt.compare(password, user.password)
    console.log(validPassword)
    console.log(user)
    if(!user || !validPassword || !user.active) {
      res.status(401).json()
    } else {
      res.json({jwt: generateAccessToken(user.id, user.username, user.role)})
    }
  }
})

app.post('/register', async (req, res) => {
  const {username, password} = req.body
  const user = await prisma.user.findFirst({where: {username: username}})
  if(!username || !password || user) {
    res.status(400).json()
  } else {
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)
    console.log(passwordHash)
    const user = await prisma.user.create({
      data: {
        username: username,
        password: passwordHash,
        active: basicUserStatus
      }
    })
    res.status(201).json()
  }
})

app.use((req, res) => res.status(404).json({ message: 'No route found' }));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})