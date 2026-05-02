FROM golang:1.26-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/worker ./cmd/worker
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/migrate ./cmd/migrate

FROM alpine:3.22

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /out/api /app/api
COPY --from=builder /out/worker /app/worker
COPY --from=builder /out/migrate /app/migrate
COPY db/migrations /app/db/migrations

EXPOSE 8080

CMD ["/app/api"]
