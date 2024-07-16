import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'

const app = express()
const PORT = 3000
const server = http.createServer(app)
const io = new Server(server, {cors: {
  origin: '*'
}, maxHttpBufferSize: 1e8})

app.use(cors())
app.get('/', (req, res) => {
  res.send('hw')
})

io.on('connection', (socket) => {
  socket.on('input', (data) => io.emit('input', data))
  socket.on('backup', (data) => io.emit('backup', data))
  socket.on('advance', (data) => io.emit('advance', data))
})

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})