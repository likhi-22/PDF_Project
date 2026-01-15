from rest_framework import serializers
from .models import Document, Signature, SignedDocument

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'original_pdf', 'file_size', 'page_count', 'created_at']
        read_only_fields = ['id', 'file_size', 'page_count', 'created_at']

class SignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signature
        fields = '__all__'

class SignedDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignedDocument
        fields = ['id', 'original_document', 'signature', 'signed_pdf', 'signed_at']
        read_only_fields = ['id', 'signed_pdf', 'signed_at']
