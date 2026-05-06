# PathAegis — YOLO Dataset Structure
# =====================================
# Place your pothole dataset here in this structure:
#
# dataset/
#   images/
#     train/
#       img001.jpg
#       img002.jpg
#       ...
#     val/
#       img101.jpg
#       ...
#   labels/
#     train/
#       img001.txt    ← YOLO format: class cx cy w h
#       img002.txt
#       ...
#     val/
#       img101.txt
#       ...
#   data.yaml         ← see below
#
# ─────────────────────────────────────
# WHERE TO GET THE DATASET
# ─────────────────────────────────────
# 1. Go to: https://universe.roboflow.com/search?q=pothole&t=object-detection
# 2. Pick a dataset (e.g. "Pothole Detection" by nislamsiam)
# 3. Click Export → Format: YOLOv8 → Download zip
# 4. Extract here as ml/dataset/
#
# ─────────────────────────────────────
# data.yaml TEMPLATE (edit paths)
# ─────────────────────────────────────
# path: ./dataset
# train: images/train
# val:   images/val
# nc: 1
# names: ['pothole']
