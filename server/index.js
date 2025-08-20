import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai'
import { QdrantVectorStore } from '@langchain/qdrant'
import OpenAI from 'openai';
import 'dotenv/config'
import IORedis from 'ioredis'
import pkg from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;

const { v2: cloudinary } = pkg;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


const redis = new IORedis(REDIS_URL, { family: 0 }); 

// Add Redis connection error handling
redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('ready', () => {
    console.log('Redis is ready');
});

const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const queue = new Queue('file-upload-queue', {
    connection: {
        host: new URL(REDIS_URL).hostname,
        port: new URL(REDIS_URL).port,
        username: new URL(REDIS_URL).username,
        password: new URL(REDIS_URL).password,
        family: 0, // <--- This is the fix!
    }
});

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'uploads/');
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//         cb(null, `${uniqueSuffix}-${file.originalname}`);
//     },
// });

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'askmypdf_uploads',
        resource_type: 'raw'
    }
})

// const upload = multer({ storage: storage });
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

const app = express();
app.use(cors());

app.use(express.json())

app.get('/', (req, res) => {
    return res.json({ status: 'All Good!' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        console.log('Received PDF upload:', req.file);
        await queue.add(
            'file-ready',
            {
                url: req.file.path,
                filename: req.file.originalname,
                // destination: req.file.destination,
                // path: req.file.path,
                userId: req.body.userId
            }
        );
        return res.json({ message: 'uploaded' });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ message: 'Upload not successful', error: error.message });
    }
});


app.post('/chat', async (req, res) => {
    try {
        const userQuery = req.body.message;
        const userId = req.body.userId;

        const embeddings = new OpenAIEmbeddings({
            model: 'text-embedding-3-small',
            apiKey: OPENAI_API_KEY,
        });

        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                apiKey: QDRANT_API_KEY,
                url: QDRANT_URL,
                collectionName: `askmypdf-${userId}`
            }
        );
        const retriever = vectorStore.asRetriever({
            k: 2,
        });
        const result = await retriever.invoke(userQuery);

        if (!result || result.length === 0) {
            return res.json({
                message: "Sorry, I could not find the answer in your document.",
                docs: [],
            });
        }

        const SYSTEM_PROMPT = `
         You are a helpful AI Assistant. Only answer the user's query using the provided context from the PDF file below.
         If the answer is not present in the context, reply: "Sorry, I could not find the answer in your document."
         Context:
         ${JSON.stringify(result)}
        `;

        const chatResult = await client.chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userQuery },
            ],
        });

        return res.json({
            message: chatResult.choices[0].message.content,
            docs: result,
        });
    } catch (error) {
        console.error('Chat error:', error);
        return res.status(500).json({ message: 'Error processing chat request', error: error.message });
    }
})

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`)
});

// /*
// User uploads PDF
//       │
//       ▼
// Express saves file → Adds 'file-ready' job to queue
//       │
//       ▼
//    Worker picks up 'file-ready' job
//       │
//       ▼
//  Worker processes file (e.g., extract text)
// */