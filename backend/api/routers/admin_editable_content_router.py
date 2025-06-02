from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional

from prisma import Prisma
from prisma.models import EditableContent as PrismaEditableContent
from prisma.errors import PrismaError, RecordNotFoundError, UniqueViolationError

from schemas.admin_schemas import (
    EditableContentCreate,
    EditableContentUpdate,
    EditableContentResponse
)
from utils.auth_utils import get_current_admin_user
from utils.logger import logger

router = APIRouter(
    prefix="/admin/editable-content",
    tags=["Admin - Editable Content"],
    dependencies=[Depends(get_current_admin_user)]
)

prisma_client = Prisma(auto_register=True)

@router.on_event("startup")
async def startup_prisma_client():
    logger.info("Connecting Prisma client for admin editable content router...")
    await prisma_client.connect()
    logger.info("Prisma client connected.")

@router.on_event("shutdown")
async def shutdown_prisma_client():
    if prisma_client.is_connected():
        logger.info("Disconnecting Prisma client for admin editable content router...")
        await prisma_client.disconnect()
        logger.info("Prisma client disconnected.")

@router.post("/", response_model=EditableContentResponse, status_code=status.HTTP_201_CREATED)
async def create_editable_content(content_data: EditableContentCreate):
    """
    Create a new editable content block.
    """
    try:
        logger.info(f"Attempting to create content block for pageSlug: {content_data.pageSlug}, blockKey: {content_data.blockKey}")
        new_content = await PrismaEditableContent.prisma().create(
            data={
                "pageSlug": content_data.pageSlug,
                "blockKey": content_data.blockKey,
                "content": content_data.content,
                "contentType": content_data.contentType
            }
        )
        logger.info(f"Successfully created content block with ID: {new_content.id}")
        return EditableContentResponse.model_validate(new_content)
    except UniqueViolationError:
        logger.warn(f"Unique constraint violation for pageSlug: {content_data.pageSlug}, blockKey: {content_data.blockKey}")
        raise HTTPException(status_code=409, detail=f"Content block for pageSlug '{content_data.pageSlug}' and blockKey '{content_data.blockKey}' already exists.")
    except PrismaError as e:
        logger.error(f"PrismaError creating content block: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating content block: {e}")

@router.get("/", response_model=List[EditableContentResponse])
async def list_editable_content(pageSlug: Optional[str] = Query(None)):
    """
    List all editable content blocks, optionally filtered by pageSlug.
    """
    try:
        logger.info(f"Fetching editable content blocks. Filter by pageSlug: {pageSlug or 'None'}")
        find_many_args = {"order": {"createdAt": "asc"}}
        if pageSlug:
            find_many_args["where"] = {"pageSlug": pageSlug}
        
        contents = await PrismaEditableContent.prisma().find_many(**find_many_args)
        logger.info(f"Found {len(contents)} content blocks.")
        return [EditableContentResponse.model_validate(c) for c in contents]
    except PrismaError as e:
        logger.error(f"PrismaError listing content blocks: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing content blocks: {e}")

@router.get("/id/{content_id}", response_model=EditableContentResponse)
async def get_editable_content_by_id(content_id: str):
    """
    Get a specific editable content block by its ID.
    """
    try:
        logger.info(f"Fetching content block with ID: {content_id}")
        content = await PrismaEditableContent.prisma().find_unique(where={"id": content_id})
        if not content:
            logger.warn(f"Content block with ID '{content_id}' not found.")
            raise HTTPException(status_code=404, detail=f"Content block with ID '{content_id}' not found")
        logger.info(f"Successfully fetched content block ID: {content_id}")
        return EditableContentResponse.model_validate(content)
    except RecordNotFoundError:
        logger.warn(f"Content block with ID '{content_id}' not found (RecordNotFoundError).")
        raise HTTPException(status_code=404, detail=f"Content block with ID '{content_id}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError fetching content block ID {content_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching content block: {e}")

@router.get("/key/{page_slug}/{block_key}", response_model=EditableContentResponse)
async def get_editable_content_by_composite_key(page_slug: str, block_key: str):
    """
    Get a specific editable content block by pageSlug and blockKey.
    """
    try:
        logger.info(f"Fetching content block with pageSlug: {page_slug}, blockKey: {block_key}")
        content = await PrismaEditableContent.prisma().find_unique(
            where={"pageSlug_blockKey": {"pageSlug": page_slug, "blockKey": block_key}}
        )
        if not content:
            logger.warn(f"Content block for page '{page_slug}' key '{block_key}' not found.")
            raise HTTPException(status_code=404, detail=f"Content block for page '{page_slug}' key '{block_key}' not found")
        logger.info(f"Successfully fetched content block for page '{page_slug}' key '{block_key}'")
        return EditableContentResponse.model_validate(content)
    except RecordNotFoundError:
        logger.warn(f"Content block for page '{page_slug}' key '{block_key}' not found (RecordNotFoundError).")
        raise HTTPException(status_code=404, detail=f"Content block for page '{page_slug}' key '{block_key}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError fetching content block for page '{page_slug}' key '{block_key}': {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching content block: {e}")


@router.put("/id/{content_id}", response_model=EditableContentResponse)
async def update_editable_content_by_id(content_id: str, content_data: EditableContentUpdate):
    """
    Update a specific editable content block by its ID.
    pageSlug and blockKey cannot be updated via this endpoint.
    """
    try:
        logger.info(f"Attempting to update content block ID: {content_id}")
        update_payload = content_data.model_dump(exclude_unset=True)
        if not update_payload:
             raise HTTPException(status_code=400, detail="No fields to update.")

        updated_content = await PrismaEditableContent.prisma().update(
            where={"id": content_id},
            data=update_payload
        )
        # Prisma's update throws RecordNotFoundError if record doesn't exist
        logger.info(f"Successfully updated content block ID: {content_id}")
        return EditableContentResponse.model_validate(updated_content)
    except RecordNotFoundError:
        logger.warn(f"Update failed: Content block ID '{content_id}' not found.")
        raise HTTPException(status_code=404, detail=f"Content block with ID '{content_id}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError updating content block ID {content_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating content block: {e}")

@router.put("/key/{page_slug}/{block_key}", response_model=EditableContentResponse)
async def update_editable_content_by_composite_key(page_slug: str, block_key: str, content_data: EditableContentUpdate):
    """
    Update a specific editable content block by pageSlug and blockKey.
    """
    try:
        logger.info(f"Attempting to update content block for page '{page_slug}' key '{block_key}'")
        update_payload = content_data.model_dump(exclude_unset=True)
        if not update_payload:
             raise HTTPException(status_code=400, detail="No fields to update.")

        updated_content = await PrismaEditableContent.prisma().update(
            where={"pageSlug_blockKey": {"pageSlug": page_slug, "blockKey": block_key}},
            data=update_payload
        )
        logger.info(f"Successfully updated content block for page '{page_slug}' key '{block_key}'")
        return EditableContentResponse.model_validate(updated_content)
    except RecordNotFoundError:
        logger.warn(f"Update failed: Content block for page '{page_slug}' key '{block_key}' not found.")
        raise HTTPException(status_code=404, detail=f"Content block for page '{page_slug}' key '{block_key}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError updating content block for page '{page_slug}' key '{block_key}': {e}")
        raise HTTPException(status_code=500, detail=f"Error updating content block: {e}")


@router.delete("/id/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_editable_content_by_id(content_id: str):
    """
    Delete a specific editable content block by its ID.
    """
    try:
        logger.info(f"Attempting to delete content block ID: {content_id}")
        await PrismaEditableContent.prisma().delete(where={"id": content_id})
        logger.info(f"Successfully deleted content block ID: {content_id}")
        return
    except RecordNotFoundError:
        logger.warn(f"Deletion failed: Content block ID '{content_id}' not found.")
        raise HTTPException(status_code=404, detail=f"Content block ID '{content_id}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError deleting content block ID {content_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting content block: {e}")

@router.delete("/key/{page_slug}/{block_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_editable_content_by_composite_key(page_slug: str, block_key: str):
    """
    Delete a specific editable content block by pageSlug and blockKey.
    """
    try:
        logger.info(f"Attempting to delete content block for page '{page_slug}' key '{block_key}'")
        await PrismaEditableContent.prisma().delete(
            where={"pageSlug_blockKey": {"pageSlug": page_slug, "blockKey": block_key}}
        )
        logger.info(f"Successfully deleted content block for page '{page_slug}' key '{block_key}'")
        return
    except RecordNotFoundError:
        logger.warn(f"Deletion failed: Content block for page '{page_slug}' key '{block_key}' not found.")
        raise HTTPException(status_code=404, detail=f"Content block for page '{page_slug}' key '{block_key}' not found")
    except PrismaError as e:
        logger.error(f"PrismaError deleting content block for page '{page_slug}' key '{block_key}': {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting content block: {e}")
