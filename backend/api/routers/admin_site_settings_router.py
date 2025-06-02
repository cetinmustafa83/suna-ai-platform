from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional

from prisma import Prisma
from prisma.models import SiteSetting as PrismaSiteSetting
# It's good practice to also import specific error types if you want to catch them precisely
from prisma.errors import PrismaError, RecordNotFoundError 

from schemas.admin_schemas import (
    SiteSettingCreate,
    SiteSettingUpdate,
    SiteSettingResponse
)
from utils.auth_utils import get_current_admin_user
from utils.logger import logger

router = APIRouter(
    prefix="/admin/site-settings",
    tags=["Admin - Site Settings"],
    dependencies=[Depends(get_current_admin_user)] # Apply admin auth to all routes in this router
)

prisma_client = Prisma(auto_register=True) # auto_register ensures it's available globally after first connect

@router.on_event("startup")
async def startup_prisma_client():
    logger.info("Connecting Prisma client for admin site settings router...")
    await prisma_client.connect()
    logger.info("Prisma client connected.")

@router.on_event("shutdown")
async def shutdown_prisma_client():
    if prisma_client.is_connected():
        logger.info("Disconnecting Prisma client for admin site settings router...")
        await prisma_client.disconnect()
        logger.info("Prisma client disconnected.")

@router.post("/", response_model=SiteSettingResponse, status_code=status.HTTP_201_CREATED)
async def create_site_setting(setting_data: SiteSettingCreate):
    """
    Create a new site setting.
    """
    try:
        logger.info(f"Attempting to create site setting with key: {setting_data.key}")
        new_setting = await PrismaSiteSetting.prisma().create(
            data={
                "key": setting_data.key,
                "value": setting_data.value
            }
        )
        logger.info(f"Successfully created site setting with ID: {new_setting.id}")
        return SiteSettingResponse.model_validate(new_setting) # Pydantic v2 way
    except PrismaError as e: # More specific error catching if possible, e.g. UniqueViolationError
        logger.error(f"PrismaError creating site setting {setting_data.key}: {e}")
        if "Unique constraint failed" in str(e): # Basic check for unique constraint
             raise HTTPException(status_code=409, detail=f"Site setting with key '{setting_data.key}' already exists.")
        raise HTTPException(status_code=500, detail=f"Error creating site setting: {e}")


@router.get("/", response_model=List[SiteSettingResponse])
async def list_site_settings():
    """
    List all site settings.
    """
    try:
        logger.info("Fetching all site settings.")
        settings = await PrismaSiteSetting.prisma().find_many(
            order={"createdAt": "asc"}
        )
        logger.info(f"Found {len(settings)} site settings.")
        return [SiteSettingResponse.model_validate(s) for s in settings]
    except PrismaError as e:
        logger.error(f"PrismaError listing site settings: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing site settings: {e}")

@router.get("/{key}", response_model=SiteSettingResponse)
async def get_site_setting_by_key(key: str):
    """
    Get a specific site setting by its key.
    """
    try:
        logger.info(f"Fetching site setting with key: {key}")
        setting = await PrismaSiteSetting.prisma().find_unique(where={"key": key})
        if not setting:
            logger.warn(f"Site setting with key '{key}' not found.")
            raise HTTPException(status_code=404, detail=f"Site setting with key '{key}' not found")
        logger.info(f"Successfully fetched site setting with key: {key}")
        return SiteSettingResponse.model_validate(setting)
    except RecordNotFoundError: # Prisma specific error for record not found on unique queries
        logger.warn(f"Site setting with key '{key}' not found (RecordNotFoundError).")
        raise HTTPException(status_code=404, detail=f"Site setting with key '{key}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError fetching site setting {key}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching site setting: {e}")


@router.put("/{key}", response_model=SiteSettingResponse)
async def update_site_setting_by_key(key: str, setting_data: SiteSettingUpdate):
    """
    Update a specific site setting by its key.
    """
    try:
        logger.info(f"Attempting to update site setting with key: {key}")
        updated_setting = await PrismaSiteSetting.prisma().update(
            where={"key": key},
            data={"value": setting_data.value} # Only value is updatable this way
        )
        if not updated_setting: # Should be caught by RecordNotFoundError by Prisma if key doesn't exist
            logger.warn(f"Update failed: Site setting with key '{key}' not found.")
            raise HTTPException(status_code=404, detail=f"Site setting with key '{key}' not found")
        logger.info(f"Successfully updated site setting with key: {key}")
        return SiteSettingResponse.model_validate(updated_setting)
    except RecordNotFoundError:
        logger.warn(f"Update failed: Site setting with key '{key}' not found (RecordNotFoundError).")
        raise HTTPException(status_code=404, detail=f"Site setting with key '{key}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError updating site setting {key}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating site setting: {e}")


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site_setting_by_key(key: str):
    """
    Delete a specific site setting by its key.
    """
    try:
        logger.info(f"Attempting to delete site setting with key: {key}")
        deleted_setting = await PrismaSiteSetting.prisma().delete(where={"key": key})
        if not deleted_setting: # Should be caught by RecordNotFoundError
            logger.warn(f"Deletion failed: Site setting with key '{key}' not found.")
            raise HTTPException(status_code=404, detail=f"Site setting with key '{key}' not found")
        logger.info(f"Successfully deleted site setting with key: {key}")
        return # Return None with 204 status
    except RecordNotFoundError:
        logger.warn(f"Deletion failed: Site setting with key '{key}' not found (RecordNotFoundError).")
        raise HTTPException(status_code=404, detail=f"Site setting with key '{key}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError deleting site setting {key}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting site setting: {e}")
