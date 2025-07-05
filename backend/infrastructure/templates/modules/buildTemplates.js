/**
 * Build Templates Module
 */
const { TEMPLATE_CATEGORIES } = require('./constants');

class BuildTemplates {
    /**
     * Get build script templates
     * @returns {Object} Build templates
     */
    static getTemplates() {
        return {
            webpackBuild: {
                name: 'Webpack Build Script',
                description: 'Build application using Webpack',
                category: TEMPLATE_CATEGORIES.BUILD,
                template: `#!/bin/bash
# Webpack Build Script
echo "Starting Webpack build..."

# Set environment
export NODE_ENV=production

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/
rm -rf build/

# Run build
echo "Running Webpack build..."
npm run build

# Check build result
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Build size:"
    du -sh dist/ || du -sh build/
else
    echo "Build failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production',
                    BUILD_DIR: 'dist'
                },
                outputs: ['dist/', 'build/']
            },

            viteBuild: {
                name: 'Vite Build Script',
                description: 'Build application using Vite',
                category: TEMPLATE_CATEGORIES.BUILD,
                template: `#!/bin/bash
# Vite Build Script
echo "Starting Vite build..."

# Set environment
export NODE_ENV=production

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Run build
echo "Running Vite build..."
npm run build

# Check build result
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Build size:"
    du -sh dist/
    
    # Optional: Preview build
    if [ "$1" = "--preview" ]; then
        echo "Starting preview server..."
        npm run preview
    fi
else
    echo "Build failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production',
                    BUILD_DIR: 'dist'
                },
                outputs: ['dist/']
            },

            rollupBuild: {
                name: 'Rollup Build Script',
                description: 'Build application using Rollup',
                category: TEMPLATE_CATEGORIES.BUILD,
                template: `#!/bin/bash
# Rollup Build Script
echo "Starting Rollup build..."

# Set environment
export NODE_ENV=production

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Run build
echo "Running Rollup build..."
npm run build

# Check build result
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Build size:"
    du -sh dist/
else
    echo "Build failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production',
                    BUILD_DIR: 'dist'
                },
                outputs: ['dist/']
            },

            dockerBuild: {
                name: 'Docker Build Script',
                description: 'Build Docker image',
                category: TEMPLATE_CATEGORIES.BUILD,
                template: `#!/bin/bash
# Docker Build Script
echo "Starting Docker build..."

# Set variables
IMAGE_NAME="{{IMAGE_NAME}}"
IMAGE_TAG="{{IMAGE_TAG}}"
DOCKERFILE="{{DOCKERFILE}}"

# Validate inputs
if [ -z "$IMAGE_NAME" ]; then
    echo "Error: IMAGE_NAME is required"
    exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
    IMAGE_TAG="latest"
fi

if [ -z "$DOCKERFILE" ]; then
    DOCKERFILE="Dockerfile"
fi

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE" ]; then
    echo "Error: Dockerfile not found: $DOCKERFILE"
    exit 1
fi

# Build Docker image
echo "Building Docker image: $IMAGE_NAME:$IMAGE_TAG"
docker build -f "$DOCKERFILE" -t "$IMAGE_NAME:$IMAGE_TAG" .

# Check build result
if [ $? -eq 0 ]; then
    echo "Docker build completed successfully!"
    echo "Image: $IMAGE_NAME:$IMAGE_TAG"
    
    # Optional: Push to registry
    if [ "$1" = "--push" ]; then
        echo "Pushing image to registry..."
        docker push "$IMAGE_NAME:$IMAGE_TAG"
    fi
else
    echo "Docker build failed!"
    exit 1
fi`,
                variables: {
                    IMAGE_NAME: 'myapp',
                    IMAGE_TAG: 'latest',
                    DOCKERFILE: 'Dockerfile'
                },
                outputs: ['docker-image']
            }
        };
    }
}

module.exports = BuildTemplates; 