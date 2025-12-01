# Guide: Running seed-10-businesses.ts

## Problem
The database is running in Docker but the port isn't exposed to your local machine, so you can't connect from outside Docker.

## Solutions

### Solution 1: Expose Database Port (Quick Fix)

Add port mapping to your `docker-compose.production.yml`:

```yaml
postgres:
  image: postgres:15-alpine
  ports:
    - "5432:5432"  # Add this line
  environment:
    - POSTGRES_USER=${POSTGRES_USER:-randevubu_user}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-secure_password}
    - POSTGRES_DB=${POSTGRES_DB:-randevubu}
  # ... rest of config
```

Then restart:
```powershell
docker-compose -f docker-compose.production.yml restart postgres
```

Now run the seed script:
```powershell
$env:DATABASE_URL="postgresql://randevubu_user:secure_password@localhost:5432/randevubu?schema=public"
npx ts-node prisma/seed-10-businesses.ts
```

### Solution 2: Run Inside Docker Container

Copy the file into the container and run it:

```powershell
# Copy the seed file into the container
docker cp prisma/seed-10-businesses.ts randevubuserver-app1-1:/app/prisma/

# Run the script inside the container
docker exec randevubuserver-app1-1 npx ts-node prisma/seed-10-businesses.ts
```

### Solution 3: Use Docker Compose Exec (If app service exists)

If you have a docker-compose service for running commands:

```powershell
docker-compose -f docker-compose.production.yml exec app1 npx ts-node prisma/seed-10-businesses.ts
```

### Solution 4: Update .env File

Update your `.env` file to use the correct credentials:

```env
DATABASE_URL=postgresql://randevubu_user:secure_password@localhost:5432/randevubu?schema=public
```

**Note:** This only works if you expose the database port (Solution 1).

## Recommended Approach

1. **For Development:** Expose the port (Solution 1) - easiest for local development
2. **For Production:** Use Solution 2 or 3 to run inside Docker

## Verify Database Connection

Test the connection:
```powershell
# If port is exposed:
$env:DATABASE_URL="postgresql://randevubu_user:secure_password@localhost:5432/randevubu?schema=public"
npx prisma db pull
```

## Current Database Credentials

Based on your Docker container:
- **User:** `randevubu_user`
- **Password:** `secure_password`
- **Database:** `randevubu`
- **Host:** `localhost` (if port exposed) or `postgres` (from inside Docker)





