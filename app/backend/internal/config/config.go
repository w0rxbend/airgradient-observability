package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Addr           string
	VMURL          string
	VMUser         string
	VMPassword     string
	VMQueryTimeout time.Duration
	LabelFilter    string
	CacheTTL       time.Duration
	RangeCacheTTL  time.Duration
	AllowedOrigin  string
}

func Load() Config {
	return Config{
		Addr:           getEnv("ADDR", ":8080"),
		VMURL:          getEnv("VM_URL", "http://localhost:8428"),
		VMUser:         os.Getenv("VM_USER"),
		VMPassword:     os.Getenv("VM_PASSWORD"),
		VMQueryTimeout: getDuration("VM_QUERY_TIMEOUT", 10*time.Second),
		LabelFilter:    getEnv("AIRGRADIENT_LABEL_FILTER", `{device="airgradient_one"}`),
		CacheTTL:       getDuration("CACHE_TTL", 10*time.Second),
		RangeCacheTTL:  getDuration("RANGE_CACHE_TTL", 30*time.Second),
		AllowedOrigin:  getEnv("ALLOWED_ORIGIN", "http://localhost:3000"),
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	if parsed, err := time.ParseDuration(value); err == nil {
		return parsed
	}
	if seconds, err := strconv.Atoi(value); err == nil {
		return time.Duration(seconds) * time.Second
	}
	return fallback
}
