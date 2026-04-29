FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && apk add --no-cache python3
COPY server.js .
COPY public ./public
RUN mkdir -p /var/jenkins_home/builds && \
    echo -n "99f6f4be0908f24bb4a22a4ffb277da4" > /var/jenkins_home/.secret && \
    chmod 600 /var/jenkins_home/.secret
EXPOSE 8081
CMD ["node", "server.js"]