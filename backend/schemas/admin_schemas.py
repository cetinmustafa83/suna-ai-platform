from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SiteSettingBase(BaseModel):
    key: str
    value: Optional[str] = None

class SiteSettingCreate(SiteSettingBase):
    pass

class SiteSettingUpdate(BaseModel): # For PUT, allow partial updates, key is not updatable via this
    value: Optional[str] = None

class SiteSettingResponse(SiteSettingBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        orm_mode = True # For Prisma model compatibility, though might be `from_attributes` in Pydantic v2
        # Pydantic V2 uses from_attributes instead of orm_mode
        # if hasattr(BaseModel, 'model_config') and 'from_attributes' in BaseModel.model_config:
        #     model_config = {'from_attributes': True}
        # else:
        #     orm_mode = True
        # For prisma-client-py, orm_mode is still often used or examples show it.
        # If issues arise, switch to from_attributes for Pydantic v2.
        # For now, sticking to orm_mode as it's common in prisma-client-py examples.
        # Let's ensure it works or adjust if generation/runtime complains.

# It seems prisma-client-py uses model_validate with from_orm=True, so orm_mode is correct.
# Let's try to make it more robust for Pydantic V2 if possible without breaking V1 compatibility too much
# For Pydantic v2, orm_mode is replaced by from_attributes = True in model_config
# However, prisma-client-py might still expect orm_mode.
# Let's stick to orm_mode for now as per many prisma-client-py examples.
# If there's an issue, it will likely be during testing the endpoint.

# A more Pydantic v2 friendly way for orm_mode:
# class Config:
#   from_attributes = True

# For SiteSettingResponse, we need to ensure it can be created from the Prisma model.
# The orm_mode = True (or from_attributes = True in Pydantic v2) handles this.
# Prisma typically returns datetime objects, Pydantic will handle serialization.


# --- EditableContent Schemas ---

class EditableContentBase(BaseModel):
    pageSlug: str
    blockKey: str
    content: str
    contentType: str = "text" # Default to "text"

class EditableContentCreate(EditableContentBase):
    pass

class EditableContentUpdate(BaseModel):
    content: Optional[str] = None
    contentType: Optional[str] = None

class EditableContentResponse(EditableContentBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        orm_mode = True


# --- PageSEO Schemas ---

class PageSEOBase(BaseModel):
    pageSlug: str
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[str] = None # Comma-separated

class PageSEOCreate(PageSEOBase):
    pass

class PageSEOUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[str] = None

class PageSEOResponse(PageSEOBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        orm_mode = True
