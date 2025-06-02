from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional

from prisma import Prisma
from prisma.models import PageSEO as PrismaPageSEO
from prisma.errors import PrismaError, RecordNotFoundError, UniqueViolationError

from schemas.admin_schemas import (
    PageSEOCreate,
    PageSEOUpdate,
    PageSEOResponse
)
from utils.auth_utils import get_current_admin_user
from utils.logger import logger

router = APIRouter(
    prefix="/admin/page-seo",
    tags=["Admin - Page SEO"],
    dependencies=[Depends(get_current_admin_user)]
)

prisma_client = Prisma(auto_register=True)

@router.on_event("startup")
async def startup_prisma_client():
    logger.info("Connecting Prisma client for admin page SEO router...")
    await prisma_client.connect()
    logger.info("Prisma client connected.")

@router.on_event("shutdown")
async def shutdown_prisma_client():
    if prisma_client.is_connected():
        logger.info("Disconnecting Prisma client for admin page SEO router...")
        await prisma_client.disconnect()
        logger.info("Prisma client disconnected.")

@router.post("/", response_model=PageSEOResponse, status_code=status.HTTP_201_CREATED)
async def create_page_seo_entry(seo_data: PageSEOCreate):
    """
    Create a new PageSEO entry.
    """
    try:
        logger.info(f"Attempting to create PageSEO entry for pageSlug: {seo_data.pageSlug}")
        new_seo_entry = await PrismaPageSEO.prisma().create(
            data=seo_data.model_dump()
        )
        logger.info(f"Successfully created PageSEO entry with ID: {new_seo_entry.id}")
        return PageSEOResponse.model_validate(new_seo_entry)
    except UniqueViolationError:
        logger.warn(f"Unique constraint violation for PageSEO pageSlug: {seo_data.pageSlug}")
        raise HTTPException(status_code=409, detail=f"PageSEO entry for pageSlug '{seo_data.pageSlug}' already exists.")
    except PrismaError as e:
        logger.error(f"PrismaError creating PageSEO entry: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating PageSEO entry: {e}")

@router.get("/", response_model=List[PageSEOResponse])
async def list_page_seo_entries():
    """
    List all PageSEO entries.
    """
    try:
        logger.info("Fetching all PageSEO entries.")
        seo_entries = await PrismaPageSEO.prisma().find_many(
            order={"createdAt": "asc"}
        )
        logger.info(f"Found {len(seo_entries)} PageSEO entries.")
        return [PageSEOResponse.model_validate(s) for s in seo_entries]
    except PrismaError as e:
        logger.error(f"PrismaError listing PageSEO entries: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing PageSEO entries: {e}")

@router.get("/{page_slug}", response_model=PageSEOResponse)
async def get_page_seo_by_slug(page_slug: str):
    """
    Get a specific PageSEO entry by its pageSlug.
    """
    try:
        logger.info(f"Fetching PageSEO entry with pageSlug: {page_slug}")
        seo_entry = await PrismaPageSEO.prisma().find_unique(where={"pageSlug": page_slug})
        if not seo_entry:
            logger.warn(f"PageSEO entry with pageSlug '{page_slug}' not found.")
            raise HTTPException(status_code=404, detail=f"PageSEO entry with pageSlug '{page_slug}' not found")
        logger.info(f"Successfully fetched PageSEO entry for pageSlug: {page_slug}")
        return PageSEOResponse.model_validate(seo_entry)
    except RecordNotFoundError:
        logger.warn(f"PageSEO entry with pageSlug '{page_slug}' not found (RecordNotFoundError).")
        raise HTTPException(status_code=404, detail=f"PageSEO entry with pageSlug '{page_slug}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError fetching PageSEO entry for {page_slug}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching PageSEO entry: {e}")


@router.put("/{page_slug}", response_model=PageSEOResponse)
async def update_page_seo_by_slug(page_slug: str, seo_data: PageSEOUpdate):
    """
    Update a specific PageSEO entry by its pageSlug.
    pageSlug itself cannot be updated.
    """
    try:
        logger.info(f"Attempting to update PageSEO entry for pageSlug: {page_slug}")
        update_payload = seo_data.model_dump(exclude_unset=True)
        if not update_payload:
             raise HTTPException(status_code=400, detail="No fields to update.")

        updated_seo_entry = await PrismaPageSEO.prisma().update(
            where={"pageSlug": page_slug},
            data=update_payload
        )
        # Prisma's update throws RecordNotFoundError if record doesn't exist
        logger.info(f"Successfully updated PageSEO entry for pageSlug: {page_slug}")
        return PageSEOResponse.model_validate(updated_seo_entry)
    except RecordNotFoundError:
        logger.warn(f"Update failed: PageSEO entry for pageSlug '{page_slug}' not found.")
        raise HTTPException(status_code=404, detail=f"PageSEO entry for pageSlug '{page_slug}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError updating PageSEO entry for {page_slug}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating PageSEO entry: {e}")


@router.delete("/{page_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page_seo_by_slug(page_slug: str):
    """
    Delete a specific PageSEO entry by its pageSlug.
    """
    try:
        logger.info(f"Attempting to delete PageSEO entry for pageSlug: {page_slug}")
        await PrismaPageSEO.prisma().delete(where={"pageSlug": page_slug})
        logger.info(f"Successfully deleted PageSEO entry for pageSlug: {page_slug}")
        return
    except RecordNotFoundError:
        logger.warn(f"Deletion failed: PageSEO entry for pageSlug '{page_slug}' not found.")
        raise HTTPException(status_code=404, detail=f"PageSEO entry for pageSlug '{page_slug}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError deleting PageSEO entry for {page_slug}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting PageSEO entry: {e}")

# --- Public GET Endpoint (No Admin Auth Required) ---

@router.get("/public/{page_slug}", response_model=PageSEOResponse, tags=["Public SEO"])
async def public_get_page_seo_by_slug(page_slug: str):
    """
    Get a specific public PageSEO entry by its pageSlug.
    """
    try:
        logger.info(f"Public fetch for PageSEO entry with pageSlug: {page_slug}")
        seo_entry = await PrismaPageSEO.prisma().find_unique(where={"pageSlug": page_slug})
        if not seo_entry:
            logger.warn(f"Public PageSEO entry with pageSlug '{page_slug}' not found.")
            # For public consumption, typically we might return a 404 or an empty/default object.
            # Raising 404 is fine if the frontend is prepared to handle it (e.g., use defaults).
            raise HTTPException(status_code=404, detail=f"PageSEO entry with pageSlug '{page_slug}' not found")
        logger.info(f"Successfully fetched public PageSEO entry for pageSlug: {page_slug}")
        return PageSEOResponse.model_validate(seo_entry)
    except RecordNotFoundError: # Should be caught by the check above
        logger.warn(f"Public PageSEO entry with pageSlug '{page_slug}' not found (RecordNotFoundError).")
        raise HTTPException(status_code=404, detail=f"PageSEO entry with pageSlug '{page_slug}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError fetching public PageSEO entry for {page_slug}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching public PageSEO entry: {e}")
