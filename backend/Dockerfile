FROM node:18-slim

# Install ffmpeg for video processing
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

# Environment variables
ENV PORT=8080
ENV TRANSCODE=true

EXPOSE 8080

CMD ["npm", "start"]
