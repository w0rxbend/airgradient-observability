FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod .
COPY main.go .
RUN CGO_ENABLED=0 go build -o /mock-server .

FROM scratch
COPY --from=build /mock-server /mock-server
EXPOSE 8081
ENV ADDR=:8081
ENTRYPOINT ["/mock-server"]
