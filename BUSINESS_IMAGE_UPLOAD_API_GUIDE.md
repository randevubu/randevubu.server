# Business Image Upload API Guide

This guide explains how to implement business image upload functionality in the frontend application using the available API endpoints.

## Overview

The business image system supports 4 types of images:
- **Logo**: Business logo image
- **Cover**: Business cover/banner image  
- **Profile**: Business profile image
- **Gallery**: Multiple gallery images (max 10)

## API Endpoints

### Base URL
```
http://localhost:3001/api/v1/businesses/{businessId}/images
```

All endpoints require authentication with a valid JWT token in the Authorization header.

---

## 1. Upload Business Image

**Endpoint:** `POST /api/v1/businesses/{businessId}/images/upload`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Request Body:**
- `image` (file): The image file to upload
- `imageType` (string): Type of image - one of: `logo`, `cover`, `profile`, `gallery`

### Frontend Implementation Example:

```javascript
// Upload business logo
async function uploadBusinessLogo(businessId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('imageType', 'logo');

  try {
    const response = await fetch(`/api/v1/businesses/${businessId}/images/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Logo uploaded successfully:', result.data.imageUrl);
      return result.data;
    } else {
      throw new Error(result.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Usage
const fileInput = document.getElementById('logo-input');
const file = fileInput.files[0];
uploadBusinessLogo('business-id-here', file);
```

### React Hook Example:

```tsx
import { useState } from 'react';

interface UploadResult {
  imageUrl: string;
  business?: any;
}

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (
    businessId: string, 
    file: File, 
    imageType: 'logo' | 'cover' | 'profile' | 'gallery'
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('imageType', imageType);

    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading, error };
};

// Component usage
function BusinessImageUpload({ businessId }: { businessId: string }) {
  const { uploadImage, uploading, error } = useImageUpload();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, imageType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadImage(businessId, file, imageType as any);
    if (result) {
      console.log('Image uploaded:', result.imageUrl);
      // Update your state/UI with the new image URL
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => handleFileChange(e, 'logo')}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}
```

---

## 2. Get Business Images

**Endpoint:** `GET /api/v1/businesses/{businessId}/images`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "data": {
    "images": {
      "logoUrl": "https://bucket.s3.amazonaws.com/businesses/biz_123/logo/image.jpg",
      "coverImageUrl": "https://bucket.s3.amazonaws.com/businesses/biz_123/cover/image.jpg", 
      "profileImageUrl": "https://bucket.s3.amazonaws.com/businesses/biz_123/profile/image.jpg",
      "galleryImages": [
        "https://bucket.s3.amazonaws.com/businesses/biz_123/gallery/image1.jpg",
        "https://bucket.s3.amazonaws.com/businesses/biz_123/gallery/image2.jpg"
      ]
    }
  }
}
```

### Frontend Implementation:

```javascript
async function getBusinessImages(businessId) {
  try {
    const response = await fetch(`/api/v1/businesses/${businessId}/images`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      return result.data.images;
    } else {
      throw new Error(result.message || 'Failed to fetch images');
    }
  } catch (error) {
    console.error('Error fetching images:', error);
    throw error;
  }
}
```

---

## 3. Delete Business Image

**Endpoint:** `DELETE /api/v1/businesses/{businessId}/images/{imageType}`

**Authentication:** Required (Bearer token)

**Parameters:**
- `imageType`: One of `logo`, `cover`, `profile`

### Frontend Implementation:

```javascript
async function deleteBusinessImage(businessId, imageType) {
  try {
    const response = await fetch(`/api/v1/businesses/${businessId}/images/${imageType}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`${imageType} image deleted successfully`);
      return result.data.business;
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

// Usage
deleteBusinessImage('business-id-here', 'logo');
```

---

## 4. Delete Gallery Image

**Endpoint:** `DELETE /api/v1/businesses/{businessId}/images/gallery`

**Authentication:** Required (Bearer token)

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "imageUrl": "https://bucket.s3.amazonaws.com/businesses/biz_123/gallery/image1.jpg"
}
```

### Frontend Implementation:

```javascript
async function deleteGalleryImage(businessId, imageUrl) {
  try {
    const response = await fetch(`/api/v1/businesses/${businessId}/images/gallery`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageUrl })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Gallery image deleted successfully');
      return result.data.business;
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}
```

---

## 5. Update Gallery Images Order

**Endpoint:** `PUT /api/v1/businesses/{businessId}/images/gallery`

**Authentication:** Required (Bearer token)

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "imageUrls": [
    "https://bucket.s3.amazonaws.com/businesses/biz_123/gallery/image2.jpg",
    "https://bucket.s3.amazonaws.com/businesses/biz_123/gallery/image1.jpg",
    "https://bucket.s3.amazonaws.com/businesses/biz_123/gallery/image3.jpg"
  ]
}
```

### Frontend Implementation:

```javascript
async function updateGalleryOrder(businessId, orderedImageUrls) {
  try {
    const response = await fetch(`/api/v1/businesses/${businessId}/images/gallery`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageUrls: orderedImageUrls })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Gallery order updated successfully');
      return result.data.business;
    } else {
      throw new Error(result.message || 'Update failed');
    }
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
}
```

---

## Image Validation Rules

### File Types
- ✅ JPEG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ WebP (`.webp`)
- ✅ GIF (`.gif`)

### File Size
- **Maximum:** 5MB per image

### Gallery Limits
- **Maximum:** 10 images in gallery

### HTML Input Attributes
```html
<input 
  type="file" 
  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
  max-size="5242880"
/>
```

---

## Error Handling

### Common Error Responses

**File too large:**
```json
{
  "success": false,
  "error": "FILE_TOO_LARGE",
  "message": "File size too large. Maximum allowed size is 5MB."
}
```

**Invalid file type:**
```json
{
  "success": false,
  "error": "INVALID_FILE_TYPE", 
  "message": "Invalid file type. Only JPEG, PNG, WebP and GIF images are allowed."
}
```

**No file provided:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "No image file provided"
}
```

**Unauthorized:**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Access denied: You do not have permission to update this business"
}
```

**Gallery limit exceeded:**
```json
{
  "success": false,
  "error": "GALLERY_LIMIT_EXCEEDED",
  "message": "Maximum 10 gallery images allowed"
}
```

---

## Complete React Component Example

```tsx
import React, { useState, useEffect } from 'react';

interface BusinessImages {
  logoUrl: string | null;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
  galleryImages: string[];
}

interface BusinessImageManagerProps {
  businessId: string;
  authToken: string;
}

export const BusinessImageManager: React.FC<BusinessImageManagerProps> = ({ 
  businessId, 
  authToken 
}) => {
  const [images, setImages] = useState<BusinessImages | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current images
  const fetchImages = async () => {
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/images`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const result = await response.json();
      if (response.ok) {
        setImages(result.data.images);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
    }
  };

  // Upload image
  const uploadImage = async (file: File, imageType: string) => {
    setUploading(imageType);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('imageType', imageType);

    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/images/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        await fetchImages(); // Refresh images
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed');
    } finally {
      setUploading(null);
    }
  };

  // Delete image
  const deleteImage = async (imageType: string) => {
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/images/${imageType}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        await fetchImages(); // Refresh images
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Delete gallery image
  const deleteGalleryImage = async (imageUrl: string) => {
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/images/gallery`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl })
      });

      if (response.ok) {
        await fetchImages(); // Refresh images
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [businessId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, imageType: string) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file, imageType);
    }
  };

  if (!images) return <div>Loading...</div>;

  return (
    <div className="business-image-manager">
      <h2>Business Images</h2>
      
      {error && <div className="error">{error}</div>}

      {/* Logo */}
      <div className="image-section">
        <h3>Logo</h3>
        {images.logoUrl ? (
          <div>
            <img src={images.logoUrl} alt="Logo" width="200" />
            <button onClick={() => deleteImage('logo')}>Delete Logo</button>
          </div>
        ) : (
          <p>No logo uploaded</p>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFileChange(e, 'logo')}
          disabled={uploading === 'logo'}
        />
        {uploading === 'logo' && <p>Uploading logo...</p>}
      </div>

      {/* Cover */}
      <div className="image-section">
        <h3>Cover Image</h3>
        {images.coverImageUrl ? (
          <div>
            <img src={images.coverImageUrl} alt="Cover" width="400" />
            <button onClick={() => deleteImage('cover')}>Delete Cover</button>
          </div>
        ) : (
          <p>No cover image uploaded</p>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFileChange(e, 'cover')}
          disabled={uploading === 'cover'}
        />
        {uploading === 'cover' && <p>Uploading cover...</p>}
      </div>

      {/* Profile */}
      <div className="image-section">
        <h3>Profile Image</h3>
        {images.profileImageUrl ? (
          <div>
            <img src={images.profileImageUrl} alt="Profile" width="200" />
            <button onClick={() => deleteImage('profile')}>Delete Profile</button>
          </div>
        ) : (
          <p>No profile image uploaded</p>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFileChange(e, 'profile')}
          disabled={uploading === 'profile'}
        />
        {uploading === 'profile' && <p>Uploading profile...</p>}
      </div>

      {/* Gallery */}
      <div className="image-section">
        <h3>Gallery ({images.galleryImages.length}/10)</h3>
        <div className="gallery-grid">
          {images.galleryImages.map((imageUrl, index) => (
            <div key={index} className="gallery-item">
              <img src={imageUrl} alt={`Gallery ${index + 1}`} width="150" />
              <button onClick={() => deleteGalleryImage(imageUrl)}>Delete</button>
            </div>
          ))}
        </div>
        {images.galleryImages.length < 10 && (
          <>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleFileChange(e, 'gallery')}
              disabled={uploading === 'gallery'}
            />
            {uploading === 'gallery' && <p>Uploading to gallery...</p>}
          </>
        )}
      </div>
    </div>
  );
};
```

---

## Testing the API

You can test the API using the Swagger documentation at:
**http://localhost:3001/api-docs**

Or use curl commands:

```bash
# Upload logo
curl -X POST "http://localhost:3001/api/v1/businesses/YOUR_BUSINESS_ID/images/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/logo.jpg" \
  -F "imageType=logo"

# Get images
curl -X GET "http://localhost:3001/api/v1/businesses/YOUR_BUSINESS_ID/images" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Delete logo  
curl -X DELETE "http://localhost:3001/api/v1/businesses/YOUR_BUSINESS_ID/images/logo" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

1. **Authentication Required**: All endpoints require a valid JWT token
2. **Business Access**: Users must have appropriate permissions for the business
3. **File Storage**: Images are stored in AWS S3 and URLs are returned
4. **Automatic Cleanup**: When images are deleted, they are removed from both database and S3
5. **Image Processing**: Images are uploaded as-is (no automatic resizing/optimization)
6. **CORS**: Make sure your frontend domain is configured in CORS settings

This API provides complete image management functionality for businesses. Use the provided code examples as starting points for your frontend implementation!