package platformlogger

import (
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

func New(appEnv string, logLevel string) zerolog.Logger {
	zerolog.TimeFieldFormat = time.RFC3339Nano

	level := zerolog.InfoLevel
	if parsedLevel, err := zerolog.ParseLevel(strings.ToLower(logLevel)); err == nil {
		level = parsedLevel
	}

	zerolog.SetGlobalLevel(level)

	if appEnv == "development" {
		consoleWriter := zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}

		return zerolog.New(consoleWriter).With().Timestamp().Logger()
	}

	return zerolog.New(os.Stdout).With().Timestamp().Logger()
}
