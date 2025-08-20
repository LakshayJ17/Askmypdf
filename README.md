# AskMyPDF

AskMyPDF is a full-stack AI-powered PDF question-answering app. Upload your PDF files and chat with them - get instant answers from your documents using OpenAI and vector search.

## Features

- Upload PDF files (up to 10MB)
- Extracts and vectorizes PDF content for semantic search
- Chat interface to ask questions about your uploaded PDFs
- Uses OpenAI for natural language understanding
- Stores document embeddings in Qdrant vector database
- Cloud storage for PDFs (Cloudinary)
- Queue-based processing with BullMQ and Redis/Valkey
- Modern Next.js frontend

## Tech Stack

- **Frontend:** Next.js, Tailwind CSS
- **Backend:** Node.js, Express, BullMQ
- **AI:** OpenAI API (GPT-4, embeddings)
- **Vector DB:** Qdrant
- **File Storage:** Cloudinary
- **Queue:** BullMQ, Redis (Railway)
- **PDF Parsing:** LangChain PDFLoader

## Getting Started

### Prerequisites

- Node.js (v18+)
- Railway or Docker for cloud services (Redis, Qdrant)
- Cloudinary account
- OpenAI API key
