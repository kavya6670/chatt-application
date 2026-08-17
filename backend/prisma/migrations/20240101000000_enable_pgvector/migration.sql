-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the DocumentChunk table with vector support
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- Create index on embedding for vector similarity search
CREATE INDEX "DocumentChunk_embedding_idx" ON "DocumentChunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
