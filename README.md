# 🌱 Plant Health Analyzer

**Production-ready Flask application** using Google Gemini AI for plant disease detection with enterprise-grade security.

[![Security](https://img.shields.io/badge/security-hardened-green.svg)](SECURITY.md)
[![Python](https://img.shields.io/badge/python-3.11-blue.svg)](https://python.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

### Core Capabilities
- 🤖 **AI Disease Detection** - Google Gemini 2.0 Flash for accurate plant disease identification
- 💊 **Treatment Plans** - Step-by-step treatment with real Indian market medicine prices
- 📊 **Progress Tracking** - Monitor treatment effectiveness with follow-up analysis
- ⏰ **Smart Reminders** - Automated treatment schedule notifications
- 📱 **Multi-Platform** - File upload, camera capture, batch processing (10 images)
- 📄 **PDF Reports** - Professional analysis reports with cost estimates
- 🌍 **Location Alerts** - Weather-based disease alerts for your region

### Security Features (v2.1.1)
- 🔒 **Rate Limiting** - Protection against brute force and DoS attacks
- 🛡️ **Input Sanitization** - XSS and injection attack prevention
- 🔐 **Secure Sessions** - HTTPOnly, SameSite cookies with 24h timeout
- 📝 **SQL Injection Protection** - Parameterized queries throughout
- 🚫 **File Upload Security** - Type validation, size limits, secure naming
- 🔑 **Environment Validation** - Required credentials checked at startup
- 📊 **Security Headers** - CSP, HSTS, X-Frame-Options configured

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- [Google Gemini API Key](https://makersuite.google.com/app/apikey)
- [Supabase Account](https://supabase.com)

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd college-project

# 2. Install dependencies
pip install -r requirements.txt

# 3. Generate secret key
python generate_secret_key.py

# 4. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 5. Initialize database
python -c "from app import init_db; init_db()"

# 6. Run application
export FLASK_ENV=development  # Windows: set FLASK_ENV=development
python app.py
```

Access at: **http://localhost:5000**

### Docker Setup

```bash
# Using Docker Compose
docker-compose up

# Or build manually
docker build -t plant-health-analyzer .
docker run -p 5000:8080 \
  -e SECRET_KEY=xxx \
  -e GOOGLE_API_KEY=xxx \
  -e SUPABASE_URL=xxx \
  -e SUPABASE_KEY=xxx \
  plant-health-analyzer
```

## 📋 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | Flask session secret (32+ bytes) | ✅ |
| `GOOGLE_API_KEY` | Google Gemini API key | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_KEY` | Supabase anon key | ✅ |
| `FLASK_ENV` | Environment (development/production) | ❌ |
| `FLASK_DEBUG` | Debug mode (True/False) | ❌ |

**Generate secure key:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## 🏗️ Architecture

```
├── app.py                    # Main application with security hardening
├── config.py                 # Environment-based configuration
├── requirements.txt          # Dependencies with security packages
├── Dockerfile               # Production container
├── docker-compose.yml       # Local development setup
├── templates/               # HTML templates
├── static/                  # CSS, JS assets
└── docs/
    ├── DEPLOYMENT.md        # Deployment guide (Heroku, AWS, GCP)
    ├── SECURITY.md          # Security documentation
    └── QUICKSTART.md        # 5-minute setup guide
```

## 🔐 Security

**OWASP Top 10 Compliant** - See [SECURITY.md](SECURITY.md) for details.

### Rate Limits
- Login: 5/minute
- Signup: 3/hour  
- Analysis: 20/hour
- API: 30/minute
- Global: 200/hour

### Input Validation
- Email format validation
- Password strength (8+ chars)
- File type whitelist (images only)
- File size limits (16MB max)
- UUID format validation
- SQL injection prevention

## 📊 API Endpoints

| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/health` | GET | Exempt | Health check |
| `/auth/login` | POST | 5/min | User login |
| `/auth/signup` | POST | 3/hour | Registration |
| `/analyze` | POST | 20/hour | Image analysis |
| `/history` | GET | 30/min | Analysis history |
| `/export/<id>` | GET | 20/hour | PDF export |
| `/reminders` | GET | 30/min | Treatment reminders |

## 🚀 Deployment

### Heroku (Recommended)
```bash
heroku create your-app-name
heroku config:set SECRET_KEY=xxx GOOGLE_API_KEY=xxx ...
git push heroku main
```

### AWS / GCP / DigitalOcean
See [DEPLOYMENT.md](DEPLOYMENT.md) for platform-specific guides.

### Production Checklist
- [ ] Rotate all API keys
- [ ] Set `FLASK_ENV=production`
- [ ] Set `FLASK_DEBUG=False`
- [ ] Enable HTTPS
- [ ] Configure monitoring
- [ ] Set up database backups
- [ ] Review security headers

## 🛠️ Technology Stack

**Backend:**
- Flask 3.0+ (Web framework)
- Google Gemini 2.0 (AI/ML)
- Supabase (Authentication)
- SQLite/PostgreSQL (Database)
- Gunicorn (WSGI server)

**Security:**
- Flask-Limiter (Rate limiting)
- Flask-Talisman (Security headers)
- Bleach (Input sanitization)

**Frontend:**
- Tailwind CSS (Styling)
- Vanilla JavaScript (Interactivity)

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[SECURITY.md](SECURITY.md)** - Security features and best practices
- **[SECURITY_FIXES.md](SECURITY_FIXES.md)** - Vulnerabilities fixed in v2.1.1
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

## 🐛 Troubleshooting

### Common Issues

**"SECRET_KEY must be set"**
```bash
python generate_secret_key.py
# Add output to .env.local
```

**"Invalid credentials"**
- Verify Supabase URL and key
- Check user exists and email verified

**"Rate limit exceeded"**
- Wait a few minutes
- Adjust limits in `config.py`

**Database errors**
```bash
rm analysis_history.db
python -c "from app import init_db; init_db()"
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔄 Version

**Current:** v2.1.1 (Security & Deployment Update)

**Recent Changes:**
- ✅ Fixed 10 critical security vulnerabilities
- ✅ Added rate limiting and input sanitization
- ✅ Production-ready with Docker support
- ✅ Comprehensive deployment documentation

See [CHANGELOG.md](CHANGELOG.md) for full history.

## 📞 Support

- 📖 Check documentation first
- 🐛 [Report bugs](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)
- 🔒 Security issues: Email maintainers directly

---

**⚠️ Important:** If upgrading from v2.1.0 or earlier, see [SECURITY_FIXES.md](SECURITY_FIXES.md) for required actions.