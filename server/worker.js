import { Worker } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import 'dotenv/config';
import IORedis from 'ioredis';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const QDRANT_API_KEY =  process.env.QDRANT_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;

// Redis connection configuration
const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    console.log('Worker received job:', job.data);
    const data = JSON.parse(job.data);
    /*
    Path: data.path
    read the pdf from path,
    chunk the pdf,
    call the openai embedding model for every chunk,
    store the chunk in qdrant db
    */

    try {
      console.log('Loading PDF from:', data.path);
      const loader = new PDFLoader(data.path);
      const docs = await loader.load();
      console.log('Loaded docs:', docs.length);

      const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: OPENAI_API_KEY
      });

      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          apiKey: QDRANT_API_KEY,
          url: QDRANT_URL,
          collectionName: `langchainjs-testing-${data.userId}`,
        }
      );

      try {
        await vectorStore.addDocuments(docs);
        console.log('Successfully added docs to Qdrant');
      } catch (err) {
        console.error('Error adding documents to Qdrant:', err);
      }
    } catch (err) {
      console.error('Worker job failed:', err);
    }
  },
  {
    concurrency: 100,
    connection: redis,
  }
);