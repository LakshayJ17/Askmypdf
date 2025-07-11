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

import { Worker } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import 'dotenv/config'
import IORedis from 'ioredis'


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const REDIS_URL = process.env.REDIS_URL;

const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })


const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    console.log(`Job:`, job.data);
    const data = job.data;
    /*
    Path: data.path
    read the pdf from path,
    chunk the pdf,
    call the openai embedding model for every chunk,
    store the chunk in qdrant db
    */

    // Load the PDF
    const loader = new PDFLoader(data.path);
    const docs = await loader.load();

    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      apiKey: OPENAI_API_KEY,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        apiKey: QDRANT_API_KEY,
        url: QDRANT_URL,
        collectionName: `askmypdf-${data.userId}`
      }
    );
    await vectorStore.addDocuments(docs);
    console.log(`All docs are added to vector store`);
  },
  {
    concurrency: 100,
    connection: redis
  }
);