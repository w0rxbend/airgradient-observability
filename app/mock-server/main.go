// Mock server for local development — mimics the real backend API using
// generated time-series data. Run with:
//
//	go run . [--addr :8081]
//
// Then start the frontend with BACKEND_URL=http://localhost:8081.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"time"
)

// ─── metric definitions ────────────────────────────────────────────────────

type metricKey = string

const (
	keyCO2         metricKey = "co2"
	keyPM25        metricKey = "pm25"
	keyVOC         metricKey = "voc"
	keyNOx         metricKey = "nox"
	keyTemperature metricKey = "temperature"
	keyHumidity    metricKey = "humidity"
)

type definition struct {
	Key       metricKey
	Label     string
	Unit      string
	Min       float64
	Max       float64
	GoodBelow *float64
	WarnBelow *float64
	// shape parameters
	base         float64 // mean value
	morningPeak  float64 // amplitude at ~8 am (human activity)
	eveningPeak  float64 // amplitude at ~7 pm
	noise        float64 // ±random noise magnitude
	nightOffset  float64 // shift at night (3 am baseline)
}

func ptr(v float64) *float64 { return &v }

var definitions = []definition{
	{
		Key: keyCO2, Label: "CO₂", Unit: "ppm",
		Min: 400, Max: 3000, GoodBelow: ptr(801), WarnBelow: ptr(1501),
		base: 620, morningPeak: 280, eveningPeak: 320, noise: 40, nightOffset: -80,
	},
	{
		Key: keyPM25, Label: "PM2.5", Unit: "ug/m3",
		Min: 0, Max: 75, GoodBelow: ptr(12), WarnBelow: ptr(35),
		base: 7, morningPeak: 6, eveningPeak: 5, noise: 2, nightOffset: -2,
	},
	{
		Key: keyVOC, Label: "TVOC", Unit: "index",
		Min: 0, Max: 500, GoodBelow: ptr(100), WarnBelow: ptr(300),
		base: 95, morningPeak: 60, eveningPeak: 80, noise: 20, nightOffset: -40,
	},
	{
		Key: keyNOx, Label: "NOx", Unit: "index",
		Min: 0, Max: 500, GoodBelow: ptr(100), WarnBelow: ptr(300),
		base: 8, morningPeak: 12, eveningPeak: 10, noise: 4, nightOffset: -5,
	},
	{
		Key: keyTemperature, Label: "Temperature", Unit: "C",
		Min: 10, Max: 35,
		base: 21.2, morningPeak: 1.2, eveningPeak: 1.8, noise: 0.25, nightOffset: -1.5,
	},
	{
		Key: keyHumidity, Label: "Humidity", Unit: "%",
		Min: 0, Max: 100, GoodBelow: ptr(60), WarnBelow: ptr(70),
		base: 51, morningPeak: -4, eveningPeak: -3, noise: 1.5, nightOffset: 6,
	},
}

func defByKey(key metricKey) (definition, bool) {
	for _, d := range definitions {
		if d.Key == key {
			return d, true
		}
	}
	return definition{}, false
}

// ─── data generation ───────────────────────────────────────────────────────

// stableNoise returns a deterministic value in [-1, 1] for a given int64 seed.
// Uses a simple splitmix64-style hash so adjacent timestamps don't correlate.
func stableNoise(seed int64) float64 {
	x := uint64(seed)
	x ^= x >> 30
	x *= 0xbf58476d1ce4e5b9
	x ^= x >> 27
	x *= 0x94d049bb133111eb
	x ^= x >> 31
	return float64(int64(x>>11)) / float64(1<<52) // [-1, 1]
}

// gaussianBlend returns a smooth 0-1 activity factor for a given hour,
// modelling two daily peaks (morning commute + evening at home).
func activityFactor(hourOfDay float64) float64 {
	morning := math.Exp(-math.Pow(hourOfDay-8.5, 2) / 6.0)
	evening := math.Exp(-math.Pow(hourOfDay-19.0, 2) / 7.0)
	night := math.Exp(-math.Pow(hourOfDay-3.0, 2) / 4.0) // 3 am baseline dip
	return morning + evening*0.85 - night*0.4
}

// valueAt returns a realistic sensor reading at the given Unix millisecond timestamp.
// Seeded on the minute boundary so individual points in a series are smooth but
// different requests for the same window return identical data.
func valueAt(d definition, ms int64) float64 {
	t := time.UnixMilli(ms)
	hour := float64(t.Hour()) + float64(t.Minute())/60.0

	activity := activityFactor(hour)
	base := d.base + d.morningPeak*activity + d.nightOffset*(1-math.Max(0, activity))

	// stable noise seeded on metric key + minute bucket
	bucket := ms / (60 * 1000)
	noiseSeed := int64(uint64(hashStr(d.Key)) ^ (uint64(bucket) * 0x9e3779b97f4a7c15))
	noise := stableNoise(noiseSeed) * d.noise

	v := base + noise
	return math.Max(d.Min, math.Min(d.Max, v))
}

func hashStr(s string) uint32 {
	h := uint32(2166136261)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return h
}

func statusFor(v float64, d definition) string {
	if d.WarnBelow != nil && v >= *d.WarnBelow {
		return "critical"
	}
	if d.GoodBelow != nil && v >= *d.GoodBelow {
		return "warning"
	}
	return "good"
}

// ─── response types (mirror real backend) ─────────────────────────────────

type currentMetric struct {
	Key       string   `json:"key"`
	Label     string   `json:"label"`
	Unit      string   `json:"unit"`
	Value     *float64 `json:"value"`
	Timestamp *int64   `json:"timestamp"`
	Min       float64  `json:"min"`
	Max       float64  `json:"max"`
	GoodBelow *float64 `json:"goodBelow,omitempty"`
	WarnBelow *float64 `json:"warnBelow,omitempty"`
	Status    string   `json:"status"`
}

type currentResponse struct {
	Metrics   []currentMetric `json:"metrics"`
	Timestamp *int64          `json:"timestamp"`
	Cached    bool            `json:"cached"`
}

type rangeResponse struct {
	Metric string        `json:"metric"`
	Label  string        `json:"label"`
	Unit   string        `json:"unit"`
	Range  string        `json:"range"`
	Step   string        `json:"step"`
	Points [][2]float64  `json:"points"`
	Cached bool          `json:"cached"`
}

// ─── handlers ─────────────────────────────────────────────────────────────

func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, map[string]string{"status": "ok (mock)"})
}

func handleCurrent(w http.ResponseWriter, _ *http.Request) {
	now := time.Now().UnixMilli()
	metrics := make([]currentMetric, 0, len(definitions))
	for _, d := range definitions {
		v := valueAt(d, now)
		ts := now
		metrics = append(metrics, currentMetric{
			Key:       d.Key,
			Label:     d.Label,
			Unit:      d.Unit,
			Value:     &v,
			Timestamp: &ts,
			Min:       d.Min,
			Max:       d.Max,
			GoodBelow: d.GoodBelow,
			WarnBelow: d.WarnBelow,
			Status:    statusFor(v, d),
		})
	}
	writeJSON(w, currentResponse{Metrics: metrics, Timestamp: &now})
}

func handleRange(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	key := q.Get("metric")
	if key == "" {
		key = keyCO2
	}
	window := q.Get("range")
	if window == "" {
		window = "24h"
	}
	step := q.Get("step")
	if step == "" {
		step = "5m"
	}

	d, ok := defByKey(key)
	if !ok {
		http.Error(w, `{"error":"invalid metric"}`, http.StatusBadRequest)
		return
	}

	windowDur, err := parseWindow(window)
	if err != nil {
		http.Error(w, `{"error":"invalid range"}`, http.StatusBadRequest)
		return
	}
	stepDur, err := parseStep(step)
	if err != nil {
		http.Error(w, `{"error":"invalid step"}`, http.StatusBadRequest)
		return
	}

	now := time.Now()
	from := now.Add(-windowDur)
	points := buildPoints(d, from.UnixMilli(), now.UnixMilli(), stepDur)

	writeJSON(w, rangeResponse{
		Metric: d.Key, Label: d.Label, Unit: d.Unit,
		Range: window, Step: step, Points: points,
	})
}

func handleRangeAbsolute(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	key := q.Get("metric")
	if key == "" {
		key = keyCO2
	}
	step := q.Get("step")
	if step == "" {
		step = "5m"
	}

	fromMs, err := strconv.ParseInt(q.Get("from"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"from must be a Unix millisecond timestamp"}`, http.StatusBadRequest)
		return
	}
	toMs, err := strconv.ParseInt(q.Get("to"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"to must be a Unix millisecond timestamp"}`, http.StatusBadRequest)
		return
	}
	if fromMs >= toMs {
		http.Error(w, `{"error":"from must be before to"}`, http.StatusBadRequest)
		return
	}

	d, ok := defByKey(key)
	if !ok {
		http.Error(w, `{"error":"invalid metric"}`, http.StatusBadRequest)
		return
	}

	stepDur, err := parseStep(step)
	if err != nil {
		http.Error(w, `{"error":"invalid step"}`, http.StatusBadRequest)
		return
	}

	points := buildPoints(d, fromMs, toMs, stepDur)
	rangeLabel := fmt.Sprintf("abs:%d:%d", fromMs, toMs)

	writeJSON(w, rangeResponse{
		Metric: d.Key, Label: d.Label, Unit: d.Unit,
		Range: rangeLabel, Step: step, Points: points,
	})
}

func buildPoints(d definition, fromMs, toMs int64, step time.Duration) [][2]float64 {
	stepMs := step.Milliseconds()
	if stepMs <= 0 {
		stepMs = 60_000
	}
	// align start to step boundary
	start := (fromMs / stepMs) * stepMs
	capacity := int((toMs-start)/stepMs) + 2
	if capacity < 0 || capacity > 50_000 {
		capacity = 1440
	}
	points := make([][2]float64, 0, capacity)
	for ts := start; ts <= toMs; ts += stepMs {
		v := valueAt(d, ts)
		points = append(points, [2]float64{float64(ts), math.Round(v*10) / 10})
	}
	return points
}

// ─── helpers ──────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func parseWindow(s string) (time.Duration, error) {
	if len(s) < 2 {
		return 0, fmt.Errorf("invalid window: %s", s)
	}
	n, err := strconv.Atoi(s[:len(s)-1])
	if err != nil {
		return 0, err
	}
	switch s[len(s)-1] {
	case 'h':
		return time.Duration(n) * time.Hour, nil
	case 'd':
		return time.Duration(n) * 24 * time.Hour, nil
	}
	return 0, fmt.Errorf("unknown unit: %c", s[len(s)-1])
}

func parseStep(s string) (time.Duration, error) {
	if len(s) < 2 {
		return 0, fmt.Errorf("invalid step: %s", s)
	}
	n, err := strconv.Atoi(s[:len(s)-1])
	if err != nil {
		return 0, err
	}
	switch s[len(s)-1] {
	case 's':
		return time.Duration(n) * time.Second, nil
	case 'm':
		return time.Duration(n) * time.Minute, nil
	case 'h':
		return time.Duration(n) * time.Hour, nil
	}
	return 0, fmt.Errorf("unknown unit: %c", s[len(s)-1])
}

// ─── main ─────────────────────────────────────────────────────────────────

func main() {
	addr := flag.String("addr", getEnv("ADDR", ":8081"), "listen address")
	flag.Parse()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/api/healthz", handleHealthz)
	mux.HandleFunc("/api/metrics/current", handleCurrent)
	mux.HandleFunc("/api/metrics/range", handleRange)
	mux.HandleFunc("/api/metrics/range-absolute", handleRangeAbsolute)

	log.Printf("mock server listening on %s", *addr)
	log.Printf("set BACKEND_URL=http://localhost%s in the frontend .env.local", *addr)

	srv := &http.Server{
		Addr:              *addr,
		Handler:           cors(mux),
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
