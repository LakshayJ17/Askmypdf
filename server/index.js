import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { Queue } from 'bullmq'
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import OpenAI from 'openai'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Queue name
const queue = new Queue('file-upload-queue', {
    connection: {
        host: 'localhost',
        port: '6379'
    }
})


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
    await queue.add('file-ready', JSON.stringify({

        // Multer gives the properties - .originalname, .destination, .path
        filename: req.file.originalname,
        source: req.file.destination,
        path: req.file.path
    }))
    return res.json({ message: "PDF Uploaded" })
})

app.get('/chat', async (req, res) => {
    const userQuery = req.query.message

    const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: OPENAI_API_KEY,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
            url: 'http://localhost:6333',
            collectionName: 'langchainjs-testing',
        }
    );
    const retriever = vectorStore.asRetriever({
        k: 2,
    })
    const result = await retriever.invoke(userQuery)

    const SYSTEM_PROMPT = `
    You are helfull AI Assistant who answeres the user query based on the available context from PDF File.
    Context:
    ${JSON.stringify(result)}
    `;

    const chatResult = await client.chat.completions.create({
        model: 'gpt-4.1',
        messages : [
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user", "content": userQuery }
        ]
    })

    return res.json({
        message: chatResult.choices[0].message.content,
        docs: result,
    });

})



app.listen(8000, () => {
    console.log(`Server started at port ${8000}`)
})


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