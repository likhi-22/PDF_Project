import os
import tempfile
import logging
from typing import Optional
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
import fitz  # PyMuPDF

logger = logging.getLogger('api.pdf_processing')

class PDFSigningService:
    """
    Service for signing PDFs with images.
    Handles memory-efficient processing and error handling.
    """

    def __init__(self, signature_width: int = 150, signature_height: int = 75, margin: int = 50):
        self.signature_width = signature_width
        self.signature_height = signature_height
        self.margin = margin

    def sign_pdf(self, pdf_path: str, signature_path: str) -> bytes:
        """
        Sign a PDF with a signature image on every page.

        Args:
            pdf_path: Path to the input PDF file
            signature_path: Path to the signature image file

        Returns:
            bytes: Signed PDF content

        Raises:
            ValidationError: If signing fails
        """
        logger.info(f"Starting PDF signing: PDF={pdf_path}, Signature={signature_path}")

        doc = None
        tmp_path = None

        try:
            # Open the PDF document
            doc = fitz.open(pdf_path)
            total_pages = len(doc)
            logger.info(f"Opened PDF with {total_pages} pages")

            # Process each page
            for page_num in range(total_pages):
                self._sign_page(doc, page_num, signature_path)
                logger.debug(f"Signed page {page_num + 1}/{total_pages}")

            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                doc.save(tmp_file.name)
                tmp_path = tmp_file.name

            # Read the signed PDF content
            with open(tmp_path, 'rb') as f:
                signed_content = f.read()

            logger.info(f"PDF signing completed successfully, output size: {len(signed_content)} bytes")
            return signed_content

        except Exception as e:
            logger.error(f"PDF signing failed: {str(e)}")
            raise ValidationError(f"Failed to sign PDF: {str(e)}")

        finally:
            # Cleanup resources
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except OSError:
                    logger.warning(f"Failed to cleanup temporary file: {tmp_path}")

            if doc:
                try:
                    doc.close()
                except Exception:
                    logger.warning("Failed to close PDF document")

    def _sign_page(self, doc, page_num: int, signature_path: str) -> None:
        """
        Sign a single page with the signature image.
        """
        page = doc.load_page(page_num)
        page_rect = page.rect

        # Calculate position (bottom-right)
        x = page_rect.width - self.signature_width - self.margin
        y = page_rect.height - self.signature_height - self.margin

        # Insert signature
        rect = fitz.Rect(x, y, x + self.signature_width, y + self.signature_height)
        page.insert_image(rect, filename=signature_path, keep_proportion=True)