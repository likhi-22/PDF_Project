# Django REST API Project

This project is a Django REST API application designed to serve as a backend for a React single-page application. It utilizes Django REST Framework for building RESTful APIs and is configured to work with a MySQL database using `mysqlclient`. The project also includes media file handling and CORS configuration for seamless integration with the frontend.

## Project Structure

```
django-rest-api-app
├── api                # Contains the API application
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── tests.py
│   ├── urls.py
│   └── views.py
├── core               # Contains core project settings and configurations
│   ├── __init__.py
│   ├── settings
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── wsgi.py
├── media              # Directory for storing uploaded media files
├── .env               # Environment variables for the project
├── manage.py          # Command-line utility for managing the project
├── README.md          # Project documentation
└── requirements.txt   # List of project dependencies
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd django-rest-api-app
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

4. Set up your environment variables in the `.env` file.

5. Run database migrations:
   ```
   python manage.py migrate
   ```

6. Start the development server:
   ```
   python manage.py runserver
   ```

## Usage

- The API endpoints can be accessed at `http://localhost:8000/api/`.
- Ensure that CORS is configured properly to allow requests from your React application.

## Environment Configuration

- The project supports multiple environments (development and production) with separate settings files located in `core/settings/`.
- Use `dev.py` for development and `prod.py` for production configurations.

## License

This project is licensed under the MIT License.