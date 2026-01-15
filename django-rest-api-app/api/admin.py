from django.contrib import admin
from .models import Document, Signature, SignedDocument

admin.site.register(Document)
admin.site.register(Signature)
admin.site.register(SignedDocument)