# 🚗 PathAegis — AI Road Intelligence System

> **Real-time pothole detection · Permanent crowd-sourced map · Dark dashboard**

PathAegis uses a custom-trained YOLOv8 model to detect potholes via webcam, logs each detection with GPS coordinates and severity to a Flask backend, and displays everything on a live Leaflet/OpenStreetMap dashboard built with React.

---

## 📁 Project Structure

```
PathAegis/
├── backend/
│   ├── app.py              ← Flask REST API
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/          ← Home, Login, Register, Dashboard
│   │   ├── components/     ← Navbar, Map, Camera, Stats, Table
│   │   ├── hooks/          ← useAuth context
│   │   └── utils/          ← Axios API client
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── ml/
│   ├── train.py            ← YOLOv8 training script
│   ├── detect.py           ← Real-time webcam detector
│   ├── requirements.txt
│   └── dataset/
│       ├── data.yaml       ← Dataset config
│       └── README.md       ← Dataset download instructions
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start — Without Docker

### 1. Backend Setup

```bash
cd PathAegis/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
python app.py
# → Running on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd PathAegis/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → Running on http://localhost:3000
```

### 3. ML Setup — Training (Required once)

```bash
cd PathAegis/ml

# Install dependencies
pip install -r requirements.txt

# Download dataset first! See ml/dataset/README.md
# Then train:
python train.py --epochs 50 --imgsz 640 --batch 16

# Best model saved to:
# runs/detect/pathaegis_v1/weights/best.pt
```

### 4. ML Setup — Real-Time Detection

```bash
cd PathAegis/ml

# Copy trained model here
cp runs/detect/pathaegis_v1/weights/best.pt .

# Run detector
python detect.py --model best.pt --backend http://localhost:5000

# Options:
#   --camera 0        Camera index (0 = default webcam)
#   --interval 5.0    Seconds between backend sends
#   --conf 0.35       Detection confidence threshold
```

---

## 🐳 Quick Start — With Docker

```bash
cd PathAegis

# Build and start all services
docker-compose up --build

# Services:
#   Backend  → http://localhost:5000
#   Frontend → http://localhost:3000

# Stop
docker-compose down
```

> **Note:** The ML detector must run locally (not in Docker) because it needs webcam access.

---

## 🌐 Ports & Connections

| Service  | Port | Notes |
|----------|------|-------|
| Backend  | 5000 | Flask REST API |
| Frontend | 3000 | React + Vite dev / Nginx in Docker |
| ML       | —    | Runs locally, posts to backend:5000 |

**Data flow:**
```
Webcam → detect.py → POST /pothole → Flask DB (SQLite)
                                          ↑
Frontend polls GET /potholes every 5s ───┘
Frontend polls GET /stats  every 5s
```

---

## 🔌 API Reference

### Auth

| Method | Endpoint    | Body                          | Returns |
|--------|-------------|-------------------------------|---------|
| POST   | /register   | username, email, password     | 201     |
| POST   | /login      | username/email, password      | token   |
| POST   | /logout     | — (Bearer token)              | 200     |
| GET    | /me         | — (Bearer token)              | user    |

### Potholes

| Method | Endpoint   | Params/Body                   | Returns |
|--------|------------|-------------------------------|---------|
| POST   | /pothole   | latitude, longitude, severity | 201 + id|
| GET    | /potholes  | ?severity=high&limit=100      | array   |
| GET    | /stats     | —                             | counts  |
| GET    | /health    | —                             | ok      |

### Example — Report a pothole

```bash
curl -X POST http://localhost:5000/pothole \
  -H "Content-Type: application/json" \
  -d '{"latitude": 18.5204, "longitude": 73.8567, "severity": "high", "confidence": 0.91}'
```

### Example — Get all potholes

```bash
curl http://localhost:5000/potholes?limit=50
```

---

## 🧠 ML Model — Training Guide

### Step 1: Download Dataset

1. Go to [Roboflow Universe — Pothole](https://universe.roboflow.com/search?q=pothole&t=object-detection)
2. Choose any dataset (recommended: 500+ images)
3. Export → **YOLOv8 format** → Download ZIP
4. Extract into `ml/dataset/`

Your structure should look like:
```
ml/dataset/
  images/train/*.jpg
  images/val/*.jpg
  labels/train/*.txt
  labels/val/*.txt
  data.yaml
```

### Step 2: Train

```bash
python train.py \
  --data dataset/data.yaml \
  --model yolov8n.pt \   # n=nano(fast) s=small m=medium l=large
  --epochs 50 \
  --imgsz 640 \
  --batch 16
```

Training time: ~20–90 min depending on GPU/CPU and dataset size.

### Step 3: Use model

```bash
# Best weights automatically saved to:
runs/detect/pathaegis_v1/weights/best.pt

# Copy and run detector:
cp runs/detect/pathaegis_v1/weights/best.pt ml/
python ml/detect.py --model ml/best.pt
```

---

## 🎯 Severity Classification

| Bounding Box / Frame Area | Severity |
|--------------------------|----------|
| < 2%                     | 🟢 Low   |
| 2% – 7%                  | 🟡 Medium |
| > 7%                     | 🔴 High  |

---

## 📦 ZIP the Project

```bash
# From parent folder:
zip -r PathAegis.zip PathAegis/ \
  --exclude "PathAegis/backend/venv/*" \
  --exclude "PathAegis/frontend/node_modules/*" \
  --exclude "PathAegis/ml/runs/*" \
  --exclude "PathAegis/backend/pathaegis.db" \
  --exclude "*/__pycache__/*" \
  --exclude "*/.DS_Store"

# Windows (PowerShell):
Compress-Archive -Path PathAegis -DestinationPath PathAegis.zip
```

---

## 🛠 Tech Stack

| Layer     | Technology |
|-----------|------------|
| ML        | YOLOv8 (Ultralytics), OpenCV |
| Backend   | Flask, SQLite, Flask-CORS |
| Frontend  | React 18, Vite, Tailwind CSS, Leaflet |
| Map       | OpenStreetMap (free, no API key) |
| Auth      | Token-based (localStorage) |
| Docker    | Multi-stage build, Nginx |

---

## 🔮 User Flow

1. **User registers** → stored in SQLite
2. **User logs in** → receives Bearer token
3. **Dashboard loads** → polls `/potholes` + `/stats` every 5 seconds
4. **ML detector runs** → webcam captures frames
5. **Pothole detected** → bounding box drawn + alert overlay
6. **Data sent** → POST to `/pothole` with lat/lng/severity
7. **Map updates** → next poll cycle shows new marker
8. **Permanent storage** → next user sees all past detections

