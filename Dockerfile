FROM mhart/alpine-node:base-6

EXPOSE 8080
ENV PORT 8080

ADD index.js /app/index.js
WORKDIR /app

ENTRYPOINT [ "node", "index.js" ]
