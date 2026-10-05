FROM node:20-alpine

WORKDIR /app

COPY index.html style.css app.js server.js ./
COPY manifest.webmanifest sw.js icon-192.png icon-512.png ./

EXPOSE 3000

CMD ["node", "server.js"]
