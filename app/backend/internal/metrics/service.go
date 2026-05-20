package metrics

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
	"github.com/worxbend/airgradient-observability/backend/internal/cache"
	"github.com/worxbend/airgradient-observability/backend/internal/config"
	"golang.org/x/sync/singleflight"
)

var (
	ErrInvalidMetric  = errors.New("invalid metric")
	ErrInvalidRange   = errors.New("invalid range")
	ErrInvalidStep    = errors.New("invalid step")
	ErrMultipleSeries = errors.New("query returned multiple series")
)

type CurrentMetric struct {
	Key       MetricKey `json:"key"`
	Label     string    `json:"label"`
	Unit      string    `json:"unit"`
	Value     *float64  `json:"value"`
	Timestamp *int64    `json:"timestamp"`
	Min       float64   `json:"min"`
	Max       float64   `json:"max"`
	GoodBelow *float64  `json:"goodBelow,omitempty"`
	WarnBelow *float64  `json:"warnBelow,omitempty"`
	Status    string    `json:"status"`
}

type CurrentResponse struct {
	Metrics   []CurrentMetric `json:"metrics"`
	Timestamp *int64          `json:"timestamp"`
	Cached    bool            `json:"cached"`
}

type RangePoint [2]float64

type RangeResponse struct {
	Metric string       `json:"metric"`
	Label  string       `json:"label"`
	Unit   string       `json:"unit"`
	Range  string       `json:"range"`
	Step   string       `json:"step"`
	Points []RangePoint `json:"points"`
	Cached bool         `json:"cached"`
}

type Service struct {
	api          v1.API
	labelFilter  string
	queryTimeout time.Duration
	currentTTL   time.Duration
	rangeTTL     time.Duration
	currentCache *cache.Cache[CurrentResponse]
	rangeCache   *cache.Cache[RangeResponse]
	group        singleflight.Group
}

func NewService(cfg config.Config) (*Service, error) {
	client, err := api.NewClient(api.Config{
		Address: cfg.VMURL,
		RoundTripper: basicAuthRoundTripper{
			user:     cfg.VMUser,
			password: cfg.VMPassword,
			next:     api.DefaultRoundTripper,
		},
	})
	if err != nil {
		return nil, err
	}

	return &Service{
		api:          v1.NewAPI(client),
		labelFilter:  cfg.LabelFilter,
		queryTimeout: cfg.VMQueryTimeout,
		currentTTL:   cfg.CacheTTL,
		rangeTTL:     cfg.RangeCacheTTL,
		currentCache: cache.New[CurrentResponse](),
		rangeCache:   cache.New[RangeResponse](),
	}, nil
}

func (s *Service) Current(ctx context.Context) (CurrentResponse, error) {
	const key = "current"
	if value, ok := s.currentCache.Get(key); ok {
		value.Cached = true
		return value, nil
	}

	loaded, err, _ := s.group.Do(key, func() (interface{}, error) {
		return s.loadCurrent(ctx)
	})
	if err != nil {
		return CurrentResponse{}, err
	}
	return loaded.(CurrentResponse), nil
}

func (s *Service) loadCurrent(ctx context.Context) (CurrentResponse, error) {
	const key = "current"
	response := CurrentResponse{Metrics: []CurrentMetric{}}
	for _, definition := range Definitions() {
		value, timestamp, err := s.instant(ctx, s.withFilter(definition.Query))
		if err != nil {
			return CurrentResponse{}, err
		}

		metric := CurrentMetric{
			Key:       definition.Key,
			Label:     definition.Label,
			Unit:      definition.Unit,
			Value:     value,
			Timestamp: timestamp,
			Min:       definition.Min,
			Max:       definition.Max,
			GoodBelow: definition.GoodBelow,
			WarnBelow: definition.WarnBelow,
			Status:    statusFor(value, definition),
		}
		response.Metrics = append(response.Metrics, metric)
		if timestamp != nil && (response.Timestamp == nil || *timestamp > *response.Timestamp) {
			response.Timestamp = timestamp
		}
	}

	s.currentCache.Set(key, response, s.currentTTL)
	return response, nil
}

func (s *Service) Range(ctx context.Context, key MetricKey, window string, step string) (RangeResponse, error) {
	definition, ok := DefinitionByKey(key)
	if !ok {
		return RangeResponse{}, fmt.Errorf("%w: %s", ErrInvalidMetric, key)
	}

	if !isValidWindow(window) {
		return RangeResponse{}, fmt.Errorf("%w: %s", ErrInvalidRange, window)
	}
	if !isValidStep(step) {
		return RangeResponse{}, fmt.Errorf("%w: %s", ErrInvalidStep, step)
	}

	cacheKey := fmt.Sprintf("%s:%s:%s", definition.Key, window, step)
	if value, ok := s.rangeCache.Get(cacheKey); ok {
		value.Cached = true
		return value, nil
	}

	loaded, err, _ := s.group.Do("range:"+cacheKey, func() (interface{}, error) {
		return s.loadRange(ctx, definition, window, step)
	})
	if err != nil {
		return RangeResponse{}, err
	}
	return loaded.(RangeResponse), nil
}

func (s *Service) loadRange(ctx context.Context, definition Definition, window string, step string) (RangeResponse, error) {
	cacheKey := fmt.Sprintf("%s:%s:%s", definition.Key, window, step)
	end := time.Now()
	start := end.Add(-parseWindow(window))
	queryCtx, cancel := s.queryContext(ctx)
	defer cancel()

	values, warnings, err := s.api.QueryRange(queryCtx, s.withFilter(definition.Query), v1.Range{
		Start: start,
		End:   end,
		Step:  parseStep(step),
	})
	if err != nil {
		return RangeResponse{}, err
	}
	if len(warnings) > 0 {
		return RangeResponse{}, fmt.Errorf("victoriametrics warning: %s", strings.Join(warnings, "; "))
	}

	points := []RangePoint{}
	if matrix, ok := values.(model.Matrix); ok && len(matrix) > 0 {
		if len(matrix) > 1 {
			return RangeResponse{}, ErrMultipleSeries
		}
		for _, sample := range matrix[0].Values {
			points = append(points, RangePoint{float64(sample.Timestamp), float64(sample.Value)})
		}
	}

	response := RangeResponse{
		Metric: string(definition.Key),
		Label:  definition.Label,
		Unit:   definition.Unit,
		Range:  window,
		Step:   step,
		Points: points,
	}
	s.rangeCache.Set(cacheKey, response, s.rangeTTL)
	return response, nil
}

func (s *Service) instant(ctx context.Context, query string) (*float64, *int64, error) {
	queryCtx, cancel := s.queryContext(ctx)
	defer cancel()

	value, warnings, err := s.api.Query(queryCtx, query, time.Now())
	if err != nil {
		return nil, nil, err
	}
	if len(warnings) > 0 {
		return nil, nil, fmt.Errorf("victoriametrics warning: %s", strings.Join(warnings, "; "))
	}

	vector, ok := value.(model.Vector)
	if !ok || len(vector) == 0 {
		return nil, nil, nil
	}
	if len(vector) > 1 {
		return nil, nil, ErrMultipleSeries
	}

	current := float64(vector[0].Value)
	timestamp := int64(vector[0].Timestamp)
	return &current, &timestamp, nil
}

func (s *Service) queryContext(ctx context.Context) (context.Context, context.CancelFunc) {
	if s.queryTimeout <= 0 {
		return context.WithCancel(ctx)
	}
	return context.WithTimeout(ctx, s.queryTimeout)
}

func (s *Service) withFilter(query string) string {
	filter := strings.TrimSpace(s.labelFilter)
	if filter == "" || strings.Contains(query, "{") || !metricNamePattern.MatchString(query) {
		return query
	}
	return query + filter
}

func statusFor(value *float64, definition Definition) string {
	if value == nil {
		return "empty"
	}
	if definition.WarnBelow != nil && *value >= *definition.WarnBelow {
		return "critical"
	}
	if definition.GoodBelow != nil && *value >= *definition.GoodBelow {
		return "warning"
	}
	return "good"
}

var windowPattern = regexp.MustCompile(`^\d+[hd]$`)
var stepPattern = regexp.MustCompile(`^\d+[smh]$`)
var metricNamePattern = regexp.MustCompile(`^[a-zA-Z_:][a-zA-Z0-9_:]*$`)

func isValidWindow(value string) bool {
	return windowPattern.MatchString(value)
}

func isValidStep(value string) bool {
	return stepPattern.MatchString(value)
}

func parseWindow(value string) time.Duration {
	unit := value[len(value)-1]
	amount, _ := strconv.Atoi(value[:len(value)-1])
	if unit == 'd' {
		return time.Duration(amount) * 24 * time.Hour
	}
	return time.Duration(amount) * time.Hour
}

func parseStep(value string) time.Duration {
	unit := value[len(value)-1]
	amount, _ := strconv.Atoi(value[:len(value)-1])
	switch unit {
	case 'h':
		return time.Duration(amount) * time.Hour
	case 'm':
		return time.Duration(amount) * time.Minute
	default:
		return time.Duration(amount) * time.Second
	}
}

type basicAuthRoundTripper struct {
	user     string
	password string
	next     http.RoundTripper
}

func (rt basicAuthRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.user != "" || rt.password != "" {
		req = req.Clone(req.Context())
		req.SetBasicAuth(rt.user, rt.password)
	}
	return rt.next.RoundTrip(req)
}
