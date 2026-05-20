FROM golang:1.23-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o /out/airgradient-backend ./cmd/server

FROM alpine:3.21

RUN apk add --no-cache ca-certificates
RUN adduser -D -H airgradient
USER airgradient

COPY --from=build /out/airgradient-backend /usr/local/bin/airgradient-backend

EXPOSE 8080
ENTRYPOINT ["airgradient-backend"]
