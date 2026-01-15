import os
import tempfile
import logging
from typing import Optional, Tuple
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

    def sign_pdf(self, pdf_path: str, signature_path: str, position: Optional[Tuple[float, float]] = None) -> bytes:
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
                self._sign_page(doc, page_num, signature_path, position)
                logger.debug(f"Signed page {page_num + 1}/{total_pages}")

            # Save to temporary file (ensure file is not held open on Windows)
            fd, tmp_path = tempfile.mkstemp(suffix='.pdf')
            os.close(fd)
            doc.save(tmp_path)

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

    def _sign_page(self, doc, page_num: int, signature_path: str, position: Optional[Tuple[float, float]] = None) -> None:
        """
        Sign a single page with the signature image.
        """
        page = doc.load_page(page_num)
        page_rect = page.rect

        # Calculate position
        if position is not None:
            # position is relative (0..1) from top-left corner
            x_rel, y_rel = position
            # Clamp values
            x_rel = max(0.0, min(1.0, x_rel))
            y_rel = max(0.0, min(1.0, y_rel))
            x = x_rel * page_rect.width
            y = y_rel * page_rect.height
            # Keep image fully in bounds
            x = min(max(0, x), max(0, page_rect.width - self.signature_width))
            y = min(max(0, y), max(0, page_rect.height - self.signature_height))
        else:
            # Default bottom-right with margin
            x = page_rect.width - self.signature_width - self.margin
            y = page_rect.height - self.signature_height - self.margin

        # Insert signature
        rect = fitz.Rect(x, y, x + self.signature_width, y + self.signature_height)
        page.insert_image(rect, filename=signature_path, keep_proportion=True)
