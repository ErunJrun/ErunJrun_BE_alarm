const express = require('express')
const app = express()
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
const session = require('express-session')
var cookieParser = require('cookie-parser')
const moment = require('moment')
const { Logger, stream } = require('./middlewares/loggers/logger')
const path = require('path')
require('moment-timezone')
moment.tz.setDefault('Asia/Seoul')

require('dotenv').config()
require('express-async-errors')

const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://erunjrun.com',
        'https://www.erunjrun.com',
    ], // 허락하고자 하는 요청 주소
    credentials: true, // true로 하면 설정한 내용을 response 헤더에 추가 해줍니다.
}

app.use(cors(corsOptions))
app.use(helmet())
app.use(morgan('combined', { stream }))
app.use(express.json({ limit: '5mb' }))
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false, limit: '5mb' }))
app.disable('x-powered-by')

app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(
    session({
        resave: false,
        saveUninitialized: false,
        secret: process.env.COOKIE_SECRET,
        cookie: {
            httpOnly: true,
            secure: false,
        },
    })
)

app.use((req, res, next) => {
    res.status(404).send('요청하신 페이지를 찾을 수 없습니다')
})

app.use((err, req, res, next) => {
    console.log(err)
    Logger.error(`${err.stack ? err.stack : ''} `)
    return res.status(400).json({ success: false, message: err.message })
})

module.exports = app
