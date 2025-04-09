# CyberDocs

A document management system built with React, Vite, Express, and MySQL.

## Features

- User authentication and authorization
- Document upload and management
- Service management
- Admin dashboard
- Responsive design

## Local Development

### Prerequisites

- Node.js (v16 or higher)
- MySQL database

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install --legacy-peer-deps
   ```
3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
4. Update the `.env` file with your database credentials and other configuration
5. Start the development server:
   ```
   npm run dev
   ```
6. In a separate terminal, start the backend server:
   ```
   npm run server
   ```

## Deployment to Vercel

### Prerequisites

- A Vercel account
- A MySQL database (e.g., Azure Database for MySQL, PlanetScale, etc.)

### Deployment Steps

1. Fork or clone this repository to your GitHub account
2. Connect your GitHub repository to Vercel
3. Configure the following environment variables in Vercel:
   - `DB_HOST`: Your MySQL database host
   - `DB_USER`: Your MySQL database user
   - `DB_PASSWORD`: Your MySQL database password
   - `DB_NAME`: Your MySQL database name
   - `DB_SSL_REJECT_UNAUTHORIZED`: Set to `true` for secure connections
   - `JWT_SECRET`: A secret key for JWT token generation
   - `ADMIN_EMAIL`: Admin user email
   - `ADMIN_PASSWORD`: Admin user password
   - `EMAIL_USER`: Email for sending notifications (if using)
   - `EMAIL_PASSWORD`: Password for the email account
   - `FRONTEND_URL`: The URL of your deployed frontend (usually your Vercel URL)
   - `NODE_ENV`: Set to `production`
4. Deploy your application

### Important Notes for Vercel Deployment

- This project uses `--legacy-peer-deps` to handle dependency conflicts. The `.npmrc` and `vercel.json` files are configured to use this flag during installation.
- File uploads in production should use a cloud storage service like AWS S3 or Azure Blob Storage, as Vercel's serverless functions don't support persistent file storage.
- The database connection is configured to work with serverless functions, but you may need to adjust connection settings based on your database provider.

## Troubleshooting

### Dependency Conflicts

If you encounter dependency conflicts during installation, try using:

```
npm install --legacy-peer-deps
```

This project has a dependency conflict with `react-file-viewer` which requires React 16.x but the project uses React 18.x. The `--legacy-peer-deps` flag allows npm to install packages with peer dependency conflicts.

### Database Connection Issues

If you're having trouble connecting to your database:

1. Ensure your database credentials are correct
2. Check if your database allows connections from your IP address
3. For Azure MySQL, ensure SSL is enabled and the `DB_SSL_REJECT_UNAUTHORIZED` environment variable is set to `true`

## License

[MIT](LICENSE)
