#!/bin/bash

# VentaFácil Database Creation Script
# Creates PostgreSQL database and user for development

DB_NAME="ventafacil_dev"
DB_USER="ventafacil_user"
DB_PASSWORD="ventafacil_password"

echo "🚀 Creating VentaFácil Database..."

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create user if not exists
echo "Creating database user: $DB_USER"
psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"

# Create database if not exists
echo "Creating database: $DB_NAME"
psql postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database already exists"

# Grant privileges
echo "Granting privileges..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

# Enable UUID extension
echo "Enabling UUID extension..."
psql $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null

echo "✅ Database setup complete!"
echo ""
echo "Connection details:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Connection String: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "Next steps:"
echo "  1. Run migrations: npm run migrate"
echo "  2. Generate types: npm run generate-types"
echo "  3. Start development server: npm run dev"
