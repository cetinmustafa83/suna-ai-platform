"""
Utility functions for handling image operations.
"""

import base64
import uuid
from datetime import datetime
from utils.logger import logger
# from services.supabase import DBConnection # Removed Supabase
from utils.config import config # To check MOCK_AUTH_ENABLED or ENV_MODE

async def upload_base64_image(base64_data: str, bucket_name: str = "browser-screenshots") -> str:
    """
    Upload a base64 encoded image.
    If in mock/local mode without a Supabase client, returns a mock URL.
    Otherwise, would attempt to upload to a configured storage (original was Supabase).
    """
    if config.MOCK_AUTH_ENABLED: # Or a more specific check if storage is being mocked
        logger.info(f"Mock mode: Simulating image upload to bucket {bucket_name}.")
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        filename = f"image_{timestamp}_{unique_id}.png"
        mock_url = f"https://mockstorage.example.com/{bucket_name}/{filename}"
        logger.debug(f"Mock upload: Returning URL {mock_url}")
        return mock_url

    # Original logic would be here. Since DBConnection from services.supabase is removed,
    # this part will error if called when MOCK_AUTH_ENABLED is false, unless
    # DBConnection is replaced by another storage service client.
    # For now, to prevent crashes if this function is still called,
    # we'll raise an explicit error indicating storage backend is missing.
    logger.error("upload_base64_image: No storage backend configured for non-mock mode after Supabase removal.")
    raise NotImplementedError("Storage backend not configured for image uploads after Supabase removal.")

    # try:
    #     # Remove data URL prefix if present
    #     if base64_data.startswith('data:'):
    #         base64_data = base64_data.split(',')[1]

    #     # Decode base64 data
    #     image_data = base64.b64decode(base64_data)

    #     # Generate unique filename
    #     timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    #     unique_id = str(uuid.uuid4())[:8]
    #     filename = f"image_{timestamp}_{unique_id}.png"
        
    #     # This part needs a new storage client if not using Supabase
    #     # db = DBConnection()
    #     # client = await db.client
    #     # storage_response = await client.storage.from_(bucket_name).upload(
    #     #     filename,
    #     #     image_data,
    #     #     {"content-type": "image/png"}
    #     # )
        
    #     # # Get public URL
    #     # public_url = await client.storage.from_(bucket_name).get_public_url(filename)
        
    #     # logger.debug(f"Successfully uploaded image to {public_url}")
    #     # return public_url
    #     raise NotImplementedError("Supabase storage client removed; new storage backend needed.")
        
    # except Exception as e:
    #     logger.error(f"Error uploading base64 image: {e}")
    #     raise RuntimeError(f"Failed to upload image: {str(e)}")