FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build # Compile TypeScript to JavaScript

CMD ["npm", "start"] # Run the compiled JavaScript