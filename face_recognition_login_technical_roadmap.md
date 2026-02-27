# Face Recognition Login System -- Technical Roadmap

## Project Goal

Build a production-ready web-based Face Recognition Login system using:

-   Frontend: Next.js (TypeScript)
-   Backend: FastAPI (Python)
-   Face Model: InsightFace (ArcFace)
-   Database: PostgreSQL + pgvector
-   Deployment: Docker

System performs: Camera Capture → Backend Embedding → Vector Similarity
Search → JWT Login

------------------------------------------------------------------------

# High-Level Architecture

Browser (Next.js) ↓ Frame Capture ↓ POST /auth/face-login ↓ FastAPI ↓
InsightFace (ArcFace) ↓ PostgreSQL (pgvector similarity search) ↓ JWT
Response

------------------------------------------------------------------------

# PHASE 1 --- Project Setup & Infrastructure

## 1.1 Repository Structure

root/ ├── frontend/ (Next.js TS) ├── backend/ (FastAPI) ├──
docker-compose.yml └── README.md

## 1.2 Docker Services

-   frontend
-   backend
-   postgres (pgvector)

Postgres image: ankane/pgvector

## 1.3 Database Schema

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users ( id UUID PRIMARY KEY, username TEXT UNIQUE NOT NULL,
face_embedding vector(512), created_at TIMESTAMP DEFAULT NOW() );

Add vector index:

CREATE INDEX ON users USING ivfflat (face_embedding vector_cosine_ops);

------------------------------------------------------------------------

# PHASE 2 --- Face Recognition Pipeline

## 2.1 Backend Dependencies

-   insightface
-   onnxruntime
-   numpy
-   opencv-python
-   fastapi
-   uvicorn

Model: - buffalo_l (ArcFace 512D embedding)

## 2.2 Embedding Pipeline

1.  Receive image
2.  Detect face
3.  Select largest face
4.  Generate embedding
5.  Normalize embedding
6.  Query database

Pipeline logic:

face = detect_face(image) embedding = model.get_embedding(face)
embedding = normalize(embedding)

## 2.3 Similarity Query

SELECT id, username, 1 - (face_embedding \<=\> \$1) AS similarity FROM
users ORDER BY face_embedding \<=\> \$1 LIMIT 1;

Initial threshold: similarity \>= 0.6

------------------------------------------------------------------------

# PHASE 3 --- Authentication Endpoints

## 3.1 Register Endpoint

POST /auth/register

Flow: - Capture face - Generate embedding - Store in database

## 3.2 Face Login Endpoint

POST /auth/face-login

Flow: 1. Receive image 2. Generate embedding 3. Query nearest user 4.
Check similarity threshold 5. Generate JWT

JWT payload:

{ "user_id": "...", "username": "...", "exp": "..." }

------------------------------------------------------------------------

# PHASE 4 --- Frontend Implementation

## 4.1 Camera Access

Use getUserMedia API.

## 4.2 Frame Capture

Capture frame using canvas and send Base64 image to backend.

Request format:

{ "image": "base64string" }

## 4.3 User Flow

1.  Open login page
2.  Camera activates
3.  Click "Scan Face"
4.  If successful → redirect to dashboard

------------------------------------------------------------------------

# PHASE 5 --- Security Hardening

## 5.1 Rate Limiting

Limit login attempts (e.g., 5 attempts per minute).

## 5.2 Logging

Log: - Failed attempts - IP addresses - Timestamp

## 5.3 HTTPS

Required for camera access and secure deployment. Use reverse proxy with
SSL (e.g., Nginx + Let's Encrypt).

## 5.4 Optional: Liveness Detection

Basic approach: - Capture multiple frames - Compare embedding variance -
Detect static photo attacks

------------------------------------------------------------------------

# PHASE 6 --- Deployment

## 6.1 Backend Dockerfile

-   Python slim image
-   Install dependencies
-   Load model at startup

## 6.2 Frontend Dockerfile

-   Node 20
-   Build Next.js standalone output

## 6.3 docker-compose

Services: - frontend (3000) - backend (8000) - postgres (5432)

------------------------------------------------------------------------

# PHASE 7 --- Testing & Calibration

## 7.1 Threshold Testing

Test: - Same person similarity - Different person similarity

Adjust threshold accordingly.

## 7.2 Performance Target

Embedding time: \< 100ms\
Total login time: \< 300ms

------------------------------------------------------------------------

# CV Highlights

-   ArcFace 512D Embedding System
-   Cosine Similarity Vector Search
-   pgvector IVFFlat Indexing
-   Dockerized ML Service
-   RESTful Biometric Authentication API
-   JWT-Based Stateless Authentication

------------------------------------------------------------------------

# Estimated Timeline

Week 1: Infrastructure + Docker + DB

Week 2: InsightFace Integration + API

Week 3: Frontend Integration + Testing

Week 4: Security Hardening + Deployment

------------------------------------------------------------------------

End of Technical Roadmap
