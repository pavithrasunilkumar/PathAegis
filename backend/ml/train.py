"""
PathAegis — YOLOv8 Custom Training Script
==========================================
Trains a custom YOLOv8 model on a pothole dataset.

Dataset:
    Download from Roboflow: https://universe.roboflow.com/search?q=pothole&t=object-detection
    Export in YOLOv8 format and place in dataset/

Usage:
    python train.py --epochs 50 --imgsz 640 --batch 16
"""

import argparse
import os
import sys

try:
    from ultralytics import YOLO
except ImportError:
    print("Install ultralytics first: pip install ultralytics")
    sys.exit(1)

def train(data_yaml: str, base_model: str, epochs: int, imgsz: int, batch: int, name: str):
    print(f"[PathAegis Training] Base model  : {base_model}")
    print(f"[PathAegis Training] Dataset YAML: {data_yaml}")
    print(f"[PathAegis Training] Epochs       : {epochs}")
    print(f"[PathAegis Training] Image size   : {imgsz}")
    print(f"[PathAegis Training] Batch size   : {batch}")
    print()

    if not os.path.exists(data_yaml):
        print(f"[ERROR] Dataset YAML not found: {data_yaml}")
        print("Please download a pothole dataset in YOLOv8 format:")
        print("  1. Go to https://universe.roboflow.com/search?q=pothole")
        print("  2. Choose a dataset → Export → YOLOv8 format")
        print("  3. Extract into ml/dataset/")
        sys.exit(1)

    model = YOLO(base_model)

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        name=name,
        project=".",
        patience=15,
        save=True,
        plots=True,
        augment=True,
        mosaic=1.0,
        mixup=0.15,
        flipud=0.1,
        fliplr=0.5,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        verbose=True,
    )

    best_weights = os.path.join("runs", "detect", name, "weights", "best.pt")
    print()
    print("=" * 60)
    print(f"[PathAegis] ✅ Training complete!")
    print(f"[PathAegis] Best model: {best_weights}")
    print(f"[PathAegis] Copy to ml/ folder and run:")
    print(f"    python detect.py --model {best_weights}")
    print("=" * 60)

    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 for PathAegis")
    parser.add_argument("--data",    default="dataset/data.yaml",  help="Path to data.yaml")
    parser.add_argument("--model",   default="yolov8n.pt",         help="Base YOLO model (yolov8n/s/m/l/x.pt)")
    parser.add_argument("--epochs",  default=50,   type=int,       help="Training epochs")
    parser.add_argument("--imgsz",   default=640,  type=int,       help="Image size")
    parser.add_argument("--batch",   default=16,   type=int,       help="Batch size")
    parser.add_argument("--name",    default="pathaegis_v1",       help="Run name")
    args = parser.parse_args()

    train(args.data, args.model, args.epochs, args.imgsz, args.batch, args.name)
