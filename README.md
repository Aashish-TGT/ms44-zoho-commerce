# MS44: Zoho Commerce Connector

## Purpose
When a customer pays on Zoho Commerce, this service auto-creates tenant, subscription, and API key, then emails the customer.

## Tech Stack
- Node.js + Express
- MongoDB (audit log)
- Runs on Azure App Service / AKS

## Project Structure
```
ms44-zoho-connector/
├── index.js
├── package.json
├── Dockerfile
├── .env.example
├── README.md
├── models/
│   └── audit.js
├── services/
│   └── orderProcessor.js
├── utils/
│   └── verifyHmac.js
└── test/
    └── samplePayload.json
```

## Endpoints
- `POST /zoho/webhook/order-paid`
- `GET /health`

## Setup
```bash
npm install
cp .env.example .env
npm start
```

## Docker
```bash
docker build -t ms44 .
docker run -p 3000:3000 --env-file .env ms44
```

## Acceptance Criteria
- Paid order → tenant created, API key issued, email sent.
- Safe idempotency (no duplicates).
- Failures logged and alerted.
