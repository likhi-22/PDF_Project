from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'documents', views.DocumentViewSet)
router.register(r'signatures', views.SignatureViewSet)
router.register(r'signed-documents', views.SignedDocumentViewSet)

urlpatterns = [
    path('signed-pdf/<uuid:pk>/', views.SignedPDFDeleteView.as_view(), name='signed-pdf-delete'),
    path('', include(router.urls)),
]
