import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue, Worker } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai'
import { QdrantVectorStore } from '@langchain/qdrant'
import OpenAI from 'openai';
import 'dotenv/config'
import IORedis from 'ioredis'
import pkg from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { compile } from "html-to-text";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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


const redis = new IORedis(REDIS_URL, { family: 0, maxRetriesPerRequest: null });

redis.on('error', (err) => console.error('Redis connection error:', err));
redis.on('connect', () => console.log('Connected to Redis'));
redis.on('ready', () => console.log('Redis is ready'));

const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const queue = new Queue('file-upload-queue', {
    connection: redis
});


const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'askmypdf_uploads',
        resource_type: 'raw'
    }
})

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
                userId: req.body.userId,
                // destination: req.file.destination,
                // path: req.file.path,
            }
        );
        return res.json({ message: 'uploaded' });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ message: 'Upload not successful', error: error.message });
    }
});

app.post('/upload/url', async (req, res) => {
    try {
        const { inputUrl, userId } = req.body;
        if (!inputUrl || !userId) {
            return res.status(400).json({ message: "Url and userId required" });
        }

        const compiledConvert = compile({ wordwrap: 130 });

        // Load and extract documents from the URL
        const loader = new RecursiveUrlLoader(inputUrl, {
            extractor: compiledConvert,
            maxDepth: 1,
            excludeDirs: ["/docs/api/"],
        });
        const docs = await loader.load();
        if (!docs || docs.length === 0) {
            return res.status(400).json({ message: "No content extracted from URL" });
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 200
        })

        const splitDocs = await splitter.splitDocuments(docs);
        
        const embeddings = new OpenAIEmbeddings({
            model: 'text-embedding-3-small',
            apiKey: OPENAI_API_KEY,
        });

        const collectionName = `askmypdf-${userId}`;
        console.log(`Using collection: ${collectionName}`);

        try {
            // Try to connect to existing collection
            const vectorStore = await QdrantVectorStore.fromExistingCollection(
                embeddings,
                {
                    apiKey: QDRANT_API_KEY,
                    url: QDRANT_URL,
                    collectionName: collectionName
                }
            );
            await vectorStore.addDocuments(splitDocs);
        } catch (error) {
            console.log('Collection does not exist, creating new one...');
            // If collection doesn't exist, create it
            await QdrantVectorStore.fromDocuments(
                splitDocs,
                embeddings,
                {
                    apiKey: QDRANT_API_KEY,
                    url: QDRANT_URL,
                    collectionName: collectionName
                }
            );
        }

        return res.json({ message: "URL uploaded and processed successfully" });
    } catch (error) {
        console.error('Upload URL error:', error);
        return res.status(500).json({ message: "Error in parsing URL", error: error.message });
    }
})

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

        // Retieving relevant chunks from vector db
        const retriever = vectorStore.asRetriever({ k: 2 });
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


const worker = new Worker(
    'file-upload-queue',
    async (job) => {
        console.log('Worker received job:', job.data);
        try {
            console.log(`Job:`, job.data);
            const data = job.data;

            // Download PDF from Cloudinary URL to a temp file
            if (!data.url) {
                throw new Error('No file URL provided in job data');
            }

            const tempPath = path.join(os.tmpdir(), `${Date.now()}-temp.pdf`);
            const response = await fetch(data.url);
            if (!response.ok) {
                throw new Error(`Failed to download PDF from URL: ${data.url}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));

            console.log(`Downloaded PDF to: ${tempPath}`);

            // Load the PDF
            const loader = new PDFLoader(tempPath);
            const docs = await loader.load();

            if (!docs || docs.length === 0) {
                throw new Error('No content extracted from PDF');
            }

            console.log(`Extracted ${docs.length} documents from PDF`);

            const embeddings = new OpenAIEmbeddings({
                model: 'text-embedding-3-small',
                apiKey: OPENAI_API_KEY,
            });

            const collectionName = `askmypdf-${data.userId}`;
            console.log(`Using collection: ${collectionName}`);

            try {
                // Try to connect to existing collection
                const vectorStore = await QdrantVectorStore.fromExistingCollection(
                    embeddings,
                    {
                        apiKey: QDRANT_API_KEY,
                        url: QDRANT_URL,
                        collectionName: collectionName
                    }
                );
                await vectorStore.addDocuments(docs);
            } catch (error) {
                console.log('Collection does not exist, creating new one...');
                // If collection doesn't exist, create it
                await QdrantVectorStore.fromDocuments(
                    docs,
                    embeddings,
                    {
                        apiKey: QDRANT_API_KEY,
                        url: QDRANT_URL,
                        collectionName: collectionName
                    }
                );
            }

            console.log(`Successfully added ${docs.length} documents to vector store`);


            // Clean up the temp file after processing
            fs.unlink(tempPath, (err) => {
                if (err) console.warn(`Failed to clean temp file: ${err.message}`);
                else console.log(`Cleaned up temp file: ${tempPath}`);
            });

        } catch (error) {
            console.error('Worker error:', error);
            throw error;
        }
    },
    {
        concurrency: 5,
        connection: redis,
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
    }
);


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