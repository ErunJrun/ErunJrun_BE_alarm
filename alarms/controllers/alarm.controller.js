const alarmService = require('../services/alarm.service')
const schedule = require('node-schedule')
const moment = require('moment')
module.exports = {
    // 매일 8시마다 createDdayAlarm
    createDdayAlarm: (req, res, next) => {
        try {
            schedule.scheduleJob('0 26 22 * * *', alarmService.createDdayAlarm)
        } catch (error) {
            return next({
                message: '문자전송 실패',
                stack: error,
            })
        }
    },
    // 매 1분마다 createEndAlarm(실제시간 기준 30분, 00분)
    createStartAlarm: (req, res, next) => {
        try {
            schedule.scheduleJob(' */1 * * * *', alarmService.createStartAlarm)
        } catch (error) {
            return next({
                message: '문자전송 실패',
                stack: error,
            })
        }
    },
    // 매 1분 마다 createEndAlarm 실행
    createEndAlarm: (req, res, next) => {
        try {
            schedule.scheduleJob(' */1 * * * *', alarmService.createEndAlarm)
        } catch (error) {
            return next({
                message: '문자전송 실패',
                stack: error,
            })
        }
    },
}
