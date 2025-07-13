/**
 * DockerService - Docker operations with proper error handling
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class DockerService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Check if Docker is available
     * @returns {Promise<boolean>} True if Docker is available
     */
    async isDockerAvailable() {
        try {
            execSync('docker --version', { encoding: 'utf8' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get Docker version
     * @returns {Promise<string>} Docker version
     */
    async getDockerVersion() {
        try {
            const result = execSync('docker --version', { encoding: 'utf8' });
            return result.trim();
        } catch (error) {
            this.logger.error('DockerService: Failed to get Docker version', {
                error: error.message
            });
            throw new Error(`Failed to get Docker version: ${error.message}`);
        }
    }

    /**
     * Build Docker image
     * @param {string} context - Build context path
     * @param {Object} options - Build options
     * @returns {Promise<Object>} Build result
     */
    async buildImage(context, options = {}) {
        const {
            tag = null,
            dockerfile = 'Dockerfile',
            buildArgs = {},
            noCache = false,
            pull = false,
            target = null
        } = options;

        try {
            this.logger.info('DockerService: Building image', { context, tag });
            
            const args = ['build'];
            if (tag) args.push('-t', tag);
            if (dockerfile !== 'Dockerfile') args.push('-f', dockerfile);
            if (noCache) args.push('--no-cache');
            if (pull) args.push('--pull');
            if (target) args.push('--target', target);
            
            // Add build args
            for (const [key, value] of Object.entries(buildArgs)) {
                args.push('--build-arg', `${key}=${value}`);
            }
            
            args.push(context);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.image.build', {
                    context,
                    tag,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to build image', {
                context,
                tag,
                error: error.message
            });
            throw new Error(`Failed to build Docker image: ${error.message}`);
        }
    }

    /**
     * Run Docker container
     * @param {string} image - Image name
     * @param {Object} options - Run options
     * @returns {Promise<Object>} Run result
     */
    async runContainer(image, options = {}) {
        const {
            name = null,
            ports = {},
            volumes = {},
            environment = {},
            detach = false,
            interactive = false,
            tty = false,
            network = null,
            workingDir = null,
            command = null
        } = options;

        try {
            this.logger.info('DockerService: Running container', { image, name });
            
            const args = ['run'];
            if (name) args.push('--name', name);
            if (detach) args.push('-d');
            if (interactive) args.push('-i');
            if (tty) args.push('-t');
            if (network) args.push('--network', network);
            if (workingDir) args.push('-w', workingDir);
            
            // Add port mappings
            for (const [hostPort, containerPort] of Object.entries(ports)) {
                args.push('-p', `${hostPort}:${containerPort}`);
            }
            
            // Add volume mappings
            for (const [hostPath, containerPath] of Object.entries(volumes)) {
                args.push('-v', `${hostPath}:${containerPath}`);
            }
            
            // Add environment variables
            for (const [key, value] of Object.entries(environment)) {
                args.push('-e', `${key}=${value}`);
            }
            
            args.push(image);
            if (command) args.push(command);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.container.run', {
                    image,
                    name,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to run container', {
                image,
                name,
                error: error.message
            });
            throw new Error(`Failed to run Docker container: ${error.message}`);
        }
    }

    /**
     * Stop Docker container
     * @param {string} container - Container name or ID
     * @param {Object} options - Stop options
     * @returns {Promise<Object>} Stop result
     */
    async stopContainer(container, options = {}) {
        const { timeout = 10 } = options;

        try {
            this.logger.info('DockerService: Stopping container', { container });
            
            const args = ['stop'];
            if (timeout !== 10) args.push('-t', timeout.toString());
            args.push(container);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.container.stop', {
                    container,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to stop container', {
                container,
                error: error.message
            });
            throw new Error(`Failed to stop Docker container: ${error.message}`);
        }
    }

    /**
     * Remove Docker container
     * @param {string} container - Container name or ID
     * @param {Object} options - Remove options
     * @returns {Promise<Object>} Remove result
     */
    async removeContainer(container, options = {}) {
        const { force = false, volumes = false } = options;

        try {
            this.logger.info('DockerService: Removing container', { container });
            
            const args = ['rm'];
            if (force) args.push('-f');
            if (volumes) args.push('-v');
            args.push(container);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.container.remove', {
                    container,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to remove container', {
                container,
                error: error.message
            });
            throw new Error(`Failed to remove Docker container: ${error.message}`);
        }
    }

    /**
     * Get container logs
     * @param {string} container - Container name or ID
     * @param {Object} options - Log options
     * @returns {Promise<string>} Container logs
     */
    async getContainerLogs(container, options = {}) {
        const { 
            follow = false, 
            tail = null, 
            since = null, 
            until = null,
            timestamps = false 
        } = options;

        try {
            const args = ['logs'];
            if (follow) args.push('-f');
            if (tail) args.push('--tail', tail.toString());
            if (since) args.push('--since', since);
            if (until) args.push('--until', until);
            if (timestamps) args.push('-t');
            args.push(container);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            return result;
        } catch (error) {
            this.logger.error('DockerService: Failed to get container logs', {
                container,
                error: error.message
            });
            throw new Error(`Failed to get container logs: ${error.message}`);
        }
    }

    /**
     * Execute command in container
     * @param {string} container - Container name or ID
     * @param {string} command - Command to execute
     * @param {Object} options - Execute options
     * @returns {Promise<Object>} Execute result
     */
    async executeInContainer(container, command, options = {}) {
        const { interactive = false, tty = false, user = null } = options;

        try {
            this.logger.info('DockerService: Executing in container', { container, command });
            
            const args = ['exec'];
            if (interactive) args.push('-i');
            if (tty) args.push('-t');
            if (user) args.push('-u', user);
            args.push(container, command);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.container.exec', {
                    container,
                    command,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to execute in container', {
                container,
                command,
                error: error.message
            });
            throw new Error(`Failed to execute in container: ${error.message}`);
        }
    }

    /**
     * Get container status
     * @param {string} container - Container name or ID
     * @returns {Promise<Object>} Container status
     */
    async getContainerStatus(container) {
        try {
            const result = execSync(`docker inspect ${container}`, {
                encoding: 'utf8'
            });

            const info = JSON.parse(result);
            if (info.length === 0) {
                throw new Error('Container not found');
            }

            const containerInfo = info[0];
            return {
                id: containerInfo.Id,
                name: containerInfo.Name,
                state: containerInfo.State.Status,
                running: containerInfo.State.Running,
                startedAt: containerInfo.State.StartedAt,
                image: containerInfo.Image,
                created: containerInfo.Created,
                ports: containerInfo.NetworkSettings.Ports,
                networks: containerInfo.NetworkSettings.Networks
            };
        } catch (error) {
            this.logger.error('DockerService: Failed to get container status', {
                container,
                error: error.message
            });
            throw new Error(`Failed to get container status: ${error.message}`);
        }
    }

    /**
     * List containers
     * @param {Object} options - List options
     * @returns {Promise<Array>} Container list
     */
    async listContainers(options = {}) {
        const { all = false, filters = {} } = options;

        try {
            const args = ['ps'];
            if (all) args.push('-a');
            
            // Add filters
            for (const [key, value] of Object.entries(filters)) {
                args.push('--filter', `${key}=${value}`);
            }

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            const lines = result.split('\n').filter(line => line.trim());
            const containers = [];

            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const parts = line.split(/\s+/);
                
                if (parts.length >= 7) {
                    containers.push({
                        id: parts[0],
                        image: parts[1],
                        command: parts[2],
                        created: parts[3],
                        status: parts[4],
                        ports: parts[5],
                        names: parts[6]
                    });
                }
            }

            return containers;
        } catch (error) {
            this.logger.error('DockerService: Failed to list containers', {
                error: error.message
            });
            throw new Error(`Failed to list containers: ${error.message}`);
        }
    }

    /**
     * List images
     * @param {Object} options - List options
     * @returns {Promise<Array>} Image list
     */
    async listImages(options = {}) {
        const { all = false, filters = {} } = options;

        try {
            const args = ['images'];
            if (all) args.push('-a');
            
            // Add filters
            for (const [key, value] of Object.entries(filters)) {
                args.push('--filter', `${key}=${value}`);
            }

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            const lines = result.split('\n').filter(line => line.trim());
            const images = [];

            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const parts = line.split(/\s+/);
                
                if (parts.length >= 4) {
                    images.push({
                        repository: parts[0],
                        tag: parts[1],
                        imageId: parts[2],
                        created: parts[3],
                        size: parts[4]
                    });
                }
            }

            return images;
        } catch (error) {
            this.logger.error('DockerService: Failed to list images', {
                error: error.message
            });
            throw new Error(`Failed to list images: ${error.message}`);
        }
    }

    /**
     * Remove Docker image
     * @param {string} image - Image name or ID
     * @param {Object} options - Remove options
     * @returns {Promise<Object>} Remove result
     */
    async removeImage(image, options = {}) {
        const { force = false, noPrune = false } = options;

        try {
            this.logger.info('DockerService: Removing image', { image });
            
            const args = ['rmi'];
            if (force) args.push('-f');
            if (noPrune) args.push('--no-prune');
            args.push(image);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.image.remove', {
                    image,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to remove image', {
                image,
                error: error.message
            });
            throw new Error(`Failed to remove Docker image: ${error.message}`);
        }
    }

    /**
     * Pull Docker image
     * @param {string} image - Image name
     * @param {Object} options - Pull options
     * @returns {Promise<Object>} Pull result
     */
    async pullImage(image, options = {}) {
        const { tag = 'latest', platform = null } = options;

        try {
            this.logger.info('DockerService: Pulling image', { image, tag });
            
            const args = ['pull'];
            if (platform) args.push('--platform', platform);
            args.push(`${image}:${tag}`);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.image.pull', {
                    image,
                    tag,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to pull image', {
                image,
                tag,
                error: error.message
            });
            throw new Error(`Failed to pull Docker image: ${error.message}`);
        }
    }

    /**
     * Create Docker network
     * @param {string} name - Network name
     * @param {Object} options - Network options
     * @returns {Promise<Object>} Create result
     */
    async createNetwork(name, options = {}) {
        const { driver = 'bridge', subnet = null, gateway = null } = options;

        try {
            this.logger.info('DockerService: Creating network', { name });
            
            const args = ['network', 'create'];
            if (driver !== 'bridge') args.push('--driver', driver);
            if (subnet) args.push('--subnet', subnet);
            if (gateway) args.push('--gateway', gateway);
            args.push(name);

            const result = execSync(`docker ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.network.create', {
                    name,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to create network', {
                name,
                error: error.message
            });
            throw new Error(`Failed to create Docker network: ${error.message}`);
        }
    }

    /**
     * List Docker networks
     * @returns {Promise<Array>} Network list
     */
    async listNetworks() {
        try {
            const result = execSync('docker network ls', {
                encoding: 'utf8'
            });

            const lines = result.split('\n').filter(line => line.trim());
            const networks = [];

            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const parts = line.split(/\s+/);
                
                if (parts.length >= 4) {
                    networks.push({
                        networkId: parts[0],
                        name: parts[1],
                        driver: parts[2],
                        scope: parts[3]
                    });
                }
            }

            return networks;
        } catch (error) {
            this.logger.error('DockerService: Failed to list networks', {
                error: error.message
            });
            throw new Error(`Failed to list Docker networks: ${error.message}`);
        }
    }

    /**
     * Remove Docker network
     * @param {string} name - Network name
     * @returns {Promise<Object>} Remove result
     */
    async removeNetwork(name) {
        try {
            this.logger.info('DockerService: Removing network', { name });
            
            const result = execSync(`docker network rm ${name}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.network.remove', {
                    name,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to remove network', {
                name,
                error: error.message
            });
            throw new Error(`Failed to remove Docker network: ${error.message}`);
        }
    }

    /**
     * Get Docker system info
     * @returns {Promise<Object>} System information
     */
    async getSystemInfo() {
        try {
            const result = execSync('docker system df', {
                encoding: 'utf8'
            });

            const lines = result.split('\n').filter(line => line.trim());
            const info = {};

            for (const line of lines) {
                if (line.includes('Images:')) {
                    const parts = line.split(/\s+/);
                    info.images = {
                        count: parseInt(parts[1]),
                        size: parts[2],
                        reclaimable: parts[3]
                    };
                } else if (line.includes('Containers:')) {
                    const parts = line.split(/\s+/);
                    info.containers = {
                        count: parseInt(parts[1]),
                        size: parts[2],
                        reclaimable: parts[3]
                    };
                } else if (line.includes('Volumes:')) {
                    const parts = line.split(/\s+/);
                    info.volumes = {
                        count: parseInt(parts[1]),
                        size: parts[2],
                        reclaimable: parts[3]
                    };
                } else if (line.includes('Build Cache:')) {
                    const parts = line.split(/\s+/);
                    info.buildCache = {
                        count: parseInt(parts[2]),
                        size: parts[3],
                        reclaimable: parts[4]
                    };
                }
            }

            return info;
        } catch (error) {
            this.logger.error('DockerService: Failed to get system info', {
                error: error.message
            });
            throw new Error(`Failed to get Docker system info: ${error.message}`);
        }
    }

    /**
     * Prune Docker system
     * @param {Object} options - Prune options
     * @returns {Promise<Object>} Prune result
     */
    async pruneSystem(options = {}) {
        const { 
            all = false, 
            volumes = false, 
            images = false, 
            containers = false,
            networks = false,
            buildCache = false 
        } = options;

        try {
            this.logger.info('DockerService: Pruning system', { options });
            
            let command = 'docker system prune';
            if (all) command += ' -a';
            if (volumes) command += ' --volumes';
            if (images) command += ' --images';
            if (containers) command += ' --containers';
            if (networks) command += ' --networks';
            if (buildCache) command += ' --build-cache';

            const result = execSync(command, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('docker.system.prune', {
                    options,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('DockerService: Failed to prune system', {
                options,
                error: error.message
            });
            throw new Error(`Failed to prune Docker system: ${error.message}`);
        }
    }
}

module.exports = DockerService; 