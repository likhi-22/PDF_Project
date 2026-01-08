from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from .models import Document, Signature, SignedDocument
from .serializers import DocumentSerializer, SignatureSerializer, SignedDocumentSerializer
from .services import PDFSigningService
from pypdf import PdfReader
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger('api.views')

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def perform_create(self, serializer):
        pdf_file = serializer.validated_data['original_pdf']

        logger.info(f"Processing document upload: {pdf_file.name}")

        try:
            # Extract page count
            reader = PdfReader(pdf_file)
            page_count = len(reader.pages)
            logger.info(f"Extracted {page_count} pages from {pdf_file.name}")
        except Exception as e:
            logger.error(f"Failed to extract page count from {pdf_file.name}: {str(e)}")
            page_count = 0

        # Get file size
        file_size = pdf_file.size
        logger.info(f"Document {pdf_file.name} size: {file_size} bytes")

        serializer.save(file_size=file_size, page_count=page_count)
        logger.info(f"Document {serializer.instance.id} saved successfully")

class SignatureViewSet(viewsets.ModelViewSet):
    queryset = Signature.objects.all()
    serializer_class = SignatureSerializer

    def perform_create(self, serializer):
        logger.info(f"Processing signature upload: {serializer.validated_data['image_file'].name}")
        serializer.save()
        logger.info(f"Signature {serializer.instance.id} saved successfully")

class SignedDocumentViewSet(viewsets.ModelViewSet):
    queryset = SignedDocument.objects.all()
    serializer_class = SignedDocumentSerializer

    def perform_create(self, serializer):
        original_document = serializer.validated_data['original_document']
        signature = serializer.validated_data['signature']

        logger.info(f"Starting PDF signing for document {original_document.id} with signature {signature.id}")

        # Use transaction for atomicity
        with transaction.atomic():
            # Sign the PDF
            signing_service = PDFSigningService()
            signed_content = signing_service.sign_pdf(
                original_document.get_file_path(),
                signature.get_file_path()
            )

            # Create the signed document
            signed_pdf_file = ContentFile(
                signed_content,
                name=f"signed_{original_document.id}.pdf"
            )

            serializer.save(signed_pdf=signed_pdf_file)
            logger.info(f"Signed document {serializer.instance.id} created successfully")