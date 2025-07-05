/**
 * Deploy Templates Module
 */
const { TEMPLATE_CATEGORIES } = require('./constants');

class DeployTemplates {
    /**
     * Get deployment script templates
     * @returns {Object} Deploy templates
     */
    static getTemplates() {
        return {
            dockerDeploy: {
                name: 'Docker Deploy Script',
                description: 'Deploy using Docker',
                category: TEMPLATE_CATEGORIES.DEPLOY,
                template: `#!/bin/bash
# Docker Deploy Script
echo "Starting Docker deployment..."

# Set variables
IMAGE_NAME="{{IMAGE_NAME}}"
IMAGE_TAG="{{IMAGE_TAG}}"
CONTAINER_NAME="{{CONTAINER_NAME}}"
PORT="{{PORT}}"

# Validate inputs
if [ -z "$IMAGE_NAME" ]; then
    echo "Error: IMAGE_NAME is required"
    exit 1
fi

if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME="$IMAGE_NAME"
fi

if [ -z "$PORT" ]; then
    PORT="3000"
fi

# Stop existing container
echo "Stopping existing container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Pull latest image
echo "Pulling latest image..."
docker pull "$IMAGE_NAME:$IMAGE_TAG"

# Run new container
echo "Starting new container..."
docker run -d \\
    --name "$CONTAINER_NAME" \\
    -p "$PORT:$PORT" \\
    --restart unless-stopped \\
    "$IMAGE_NAME:$IMAGE_TAG"

# Check deployment
if [ $? -eq 0 ]; then
    echo "Deployment completed successfully!"
    echo "Container: $CONTAINER_NAME"
    echo "Port: $PORT"
else
    echo "Deployment failed!"
    exit 1
fi`,
                variables: {
                    IMAGE_NAME: 'myapp',
                    IMAGE_TAG: 'latest',
                    CONTAINER_NAME: 'myapp',
                    PORT: '3000'
                },
                outputs: ['deployment-status']
            },

            kubernetesDeploy: {
                name: 'Kubernetes Deploy Script',
                description: 'Deploy to Kubernetes',
                category: TEMPLATE_CATEGORIES.DEPLOY,
                template: `#!/bin/bash
# Kubernetes Deploy Script
echo "Starting Kubernetes deployment..."

# Set variables
NAMESPACE="{{NAMESPACE}}"
DEPLOYMENT_NAME="{{DEPLOYMENT_NAME}}"
IMAGE_NAME="{{IMAGE_NAME}}"
IMAGE_TAG="{{IMAGE_TAG}}"

# Validate inputs
if [ -z "$NAMESPACE" ]; then
    echo "Error: NAMESPACE is required"
    exit 1
fi

if [ -z "$DEPLOYMENT_NAME" ]; then
    echo "Error: DEPLOYMENT_NAME is required"
    exit 1
fi

if [ -z "$IMAGE_NAME" ]; then
    echo "Error: IMAGE_NAME is required"
    exit 1
fi

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Update deployment
echo "Updating deployment..."
kubectl set image deployment/"$DEPLOYMENT_NAME" "$DEPLOYMENT_NAME=$IMAGE_NAME:$IMAGE_TAG" -n "$NAMESPACE"

# Wait for rollout
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE"

# Check deployment
if [ $? -eq 0 ]; then
    echo "Kubernetes deployment completed successfully!"
else
    echo "Kubernetes deployment failed!"
    exit 1
fi`,
                variables: {
                    NAMESPACE: 'default',
                    DEPLOYMENT_NAME: 'myapp',
                    IMAGE_NAME: 'myapp',
                    IMAGE_TAG: 'latest'
                },
                outputs: ['kubernetes-deployment-status']
            }
        };
    }
}

module.exports = DeployTemplates; 