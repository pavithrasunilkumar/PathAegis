from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
import hashlib
import os
import secrets
from datetime import datetime, timezone
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "pathaegis.db")

# ─── Database Setup ────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS potholes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            severity TEXT NOT NULL CHECK(severity IN ('low','medium','high')),
            confidence REAL DEFAULT 0.0,
            bbox_area REAL DEFAULT 0.0,
            image_path TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    """)
    conn.commit()
    conn.close()
    print("[PathAegis] Database initialized.")

init_db()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# ─── Auth Helpers ──────────────────────────────────────────────────────────────

def get_current_user(req):
    token = req.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    conn = get_db()
    row = conn.execute(
        "SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?", (token,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user(request)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, user=user, **kwargs)
    return decorated

# ─── Auth Routes ──────────────────────────────────────────────────────────────

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "All fields required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (username, email, hash_password(password), datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists"}), 409
    finally:
        conn.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    identifier = data.get("username", "").strip()
    password = data.get("password", "")

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE (username = ? OR email = ?) AND password_hash = ?",
        (identifier, identifier, hash_password(password))
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "Invalid credentials"}), 401

    token = secrets.token_hex(32)
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user["id"], datetime.now(timezone.utc).isoformat())
    )
    conn.commit()
    conn.close()

    return jsonify({
        "token": token,
        "user": {"id": user["id"], "username": user["username"], "email": user["email"]}
    }), 200

@app.route("/logout", methods=["POST"])
@login_required
def logout(user):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route("/me", methods=["GET"])
@login_required
def me(user):
    return jsonify({"user": {"id": user["id"], "username": user["username"], "email": user["email"]}}), 200

# ─── Pothole Routes ────────────────────────────────────────────────────────────

@app.route("/pothole", methods=["POST"])
def report_pothole():
    """Accepts pothole reports from ML module or authenticated users."""
    data = request.get_json()
    user = get_current_user(request)

    latitude = data.get("latitude")
    longitude = data.get("longitude")
    severity = data.get("severity", "medium")
    confidence = data.get("confidence", 0.0)
    bbox_area = data.get("bbox_area", 0.0)

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude required"}), 400
    if severity not in ("low", "medium", "high"):
        return jsonify({"error": "severity must be low, medium, or high"}), 400

    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO potholes (user_id, latitude, longitude, severity, confidence, bbox_area, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            user["id"] if user else None,
            float(latitude), float(longitude),
            severity, float(confidence), float(bbox_area),
            datetime.now(timezone.utc).isoformat()
        )
    )
    pothole_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"message": "Pothole recorded", "id": pothole_id}), 201

@app.route("/potholes", methods=["GET"])
def get_potholes():
    """Returns all potholes. Optionally filter by severity."""
    severity_filter = request.args.get("severity")
    limit = int(request.args.get("limit", 1000))

    conn = get_db()
    if severity_filter and severity_filter in ("low", "medium", "high"):
        rows = conn.execute(
            "SELECT * FROM potholes WHERE severity = ? ORDER BY timestamp DESC LIMIT ?",
            (severity_filter, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM potholes ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()

    return jsonify({
        "potholes": [dict(r) for r in rows],
        "total": len(rows)
    }), 200

@app.route("/stats", methods=["GET"])
def get_stats():
    """Returns aggregate statistics."""
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as c FROM potholes").fetchone()["c"]
    high = conn.execute("SELECT COUNT(*) as c FROM potholes WHERE severity='high'").fetchone()["c"]
    medium = conn.execute("SELECT COUNT(*) as c FROM potholes WHERE severity='medium'").fetchone()["c"]
    low = conn.execute("SELECT COUNT(*) as c FROM potholes WHERE severity='low'").fetchone()["c"]
    users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    recent = conn.execute(
        "SELECT * FROM potholes ORDER BY timestamp DESC LIMIT 5"
    ).fetchall()
    conn.close()

    return jsonify({
        "total": total,
        "high": high,
        "medium": medium,
        "low": low,
        "users": users,
        "recent": [dict(r) for r in recent]
    }), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "PathAegis Backend"}), 200

# ─── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))

    print(f"[PathAegis] Backend running on port {port}")

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
