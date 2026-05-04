package platformmetrics

import (
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/hibiken/asynq"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const namespace = "payment_platform"

type Metrics struct {
	registry *prometheus.Registry

	chargeRequests    *prometheus.CounterVec
	midtransLatency   *prometheus.HistogramVec
	webhookInbound    *prometheus.CounterVec
	webhookDeliveries *prometheus.CounterVec
	webhookRetries    *prometheus.CounterVec
	operationalAlerts *prometheus.CounterVec
	rateLimitHits     *prometheus.CounterVec
	databaseErrors    *prometheus.CounterVec
	redisErrors       *prometheus.CounterVec

	mu               sync.Mutex
	registeredQueues map[string]struct{}
}

func New() *Metrics {
	registry := prometheus.NewRegistry()
	metrics := &Metrics{
		registry: registry,
		chargeRequests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "charge_requests_total",
			Help:      "Total charge requests grouped by result.",
		}, []string{"result"}),
		midtransLatency: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Namespace: namespace,
			Name:      "midtrans_request_duration_seconds",
			Help:      "Latency of Midtrans charge requests.",
			Buckets:   []float64{0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30},
		}, []string{"result"}),
		webhookInbound: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "webhook_inbound_total",
			Help:      "Total inbound Midtrans webhooks grouped by result.",
		}, []string{"result"}),
		webhookDeliveries: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "webhook_deliveries_total",
			Help:      "Final webhook delivery outcomes grouped by status.",
		}, []string{"outcome"}),
		webhookRetries: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "webhook_retries_total",
			Help:      "Webhook retries grouped by type.",
		}, []string{"type"}),
		operationalAlerts: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "operational_alert_dispatch_total",
			Help:      "Operational alert dispatch attempts grouped by outcome.",
		}, []string{"outcome"}),
		rateLimitHits: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "rate_limit_hits_total",
			Help:      "Rate limit hits grouped by scope.",
		}, []string{"scope"}),
		databaseErrors: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "database_errors_total",
			Help:      "Database errors grouped by component and operation.",
		}, []string{"component", "operation"}),
		redisErrors: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: namespace,
			Name:      "redis_errors_total",
			Help:      "Redis errors grouped by component and operation.",
		}, []string{"component", "operation"}),
		registeredQueues: map[string]struct{}{},
	}

	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		metrics.chargeRequests,
		metrics.midtransLatency,
		metrics.webhookInbound,
		metrics.webhookDeliveries,
		metrics.webhookRetries,
		metrics.operationalAlerts,
		metrics.rateLimitHits,
		metrics.databaseErrors,
		metrics.redisErrors,
	)

	for _, result := range []string{
		"success",
		"validation_error",
		"midtrans_error",
		"processing_conflict",
		"store_inactive",
		"payload_conflict",
		"idempotency_replay",
		"internal_error",
	} {
		metrics.chargeRequests.WithLabelValues(result)
	}

	for _, result := range []string{"success", "error"} {
		metrics.midtransLatency.WithLabelValues(result)
	}

	for _, result := range []string{
		"accepted",
		"invalid_payload",
		"invalid_signature",
		"transaction_not_found",
		"internal_error",
	} {
		metrics.webhookInbound.WithLabelValues(result)
	}

	for _, outcome := range []string{"success", "failed_permanently"} {
		metrics.webhookDeliveries.WithLabelValues(outcome)
	}

	for _, kind := range []string{"automatic", "manual_resend"} {
		metrics.webhookRetries.WithLabelValues(kind)
	}

	for _, outcome := range []string{"queued", "success", "retrying", "failed"} {
		metrics.operationalAlerts.WithLabelValues(outcome)
	}

	for _, scope := range []string{"token", "store"} {
		metrics.rateLimitHits.WithLabelValues(scope)
	}

	return metrics
}

func (m *Metrics) Handler() http.Handler {
	if m == nil {
		return http.NotFoundHandler()
	}

	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

func (m *Metrics) RegisterQueueDepth(queue string, inspector *asynq.Inspector) {
	if m == nil || inspector == nil {
		return
	}

	queue = sanitizeLabel(queue)
	if queue == "" {
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.registeredQueues[queue]; exists {
		return
	}

	m.registry.MustRegister(&queueDepthCollector{
		queue:     queue,
		inspector: inspector,
		desc: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, "", "queue_depth"),
			"Current queue depth grouped by queue and task state.",
			[]string{"queue", "state"},
			nil,
		),
		errorObserver: func() {
			m.RecordRedisError("queue_depth", "inspect")
		},
	})
	m.registeredQueues[queue] = struct{}{}
}

func (m *Metrics) RecordChargeRequest(result string) {
	if m == nil {
		return
	}

	m.chargeRequests.WithLabelValues(sanitizeLabel(result)).Inc()
}

func (m *Metrics) ObserveMidtransLatency(duration time.Duration, result string) {
	if m == nil {
		return
	}

	m.midtransLatency.WithLabelValues(sanitizeLabel(result)).Observe(duration.Seconds())
}

func (m *Metrics) RecordWebhookInbound(result string) {
	if m == nil {
		return
	}

	m.webhookInbound.WithLabelValues(sanitizeLabel(result)).Inc()
}

func (m *Metrics) RecordWebhookDelivery(outcome string) {
	if m == nil {
		return
	}

	m.webhookDeliveries.WithLabelValues(sanitizeLabel(outcome)).Inc()
}

func (m *Metrics) RecordWebhookRetry(kind string) {
	if m == nil {
		return
	}

	m.webhookRetries.WithLabelValues(sanitizeLabel(kind)).Inc()
}

func (m *Metrics) RecordOperationalAlertDispatch(outcome string) {
	if m == nil {
		return
	}

	m.operationalAlerts.WithLabelValues(sanitizeLabel(outcome)).Inc()
}

func (m *Metrics) RecordRateLimitHit(scope string) {
	if m == nil {
		return
	}

	m.rateLimitHits.WithLabelValues(sanitizeLabel(scope)).Inc()
}

func (m *Metrics) RecordDatabaseError(component string, operation string) {
	if m == nil {
		return
	}

	m.databaseErrors.WithLabelValues(sanitizeLabel(component), sanitizeLabel(operation)).Inc()
}

func (m *Metrics) RecordRedisError(component string, operation string) {
	if m == nil {
		return
	}

	m.redisErrors.WithLabelValues(sanitizeLabel(component), sanitizeLabel(operation)).Inc()
}

type queueDepthCollector struct {
	queue         string
	inspector     *asynq.Inspector
	desc          *prometheus.Desc
	errorObserver func()
}

func (c *queueDepthCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- c.desc
}

func (c *queueDepthCollector) Collect(ch chan<- prometheus.Metric) {
	if c == nil || c.inspector == nil {
		return
	}

	info, err := c.inspector.GetQueueInfo(c.queue)
	if err != nil {
		if errors.Is(err, asynq.ErrQueueNotFound) {
			c.emit(ch, "pending", 0)
			c.emit(ch, "active", 0)
			c.emit(ch, "scheduled", 0)
			c.emit(ch, "retry", 0)
			c.emit(ch, "archived", 0)
			c.emit(ch, "aggregating", 0)
			c.emit(ch, "total", 0)
			return
		}

		if c.errorObserver != nil {
			c.errorObserver()
		}
		return
	}

	c.emit(ch, "pending", float64(info.Pending))
	c.emit(ch, "active", float64(info.Active))
	c.emit(ch, "scheduled", float64(info.Scheduled))
	c.emit(ch, "retry", float64(info.Retry))
	c.emit(ch, "archived", float64(info.Archived))
	c.emit(ch, "aggregating", float64(info.Aggregating))
	c.emit(ch, "total", float64(info.Size))
}

func (c *queueDepthCollector) emit(ch chan<- prometheus.Metric, state string, value float64) {
	ch <- prometheus.MustNewConstMetric(c.desc, prometheus.GaugeValue, value, c.queue, state)
}

func sanitizeLabel(value string) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return "unknown"
	}

	replacer := strings.NewReplacer(" ", "_", "-", "_", "/", "_", ".", "_", ":", "_")
	return replacer.Replace(trimmed)
}
