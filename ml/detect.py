"""
PathAegis — Real-Time Pothole Detection
========================================
Runs webcam inference with a trained YOLOv8 model and posts detections
to the PathAegis backend.

Usage:
    python detect.py --model best.pt --backend http://localhost:5000

Requirements:
    pip install ultralytics opencv-python requests
"""

import argparse
import time
import math
import cv2
import requests
from datetime import datetime

# ── Try importing YOLO; gracefully skip if not installed ─────────────────────
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[WARN] ultralytics not installed. Run: pip install ultralytics")

# ── Simulated GPS (replace with real GPS module in production) ───────────────
BASE_LAT = 18.5204   # Pune, India — change to your city
BASE_LNG = 73.8567

def get_gps_coords():
    """Simulate slight GPS jitter for demo; replace with real GPS module."""
    import random
    return (
        BASE_LAT + random.uniform(-0.002, 0.002),
        BASE_LNG + random.uniform(-0.002, 0.002)
    )

# ── Severity from bounding-box area ─────────────────────────────────────────
def classify_severity(bbox_area: float, frame_area: float) -> str:
    ratio = bbox_area / max(frame_area, 1)
    if ratio < 0.02:
        return "low"
    elif ratio < 0.07:
        return "medium"
    else:
        return "high"

SEVERITY_COLORS = {
    "low":    (0, 255, 80),
    "medium": (0, 200, 255),
    "high":   (0, 50, 255),
}

# ── Backend integration ───────────────────────────────────────────────────────
def send_detection(backend_url: str, lat: float, lng: float,
                   severity: str, confidence: float, bbox_area: float):
    try:
        payload = {
            "latitude": lat,
            "longitude": lng,
            "severity": severity,
            "confidence": round(confidence, 4),
            "bbox_area": round(bbox_area, 2)
        }
        resp = requests.post(f"{backend_url}/pothole", json=payload, timeout=3)
        if resp.status_code == 201:
            print(f"[PathAegis] ✅ Sent: {severity.upper()} at ({lat:.5f}, {lng:.5f})")
        else:
            print(f"[PathAegis] ⚠️  Backend returned {resp.status_code}: {resp.text}")
    except requests.exceptions.RequestException as e:
        print(f"[PathAegis] ❌ Backend error: {e}")

# ── Main detection loop ───────────────────────────────────────────────────────
def run_detection(model_path: str, backend_url: str, camera_index: int = 0,
                  send_interval: float = 5.0, conf_threshold: float = 0.35):

    if not YOLO_AVAILABLE:
        print("Please install: pip install ultralytics")
        return

    print(f"[PathAegis] Loading model: {model_path}")
    model = YOLO(model_path)

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[PathAegis] Cannot open camera {camera_index}")
        return

    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_area = frame_w * frame_h
    print(f"[PathAegis] Camera: {frame_w}×{frame_h}")

    last_send_time = 0
    detection_count = 0

    print("[PathAegis] Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[PathAegis] Frame capture failed.")
            break

        results = model(frame, conf=conf_threshold, verbose=False)
        current_time = time.time()
        pothole_detected = False
        worst_severity = "low"
        best_conf = 0.0
        best_area = 0.0

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                bbox_area = (x2 - x1) * (y2 - y1)
                severity = classify_severity(bbox_area, frame_area)
                color = SEVERITY_COLORS[severity]

                # Draw bounding box
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)

                # Label
                label = f"Pothole [{severity.upper()}] {conf:.0%}"
                label_y = max(int(y1) - 10, 20)
                cv2.rectangle(frame,
                              (int(x1), label_y - 20), (int(x1) + len(label) * 9, label_y + 5),
                              color, -1)
                cv2.putText(frame, label, (int(x1) + 4, label_y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)

                pothole_detected = True
                detection_count += 1

                if {"low": 0, "medium": 1, "high": 2}[severity] >= {"low": 0, "medium": 1, "high": 2}[worst_severity]:
                    worst_severity = severity
                    best_conf = conf
                    best_area = bbox_area

        # Alert overlay
        if pothole_detected:
            alert_color = SEVERITY_COLORS[worst_severity]
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (frame_w, 60), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
            cv2.putText(frame, "⚠  POTHOLE AHEAD", (20, 42),
                        cv2.FONT_HERSHEY_DUPLEX, 1.1, alert_color, 2)

            # Send to backend at interval
            if current_time - last_send_time >= send_interval:
                lat, lng = get_gps_coords()
                send_detection(backend_url, lat, lng, worst_severity, best_conf, best_area)
                last_send_time = current_time

        # HUD: stats
        cv2.putText(frame, f"PathAegis | Detections: {detection_count}", (10, frame_h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)
        ts = datetime.now().strftime("%H:%M:%S")
        cv2.putText(frame, ts, (frame_w - 90, frame_h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        cv2.imshow("PathAegis — Real-Time Pothole Detection", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"[PathAegis] Session ended. Total detections: {detection_count}")

# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PathAegis Pothole Detector")
    parser.add_argument("--model",    default="best.pt",              help="Path to trained YOLOv8 model")
    parser.add_argument("--backend",  default="http://localhost:5000", help="Backend API URL")
    parser.add_argument("--camera",   default=0,  type=int,           help="Camera index (default 0)")
    parser.add_argument("--interval", default=5.0, type=float,        help="Seconds between backend sends")
    parser.add_argument("--conf",     default=0.35, type=float,       help="Detection confidence threshold")
    args = parser.parse_args()

    run_detection(
        model_path=args.model,
        backend_url=args.backend,
        camera_index=args.camera,
        send_interval=args.interval,
        conf_threshold=args.conf
    )
