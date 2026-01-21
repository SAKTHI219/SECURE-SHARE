from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from cryptography.fernet import Fernet
import base64
import secrets
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
ALGORITHM = "HS256"

# File storage
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# SendGrid for Email
sendgrid_client = SendGridAPIClient(os.environ['SENDGRID_API_KEY'])

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    message: str

class ShareLinkCreate(BaseModel):
    file_id: str
    password: str
    expiry_hours: int = 24
    download_limit: int = 10

class ShareLinkResponse(BaseModel):
    link_token: str
    share_url: str
    expiry_date: datetime
    download_limit: int

class AccessFileRequest(BaseModel):
    link_token: str
    password: str

class AccessAttempt(BaseModel):
    id: str
    file_id: str
    link_token: str
    attempted_at: datetime
    ip_address: str
    password_correct: bool
    file_type_served: str

class OwnerAction(BaseModel):
    attempt_id: str
    action: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class RequestFileAccessOTP(BaseModel):
    link_token: str

class VerifyFileAccessOTP(BaseModel):
    link_token: str
    otp: str
    password: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_encryption_key() -> bytes:
    return Fernet.generate_key()

def encrypt_file(file_content: bytes, key: bytes) -> bytes:
    f = Fernet(key)
    return f.encrypt(file_content)

def decrypt_file(encrypted_content: bytes, key: bytes) -> bytes:
    f = Fernet(key)
    return f.decrypt(encrypted_content)

async def send_alert_email(email: str, subject: str, content: str):
    try:
        message = Mail(
            from_email=os.environ['SENDGRID_FROM_EMAIL'],
            to_emails=email,
            subject=subject,
            html_content=content
        )
        response = sendgrid_client.send(message)
        logging.info(f"Email sent successfully to {email}, status: {response.status_code}")
        return True
    except Exception as e:
        logging.error(f"Email failed to {email}: {e}")
        return False

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return f"{secrets.randbelow(900000) + 100000}"

async def send_otp_email(email: str, otp: str, purpose: str):
    """Send OTP via email"""
    if purpose == "password_reset":
        subject = "🔐 Password Reset OTP - SecureShare"
        content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🔐 Password Reset Request</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #111827;">You requested to reset your password.</p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-weight: bold;">Your OTP Code:</p>
                    <p style="font-family: monospace; font-size: 32px; font-weight: bold; color: #10B981; margin: 10px 0; letter-spacing: 8px;">{otp}</p>
                </div>
                
                <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; border-left: 4px solid #F59E0B;">
                    <p style="margin: 0; color: #92400E; font-size: 14px;"><strong>⚠️ Security Note:</strong> This OTP is valid for 10 minutes. Never share this code with anyone.</p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
            </div>
        </div>
        """
    elif purpose == "file_access":
        subject = "🔑 File Access Authorization Required - SecureShare"
        content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🔑 File Access Authorization Request</h2>
            </div>
            <div style="background: #EFF6FF; padding: 20px; border: 2px solid #DBEAFE; border-radius: 0 0 8px 8px;">
                <p style="font-size: 18px; color: #1E40AF; font-weight: bold;">Someone is requesting access to your file!</p>
                
                <p style="color: #374151; font-size: 16px; margin: 15px 0;">To authorize file access, please share this One-Time Password (OTP) with the person requesting access:</p>
                
                <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; border: 3px solid #3B82F6; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-weight: bold; font-size: 14px; text-transform: uppercase;">Authorization OTP</p>
                    <p style="font-family: monospace; font-size: 36px; font-weight: bold; color: #3B82F6; margin: 15px 0; letter-spacing: 10px;">{otp}</p>
                    <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Valid for 10 minutes</p>
                </div>
                
                <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; border-left: 4px solid #F59E0B; margin: 20px 0;">
                    <p style="margin: 0; color: #92400E; font-size: 14px;"><strong>⚠️ Important:</strong></p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400E; font-size: 14px;">
                        <li>Only share this OTP with trusted recipients</li>
                        <li>This OTP authorizes ONE file access attempt</li>
                        <li>Expires in 10 minutes from receipt</li>
                        <li>You'll receive another alert when file is accessed</li>
                    </ul>
                </div>
                
                <div style="background: #DBEAFE; padding: 15px; border-radius: 6px; margin-top: 20px;">
                    <p style="margin: 0; color: #1E40AF; font-size: 14px;">📊 <strong>Track Access:</strong> Log in to your SecureShare dashboard to view all access attempts and manage your shared files.</p>
                </div>
            </div>
        </div>
        """
    
    return await send_alert_email(email, subject, content)

# Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token({"sub": user_id})
    return {"token": token, "user": {"id": user_id, "email": user_data.email, "name": user_data.name}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token({"sub": user["id"]})
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send OTP for password reset"""
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, an OTP has been sent"}
    
    # Generate OTP
    otp = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP in database
    await db.password_reset_otps.insert_one({
        "email": request.email,
        "otp": otp,
        "expiry": expiry.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send OTP email
    await send_otp_email(request.email, otp, "password_reset")
    
    logging.info(f"Password reset OTP sent to {request.email}")
    return {"message": "If the email exists, an OTP has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Verify OTP and reset password"""
    # Find valid OTP
    otp_doc = await db.password_reset_otps.find_one({
        "email": request.email,
        "otp": request.otp,
        "used": False
    })
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check expiry
    expiry = datetime.fromisoformat(otp_doc["expiry"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Update password
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"email": request.email},
        {"$set": {"password_hash": hash_password(request.new_password)}}
    )
    
    # Mark OTP as used
    await db.password_reset_otps.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"used": True}}
    )
    
    logging.info(f"Password reset successful for {request.email}")
    return {"message": "Password reset successful"}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "email": current_user["email"], "name": current_user["name"]}

@api_router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(
    real_file: UploadFile = File(...),
    decoy_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    file_id = str(uuid.uuid4())
    encryption_key = generate_encryption_key()
    
    # Save real file (encrypted)
    real_content = await real_file.read()
    encrypted_real = encrypt_file(real_content, encryption_key)
    real_path = UPLOAD_DIR / f"{file_id}_real.enc"
    with open(real_path, "wb") as f:
        f.write(encrypted_real)
    
    # Save decoy file (encrypted)
    decoy_content = await decoy_file.read()
    encrypted_decoy = encrypt_file(decoy_content, encryption_key)
    decoy_path = UPLOAD_DIR / f"{file_id}_decoy.enc"
    with open(decoy_path, "wb") as f:
        f.write(encrypted_decoy)
    
    # Store in DB
    file_doc = {
        "id": file_id,
        "user_id": current_user["id"],
        "filename": real_file.filename,
        "decoy_filename": decoy_file.filename,
        "real_file_path": str(real_path),
        "decoy_file_path": str(decoy_path),
        "encryption_key": base64.b64encode(encryption_key).decode(),
        "file_size": len(real_content),
        "upload_date": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    
    return FileUploadResponse(
        file_id=file_id,
        filename=real_file.filename,
        message="Files uploaded successfully"
    )

@api_router.get("/files")
async def get_user_files(current_user: dict = Depends(get_current_user)):
    files = await db.files.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return {"files": files}

@api_router.get("/files/{file_id}/download")
async def download_own_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Owner can download their own real file anytime"""
    file_doc = await db.files.find_one({"id": file_id, "user_id": current_user["id"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found or unauthorized")
    
    # Decrypt and return real file
    encryption_key = base64.b64decode(file_doc["encryption_key"])
    with open(file_doc["real_file_path"], "rb") as f:
        encrypted_content = f.read()
    
    decrypted_content = decrypt_file(encrypted_content, encryption_key)
    
    # Save decrypted file temporarily
    temp_path = UPLOAD_DIR / f"temp_owner_{file_doc['id']}_real.tmp"
    with open(temp_path, "wb") as f:
        f.write(decrypted_content)
    
    return FileResponse(
        temp_path,
        filename=file_doc["filename"],
        media_type="application/octet-stream"
    )

@api_router.post("/share/create", response_model=ShareLinkResponse)
async def create_share_link(
    share_data: ShareLinkCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify file ownership
    file_doc = await db.files.find_one({"id": share_data.file_id, "user_id": current_user["id"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    link_token = secrets.token_urlsafe(32)
    expiry_date = datetime.now(timezone.utc) + timedelta(hours=share_data.expiry_hours)
    
    share_doc = {
        "id": str(uuid.uuid4()),
        "file_id": share_data.file_id,
        "link_token": link_token,
        "password_hash": hash_password(share_data.password),
        "expiry_date": expiry_date.isoformat(),
        "download_limit": share_data.download_limit,
        "downloads_count": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.share_links.insert_one(share_doc)
    
    share_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/access/{link_token}"
    return ShareLinkResponse(
        link_token=link_token,
        share_url=share_url,
        expiry_date=expiry_date,
        download_limit=share_data.download_limit
    )

@api_router.get("/share/links")
async def get_share_links(current_user: dict = Depends(get_current_user)):
    # Get all files by user
    user_files = await db.files.find({"user_id": current_user["id"]}, {"_id": 0, "id": 1, "filename": 1}).to_list(100)
    file_ids = [f["id"] for f in user_files]
    
    # Get share links for those files
    links = await db.share_links.find({"file_id": {"$in": file_ids}}, {"_id": 0}).to_list(100)
    
    # Add filename to each link
    file_map = {f["id"]: f["filename"] for f in user_files}
    for link in links:
        link["filename"] = file_map.get(link["file_id"], "Unknown")
    
    return {"links": links}

@api_router.post("/access/file")
async def access_file(access_data: AccessFileRequest):
    """DEPRECATED - Use request-access-otp and verify-access-otp instead"""
    raise HTTPException(status_code=400, detail="Please use OTP verification flow for file access")

@api_router.post("/access/request-otp")
async def request_file_access_otp(request: RequestFileAccessOTP):
    """Request OTP from file owner for access"""
    # Get share link
    share_link = await db.share_links.find_one({"link_token": request.link_token})
    if not share_link:
        raise HTTPException(status_code=404, detail="Invalid link")
    
    # Check expiry
    expiry = datetime.fromisoformat(share_link["expiry_date"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=403, detail="Link expired")
    
    # Check if link is active
    if not share_link["is_active"]:
        raise HTTPException(status_code=403, detail="Link disabled by owner")
    
    # Get file and owner info
    file_doc = await db.files.find_one({"id": share_link["file_id"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    owner = await db.users.find_one({"id": file_doc["user_id"]})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    # Generate OTP
    otp = generate_otp()
    expiry_time = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP
    otp_id = str(uuid.uuid4())
    await db.file_access_otps.insert_one({
        "id": otp_id,
        "link_token": request.link_token,
        "file_id": file_doc["id"],
        "otp": otp,
        "expiry": expiry_time.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send OTP to owner
    await send_otp_email(owner["email"], otp, "file_access")
    
    logging.info(f"File access OTP requested for file {file_doc['filename']}, sent to {owner['email']}")
    
    return {
        "message": "OTP sent to file owner",
        "owner_email_hint": f"{owner['email'][:3]}***@{owner['email'].split('@')[1]}",
        "expires_in": 600  # 10 minutes
    }

@api_router.post("/access/verify-otp")
async def verify_file_access_otp(access_data: VerifyFileAccessOTP):
    """Verify OTP and provide file access"""
    # Get share link
    share_link = await db.share_links.find_one({"link_token": access_data.link_token})
    if not share_link:
        raise HTTPException(status_code=404, detail="Invalid link")
    
    # Verify OTP
    otp_doc = await db.file_access_otps.find_one({
        "link_token": access_data.link_token,
        "otp": access_data.otp,
        "used": False
    })
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check OTP expiry
    otp_expiry = datetime.fromisoformat(otp_doc["expiry"])
    if datetime.now(timezone.utc) > otp_expiry:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one")
    
    # Check link expiry
    link_expiry = datetime.fromisoformat(share_link["expiry_date"])
    if datetime.now(timezone.utc) > link_expiry:
        raise HTTPException(status_code=403, detail="Link expired")
    
    # Check download limit
    if share_link["downloads_count"] >= share_link["download_limit"]:
        raise HTTPException(status_code=403, detail="Download limit reached")
    
    if not share_link["is_active"]:
        raise HTTPException(status_code=403, detail="Link disabled by owner")
    
    # Get file
    file_doc = await db.files.find_one({"id": share_link["file_id"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get owner info
    owner = await db.users.find_one({"id": file_doc["user_id"]})
    
    # Verify password
    password_correct = verify_password(access_data.password, share_link["password_hash"])
    
    # Mark OTP as used
    await db.file_access_otps.update_one(
        {"id": otp_doc["id"]},
        {"$set": {"used": True}}
    )
    
    # Log access attempt
    attempt_id = str(uuid.uuid4())
    attempt_doc = {
        "id": attempt_id,
        "file_id": file_doc["id"],
        "link_token": access_data.link_token,
        "attempted_at": datetime.now(timezone.utc).isoformat(),
        "ip_address": "unknown",
        "password_correct": password_correct,
        "file_type_served": "real" if password_correct else "decoy",
        "owner_notified": False,
        "otp_verified": True
    }
    await db.access_attempts.insert_one(attempt_doc)
    
    if password_correct:
        # Correct password - serve real file
        await db.share_links.update_one(
            {"link_token": access_data.link_token},
            {"$inc": {"downloads_count": 1}}
        )
        
        # Alert owner about successful access via email
        alert_msg = f"✓ File '{file_doc['filename']}' accessed with CORRECT password (OTP verified)"
        email_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">✓ Authorized File Access (OTP Verified)</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #111827;">Your file <strong>'{file_doc['filename']}'</strong> was successfully accessed with the correct password after OTP verification.</p>
                <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <p style="margin: 5px 0; color: #6b7280;"><strong>Time:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
                    <p style="margin: 5px 0; color: #6b7280;"><strong>File Type Served:</strong> Real File</p>
                    <p style="margin: 5px 0; color: #6b7280;"><strong>Status:</strong> <span style="color: #10B981;">Authorized ✓</span></p>
                    <p style="margin: 5px 0; color: #6b7280;"><strong>OTP Verification:</strong> <span style="color: #10B981;">Passed ✓</span></p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This is a notification for successful file access. No action required.</p>
            </div>
        </div>
        """
        
        # Send email alert
        email_sent = await send_alert_email(
            owner["email"],
            "✓ File Access Alert - Authorized Access (OTP Verified)",
            email_content
        )
        
        # Update log with email status
        await db.access_attempts.update_one(
            {"id": attempt_id},
            {"$set": {"email_sent": email_sent, "owner_notified": True}}
        )
        
        logging.info(f"Authorized access with OTP: file={file_doc['filename']}, email={email_sent}")
        
        # Decrypt and return real file
        encryption_key = base64.b64decode(file_doc["encryption_key"])
        with open(file_doc["real_file_path"], "rb") as f:
            encrypted_content = f.read()
        
        decrypted_content = decrypt_file(encrypted_content, encryption_key)
        
        # Save decrypted file temporarily
        temp_path = UPLOAD_DIR / f"temp_{file_doc['id']}_real_otp.tmp"
        with open(temp_path, "wb") as f:
            f.write(decrypted_content)
        
        return FileResponse(
            temp_path,
            filename=file_doc["filename"],
            media_type="application/octet-stream"
        )
    else:
        # Wrong password - serve decoy file & alert owner via email
        verification_code = generate_otp()
        
        # Send intrusion alert via email
        email_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🚨 INTRUSION ALERT - Wrong Password Used (OTP Verified)</h2>
            </div>
            <div style="background: #fff5f5; padding: 20px; border: 2px solid #FEE2E2; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #991B1B; font-weight: bold;">Someone accessed your file with OTP verification but INCORRECT password!</p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #EF4444;">
                    <p style="margin: 8px 0; color: #374151;"><strong>File:</strong> {file_doc['filename']}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Time:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #EF4444; font-weight: bold;">⚠️ INTRUSION (Wrong Password)</span></p>
                    <p style="margin: 8px 0; color: #374151;"><strong>OTP Verification:</strong> <span style="color: #10B981;">Passed ✓</span></p>
                </div>
                
                <div style="background: #FEE2E2; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #991B1B; font-weight: bold;">Verification Code:</p>
                    <p style="font-family: monospace; font-size: 24px; font-weight: bold; color: #DC2626; margin: 0; letter-spacing: 3px;">{verification_code}</p>
                </div>
                
                <div style="background: #DBEAFE; padding: 15px; border-radius: 6px; border-left: 4px solid #3B82F6;">
                    <p style="margin: 0; color: #1E40AF; font-size: 14px;"><strong>What happened?</strong> The user verified OTP but used wrong password. They received a DECOY file (fake data). Your real file remains secure.</p>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;"><strong>Action Required:</strong></p>
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">• Log in to your SecureShare dashboard</p>
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">• View Access Logs to see intrusion details</p>
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">• Block the share link if needed</p>
                </div>
            </div>
        </div>
        """
        
        # Send email alert
        email_sent = await send_alert_email(
            owner["email"],
            "🚨 INTRUSION ALERT - Wrong Password Used (OTP Verified)",
            email_content
        )
        
        # Update attempt with verification code and alert status
        await db.access_attempts.update_one(
            {"id": attempt_id},
            {"$set": {
                "owner_notified": True,
                "verification_code": verification_code,
                "email_sent": email_sent
            }}
        )
        
        logging.warning(f"INTRUSION with OTP verification: file={file_doc['filename']}, code={verification_code}, email={email_sent}")
        
        # Serve decoy file
        encryption_key = base64.b64decode(file_doc["encryption_key"])
        with open(file_doc["decoy_file_path"], "rb") as f:
            encrypted_content = f.read()
        
        decrypted_content = decrypt_file(encrypted_content, encryption_key)
        
        # Save decrypted decoy file temporarily
        temp_path = UPLOAD_DIR / f"temp_{file_doc['id']}_decoy_otp.tmp"
        with open(temp_path, "wb") as f:
            f.write(decrypted_content)
        
        return FileResponse(
            temp_path,
            filename=file_doc["decoy_filename"],
            media_type="application/octet-stream"
        )
    # Get share link
    share_link = await db.share_links.find_one({"link_token": access_data.link_token})
    if not share_link:
        raise HTTPException(status_code=404, detail="Invalid link")
    
    # Check expiry
    expiry = datetime.fromisoformat(share_link["expiry_date"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=403, detail="Link expired")
    
    # Check download limit
    if share_link["downloads_count"] >= share_link["download_limit"]:
        raise HTTPException(status_code=403, detail="Download limit reached")
    
    if not share_link["is_active"]:
        raise HTTPException(status_code=403, detail="Link disabled by owner")
    
    # Get file
    file_doc = await db.files.find_one({"id": share_link["file_id"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify password
    password_correct = verify_password(access_data.password, share_link["password_hash"])
    
    # Log access attempt
    attempt_id = str(uuid.uuid4())
    attempt_doc = {
        "id": attempt_id,
        "file_id": file_doc["id"],
        "link_token": access_data.link_token,
        "attempted_at": datetime.now(timezone.utc).isoformat(),
        "ip_address": "unknown",
        "password_correct": password_correct,
        "file_type_served": "real" if password_correct else "decoy",
        "owner_notified": False
    }
    await db.access_attempts.insert_one(attempt_doc)
    
    # Get owner info
    owner = await db.users.find_one({"id": file_doc["user_id"]})
    
    if password_correct:
        # Correct password - serve real file
        await db.share_links.update_one(
            {"link_token": access_data.link_token},
            {"$inc": {"downloads_count": 1}}
        )
        
        # Alert owner about successful access via email
        alert_msg = f"✓ File '{file_doc['filename']}' accessed with CORRECT password"
        email_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">✓ Authorized File Access</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #111827;">Your file <strong>'{file_doc['filename']}'</strong> was successfully accessed with the correct password.</p>
                <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <p style="margin: 5px 0; color: #6b7280;"><strong>Time:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
                    <p style="margin: 5px 0; color: #6b7280;"><strong>File Type Served:</strong> Real File</p>
                    <p style="margin: 5px 0; color: #6b7280;"><strong>Status:</strong> <span style="color: #10B981;">Authorized ✓</span></p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This is a notification for successful file access. No action required.</p>
            </div>
        </div>
        """
        
        # Send email alert
        email_sent = await send_alert_email(
            owner["email"],
            "✓ File Access Alert - Authorized Access",
            email_content
        )
        
        # Log alert status
        await db.access_attempts.update_one(
            {"id": attempt_id},
            {"$set": {"email_sent": email_sent}}
        )
        
        logging.info(f"Authorized access: file={file_doc['filename']}, email={email_sent}")
        
        # Decrypt and return real file
        encryption_key = base64.b64decode(file_doc["encryption_key"])
        with open(file_doc["real_file_path"], "rb") as f:
            encrypted_content = f.read()
        
        decrypted_content = decrypt_file(encrypted_content, encryption_key)
        
        # Save decrypted file temporarily
        temp_path = UPLOAD_DIR / f"temp_{file_doc['id']}_real.tmp"
        with open(temp_path, "wb") as f:
            f.write(decrypted_content)
        
        return FileResponse(
            temp_path,
            filename=file_doc["filename"],
            media_type="application/octet-stream"
        )
    else:
        # Wrong password - serve decoy file & alert owner via email
        verification_code = f"{secrets.randbelow(900000) + 100000}"
        
        # Send intrusion alert via email
        email_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🚨 INTRUSION ALERT - Unauthorized Access Attempt</h2>
            </div>
            <div style="background: #fff5f5; padding: 20px; border: 2px solid #FEE2E2; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #991B1B; font-weight: bold;">Someone attempted to access your file with an INCORRECT password!</p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #EF4444;">
                    <p style="margin: 8px 0; color: #374151;"><strong>File:</strong> {file_doc['filename']}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Time:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #EF4444; font-weight: bold;">⚠️ INTRUSION DETECTED</span></p>
                </div>
                
                <div style="background: #FEE2E2; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #991B1B; font-weight: bold;">Verification Code:</p>
                    <p style="font-family: monospace; font-size: 24px; font-weight: bold; color: #DC2626; margin: 0; letter-spacing: 3px;">{verification_code}</p>
                </div>
                
                <div style="background: #DBEAFE; padding: 15px; border-radius: 6px; border-left: 4px solid #3B82F6;">
                    <p style="margin: 0; color: #1E40AF; font-size: 14px;"><strong>What happened?</strong> The attacker received a DECOY file (they think they succeeded, but got fake data). Your real file remains secure.</p>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;"><strong>Action Required:</strong></p>
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">• Log in to your SecureShare dashboard</p>
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">• View Access Logs to see intrusion details</p>
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">• Block the share link if needed</p>
                </div>
            </div>
        </div>
        """
        
        # Send email alert
        email_sent = await send_alert_email(
            owner["email"],
            "🚨 INTRUSION ALERT - Unauthorized Access to Your File",
            email_content
        )
        
        # Update attempt with verification code and alert status
        await db.access_attempts.update_one(
            {"id": attempt_id},
            {"$set": {
                "owner_notified": True,
                "verification_code": verification_code,
                "email_sent": email_sent
            }}
        )
        
        logging.warning(f"INTRUSION DETECTED: file={file_doc['filename']}, code={verification_code}, email={email_sent}")
        
        # Serve decoy file (user thinks they got access)
        encryption_key = base64.b64decode(file_doc["encryption_key"])
        with open(file_doc["decoy_file_path"], "rb") as f:
            encrypted_content = f.read()
        
        decrypted_content = decrypt_file(encrypted_content, encryption_key)
        
        # Save decrypted decoy file temporarily
        temp_path = UPLOAD_DIR / f"temp_{file_doc['id']}_decoy.tmp"
        with open(temp_path, "wb") as f:
            f.write(decrypted_content)
        
        return FileResponse(
            temp_path,
            filename=file_doc["decoy_filename"],
            media_type="application/octet-stream"
        )

@api_router.get("/access/attempts")
async def get_access_attempts(current_user: dict = Depends(get_current_user)):
    # Get user's files
    user_files = await db.files.find({"user_id": current_user["id"]}, {"_id": 0, "id": 1, "filename": 1}).to_list(100)
    file_ids = [f["id"] for f in user_files]
    
    # Get attempts for those files
    attempts = await db.access_attempts.find({"file_id": {"$in": file_ids}}, {"_id": 0}).sort("attempted_at", -1).to_list(100)
    
    # Add filename to each attempt
    file_map = {f["id"]: f["filename"] for f in user_files}
    for attempt in attempts:
        attempt["filename"] = file_map.get(attempt["file_id"], "Unknown")
    
    return {"attempts": attempts}

@api_router.post("/owner/action")
async def owner_action(action_data: OwnerAction, current_user: dict = Depends(get_current_user)):
    attempt = await db.access_attempts.find_one({"id": action_data.attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Verify ownership
    file_doc = await db.files.find_one({"id": attempt["file_id"], "user_id": current_user["id"]})
    if not file_doc:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if action_data.action == "block":
        # Disable the share link
        await db.share_links.update_one(
            {"link_token": attempt["link_token"]},
            {"$set": {"is_active": False}}
        )
        return {"message": "Link blocked successfully"}
    
    return {"message": "Action completed"}

@api_router.get("/")
async def root():
    return {"message": "Secure File Sharing API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()