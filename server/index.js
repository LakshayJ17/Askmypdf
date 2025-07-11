// import express from 'express';
// import cors from 'cors';
// import multer from 'multer';
// import { Queue } from 'bullmq';
// import { OpenAIEmbeddings } from '@langchain/openai';
// import { QdrantVectorStore } from '@langchain/qdrant';
// import OpenAI from 'openai';
// import fs from 'fs';
// import IORedis from 'ioredis'

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
// const QDRANT_URL = process.env.QDRANT_URL;
// const REDIS_URL = process.env.REDIS_URL


// if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// const redis = new IORedis(REDIS_URL, {
//     maxRetriesPerRequest: null
// });

// const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// // Queue name
// const queue = new Queue('file-upload-queue', {
//     connection: redis
// })

// // This will give each uploaded file a unique filename
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, 'uploads/'),
//     filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
// });
// const upload = multer({ storage });


// const app = express()
// app.use(cors())


// app.get('/', (req, res) => {
//     return res.json({ status: 'All Good!' });
// });


// // upload.single('pdf') means we expect from frontend the pdf file with field name 'pdf'
// app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
//     console.log('Received PDF upload:', req.file);

//     await queue.add(
//         'file-ready',
//         JSON.stringify({
//             filename: req.file.originalname,
//             destination: req.file.destination,
//             path: req.file.path,
//             userId: req.body.userId
//         })
//     );
//     return res.json({ message: 'uploaded' });
// });

// app.get('/chat', async (req, res) => {
//     const userQuery = req.query.message;
//     const userId = req.query.userId;

//     const collectionName = `langchainjs-testing-${userId}`

//     const embeddings = new OpenAIEmbeddings({
//         model: 'text-embedding-3-small',
//         apiKey: OPENAI_API_KEY,
//     });

//     const vectorStore = await QdrantVectorStore.fromExistingCollection(
//         embeddings,
//         {
//             apiKey: QDRANT_API_KEY,
//             url: QDRANT_URL,
//             collectionName: collectionName

//         }
//     );
//     const retriever = vectorStore.asRetriever({
//         k: 2,
//     })
//     const result = await retriever.invoke(userQuery)

//     if (!result || result.length === 0) {
//         return res.json({
//             message: "Sorry, I could not find the answer in your document.",
//             docs: [],
//         });
//     }

//     const SYSTEM_PROMPT = `
//     You are a helpful AI Assistant. Only answer the user's query using the provided context from the PDF file below.
//     If the answer is not present in the context, reply: "Sorry, I could not find the answer in your document."
//     Context:
//     ${JSON.stringify(result)}
//     `;

//     const chatResult = await client.chat.completions.create({
//         model: 'gpt-4.1',
//         messages: [
//             { "role": "system", "content": SYSTEM_PROMPT },
//             { "role": "user", "content": userQuery }
//         ]
//     })

//     return res.json({
//         message: chatResult.choices[0].message.content,
//         docs: result,
//     });

// })

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//     console.log(`Server started at port ${PORT}`)
// });

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

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import OpenAI from 'openai';
import 'dotenv/config'
import IORedis from 'ioredis'


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const REDIS_URL = process.env.REDIS_URL;

const redis = new IORedis(REDIS_URL)

const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const queue = new Queue('file-upload-queue', {
    connection: redis
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    return res.json({ status: 'All Good!' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
    console.log('Received PDF upload:', req.file);

    await queue.add(
        'file-ready',
        {
            filename: req.file.originalname,
            destination: req.file.destination,
            path: req.file.path,
            userId: req.body.userId
        }
    );
    return res.json({ message: 'uploaded' });
});

app.get('/chat', async (req, res) => {
    const userQuery = req.query.message;
    const userId = req.query.userId;

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
    const ret = vectorStore.asRetriever({
        k: 2,
    });
    const result = await ret.invoke(userQuery);

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
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`)
});