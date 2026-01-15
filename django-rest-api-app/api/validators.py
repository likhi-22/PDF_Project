from django.core.exceptions import ValidationError
import mimetypes
from PIL import Image

def validate_pdf_file(value):
    """
    Validate that the uploaded file is a PDF.
    """
    if not value.name.lower().endswith('.pdf'):
        raise ValidationError('File must be a PDF.')

    # Check MIME type for additional validation
    mime_type, _ = mimetypes.guess_type(value.name)
    if mime_type != 'application/pdf':
        raise ValidationError('File must be a PDF.')

def validate_file_size(value):
    """
    Validate that the file size is within acceptable limits (100MB).
    """
    max_size = 100 * 1024 * 1024  # 100MB
    if value.size > max_size:
        raise ValidationError(f'File size must be less than {max_size / (1024 * 1024)} MB.')

def validate_image_file(value):
    """
    Validate that the uploaded file is an image.
    """
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    if not any(value.name.lower().endswith(ext) for ext in valid_extensions):
        raise ValidationError('File must be an image (jpg, jpeg, png, gif, bmp).')

    # Check MIME type
    mime_type, _ = mimetypes.guess_type(value.name)
    if not mime_type or not mime_type.startswith('image/'):
        raise ValidationError('File must be an image.')

def validate_image_dimensions(value):
    """
    Validate image dimensions (max 2000x2000 pixels).
    """
    try:
        img = Image.open(value)
        width, height = img.size
        max_dimension = 2000
        if width > max_dimension or height > max_dimension:
            raise ValidationError(f'Image dimensions must be less than {max_dimension}x{max_dimension} pixels.')
        img.close()
    except Exception:
        raise ValidationError('Invalid image file or unable to read dimensions.')