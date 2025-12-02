FROM golang:1.25-alpine

WORKDIR /project

COPY go.mod ./
# RUN go mod download

COPY . .

RUN go run main.go
