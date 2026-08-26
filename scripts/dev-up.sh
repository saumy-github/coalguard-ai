#!/bin/bash
echo "Starting development environment..."
docker-compose up -d --build
echo "Infrastructure running!"
echo "Backend: http://localhost:8000"
echo "AI Engine: http://localhost:8001"
echo "ChromaDB: http://localhost:8000"
echo "MongoDB: mongodb://localhost:27017"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: ./scripts/dev-down.sh"
