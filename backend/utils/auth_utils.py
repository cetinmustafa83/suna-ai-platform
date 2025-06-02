import sentry
from fastapi import HTTPException, Request
from typing import Optional
import jwt
from jwt.exceptions import PyJWTError
import os # Keep for other potential os.getenv calls if any, or remove if unused
from utils.config import config # Import the centralized config

# --- Mock User Configuration ---
# MOCK_AUTH_ENABLED = os.getenv("MOCK_AUTH_ENABLED", "false").lower() == "true" # Now from config
MOCK_USER_ID = "mock-user-id-backend" # This can remain here or move to config if preferred
MOCK_ACCOUNT_ID = "mock-account-id-backend" # This can remain here or move to config

# This function extracts the user ID from Supabase JWT or returns mock ID
async def get_current_user_id_from_jwt(request: Request) -> str:
    """
    Extract and verify the user ID from the JWT in the Authorization header.
    If config.MOCK_AUTH_ENABLED is true, returns a mock user ID.
    """
    if config.MOCK_AUTH_ENABLED:
        sentry.sentry.set_user({ "id": MOCK_USER_ID })
        print(f"Mock auth enabled (via config), returning MOCK_USER_ID: {MOCK_USER_ID}")
        return MOCK_USER_ID

    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(
            status_code=401,
            detail="No valid authentication credentials found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get('sub')
        
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"}
            )

        sentry.sentry.set_user({ "id": user_id })
        return user_id
        
    except PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )

async def get_account_id_from_thread(client, thread_id: str) -> str:
    # If mock auth is enabled, we might want to return a mock account ID
    # or ensure this function is called in contexts where it makes sense.
    # For now, keeping original logic as it's data access.
    if config.MOCK_AUTH_ENABLED:
        print(f"Mock auth enabled (via config), returning MOCK_ACCOUNT_ID ('{MOCK_ACCOUNT_ID}') for thread {thread_id}")
        return MOCK_ACCOUNT_ID
    """
    Extract and verify the account ID from the thread.
    
    Args:
        client: The Supabase client (or compatible client if Supabase is removed)
        thread_id: The ID of the thread
        
    Returns:
        str: The account ID associated with the thread
        
    Raises:
        HTTPException: If the thread is not found or if there's an error
    """
    # This part will only be executed if MOCK_AUTH_ENABLED is false.
    # If Supabase client is fully removed, this will error.
    # This function would need a complete refactor for a non-Supabase backend.
    try:
        response = await client.table('threads').select('account_id').eq('thread_id', thread_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="Thread not found"
            )
        
        account_id = response.data[0].get('account_id')
        
        if not account_id:
            raise HTTPException(
                status_code=500,
                detail="Thread has no associated account"
            )
        
        return account_id
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving thread information: {str(e)}"
        )
    
async def get_user_id_from_stream_auth(
    request: Request,
    token: Optional[str] = None
) -> str:
    """
    Extract and verify the user ID from either the Authorization header or query parameter token.
    This function is specifically designed for streaming endpoints that need to support both
    header-based and query parameter-based authentication (for EventSource compatibility).
    If config.MOCK_AUTH_ENABLED is true, returns a mock user ID.
    """
    if config.MOCK_AUTH_ENABLED:
        sentry.sentry.set_user({ "id": MOCK_USER_ID })
        print(f"Mock auth enabled for stream (via config), returning MOCK_USER_ID: {MOCK_USER_ID}")
        return MOCK_USER_ID

    # Try to get user_id from token in query param (for EventSource which can't set headers)
    if token:
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get('sub')
            sentry.sentry.set_user({ "id": user_id })
            if user_id:
                return user_id
        except Exception:
            pass
    
    # If no valid token in query param, try to get it from the Authorization header
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        try:
            header_token = auth_header.split(' ')[1]
            payload = jwt.decode(header_token, options={"verify_signature": False})
            user_id = payload.get('sub')
            if user_id:
                return user_id
        except Exception:
            pass
    
    raise HTTPException(
        status_code=401,
        detail="No valid authentication credentials found",
        headers={"WWW-Authenticate": "Bearer"}
    )

async def verify_thread_access(client, thread_id: str, user_id: str):
    """
    Verify that a user has access to a specific thread based on account membership.
    If config.MOCK_AUTH_ENABLED is true and user_id matches MOCK_USER_ID, access is granted.
    """
    if config.MOCK_AUTH_ENABLED and user_id == MOCK_USER_ID:
        print(f"Mock auth enabled (via config), granting access to thread {thread_id} for MOCK_USER_ID")
        # Optionally, one could still check if the thread exists for a more realistic mock.
        # For now, permissive access for the mock user.
        return True

    # Original logic for non-mocked users or if more checks are desired
    thread_result = await client.table('threads').select('*,project_id').eq('thread_id', thread_id).execute()

    if not thread_result.data or len(thread_result.data) == 0:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread_data = thread_result.data[0]
    
    project_id = thread_data.get('project_id')
    if project_id:
        project_result = await client.table('projects').select('is_public').eq('project_id', project_id).execute()
        if project_result.data and len(project_result.data) > 0:
            if project_result.data[0].get('is_public'):
                return True
        
    account_id = thread_data.get('account_id')
    if account_id:
        account_user_result = await client.schema('basejump').from_('account_user').select('account_role').eq('user_id', user_id).eq('account_id', account_id).execute()
        if account_user_result.data and len(account_user_result.data) > 0:
            return True
            
    raise HTTPException(status_code=403, detail="Not authorized to access this thread")

async def get_optional_user_id(request: Request) -> Optional[str]:
    """
    Extract the user ID from the JWT in the Authorization header if present,
    but don't require authentication. Returns None if no valid token is found.
    If config.MOCK_AUTH_ENABLED is true, returns mock user ID if any auth header is present, 
    or None otherwise (to simulate optional presence).
    """
    auth_header = request.headers.get('Authorization')

    if config.MOCK_AUTH_ENABLED:
        # If mock auth is on, and there's *any* auth header, assume it's the mock user.
        # If no auth header, then it's truly optional, return None.
        if auth_header:
            sentry.sentry.set_user({ "id": MOCK_USER_ID })
            print(f"Mock auth enabled (optional, via config), returning MOCK_USER_ID due to presence of auth header.")
            return MOCK_USER_ID
        return None
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get('sub')
        # sentry.sentry.set_user({ "id": user_id }) # Sentry for optional user might be too noisy
        return user_id
    except PyJWTError:
        return None

async def get_current_admin_user(request: Request) -> str:
    """
    Ensures the current user is the designated mock admin user.
    This is a simple auth check for admin-only routes during local/mock development.
    It relies on MOCK_AUTH_ENABLED being true and the user ID matching the admin's MOCK_USER_ID.
    """
    if not config.MOCK_AUTH_ENABLED:
        logger.warning("Admin endpoint accessed while MOCK_AUTH_ENABLED is false. Denying access.")
        raise HTTPException(
            status_code=403,
            detail="Admin access disabled: Mock auth is not enabled."
        )

    user_id = await get_current_user_id_from_jwt(request) # This will return MOCK_USER_ID if mock auth is on

    if user_id == config.MOCK_USER_ID: # config.MOCK_USER_ID is the designated admin user ID in mock mode
        logger.info(f"Admin access granted for user: {user_id}")
        return user_id
    else:
        # This case should ideally not be reached if MOCK_AUTH_ENABLED=true,
        # as get_current_user_id_from_jwt should return MOCK_USER_ID.
        # But as a safeguard:
        logger.warning(f"Admin access denied for user: {user_id}. Expected admin ID: {config.MOCK_USER_ID}")
        raise HTTPException(
            status_code=403,
            detail="Not authorized for admin access."
        )
