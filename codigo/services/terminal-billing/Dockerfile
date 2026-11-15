FROM node:24.15.0-bookworm-slim
WORKDIR /app
COPY core.mjs server.mjs ./
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=8080 BILLING_DB=/data/billing-test.sqlite
EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "server.mjs"]
