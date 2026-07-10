from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor
import urllib.request
import json
import re
import random
from datetime import datetime, date, timedelta
from deep_translator import GoogleTranslator
import smtplib
from email.mime.text import MIMEText
import os

# Load local .env file manually
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

app = FastAPI(title="Kapi Adda Smart Restaurant API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# Supabase REST API Client Helper
import requests

class SupabaseClient:
    def __init__(self):
        self.url = "https://kvjvnrktnkenlsaatmxq.supabase.co/rest/v1"
        self.anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anZucmt0bmtlbmxzYWF0bXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk4NjgsImV4cCI6MjA5NjEzNTg2OH0.FOB6qXDOcZ7L0pb_fI1z2ZGd3CGM-lvtfTw2FcKxHqo"
        # Set up a requests.Session with connection pooling
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(pool_connections=20, pool_maxsize=20)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        
    def request(self, method, table, params=None, body=None, select="*", prefer=None):
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json"
        }
        if prefer:
            headers["Prefer"] = prefer
            
        url = f"{self.url}/{table}"
        
        req_params = {}
        if select:
            req_params["select"] = select
        if params:
            req_params.update(params)
            
        import time
        max_retries = 3
        backoff = 0.5
        for attempt in range(max_retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=req_params,
                    json=body if body is not None else None,
                    timeout=8
                )
                if response.status_code >= 400:
                    print(f"HTTP Error calling Supabase REST API: {response.status_code} - {response.text}")
                    if response.status_code >= 500 and attempt < max_retries - 1:
                        time.sleep(backoff * (2 ** attempt))
                        continue
                    raise HTTPException(status_code=response.status_code, detail=f"Supabase REST Error: {response.text}")
                
                return response.json() if response.content else []
            except HTTPException:
                raise
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"Connection error on attempt {attempt+1}: {e}. Retrying...")
                    time.sleep(backoff * (2 ** attempt))
                    continue
                print(f"Error calling Supabase REST API after {max_retries} attempts: {e}")
                raise HTTPException(status_code=500, detail=str(e))

db = SupabaseClient()

def fetch_parallel(tables_and_params):
    def do_req(item):
        if isinstance(item, tuple):
            table, params = item
            return db.request("GET", table, params=params)
        else:
            return db.request("GET", item)
    with ThreadPoolExecutor(max_workers=len(tables_and_params)) as executor:
        return list(executor.map(do_req, tables_and_params))

MENU_CACHE = None
ADMIN_MENU_CACHE = None
MENU_FLAT_CACHE = None
MENU_FEATURED_CACHE = None
USER_PRESENCE_OVERRIDE = {}  # maps user_id -> boolean (True for online, False for offline)
OWNER_VOICE_MEMORY = {}

def invalidate_menu_cache():
    global MENU_CACHE, ADMIN_MENU_CACHE, MENU_FLAT_CACHE, MENU_FEATURED_CACHE
    MENU_CACHE = None
    ADMIN_MENU_CACHE = None
    MENU_FLAT_CACHE = None
    MENU_FEATURED_CACHE = None

# Schemas
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    mobile: Optional[str] = None
    role: Optional[str] = "customer"
    veg_preference: Optional[str] = "non-veg"
    favorite_categories: Optional[List[str]] = []
    spice_preference: Optional[str] = "medium"
    dietary_preferences: Optional[List[str]] = []

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdateRequest(BaseModel):
    name: str

class RequestOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

def validate_password_strength(pwd: str) -> Optional[str]:
    if not pwd:
        return "Password is required."
    if len(pwd) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r"[a-z]", pwd):
        return "Password must contain at least one lowercase letter (small letter)."
    if not re.search(r"[A-Z]", pwd):
        return "Password must contain at least one uppercase letter (capital letter)."
    if not re.search(r"[0-9]", pwd):
        return "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", pwd):
        return "Password must contain at least one special character."
    return None

class OrderItemInput(BaseModel):
    menu_item_id: str
    quantity: int

class OrderInput(BaseModel):
    user_id: Optional[str] = None
    items: List[OrderItemInput]
    weather_condition: Optional[str] = "clear"

class ExpenseInput(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[str] = None

class MessageRequest(BaseModel):
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    message: str
    lang: Optional[str] = "en"

class ReviewInput(BaseModel):
    user_id: Optional[str] = None
    menu_item_id: str
    rating: int
    comment: str
    reviewer_name: Optional[str] = 'Anonymous'

class CategoryInput(BaseModel):
    name: str
    description: str

class MenuItemInput(BaseModel):
    name: str
    description: str
    category_id: str
    price: float
    availability_status: str = 'available'
    image_url: Optional[str] = None
    rating: Optional[float] = 4.0
    prep_time: Optional[int] = 5
    pieces: Optional[str] = None

class AnalyticsTrackInput(BaseModel):
    user_id: Optional[str] = None
    action_type: str  # view/search/click/chat
    target_id: Optional[str] = None
    search_query: Optional[str] = None

def extract_pieces_from_desc(description: str):
    """
    Looks for the pattern ' [Pieces: <val>]' or '[Pieces: <val>]' at the end of the description.
    Returns (clean_description, pieces_value).
    """
    if not description:
        return "", None
    match = re.search(r"\s*\[Pieces:\s*(.*?)\]\s*$", description)
    if match:
        pieces = match.group(1)
        # Remove the tag from the description
        clean_desc = description[:match.start()].strip()
        return clean_desc, pieces
    return description, None

def format_pieces_into_desc(description: str, pieces: Optional[str]) -> str:
    """
    Appends ' [Pieces: <pieces>]' to description if pieces is provided.
    """
    clean_desc, _ = extract_pieces_from_desc(description)
    if pieces and str(pieces).strip():
        return f"{clean_desc} [Pieces: {str(pieces).strip()}]"
    return clean_desc

def get_all_reviews_map():
    try:
        reviews = db.request("GET", "reviews")
        reviews_map = {}
        for r in reviews:
            item_id = r.get("menu_item_id")
            rating_val = r.get("rating")
            if item_id and rating_val is not None:
                if item_id not in reviews_map:
                    reviews_map[item_id] = []
                reviews_map[item_id].append(float(rating_val))
        return reviews_map
    except Exception as e:
        print("Error fetching reviews map:", e)
        return {}

def preprocess_item(item: dict, reviews_map: Optional[dict] = None) -> dict:
    if not item:
        return item
    desc = item.get("description", "")
    clean_desc, pieces = extract_pieces_from_desc(desc)
    item["description"] = clean_desc
    item["pieces"] = pieces
    item["is_available"] = (item.get("availability_status") == "available")
    
    # Calculate real-time ratings
    item_id = item.get("id")
    if reviews_map is not None:
        if item_id in reviews_map:
            ratings = reviews_map[item_id]
            item["rating"] = round(sum(ratings) / len(ratings), 1)
            item["rating_count"] = len(ratings)
        else:
            item["rating"] = 0.0
            item["rating_count"] = 0
    else:
        # Fetch reviews directly for this item
        try:
            reviews = db.request("GET", "reviews", params={"menu_item_id": f"eq.{item_id}"})
            if reviews:
                ratings = [float(r["rating"]) for r in reviews]
                item["rating"] = round(sum(ratings) / len(ratings), 1)
                item["rating_count"] = len(ratings)
            else:
                item["rating"] = 0.0
                item["rating_count"] = 0
        except Exception as e:
            print("Error loading reviews for item:", e)
            item["rating"] = item.get("rating") or 0.0
            item["rating_count"] = 0
            
    return item

def preprocess_items(items: list) -> list:
    reviews_map = get_all_reviews_map()
    return [preprocess_item(dict(item), reviews_map) for item in items]

# Endpoints

@app.get("/")
def home():
    return {"message": "Welcome to Kapi Adda Smart Restaurant API Platform!"}

# Register User
@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    # Enforce password strength validation
    strength_error = validate_password_strength(req.password)
    if strength_error:
        raise HTTPException(status_code=400, detail=strength_error)

    email_normalized = req.email.strip().lower()
    # Verify if user already exists
    existing = db.request("GET", "users", params={"email": f"eq.{email_normalized}"})
    
    # Store simple hash (mock password hashing for prototype)
    hashed_pwd = f"pbkdf2_{req.password}"
    
    # Determine role strictly: only kapiadda@gmail.com is admin
    role = "admin" if email_normalized == "kapiadda@gmail.com" else "customer"
    
    if existing:
        # User already exists - update password and name (acts as recovery/reset)
        existing_user = existing[0]
        user_payload = {
            "name": req.name,
            "password_hash": hashed_pwd,
            "mobile": req.mobile,
            "role": role
        }
        db.request("PATCH", "users", params={"id": f"eq.{existing_user['id']}"}, body=user_payload)
        
        # Check if preferences exist to insert or update
        prefs = db.request("GET", "user_preferences", params={"user_id": f"eq.{existing_user['id']}"})
        pref_payload = {
            "veg_preference": req.veg_preference,
            "favorite_categories": req.favorite_categories,
            "spice_preference": req.spice_preference,
            "dietary_preferences": req.dietary_preferences
        }
        if prefs:
            db.request("PATCH", "user_preferences", params={"user_id": f"eq.{existing_user['id']}"}, body=pref_payload)
        else:
            pref_payload["user_id"] = existing_user["id"]
            db.request("POST", "user_preferences", body=pref_payload)
            
        return {
            "message": "User registered successfully!",
            "user": {
                "id": existing_user["id"],
                "name": req.name,
                "email": email_normalized,
                "role": role
            }
        }
    
    # Insert new user
    user_payload = {
        "name": req.name,
        "email": email_normalized,
        "password_hash": hashed_pwd,
        "mobile": req.mobile,
        "role": role
    }
    
    new_users = db.request("POST", "users", body=user_payload, prefer="return=representation")
    if not new_users:
        raise HTTPException(status_code=500, detail="Failed to create user.")
    
    new_user = new_users[0]
    
    # Insert preferences
    pref_payload = {
        "user_id": new_user["id"],
        "veg_preference": req.veg_preference,
        "favorite_categories": req.favorite_categories,
        "spice_preference": req.spice_preference,
        "dietary_preferences": req.dietary_preferences
    }
    db.request("POST", "user_preferences", body=pref_payload)
    
    return {
        "message": "User registered successfully!",
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "role": new_user["role"]
        }
    }

# Login User
@app.post("/api/auth/login")
def login_user(req: LoginRequest):
    email_normalized = req.email.strip().lower()
    users = db.request("GET", "users", params={"email": f"eq.{email_normalized}"})
    if not users:
        raise HTTPException(status_code=404, detail="Invalid email or password.")
    
    user = users[0]
    
    # Strictly align role: only kapiadda@gmail.com can be admin
    actual_role = "admin" if email_normalized == "kapiadda@gmail.com" else "customer"
    if user.get("role") != actual_role:
        try:
            db.request("PATCH", "users", params={"id": f"eq.{user['id']}"}, body={"role": actual_role})
        except Exception as e:
            print(f"Error updating user role in DB: {e}")
        user["role"] = actual_role

    # Check simple hash (or static hash from seed)
    expected_hash_pattern = f"pbkdf2_{req.password}"
    # Seeded admin password is dummy hashed
    if req.password == "kappiadmin" and user["password_hash"].startswith("$2b$"):
        # Allow seeded admin to pass
        pass
    elif user["password_hash"] != expected_hash_pattern:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # Get user preferences
    prefs = db.request("GET", "user_preferences", params={"user_id": f"eq.{user['id']}"})
    pref = prefs[0] if prefs else {}
    
    return {
        "message": "Login successful!",
        "token": f"jwt_mock_token_for_{user['id']}",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": actual_role,
            "preferences": pref
        }
    }

# In-memory OTP store
otp_store = {}
plan_mode_store = {}

def send_otp_email(to_email: str, otp: str):
    # Always log the OTP code to terminal console for local debugging & test assertions
    print(f"\n=======================================================")
    print(f"[OTP SERVICE] Reset OTP for {to_email} is: {otp}")
    print(f"=======================================================\n")

    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    # If SMTP is not configured in .env, gracefully fallback
    if not all([smtp_server, smtp_port, smtp_user, smtp_password]):
        return

    msg = MIMEText(f"Hello,\n\nYour Kapi Adda password reset verification code is: {otp}\n\nThis code is valid for 15 minutes.\n\nBrew On,\nKapi Adda Team ☕")
    msg["Subject"] = "Kapi Adda - Password Reset Verification Code"
    msg["From"] = smtp_user
    msg["To"] = to_email

    try:
        with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        print(f"[OTP SERVICE] Email sent successfully to {to_email}")
    except Exception as e:
        print(f"[OTP SERVICE] Failed to send email: {e}")

# Request Password Reset OTP
@app.post("/api/auth/request-otp")
def request_otp(req: RequestOtpRequest):
    email_normalized = req.email.strip().lower()
    existing = db.request("GET", "users", params={"email": f"eq.{email_normalized}"})
    if not existing:
        raise HTTPException(status_code=404, detail="Email address not found.")
        
    # Generate 6-digit random code
    otp = str(random.randint(100000, 999999))
    otp_store[email_normalized] = otp
    
    # Send the OTP via email helper
    send_otp_email(email_normalized, otp)
    
    return {"message": "Verification code sent to your email!"}

# Verify OTP
@app.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOtpRequest):
    email_normalized = req.email.strip().lower()
    saved_otp = otp_store.get(email_normalized)
    if not saved_otp or saved_otp != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    return {"message": "Verification code verified successfully!"}

# Reset Password
@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    # Enforce password strength validation
    strength_error = validate_password_strength(req.new_password)
    if strength_error:
        raise HTTPException(status_code=400, detail=strength_error)

    email_normalized = req.email.strip().lower()
    
    # Check if OTP exists and matches
    saved_otp = otp_store.get(email_normalized)
    if not saved_otp or saved_otp != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        
    existing = db.request("GET", "users", params={"email": f"eq.{email_normalized}"})
    if not existing:
        raise HTTPException(status_code=404, detail="Email address not found.")
    
    hashed_pwd = f"pbkdf2_{req.new_password}"
    user = existing[0]
    db.request("PATCH", "users", params={"id": f"eq.{user['id']}"}, body={"password_hash": hashed_pwd})
    
    # Remove OTP from store
    otp_store.pop(email_normalized, None)
    
    return {"message": "Password reset successfully!"}

# Update Profile Name
@app.patch("/api/users/profile")
def update_profile(req: ProfileUpdateRequest, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing.")
    if not authorization.startswith("Bearer jwt_mock_token_for_"):
        raise HTTPException(status_code=401, detail="Invalid authorization token.")
    
    user_id = authorization.replace("Bearer jwt_mock_token_for_", "").strip()
    users = db.request("GET", "users", params={"id": f"eq.{user_id}"})
    if not users:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user = users[0]
    db.request("PATCH", "users", params={"id": f"eq.{user_id}"}, body={"name": req.name})
    
    user["name"] = req.name
    return {
        "message": "Profile updated successfully!",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

# User Presence Heartbeat — called by customer frontend every 25s to mark user as online
@app.post("/api/users/heartbeat")
def user_heartbeat(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    actual_token = token
    if not actual_token and authorization and authorization.startswith("Bearer "):
        actual_token = authorization.replace("Bearer ", "").strip()
        
    if not actual_token or not actual_token.startswith("jwt_mock_token_for_"):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    user_id = actual_token.replace("jwt_mock_token_for_", "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Mark online in memory immediately!
    USER_PRESENCE_OVERRIDE[user_id] = True

    try:
        from datetime import timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        db.request("POST", "user_activity_logs", body={
            "user_id": user_id,
            "activity_type": "view",   # 'view' is allowed by DB constraint; used as presence signal
            "created_at": now_iso
        })
    except Exception as e:
        print(f"Heartbeat log error: {e}")  # log but don't fail
    return {"status": "ok"}

# User Presence Offline — called when tab/page is hidden, closed, or logged out
@app.post("/api/users/offline")
def user_offline(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    actual_token = token
    if not actual_token and authorization and authorization.startswith("Bearer "):
        actual_token = authorization.replace("Bearer ", "").strip()
        
    if not actual_token or not actual_token.startswith("jwt_mock_token_for_"):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    user_id = actual_token.replace("jwt_mock_token_for_", "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Mark offline in memory immediately!
    USER_PRESENCE_OVERRIDE[user_id] = False
    return {"status": "ok"}

# ── Open-Source ASR (Automatic Speech Recognition) ──────────────────────────
# Uses faster-whisper (local Whisper model) — no API key, fully offline
_whisper_model = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        print("Loading Whisper tiny model (first time — downloads ~75MB)...")
        _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
        print("Whisper model ready.")
    return _whisper_model

@app.post("/api/ai/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """Transcribe audio using local Whisper model — open-source ASR."""
    if not authorization or not authorization.startswith("Bearer jwt_mock_token_for_"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    import tempfile, os
    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(content) < 500:
        return {"text": "", "language": "en"}  # Too small to contain speech

    # Detect format from uploaded filename (supports .webm, .wav, .ogg, .mp3, etc.)
    ext = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    print(f"ASR: received {len(content)} bytes, format: {ext}")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        f.write(content)
        tmp_path = f.name

    # Pre-check if the file contains valid audio stream to avoid crash (IndexError in PyAV)
    try:
        import av
        with av.open(tmp_path, mode="r", metadata_errors="ignore") as container:
            if not container.streams.audio:
                print("ASR warning: uploaded container has no audio streams.")
                return {"text": "", "language": "en"}
    except Exception as av_err:
        print(f"ASR warning: PyAV failed to open or parse audio container: {av_err}")
        return {"text": "", "language": "en"}

    try:
        model = get_whisper()
        language_hint = (language or "").strip().lower()
        whisper_language = language_hint if language_hint in {"en", "te", "hi", "ta", "kn"} else None
        segments, info = model.transcribe(tmp_path, beam_size=5, language=whisper_language)
        text = " ".join(seg.text for seg in segments).strip()
        print(f"ASR: transcribed ({info.language}): {text[:100]}")
        return {"text": text, "language": info.language or whisper_language or "en"}
    except Exception as e:
        print(f"ASR error: {e}. Returning empty transcription to prevent crash.")
        return {"text": "", "language": "en"}
    finally:
        try: os.unlink(tmp_path)
        except: pass



# Get Menu Items Grouped by Categories
@app.get("/api/menu")
def get_menu():
    global MENU_CACHE
    if MENU_CACHE is not None:
        return MENU_CACHE
    categories, menu_items, reviews = fetch_parallel(["categories", "menu_items", "reviews"])
    
    reviews_map = {}
    for r in reviews:
        item_id = r.get("menu_item_id")
        rating_val = r.get("rating")
        if item_id and rating_val is not None:
            if item_id not in reviews_map:
                reviews_map[item_id] = []
            reviews_map[item_id].append(float(rating_val))
            
    result = []
    for cat in categories:
        if (cat.get("description") or "").endswith("[HIDDEN]"):
            continue
        items = [preprocess_item(dict(item), reviews_map) for item in menu_items if item["category_id"] == cat["id"]]
        result.append({
            "category": cat["name"],
            "description": cat["description"],
            "items": items
        })
    MENU_CACHE = result
    return result

# Get top 6 featured menu items sorted by rating desc
@app.get("/api/menu/featured")
def get_featured_menu():
    global MENU_FEATURED_CACHE
    if MENU_FEATURED_CACHE is not None:
        return MENU_FEATURED_CACHE
    categories, menu_items = fetch_parallel(["categories", "menu_items"])
    visible_cat_ids = {c["id"] for c in categories if not (c.get("description") or "").endswith("[HIDDEN]")}
    items = [item for item in menu_items if item.get("category_id") in visible_cat_ids]
    
    available_items = [item for item in items if item.get("availability_status") != "out_of_stock"]
    sorted_items = sorted(available_items, key=lambda x: float(x.get("rating") or 0), reverse=True)
    res = preprocess_items(sorted_items[:6])
    MENU_FEATURED_CACHE = res
    return res

# Get all menu items as flat array (no category grouping)
@app.get("/api/menu/flat")
def get_menu_flat():
    global MENU_FLAT_CACHE
    if MENU_FLAT_CACHE is not None:
        return MENU_FLAT_CACHE
    categories, menu_items = fetch_parallel(["categories", "menu_items"])
    visible_cat_ids = {c["id"] for c in categories if not (c.get("description") or "").endswith("[HIDDEN]")}
    items = [item for item in menu_items if item.get("category_id") in visible_cat_ids]
    res = preprocess_items(items)
    MENU_FLAT_CACHE = res
    return res

# Get personalized recommendations
@app.get("/api/menu/recommendations")
def get_recommendations(
    user_id: Optional[str] = None,
    veg_preference: Optional[str] = None,
    spice_preference: Optional[str] = None,
    favorite_categories: Optional[str] = None  # comma-separated category names
):
    categories = [c for c in db.request("GET", "categories") if not (c.get("description") or "").endswith("[HIDDEN]")]
    visible_cat_ids = {c["id"] for c in categories}
    menu_items = [item for item in db.request("GET", "menu_items") if item.get("category_id") in visible_cat_ids]
    cat_name_to_id = {c["name"].lower(): c["id"] for c in categories}

    # Fetch user preferences if user_id provided and params not given
    if user_id and not (veg_preference or spice_preference or favorite_categories):
        prefs = db.request("GET", "user_preferences", params={"user_id": f"eq.{user_id}"})
        if prefs:
            pref = prefs[0]
            veg_preference = pref.get("veg_preference")
            spice_preference = pref.get("spice_preference")
            fav_cats = pref.get("favorite_categories") or []
            if isinstance(fav_cats, list):
                favorite_categories = ",".join(fav_cats)
            else:
                favorite_categories = str(fav_cats)

    filtered = list(menu_items)

    # Filter by veg preference
    if veg_preference and veg_preference.lower() == "veg":
        filtered = [i for i in filtered if i.get("is_veg") == True]

    # Filter by favorite categories
    if favorite_categories:
        cat_names = [c.strip().lower() for c in favorite_categories.split(",") if c.strip()]
        cat_ids = [cat_name_to_id[c] for c in cat_names if c in cat_name_to_id]
        if cat_ids:
            filtered = [i for i in filtered if i.get("category_id") in cat_ids]

    # Sort by rating descending
    filtered = sorted(filtered, key=lambda x: float(x.get("rating") or 0), reverse=True)

    return {
        "recommendations": preprocess_items(filtered[:10]),
        "filters_applied": {
            "veg_preference": veg_preference,
            "spice_preference": spice_preference,
            "favorite_categories": favorite_categories
        }
    }

# Get single menu item details
@app.get("/api/menu/{item_id}")
def get_menu_item(item_id: str):
    items = db.request("GET", "menu_items", params={"id": f"eq.{item_id}"})
    if not items:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    item = items[0]
    # Attach category name
    categories = db.request("GET", "categories", params={"id": f"eq.{item.get('category_id')}"})
    if categories:
        item["category_name"] = categories[0].get("name")
    return preprocess_item(dict(item))

# Get 4 similar items from same category
@app.get("/api/menu/{item_id}/similar")
def get_similar_items(item_id: str):
    items = db.request("GET", "menu_items", params={"id": f"eq.{item_id}"})
    if not items:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    target = items[0]
    category_id = target.get("category_id")
    all_items = db.request("GET", "menu_items", params={"category_id": f"eq.{category_id}"})
    similar = [i for i in all_items if i["id"] != item_id]
    return preprocess_items(similar[:4])

# Create Order (with Auto-Inventory Deductions & Seeding check)
@app.post("/api/orders")
def create_order(req: OrderInput):
    # Fetch menu items
    menu_items = db.request("GET", "menu_items")
    item_map = {item["id"]: item for item in menu_items}
    
    # Verify stock availability for ordered items
    order_total = 0.0
    for order_item in req.items:
        menu_item = item_map.get(order_item.menu_item_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {order_item.menu_item_id} not found.")
            
        if menu_item["availability_status"] == "out_of_stock":
            raise HTTPException(status_code=400, detail=f"Item {menu_item['name']} is currently out of stock.")
            
        order_total += float(menu_item["price"]) * order_item.quantity
        
    # Create order row
    order_payload = {
        "user_id": req.user_id,
        "status": "preparing",
        "total_amount": order_total,
        "weather_condition": req.weather_condition
    }
    
    new_orders = db.request("POST", "orders", body=order_payload, prefer="return=representation")
    if not new_orders:
        raise HTTPException(status_code=500, detail="Failed to create order.")
    order = new_orders[0]
    
    # Save order items and deduct ingredients
    inventory = db.request("GET", "inventory")
    inv_map = {item["id"]: item for item in inventory}
    
    # For a simple prototype, we log order items and deduct simple ingredients
    # If ingredients table is set up, deduct from it
    ingredients_used = db.request("GET", "menu_item_ingredients")
    
    for order_item in req.items:
        menu_item = item_map[order_item.menu_item_id]
        
        # Insert order_items link table
        item_payload = {
            "order_id": order["id"],
            "menu_item_id": order_item.menu_item_id,
            "quantity": order_item.quantity,
            "price": menu_item["price"]
        }
        db.request("POST", "order_items", body=item_payload)
        
        # Log views activity
        if req.user_id:
            activity_payload = {
                "user_id": req.user_id,
                "activity_type": "cart",
                "target_id": order_item.menu_item_id
            }
            db.request("POST", "user_activity_logs", body=activity_payload)
            
        # Deduct inventory ingredients
        item_recipes = [r for r in ingredients_used if r["menu_item_id"] == order_item.menu_item_id]
        for recipe in item_recipes:
            ing_id = recipe["ingredient_id"]
            qty_required = float(recipe["quantity_required"]) * order_item.quantity
            
            # Update ingredient quantity
            ing = inv_map.get(ing_id)
            if ing:
                new_qty = max(0.0, float(ing["quantity"]) - qty_required)
                db.request("PATCH", "inventory", params={"id": f"eq.{ing_id}"}, body={"quantity": new_qty})
                
    return {
        "message": "Order placed successfully!",
        "order": order
    }

# Authorization dependency
def verify_admin(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing.")
    if not authorization.startswith("Bearer jwt_mock_token_for_"):
        raise HTTPException(status_code=401, detail="Invalid authorization token.")
    
    user_id = authorization.replace("Bearer jwt_mock_token_for_", "").strip()
    users = db.request("GET", "users", params={"id": f"eq.{user_id}"})
    if not users:
        raise HTTPException(status_code=401, detail="User not found.")
    
    user = users[0]
    if user.get("email", "").strip().lower() != "kapiadda@gmail.com":
        raise HTTPException(status_code=403, detail="Access denied. Only kapiadda@gmail.com is authorized to access admin resources.")
    
    return user

# Admin Dashboard Analytics (Profit & Loss, Stock alerts, BI Recommendations)
@app.get("/api/admin/dashboard")
def get_admin_dashboard(current_user: dict = Depends(verify_admin)):
    # Fetch dashboard data concurrently
    orders, expenses, inventory, menu_items, logs, order_items = fetch_parallel([
        "orders",
        "expenses",
        "inventory",
        "menu_items",
        "user_activity_logs",
        "order_items"
    ])
    
    orders = orders or []
    expenses = expenses or []
    inventory = inventory or []
    menu_items = menu_items or []
    logs = logs or []
    order_items = order_items or []
    
    # Totals
    total_revenue = sum(float(o["total_amount"]) for o in orders if o["status"] != "cancelled")
    total_expenses = sum(float(e["amount"]) for e in expenses)
    profit = total_revenue - total_expenses
    
    # Stock Alerts
    low_stock = [item for item in inventory if float(item["quantity"]) <= float(item["threshold"])]
    
    # Customer Analytics: Top ordered items
    counts = {}
    for oi in order_items:
        m_id = oi["menu_item_id"]
        counts[m_id] = counts.get(m_id, 0) + oi["quantity"]
        
    top_foods = []
    item_map = {item["id"]: item for item in menu_items}
    for m_id, qty in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        item = item_map.get(m_id)
        if item:
            top_foods.append({"name": item["name"], "quantity": qty, "price": item["price"]})
            
    # Unmet demand intelligence (Mocking search logs analytics)
    searches = [log for log in logs if log["activity_type"] == "search"]
    search_counts = {}
    for s in searches:
        query = s["search_query"].strip().lower()
        search_counts[query] = search_counts.get(query, 0) + 1
        
    bi_recommendations = []
    
    # Check for items searched but not in menu dynamically based on search logs
    unmet_searches = {}
    for query, count in search_counts.items():
        matched = False
        for item in menu_items:
            item_name = item["name"].lower()
            if query in item_name or item_name in query:
                matched = True
                break
        if not matched:
            unmet_searches[query] = count

    for query, count in sorted(unmet_searches.items(), key=lambda x: x[1], reverse=True)[:3]:
        bi_recommendations.append(
            f"'{query.capitalize()}' was searched {count} times but is not in your menu catalog. Consider adding it to satisfy demand."
        )
    
    # Check if a menu item is low stock
    for item in low_stock:
        bi_recommendations.append(
            f"Alert: Ingredient '{item['item_name']}' is running low ({item['quantity']}{item['unit']} left). Reorder required immediately."
        )

    # Day-zero setup guidelines if no activity yet
    if not bi_recommendations:
        bi_recommendations.append("AI Business Intelligence is ready. Recommendations will appear here once customer search and order trends generate insights.")
        
    # Dynamic trend matching
    today_dt = datetime.now()
    last_4_dates = [(today_dt - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(3, -1, -1)]
    
    daily_sales = {d: 0.0 for d in last_4_dates}
    daily_expenses = {d: 0.0 for d in last_4_dates}
    
    for o in orders:
        if o.get("status") != "cancelled" and "created_at" in o:
            o_date = o["created_at"].split("T")[0]
            if o_date in daily_sales:
                daily_sales[o_date] += float(o["total_amount"])
                
    for e in expenses:
        e_date = e.get("date") or e.get("created_at", "").split("T")[0]
        if e_date in daily_expenses:
            daily_expenses[e_date] += float(e["amount"])
            
    revenue_trend = []
    for d in last_4_dates:
        revenue_trend.append({
            "date": d,
            "revenue": daily_sales[d],
            "expenses": daily_expenses[d]
        })
        
    return {
        "revenue": total_revenue,
        "expenses": total_expenses,
        "profit": profit,
        "low_stock_count": len(low_stock),
        "low_stock_items": low_stock,
        "top_foods": top_foods,
        "bi_recommendations": bi_recommendations,
        "revenue_trend": revenue_trend
    }

# Add Expense
@app.post("/api/admin/expenses")
def add_expense(req: ExpenseInput, current_user: dict = Depends(verify_admin)):
    expense_payload = {
        "category": req.category,
        "amount": req.amount,
        "description": req.description,
        "date": req.date or date.today().isoformat()
    }
    
    new_expenses = db.request("POST", "expenses", body=expense_payload, prefer="return=representation")
    if not new_expenses:
        raise HTTPException(status_code=500, detail="Failed to log expense.")
        
    return {
        "message": "Expense added successfully!",
        "expense": new_expenses[0]
    }

# Get all expenses
@app.get("/api/admin/expenses")
def get_expenses(current_user: dict = Depends(verify_admin)):
    expenses = db.request("GET", "expenses")
    return expenses

# Get all inventory items
@app.get("/api/admin/inventory")
def get_inventory(current_user: dict = Depends(verify_admin)):
    inventory = db.request("GET", "inventory")
    return inventory

# Update inventory item quantity
@app.patch("/api/admin/inventory/{item_id}")
def update_inventory_item(item_id: str, body: dict, current_user: dict = Depends(verify_admin)):
    existing = db.request("GET", "inventory", params={"id": f"eq.{item_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    updated = db.request("PATCH", "inventory", params={"id": f"eq.{item_id}"}, body=body, prefer="return=representation")
    return {
        "message": "Inventory updated successfully.",
        "item": updated[0] if updated else {}
    }

# Create new menu item
@app.post("/api/admin/menu")
def create_menu_item(req: MenuItemInput, current_user: dict = Depends(verify_admin)):
    payload = {
        "name": req.name,
        "description": format_pieces_into_desc(req.description, req.pieces),
        "category_id": req.category_id,
        "price": req.price,
        "availability_status": req.availability_status,
        "image_url": req.image_url,
        "rating": req.rating,
        "prep_time": req.prep_time
    }
    new_items = db.request("POST", "menu_items", body=payload, select="id,name,description,category_id,price,availability_status,rating,prep_time", prefer="return=representation")
    if not new_items:
        raise HTTPException(status_code=500, detail="Failed to create menu item.")
    invalidate_menu_cache()
    return {
        "message": "Menu item created successfully!",
        "item": preprocess_item(dict(new_items[0]))
    }

# Update menu item
@app.patch("/api/admin/menu/{item_id}")
def update_menu_item(item_id: str, req: MenuItemInput, current_user: dict = Depends(verify_admin)):
    existing = db.request("GET", "menu_items", params={"id": f"eq.{item_id}"}, select="id,description")
    if not existing:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    
    payload = req.dict(exclude_unset=True)
    description = payload.get("description", existing[0].get("description", ""))
    pieces = payload.get("pieces")
    
    if "pieces" in payload or "description" in payload:
        if "pieces" not in payload:
            _, existing_pieces = extract_pieces_from_desc(existing[0].get("description", ""))
            pieces = existing_pieces
        if "pieces" in payload:
            del payload["pieces"]
        payload["description"] = format_pieces_into_desc(description, pieces)
        
    updated = db.request("PATCH", "menu_items", params={"id": f"eq.{item_id}"}, body=payload, select="id,name,description,category_id,price,availability_status,rating,prep_time", prefer="return=representation")
    invalidate_menu_cache()
    return {
        "message": "Menu item updated successfully.",
        "item": preprocess_item(dict(updated[0])) if updated else {}
    }

# Delete menu item
@app.delete("/api/admin/menu/{item_id}")
def delete_menu_item(item_id: str, current_user: dict = Depends(verify_admin)):
    existing = db.request("GET", "menu_items", params={"id": f"eq.{item_id}"}, select="id")
    if existing:
        db.request("DELETE", "menu_items", params={"id": f"eq.{item_id}"})
        invalidate_menu_cache()
    return {"message": f"Menu item {item_id} deleted successfully."}

# Categories Admin Endpoints
@app.get("/api/admin/categories")
def get_admin_categories(current_user: dict = Depends(verify_admin)):
    categories = db.request("GET", "categories")
    return categories

@app.post("/api/admin/categories")
def create_category(req: CategoryInput, current_user: dict = Depends(verify_admin)):
    payload = {
        "name": req.name,
        "description": req.description
    }
    new_cats = db.request("POST", "categories", body=payload, prefer="return=representation")
    if not new_cats:
        raise HTTPException(status_code=500, detail="Failed to create category.")
    invalidate_menu_cache()
    return {
        "message": "Category created successfully!",
        "category": new_cats[0]
    }

@app.patch("/api/admin/categories/{cat_id}")
def update_category(cat_id: str, req: CategoryInput, current_user: dict = Depends(verify_admin)):
    existing = db.request("GET", "categories", params={"id": f"eq.{cat_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found.")
    payload = {
        "name": req.name,
        "description": req.description
    }
    updated = db.request("PATCH", "categories", params={"id": f"eq.{cat_id}"}, body=payload, prefer="return=representation")
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update category.")
    invalidate_menu_cache()
    return {
        "message": "Category updated successfully.",
        "category": updated[0]
    }

@app.delete("/api/admin/categories/{cat_id}")
def delete_category(cat_id: str, current_user: dict = Depends(verify_admin)):
    db.request("DELETE", "menu_items", params={"category_id": f"eq.{cat_id}"})
    db.request("DELETE", "categories", params={"id": f"eq.{cat_id}"})
    invalidate_menu_cache()
    return {"message": "Category and all its products deleted successfully."}

@app.get("/api/admin/menu")
def get_admin_menu(current_user: dict = Depends(verify_admin)):
    global ADMIN_MENU_CACHE
    if ADMIN_MENU_CACHE is not None:
        return ADMIN_MENU_CACHE
        
    categories, menu_items, reviews = fetch_parallel(["categories", "menu_items", "reviews"])
    
    reviews_map = {}
    for r in reviews:
        item_id = r.get("menu_item_id")
        rating_val = r.get("rating")
        if item_id and rating_val is not None:
            if item_id not in reviews_map:
                reviews_map[item_id] = []
            reviews_map[item_id].append(float(rating_val))
            
    result = []
    for cat in categories:
        items = [preprocess_item(dict(item), reviews_map) for item in menu_items if item["category_id"] == cat["id"]]
        result.append({
            "category": cat["name"],
            "description": cat["description"],
            "items": items,
            "id": cat["id"]
        })
    ADMIN_MENU_CACHE = result
    return result

# Admin Users Intelligence
@app.get("/api/admin/users")
def get_admin_users(current_user: dict = Depends(verify_admin)):
    from datetime import timezone, timedelta
    
    # Calculate cutoff before generating task list
    cutoff_dt = datetime.now(timezone.utc) - timedelta(minutes=2)
    cutoff = cutoff_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"  # e.g. 2026-07-08T17:10:00.000Z

    tasks = [
        "users",
        "orders",
        "reviews",
        "menu_items",
        "user_preferences",
        ("user_activity_logs", {
            "created_at": f"gte.{cutoff}",
            "order": "created_at.desc"
        })
    ]

    # Fetch all data concurrently
    users, orders, reviews, menu_items, prefs, logs = fetch_parallel(tasks)
    
    users = users or []
    orders = orders or []
    reviews = reviews or []
    menu_items = menu_items or []
    prefs = prefs or []
    logs = logs or []

    menu_map = {m["id"]: m for m in menu_items}
    pref_map = {p["user_id"]: p for p in prefs}

    # Build per-user orders dict
    user_orders = {}
    for o in orders:
        uid = o.get("user_id")
        if uid:
            user_orders.setdefault(uid, []).append(o)

    # Build per-user reviews dict
    user_reviews = {}
    for r in reviews:
        uid = r.get("user_id")
        if uid:
            item_name = menu_map.get(r.get("menu_item_id"), {}).get("name", "Unknown Item")
            r["item_name"] = item_name
            user_reviews.setdefault(uid, []).append(r)

    # Determine online status — user is online if they pinged within the last 55 seconds
    now_utc = datetime.now(timezone.utc)
    last_active_map = {}
    for log in logs:
        uid = log.get("user_id")
        created_at = log.get("created_at", "")
        if uid and created_at:
            try:
                # Handle both 'Z' suffix and offset-aware formats
                ts_str = created_at.strip()
                if ts_str.endswith("Z"):
                    ts_str = ts_str[:-1] + "+00:00"
                ts = datetime.fromisoformat(ts_str)
                # Make timezone-aware if naive (assume UTC)
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                existing = last_active_map.get(uid)
                if not existing or ts > existing:
                    last_active_map[uid] = ts
            except Exception as ex:
                print(f"Timestamp parse error for {created_at!r}: {ex}")

    result = []
    for u in users:
        if u.get("role") == "admin":
            continue  # skip admin account from the list
        uid = u["id"]
        u_orders = user_orders.get(uid, [])
        u_reviews = user_reviews.get(uid, [])
        u_prefs = pref_map.get(uid, {})

        total_spent = sum(float(o.get("total_amount", 0)) for o in u_orders if o.get("status") != "cancelled")
        avg_rating = round(sum(r["rating"] for r in u_reviews) / len(u_reviews), 2) if u_reviews else None

        # Determine online/offline status using memory presence override with db fallback
        last_active = last_active_map.get(uid)
        is_online = False
        last_seen = None
        
        if uid in USER_PRESENCE_OVERRIDE:
            is_online = USER_PRESENCE_OVERRIDE[uid]
            if is_online and last_active:
                last_seen = last_active.isoformat()
        else:
            if last_active:
                diff_seconds = (now_utc - last_active).total_seconds()
                is_online = diff_seconds <= 55  # 55s = 2 missed heartbeats
                last_seen = last_active.isoformat()

        result.append({
            "id": uid,
            "name": u.get("name") or "Anonymous",
            "email": u.get("email", ""),
            "mobile": u.get("mobile", ""),
            "role": u.get("role", "customer"),
            "created_at": u.get("created_at", ""),
            "is_online": is_online,
            "last_seen": last_seen,
            "total_orders": len(u_orders),
            "total_spent": round(total_spent, 2),
            "avg_rating_given": avg_rating,
            "reviews": u_reviews,
            "orders": u_orders,
            "preferences": u_prefs
        })

    return {"users": result, "total": len(result)}

# Admin Analytics (with realistic mock data)
@app.get("/api/admin/analytics")
def get_analytics(current_user: dict = Depends(verify_admin)):
    # Fetch analytics data concurrently
    menu_items, logs = fetch_parallel(["menu_items", "user_activity_logs"])
    menu_items = menu_items or []
    logs = logs or []

    view_counts = {}
    search_counts = {}
    hourly_counts = {}

    for log in logs:
        activity_type = log.get("activity_type", "")
        target_id = log.get("target_id")
        search_query = log.get("search_query", "")
        created_at = log.get("created_at", "")

        if activity_type == "view" and target_id:
            view_counts[target_id] = view_counts.get(target_id, 0) + 1

        if activity_type == "search" and search_query:
            sq = search_query.strip().lower()
            if sq:
                search_counts[sq] = search_counts.get(sq, 0) + 1

        if created_at:
            try:
                normalized_time = created_at.strip()
                if "t" in normalized_time.lower():
                    hour = int(normalized_time.lower().split("t")[1].split(":")[0])
                    hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
                elif " " in normalized_time:
                    hour = int(normalized_time.split(" ")[1].split(":")[0])
                    hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
            except Exception:
                pass

    item_map = {item["id"]: item for item in menu_items}

    top_viewed_items = []
    top_viewed_ids = sorted(view_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    for item_id, count in top_viewed_ids:
        item = item_map.get(item_id)
        if item:
            top_viewed_items.append({
                "id": item_id,
                "name": item.get("name", "Unknown"),
                "views": count
            })

    top_searched_items = sorted(search_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    top_searched_items = [{"query": q, "count": c} for q, c in top_searched_items]

    activity_by_hour = [{"hour": h, "count": c} for h, c in sorted(hourly_counts.items())]

    total_views = sum(view_counts.values())

    demand_alerts = []
    
    # Pre-calculate category views
    category_views = {}
    for item_id, views in view_counts.items():
        item = item_map.get(item_id)
        if item:
            cat_name = item.get("category", "General")
            category_views[cat_name] = category_views.get(cat_name, 0) + views

    # 1. Unmet Demand (Searches that do not match any menu item name)
    unmet_demand_items = []
    for sq, count in sorted(search_counts.items(), key=lambda x: x[1], reverse=True):
        matched = False
        for item in menu_items:
            item_name = item["name"].lower()
            if sq in item_name or item_name in sq:
                matched = True
                break
        if not matched:
            unmet_demand_items.append((sq, count))
            
    for query, count in unmet_demand_items[:2]:
        demand_alerts.append(f"⚠️ High Unmet Demand: Customers searched for '{query}' {count} times, but it is not in your menu catalog. Consider adding it to satisfy demand.")

    # 2. Critical Stock-to-Demand Deficit (Out of Stock items with active views/searches)
    out_of_stock_deficits = []
    for item in menu_items:
        if item.get("availability_status") == "out_of_stock":
            item_id = item["id"]
            views = view_counts.get(item_id, 0)
            searches = 0
            for sq, count in search_counts.items():
                if sq in item["name"].lower() or item["name"].lower() in sq:
                    searches += count
            if views > 0 or searches > 0:
                out_of_stock_deficits.append((item["name"], views, searches))
                
    for item_name, views, searches in sorted(out_of_stock_deficits, key=lambda x: x[1] + x[2], reverse=True)[:2]:
        demand_alerts.append(f"🚨 Critical Restock Alert: '{item_name}' is OUT OF STOCK but has received {views} views and {searches} searches. Restock immediately to capture lost sales!")

    # 3. High Demand Trending (Available items with high views)
    available_trends = []
    for item in menu_items:
        if item.get("availability_status") == "available":
            views = view_counts.get(item["id"], 0)
            if views > 0:
                available_trends.append((item["name"], views))
                
    for item_name, views in sorted(available_trends, key=lambda x: x[1], reverse=True)[:1]:
        demand_alerts.append(f"🔥 High Demand: '{item_name}' is your top-performing item with {views} views. Feature it or run a promo to maximize revenue!")

    # 4. Category Trend
    if category_views:
        top_cat, cat_v = max(category_views.items(), key=lambda x: x[1])
        demand_alerts.append(f"📈 Category Trend: '{top_cat}' represents the highest customer interest with {cat_v} views this week.")

    # 5. Peak Hour activity alert
    if hourly_counts:
        peak_hour, peak_count = max(hourly_counts.items(), key=lambda x: x[1])
        ampm = "PM" if peak_hour >= 12 else "AM"
        display_hour = peak_hour if peak_hour <= 12 else peak_hour - 12
        if display_hour == 0:
            display_hour = 12
        demand_alerts.append(f"💡 Peak Hour Prep: Traffic peaks between {display_hour}:00 {ampm} and {display_hour + 1}:00 {ampm} with {peak_count} actions. Plan staffing accordingly.")

    # Day-zero setup guidelines if no activity yet
    if not demand_alerts:
        demand_alerts.append("✨ System Ready: AI BI analysis is active. Customer actions will generate demand alerts in real-time.")
        demand_alerts.append(f"💡 Catalog Insight: You have {len(menu_items)} items in your catalog. Ensure all items are categorized properly.")

    # 4. Review Sentiment calculation
    reviews = db.request("GET", "reviews")
    total_reviews = len(reviews)
    pos_c = 0
    neu_c = 0
    neg_c = 0
    pos_items = []
    neg_items = []

    for r in reviews:
        try:
            rating_val = int(float(r.get("rating", 5)))
        except (ValueError, TypeError):
            rating_val = 5
        item_id = r.get("menu_item_id")
        item_name = item_map.get(item_id, {}).get("name", "") if item_id else ""
        
        if rating_val >= 4:
            pos_c += 1
            if item_name and item_name not in pos_items:
                pos_items.append(item_name)
        elif rating_val == 3:
            neu_c += 1
        else:
            neg_c += 1
            if item_name and item_name not in neg_items:
                neg_items.append(item_name)

    if total_reviews > 0:
        pct_pos = int((pos_c / total_reviews) * 100)
        pct_neu = int((neu_c / total_reviews) * 100)
        pct_neg = max(0, 100 - pct_pos - pct_neu)
    else:
        pct_pos = 0
        pct_neu = 0
        pct_neg = 0

    if total_reviews == 0:
        sentiment_summary = "No customer reviews submitted yet. Submit a review with a comment to see sentiment analysis."
    else:
        pos_str = f"\"{', '.join(pos_items[:2])}\"" if pos_items else "none yet"
        neg_str = f"\"{', '.join(neg_items[:2])}\"" if neg_items else "none yet"
        sentiment_summary = f"Sentiment is analyzed from submitted customer reviews. Positive highlights: {pos_str}. Negative highlights: {neg_str}."

    sentiment_stats = {
        "positive": pct_pos,
        "neutral": pct_neu,
        "negative": pct_neg,
        "summary": sentiment_summary,
        "total_reviews": total_reviews
    }

    return {
        "total_views": total_views,
        "top_viewed_items": top_viewed_items,
        "top_searched_items": top_searched_items,
        "activity_by_hour": activity_by_hour,
        "demand_alerts": demand_alerts[:5],
        "sentiment_stats": sentiment_stats
    }

# Track user analytics event
@app.post("/api/analytics/track")
def track_analytics(req: AnalyticsTrackInput):
    payload = {
        "user_id": req.user_id,
        "activity_type": req.action_type,
        "target_id": req.target_id,
        "search_query": req.search_query
    }
    # Remove None values
    payload = {k: v for k, v in payload.items() if v is not None}
    db.request("POST", "user_activity_logs", body=payload)
    return {"message": "Event tracked successfully."}

# Post a review
@app.post("/api/reviews")
def post_review(req: ReviewInput):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")
    payload = {
        "user_id": req.user_id,
        "menu_item_id": req.menu_item_id,
        "rating": req.rating,
        "review_text": req.comment
    }
    payload = {k: v for k, v in payload.items() if v is not None}
    new_reviews = db.request("POST", "reviews", body=payload, prefer="return=representation")
    if not new_reviews:
        raise HTTPException(status_code=500, detail="Failed to submit review.")
    invalidate_menu_cache()
        
    users = db.request("GET", "users", params={"id": f"eq.{req.user_id}"})
    user_name = users[0].get("name") if users else "Anonymous"
    
    return {
        "message": "Review submitted successfully!",
        "review": {
            "id": new_reviews[0]["id"],
            "user_id": new_reviews[0]["user_id"],
            "menu_item_id": new_reviews[0]["menu_item_id"],
            "rating": new_reviews[0]["rating"],
            "comment": new_reviews[0].get("review_text") or "",
            "reviewer_name": user_name,
            "created_at": new_reviews[0].get("created_at")
        }
    }

# Get reviews for a menu item
@app.get("/api/reviews/{menu_item_id}")
def get_reviews(menu_item_id: str):
    reviews = db.request("GET", "reviews", params={"menu_item_id": f"eq.{menu_item_id}"})
    avg_rating = None
    if reviews:
        try:
            users = db.request("GET", "users")
            user_names = {u["id"]: u.get("name") or "Anonymous" for u in users}
        except Exception:
            user_names = {}
        for r in reviews:
            r["reviewer_name"] = user_names.get(r.get("user_id"), "Anonymous")
            r["comment"] = r.get("review_text") or ""
        avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 2)
    return {
        "menu_item_id": menu_item_id,
        "total_reviews": len(reviews),
        "average_rating": avg_rating,
        "reviews": reviews
    }

DEFAULT_OFFERS = {
    "1": {
        "dayName": "Monday",
        "title": "Buy 3 Milkshakes, Get 1 Free",
        "subtitle": "Satisfy your cravings with our creamy premium milkshakes! 🥤",
        "imageUrl": "/offers/monday_offer.png",
        "isActive": True
    },
    "2": {
        "dayName": "Tuesday",
        "title": "Buy 1 Tea, Get 1 Biscuit Free",
        "subtitle": "Start your day with hot brewing chai & snacks ☕",
        "imageUrl": "/offers/tuesday_offer.png",
        "isActive": True
    },
    "3": {
        "dayName": "Wednesday",
        "title": "Non-Veg Snacks bill above 200, Get 1 Free Campa Cola",
        "subtitle": "Spicy chicken rolls or nuggets paired with a refreshing cola! 🍗🥤",
        "imageUrl": "/offers/wednesday_offer.png",
        "isActive": True
    },
    "4": {
        "dayName": "Thursday",
        "title": "Buy 3 Scoops of Ice Cream, Get 1 Scoop Free",
        "subtitle": "Beat the afternoon heat with cool delicious scoops! 🍨",
        "imageUrl": "/offers/thursday_offer.png",
        "isActive": True
    },
    "5": {
        "dayName": "Friday",
        "title": "10% Off on Milkshakes",
        "subtitle": "Friday evening milkshake party with custom toppings! 🎉",
        "imageUrl": "/offers/friday_offer.png",
        "isActive": True
    },
    "6": {
        "dayName": "Saturday",
        "title": "Veg Snacks bill above 200, Get 1 Free Campa Cola",
        "subtitle": "Crispy paneer or veg momos served with hot sauces & cold drink! 🥟",
        "imageUrl": "/offers/saturday_offer.png",
        "isActive": True
    },
    "0": {
        "dayName": "Sunday",
        "title": "Savour the Flavor of Kapi Adda",
        "subtitle": "Gather with friends & enjoy premium brews and snacks ☕",
        "imageUrl": "/offers/default_branding.png",
        "isActive": False
    }
}

@app.post("/api/admin/offers")
def save_offers(body: dict, current_user: dict = Depends(verify_admin)):
    try:
        with open("offers.json", "w", encoding="utf-8") as f:
            json.dump(body, f, indent=4, ensure_ascii=False)
        return {"message": "Offers updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/offers")
def get_offers():
    if os.path.exists("offers.json"):
        try:
            with open("offers.json", "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_OFFERS

# Weather-based recommendations
@app.get("/api/weather/recommendations")
def get_weather_recommendations(condition: str = "clear"):
    condition = condition.lower().strip()
    menu_items = db.request("GET", "menu_items")
    categories = db.request("GET", "categories")

    cat_name_to_id = {c["name"].lower(): c["id"] for c in categories}

    weather_category_map = {
        "hot": ["coolers", "fresh juices", "ice cream"],
        "rainy": ["tea/coffee", "snacks"],
        "cold": ["tea/coffee"],
        "clear": []  # Will return featured items
    }

    target_cats = weather_category_map.get(condition, [])

    if condition == "clear" or not target_cats:
        # Return featured items (top rated)
        available = [i for i in menu_items if i.get("availability_status") != "out_of_stock"]
        result = sorted(available, key=lambda x: float(x.get("rating") or 0), reverse=True)[:8]
    else:
        target_ids = [cat_name_to_id[c] for c in target_cats if c in cat_name_to_id]
        result = [i for i in menu_items if i.get("category_id") in target_ids]

    return {
        "condition": condition,
        "message": {
            "hot": "Stay cool with our refreshing drinks and frozen treats! ☀️",
            "rainy": "Warm up with cozy drinks and crispy snacks! 🌧️",
            "cold": "Beat the chill with hot beverages! 🌨️",
            "clear": "Enjoy our top-rated items today! 🌤️"
        }.get(condition, "Here are our recommendations for you!"),
        "recommendations": result
    }

# --- Combo Generation Helper ---
def generate_combos_logic(budget: float, members: int, taste: str, new_only: bool, mood: str, flavor: str, processed_items: list, is_shared: bool = False):
    # Select intro text based on mood
    mood_intros = {
        "happy": "Here is an energetic feast to match your happy vibe! 🤩✨ Let's celebrate your day with these combos:",
        "excited": "Woohoo! 🤩 Here is an exciting spread of treats to match your high energy! Let's dig in:",
        "sad": "Aww, sending you warm hugs! 🧸 Here is a comforting, delicious meal combination to cheer you up and recharge your energy:",
        "tired": "Rough day? 😴 Here is a hearty and soothing meal combo to help you relax, unwind, and recharge:",
        "calm": "Perfect. 😌 Here is a smooth, balanced combo to match your peaceful and calm state of mind:",
        "angry": "Take a deep breath! 🌶️ Here is some super satisfying comfort food to spice up your mood and cool you down:",
        "confused": "Too many choices? 😕 No worries, here is our most reliable, stress-free combo to make things easy for you:",
        "scared": "You're safe with us! 🛡️ Here is a familiar, comforting combo of our absolute favorites to make you feel right at home:"
    }
    intro = mood_intros.get(mood, "Here are your custom combo recommendations based on your preferences:")
    
    # Helper to check if item is veg
    def is_item_veg(item):
        name_lower = item["name"].lower()
        non_veg_keywords = ["chicken", "egg", "prawn", "fish", "meat", "mutton", "crab"]
        if item.get("is_veg") is False:
            return False
        if item.get("is_veg") is True:
            return True
        if any(kw in name_lower for kw in non_veg_keywords):
            return False
        return True
        
    # Filter candidates based on availability strictly (never output unavailable list items)
    candidates = [
        c for c in processed_items 
        if c.get("availability_status", "").lower() not in ["out_of_stock", "out of stock", "unavailable"]
    ]
    
    # Filter candidates based on taste
    if taste == "veg":
        candidates = [c for c in candidates if is_item_veg(c)]
    elif taste == "non-veg":
        candidates = [c for c in candidates if not is_item_veg(c)]
    elif taste == "sweet":
        candidates = [c for c in candidates if "cake" in c["name"].lower() or "sweet" in c["name"].lower() or "shake" in c["name"].lower() or "slice" in c["name"].lower()]
    elif taste == "drink":
        candidates = [c for c in candidates if any(kw in c["name"].lower() for kw in ["tea", "coffee", "juice", "mojito", "milk", "shake", "malt", "boost", "horlicks", "chai", "cooler", "drink"])]
        
    # Sort/filter candidates based on flavor profile
    if flavor == "spicy":
        spicy_terms = ["spicy", "chilli", "pepper", "masala", "tikka", "crispy", "snack", "puff", "momo", "roll", "popcorn", "lollipop", "fries", "nuggets"]
        def get_spicy_score(item):
            name_desc = (item["name"] + " " + item.get("description", "")).lower()
            if any(kw in name_desc for kw in ["cake", "sweet", "plum", "chocolate", "shake", "biscuit"]):
                return -100 # Avoid sweets/desserts in a spicy combo
            score = sum(3 for kw in spicy_terms if kw in name_desc)
            return score
        candidates = sorted(candidates, key=get_spicy_score, reverse=True)
        candidates = [c for c in candidates if get_spicy_score(c) >= -50]
    elif flavor == "mild":
        def get_mild_score(item):
            name_desc = (item["name"] + " " + item.get("description", "")).lower()
            if any(kw in name_desc for kw in ["spicy", "chilli", "pepper", "spiced"]):
                return -50
            score = 0
            if any(kw in name_desc for kw in ["cake", "sweet", "shake", "milk", "tea", "coffee", "juice", "mojito", "cookie"]):
                score += 5
            return score
        candidates = sorted(candidates, key=get_mild_score, reverse=True)
        candidates = [c for c in candidates if get_mild_score(c) >= -20]
        
    # Sort candidates based on freshness/crowd favorites
    if new_only:
        candidates = sorted(candidates, key=lambda x: x.get("rating_count", 0))
    else:
        candidates = sorted(candidates, key=lambda x: float(x.get("rating") or 0), reverse=True)
        
    # Categorize candidates
    snacks = [c for c in candidates if any(kw in c["name"].lower() for kw in ["puff", "momo", "samosa", "roll", "lollipop", "fries", "nuggets", "popcorn", "snack"])]
    drinks = [c for c in candidates if any(kw in c["name"].lower() for kw in ["tea", "coffee", "juice", "mojito", "milk", "shake", "malt", "boost", "horlicks", "chai", "cooler", "drink"])]
    desserts = [c for c in candidates if any(kw in c["name"].lower() for kw in ["cake", "slice", "sweet", "dessert", "cookie"])]
    
    # Fallback categories to ensure combinations can always be formed
    if not snacks:
        snacks = [c for c in candidates if c not in drinks and c not in desserts]
    if not drinks:
        drinks = [c for c in candidates if c not in snacks and c not in desserts]
    if not desserts:
        desserts = [c for c in candidates if c not in snacks and c not in drinks]

    match_budget = budget if (is_shared or members <= 1) else (budget / members)
    combos = []
    
    # Combo 1: Snack + Drink (Classic pair)
    combo1_candidates = []
    for s in snacks:
        for d in drinks:
            total = s["price"] + d["price"]
            if total <= match_budget:
                combo1_candidates.append({
                    "name": "Classic Duo Combo ☕🥟",
                    "items": [s, d],
                    "total": total
                })
    combo1_candidates = sorted(combo1_candidates, key=lambda x: x["total"], reverse=True)
    if combo1_candidates:
        combos.append(combo1_candidates[0])
        
    # Combo 2: Double Snack Feast (2 distinct snacking items)
    combo2_candidates = []
    for s1 in snacks:
        for s2 in snacks:
            if s1["id"] != s2["id"]:
                total = s1["price"] + s2["price"]
                if total <= match_budget:
                    combo2_candidates.append({
                        "name": "Double Snack Feast 🥟🍟",
                        "items": [s1, s2],
                        "total": total
                    })
    if not combo2_candidates:
        for s in snacks:
            for des in desserts:
                total = s["price"] + des["price"]
                if total <= match_budget:
                    combo2_candidates.append({
                        "name": "Sweet & Savory Duo 🥟🍰",
                        "items": [s, des],
                        "total": total
                    })
    combo2_candidates = sorted(combo2_candidates, key=lambda x: x["total"], reverse=True)
    if combo2_candidates:
        combos.append(combo2_candidates[0])
        
    # Combo 3: Snack + Dessert + Drink (Grand Combo)
    combo3_candidates = []
    for s in snacks:
        for des in desserts:
            for d in drinks:
                if s["id"] != des["id"] and s["id"] != d["id"] and des["id"] != d["id"]:
                    total = s["price"] + des["price"] + d["price"]
                    if total <= match_budget:
                        combo3_candidates.append({
                            "name": "Grand Treat Combo 🍰🥟☕",
                            "items": [s, des, d],
                            "total": total
                        })
    combo3_candidates = sorted(combo3_candidates, key=lambda x: x["total"], reverse=True)
    if combo3_candidates:
        combos.append(combo3_candidates[0])
        
    # Greedy backup
    if not combos:
        greedy_items = []
        current_sum = 0
        sorted_candidates = sorted(candidates, key=lambda x: x["price"], reverse=True)
        for c in sorted_candidates:
            if current_sum + c["price"] <= match_budget:
                greedy_items.append(c)
                current_sum += c["price"]
                if len(greedy_items) == 3:
                    break
        if greedy_items:
            combos.append({
                "name": "Custom Budget Pack 🍽️",
                "items": greedy_items,
                "total": current_sum
            })
            
    if not combos:
        reply = f"I scanned our menu but couldn't find any combinations that fit under your ₹{match_budget:.0f} budget. Try entering a slightly higher budget or looking at our individual budget options (e.g. 'items under ₹40')!"
        return {"reply": reply, "items": []}
        
    # Format reply text
    if is_shared:
        reply = f"🎉 **Meal Plan Generated (Total Budget: ₹{budget:.0f})** 🎉\n\nI have created a **shared combo** for your group of {members} to split under the total budget:\n\n"
    elif members > 1:
        reply = f"🎉 **Meal Plan Generated (Total Budget: ₹{budget:.0f})** 🎉\n\n{intro}\n\nI have divided the budget equally: **₹{match_budget:.0f} per person** for {members} people:\n\n"
    else:
        reply = f"🎉 **Meal Plan Generated (Budget: ₹{budget:.0f})** 🎉\n\n{intro}\n\n"
        
    reply += "| Combo Name | Items Included | Total | Change Left |\n"
    reply += "| :--- | :--- | :--- | :--- |\n"
    
    all_items_to_return = []
    for combo in combos:
        if not is_shared and members > 1:
            item_counts = {}
            for item in combo["items"]:
                item_counts[item["id"]] = item_counts.get(item["id"], 0) + 1
                
            items_parts = []
            for item_id, qty in item_counts.items():
                item = next(i for i in combo["items"] if i["id"] == item_id)
                scaled_qty = qty * members
                items_parts.append(f"{scaled_qty} x {item['name']} (₹{item['price']:.0f} each)")
                
            items_str = " + ".join(items_parts)
            total_cost = combo["total"] * members
            change_left = budget - total_cost
            combo_name = f"{combo['name']} (for {members} people)"
        else:
            items_str = " + ".join([f"{i['name']} (₹{i['price']:.0f})" for i in combo["items"]])
            total_cost = combo["total"]
            change_left = budget - total_cost
            combo_name = combo["name"]
            
        reply += f"| **{combo_name}** | {items_str} | **₹{total_cost:.0f}** | ₹{change_left:.0f} |\n"
        for i in combo["items"]:
            if i not in all_items_to_return:
                all_items_to_return.append(i)
                
    reply += "\nI've loaded the product cards for these items below. Just click on any card to view its details or add it to your cart! 🛵✨"
    return {
        "reply": reply,
        "items": all_items_to_return[:5]
    }

# --- Chatbot AI Logic ---
def _chat_assistant_logic(msg: str, user_id: Optional[str], session_id: Optional[str] = None):
    raw_categories = db.request("GET", "categories")
    categories = [c for c in raw_categories if not (c.get("description") or "").endswith("[HIDDEN]")]
    visible_cat_ids = {c["id"] for c in categories}
    menu_items = [item for item in db.request("GET", "menu_items") if item.get("category_id") in visible_cat_ids]
    
    # Preprocess all menu items to get real ratings and reviews
    reviews_map = get_all_reviews_map()
    processed_items = [preprocess_item(dict(item), reviews_map) for item in menu_items]
    
    # Log search activity
    if user_id:
        db.request("POST", "user_activity_logs", body={
            "user_id": user_id,
            "activity_type": "search",
            "search_query": msg
        })

    msg_clean = msg.lower().strip()

    session_key = session_id or user_id or "default"
    
    if "exit plan" in msg_clean or "exit planner" in msg_clean:
        plan_mode_store.pop(session_key, None)
        return {
            "reply": "Switching back to **Explorer Mode** 🧭. How can I help you find the perfect brew or snack today? ☕️",
            "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]
        }
    
    # 0. PLAN MODE STATE MACHINE
    if "plan mode" in msg_clean or "help me plan" in msg_clean or "plan my meal" in msg_clean or "planner" in msg_clean or msg_clean == "plan":
        plan_mode_store[session_key] = {"step": 1}
        reply = "Welcome to **Plan Mode**! 📋 Let's build your perfect custom meal combination under budget.\n\n**Step 1 of 6**: What is your mood now?"
        return {
            "reply": reply,
            "options": ["😀 Happy", "😢 Sad", "😠 Angry", "😨 Scared", "😌 Calm", "😴 Tired", "😕 Confused", "🤩 Excited"],
            "items": []
        }
        
    if session_key in plan_mode_store:
        state = plan_mode_store[session_key]
        step = state.get("step", 1)
        
        # Step 1: Mood selection
        if step == 1:
            mood_input = msg_clean
            mood_clean = re.sub(r'[^\w\s]', '', mood_input).strip().lower()
            state["mood"] = mood_clean
            state["step"] = 2
            reply = f"Got it, feeling **{mood_input}**! 🌟\n\n**Step 2 of 6**: What type of food are you in the mood for?"
            return {"reply": reply, "options": ["Veg 🌿", "Non-Veg 🍗", "Sweet 🍰", "Drink ☕", "Anything 🍽️"], "items": []}
            
        # Step 2: Taste selection
        elif step == 2:
            taste_input = msg_clean
            taste = "anything"
            if "non" in taste_input:
                taste = "non-veg"
            elif "veg" in taste_input:
                taste = "veg"
            elif "sweet" in taste_input or "cake" in taste_input:
                taste = "sweet"
            elif "drink" in taste_input or "juice" in taste_input or "tea" in taste_input or "coffee" in taste_input:
                taste = "drink"
                
            state["taste"] = taste
            state["step"] = 3
            reply = f"Got it, **{taste.capitalize()}** options! 🍽️\n\n**Step 3 of 6**: Select your flavor profile preference:"
            return {"reply": reply, "options": ["Spicy 🌶️", "Mild / Sweet 🍯", "No Preference 🍽️"], "items": []}
            
        # Step 3: Flavor profile selection
        elif step == 3:
            flavor_input = msg_clean
            flavor = "no_preference"
            if "spicy" in flavor_input:
                flavor = "spicy"
            elif "mild" in flavor_input or "sweet" in flavor_input:
                flavor = "mild"
                
            state["flavor"] = flavor
            state["step"] = 4
            reply = f"Got it, **{flavor_input}** preference! 🌟\n\n**Step 4 of 6**: Would you like to try something **New** (our latest unrated products) or stick to our **Crowd Favorites** (popular highest-rated items)?"
            return {"reply": reply, "options": ["Crowd Favorites 🌟", "New Products ✨"], "items": []}
            
        # Step 4: New vs Popular selection
        elif step == 4:
            new_input = msg_clean
            new_only = False
            if "new" in new_input or "fresh" in new_input or "unrated" in new_input:
                new_only = True
                
            state["new_only"] = new_only
            state["step"] = 5
            reply = "Awesome! 🌟\n\n**Step 5 of 6**: How many members are in your party?"
            return {"reply": reply, "options": ["1 Person 👤", "2 People 👥", "3 People 👥✨", "4+ People 🌟"], "items": []}
            
        # Step 5: Party size selection
        elif step == 5:
            party_input = msg_clean
            party_match = re.search(r'\d+', party_input)
            members = 1
            if party_match:
                members = int(party_match.group(0))
            elif "one" in party_input:
                members = 1
            elif "two" in party_input or "couple" in party_input:
                members = 2
            elif "three" in party_input:
                members = 3
            elif "four" in party_input or "group" in party_input:
                members = 4
                
            state["members"] = members
            state["step"] = 6
            reply = f"Got it, ordering for **{members}** people! 👥\n\n**Step 6 of 6**: Finally, how much money do you have to spend today? 💰 (Please enter your budget in rupees in the input box below)"
            return {"reply": reply, "options": [], "items": []}
            
        # Step 6: Budget entry & combo generation
        elif step == 6:
            budget_match = re.search(r'\d+', msg_clean)
            if not budget_match:
                return {"reply": "Oops! Please enter a valid number for your budget (e.g. 150).", "items": []}
            budget = float(budget_match.group(0))
            
            taste = state.get("taste", "anything")
            new_only = state.get("new_only", False)
            mood = state.get("mood", "calm")
            flavor = state.get("flavor", "no_preference")
            members = int(state.get("members", 1))
            
            # Find cheapest available item to check if budget can be divided
            available_candidates = [
                c for c in processed_items 
                if c.get("availability_status", "").lower() not in ["out_of_stock", "out of stock", "unavailable"]
            ]
            cheapest_price = min([c["price"] for c in available_candidates], default=20.0)
            
            if members > 1 and (budget / members) < cheapest_price:
                # Store temp variables for shared combo confirmation prompt
                state["step"] = "shared_combo_prompt"
                state["temp_budget"] = budget
                state["temp_members"] = members
                
                reply = (
                    f"Oops! Your budget of ₹{budget:.0f} is too low to divide equally among {members} people "
                    f"(₹{budget/members:.1f} per person is less than our cheapest item of ₹{cheapest_price:.0f}). 😞\n\n"
                    f"Would you like to do it in another way and find a shared combo for the whole group instead?"
                )
                return {
                    "reply": reply,
                    "options": ["Yes, find a shared combo! 🤝", "No, let me change budget/party size ❌"],
                    "items": []
                }
                
            # Clear state once completed successfully
            plan_mode_store.pop(session_key, None)
            
            # Generate combos divided equally per person
            return generate_combos_logic(budget, members, taste, new_only, mood, flavor, processed_items, is_shared=False)
            
        # Step: Shared combo prompt handling
        elif step == "shared_combo_prompt":
            choice = msg_clean.lower()
            if "yes" in choice or "shared" in choice:
                budget = float(state.get("temp_budget", 100))
                members = int(state.get("temp_members", 1))
                taste = state.get("taste", "anything")
                new_only = state.get("new_only", False)
                mood = state.get("mood", "calm")
                flavor = state.get("flavor", "no_preference")
                
                # Clear state
                plan_mode_store.pop(session_key, None)
                
                # Generate shared combo for total budget
                return generate_combos_logic(budget, members, taste, new_only, mood, flavor, processed_items, is_shared=True)
            else:
                # Go back to step 6
                state["step"] = 6
                reply = "No problem! ❌ Please enter a new higher budget in rupees to divide among your group (e.g. 250):"
                return {"reply": reply, "options": [], "items": []}

    # Load active offers from offers.json or DEFAULT_OFFERS
    offers = DEFAULT_OFFERS
    if os.path.exists("offers.json"):
        try:
            with open("offers.json", "r", encoding="utf-8") as f:
                offers = json.load(f)
        except Exception:
            pass

    # 1. GREETINGS & PERSONALIZATION
    if msg_clean in ["hi", "hello", "hey", "greetings", "good morning", "good evening", "yo", "hi kapi", "hello kapi"]:
        reply = "Hello there! 🛵 Kapi Adda AI here, your friendly food guide! I can share today's hot offers, check prices, details, and live reviews for anything on our menu. What are you craving today? ☕️"
        return {"reply": reply, "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]}

    # 0. Personalization (The "Usual")
    if "usual" in msg_clean or "order again" in msg_clean:
        if user_id:
            user_orders = db.request("GET", "orders", params={"user_id": f"eq.{user_id}"})
            if user_orders:
                order_ids = [o["id"] for o in user_orders]
                if order_ids:
                    order_items = db.request("GET", "order_items")
                    my_items = [oi for oi in order_items if oi["order_id"] in order_ids]
                    if my_items:
                        counts = {}
                        for oi in my_items:
                            counts[oi["menu_item_id"]] = counts.get(oi["menu_item_id"], 0) + oi["quantity"]
                        if counts:
                            most_freq_id = max(counts.items(), key=lambda x: x[1])[0]
                            usual_item = next((i for i in processed_items if i["id"] == most_freq_id), None)
                            if usual_item:
                                status = "available" if usual_item.get("availability_status") == "available" else "out of stock"
                                return {
                                    "reply": f"Ah, welcome back! Your favorite order seems to be **{usual_item['name']}**! It is currently **{status}** and priced at ₹{usual_item['price']}. Would you like to add it to your cart? ☕️🍪",
                                    "items": [usual_item]
                                }
    # 2. TODAY'S OFFER QUERY
    if any(k in msg_clean for k in ["offer", "today's offer", "discount", "coupon", "deal", "promo", "special today"]):
        day_code = str(datetime.now().isoweekday() % 7)
        today_offer = offers.get(day_code)
        if today_offer and today_offer.get("isActive"):
            reply = f"🎁 **Today's Special Offer ({today_offer.get('dayName')})**: \n\n**{today_offer.get('title')}**\n_{today_offer.get('subtitle')}_ \n\nThis deal is valid today only! What can I get started for you? ⚡"
            
            offer_title = today_offer.get("title", "").lower()
            offer_subtitle = today_offer.get("subtitle", "").lower()
            offer_text = offer_title + " " + offer_subtitle
            
            # Dynamic matching by extracting terms from title and subtitle
            is_non_veg_offer = "non-veg" in offer_text or "chicken" in offer_text or "egg" in offer_text
            
            # Extract potential item keywords
            keywords_to_check = ["chicken", "roll", "nugget", "cola", "campa", "tea", "chai", "coffee", "shake", "mojito", "samosa", "momo", "puff", "cake", "ice cream", "fries"]
            found_keywords = [kw for kw in keywords_to_check if kw in offer_text]
            
            # Helper to check if item is veg
            def is_veg_item(item):
                is_v = item.get("is_veg")
                if is_v is False or is_v == "false" or is_v == 0:
                    return False
                if is_v is True or is_v == "true" or is_v == 1:
                    return True
                name_lower = item["name"].lower()
                non_veg_keywords = ["chicken", "egg", "prawn", "fish", "meat", "mutton", "crab"]
                if any(kw in name_lower for kw in non_veg_keywords):
                    return False
                return True

            # Let's search menu items containing these keywords
            candidates = []
            for item in processed_items:
                item_name_lower = item["name"].lower()
                # If non-veg offer, prioritize non-veg items
                if is_non_veg_offer and is_veg_item(item):
                    continue
                
                # Check keyword match
                if any(kw in item_name_lower for kw in found_keywords):
                    candidates.append(item)
            
            # If no matches, fall back to simple category/keyword checks
            if not candidates:
                if "milkshake" in offer_title or "shake" in offer_title:
                    candidates = [i for i in processed_items if "shake" in i["name"].lower() or "smoothie" in i["name"].lower()]
                elif "tea" in offer_title or "chai" in offer_title:
                    candidates = [i for i in processed_items if "tea" in i["name"].lower() or "chai" in i["name"].lower()]
                elif "ice cream" in offer_title:
                    candidates = [i for i in processed_items if "scoop" in i["name"].lower() or "ice cream" in i["name"].lower()]
                elif "snack" in offer_title:
                    candidates = [i for i in processed_items if any(kw in i["name"].lower() for kw in ["puff", "roll", "momo", "samosa", "fries", "lollipop", "popcorn", "nuggets"])]
                
                # Filter candidates by non-veg if it is a non-veg offer
                if is_non_veg_offer:
                    candidates = [c for c in candidates if not is_veg_item(c)]
            
            # Filter candidates for in-stock
            matched_items = [c for c in candidates if c.get("availability_status") != "out_of_stock"]
            
            return {
                "reply": reply,
                "items": matched_items[:4] if matched_items else [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]
            }
        else:
            return {
                "reply": "We don't have a special discount banner running today, but our menu is filled with premium delicious snacks and fresh hot brews! What are you in the mood for? ☕🍪",
                "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]
            }

    # 3. SPECIFIC PRODUCT INQUIRY
    matched_product = None
    for item in processed_items:
        name_lower = item["name"].lower()
        if name_lower in msg_clean or (len(msg_clean) >= 4 and msg_clean in name_lower):
            matched_product = item
            break
            
    if matched_product:
        # Check stock availability first
        availability = matched_product.get("availability_status", "available")
        if availability == "out_of_stock":
            # Find in-stock alternatives in same category
            category_id = matched_product.get("category_id")
            category_name = "menu"
            for cat in categories:
                if cat["id"] == category_id:
                    category_name = cat["name"]
                    break
            
            alternatives = [i for i in processed_items if i["category_id"] == category_id and i.get("availability_status") != "out_of_stock" and i["id"] != matched_product["id"]]
            if not alternatives:
                alternatives = [i for i in processed_items if i.get("availability_status") != "out_of_stock" and i["id"] != matched_product["id"]]
                
            recommended_alternatives = sorted(alternatives, key=lambda x: float(x.get("rating") or 0), reverse=True)[:3]
            
            alt_names = " or ".join([f"**{i['name']}** (₹{i['price']})" for i in recommended_alternatives[:2]])
            reply = f"Oh, I'm so sorry! **{matched_product['name']}** is currently out of stock today due to high demand. 😔 "
            if recommended_alternatives:
                reply += f"But since you are looking in our **{category_name}** range, why not try our freshly made {alt_names} instead? They are absolutely delicious and ready to serve! I've placed cards for them below so you can open them instantly."
            else:
                reply += "Can you try exploring some of our other delicious drinks or hot snacks today?"
                
            return {
                "reply": reply,
                "items": recommended_alternatives
            }

        # Load reviews for this item
        try:
            reviews_res = db.request("GET", "reviews", params={"menu_item_id": f"eq.{matched_product['id']}"})
            reviews = [r.get("review_text") or r.get("comment") or "" for r in reviews_res if r.get("review_text") or r.get("comment")]
        except Exception:
            reviews = []

        rating_val = matched_product.get("rating", 0.0)
        rating_count = matched_product.get("rating_count", 0)
        pieces_str = f" ({matched_product['pieces']})" if matched_product.get("pieces") else ""
        
        reply = f"Ah, **{matched_product['name']}**!{pieces_str} Excellent choice! It's one of our popular items priced at **₹{matched_product['price']}**."
        
        if rating_count > 0:
            reply += f" It currently holds a rating of **{rating_val} ★** ({rating_count} review{'s' if rating_count != 1 else ''})."
            if reviews:
                snippet = random.choice(reviews)
                reply += f"\n\nHere is what our customers say: *\"{snippet}\"* 🌟"
        else:
            reply += "\n\nThis delicious treat hasn't received any customer ratings yet since it's fresh off our kitchen! 👨‍🍳 How about being the very first to try it and write a review? We guarantee it is absolutely delicious! 🌟"

        reply += "\n\nWould you like to add it to your order?"
            
        return {
            "reply": reply,
            "items": [matched_product]
        }

    # 3.5. GENERAL PRODUCT TYPE / KEYWORD SEARCH
    search_keywords = {
        "cake": ["cake", "slice"],
        "momo": ["momo"],
        "tea": ["tea", "chai"],
        "coffee": ["coffee"],
        "juice": ["juice"],
        "shake": ["shake", "smoothie"],
        "puff": ["puff"],
        "roll": ["roll"],
        "samosa": ["samosa"],
        "fries": ["fries"],
        "nugget": ["nugget", "popcorn", "lollipop"],
        "mojito": ["mojito", "cooler", "soda"],
        "milk": ["milk", "badam", "pista", "boost", "horlicks", "malt"]
    }
    
    matched_search_items = []
    matched_kws = []
    for user_kw, db_kws in search_keywords.items():
        if user_kw in msg_clean or (user_kw + "s") in msg_clean:
            matched_kws.append(user_kw)
            for item in processed_items:
                item_name_lower = item["name"].lower()
                if item.get("availability_status") != "out_of_stock":
                    if any(dkw in item_name_lower for dkw in db_kws):
                        if item not in matched_search_items:
                            matched_search_items.append(item)
                            
    if matched_search_items:
        matched_search_items = sorted(matched_search_items, key=lambda x: float(x.get("rating") or 0), reverse=True)
        kw_str = " & ".join([k.capitalize() for k in matched_kws])
        reply = f"Yes, we serve fresh and delicious **{kw_str}**! 🌟 Here are our top options available today. Click on any card below to view details or add it to your order!"
        return {
            "reply": reply,
            "items": matched_search_items[:4]
        }

    # 4. PRICE / BUDGET SEARCH
    price_match = re.search(r'(?:under|below|less than|within|rs\.?|₹)\s*(\d+)', msg_clean)
    if price_match:
        budget = float(price_match.group(1))
        filtered = [i for i in processed_items if float(i["price"]) <= budget and i.get("availability_status") != "out_of_stock"]
        if filtered:
            sorted_filtered = sorted(filtered, key=lambda x: float(x.get("rating") or 0), reverse=True)
            names_list = ", ".join([f"{item['name']} (₹{item['price']})" for item in sorted_filtered[:4]])
            reply = f"I found some great options under **₹{budget:.0f}** for you: {names_list}. Our top recommendation is the **{sorted_filtered[0]['name']}** ({sorted_filtered[0]['rating']} ★). Should I show you these options?"
            return {"reply": reply, "items": sorted_filtered[:4]}
        else:
            return {"reply": f"Sorry, we don't have any items under ₹{budget:.0f} currently. Can I show you some of our premium brews?", "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]}

    # 5. DIETARY / PREFERENCE FILTERS
    if "vegetarian" in msg_clean or "veg" in msg_clean:
        def is_item_veg(item):
            name_lower = item["name"].lower()
            non_veg_keywords = ["chicken", "egg", "prawn", "fish", "meat", "mutton", "crab"]
            if item.get("is_veg") is False:
                return False
            if item.get("is_veg") is True:
                return True
            if any(kw in name_lower for kw in non_veg_keywords):
                return False
            return True

        if "non" not in msg_clean:
            veg_items = [i for i in processed_items if is_item_veg(i)]
            
            # Categorize to ensure diverse variety: Puffs, Momos, Samosas, Lollipops, Rolls, Fries
            veg_snacks = [i for i in veg_items if any(kw in i["name"].lower() for kw in ["puff", "momo", "samosa", "roll", "lollipop", "fries"])]
            veg_cakes = [i for i in veg_items if "cake" in i["name"].lower() or "slice" in i["name"].lower()]
            veg_drinks = [i for i in veg_items if any(kw in i["name"].lower() for kw in ["shake", "juice", "tea", "coffee", "mojito", "milk", "pista", "malt", "boost", "horlicks"])]
            
            veg_snacks_sorted = sorted(veg_snacks, key=lambda x: float(x.get("rating") or 0), reverse=True)
            veg_cakes_sorted = sorted(veg_cakes, key=lambda x: float(x.get("rating") or 0), reverse=True)
            veg_drinks_sorted = sorted(veg_drinks, key=lambda x: float(x.get("rating") or 0), reverse=True)
            
            # Select 2 snacks, 1 cake/dessert, 1 beverage
            selected_items = []
            if len(veg_snacks_sorted) >= 1:
                selected_items.append(veg_snacks_sorted[0])
            if len(veg_snacks_sorted) >= 2:
                selected_items.append(veg_snacks_sorted[1])
            if len(veg_cakes_sorted) >= 1:
                selected_items.append(veg_cakes_sorted[0])
            if len(veg_drinks_sorted) >= 1:
                selected_items.append(veg_drinks_sorted[0])
                
            # Fallback filler
            if len(selected_items) < 4:
                for item in sorted(veg_items, key=lambda x: float(x.get("rating") or 0), reverse=True):
                    if item not in selected_items:
                        selected_items.append(item)
                        if len(selected_items) == 4:
                            break
            
            reply = "Here are some of our popular vegetarian options, featuring hot savory snacks, fresh brews, and desserts! 🌿\n\n- **Food & Snacks**: " + ", ".join([item['name'] for item in selected_items if item in veg_snacks]) + "\n- **Sweet Treats & Drinks**: " + ", ".join([item['name'] for item in selected_items if item not in veg_snacks]) + "\n\nWhat would you like to try? ☕️🥟"
            return {"reply": reply, "items": selected_items}
        else:
            non_veg_items = [i for i in processed_items if not is_item_veg(i)]
            sorted_non_veg = sorted(non_veg_items, key=lambda x: float(x.get("rating") or 0), reverse=True)
            
            # Group into starters, rolls/puffs, momos
            chicken_starters = [i for i in non_veg_items if any(kw in i["name"].lower() for kw in ["nugget", "popcorn", "lollipop", "prawn"])]
            chicken_rolls_puffs = [i for i in non_veg_items if any(kw in i["name"].lower() for kw in ["roll", "puff"])]
            chicken_momos = [i for i in non_veg_items if "momo" in i["name"].lower()]
            
            selected_items = []
            if chicken_starters:
                selected_items.append(sorted(chicken_starters, key=lambda x: float(x.get("rating") or 0), reverse=True)[0])
                if len(chicken_starters) >= 2:
                    selected_items.append(sorted(chicken_starters, key=lambda x: float(x.get("rating") or 0), reverse=True)[1])
            if chicken_rolls_puffs:
                selected_items.append(sorted(chicken_rolls_puffs, key=lambda x: float(x.get("rating") or 0), reverse=True)[0])
            if chicken_momos:
                selected_items.append(sorted(chicken_momos, key=lambda x: float(x.get("rating") or 0), reverse=True)[0])
                
            if len(selected_items) < 4:
                for item in sorted_non_veg:
                    if item not in selected_items:
                        selected_items.append(item)
                        if len(selected_items) == 4:
                            break
                            
            reply = "Looking for something savory? 🍗 Here are our top non-vegetarian selections, including crispy chicken starters, hot momos, and rolls:\n\n- **Starters**: " + ", ".join([item['name'] for item in selected_items if item in chicken_starters]) + "\n- **Puffs & Mains**: " + ", ".join([item['name'] for item in selected_items if item not in chicken_starters]) + "\n\nWhat sounds good to you today? 🛵🍗"
            return {"reply": reply, "items": selected_items}

    # 6. RATING & BEST REVIEWS SEARCH
    if any(k in msg_clean for k in ["best", "popular", "famous", "top", "highly rated", "star"]):
        sorted_popular = sorted(processed_items, key=lambda x: (float(x.get("rating") or 0), x.get("rating_count", 0)), reverse=True)
        top_items = sorted_popular[:4]
        names_list = ", ".join([f"{item['name']} ({item['rating']} ★)" for item in top_items])
        reply = f"Our top-rated crowd favorites are: **{names_list}**! 🏆 These are highly recommended by our regulars. Would you like to check them out?"
        return {"reply": reply, "items": top_items}

    # 7. ABOUT / DELIVERY / ORDERING
    if any(k in msg_clean for k in ["delivery", "address", "location", "order", "kapi adda", "how to"]):
        reply = "Kapi Adda is a smart, premium restaurant cafe. ☕️ You can explore our menu, view real-time ratings & reviews, and place your order instantly! I'm here to help you match your mood with the perfect food matchmaking score. Let me know what you want to try!"
        return {"reply": reply, "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]}

    # 8. CONVERSATIONAL RULES (REAL CHATBOT ENGINE)
    # Helper to retrieve available products by keywords dynamically
    def find_available_by_keywords(keywords, limit=3):
        res = []
        for kw in keywords:
            for item in processed_items:
                if kw in item["name"].lower() and item.get("availability_status") != "out_of_stock":
                    if item not in res:
                        res.append(item)
                        if len(res) == limit:
                            return res
        # Fallback if none found
        if not res:
            res = [i for i in processed_items if i.get("availability_status") != "out_of_stock"][:limit]
        return res

    # A. Weather & Conditions Checks
    if any(w in msg_clean for w in ["cold", "chilly", "winter", "freeze", "cool", "snow", "weather"]):
        warm_items = find_available_by_keywords(["tea", "coffee", "chai", "puff", "momo"])
        items_str = ", ".join([f"**{i['name']}**" for i in warm_items])
        reply = (
            f"Brrr! ❄️ Since it is chilly or cold outside, I highly recommend warming up with some of our fresh hot drinks "
            f"and crispy savory snacks! You should try our {items_str}. ☕🥐"
        )
        return {"reply": reply, "items": warm_items}
        
    if any(w in msg_clean for w in ["hot", "summer", "sunny", "heat", "warm"]):
        cool_items = find_available_by_keywords(["mojito", "juice", "shake", "ice cream", "cooler"])
        items_str = ", ".join([f"**{i['name']}**" for i in cool_items])
        reply = (
            f"Stay cool! ☀️ Since it is hot outside, beat the heat with our refreshing chilled beverages "
            f"and frozen desserts! I suggest trying our {items_str}. 🍹❄️"
        )
        return {"reply": reply, "items": cool_items}
        
    if any(w in msg_clean for w in ["rain", "rainy", "raining", "monsoon", "shower"]):
        crispy_items = find_available_by_keywords(["puff", "momo", "roll", "samosa", "fries", "nuggets", "popcorn"])
        items_str = ", ".join([f"**{i['name']}**" for i in crispy_items])
        reply = (
            f"Rainy days are perfect for hot, crispy snacks! 🌧️🥟 Grab some premium hot comfort food "
            f"like our {items_str} and watch the rain fall! ☕✨"
        )
        return {"reply": reply, "items": crispy_items}

    # B. Recommendations & Specials Checks
    if any(r in msg_clean for r in ["recommend", "special", "suggest", "what is good", "what should i", "choose for me", "craving", "hungry"]):
        special_items = sorted(
            [i for i in processed_items if i.get("availability_status") != "out_of_stock"],
            key=lambda x: float(x.get("rating") or 0),
            reverse=True
        )[:3]
        items_str = ", ".join([f"**{i['name']}** (₹{i['price']:.0f})" for i in special_items])
        reply = (
            f"We have some absolutely premium specials ready for you! 🌟 Based on customer favorites, "
            f"I highly recommend trying our {items_str}. They are top-rated and prepared fresh! 👨‍🍳✨"
        )
        return {"reply": reply, "items": special_items}

    # C. Conversational Politeness Checks
    if any(t in msg_clean for t in ["thank", "thanks", "great", "good job", "perfect", "awesome", "cool"]):
        reply = "You're very welcome! 😊 I'm always here to help you navigate our menu. Let me know if you want to check reviews, find budget deals, or order! ☕️"
        return {"reply": reply, "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]}

    # D. Bot Identity & Helper Checks
    if any(h in msg_clean for h in ["who are you", "what can you do", "help", "capability", "info"]):
        reply = (
            "I am your Kapi Adda AI assistant! 🤖 I can:\n"
            "- Find items under a budget (e.g. *'under ₹100'*)\n"
            "- Check live ratings & customer reviews (e.g. *'reviews on Plum Cake'*)\n"
            "- Find today's special offer (e.g. *'any offers today?'*)\n"
            "- Give weather-themed recommendations (e.g. *'it's cold outside'*)\n"
            "- Help you plan budget combinations for a group in **Meal Planner Mode**! 📋"
        )
        return {"reply": reply, "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:3]}

    # 9. FALLBACK (NATURAL CONVERSATION SUGGESTION)
    reply = "I'm here as your cafe companion! ☕️ While I'm still learning to chat about general topics, I'm great at food matchmaking. Let me know if you want to find items 'under ₹100', check reviews (e.g. 'reviews on Veg Puff'), or get today's special offer! \n\nIn the meantime, here is what is popular today! 🌟"
    return {
        "reply": reply,
        "items": [i for i in processed_items if i.get("rating", 0) >= 4.5][:4]
    }

@app.post("/api/ai/assistant")
def chat_assistant(req: MessageRequest):
    source_lang = req.lang or "en"
    msg_text = req.message.strip()
    
    # 1. Translate inbound message to English if it's not English
    if source_lang != "en":
        try:
            msg_text = GoogleTranslator(source=source_lang, target='en').translate(msg_text)
        except Exception as e:
            print(f"Translation Error (Inbound): {e}")
            
    # 2. Process logic in English
    result = _chat_assistant_logic(msg_text.lower(), req.user_id, req.session_id)
    
    # 3. Translate outbound reply to user's native language
    if source_lang != "en" and result.get("reply"):
        try:
            translated_reply = GoogleTranslator(source='en', target=source_lang).translate(result["reply"])
            result["reply"] = translated_reply
        except Exception as e:
            print(f"Translation Error (Outbound): {e}")
            
    result["lang"] = source_lang
    return result

# Voice assistant for Owner Dashboard (Speech-to-Text to query response)
@app.get("/api/ai/voice")
def voice_manager(
    speech_text: str,
    lang: Optional[str] = None,
    current_user: dict = Depends(verify_admin)
):
    import urllib.parse
    import requests
    
    preferred_lang = (lang or "").strip().lower()
    source_lang = "en"
    translated_query = speech_text
    
    # Prefer the admin's selected voice language when provided by the dashboard.
    if preferred_lang in {"en", "te", "hi", "ta", "kn"}:
        source_lang = preferred_lang
        try:
            if source_lang != "en":
                translated_query = GoogleTranslator(source='auto', target='en').translate(speech_text)
        except Exception as e:
            print(f"Selected language translation failed: {e}")
    else:
        # 0. Check heuristic overrides for transliterated Indian languages
        lower_query_words = set(speech_text.lower().split())
        telugu_words = {'kavala', 'kavali', 'entha', 'cheppu', 'chupinchu', 'enti', 'unnayi', 'undhi', 'vachindi', 'vachindhi', 'poyindhi'}
        hindi_words = {'hai', 'kya', 'batao', 'kitna', 'chahiye', 'dikhao', 'bataiye', 'aaj', 'ka'}
        tamil_words = {'venum', 'yenna', 'irukku', 'evvalavu', 'sollu'}
        kannada_words = {'beku', 'yenu', 'yeshtu', 'ide', 'helu'}
        
        overridden_lang = None
        if lower_query_words.intersection(telugu_words):
            overridden_lang = "te"
        elif lower_query_words.intersection(hindi_words):
            overridden_lang = "hi"
        elif lower_query_words.intersection(tamil_words):
            overridden_lang = "ta"
        elif lower_query_words.intersection(kannada_words):
            overridden_lang = "kn"
            
        if overridden_lang:
            source_lang = overridden_lang
            try:
                translated_query = GoogleTranslator(source=overridden_lang, target='en').translate(speech_text)
            except Exception as e:
                print(f"Override translation failed: {e}")
        else:
            # 1. Auto-detect source language and translate to English using Google translate API
            try:
                encoded_text = urllib.parse.quote(speech_text)
                url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q={encoded_text}"
                res = requests.get(url, timeout=5).json()
                if len(res) > 2:
                    source_lang = res[2]
                    translated_query = "".join([part[0] for part in res[0] if part[0]])
            except Exception as e:
                print(f"Language detection/translation failed: {e}")
                try:
                    translated_query = GoogleTranslator(source='auto', target='en').translate(speech_text)
                except Exception:
                    pass

    raw_q = speech_text.strip().lower()
    q = translated_query.strip().lower()
    def normalize_owner_query(text: str) -> str:
        text = (text or "").lower()
        text = re.sub(r"[^a-z0-9\u0c00-\u0c7f\s]", " ", text)
        fillers = [
            "please", "pls", "tell me", "show me", "give me", "can you", "could you",
            "in that", "about", "now", "ok", "okay", "bro", "sir", "madam",
            "cheppu", "chupinchu", "kavala", "kavali", "inka",
        ]
        for filler in fillers:
            text = text.replace(filler, " ")
        return re.sub(r"\s+", " ", text).strip()

    normalized_raw_q = normalize_owner_query(raw_q)
    normalized_translated_q = normalize_owner_query(q)
    intent_text = f"{normalized_translated_q} {normalized_raw_q}"
    # Fetch all data from DB concurrently at the start
    orders, expenses, inventory, menu_items, reviews, logs, categories = fetch_parallel([
        "orders",
        "expenses",
        "inventory",
        "menu_items",
        "reviews",
        "user_activity_logs",
        "categories"
    ])
    
    orders = orders or []
    expenses = expenses or []
    inventory = inventory or []
    menu_items = menu_items or []
    reviews = reviews or []
    logs = logs or []
    categories = categories or []

    # Pre-calculated mappings and view counts
    view_counts = {}
    search_counts = {}
    for log in logs:
        activity_type = log.get("activity_type", "")
        target_id = log.get("target_id")
        search_query = log.get("search_query", "")
        if activity_type == "view" and target_id:
            view_counts[target_id] = view_counts.get(target_id, 0) + 1
        if activity_type == "search" and search_query:
            sq = search_query.strip().lower()
            if sq:
                search_counts[sq] = search_counts.get(sq, 0) + 1

    item_map = {item["id"]: item for item in menu_items}

    # Preprocess all menu items to get real ratings and reviews
    reviews_map = get_all_reviews_map()
    processed_items = [preprocess_item(dict(item), reviews_map) for item in menu_items]
    processed_item_map = {item["id"]: item for item in processed_items}

    # Check if a specific product name is mentioned in the query (longest match first)
    mentioned_product = None
    query_lower = intent_text.lower()
    for item in sorted(processed_items, key=lambda x: len(x["name"]), reverse=True):
        name_lower = item["name"].lower()
        if name_lower in query_lower:
            mentioned_product = item
            break

    def has_any(*terms):
        return any(term in intent_text for term in terms)

    def detect_owner_voice_intent():
        scores = {
            "summary": 0,
            "revenue": 0,
            "expenses": 0,
            "inventory": 0,
            "popular": 0,
            "reviews": 0,
            "greeting": 0,
            "help": 0,
            "politeness": 0,
            "menu_info": 0,
            "highest_rating": 0,
            "lowest_rating": 0,
            "most_viewed": 0,
        }

        # If a specific product is mentioned and the query asks about reviews/ratings/feedback/details/what they say
        if mentioned_product and has_any("review", "rating", "comment", "feedback", "opinion", "say", "tell me about", "about", "describe", "what do"):
            return "product_reviews", 5, scores

        keyword_map = {
            "summary": [
                "summary", "overview", "report", "status", "dashboard", "business", "today",
                "what happened", "how is", "how are we", "everything", "overall", "orders",
                "ela undi", "ela undhi", "em jarigindi", "motham", "mottam", "total ga",
                "రిపోర్ట్", "స్థితి", "వ్యాపారం", "ఈరోజు", "మొత్తం", "ఆర్డర్లు",
            ],
            "revenue": [
                "revenue", "sales", "sale", "income", "profit", "earning", "earnings",
                "collection", "cash", "money", "turnover", "amount", "how much made",
                "entha vachindi", "enta vachindi", "dabbu", "labham", "ammakalu",
                "ఆదాయం", "అమ్మకాలు", "లాభం", "డబ్బు", "ఎంత వచ్చింది",
            ],
            "expenses": [
                "expense", "expenses", "cost", "spend", "spent", "spending", "loss",
                "operational cost", "kharchu", "karchu", "entha kharchu",
                "ఖర్చు", "ఖర్చులు", "వ్యయం",
            ],
            "inventory": [
                "inventory", "stock", "stocks", "threshold", "low stock", "out of stock",
                "available", "availability", "ingredients", "replenish", "restock",
                "saruku", "stock unda", "stock leda", "ayipoyaya", "unnaya", "unnayi",
                "స్టాక్", "సరుకు", "అందుబాటులో", "అయిపోయాయా", "ఉన్నాయా", "ఇన్వెంటరీ",
            ],
            "popular": [
                "selling", "popular", "best", "favorite", "favourite", "top item",
                "most ordered", "most viewed", "trending", "demand", "fast moving",
                "ekkuva", "baga ammuddi", "popular enti", "best enti",
                "ఎక్కువ", "పాపులర్", "బెస్ట్", "డిమాండ్",
            ],
            "reviews": [
                "review", "reviews", "rating", "ratings", "sentiment", "feedback",
                "complaint", "complaints", "customer", "customers", "satisfaction",
                "stars", "rating ela", "feedback ela", "customers ela",
                "రివ్యూ", "రేటింగ్", "ఫీడ్‌బ్యాక్", "కస్టమర్", "ఫిర్యాదు",
            ],
            "greeting": [
                "hello", "hi", "hey", "good morning", "good afternoon", "namaste", "hola",
                "lumina", "assistant", "batao", "namaskaram", "namaste",
            ],
            "help": [
                "help", "what can you do", "commands", "options", "guide", "features", "capabilities",
                "sahayam", "help chey", "ela pani chestundi",
            ],
            "politeness": [
                "thank you", "thanks", "great", "awesome", "nice", "how are you", "who are you",
                "dhanyavadalu", "shukriya",
            ],
            "menu_info": [
                "menu", "items", "categories", "what food", "what drinks", "list items", "products",
                "available items", "vontalu", "tindi", "menu lo emunnayi",
            ],
            "highest_rating": [
                "highest rating", "highest rated", "best rated", "best rating", "top rated", "top rating",
                "highest review", "best review", "ekkuva rating", "baga rating", "highest-rated", "top-rated",
                "what is the highest rating", "which product has highest rating"
            ],
            "lowest_rating": [
                "lowest rated", "lowest rating", "worst rated", "worst rating", "poor rating",
                "lowest-rated", "worst-rated", "thakkuva rating", "low rating", "bad rating",
                "what is the lowest rating", "which product has lowest rating"
            ],
            "most_viewed": [
                "most viewed", "highest number of people", "highest views", "most clicked", "highest clicks",
                "most popular", "trending item", "clicks ekkuva", "clicks entha", "people seen", "highest customer",
                "highest number of the people"
            ],
        }

        for intent_name, terms in keyword_map.items():
            for term in terms:
                if term in intent_text:
                    scores[intent_name] += 2 if " " in term else 1

        spoken_aliases = {
            "summary": [
                "order count", "how many orders", "daily report", "business report",
                "shop status", "restaurant status", "cafe status", "performance",
                "ivala ela undi", "eroju ela undi", "business ela undi", "orders entha",
            ],
            "revenue": [
                "today sales", "total amount", "net profit", "gross sales",
                "sales entha", "profit entha", "money entha", "business amount",
                "entha vachindhi", "enta vachindhi",
            ],
            "expenses": [
                "cost entha", "spent entha", "expense entha", "kharchulu", "karchulu",
            ],
            "inventory": [
                "items left", "what is left", "shortage", "short item", "empty item",
                "ayipoyindi", "stock ayipoyindi", "stock undha", "stock ledha",
            ],
            "popular": [
                "best seller", "top selling", "high demand", "customer like",
                "customers like", "edi ekkuva", "ekkuva ammuddi",
            ],
            "reviews": [
                "customer feedback", "bad review", "good review", "service",
                "experience", "customers happy", "customer happy",
            ],
        }
        for intent_name, terms in spoken_aliases.items():
            for term in terms:
                if term in intent_text:
                    scores[intent_name] += 3

        if has_any("today", "ఈరోజు", "aaj", "ivala", "eroju") and scores["summary"] > 0:
            scores["summary"] += 2
        if has_any("how much", "entha", "enta", "ఎంత") and scores["revenue"] > 0:
            scores["revenue"] += 2
        if scores["inventory"] and has_any("low", "out", "ayip", "threshold", "అయి"):
            scores["inventory"] += 2

        # Priority Tier Selection Logic
        specific_business_intents = [
            "revenue", "expenses", "inventory", "popular", "reviews", "menu_info",
            "highest_rating", "lowest_rating", "most_viewed"
        ]
        conversational_intents = ["greeting", "help", "politeness"]

        # Check if any specific business intent has a match > 0
        matched_specific = {k: v for k, v in scores.items() if k in specific_business_intents and v > 0}
        if matched_specific:
            intent = max(matched_specific, key=matched_specific.get)
            intent_score = matched_specific[intent]
        else:
            # Check conversational intents
            matched_conv = {k: v for k, v in scores.items() if k in conversational_intents and v > 0}
            if matched_conv:
                intent = max(matched_conv, key=matched_conv.get)
                intent_score = matched_conv[intent]
            elif scores["summary"] > 0:
                intent = "summary"
                intent_score = scores["summary"]
            else:
                if len(intent_text.strip()) < 3:
                    return "clarify", 0, scores
                return "summary", 0, scores

        return intent, intent_score, scores

    intent, intent_score, intent_scores = detect_owner_voice_intent()

    if intent == "clarify":
        result = {
            "text": (
                "I could not clearly understand which business detail you need.\n\n"
                "Please ask one specific question like:\n"
                "• Today's revenue\n"
                "• Low stock items\n"
                "• Expenses\n"
                "• Popular items\n"
                "• Customer reviews\n"
                "• Highest/Lowest rated product"
            ),
            "voice": "I did not clearly understand the question. Please ask about revenue, low stock, expenses, popular items, customer reviews, or highest and lowest rated products.",
            "lang": source_lang,
            "intent": "clarify",
            "understood_query": translated_query,
        }
        if source_lang != "en":
            try:
                result["text"] = GoogleTranslator(source='en', target=source_lang).translate(result["text"])
            except Exception as e:
                print(f"Translation Error (Clarify Text Output): {e}")
            try:
                result["voice"] = GoogleTranslator(source='en', target=source_lang).translate(result["voice"])
            except Exception as e:
                print(f"Translation Error (Clarify Voice Output): {e}")
        return result

    result = {}
    
    # 1. DAILY SUMMARY / REPORT
    if intent == "summary":
        total_revenue = sum(float(o["total_amount"]) for o in orders)
        total_orders = len(orders)
        completed_orders = len([o for o in orders if o.get("status") != "cancelled"])
        cancelled_orders = len([o for o in orders if o.get("status") == "cancelled"])
        total_expenses = sum(float(e["amount"]) for e in expenses)
        net_profit = total_revenue - total_expenses
        
        low_stock_items = [i["item_name"] for i in inventory if float(i["quantity"]) <= float(i["threshold"])]
        low_stock_str = ", ".join(low_stock_items[:3]) if low_stock_items else "None"
        
        ratings = [float(r.get("rating", 5)) for r in reviews]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0.0
        
        top_viewed_ids = sorted(view_counts.items(), key=lambda x: x[1], reverse=True)
        best_seller_name = "None"
        if top_viewed_ids:
            best_seller_item = item_map.get(top_viewed_ids[0][0])
            if best_seller_item:
                best_seller_name = best_seller_item.get("name", "None")
                
        facts = (
            f"• Revenue: ₹{total_revenue:.2f} across {total_orders} orders ({cancelled_orders} cancelled).\n"
            f"• Expenses: ₹{total_expenses:.2f}.\n"
            f"• Net profit: ₹{net_profit:.2f}.\n"
            f"• Average rating: {avg_rating:.1f}/5.0 ({len(reviews)} reviews).\n"
            f"• Low stock items: {low_stock_str}."
        )
        
        analysis = (
            f"Orders are stable, but profitability is influenced by expenses of ₹{total_expenses:.2f}. "
            f"Customer rating stands at {avg_rating:.1f}."
        )
        if low_stock_items:
            analysis += f" Stock for {len(low_stock_items)} ingredients is below critical levels."
            
        recommendation = (
            f"1. Replenish {low_stock_str} before evening rush.\n"
            f"2. Monitor high-expense categories to boost net margins."
        )
        
        impact = "Minimize stock-outs, maintain 5-star customer experience, and increase profit margins by 5%."
        
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        voice = (
            f"Today's total revenue is {int(total_revenue)} rupees with {total_orders} orders. "
            f"Logged expenses are {int(total_expenses)} rupees, leaving a net profit of {int(net_profit)} rupees. "
            f"Our average rating is {avg_rating:.1f} stars. "
            f"I recommend replenishing low stock items immediately to avoid lost sales."
        )
        result = {"text": text, "voice": voice}

    # 2. REVENUE / SALES
    elif intent == "revenue":
        total_revenue = sum(float(o["total_amount"]) for o in orders)
        total_orders = len(orders)
        total_expenses = sum(float(e["amount"]) for e in expenses)
        net_profit = total_revenue - total_expenses
        
        facts = (
            f"• Today's total sales revenue is ₹{total_revenue:.2f}.\n"
            f"• Total orders processed: {total_orders}.\n"
            f"• Net profit after expenses: ₹{net_profit:.2f}."
        )
        analysis = (
            f"Revenue is generated smoothly across {total_orders} completed checkouts. "
            f"Profit margins remain healthy at {int((net_profit/total_revenue)*100) if total_revenue > 0 else 0}% of sales."
        )
        recommendation = "Promote high-margin categories (like Desserts and Coffees) during peak hours to maximize sales velocity."
        impact = "Boost daily revenue by up to 10% through strategic high-margin item features."
        
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        voice = f"Today's revenue is {int(total_revenue)} rupees across {total_orders} orders, with a net profit of {int(net_profit)} rupees."
        result = {"text": text, "voice": voice}

    # 3. EXPENSES
    elif intent == "expenses":
        total_expenses = sum(float(e["amount"]) for e in expenses)
        facts = (
            f"• Total operational expenses today stand at ₹{total_expenses:.2f}.\n"
            f"• Transaction records count: {len(expenses)}."
        )
        analysis = f"Operating costs are driven by raw material procurement and daily utility expenses."
        recommendation = "Review supplier invoices and batch-purchase dry ingredients to lower transport/procurement overheads."
        impact = "Reduce daily operational costs by 8% through wholesale sourcing adjustments."
        
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        voice = f"Total operational expenses today are {int(total_expenses)} rupees."
        result = {"text": text, "voice": voice}

    # 4. LOW STOCK / INVENTORY
    elif intent == "inventory":
        low_items = [i["item_name"] for i in inventory if float(i["quantity"]) <= float(i["threshold"])]
        if low_items:
            items_str = ", ".join(low_items)
            facts = (
                f"• The following ingredients have breached safety stock thresholds: {items_str}.\n"
                f"• Total critical alerts: {len(low_items)}."
            )
            analysis = "Current inventory is insufficient to support expected customer order volume for the next 24 hours."
            recommendation = f"Place a replenishment order for {items_str} immediately before the evening rush."
            impact = f"Prevent menu item unavailability, capture full sales demand, and avoid customer complaints."
            
            text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
            voice = f"The following ingredients are running low: {items_str}. Please place a replenishment order immediately."
        else:
            facts = "• All tracked inventory items are currently above safety thresholds."
            analysis = "Raw ingredient stock is fully optimized for daily operational needs."
            recommendation = "Maintain regular supply tracking cycles and review stock updates tonight."
            impact = "Zero lost sales due to out-of-stock items."
            
            text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
            voice = "All inventory levels are currently healthy and above safety thresholds."
        result = {"text": text, "voice": voice}

    # 5. BEST SELLERS / POPULAR ITEMS
    elif intent == "popular":
        top_viewed_ids = sorted(view_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        top_items = []
        for item_id, count in top_viewed_ids:
            item = item_map.get(item_id)
            if item:
                top_items.append(f"{item['name']} ({count} views)")
                
        best_sellers_str = ", ".join(top_items) if top_items else "Chicken Popcorn, Filter Coffee, Alphonso Mango Milkshake"
        
        facts = f"• Top viewed menu items: {best_sellers_str}."
        analysis = "High view counts indicate strong customer preference and potential to drive impulse orders."
        recommendation = "Bundle these top-performing products with lower-velocity items (e.g. Tiffins) to clear inventory."
        impact = "Increase Average Order Value (AOV) by 12% and optimize menu category margins."
        
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        voice = f"Our top viewed menu items are {best_sellers_str.replace('views', 'clicks')}."
        result = {"text": text, "voice": voice}

    # 6. REVIEWS & SENTIMENT
    elif intent == "reviews":
        total_reviews = len(reviews)
        pos_c = sum(1 for r in reviews if int(float(r.get("rating", 5))) >= 4)
        neu_c = sum(1 for r in reviews if int(float(r.get("rating", 5))) == 3)
        neg_c = sum(1 for r in reviews if int(float(r.get("rating", 5))) <= 2)
        
        avg_rating = sum(float(r.get("rating", 5)) for r in reviews) / total_reviews if total_reviews > 0 else 0.0
        
        facts = (
            f"• Average customer rating is {avg_rating:.1f}/5.0 based on {total_reviews} feedback submissions.\n"
            f"• Positive: {pos_c}, Neutral: {neu_c}, Negative: {neg_c}."
        )
        analysis = (
            f"Overall sentiment is generally positive at {int((pos_c/total_reviews)*100) if total_reviews > 0 else 0}%. "
            f"Negative reviews constitute {int((neg_c/total_reviews)*100) if total_reviews > 0 else 0}% and should be investigated."
        )
        recommendation = "Follow up with staff to resolve service/waiting time issues reported in low-rating submissions."
        impact = "Increase customer loyalty and boost average rating closer to 4.8 stars."
        
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        voice = f"Our average rating is {avg_rating:.1f} stars across {total_reviews} customer reviews."
        result = {"text": text, "voice": voice}

    # 7. GREETING
    elif intent == "greeting":
        text = (
            "**HELLO!**\n"
            "I am Lumina, your AI Voice Operations Manager. ☕️\n\n"
            "I can help you query live data from your database. Try asking me about:\n"
            "• Today's revenue and profit\n"
            "• Operational expenses\n"
            "• Low stock ingredients\n"
            "• Best selling items\n"
            "• Customer reviews & sentiment"
        )
        voice = (
            "Hello! I am Lumina, your AI Voice Operations Manager. "
            "I can help you check your restaurant's revenue, low stock items, expenses, popular items, or reviews. "
            "What would you like to know?"
        )
        result = {"text": text, "voice": voice}

    # 8. HELP
    elif intent == "help":
        text = (
            "**CAPABILITIES**\n"
            "Lumina Voice Assistant Capabilities: 📋\n\n"
            "You can query the following reports verbally:\n"
            "1. **Revenue / Sales**: 'What is today's revenue?'\n"
            "2. **Expenses**: 'Show our operational costs'\n"
            "3. **Inventory / Stock**: 'Any ingredients running low?'\n"
            "4. **Best Sellers**: 'What are our popular products?'\n"
            "5. **Reviews**: 'How is customer sentiment?'"
        )
        voice = (
            "You can ask me about today's revenue, operational expenses, low stock ingredients, top selling items, or customer reviews."
        )
        result = {"text": text, "voice": voice}

    # 9. POLITENESS
    elif intent == "politeness":
        text = (
            "**STATUS**\n"
            "You're very welcome! 😊\n\n"
            "I am continuously monitoring your restaurant's live metrics. "
            "Let me know if you need any other business insights!"
        )
        voice = "You are welcome. Let me know if you need any other business details."
        result = {"text": text, "voice": voice}

    # 10. MENU INFO
    elif intent == "menu_info":
        text = (
            "**MENU METRICS**\n"
            f"• Total menu items: {len(menu_items)}\n"
            f"• Category count: {len(categories)}\n\n"
            "To analyze performance, ask about our best sellers or check if we are running low on ingredients."
        )
        voice = f"We have {len(menu_items)} items on our menu across {len(categories)} categories. Let me know if you want to know about our best sellers."
        result = {"text": text, "voice": voice}

    # 11. HIGHEST RATED PRODUCT
    elif intent == "highest_rating":
        valid_items = [i for i in processed_items if i.get("rating") is not None]
        top_rated = sorted(valid_items, key=lambda x: float(x.get("rating", 0)), reverse=True)[:3]
        if top_rated:
            items_lines = "\n".join([f"• **{item['name']}**: Rating {item['rating']:.1f}/5.0" for item in top_rated])
            facts = f"Our top-rated products are:\n{items_lines}"
            analysis = "These products have the highest satisfaction ratings based on customer feedback."
            recommendation = "Feature these top-rated items prominently to drive more orders."
            impact = "Maintain high customer satisfaction and drive repeat sales."
            items_voice = ", ".join([f"{item['name']} with {item['rating']:.1f} stars" for item in top_rated])
            voice = f"Our highest rated products are {items_voice}."
        else:
            facts = "No rated products found in the menu database."
            analysis = "No customer reviews are available yet to calculate product ratings."
            recommendation = "Encourage customers to submit ratings and reviews."
            impact = "Gain product rating data to guide business improvements."
            voice = "No product ratings are available yet in the database."
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        result = {"text": text, "voice": voice}

    # 12. LOWEST RATED PRODUCT
    elif intent == "lowest_rating":
        valid_items = [i for i in processed_items if i.get("rating") is not None]
        bottom_rated = sorted(valid_items, key=lambda x: float(x.get("rating", 0)))[:3]
        if bottom_rated:
            items_lines = "\n".join([f"• **{item['name']}**: Rating {item['rating']:.1f}/5.0" for item in bottom_rated])
            facts = f"Our lowest-rated products are:\n{items_lines}"
            analysis = "These items have received lower ratings from customers. We should inspect their quality or preparation."
            recommendation = "Review ingredient quality, staff preparation, or remove underperforming items from the menu."
            impact = "Prevent negative customer reviews and improve overall food quality standard."
            items_voice = ", ".join([f"{item['name']} with {item['rating']:.1f} stars" for item in bottom_rated])
            voice = f"Our lowest rated products are {items_voice}. I suggest reviewing their preparation."
        else:
            facts = "No rated products found in the menu database."
            analysis = "No customer reviews are available yet."
            recommendation = "Gather customer feedback to identify low-rating items."
            impact = "Identify menu improvement areas."
            voice = "No product ratings are available yet."
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        result = {"text": text, "voice": voice}

    # 13. MOST VIEWED PRODUCT
    elif intent == "most_viewed":
        top_viewed_ids = sorted(view_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        top_viewed_items = []
        for item_id, count in top_viewed_ids:
            item = processed_item_map.get(item_id)
            if item:
                top_viewed_items.append((item, count))
        if top_viewed_items:
            items_lines = "\n".join([f"• **{item['name']}**: {count} views/clicks" for item, count in top_viewed_items])
            facts = f"Our most viewed products are:\n{items_lines}"
            analysis = "High view counts show strong customer interest and attraction."
            recommendation = "Ensure these popular items are always in stock and bundle them with other items."
            impact = "Convert high page views into actual sales conversions."
            items_voice = ", ".join([f"{item['name']} with {count} clicks" for item, count in top_viewed_items])
            voice = f"Our most clicked products are {items_voice}."
        else:
            facts = "No viewed products logged in user activity history."
            analysis = "Activity tracking logs do not show any item clicks yet."
            recommendation = "Encourage customers to explore and browse products on the app."
            impact = "Generate interaction logs to analyze customer preferences."
            voice = "No product view data is logged in the database yet."
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        result = {"text": text, "voice": voice}

    # 14. PRODUCT REVIEWS FOR SPECIFIC ITEM
    elif intent == "product_reviews" and mentioned_product:
        p_id = mentioned_product["id"]
        p_name = mentioned_product["name"]
        matched_reviews = [r for r in reviews if r.get("menu_item_id") == p_id]
        avg_rating = mentioned_product.get("rating") or 0.0
        
        if matched_reviews:
            comments_lines = []
            comments_spoken = []
            for idx, r in enumerate(matched_reviews[:3], 1):
                comment_text = r.get("comment", "").strip()
                rating_val = float(r.get("rating", 5))
                if comment_text:
                    comments_lines.append(f"{idx}. \"{comment_text}\" ({rating_val:.1f} stars)")
                    comments_spoken.append(comment_text)
            
            facts = f"Reviews for **{p_name}**:\n• Average Rating: **{avg_rating:.1f}/5.0** ({len(matched_reviews)} reviews)"
            if comments_lines:
                facts += "\n\nCustomer Comments:\n" + "\n".join(comments_lines)
            
            analysis = f"Customers generally rate {p_name} at {avg_rating:.1f} stars."
            recommendation = f"Continue to maintain quality standards for {p_name}."
            impact = f"Keep customer feedback positive and retain high demand."
            
            voice_feedback = ". ".join(comments_spoken[:2])
            voice = f"{p_name} has {len(matched_reviews)} reviews with an average rating of {avg_rating:.1f} stars. Customers say: {voice_feedback}."
        else:
            facts = f"Reviews for **{p_name}**:\n• Rating: **{avg_rating:.1f}/5.0** but no written comments found in the database."
            analysis = f"Customers rated {p_name} at {avg_rating:.1f} stars but left no written text reviews."
            recommendation = "Prompt customers to add text comments when reviewing this product."
            impact = "Gain qualitative feedback to improve item details."
            voice = f"{p_name} is rated {avg_rating:.1f} stars, but has no written reviews in the database yet."
            
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        result = {"text": text, "voice": voice}

    # 15. DEFAULT / FALLBACK ANALYTICAL REPORT
    else:
        facts = (
            f"• System online and monitoring {len(menu_items)} active menu items.\n"
            f"• Logged {len(orders)} transactions and {len(reviews)} reviews."
        )
        analysis = f"The operations manager is ready to receive verbal operational queries about revenue, stock levels, expenses, or reviews."
        recommendation = "Query the AI using operational keywords like 'Today's revenue', 'What is the stock alert', or 'Review sentiment'."
        impact = "Instant data-driven operational intelligence to improve business decision speed."
        
        text = f"**FACTS**\n{facts}\n\n**ANALYSIS**\n{analysis}\n\n**RECOMMENDATION**\n{recommendation}\n\n**EXPECTED IMPACT**\n{impact}"
        voice = "I am ready. Please ask me about today's revenue, expenses, stock status, or customer reviews."
        result = {"text": text, "voice": voice}

    user_key = str(current_user.get("id") or current_user.get("email") or "owner")
    normalized_memory_query = normalize_owner_query(f"{translated_query} {speech_text}")
    now_ts = datetime.now().timestamp()
    previous_voice = OWNER_VOICE_MEMORY.get(user_key)
    if (
        previous_voice
        and previous_voice.get("query") == normalized_memory_query
        and previous_voice.get("intent") == intent
        and now_ts - previous_voice.get("time", 0) < 6
    ):
        result = {
            "text": (
                "Same question detected, so I am not repeating the full answer.\n\n"
                f"Intent understood: {intent}.\n"
                "The latest dashboard values have not changed since the previous response."
            ),
            "voice": "Same question detected, so I am not repeating the full answer. The latest result is unchanged.",
        }
    else:
        OWNER_VOICE_MEMORY[user_key] = {
            "query": normalized_memory_query,
            "intent": intent,
            "voice": result.get("voice", ""),
            "time": now_ts,
        }

    # Translate outbound responses if source language is not English
    if source_lang != "en":
        try:
            translated_text = GoogleTranslator(source='en', target=source_lang).translate(result["text"])
            result["text"] = translated_text
        except Exception as e:
            print(f"Translation Error (Voice Text Output): {e}")
            
        try:
            translated_voice = GoogleTranslator(source='en', target=source_lang).translate(result["voice"])
            result["voice"] = translated_voice
        except Exception as e:
            print(f"Translation Error (Voice Spoken Output): {e}")

    result["lang"] = source_lang
    result["intent"] = intent
    result["understood_query"] = translated_query
    return result

def _split_tts_text(text: str, max_len: int = 180):
    cleaned = re.sub(r"[*#`_>\[\]()]|FACTS|ANALYSIS|RECOMMENDATION|EXPECTED IMPACT", " ", text or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
      return []

    chunks = []
    current = ""
    for part in re.split(r"(?<=[.!?।])\s+", cleaned):
        if len(current) + len(part) + 1 <= max_len:
            current = f"{current} {part}".strip()
        else:
            if current:
                chunks.append(current)
            current = part[:max_len]
    if current:
        chunks.append(current)
    return chunks[:6]

@app.get("/api/ai/tts")
def indic_tts_audio(
    text: str,
    lang: Optional[str] = "te",
    current_user: dict = Depends(verify_admin)
):
    target_lang = (lang or "te").strip().lower()
    if target_lang not in {"te", "hi", "ta", "kn", "en"}:
        target_lang = "te"

    chunks = _split_tts_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="No text provided for TTS.")

    audio = bytearray()
    try:
        for chunk in chunks:
            query = urllib.parse.urlencode({
                "ie": "UTF-8",
                "client": "tw-ob",
                "tl": target_lang,
                "q": chunk,
            })
            req = urllib.request.Request(
                f"https://translate.google.com/translate_tts?{query}",
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://translate.google.com/",
                },
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                audio.extend(response.read())
    except Exception as e:
        print(f"Indic TTS generation failed: {e}")
        raise HTTPException(status_code=502, detail="Indic TTS audio generation failed.")

    return Response(
        content=bytes(audio),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
