FROM node:20 as builder
WORKDIR /usr/app
COPY . ./
RUN npm install
RUN npm run build

FROM node:20
WORKDIR /usr/app
COPY --from=builder /usr/app/node_modules ./node_modules
COPY --from=builder /usr/app/build ./build
# EXPOSE 8080
CMD [ "node", "build/evmEventMonitor.js" ]