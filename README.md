# SAM

Backend for bomberman game  

You can configure server in .env file  

Example configuration is available in .env.example  

## Configuration description:

`DATABASE_URL` - connection url for your Postgres database.  
`BASIC_USER_STATUS` - basic user status, if not empty new user will be created with admin role, if empty user will be created with user role  
`SECRET` - secret for generating jwt tokens  
`GOOGLE_CLIENT_ID` - your google client id  
`GOOGLE_SECRET` - your google secret  

## Before running you have to run:

1. npm install
2. npx prisma migrate dev

## Running:

npm start or node server.mjs
