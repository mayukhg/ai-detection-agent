# AI Detection Engineering Agent

A comprehensive AI-powered security platform that automates threat detection, rule generation, and security operations optimization. The system combines multiple data sources, advanced AI processing, and real-time analytics to provide intelligent security monitoring and response capabilities.

## 🚀 Features

### Core Capabilities
- **AI-Powered Detection**: Automated threat detection using Large Language Models (LLM)
- **Multi-Source Data Integration**: EDR, SIEM, Cloud, Fraud, and APM data sources
- **Behavioral Analytics**: Machine learning-based anomaly detection
- **Graph Correlation**: Entity relationship analysis and threat chain detection
- **Real-time Processing**: Sub-second event processing and alert generation
- **Knowledge Base**: Centralized threat intelligence and attack pattern management

### AI Components
- **LLM Service**: Rule generation, evaluation, and recommendation creation using GPT-4
- **Behavioral Analytics**: Statistical baseline establishment and anomaly detection
- **Graph Correlation Engine**: Neo4j-based entity relationship analysis
- **Knowledge Base Service**: MITRE ATT&CK integration and threat intelligence management

### User Interface
- **Real-time Dashboard**: Live metrics, coverage analysis, and alert trends
- **Rule Management**: AI-assisted rule creation, editing, and testing
- **Feedback Console**: Analyst feedback collection and auto-tuning controls
- **WebSocket Integration**: Real-time updates and notifications

## 🏗️ Architecture

The system follows a microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐
│   Data Sources  │───▶│ Integration Layer│───▶│ AI Detection Engineering│
│ (EDR, SIEM,     │    │ (APIs, Connectors)│    │ Agent (LangChain)       │
│  Cloud, Fraud,  │    │                  │    │                         │
│  APM)           │    │                  │    │ • LLM (rule gen)        │
└─────────────────┘    └──────────────────┘    │ • Behavioral Analytics  │
                                               │ • Graph Correlation    │
                                               └─────────┬───────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐
│  Knowledge Base │◀───│ AI Detection     │───▶│   Dashboard & UI        │
│ (Threat Encyc., │    │ Engineering Agent│    │ (Coverage, Rules,       │
│ Rules, Intel)   │    │                  │    │  Tuning, Feedback)      │
└─────────────────┘    └──────────────────┘    └─────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **shadcn/ui** component library
- **Tailwind CSS** for styling
- **TanStack Query** for state management
- **Recharts** for data visualization
- **Vite** as build tool

### Backend
- **Node.js** with TypeScript
- **Express.js** for REST API
- **MongoDB** for document storage
- **Neo4j** for graph database
- **OpenAI GPT-4** for AI capabilities
- **Socket.IO** for real-time communication
- **Redis** for caching and message queuing

### AI/ML
- **OpenAI API** for LLM capabilities
- **LangChain** for AI orchestration
- **Custom ML models** for behavioral analysis
- **Neo4j** for graph-based correlation

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (v5 or higher)
- **Neo4j** (v5 or higher)
- **Redis** (v6 or higher)
- **OpenAI API Key**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-detection-agent
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Environment Configuration

Create environment files:

```bash
# Backend environment
cp backend/env.example backend/.env

# Frontend environment
cp .env.example .env
```

Update the environment variables:

**Backend (.env)**:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ai-detection-agent
REDIS_URL=redis://localhost:6379
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# AI/LLM Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Data Source API Keys
EDR_API_KEY=your_edr_api_key_here
SIEM_API_KEY=your_siem_api_key_here
```

**Frontend (.env)**:
```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001
```

### 4. Start the Application

**Option A: Using Docker Compose (Recommended)**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Option B: Manual Setup**

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Neo4j
neo4j start

# Terminal 3: Start Redis
redis-server

# Terminal 4: Start Backend
cd backend
npm run dev

# Terminal 5: Start Frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/health

## 📚 API Documentation

### Authentication
The API uses JWT-based authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Events
- `POST /api/v1/events` - Process security event
- `GET /api/v1/events` - Get recent events

#### Rules
- `GET /api/v1/rules` - Get all detection rules
- `POST /api/v1/rules` - Create new rule
- `PUT /api/v1/rules/:id` - Update rule
- `DELETE /api/v1/rules/:id` - Delete rule

#### Recommendations
- `GET /api/v1/recommendations` - Get AI recommendations
- `POST /api/v1/recommendations/:id/approve` - Approve recommendation
- `POST /api/v1/recommendations/:id/reject` - Reject recommendation

#### Analytics
- `GET /api/v1/analytics/stats` - Get agent statistics

#### Dashboard
- `GET /api/v1/dashboard/overview` - Get dashboard overview

### WebSocket Events

Connect to `ws://localhost:3001` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

## 🔧 Development

### Project Structure

```
ai-detection-agent/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── dashboard/           # Dashboard components
│   │   └── ui/                  # UI components
│   ├── services/                # API services
│   ├── hooks/                   # Custom React hooks
│   └── pages/                   # Page components
├── backend/                     # Backend source code
│   ├── src/
│   │   ├── services/           # Business logic services
│   │   │   ├── ai/            # AI services
│   │   │   ├── data-sources/  # Data source connectors
│   │   │   └── database/      # Database services
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript type definitions
│   └── package.json
├── docs/                       # Documentation
├── docker-compose.yml          # Docker configuration
└── README.md
```

### Available Scripts

**Frontend**:
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Backend**:
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
```

### Code Quality

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Husky** for git hooks

## 🧪 Testing

### Running Tests

```bash
# Frontend tests
npm run test

# Backend tests
cd backend
npm run test

# E2E tests
npm run test:e2e
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Build

```bash
# Build frontend
npm run build

# Build backend
cd backend
npm run build
```

### Docker Deployment

```bash
# Build images
docker-compose build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Ensure all production environment variables are set:

- Database connection strings
- API keys and secrets
- CORS origins
- Rate limiting settings

## 📊 Monitoring

### Health Checks

- **Backend**: `GET /health`
- **Database**: MongoDB and Neo4j connection status
- **AI Services**: OpenAI API connectivity

### Logging

- **Structured Logging**: JSON format with Winston
- **Log Levels**: error, warn, info, debug
- **Log Rotation**: Automatic log file rotation

### Metrics

- **Performance**: Response times, throughput
- **AI Metrics**: Model accuracy, recommendation success rate
- **System Metrics**: CPU, memory, disk usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the existing code style
- Add comments for complex logic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Documentation**: Check the `/docs` folder
- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub Discussions

## 🔮 Roadmap

### Upcoming Features
- [ ] Multi-tenant support
- [ ] Advanced threat hunting tools
- [ ] Mobile application
- [ ] API rate limiting improvements
- [ ] Enhanced AI model training
- [ ] Additional data source connectors

### Performance Improvements
- [ ] Caching optimizations
- [ ] Database query optimization
- [ ] Real-time processing enhancements
- [ ] Memory usage optimization

---

**Built with ❤️ by the AI Detection Engineering Team**
