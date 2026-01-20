import os
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Document, Signature, SignedDocument

class Command(BaseCommand):
    help = 'Delete Document, Signature, and SignedDocument records older than 3 days'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=3)

        # 1. Delete old SignedDocuments (using signed_at as timestamp)
        for signed_doc in SignedDocument.objects.filter(signed_at__lt=cutoff):
            if signed_doc.signed_pdf:
                path = signed_doc.signed_pdf.path
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass
            signed_doc.delete()

        # 2. Delete old Documents
        for doc in Document.objects.filter(created_at__lt=cutoff):
            if doc.original_pdf:
                path = doc.original_pdf.path
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass
            doc.delete()

        # 3. Delete old Signatures
        for sig in Signature.objects.filter(created_at__lt=cutoff):
            if sig.image_file:
                path = sig.image_file.path
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass
            sig.delete()
