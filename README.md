
# 📄 PDF Signing Web Application

A modern, secure, and user-friendly **PDF signing web application** that allows users to upload PDFs, add signatures, preview documents, and manage signed files seamlessly — all through a clean and intuitive interface.

---

## 🚀 Features

* 📤 **Upload PDF Documents**
* ✍️ **Add & Position Signature**

  * Signature positioning is restricted to the **first page only** (for document consistency)
  * User-friendly error message if attempted on other pages
* 👀 **Live PDF Preview**
* 📥 **Download Signed PDF**
* 🗑️ **Delete Signed PDF**

  * Deletes both the database record and stored file
* ⏳ **Automatic Data Cleanup**

  * Signed documents are **automatically deleted after 3 days**
* 🎨 **Modern UI**

  * Dark theme
  * Animated background
  * Responsive design
* 🔔 **Toast Notifications**

  * Clear feedback for user actions
* 🔐 **Safe & Clean Architecture**

  * Backend and frontend responsibilities clearly separated

---

## 🧠 Application Logic Overview

* Users can upload a PDF and a signature image.
* The signature can be placed **only on the first page** of the document.
* Attempts to place the signature on other pages trigger a helpful error message.
* After signing:

  * The signed PDF is stored securely.
  * Users can download or delete the signed document.
* Signed documents are **automatically removed after 3 days** to maintain data hygiene.

---

## 🛠️ Tech Stack

### Frontend

* **React (Vite)**
* TypeScript
* Tailwind CSS
* Canvas-based / animated background
* Toast notification system

### Backend

* **Django**
* **Django Rest Framework**
* SQLite / PostgreSQL (configurable)
* Django Media Storage

### Other

* RESTful API architecture
* Automatic background cleanup via Django management command

---

## 📁 Project Structure (Simplified)

```text
PDF_Project/
│
├── backend/
│   ├── manage.py
│   ├── api/
│   └── media/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│
└── README.md
```

---

## ⚙️ Setup Instructions

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend will run at:

```
http://127.0.0.1:8000/
```

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run at:

```
http://localhost:5173/
```

---

## 🧹 Automatic Cleanup (Data Expiry)

* Signed PDFs are automatically deleted **after 3 days**
* Both:

  * Database records
  * Stored PDF files
* Implemented using a **Django management command**
* Can be scheduled using:

  * Windows Task Scheduler
  * Cron (Linux/macOS)

---

## 🧪 Validations & UX Enhancements

* Prevents invalid signature placement
* Displays contextual error messages
* Uses non-blocking UI notifications
* Ensures no accidental data loss

---

## 📌 Future Enhancements (Optional)

* User authentication
* Multiple signature support
* Cloud storage (AWS S3)
* Audit logs
* Admin dashboard
* Email notifications before auto-deletion


## ⭐ Acknowledgements

Built with a focus on:

* Clean architecture
* User experience
* Data safety
* Maintainability

---

### ✅ How to Use This

1. Create a file named `README.md` in your GitHub repo
2. Paste the above content
3. Customize:

   * Project name
   * Email
   * GitHub link
4. Commit & push 🚀

