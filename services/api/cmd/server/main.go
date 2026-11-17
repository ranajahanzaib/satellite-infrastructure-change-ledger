package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/api"
	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/storage"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	pyWorkerURL := os.Getenv("PY_WORKER_URL")
	if pyWorkerURL == "" {
		pyWorkerURL = "http://localhost:8081"
	}

	repo := storage.NewMemoryRepository()
	srv := api.NewServer(repo, pyWorkerURL)

	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      srv.Router(),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("==================================================================")
		log.Printf(" Satellite Infrastructure Change Ledger API")
		log.Printf(" Listening on: http://0.0.0.0:%s", port)
		log.Printf(" Python Processing Worker: %s", pyWorkerURL)
		log.Printf(" Seeded scenario: Apex Industrial Logistics Park (2016-2021)")
		log.Printf("==================================================================")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down API server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server gracefully stopped.")
}
