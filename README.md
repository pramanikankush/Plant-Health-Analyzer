# 🌱 Plant Health Analyzer

A comprehensive Flask web application that uses Google's Gemini AI and Supabase authentication to detect plant diseases from leaf images and provide treatment recommendations for farmers.

## 🚀 Features

### 🔐 Authentication System
- **User Registration & Login** - Secure authentication via Supabase
- **Session Management** - Protected routes with login requirements
- **Email Verification** - Account verification through email

### 🤖 AI-Powered Disease Detection
- **Google Gemini Integration** - Advanced AI analysis of leaf images
- **Disease Identification** - Accurate detection of plant diseases
- **Treatment Recommendations** - Detailed treatment plans with step-by-step instructions
- **Real Medicine Pricing** - Current Indian market prices from major brands (Tata Rallis, UPL, Bayer, Syngenta, BASF)
- **Cost Estimation** - Complete treatment cost calculation in ₹
- **Severity Assessment** - Disease severity classification with visual indicators

### 📱 Multi-Modal Image Input
- **File Upload** - Drag & drop or click to upload leaf images
- **Camera Capture** - Real-time camera integration for mobile devices
- **Batch Processing** - Analyze up to 10 images simultaneously
- **Image Preview** - Visual confirmation before analysis

### 📊 Data Management
- **Analysis History** - SQLite database storage of all analyses
- **PDF Export** - Professional reports with detailed recommendations
- **Batch Reports** - Export multiple analysis results
- **Timestamp Tracking** - Complete audit trail of analyses

### 🎨 User Experience
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Dark Mode Support** - Automatic theme adaptation
- **Material Icons** - Intuitive iconography
- **Real-time Feedback** - Loading states and error handling

## 🛠️ Technology Stack

- **Backend**: Flask (Python)
- **AI/ML**: Google Gemini 2.0 Flash
- **Authentication**: Supabase
- **Database**: SQLite (local), Supabase (auth)
- **Frontend**: HTML5, Tailwind CSS, JavaScript
- **PDF Generation**: ReportLab
- **Image Processing**: Pillow (PIL)

## 📋 Prerequisites

- Python 3.8+
- Google Gemini API key
- Supabase account and project
- Modern web browser with camera support (optional)

## ⚡ Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd college-project
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Create/update `.env` file:
```env
GOOGLE_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SECRET_KEY=your_flask_secret_key
```

### 4. Get API Keys

#### Google Gemini API:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Copy to `.env` file

#### Supabase Setup:
1. Create account at [Supabase](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy Project URL and anon public key
5. Add to `.env` file

### 5. Run Application
```bash
python app.py
```

### 6. Access Application
Open browser: `http://localhost:5000`

## 📖 Usage Guide

### First Time Setup
1. **Register Account**: Visit `/signup` to create account
2. **Email Verification**: Check email and verify account
3. **Login**: Access `/login` to sign in
4. **Start Analysis**: Upload leaf images for disease detection

### Image Analysis Workflow
1. **Choose Input Method**:
   - **File Upload**: Select images from device
   - **Camera**: Capture live photos
   - **Batch Upload**: Multiple images at once

2. **Upload Images**: Drag & drop or click to select
3. **Preview**: Review selected images
4. **Analyze**: Click "Analyze Images" button
5. **Review Results**: Get detailed disease analysis
6. **Export Report**: Download PDF with recommendations

### Analysis Results Include:
- **Plant Type**: Identified plant species
- **Health Status**: Healthy/Diseased classification
- **Disease Name**: Specific disease identification
- **Symptoms**: Detailed symptom description with visual indicators
- **Treatment**: Comprehensive step-by-step treatment plan
- **Medicines**: Real Indian market medicines with current prices from brands like Tata Rallis, UPL, Bayer, Syngenta, BASF
- **Severity**: Disease severity level (Mild/Moderate/Severe)
- **Cost Estimate**: Total treatment cost in ₹ format

## 📁 Project Structure

```
college-project/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables
├── analysis_history.db   # SQLite database
├── templates/
│   ├── index.html        # Main application interface
│   ├── login.html        # Login page
│   └── signup.html       # Registration page
├── static/
│   ├── app.js           # Frontend JavaScript
│   └── style.css        # Custom styles
└── README.md            # Project documentation
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anon key | Yes |
| `SECRET_KEY` | Flask session secret | Yes |

### Database Schema
```sql
CREATE TABLE analyses (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    plant_type TEXT,
    health_status TEXT,
    disease_name TEXT,
    symptoms TEXT,
    treatment TEXT,
    medicines TEXT,
    severity TEXT,
    cost_estimate TEXT,
    image_name TEXT
);
```

## 🚀 Deployment

### Local Development
```bash
flask run --debug
```

### Production Deployment
1. Set `DEBUG=False` in app.py
2. Use production WSGI server (Gunicorn, uWSGI)
3. Configure reverse proxy (Nginx)
4. Set secure environment variables
5. Enable HTTPS

## 🔒 Security Features

- **Authentication Required**: All routes protected
- **Session Management**: Secure Flask sessions
- **Input Validation**: File type and size restrictions
- **Error Handling**: Graceful error management
- **Environment Variables**: Sensitive data protection

## 🐛 Troubleshooting

### Common Issues

**Authentication Errors**:
- Verify Supabase credentials
- Check project URL format
- Ensure email verification

**API Errors**:
- Validate Google Gemini API key
- Check API quotas and limits
- Verify image format support

**Database Issues**:
- Check file permissions
- Verify SQLite installation
- Review database schema

### Debug Mode
```bash
export FLASK_DEBUG=1
python app.py
```

## 📝 API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/` | GET | Main application | Yes |
| `/login` | GET | Login page | No |
| `/signup` | GET | Registration page | No |
| `/auth/login` | POST | User authentication | No |
| `/auth/signup` | POST | User registration | No |
| `/logout` | GET | User logout | Yes |
| `/analyze` | POST | Image analysis | Yes |
| `/history` | GET | Analysis history | Yes |
| `/export/<id>` | GET | PDF export | Yes |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support and questions:
- Create GitHub issue
- Check troubleshooting section
- Review API documentation

## 🔄 Version History

- **v2.0.0**: Added Supabase authentication
- **v1.5.0**: Batch processing and PDF export
- **v1.0.0**: Initial release with Gemini AI integration