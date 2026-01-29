# backend/main.py
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import logging
import sys
import traceback
from enum import Enum

# Load environment variables
# Load environment variables
# Use absolute path to ensure .env is found regardless of where the command is run from
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)
if os.path.exists(env_path):
    print(f"Loading .env from: {env_path}")
else:
    print(f"Warning: .env file not found at {env_path}")

# ============================================
# LOGGING CONFIGURATION
# ============================================
def setup_logging():
    """Configure enterprise-grade logging"""
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)-8s | %(name)-20s | %(funcName)-20s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[
            # Console handler
            logging.StreamHandler(sys.stdout),
            # File handler - general logs
            logging.FileHandler('logs/app.log', encoding='utf-8'),
            # File handler - error logs only
            logging.FileHandler('logs/error.log', encoding='utf-8')
        ]
    )
    
    # Configure specific loggers
    logger = logging.getLogger(__name__)
    
    # Set error-only handler for error log
    error_handler = logging.FileHandler('logs/error.log', encoding='utf-8')
    error_handler.setLevel(logging.ERROR)
    error_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s\n%(exc_info)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    error_handler.setFormatter(error_formatter)
    logging.getLogger().addHandler(error_handler)
    
    return logger

logger = setup_logging()

# ============================================
# CONFIGURATION & VALIDATION
# ============================================
class Config:
    """Application configuration with validation"""
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    # Brevo Configuration
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "").strip().strip('"').strip("'")
    BREVO_WAITLIST_ID: int = int(os.getenv("BREVO_WAITLIST_ID", "0"))
    
    # CORS Origins
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000", 
        "http://127.0.0.1:5173",
        os.getenv("FRONTEND_URL", "")
    ]
    
    @classmethod
    def validate(cls) -> Dict[str, Any]:
        """Validate all required configuration"""
        errors = []
        warnings = []
        
        if not cls.DATABASE_URL:
            errors.append("DATABASE_URL is not set")
        
        if not cls.BREVO_API_KEY:
            errors.append("BREVO_API_KEY is not set")
        
        if cls.BREVO_WAITLIST_ID == 0:
            errors.append("BREVO_WAITLIST_ID is not set or invalid")
        
        # Filter out empty strings from CORS origins
        cls.ALLOWED_ORIGINS = [origin for origin in cls.ALLOWED_ORIGINS if origin]
        
        if not cls.ALLOWED_ORIGINS:
            warnings.append("No CORS origins configured")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

# ============================================
# ENUMS
# ============================================
class WaitlistStatus(str, Enum):
    """Waitlist entry status"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    INVITED = "invited"
    ACTIVE = "active"

class BrevoSyncStatus(str, Enum):
    """Brevo synchronization status"""
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"

# ============================================
# PYDANTIC MODELS
# ============================================
class EmailSubmission(BaseModel):
    """Request model for waitlist submission"""
    email: EmailStr = Field(..., description="User's email address")
    name: Optional[str] = Field(None, max_length=255, description="User's name (optional)")
    referral_source: Optional[str] = Field(None, max_length=100, description="How they found us")
    
    @validator('email')
    def email_must_be_lowercase(cls, v):
        """Ensure email is lowercase for consistency"""
        return v.lower().strip()
    
    @validator('name')
    def name_must_be_clean(cls, v):
        """Clean and validate name"""
        if v:
            return v.strip()
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "name": "John Doe",
                "referral_source": "twitter"
            }
        }

class WaitlistResponse(BaseModel):
    """Response model for waitlist operations"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Successfully added to waitlist",
                "data": {
                    "email": "user@example.com",
                    "position": 42,
                    "brevo_sync_status": "success"
                }
            }
        }

class HealthCheckResponse(BaseModel):
    """Response model for health check"""
    status: str
    timestamp: str
    database: str
    brevo: str
    version: str

# ============================================
# DATABASE OPERATIONS
# ============================================
@contextmanager
def get_db_connection():
    """
    Context manager for database connections with error handling
    
    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM waitlist")
    """
    conn = None
    try:
        logger.debug(f"Establishing database connection")
        conn = psycopg2.connect(Config.DATABASE_URL)
        logger.debug("Database connection established successfully")
        yield conn
        conn.commit()
        logger.debug("Database transaction committed")
    except psycopg2.Error as e:
        logger.error(f"Database error: {e.pgcode} - {e.pgerror}", exc_info=True)
        if conn:
            conn.rollback()
            logger.warning("Database transaction rolled back")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database operation failed"
        )
    except Exception as e:
        logger.error(f"Unexpected database error: {str(e)}", exc_info=True)
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )
    finally:
        if conn:
            conn.close()
            logger.debug("Database connection closed")

class DatabaseService:
    """Service class for all database operations"""
    
    @staticmethod
    def initialize_schema():
        """Create or update database schema"""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Create waitlist table with all necessary fields
                    # We split this from index creation to allow migrations to run first on existing tables
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS waitlist (
                            id SERIAL PRIMARY KEY,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            name VARCHAR(255),
                            referral_source VARCHAR(100),
                            status VARCHAR(50) DEFAULT 'pending',
                            brevo_contact_id VARCHAR(100),
                            brevo_sync_status VARCHAR(50) DEFAULT 'pending',
                            brevo_synced_at TIMESTAMP,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Migration: Add columns if they don't exist (for existing tables)
                    # We do this BEFORE creating indexes to ensure the columns exist
                    migration_columns = [
                        ("name", "VARCHAR(255)"),
                        ("referral_source", "VARCHAR(100)"),
                        ("status", "VARCHAR(50) DEFAULT 'pending'"),
                        ("brevo_contact_id", "VARCHAR(100)"),
                        ("brevo_sync_status", "VARCHAR(50) DEFAULT 'pending'"),
                        ("brevo_synced_at", "TIMESTAMP")
                    ]
                    
                    for col_name, col_type in migration_columns:
                        try:
                            cur.execute(f"ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
                        except Exception as e:
                            # Note: ADD COLUMN IF NOT EXISTS requires Postgres 9.6+
                            # If that fails, we can catch specific errors or assume it might exist
                            logger.warning(f"Note verifying column {col_name}: {str(e)}")
                    
                    # Create indexes after ensuring columns exist
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
                        CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
                        CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
                    """)
                    
                    logger.info("✅ Database schema initialized successfully")
                    
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize database schema: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    def check_email_exists(email: str) -> Optional[Dict[str, Any]]:
        """
        Check if email already exists in waitlist
        
        Args:
            email: Email address to check
            
        Returns:
            Dict with user data if exists, None otherwise
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT id, email, name, status, created_at FROM waitlist WHERE email = %s",
                        (email,)
                    )
                    result = cur.fetchone()
                    
                    if result:
                        logger.info(f"📧 Email found in database: {email}")
                        return dict(result)
                    
                    logger.debug(f"📧 Email not found in database: {email}")
                    return None
        except Exception as e:
            logger.error(f"❌ Error checking email existence: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def add_waitlist_entry(
        email: str,
        name: Optional[str] = None,
        referral_source: Optional[str] = None,
        brevo_contact_id: Optional[str] = None,
        brevo_sync_status: str = BrevoSyncStatus.PENDING
    ) -> Dict[str, Any]:
        """
        Add new entry to waitlist
        
        Args:
            email: User's email
            name: User's name (optional)
            referral_source: How they found us
            brevo_contact_id: Brevo contact identifier
            brevo_sync_status: Status of Brevo sync
            
        Returns:
            Dict with created entry details including position
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Insert new entry
                    cur.execute(
                        """
                        INSERT INTO waitlist 
                        (email, name, referral_source, status, brevo_contact_id, brevo_sync_status, brevo_synced_at, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, email, name, status, created_at
                        """,
                        (
                            email,
                            name,
                            referral_source,
                            WaitlistStatus.PENDING,
                            brevo_contact_id,
                            brevo_sync_status,
                            datetime.now() if brevo_sync_status == BrevoSyncStatus.SUCCESS else None,
                            datetime.now()
                        )
                    )
                    result = cur.fetchone()
                    
                    # Get waitlist position
                    cur.execute("SELECT COUNT(*) as position FROM waitlist WHERE created_at <= %s", (result['created_at'],))
                    position_result = cur.fetchone()
                    
                    entry_data = dict(result)
                    entry_data['position'] = position_result['position']
                    
                    logger.info(f"✅ Waitlist entry created: {email} at position #{entry_data['position']}")
                    return entry_data
                    
        except psycopg2.IntegrityError as e:
            logger.warning(f"⚠️ Integrity error adding waitlist entry: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        except Exception as e:
            logger.error(f"❌ Error adding waitlist entry: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def get_waitlist_count() -> int:
        """Get total number of waitlist entries"""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM waitlist")
                    count = cur.fetchone()[0]
                    logger.debug(f"📊 Current waitlist count: {count}")
                    return count
        except Exception as e:
            logger.error(f"❌ Error getting waitlist count: {str(e)}", exc_info=True)
            raise

# ============================================
# BREVO INTEGRATION SERVICE
# ============================================
class BrevoService:
    """Service class for all Brevo API operations"""
    
    def __init__(self):
        """Initialize Brevo API client"""
        try:
            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key['api-key'] = Config.BREVO_API_KEY
            
            self.api_client = sib_api_v3_sdk.ApiClient(configuration)
            self.contacts_api = sib_api_v3_sdk.ContactsApi(self.api_client)
            self.account_api = sib_api_v3_sdk.AccountApi(self.api_client)
            
            logger.info("✅ Brevo API client initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Brevo API client: {str(e)}", exc_info=True)
            raise
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test Brevo API connection
        
        Returns:
            Dict with connection status and account info
        """
        try:
            logger.info("🔍 Testing Brevo API connection...")
            account = self.account_api.get_account()
            
            result = {
                "connected": True,
                "account_email": account.email,
                "company_name": account.company_name if hasattr(account, 'company_name') else None,
                "plan_type": account.plan[0].type if account.plan else None
            }
            
            logger.info(f"✅ Brevo connection successful: {account.email}")
            return result
            
        except ApiException as e:
            logger.error(f"❌ Brevo API connection failed: {e.status} - {e.reason}", exc_info=True)
            return {
                "connected": False,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"❌ Unexpected error testing Brevo connection: {str(e)}", exc_info=True)
            return {
                "connected": False,
                "error": str(e)
            }
    
    def add_contact_to_list(
        self,
        email: str,
        name: Optional[str] = None,
        referral_source: Optional[str] = None,
        position: int = 0
    ) -> Dict[str, Any]:
        """
        Add contact to Brevo waitlist
        
        This triggers Brevo's automation workflow which will send the welcome email
        
        Args:
            email: Contact email
            name: Contact name
            referral_source: How they found us
            position: Position in waitlist
            
        Returns:
            Dict with sync status and contact ID
        """
        try:
            logger.info(f"📤 Adding contact to Brevo: {email}")
            
            # Prepare contact attributes for personalization
            attributes = {
                "SIGNUP_DATE": datetime.now().strftime("%Y-%m-%d"),
                "WAITLIST_POSITION": position,
            }
            
            # Add name attributes if provided
            if name:
                name_parts = name.split(maxsplit=1)
                attributes["FIRSTNAME"] = name_parts[0]
                if len(name_parts) > 1:
                    attributes["LASTNAME"] = name_parts[1]
            
            # Add referral source if provided
            if referral_source:
                attributes["REFERRAL_SOURCE"] = referral_source
            
            # Create contact in Brevo
            create_contact = sib_api_v3_sdk.CreateContact(
                email=email,
                attributes=attributes,
                list_ids=[Config.BREVO_WAITLIST_ID],
                update_enabled=True  # Update if already exists
            )
            
            response = self.contacts_api.create_contact(create_contact)
            
            logger.info(f"✅ Contact added to Brevo successfully: {email} (ID: {response.id})")
            
            return {
                "status": BrevoSyncStatus.SUCCESS,
                "contact_id": str(response.id),
                "message": "Contact added and automation triggered"
            }
            
        except ApiException as e:
            # Handle specific API errors
            if e.status == 400 and "Contact already exist" in str(e.body):
                logger.warning(f"⚠️ Contact already exists in Brevo: {email}")
                return {
                    "status": BrevoSyncStatus.SUCCESS,
                    "contact_id": None,
                    "message": "Contact already exists in Brevo"
                }
            elif e.status == 401:
                logger.error(f"❌ Brevo authentication failed. Check API key.")
                return {
                    "status": BrevoSyncStatus.FAILED,
                    "error": "Authentication failed",
                    "error_code": "BREVO_AUTH_FAILED"
                }
            elif e.status == 404:
                logger.error(f"❌ Brevo list not found: {Config.BREVO_WAITLIST_ID}")
                return {
                    "status": BrevoSyncStatus.FAILED,
                    "error": "List not found",
                    "error_code": "BREVO_LIST_NOT_FOUND"
                }
            else:
                logger.error(f"❌ Brevo API error: {e.status} - {e.reason}", exc_info=True)
                return {
                    "status": BrevoSyncStatus.FAILED,
                    "error": f"API error: {e.reason}",
                    "error_code": "BREVO_API_ERROR"
                }
                
        except Exception as e:
            logger.error(f"❌ Unexpected error adding contact to Brevo: {str(e)}", exc_info=True)
            return {
                "status": BrevoSyncStatus.FAILED,
                "error": str(e),
                "error_code": "BREVO_UNEXPECTED_ERROR"
            }

# ============================================
# FASTAPI APPLICATION
# ============================================
app = FastAPI(
    title="Lavoo Waitlist API",
    description="Enterprise-grade waitlist management system with Brevo integration",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
brevo_service = BrevoService()

# ============================================
# STARTUP & SHUTDOWN EVENTS
# ============================================
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("=" * 80)
    logger.info("🚀 Starting Lavoo Waitlist API")
    logger.info("=" * 80)
    
    # Debug: Check environment
    if Config.BREVO_API_KEY:
        masked = f"{Config.BREVO_API_KEY[:5]}...{Config.BREVO_API_KEY[-5:]}" if len(Config.BREVO_API_KEY) > 10 else "***"
        logger.info(f"🔑 Loaded Brevo Key: {masked} (Len: {len(Config.BREVO_API_KEY)})")
        logger.debug(f"   Key start/end: {repr(Config.BREVO_API_KEY[:2])}...{repr(Config.BREVO_API_KEY[-2:])}")
    else:
        logger.error("❌ BREVO_API_KEY is missing from environment")
    
    # Validate configuration
    config_status = Config.validate()
    
    if not config_status["valid"]:
        logger.error("❌ Configuration validation failed:")
        for error in config_status["errors"]:
            logger.error(f"   - {error}")
        logger.error("⚠️ Application startup aborted due to configuration errors!")
        raise RuntimeError("Configuration validation failed")
    else:
        logger.info("✅ Configuration validated successfully")
    
    if config_status["warnings"]:
        for warning in config_status["warnings"]:
            logger.warning(f"⚠️ {warning}")
    
    # Initialize database
    db_initialized = DatabaseService.initialize_schema()
    if db_initialized:
        logger.info("✅ Database initialization complete")
    else:
        logger.error("❌ Database initialization failed")
    
    # Test Brevo connection
    brevo_status = brevo_service.test_connection()
    if brevo_status.get("connected"):
        logger.info(f"✅ Brevo connected: {brevo_status.get('account_email')}")
        logger.info(f"   List ID: {Config.BREVO_WAITLIST_ID}")
    else:
        logger.error(f"❌ Brevo connection failed: {brevo_status.get('error')}")
    
    logger.info("=" * 80)
    logger.info("✅ Application startup complete")
    logger.info("=" * 80)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    logger.info("=" * 80)
    logger.info("🛑 Shutting down Lavoo Waitlist API")
    logger.info("=" * 80)

# ============================================
# API ENDPOINTS
# ============================================
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ... (other code)

# Mount static assets (JS/CSS/Images)
# We check if directory exists to avoid startup errors in dev/CI if build is missing
if os.path.exists("out/assets"):
    app.mount("/assets", StaticFiles(directory="out/assets"), name="assets")

# Serve React App for Root and Catch-All (SPA Support)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve the React frontend"""
    
    # Allow API routes to pass through (though they are matched first)
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    # Check if a specific file exists in 'out' (e.g. favicon.ico, logo.png)
    file_path = os.path.join("out", full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Default: Serve index.html for any other route (Client-side routing)
    if os.path.exists("out/index.html"):
        return FileResponse("out/index.html")
        
    return {"message": "Frontend not built. Run 'npm run build'"}

@app.get("/api/health")
async def health_check():
    """Detailed health check endpoint"""
    logger.debug("Detailed health check requested")
    
    health_data = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {}
    }
    
    # Check database
    try:
        count = DatabaseService.get_waitlist_count()
        health_data["services"]["database"] = {
            "status": "healthy",
            "waitlist_count": count
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        health_data["services"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_data["status"] = "degraded"
    
    # Check Brevo
    brevo_status = brevo_service.test_connection()
    health_data["services"]["brevo"] = brevo_status
    if not brevo_status.get("connected"):
        health_data["status"] = "degraded"
    
    return health_data

@app.post("/api/waitlist", response_model=WaitlistResponse, status_code=status.HTTP_201_CREATED)
async def add_to_waitlist(submission: EmailSubmission):
    """
    Add email to waitlist
    
    Flow:
    1. Validate email format (automatic via Pydantic)
    2. Check if email already exists
    3. Add to database
    4. Add to Brevo contacts list (triggers automation)
    5. Return success response
    
    The welcome email is automatically sent by Brevo's automation workflow
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    logger.info(f"[{request_id}] 📨 Waitlist submission received: {submission.email}")
    
    try:
        # Step 1: Check if email already exists
        existing = DatabaseService.check_email_exists(submission.email)
        
        if existing:
            logger.warning(f"[{request_id}] ⚠️ Duplicate submission attempt: {submission.email}")
            return WaitlistResponse(
                success=False,
                message="This email has already been registered!",
                error_code="EMAIL_ALREADY_EXISTS",
                data={
                    "email": submission.email,
                    "registered_at": existing.get("created_at").isoformat() if existing.get("created_at") else None
                }
            )
        
        # Step 2: Add to Brevo first (to trigger automation)
        logger.info(f"[{request_id}] 📤 Syncing to Brevo...")
        brevo_result = brevo_service.add_contact_to_list(
            email=submission.email,
            name=submission.name,
            referral_source=submission.referral_source,
            position=DatabaseService.get_waitlist_count() + 1
        )
        
        # Step 3: Add to database with Brevo sync status
        logger.info(f"[{request_id}] 💾 Saving to database...")
        entry = DatabaseService.add_waitlist_entry(
            email=submission.email,
            name=submission.name,
            referral_source=submission.referral_source,
            brevo_contact_id=brevo_result.get("contact_id"),
            brevo_sync_status=brevo_result.get("status")
        )
        
        # Prepare response
        response_data = {
            "email": entry["email"],
            "name": entry.get("name"),
            "position": entry["position"],
            "registered_at": entry["created_at"].isoformat(),
            "brevo_sync_status": brevo_result.get("status"),
        }
        
        # Add warning if Brevo sync failed
        warning_message = ""
        if brevo_result.get("status") == BrevoSyncStatus.FAILED:
            warning_message = " (Note: Email confirmation may be delayed)"
            logger.warning(f"[{request_id}] ⚠️ Brevo sync failed but database entry successful")
        
        logger.info(f"[{request_id}] ✅ Waitlist submission successful: {submission.email} at position #{entry['position']}")
        
        return WaitlistResponse(
            success=True,
            message=f"🎉 You've been added to the waitlist!{warning_message}",
            data=response_data
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (they're already logged)
        raise
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Unexpected error processing waitlist submission: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )

@app.get("/api/waitlist/count")
async def get_waitlist_count():
    """Get total number of waitlist entries"""
    try:
        count = DatabaseService.get_waitlist_count()
        return {
            "success": True,
            "count": count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting waitlist count: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get waitlist count"
        )

@app.get("/api/brevo/status")
async def brevo_connection_status():
    """
    Check Brevo connection status
    
    Useful for monitoring and debugging
    """
    logger.info("Brevo status check requested")
    status = brevo_service.test_connection()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "brevo": status,
        "list_id": Config.BREVO_WAITLIST_ID
    }

# ============================================
# ERROR HANDLERS
# ============================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom handler for HTTP exceptions"""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Custom handler for unexpected exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal Server Error",
            "status_code": 500
        }
    )
    return {
        "success": False,
        "error": "An unexpected error occurred",
        "status_code": 500
    }

# ============================================
# MAIN
# ============================================
if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting Uvicorn server...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    )