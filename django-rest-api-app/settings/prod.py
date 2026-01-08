from .base import *

# Production-specific settings
DEBUG = False

DATABASES['default']['NAME'] = os.getenv('PROD_DATABASE_NAME')
DATABASES['default']['USER'] = os.getenv('PROD_DATABASE_USER')
DATABASES['default']['PASSWORD'] = os.getenv('PROD_DATABASE_PASSWORD')
DATABASES['default']['HOST'] = os.getenv('PROD_DATABASE_HOST')
DATABASES['default']['PORT'] = os.getenv('PROD_DATABASE_PORT')
