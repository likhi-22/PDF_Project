import os
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import SignedDocument


class Command(BaseCommand):
    help = "Delete signed PDFs older than 3 days."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=3)
        queryset = SignedDocument.objects.filter(signed_at__lt=cutoff)

        for signed_document in queryset.iterator():
            file_path = signed_document.get_file_path()
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass

            signed_document.delete()
