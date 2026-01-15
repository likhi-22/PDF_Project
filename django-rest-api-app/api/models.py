from django.db import models
import uuid
from .validators import validate_pdf_file, validate_file_size, validate_image_file

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_pdf = models.FileField(
        upload_to='documents/',
        validators=[validate_pdf_file, validate_file_size]
    )
    file_size = models.PositiveIntegerField()
    page_count = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Document {self.id}"

    def get_file_url(self):
        """Get the absolute URL for the PDF file."""
        return self.original_pdf.url

    def get_file_path(self):
        """Get the file system path for the PDF."""
        return self.original_pdf.path

class Signature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_file = models.ImageField(
        upload_to='signatures/',
        validators=[validate_image_file, validate_file_size]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Signature {self.id}"

    def get_file_url(self):
        """Get the absolute URL for the signature image."""
        return self.image_file.url

    def get_file_path(self):
        """Get the file system path for the signature image."""
        return self.image_file.path

class SignedDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_document = models.ForeignKey(Document, on_delete=models.CASCADE)
    signature = models.ForeignKey(Signature, on_delete=models.CASCADE)
    signed_pdf = models.FileField(
        upload_to='signed_documents/',
        validators=[validate_pdf_file, validate_file_size]
    )
    signed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['signed_at']),
            models.Index(fields=['original_document']),
            models.Index(fields=['signature']),
        ]
        ordering = ['-signed_at']

    def __str__(self):
        return f"Signed Document {self.id}"

    def get_file_url(self):
        """Get the absolute URL for the signed PDF."""
        return self.signed_pdf.url

    def get_file_path(self):
        """Get the file system path for the signed PDF."""
        return self.signed_pdf.path