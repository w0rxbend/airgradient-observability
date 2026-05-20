package main

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/worxbend/airgradient-observability/backend/internal/config"
	"github.com/worxbend/airgradient-observability/backend/internal/metrics"
)

func main() {
	cfg := config.Load()
	service, err := metrics.NewService(cfg)
	if err != nil {
		panic(err)
	}

	router := gin.New()
	if err := router.SetTrustedProxies(nil); err != nil {
		panic(err)
	}
	router.Use(gin.Logger(), gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{cfg.AllowedOrigin},
		AllowMethods: []string{http.MethodGet, http.MethodOptions},
		AllowHeaders: []string{"Origin", "Content-Type"},
	}))

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/api/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := router.Group("/api/metrics")
	api.GET("/current", func(c *gin.Context) {
		payload, err := service.Current(c.Request.Context())
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				c.JSON(http.StatusGatewayTimeout, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, payload)
	})

	api.GET("/range", func(c *gin.Context) {
		payload, err := service.Range(
			c.Request.Context(),
			metrics.MetricKey(c.DefaultQuery("metric", "co2")),
			c.DefaultQuery("range", "24h"),
			c.DefaultQuery("step", "60s"),
		)
		if err != nil {
			if errors.Is(err, metrics.ErrInvalidMetric) || errors.Is(err, metrics.ErrInvalidRange) || errors.Is(err, metrics.ErrInvalidStep) {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			if errors.Is(err, context.DeadlineExceeded) {
				c.JSON(http.StatusGatewayTimeout, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, payload)
	})

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
