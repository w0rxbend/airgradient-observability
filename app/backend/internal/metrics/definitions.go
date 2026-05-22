package metrics

import "os"

type MetricKey string

const (
	CO2         MetricKey = "co2"
	PM25        MetricKey = "pm25"
	VOC         MetricKey = "voc"
	NOx         MetricKey = "nox"
	Temperature MetricKey = "temperature"
	Humidity    MetricKey = "humidity"
)

type Definition struct {
	Key       MetricKey `json:"key"`
	Label     string    `json:"label"`
	Unit      string    `json:"unit"`
	Query     string    `json:"-"`
	Min       float64   `json:"min"`
	Max       float64   `json:"max"`
	GoodBelow *float64  `json:"goodBelow,omitempty"`
	WarnBelow *float64  `json:"warnBelow,omitempty"`
}

func Definitions() []Definition {
	return []Definition{
		{Key: CO2, Label: "CO2", Unit: "ppm", Query: envMetric("METRIC_CO2", "airgradient_co2_ppm"), Min: 400, Max: 3000, GoodBelow: ptr(801), WarnBelow: ptr(1501)},
		{Key: PM25, Label: "PM2.5", Unit: "ug/m3", Query: envMetric("METRIC_PM25", "airgradient_pm2d5_ugm3"), Min: 0, Max: 75, GoodBelow: ptr(12), WarnBelow: ptr(35)},
		{Key: VOC, Label: "TVOC", Unit: "index", Query: envMetric("METRIC_VOC", "airgradient_tvoc_index"), Min: 0, Max: 500, GoodBelow: ptr(100), WarnBelow: ptr(300)},
		{Key: NOx, Label: "NOx", Unit: "index", Query: envMetric("METRIC_NOX", "airgradient_nox_index"), Min: 0, Max: 500, GoodBelow: ptr(100), WarnBelow: ptr(300)},
		{Key: Temperature, Label: "Temperature", Unit: "C", Query: envMetric("METRIC_TEMPERATURE", "airgradient_temperature_celsius"), Min: 10, Max: 35},
		{Key: Humidity, Label: "Humidity", Unit: "%", Query: envMetric("METRIC_HUMIDITY", "airgradient_humidity_percent"), Min: 0, Max: 100, GoodBelow: ptr(60), WarnBelow: ptr(70)},
	}
}

func DefinitionByKey(key MetricKey) (Definition, bool) {
	for _, definition := range Definitions() {
		if definition.Key == key {
			return definition, true
		}
	}
	return Definition{}, false
}

func envMetric(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func ptr(value float64) *float64 {
	return &value
}
