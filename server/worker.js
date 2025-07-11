import { Worker } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import 'dotenv/config';
import IORedis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;

// Redis connection configuration
const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

// Ensure uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    console.log('Worker received job:', job.data);
    
    try {
      const data = JSON.parse(job.data);
      const collectionName = `langchainjs-testing-${data.userId}`;
      
      // Always resolve the path relative to the project root
      const actualPath = path.join(process.cwd(), data.path);
      console.log('Resolved file path:', actualPath);

      if (!fs.existsSync(actualPath)) {
        console.error('File not found at:', actualPath);
        throw new Error(`File not found: ${actualPath}`);
      }
      
      // Load PDF from found path
      console.log('Loading PDF from:', actualPath);
      const loader = new PDFLoader(actualPath);
      const docs = await loader.load();
      console.log('Loaded docs:', docs.length);

      if (!docs || docs.length === 0) {
        throw new Error('No documents loaded from PDF');
      }

      // Split documents into smaller chunks for better embeddings
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await textSplitter.splitDocuments(docs);
      console.log('Split into chunks:', splitDocs.length);

      const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: OPENAI_API_KEY
      });

      let vectorStore;
      
      try {
        // Try to connect to existing collection first
        console.log('Attempting to connect to existing collection:', collectionName);
        vectorStore = await QdrantVectorStore.fromExistingCollection(
          embeddings,
          {
            apiKey: QDRANT_API_KEY,
            url: QDRANT_URL,
            collectionName: collectionName,
          }
        );
        console.log('Connected to existing collection');
        
        // Add documents to existing collection
        await vectorStore.addDocuments(splitDocs);
        console.log('Successfully added documents to existing collection');
        
      } catch (existingCollectionError) {
        console.log('Collection does not exist, creating new one:', existingCollectionError.message);
        
        // Create new collection with documents
        vectorStore = await QdrantVectorStore.fromDocuments(
          splitDocs,
          embeddings,
          {
            apiKey: QDRANT_API_KEY,
            url: QDRANT_URL,
            collectionName: collectionName,
          }
        );
        console.log('Successfully created new collection and added documents');
      }

      // Clean up the file after processing
      try {
        fs.unlinkSync(actualPath);
        console.log('File cleaned up successfully');
      } catch (cleanupError) {
        console.warn('Error cleaning up file:', cleanupError);
      }

      console.log('Job completed successfully');
      return { success: true, documentsProcessed: splitDocs.length };
      
    } catch (err) {
      console.error('Worker job failed:', err);
      console.error('Error stack:', err.stack);
      throw err;
    }
  },
  {
    concurrency: 3,
    connection: redis,
  }
);

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('Worker started and listening for jobs...');