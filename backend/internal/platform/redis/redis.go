package platformredis

import (
	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
)

func NewClient(addr string, password string, db int) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
}

func AsynqRedisClientOpt(addr string, password string, db int) asynq.RedisClientOpt {
	return asynq.RedisClientOpt{
		Addr:     addr,
		Password: password,
		DB:       db,
	}
}
