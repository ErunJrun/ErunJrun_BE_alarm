const {
    Users,
    Groups,
    Appliers,
    Alarms,
    Comments,
} = require('../../models/index')
const sequelize = require('sequelize')
const Op = sequelize.Op
const moment = require('moment')
const CryptoJS = require('crypto-js')
const axios = require('axios')
const TinyURL = require('tinyurl')
const crypto = require('crypto')
const { Logger, stream } = require('../../middlewares/loggers/logger')

module.exports = {
    // 유저에게 생성되어있는 알람을 최신순으로 조회
    createDdayAlarm: async (req, res) => {
        console.log('dday알람 시작합니다')
        const starttime = new Date(moment()).getTime()
        const nowDate = moment().format('YYYY-MM-DD')
        const data = await Groups.findAll({
            where: { date: nowDate },
            attributes: ['userId', 'title', 'groupId'],
            include: [
                {
                    model: Appliers,
                    as: 'Appliers',
                    attributes: ['groupId', 'userId'],
                },
            ],
        })
            .then(async (value) => {
                for (let i = 0; i < value.length; i++) {
                    for (
                        let z = 0;
                        z < value[i].dataValues.Appliers.length;
                        z++
                    ) {
                        // 닉네임 추출
                        const user = await Users.findOne({
                            where: {
                                userId: value[i].dataValues.Appliers[z].userId,
                            },
                        })
                            .then((value) => {
                                return value.dataValues
                            })
                            .catch((error) => {
                                console.log(error)
                            })

                        let role = ''
                        if (
                            value[i].dataValues.userId ===
                            value[i].dataValues.Appliers[z].userId
                        ) {
                            role = 'host'
                        } else {
                            role = 'attendance'
                        }
                        const category = 'Dday'
                        // 호스트, 게스트 알람 생성
                        console.log(value[i].dataValues.Appliers[z].userId)
                        await Alarms.create({
                            category,
                            userId: value[i].dataValues.Appliers[z].userId,
                            groupId: value[i].dataValues.groupId,
                            groupTitle: value[i].dataValues.title,
                            nickname: user.nickname,
                            role,
                        })
                            .then((value) => {
                                // deleteOutdateAlarm(value.dataValues.userId)

                                if (
                                    user.phone !== null &&
                                    user.agreeSMS === true
                                ) {
                                    sendGroupSMS(
                                        value.dataValues.alarmId,
                                        user.phone,
                                        category,
                                        role,
                                        value.dataValues.groupTitle,
                                        value.dataValues.groupId,
                                        user.nickname,
                                        starttime
                                    ).catch((error) => {
                                        throw new Error(error)
                                    })
                                    return
                                } else {
                                    const result = `수신동의거부: ${user.nickname} / ${value.dataValues.groupTitle} / ${role} / ${category}`
                                    Logger.error(`${result}`)
                                    return
                                }
                            })
                            .catch((error) => {
                                throw new Error(error)
                            })
                    }
                }
            })
            .catch((error) => {
                throw new Error(error)
            })
        return data
    },
    // 1분마다 현재시간 기준 30분 안에 시작할 그룹러닝에 대하여 시작 알람 생성
    createStartAlarm: async (req, res) => {
        console.log(moment())
        const starttime = new Date(moment()).getTime()
        const after30MinuteTime = moment().add('30', 'm').format('HH:mm:ss')
        const after30MinuteDate = moment().add('30', 'm').format('YYYY-MM-DD')
        await Groups.findAll({
            where: {
                [Op.and]: [
                    { date: after30MinuteDate },
                    { standbyTime: after30MinuteTime },
                ],
            },
            attributes: ['userId', 'title', 'groupId'],
            include: [
                {
                    model: Appliers,
                    as: 'Appliers',
                    attributes: ['groupId', 'userId'],
                },
            ],
        })
            .then(async (value) => {
                try {
                    for (let i = 0; i < value.length; i++) {
                        for (
                            let z = 0;
                            z < value[i].dataValues.Appliers.length;
                            z++
                        ) {
                            // 닉네임 추출
                            const user = await Users.findOne({
                                where: {
                                    userId: value[i].dataValues.Appliers[z]
                                        .userId,
                                },
                            })
                                .then((value) => {
                                    return value.dataValues
                                })
                                .catch((error) => {
                                    throw new Error(error)
                                })
                            console.log(value[i].dataValues.Appliers[z].userId)
                            let role = ''
                            if (
                                value[i].dataValues.userId ===
                                value[i].dataValues.Appliers[z].userId
                            ) {
                                role = 'host'
                            } else {
                                role = 'attendance'
                            }
                            const category = 'start'
                            // 호스트, 게스트 알람 생성
                            await Alarms.create({
                                category,
                                userId: value[i].dataValues.Appliers[z].userId,
                                groupId: value[i].dataValues.groupId,
                                groupTitle: value[i].dataValues.title,
                                nickname: user.nickname,
                                role,
                            })
                                .then((value) => {
                                    // deleteOutdateAlarm(value.dataValues.userId)
                                    console.log('1', value.dataValues.groupId)
                                    if (
                                        user.phone !== null &&
                                        user.agreeSMS === true
                                    ) {
                                        sendGroupSMS(
                                            value.dataValues.alarmId,
                                            user.phone,
                                            category,
                                            role,
                                            value.dataValues.groupTitle,
                                            value.dataValues.groupId,
                                            user.nickname,
                                            starttime
                                        )
                                        return
                                    } else {
                                        const result = `수신동의거부: ${user.nickname} / ${value.dataValues.groupTitle} / ${role} / ${category}`
                                        Logger.error(`${result}`)
                                        return
                                    }
                                })
                                .catch((error) => {
                                    throw new Error(error)
                                })
                        }
                    }
                } catch (error) {
                    throw new Error(error)
                }
            })
            .catch((error) => {
                throw new Error(error)
            })
        const endtime = new Date(moment()).getTime()
        console.log('startAlarm', (endtime - starttime) / 1000)

        console.log('보낼 시작 알람이 없습니다')
        return
    },
    // 5분마다 현재시간 기준 30분 전에 끝난 그룹러닝에 대하여 종료 알람 생성
    createEndAlarm: async (req, res) => {
        const starttime = new Date(moment()).getTime()
        const before1HourTime = moment().add('-1', 'h').format('HH:mm:ss')
        const before1HoureDate = moment().add('-1', 'h').format('YYYY-MM-DD')
        await Groups.findAll({
            where: {
                [Op.and]: [
                    { date: before1HoureDate },
                    { standbyTime: before1HourTime },
                ],
            },
            attributes: ['userId', 'title', 'groupId'],
            include: [
                {
                    model: Appliers,
                    as: 'Appliers',
                    attributes: ['groupId', 'userId'],
                },
            ],
        })
            .catch((error) => {
                throw new Error(error)
            })
            .then(async (value) => {
                try {
                    for (let i = 0; i < value.length; i++) {
                        for (
                            let z = 0;
                            z < value[i].dataValues.Appliers.length;
                            z++
                        ) {
                            console.log(value[i].dataValues.Appliers)
                            // 닉네임 추출
                            const user = await Users.findOne({
                                where: {
                                    userId: value[i].dataValues.Appliers[z]
                                        .userId,
                                },
                            })
                                .then((value) => {
                                    return value.dataValues
                                })
                                .catch((error) => {
                                    throw new Error(error)
                                })
                            let role = ''
                            if (
                                value[i].dataValues.userId ===
                                value[i].dataValues.Appliers[z].userId
                            ) {
                                role = 'host'
                            } else {
                                role = 'attendance'
                            }
                            const category = 'end'
                            // 호스트, 게스트 알람 생성
                            await Alarms.create({
                                category,
                                userId: value[i].dataValues.Appliers[z].userId,
                                groupId: value[i].dataValues.groupId,
                                groupTitle: value[i].dataValues.title,
                                nickname: user.nickname,
                                role,
                            })
                                .then((value) => {
                                    // deleteOutdateAlarm(value.dataValues.userId)
                                    console.log(value)
                                    if (
                                        user.phone !== null &&
                                        user.agreeSMS === true
                                    ) {
                                        sendGroupSMS(
                                            value.dataValues.alarmId,
                                            user.phone,
                                            category,
                                            role,
                                            value.dataValues.groupTitle,
                                            value.dataValues.groupId,
                                            user.nickname,
                                            starttime
                                        ).catch((error) => {
                                            console.log(error)
                                            return error
                                        })
                                        return
                                    } else {
                                        const result = `수신동의거부: ${user.nickname} / ${value.dataValues.groupTitle} / ${role} / ${category}`
                                        Logger.error(`${result}`)
                                        return
                                    }
                                })
                                .catch((error) => {
                                    throw new Error(error)
                                })
                        }
                    }
                } catch (error) {
                    throw new Error(error)
                }
            })
            .catch((error) => {
                throw new Error(error)
            })
        const endtime = new Date(moment()).getTime()
        console.log('endAlarm', (endtime - starttime) / 1000)
        console.log('보낼 종료 알람이 없습니다')
        return
    },
}

async function sendGroupSMS(
    alarmId,
    phone,
    category,
    role,
    groupTitle,
    groupId,
    nickname,
    starttime
) {
    try {
        const key = process.env.CRYPTO_KEY
        const decode = crypto.createDecipher('des', key)
        const decodeResult =
            decode.update(phone, 'base64', 'utf8') + decode.final('utf8')
        const user_phone_number = decodeResult.split('-').join('') // SMS를 수신할 전화번호
        const date = Date.now().toString() // 날짜 string

        console.log(decodeResult)
        // 환경 변수
        const sens_service_id = process.env.NCP_SENS_ID
        const sens_access_key = process.env.NCP_SENS_ACCESS
        const sens_secret_key = process.env.NCP_SENS_SECRET
        const sens_call_number = process.env.MyPhoneNumber

        // url 관련 변수 선언
        const method = 'POST'
        const space = ' '
        const newLine = '\n'
        const url = `https://sens.apigw.ntruss.com/sms/v2/services/${sens_service_id}/messages`
        const url2 = `/sms/v2/services/${sens_service_id}/messages`

        // signature 작성 : crypto-js 모듈을 이용하여 암호화
        const hmac = CryptoJS.algo.HMAC.create(
            CryptoJS.algo.SHA256,
            sens_secret_key
        )
        hmac.update(method)
        hmac.update(space)
        hmac.update(url2)
        hmac.update(newLine)
        hmac.update(date)
        hmac.update(newLine)
        console.log(sens_access_key)
        hmac.update(sens_access_key)
        const hash = hmac.finalize()
        const signature = hash.toString(CryptoJS.enc.Base64)

        console.log(
            alarmId,
            phone,
            category,
            role,
            groupTitle,
            groupId,
            nickname,
            starttime
        )
        let content

        switch (category) {
            case 'Dday':
                content = `${nickname}님 오늘은[${groupTitle}]러닝이 있습니다`
                break
            case 'start':
                switch (role) {
                    case 'host':
                        content = `${nickname}님 30분 뒤 [${groupTitle}]러닝이 시작합니다. 출석체크를 해주세요. \n 링크: https://www.erunjrun.com/check/${groupId}`
                        break
                    case 'attendance':
                        content = `${nickname}님 30분 뒤 [${groupTitle}]러닝이 시작합니다.`
                        break
                }
                break
            case 'end':
                switch (role) {
                    case 'host':
                        content = `${nickname}님 [${groupTitle}] 러닝은 어떠셨나요? 당신은 멋진 크루장입니다!`
                        break
                    case 'attendance':
                        content = `${nickname}님 [${groupTitle}]러닝은 어떠셨나요? 크루장평가를 해주세요. \n 링크: https://www.erunjrun.com/evaluation/${groupId}`
                        break
                }
                break
            default:
                throw new Error('문자 전송 대상값이 올바르지 않습니다')
        }
        console.log(content)
        let type
        if (getByteB(content) >= 80) {
            type = 'LMS'
        } else {
            type = 'SMS'
        }
        // sens 서버로 요청 전송
        await axios({
            method: method,
            url: url,
            headers: {
                'Contenc-type': 'application/json; charset=utf-8',
                'x-ncp-iam-access-key': sens_access_key,
                'x-ncp-apigw-timestamp': date,
                'x-ncp-apigw-signature-v2': signature,
            },
            data: {
                type,
                countryCode: '82',
                from: sens_call_number,
                content,
                messages: [{ to: `${user_phone_number}` }],
            },

            // `${user_phone_number}`
        }).then(async (value) =>{
            let sendPhone
        if (type === 'LMS') {
            sendPhone = 2
        } else {
            sendPhone = 1
        }
        await Alarms.update({ sendPhone }, { where: { alarmId } })
        const endtime = new Date(moment()).getTime()
        const result = `문자전송완료: ${nickname} / ${groupTitle} / ${role} / ${category} / ${sendPhone} / 전송소요시간: ${
            (endtime - starttime) / 1000
        }`
        console.log(result)
        Logger.info(`${result}`)
        return
        })
        
        
    } catch (error) {
        const result = `문자전송실패: ${nickname} / ${groupTitle} / ${role} / ${category} / ${error}`
        throw new Error(result)
    }
}

// 글자의 바이트 계산함수
function getByteB(str) {
    var byte = 0
    for (var i = 0; i < str.length; ++i) {
        // 기본 한글 2바이트 처리
        str.charCodeAt(i) > 127 ? (byte += 2) : byte++
    }
    return byte
}
