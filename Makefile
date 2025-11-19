# Convenience Makefile for local/CI functional and integration testing
# Usage examples:
#   make help
#   make build
#   make up-gateway           # start gateway + deps (WireMock + Firestore emulator)
#   make gateway-tests        # run gateway unit/integration tests in container
#   make func-tests           # run functional tests (spins up gateway+deps)
#   make ft                   # run gateway-tests then func-tests
#   make down                 # stop/remove all containers and volumes

# ----- Configurable variables -----
COMPOSE            := docker compose
COMPOSE_FILE       := docker-compose.functional-tests.yml
PROFILE            ?= test                 # Spring profile to use
PROJECT            ?= colearn-ft           # Optional: project name if you want to group resources

# Exported for docker compose variable substitution if used in the YAML
export SPRING_PROFILES_ACTIVE := $(PROFILE)

# ----- Phony targets -----
.PHONY: help build ps logs up-stack up-gateway down clean gateway-tests func-tests ft ft-clean gw-tests-clean func-tests-run func-tests-run-clean ft-run

help:
	@echo "Targets:"
	@echo "  build                 - Build compose images"
	@echo "  up-stack              - Start WireMock + Firestore emulator (detached)"
	@echo "  up-gateway            - Start gateway (test profile) plus dependencies (detached)"
	@echo "  gateway-tests         - Run gateway unit/integration tests in container (test profile)"
	@echo "  func-tests            - Run functional tests (spins up gateway+deps, then exits)"
	@echo "  func-tests-run        - Run functional tests using 'run' (no log attach; deps detached)"
	@echo "  ft                    - Run gateway-tests then func-tests sequentially"
	@echo "  ft-run                - Run gateway-tests then func-tests-run (no log attach)"
	@echo "  gw-tests-clean        - Run gateway-tests and then bring the stack down"
	@echo "  func-tests-run-clean  - Run func-tests-run and then bring the stack down"
	@echo "  ft-clean              - Run func-tests and then bring the stack down"
	@echo "  logs                  - Tail all compose logs"
	@echo "  ps                    - Show compose status"
	@echo "  down                  - Stop and remove compose resources (volumes included)"
	@echo "Variables:"
	@echo "  PROFILE=<spring profile> (default: test)"

build:
	$(COMPOSE) -f $(COMPOSE_FILE) build

ps:
	$(COMPOSE) -f $(COMPOSE_FILE) ps

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

# Start only dependencies needed for tests (WireMock + Firestore emulator)
up-stack:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d wiremock firestore

# Start gateway and its dependencies
up-gateway: up-stack
	$(COMPOSE) -f $(COMPOSE_FILE) up -d gateway

# Run gateway unit/integration tests inside the builder container
# Note: Compose file already sets SPRING_PROFILES_ACTIVE=test for these services.
# The SPRING_PROFILES_ACTIVE env exported above will be used if YAML uses substitution.
gateway-tests:
	$(COMPOSE) -f $(COMPOSE_FILE) up --build --abort-on-container-exit gateway-tests ; \
	status=$$? ; \
	$(COMPOSE) -f $(COMPOSE_FILE) ps ; \
	exit $$status

# Run end-to-end functional tests (spins up gateway + deps)
func-tests:
	$(COMPOSE) -f $(COMPOSE_FILE) up --build --abort-on-container-exit func-tests ; \
	status=$$? ; \
	$(COMPOSE) -f $(COMPOSE_FILE) ps ; \
	exit $$status


# Run functional tests using compose run (avoids attaching to all logs)
func-tests-run: up-gateway
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm func-tests ; \
	status=$$? ; \
	$(COMPOSE) -f $(COMPOSE_FILE) ps ; \
	exit $$status

# Convenience: gateway tests then func-tests-run (no log attach)
ft-run:
	@rc=0 ; \
	$(MAKE) gateway-tests || rc=$$? ; \
	$(MAKE) func-tests-run || rc=$$? ; \
	exit $$rc

# CI-friendly: run func-tests-run and bring stack down
func-tests-run-clean:
	@rc=0 ; \
	$(MAKE) up-gateway ; \
	$(COMPOSE) -f $(COMPOSE_FILE) run --rm func-tests || rc=$$? ; \
	$(MAKE) down ; \
	exit $$rc

# Convenience: run both test phases sequentially
ft: gateway-tests func-tests

# CI-friendly variants that always tear down afterwards
ft-clean:
	@rc=0 ; \
	$(MAKE) func-tests || rc=$$? ; \
	$(MAKE) down ; \
	exit $$rc

gw-tests-clean:
	@rc=0 ; \
	$(MAKE) gateway-tests || rc=$$? ; \
	$(MAKE) down ; \
	exit $$rc

# Stop and remove containers, networks, and named/anon volumes
# Be careful: this will delete emulator state volumes too.
down:
	$(COMPOSE) -f $(COMPOSE_FILE) down -v

# Optional local cleanup of dangling images (safe no-op if none)
clean: down
	docker image prune -f >/dev/null || true

