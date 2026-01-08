from rest_framework import serializers
from .models import Document, Signature, SignedDocument

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'

class SignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signature
        fields = '__all__'

class SignedDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignedDocument
        fields = '__all__'
