const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const connectDB = require('./config/mongodb')
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({credentials: true}));

app.get('/', (req, res)=> res.send('Server is ready'));
app.listen(port, ()=> console.log(`Server is running on port ${port}`))