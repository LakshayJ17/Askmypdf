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
const REDIS_URL = process.env.REDIS_PUBLIC_URL;

const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

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
        fs.unlinkSync(tempPath);
        console.log(`Cleaned up temp file: ${tempPath}`);
      } catch (cleanupError) {
        console.warn(`Failed to clean up temp file: ${cleanupError.message}`);
      }

    } catch (error) {
      console.error('Worker error:', error);
      throw error; // Re-throw to mark job as failed
    }
  },
  {
    concurrency: 5, // Reduced from 100 to avoid overwhelming the system
    connection: redis,
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


// import { Worker } from 'bullmq';
// import { OpenAIEmbeddings } from '@langchain/openai';
// import { QdrantVectorStore } from '@langchain/qdrant';
// import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
// import 'dotenv/config';
// import IORedis from 'ioredis';

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
// const QDRANT_URL = process.env.QDRANT_URL;
// const REDIS_URL = process.env.REDIS_URL;


// // Redis connection configuration
// const redis = new IORedis(REDIS_URL, {
//   maxRetriesPerRequest: null
// });

// const worker = new Worker(
//   'file-upload-queue',
//   async (job) => {
//     console.log('Worker received job:', job.data);
//     const data = JSON.parse(job.data);
//     /*
//     Path: data.path
//     read the pdf from path,
//     chunk the pdf,
//     call the openai embedding model for every chunk,
//     store the chunk in qdrant db
//     */

//     // Load the PDF
//     const loader = new PDFLoader(data.path);
//     const docs = await loader.load();

//     const embeddings = new OpenAIEmbeddings({
//       model: 'text-embedding-3-small',
//       apiKey: OPENAI_API_KEY
//     });

//     const vectorStore = await QdrantVectorStore.fromExistingCollection(
//       embeddings,
//       {
//         apiKey: QDRANT_API_KEY,
//         url: QDRANT_URL,
//         collectionName: `langchainjs-testing-${data.userId}`,
//       }
//     );
//     await vectorStore.addDocuments(docs);
//     console.log(`All docs are added to vector store`);
//   },
//   {
//     concurrency: 100,
//     connection: redis,
//   }
// );

// import { Worker } from 'bullmq';
// import { OpenAIEmbeddings } from '@langchain/openai';
// import { QdrantVectorStore } from '@langchain/qdrant';
// import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
// import 'dotenv/config'
// import IORedis from 'ioredis'


// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
// const QDRANT_URL = process.env.QDRANT_URL;
// const REDIS_URL = process.env.REDIS_URL;

// const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })


// const worker = new Worker(
//   'file-upload-queue',
//   async (job) => {
//     console.log(`Job:`, job.data);
//     const data = job.data;
//     /*
//     Path: data.path
//     read the pdf from path,
//     chunk the pdf,
//     call the openai embedding model for every chunk,
//     store the chunk in qdrant db
//     */

//     // Load the PDF
//     const loader = new PDFLoader(data.path);
//     const docs = await loader.load();

//     const embeddings = new OpenAIEmbeddings({
//       model: 'text-embedding-3-small',
//       apiKey: OPENAI_API_KEY,
//     });

//     const vectorStore = await QdrantVectorStore.fromExistingCollection(
//       embeddings,
//       {
//         apiKey: QDRANT_API_KEY,
//         url: QDRANT_URL,
//         collectionName: `askmypdf-${data.userId}`
//       }
//     );
//     await vectorStore.addDocuments(docs);
//     console.log(`All docs are added to vector store`);
//   },
//   {
//     concurrency: 100,
//     connection: redis
//   }
// );
