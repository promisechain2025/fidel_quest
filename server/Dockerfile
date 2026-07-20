# eGeez server - zero runtime dependencies, so this image is tiny and
# needs no `npm install`. Just copy the source and run it.
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
ENV PORT=8080
EXPOSE 8080
# Drop root for a little defense in depth.
USER node
CMD ["node", "src/index.js"]
