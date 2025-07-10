import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { Queue } from 'bullmq'
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import OpenAI from 'openai'
import IORedis from 'ioredis'
import fs from 'fs'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;

// Redis connection configuration
const redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Queue name
const queue = new Queue('file-upload-queue', {
    connection: redis
})

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// This will give each uploaded file a unique filename 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, `${uniqueSuffix}-${file.originalname}`)
    }
})
// and store in uploads folder
const upload = multer({ storage: storage })

const app = express()
app.use(cors())


// upload.single('pdf') means we expect from frontend the pdf file with field name 'pdf' - ('pdf', file)
app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
    console.log('Received PDF upload:', req.file);

    await queue.add('file-ready', JSON.stringify({
        // Multer gives the properties - .originalname, .destination, .path
        filename: req.file.originalname,
        source: req.file.destination,
        path: req.file.path,
        userId: req.body.userId
    }),
        {
            attempts: 3, // Retry 3 times max
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: 5
        });

    return res.json({ message: "PDF Uploaded" })
})

app.get('/chat', async (req, res) => {
    const userQuery = req.query.message;
    const userId = req.query.userId;
    const collectionName = `langchainjs-testing-${userId}`

    const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: OPENAI_API_KEY,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
            apiKey: QDRANT_API_KEY,
            url: QDRANT_URL,
            collectionName: collectionName

        }
    );
    const retriever = vectorStore.asRetriever({
        k: 2,
    })
    const result = await retriever.invoke(userQuery)

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
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user", "content": userQuery }
        ]
    })

    return res.json({
        message: chatResult.choices[0].message.content,
        docs: result,
    });

})

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`)
});


/*
User uploads PDF
      │
      ▼
Express saves file → Adds 'file-ready' job to queue
      │
      ▼
   Worker picks up 'file-ready' job
      │
      ▼
 Worker processes file (e.g., extract text)
*/