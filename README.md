# Netwin Tournament Admin Panel

A comprehensive admin dashboard for managing the Netwin Tournament platform, built with React, TypeScript, and Firebase.

## 🚀 Features

- **User Management**: View, edit, and manage user accounts
- **Tournament Management**: Create, update, and monitor tournaments
- **Real-time Analytics**: Live dashboard with key metrics
- **Secure Authentication**: Firebase-based admin authentication
- **Responsive Design**: Mobile-friendly admin interface
- **KYC Management**: Handle user verification requests
- **Transaction Monitoring**: Track wallet transactions and payouts

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Radix UI, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth
- **Deployment**: Firebase Hosting
- **State Management**: React Context API

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project setup
- PostgreSQL database (optional for full functionality)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/netwin-tournament-admin.git
   cd netwin-tournament-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Firebase configuration and other environment variables in `.env`:
   ```env
   # Firebase Client Configuration
   VITE_FB_API_KEY=your_firebase_api_key
   VITE_FB_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FB_PROJECT_ID=your_project_id
   VITE_FB_STORAGE_BUCKET=your_project.appspot.com
   VITE_FB_MESSAGING_SENDER_ID=your_sender_id
   VITE_FB_APP_ID=your_app_id
   
   # Admin Configuration
   ADMIN_EMAIL=admin@netwin.com
   JWT_SECRET=your_secure_jwt_secret
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The admin panel will be available at `http://localhost:5000`

## 🚀 Deployment

### Firebase Hosting

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   npm run deploy
   ```

   Or deploy only hosting:
   ```bash
   npm run deploy:hosting
   ```

### Manual Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm run start
   ```

## 📁 Project Structure

```
netwin-tournament-admin/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   └── lib/           # Utility libraries
│   ├── firebase/          # Firebase configuration
│   └── index.html         # Entry HTML file
├── server/                # Backend Express server
│   ├── middleware/        # Auth and other middleware
│   ├── routes.ts          # API routes
│   └── storage.ts         # Database operations
├── shared/                # Shared types and schemas
├── .env.example           # Environment variables template
├── firebase.json          # Firebase configuration
├── package.json           # Dependencies and scripts
└── vite.config.ts         # Vite build configuration
```

## 🔐 Authentication

The admin panel uses Firebase Authentication with email/password. Default admin credentials:
- **Email**: admin@netwin.com  
- **Password**: Set during Firebase setup

## 🌐 API Endpoints

The backend provides RESTful APIs for:

- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/tournaments/*` - Tournament operations  
- `/api/transactions/*` - Transaction monitoring
- `/api/kyc/*` - KYC verification

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to Firebase
- `npm run firebase:emulators` - Start Firebase emulators
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

### Environment Variables

Key environment variables for development:

```env
NODE_ENV=development
VITE_FB_API_KEY=your_key
VITE_FB_PROJECT_ID=your_project
JWT_SECRET=your_secret
ADMIN_EMAIL=admin@netwin.com
```

## 🔄 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Email: support@netwin.com
- Documentation: [Wiki](https://github.com/your-username/netwin-tournament-admin/wiki)
- Issues: [GitHub Issues](https://github.com/your-username/netwin-tournament-admin/issues)

## 🔄 Changelog

### v1.0.0 (Latest)
- Initial admin panel release
- User and tournament management
- Firebase authentication integration
- Real-time dashboard metrics
- Mobile-responsive design

---

**Made with ❤️ by the Netwin Team**