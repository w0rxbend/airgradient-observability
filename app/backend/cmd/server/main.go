package main

import (
	"context"
	"errors"
	"net/http"
	"strconv"
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

	api.GET("/range-absolute", func(c *gin.Context) {
		fromStr := c.Query("from")
		toStr := c.Query("to")
		if fromStr == "" || toStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "from and to parameters are required"})
			return
		}
		fromMs, err := strconv.ParseInt(fromStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "from must be a Unix millisecond timestamp"})
			return
		}
		toMs, err := strconv.ParseInt(toStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "to must be a Unix millisecond timestamp"})
			return
		}
		payload, err := service.RangeAbsolute(
			c.Request.Context(),
			metrics.MetricKey(c.DefaultQuery("metric", "co2")),
			fromMs,
			toMs,
			c.DefaultQuery("step", "5m"),
		)
		if err != nil {
			if errors.Is(err, metrics.ErrInvalidMetric) || errors.Is(err, metrics.ErrInvalidStep) || errors.Is(err, metrics.ErrInvalidTimeRange) {
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
