FROM node:20.17.0-slim

RUN apt-get update && \ 
    apt-get install -y build-essential \
    wget \
    python3 \
    make \
    gcc \ 
    libc6-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

WORKDIR /app
COPY . /app/
RUN yarn
RUN npm rebuild @tensorflow/tfjs-node --build-from-source
RUN yarn dev