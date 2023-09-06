const express = require('express')
const { promisify } = require('util')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken')

app.use(express.json())
app.use(cors())


const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.1m4kiwj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const divitionCollection = client.db('school').collection('divition')
const thanaCollection = client.db('school').collection('thanas')
const usersCollection = client.db('school').collection('users')

const createToken = (userId, userRoll) => {
    const payload = {
        userId,
        userRoll
    }
    const token = jwt.sign(payload, 'amar sonarbangla ami ', { expiresIn: '2d' });
    return token;
}

const verifyToken = async (req, res, next) => {
    const token = req.headers?.authorization?.split(' ')[1]
    if (!token) {
        res.send({message:'please login first'})
    }
    const decoded = await promisify(jwt.verify)(token, 'amar sonarbangla ami ');
    req.user = decoded
    next();


}



async function run() {
    try {
        app.post('/me', verifyToken, async (req, res) => {
            const user = req.user
            const userId = user?.userId
            const userRoll = user?.userRoll
            const query = {
                userId: userId,
                userRoll: userRoll
            }
            const result = await usersCollection.findOne(query)
            res.send(result);
        })
        app.get('/', (req, res) => {
            res.send('server is running')
        })
        app.post('/user', async (req, res) => {
            const userId = req.body.userId
            const password = req.body.password
            if (userId === '' || password === '') {
                return res.send({ message: 'user email or passwod will not be empty' })
            }
            const query = {
                userId: userId,
                password: password
            }
            const match = await usersCollection.findOne(query)
            if (!match) {
                return res.send({ message: 'please enter wrong id or password' })
            }

            const token = createToken(match.userId, match.userRoll)
            const user = {
                userInfo: match,
                token: token
            }
            res.send(user)
        })
        app.get('/divition', async (req, res) => {
            const result = await divitionCollection.find({}).toArray()
            console.log(result)
            res.send(result);
        })
        app.get('/divitions/:division', async (req, res) => {
            const divition = req.params.division
            const query = {
                divition_name: divition
            }
            console.log(divition);
            if (divition === null) {
                const result = await divitionCollection.find({}).toArray()
                return res.send(result);
            }
            const result = await divitionCollection.find(query).toArray()
            res.send(result)
        })
        app.patch('/divition', async (req, res) => {
            const divition = req.body.selectDivision
            const distic = req.body.distic
            const query = {
                divition_name: divition
            }
            const match = await divitionCollection.findOne(query)
            if (match.distics.includes(distic)) {
                return res.send({ message: 'data aredy added', acknowledged: false })
            }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    distics: [...match.distics, distic]
                }
            }
            const result = await divitionCollection.updateOne(query, updateDoc, option)
            res.send(result)
        })
        app.put('/thana', async (req, res) => {
            const divition = req.body.divi
            const distic = req.body.dis
            const thana = req.body.thanaName
            const filter = {
                divition_name: divition,
                distic_name: distic
            }
            const option = { upsert: true }
            const match = await thanaCollection.findOne(filter)
            if (match?.thanas?.includes(thana)) {
                console.log(match.thanas, '72')
                return res.send({ message: 'thana alredy added', acknowledged: false })
            } else if (match) {
                const updatedDoc = {
                    $set: {
                        divition_name: divition,
                        distic_name: distic,
                        thanas: [...match?.thanas, thana]
                    }
                }
                const result = await thanaCollection.updateOne(filter, updatedDoc, option)
                return res.send(result)
            }
            const data = {
                divition_name: divition,
                distic_name: distic,
                thanas: [thana]
            }
            const result = await thanaCollection.insertOne(data)
            res.send(result);

        })

    } finally {

    }

} run().catch((error) => console.log(error))



app.listen(port, () => {
    console.log(`server is running on ${port}`)
})