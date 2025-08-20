import { Worker } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import fs from 'fs';
import path from 'path';
import os from 'os';
import 'dotenv/config'
import IORedis from 'ioredis'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;

const redis = new IORedis(REDIS_URL, { family: 0 }); // family: 0 enables both IPv4 and IPv6

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

const redisURL = new URL(REDIS_URL);

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
        const vectorStore = await QdrantVectorStore.fromDocuments(
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
      try {
        // fs.unlinkSync(tempPath);
        fs.unlink(tempPath, (err) => {
          if (err) console.warn(`Failed to clean temp file: ${err.message}`);
        });

        console.log(`Cleaned up temp file: ${tempPath}`);
      } catch (cleanupError) {
        console.warn(`Failed to clean up temp file: ${cleanupError.message}`);
      }

    } catch (error) {
      console.error('Worker error:', error);
      throw error; 
    }
  },
  {
    concurrency: 5, 
    connection: {
      host: redisURL.hostname,
      port: redisURL.port,
      username: redisURL.username,
      password: redisURL.password,
      family: 0,
    },
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 50 },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Worker started and listening for jobs...');

