# Kapi Adda - Smart Restaurant & Cafe Platform

Kapi Adda is a modern, full-stack cafe operations and customer catalog platform built with **Next.js** and **FastAPI**, backed by **Supabase**. It features a state-of-the-art **AI Voice Operations Dashboard** that helps cafe owners manage and query their restaurant's live metrics verbally.

---

## 🚀 Key Features

### 1. Customer Ordering Portal (Frontend)
* **Interactive Menu & Catalog**: A premium, responsive interface for customers to browse beverages, snacks, desserts, and check ingredients.
* **Smart Search & Filters**: Search catalog items dynamically (search trends are tracked to guide inventory decisions).
* **Taste Preferences**: Customize milk preferences, sweetness levels, and coffee strength.

### 2. AI Voice Assistant & Owner Dashboard (Admin)
* **ASR Interruption (Barge-in)**: Speak to the assistant at any time to interrupt and start a new request.
* **Full Media Control**: Pause or stop verbal readouts instantly (supports standard English SpeechSynthesis and Indic HTML5 TTS audio stream cleanup).
* **Multi-Language Support**: Speaks and understands English, Telugu, and Hindi.
* **Grounded Analytical Queries**:
  * 💰 **Revenue & Sales**: *"What is today's revenue?"*
  * 📉 **Operational Expenses**: *"Show our costs"*
  * 📦 **Low Stock Alerts**: *"Any ingredients running low?"*
  * 🌟 **Ratings & Reviews**: *"Which product has the highest rating?"* or *"What is the lowest rating product?"*
  * 💬 **Specific Product Feedback**: *"What are the reviews for Filter Coffee?"* (reads customer comments directly from the database).
  * 📈 **Customer Traffic**: *"Which item is viewed by the highest number of people?"*

### 3. AI Business Intelligence (BI)
* **Unmet Demand alerts**: Highlights items customers searched for but are not in the menu.
* **Critical Stock warning**: Warns if out-of-stock items are receiving high page views.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 16 (Turbopack), React 19, Vanilla CSS, Tailwind CSS
* **Backend**: FastAPI (Python 3.11+), Supabase Client, Google Translate API
* **Database**: Supabase PostgreSQL

---

## 📦 Installation & Setup

### 1. Backend Setup
Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

Run the FastAPI development server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The API documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup
Navigate to the frontend directory:
```bash
cd ../frontend
```

Install the Node modules:
```bash
npm install
```

Run the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔒 Security & Git configuration
This repository has a root-level `.gitignore` configured to prevent committing virtual environments (`.venv/`), Next.js builds (`.next/`), dependency directories (`node_modules/`), local logs (`*.log`), and credentials files (`.env`). **Do not commit local `.env` files to keep database keys secure.**
