# API Integration Guide

This document describes the API integration between the React frontend and Django REST Framework backend.

## Configuration

### Environment Variables

Create a `.env` file in the `Frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

For production, update this to your production API URL:
```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## API Endpoints

### Base URL
- Development: `http://localhost:8000/api`
- The base URL should point to the Django REST Framework API root

### Endpoints

#### 1. Upload PDF Document
- **Endpoint**: `POST /api/documents/`
- **Content-Type**: `multipart/form-data`
- **Body**: FormData with field `original_pdf` (File)
- **Response**: Document object with `id`, `original_pdf`, `file_size`, `page_count`, `uploaded_at`
- **Usage**: Used in `PDFUpload` component

#### 2. Upload Signature Image
- **Endpoint**: `POST /api/signatures/`
- **Content-Type**: `multipart/form-data`
- **Body**: FormData with field `image_file` (File)
- **Response**: Signature object with `id`, `image_file`, `uploaded_at`
- **Usage**: Used in `SignatureUpload` component

#### 3. Sign PDF Document
- **Endpoint**: `POST /api/signed-documents/`
- **Content-Type**: `application/json`
- **Body**: 
  ```json
  {
    "original_document": "document-uuid",
    "signature": "signature-uuid"
  }
  ```
- **Response**: SignedDocument object with `id`, `original_document`, `signature`, `signed_pdf`, `signed_at`
- **Usage**: Used in `ApplicationSection` component after both PDF and signature are uploaded

#### 4. Download Signed PDF
- **Endpoint**: `GET /media/signed_documents/{filename}`
- **Note**: Media files are served directly, not through `/api/`
- **Response**: PDF blob
- **Usage**: Used for downloading the signed PDF file

## API Service Layer

The API service (`src/services/api.ts`) provides:

### Methods

1. **uploadPDF(file, onProgress)**: Upload PDF with progress tracking
2. **uploadSignature(file, onProgress)**: Upload signature image with progress
3. **signPDF(documentId, signatureId)**: Sign PDF using uploaded document and signature
4. **downloadSignedPDF(signedPdfPath)**: Download signed PDF as blob
5. **getMediaUrl(path)**: Convert Django media path to full URL

### Error Handling

The API service includes centralized error handling:
- Network errors
- HTTP status code errors (400, 401, 403, 404, 413, 415, 500, 503)
- Django REST Framework validation errors
- Custom error messages for each scenario

### TypeScript Types

All API responses are typed:
- `Document`: PDF document object
- `Signature`: Signature image object
- `SignedDocument`: Signed document object
- `ApiError`: Error response format
- `UploadProgress`: Progress tracking format

## Component Integration

### PDFUpload Component
- Uses `apiService.uploadPDF()` with progress callbacks
- Displays upload progress bar
- Shows success/error states with toasts
- Validates file before upload (type, size)

### SignatureUpload Component
- Uses `apiService.uploadSignature()` with progress callbacks
- Previews uploaded image
- Validates image format and size
- Handles upload errors gracefully

### ApplicationSection Component
- Manages workflow: Upload PDF → Upload Signature → Sign → Download
- Stores document and signature IDs from API responses
- Uses `apiService.signPDF()` to create signed document
- Uses `apiService.downloadSignedPDF()` for file download
- Handles all error states with user-friendly messages

## Media File Handling

Django serves media files at `/media/` path (not `/api/media/`). The API service automatically:
- Converts relative paths like `/media/signed_documents/file.pdf` to full URLs
- Handles both development and production base URLs
- Uses a separate axios instance for media file downloads to bypass the `/api/` base path

## CORS Configuration

Ensure Django backend has CORS properly configured in `settings/base.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative dev server
    # Add production frontend URL
]

CORS_ALLOW_CREDENTIALS = True
```

## Error States

The application handles various error scenarios:

1. **Network Errors**: Shows "Network error. Please check your connection."
2. **Validation Errors**: Displays field-specific error messages
3. **File Size Errors**: Shows "File too large" with size limit
4. **File Type Errors**: Shows "Unsupported file type"
5. **Server Errors**: Shows "Server error. Please try again later."

## Testing the Integration

1. Start Django backend:
   ```bash
   cd PDF_Project/django-rest-api-app
   python manage.py runserver
   ```

2. Start React frontend:
   ```bash
   cd PDF_Project/Frontend
   npm run dev
   ```

3. Test workflow:
   - Upload a PDF (should see progress and success message)
   - Upload a signature image (should see preview)
   - Sign PDF (should see progress and completion)
   - Download signed PDF (should trigger download)

## Troubleshooting

### CORS Errors
- Check Django CORS settings
- Ensure frontend URL is in `CORS_ALLOWED_ORIGINS`
- Verify `CORS_ALLOW_CREDENTIALS = True`

### Media Files Not Loading
- Verify `MEDIA_URL` and `MEDIA_ROOT` in Django settings
- Check that media files are being served in development
- Verify the `getMediaUrl()` function converts paths correctly

### API Connection Errors
- Verify `VITE_API_BASE_URL` in `.env` file
- Check Django server is running
- Verify API endpoints are accessible at `/api/`

### Upload Timeout Errors
- Increase timeout in `api.ts` (currently 120 seconds for PDFs, 60 for signatures)
- For very large files, may need to adjust Django `FILE_UPLOAD_MAX_MEMORY_SIZE`
